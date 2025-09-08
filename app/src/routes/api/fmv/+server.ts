import FormData from 'form-data';
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
            await this.refreshCovrPriceCookie(username, password);
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
        try {
        // Step 1: Get the login page to extract form data
        console.log('Fetching login page...');
        const loginPageResponse = await this.fetchWithCookies("https://covrprice.com/login", {
            headers: {
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
            method: "GET"
        });

        if (!loginPageResponse.ok) {
            throw new Error(`Failed to fetch login page: ${loginPageResponse.status}`);
        }

        const html = await loginPageResponse.text();
        const $ = cheerio.load(html);

        // Extract ACF form data
        const formData = {};
        $('#acf-form-data input[type="hidden"]').each((index, element) => {
            const $el = $(element);
            const name = $el.attr('name');
            const value = $el.attr('value') || '';
            if (name) {
                formData[name] = value;
            }
        });

        // Extract security tokens from the main form
        const securityTokens = {};
        $('input[type="hidden"]').each((index, element) => {
            const $el = $(element);
            const name = $el.attr('name');
            const value = $el.attr('value') || '';

            // These appear to be anti-bot/security tokens
            if (name && ['cfIkRzOt', 'xgzOWvtufGNIwRc', 'SfuMAhkrHzob', 'kbvwGM'].includes(name)) {
                securityTokens[name] = value;
            }
        });

        // Extract nonce from script tag
        const scripts = $('script');
        let formNonce = null;

        scripts.each((i, script) => {
            const content = $(script).html() || '';
            if (content.includes('acf.data')) {
                const nonceMatch = content.match(/"nonce":"([^"]+)"/);
                if (nonceMatch) {
                    formNonce = nonceMatch[1];
                    return false; // Break out of each loop
                }
            }
        });

        console.log('Extracted form data:', {
            formData,
            securityTokens,
            formNonce: formNonce ? 'found' : 'not found'
        });

        if (!formNonce) {
            throw new Error('Could not extract form nonce');
        }

        // Step 2: Submit the form for validation
        const validationBody = new URLSearchParams({
            '_acf_screen': formData._acf_screen || 'acfe_form',
            '_acf_post_id': formData._acf_post_id || '',
            '_acf_validation': formData._acf_validation || '1',
            '_acf_form': formData._acf_form || '',
            '_acf_nonce': formData._acf_nonce || '',
            '_acf_changed': formData._acf_changed || '0',
            'acf[_validate_email]': '',
            'acf[field_63a33b33670c3]': username,
            'acf[field_63a33bad670c4]': password,
            'acf[field_63a37714ef40d]': '0', // Hidden field
            'acf[field_63a37714ef40d]': '1', // Checkbox value (Keep Me Logged In)
            'cfIkRzOt': securityTokens.cfIkRzOt || '1[hJFX',
            'xgzOWvtufGNIwRc': securityTokens.xgzOWvtufGNIwRc || '.UR7Ll',
            'SfuMAhkrHzob': securityTokens.SfuMAhkrHzob || '.aNfmXcnKM0iT3@',
            'kbvwGM': securityTokens.kbvwGM || '7WTn9]Hl',
            'action': 'acf/validate_save_post',
            'nonce': formNonce,
            'post_id': formData._acf_post_id || ''
        });

        console.log('Submitting validation request...');
        const validationResponse = await this.fetchWithCookies("https://covrprice.com/wp-admin/admin-ajax.php", {
            headers: {
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
            body: validationBody.toString(),
            method: "POST"
        });

        console.log('Validation response status:', validationResponse.status);

        if (!validationResponse.ok) {
            throw new Error(`Validation request failed: ${validationResponse.status}`);
        }

        const validationData = await validationResponse.json();
        console.log('Validation response:', validationData);
        // console.log(jar.getCookieStringSync('https://covrprice.com'));
        // Step 3: Submit the actual login form
        const loginBody = new URLSearchParams({
            '_acf_screen': formData._acf_screen || 'acfe_form',
            '_acf_post_id': formData._acf_post_id || '',
            '_acf_validation': formData._acf_validation || '1',
            '_acf_form': formData._acf_form || '',
            '_acf_nonce': formData._acf_nonce || '',
            '_acf_changed': '1', // Changed to 1 after validation
            'acf[_validate_email]': '',
            'acf[field_63a33b33670c3]': username,
            'acf[field_63a33bad670c4]': password,
            'acf[field_63a37714ef40d]': '0',
            'acf[field_63a37714ef40d]': '1',
            'cfIkRzOt': securityTokens.cfIkRzOt || '1[hJFX',
            'xgzOWvtufGNIwRc': securityTokens.xgzOWvtufGNIwRc || '.UR7Ll',
            'SfuMAhkrHzob': securityTokens.SfuMAhkrHzob || '.aNfmXcnKM0iT3@',
            'kbvwGM': securityTokens.kbvwGM || '7WTn9]Hl'
        });

        console.log('Submitting login form...', loginBody.toString());
        const loginResponse = await this.fetchWithCookies("https://covrprice.com/login/", {
            headers: {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "content-type": "application/x-www-form-urlencoded",
                "priority": "u=0, i",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "Referer": "https://covrprice.com/login/"
            },
            body: loginBody.toString(),
            method: "POST"
        });

        console.log('Login response status:', loginResponse.status);
        // console.log(jar.getCookieStringSync('https://covrprice.com'));
        // Check if login was successful (usually redirects on success)
        if (loginResponse.status === 302 || loginResponse.status === 301) {
            console.log('Login successful - redirected');
            return {
                success: true,
                message: 'Login successful',
                cookieJar: this.fetchWithCookies.cookieJar // Return the cookie jar if your fetch function stores it
            };
        } else if (loginResponse.ok) {
            const loginHtml = await loginResponse.text();
            // Check if we're still on login page (failed login) or somewhere else (success)
            if (loginHtml.includes('Username or Email Address') && loginHtml.includes('Password')) {
                return {
                    success: false,
                    message: 'Login failed - still on login page',
                    cookieJar: null
                };
            } else {
                console.log('Login appears successful - different page content');
                return {
                    success: true,
                    message: 'Login successful',
                    cookieJar: this.fetchWithCookies.cookieJar
                };
            }
        } else {
            throw new Error(`Login request failed: ${loginResponse.status}`);
        }

    } catch (error) {
        console.error('Error in refreshCovrPriceCookie:', error);
        return {
            success: false,
            message: error.message,
            cookieJar: null
        };
    }
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

    function parseChartData(scriptContent: string | undefined) {
        if (!scriptContent) return null;

        try {
            // Extract labels array
            const labelsMatch = scriptContent.match(/labels:\s*\[(.*?)\]/s);
            // Extract data array
            const dataMatch = scriptContent.match(/data:\s*\[(.*?)\]/s);

            if (!labelsMatch || !dataMatch) return null;

            // Parse the arrays - handle quoted strings in labels
            const labelsStr = labelsMatch[1];
            const dataStr = dataMatch[1];

            // Parse labels (they're quoted strings)
            const labels = JSON.parse("[" + labelsStr + "]");
            // Parse data (they're quoted numbers, so convert to numbers)
            const data = JSON.parse("[" + dataStr + "]").map((val: string) => parseFloat(val));

            // Create grade -> price mapping
            const fmvData: { [key: string]: number } = {};
            labels.forEach((label: string, idx: number) => {
                // Keep grade as is (e.g., "9.2", "10", "3.5")
                fmvData[label] = data[idx];
            });

            return fmvData;
        } catch (error) {
            console.error('Error parsing chart data:', error);
            return null;
        }
    }

    // Find and parse raw sales chart
    const rawChartScript = $('.raw-sales-chart script').html();
    if (rawChartScript) {
        const rawData = parseChartData(rawChartScript);
        if (rawData) {
            results.raw = rawData;
        }
    }

    // Find and parse graded sales chart
    const gradedChartScript = $('.graded-sales-chart script').html();
    if (gradedChartScript) {
        const gradedData = parseChartData(gradedChartScript);
        if (gradedData) {
            results.graded = gradedData;
        }
    }

    return results;
}
}

import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    try {
        // Check content length
        const contentLength = request.headers.get('content-length');
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (contentLength && parseInt(contentLength) > maxSize) {
            return new Response('Data too large', { status: 413 });
        }
        
        const data = await request.json();
        const { imageBuffer, username, password } = data;
        
        if (!imageBuffer || !username || !password) {
            return new Response('Missing required fields', { status: 400 });
        }
        
        // Convert base64 to buffer
        const buffer = Buffer.from(imageBuffer, 'base64');
        
        const pricingDetails = new ComicPricingDetails();
        const result = await pricingDetails.grabData(buffer, true, username, password);
        
        console.log(`Image processed, buffer size: ${buffer.length} bytes`);
        console.log('CHange')
        return new Response(JSON.stringify({ 
            success: true,
            bufferSize: buffer.length,
            result: result
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Image processing error:', error);
        return new Response('Processing failed', { status: 500 });
    }
};