import fs from 'fs/promises'
import FormData from 'form-data';
import path from 'path';
import fetch from 'node-fetch';
import { CookieJar } from 'tough-cookie';
import fetchCookie from 'fetch-cookie';
import * as cheerio from 'cheerio';

interface ComparisonResult {
    index: number;
    score: number;
}

interface CompareResponse {
    success: boolean;
    results: ComparisonResult[];
    total_comparisons: number;
}

interface ImageUrl {
    image: string;
    id: string;
}

interface ResultsObject {
    [key: string]: {
        id: string;
        score: number;
        image?: string;
        seriesSlug?: string;
        publisher?: string;
        title?: string;
        searchTitle?: string;
        variant_name?: string;
        variant_of?: string;
        sold?: {
            raw: number;
            graded: number;
        };
    };
}

class ComicPricingDetails {
    private jar: CookieJar;
    private fetchWithCookies: any;
    private nonce: string = "";

    constructor() {
        // Initialize cookie jar
        this.jar = new CookieJar();
        this.fetchWithCookies = fetchCookie(fetch, this.jar);
    }

    async grabData(imageBuffer: Buffer | Uint8Array, isPng: boolean, username, password) {
        try {
            const topResult = await this.searchPriceCharting(imageBuffer, true);
            const title = topResult.name;
            console.log(`Search title: ${title}`);
            this.refreshCovrPriceCookie(username, password);
            // Get fresh nonce
            this.nonce = await this.grabCovrPriceNonce(); 
            const searchResults = await this.requestCovrSearch(title);
            let resultsObj: ResultsObject = {};
            
            // Build results object from search data
            searchResults.issuesES.hits.hits.forEach((v: { _id: string; _score: number }) => {
                resultsObj[v._id] = { id: v._id, score: v._score };
            });

            searchResults.issues.forEach((v: any) => {
                resultsObj[v.id] = {
                    ...resultsObj[v.id], 
                    image: v.full_image, 
                    seriesSlug: v.slug, 
                    publisher: v.publisher, 
                    title: v.title, 
                    searchTitle: title, 
                    variant_name: v.variant_name, 
                    variant_of: v.variant_of, 
                    sold: {
                        raw: v.raw_fmv_value,
                        graded: v.graded_fmv_value
                    }
                };
            });

            // Extract image URLs and IDs
            const imageUrls: ImageUrl[] = Object.values(resultsObj)
                .map(v => v.image ? { image: v.image, id: v.id } : null)
                .filter((v): v is ImageUrl => v !== null);

            if (imageUrls.length === 0) {
                console.warn('No images found from search results');
                return null;
            }

            console.log(`Found ${imageUrls.length} images to compare`);

            // Download images with error handling
            const imageBuffers: ArrayBuffer[] = [];
            const successfulIndices: number[] = [];

            for (let i = 0; i < imageUrls.length; i++) {
                const imageUrl = imageUrls[i];
                try {
                    const imageResponse = await fetch(imageUrl.image, {
                        timeout: 10000, // 10 second timeout
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; ImageComparer/1.0)'
                        }
                    });
                    
                    if (!imageResponse.ok) {
                        console.warn(`Failed to fetch image: ${imageUrl.image}, status: ${imageResponse.status}`);
                        continue;
                    }
                    
                    const imageData = await imageResponse.arrayBuffer();
                    
                    // Validate that we got actual image data
                    if (imageData.byteLength === 0) {
                        console.warn(`Empty image data from: ${imageUrl.image}`);
                        continue;
                    }
                    
                    imageBuffers.push(imageData);
                    successfulIndices.push(i);
                    
                } catch (error) {
                    console.warn(`Error fetching image ${imageUrl.image}:`, error);
                }
            }

            if (imageBuffers.length === 0) {
                console.warn('No images successfully downloaded for comparison');
                return null;
            }

            console.log(`Successfully downloaded ${imageBuffers.length} images for comparison`);

            // Call comparison API
            try {
                const compareResponse = await fetch('http://localhost:5000/api/compare', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        target_image: Array.from(new Uint8Array(imageBuffer)),
                        comparison_images: imageBuffers.map(buf => Array.from(new Uint8Array(buf)))
                    })
                });

                if (!compareResponse.ok) {
                    const errorText = await compareResponse.text();
                    throw new Error(`Compare API failed: ${compareResponse.status} ${compareResponse.statusText} - ${errorText}`);
                }

                const compareData: any = await compareResponse.json();
                
                if (!compareData.success || !compareData.results || compareData.results.length === 0) {
                    console.warn('No valid comparison results returned');
                    return null;
                }

                console.log(`Comparison complete. Best match score: ${compareData.results[0].score.toFixed(4)}`);

                // The results are already sorted by score (highest first = best match)
                const bestResult = compareData.results[0];
                
                // Map back to original image URL index
                const originalImageIndex = successfulIndices[bestResult.index];
                const bestMatchId = imageUrls[originalImageIndex].id;
                const bestMatch = resultsObj[bestMatchId];

                if (!bestMatch) {
                    console.error(`Could not find match data for ID: ${bestMatchId}`);
                    return null;
                }

                // Fetch additional sales data
                let fmv = null;
                try {
                    fmv = await this.fetchIssueSales(bestMatch.id, 'graded', 1);
                } catch (error) {
                    console.warn(`Failed to fetch issue sales for ${bestMatch.id}:`, error);
                }
                
                const result = { 
                    ...bestMatch, 
                    fmv: fmv,
                    similarityScore: bestResult.score,
                    comparisonStats: {
                        totalFound: imageUrls.length,
                        successfulDownloads: imageBuffers.length,
                        bestMatchIndex: originalImageIndex
                    }
                };

                console.log(`Best match: ${bestMatch.title} (${bestMatch.variant_name || 'main'}) - Score: ${bestResult.score.toFixed(4)}`);
                
                return result;

            } catch (apiError) {
                console.error('Error calling comparison API:', apiError);
                throw apiError;
            }

        } catch (error) {
            console.error('Error in grabData:', error);
            throw error;
        }
    }

    async searchPriceCharting(imageBuffer: string | any[] | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, isPng: string | boolean) {
        console.log(`Image size: ${imageBuffer.length} bytes`);

        // Create proper FormData
        const form = new FormData();

        // Determine content type
        const contentType = isPng === '.png' ? 'image/png' : 'image/jpeg';

        // Append the image buffer to form data
        form.append('img', imageBuffer, {
            filename: 'blob',
            contentType: contentType
        });
        form.append('category', 'comic-books');

        try {
            const res = await fetch("https://www.pricecharting.com/search-by-photo", {
                method: "POST",
                headers: {
                    "accept": "*/*",
                    "accept-language": "en-US,en;q=0.9",
                    "priority": "u=1, i",
                    "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "\"Windows\"",
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-origin",
                    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36",
                    "referer": "https://www.pricecharting.com/category/comic-books",
                    ...form.getHeaders()
                },
                body: form,
                credentials: "include"
            });

            console.log('Response status:', res.status);

            if (res.status === 200) {
                const result = await res.json();
                console.log('Success:', JSON.stringify(result, null, 2));
                return result.answer_records[0];
            } else {
                const errorText = await res.text();
                console.log('Error response:', errorText);
                return null;
            }

        } catch (error) {
            console.error('Fetch error:', error);
            return null;
        }
    }

    async grabCovrPriceNonce() {
        const response = await this.fetchWithCookies("https://covrprice.com/", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "priority": "u=0, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "Referer": "https://covrprice.com/search/?search=Transformers+%231"
            },
            "method": "GET"
        });

        const html = await response.text();
        const $ = cheerio.load(html);
        const scriptContent = $("#jquery-core-js-extra").html();
        const match = scriptContent?.match(/var dashboardSettings\s*=\s*(\{.*\});/s);

        if (match) {
            const dashboardSettings = JSON.parse(match[1]);
            console.log(dashboardSettings);
            return dashboardSettings.nonce;
        } else {
            return null;
        }
    }

    async requestCovrSearch(title: string, times = 0) {
        const filters = { showVariants: true, query: title, sort: false };
        const encodedFilters = Buffer.from(JSON.stringify(filters), 'utf-8').toString('base64');
        const url = `https://covrprice.com/wp-json/covr/v1/search/issues?filters=${encodedFilters}&page=1&per_page=50`;

        const res = await this.fetchWithCookies(url, {
            "headers": {
                "accept": "*/*",
                "accept-language": "en-US,en;q=0.9",
                "priority": "u=1, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-wp-nonce": this.nonce,
            },
            "method": "GET"
        });

        console.log(res.status);

        // Handle 403 (unauthorized) - try to re-login once
        if (res.status === 403 && times < 1) {
            console.log('Got 403, attempting to re-login...');
            await this.refreshCovrPriceCookie('randypierce3@yahoo.com', 'Terrax9636');
            return await this.requestCovrSearch(title, times + 1);
        }

        // Handle other error statuses
        if (!res.ok) {
            console.log(`Request failed with status ${res.status}`);
            const errorText = await res.text().catch(() => 'Unable to read error response');
            throw new Error(`HTTP ${res.status}: ${errorText}`);
        }

        // Success case
        const body = await res.json();
        console.log(body);
        return body;
    }

    async refreshCovrPriceCookie(username: string, password: string) {
        // First request - get login page
        const response = await this.fetchWithCookies("https://covrprice.com/login/?return_to=1198472", {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "priority": "u=0, i",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "Referer": "https://covrprice.com/"
            },
            "method": "GET"
        });

        console.log(response.status);
        const html = await response.text();
        const $ = cheerio.load(html);

        // Parse form data
        const ids: { [key: string]: string } = {};
        $(`div[id="acf-form-data"] input`).each((index, element) => {
            const el = $(element);
            const id = el.attr('id');
            const value = el.attr('value');
            if (id && value) {
                ids[id] = value;
            }
        });

        const securityTokens: { [key: string]: string } = {};
        $('input[type="hidden"]').each((index, element) => {
            const $el = $(element);
            const name = $el.attr('name');
            const value = $el.attr('value');

            if (name && ['cfIkRzOt', 'xgzOWvtufGNIwRc', 'SfuMAhkrHzob', 'kbvwGM'].includes(name)) {
                securityTokens[name] = value || '';
            }
        });

        const scriptContent = $('script').filter((i, el) => {
            return $(el).html()?.includes('acf.data');
        }).html();

        const nonceMatch = scriptContent?.match(/"nonce":"([^"]+)"/);
        const formNonce = nonceMatch ? nonceMatch[1] : null;

        const encodedUser = encodeURIComponent(username);
        const encodedPass = encodeURIComponent(password);

        // Submit login form
        const form = await this.fetchWithCookies("https://covrprice.com/wp-admin/admin-ajax.php", {
            "headers": {
                "accept": "application/json, text/javascript, */*; q=0.01",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
                "priority": "u=1, i",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "x-requested-with": "XMLHttpRequest",
                "Referer": "https://covrprice.com/login/?return_to=1198472"
            },
            "body": `_acf_screen=${ids._acf_screen}&_acf_post_id=${ids._acf_post_id}&_acf_validation=${ids._acf_validation}&_acf_form=${ids._acf_form}&_acf_nonce=${ids._acf_nonce}&_acf_changed=${ids._acf_changed}&acf%5B_validate_email%5D=&acf%5Bfield_63a33b33670c3%5D=${encodedUser}&acf%5Bfield_63a33bad670c4%5D=${encodedPass}&acf%5Bfield_63a37714ef40d%5D=1&cfIkRzOt=1%5BhJFX&xgzOWvtufGNIwRc=.UR7Ll&SfuMAhkrHzob=.aNfmXcnKM0iT3%40&kbvwGM=7WTn9%5DHl&action=acf%2Fvalidate_save_post&nonce=${formNonce}&post_id=${ids._acf_post_id}&cfIkRzOt=${securityTokens.cfIkRzOt}&xgzOWvtufGNIwRc=${securityTokens.xgzOWvtufGNIwRc}&SfuMAhkrHzob=${securityTokens.SfuMAhkrHzob}&kbvwGM=${securityTokens.kbvwGM}`,
            "method": "POST"
        });

        console.log(form.status, 'form');
        const data = await form.json();
        console.log(data);
    }

    async fetchIssueSales(issueId: string, tab = "graded", pageRef = 1) {
        const url = `https://covrprice.com/issue-sales/?issue_id=${issueId}&tab=${tab}&page_ref=${pageRef}`;

        const res = await this.fetchWithCookies(url, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "priority": "u=0, i",
                "sec-ch-ua": "\"Not;A=Brand\";v=\"99\", \"Google Chrome\";v=\"139\", \"Chromium\";v=\"139\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"Windows\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1"
            },
            "method": "GET"
        });

        if (!res.ok) {
            throw new Error(`Failed to fetch page: ${res.status} ${res.statusText}`);
        }

        const html = await res.text();
        const $ = cheerio.load(html);
        const results: { [key: string]: any } = {};

        function parseScriptData(scriptContent: string | undefined) {
            if (!scriptContent) return null;

            const labelsMatch = scriptContent.match(/labels:\s*\[(.*?)\]/s);
            const dataMatch = scriptContent.match(/data:\s*\[(.*?)\]/s);

            if (!labelsMatch || !dataMatch) return null;

            const labels = JSON.parse("[" + labelsMatch[1] + "]");
            const data = JSON.parse("[" + dataMatch[1] + "]").map(Number);

            const fmvData: { [key: string]: number } = {};
            labels.forEach((label: string, idx: number) => {
                fmvData[label.split(" ").join("_")] = data[idx];
            });

            return fmvData;
        }

        // Parse chart data
        const rawScript = $(".raw-sales-chart script").html();
        const gradedScript = $(".graded-sales-chart script").html();

        const rawData = parseScriptData(rawScript || undefined);
        const gradedData = parseScriptData(gradedScript || undefined);

        if (rawData) results.raw = rawData;
        if (gradedData) results.graded = gradedData;

        return results;
    }
}

export async function POST({ request }: { request: Request }) {
    try {
        const data = await request.json();
        const { imageBuffer, username, password } = data;
        const buffer = Buffer.from(imageBuffer, 'base64');
        
        const pricingDetails = new ComicPricingDetails();
        
        
        //If you want to use an existing jar, will decrease amount of time required to run.
        // if(jar) {
        //     pricingDetails.jar = CookieJar.fromJSON(jar);
        //     pricingDetails.fetchWithCookies = fetchCookie(fetch, pricingDetails.jar);
        // }

        const result = await pricingDetails.grabData(buffer, true, username, password);
        console.log('Final result:', result);
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }   
}