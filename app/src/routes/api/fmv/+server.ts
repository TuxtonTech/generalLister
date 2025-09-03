import puppeteer from "puppeteer";
import fs from 'fs/promises'
import FormData from 'form-data';
import path from 'path';
import fetch from 'node-fetch';



class ComicPricingDetails {

    constructor() {
        this.nonce = "05170f134e";
        this.cookieString = '_uetvid=69431c60885c11f09e3ed3a63ed2256a; _uetsid=69427cb0885c11f09a0755e573dd8fab; _ga_513Y8DFYY6=GS2.1.s1756859093$o1$g1$t1756859102$j51$l1$h1436737572; _hjSessionUser_3319327=eyJpZCI6ImZkNGMwYzdlLWFhNmMtNTAwMS1iNWRjLTQ1ZTNjYjkxYjUyOCIsImNyZWF0ZWQiOjE3NTY4NTkwOTMyMTEsImV4aXN0aW5nIjp0cnVlfQ==; wordpress_logged_in_3ec223733b8b9c07d90148e056c02445=RandyPierce3%7C1759278300%7CThk7QjCOkD5YnP4zDkFee6Fr3GCMz7VXUM1XH7ATl9r%7Cec6a7dd3020fe3f12c5f1c0f589cd2aa29d16f4c915cf4682d1bdb4ea1fea9da; cerber_groove_x_ZdGPujmESNaRIeDLJ3inqroh2Ul=KDS0cYpw97QPo5GvWkACfbs4TFxuL; _ga=GA1.1.1356458747.1756859093; cerber_groove=4a57d74e44eaa03b4c0ee4759b826630; _fbp=fb.1.1756859093273.982139327452889456; _hjSession_3319327=eyJpZCI6ImFmYjE5OWU1LTZiNmEtNDNiYS1hZDAwLTYyYmM1Y2I4YWJlOCIsImMiOjE3NTY4NTkwOTMyMTIsInMiOjAsInIiOjAsInNiIjowLCJzciI6MCwic2UiOjAsImZzIjoxLCJzcCI6MH0=; FpIqTngBYuH=feyYFpCBN6Eq3; PHPSESSID=lnehat62n0ln5pnuatf3u0vq15; _gcl_au=1.1.1631005936.1756859093; db-axIQXj_=DqUBynKso95vr%2AAJ; RYGSoEPHnVCbUix=s3%5BQRf'
    }


    async grabData(imageBuffer: Buffer | Uint8Array, isPng: boolean) {
        try {
            const topResult = await this.searchPriceCharting(imageBuffer, true);
            const title = topResult.name;
            console.log(title);

            const searchResults = await this.requestCovrSearch(title);
            let resultsObj: any = {}
            
            // Fix the mapping logic - you don't need formattedResults if you're not using it
            searchResults.issuesES.hits.hits.forEach((v: { _id: string; _score: any; }) => {
                resultsObj[v['_id']] = {id: v['_id'], score: v["_score"]};
            });

            searchResults.issues.forEach(v => {
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

            const imageUrls = Object.values(resultsObj)
                .map(v => v.image ? {image: v.image, id: v.id} : null)
                .filter(v => v !== null);

            // Keep track of successful downloads with their original indices
            const imageBuffers: ArrayBuffer[] = [];
            const successfulIndices: number[] = [];

            // Download all images with error handling
            for (let i = 0; i < imageUrls.length; i++) {
                const d = imageUrls[i];
                try {
                    const imageResponse = await fetch(d.image);
                    if (!imageResponse.ok) {
                        console.warn(`Failed to fetch image: ${d.image}, status: ${imageResponse.status}`);
                        continue;
                    }
                    const imageData = await imageResponse.arrayBuffer();
                    imageBuffers.push(imageData);
                    successfulIndices.push(i); // Track which original index this corresponds to
                } catch (error) {
                    console.warn(`Error fetching image ${d.image}:`, error);
                }
            }

            // Ensure we have images to compare
            if (imageBuffers.length === 0) {
                console.warn('No images downloaded for comparison');
                if(imageUrls.length === 0) console.warn('No images found from search');
                if(imageUrls.length > 0) console.warn('Images found from search but failed to download any');
                return null;
            }

            // Convert buffers properly for JSON
            const compareResponse = await fetch('http://localhost:5000/api/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_image: Array.from(new Uint8Array(imageBuffer)),
                    comparison_images: imageBuffers.map((buf) => Array.from(new Uint8Array(buf)))
                })
            });

            if (!compareResponse.ok) {
                throw new Error(`Compare API failed: ${compareResponse.status} ${compareResponse.statusText}`);
            }

            const compareData = await compareResponse.json();
            console.log(compareData);

            if (!compareData || compareData.length === 0) {
                console.warn('No comparison data returned');
                return null;
            }

            // Find best match (assuming lower score = better match)
            const bestMatchIndex = compareData.reduce((bestIndex: number, currentValue: number, currentIndex: number, array: number[]) => {
                return currentValue < array[bestIndex] ? currentIndex : bestIndex;
            }, 0);

            // Map back to the original imageUrls index
            const originalIndex = successfulIndices[bestMatchIndex];
            const bestMatchId = imageUrls[originalIndex].id;
            const bestMatch = resultsObj[bestMatchId];
            
            // Wrap the fetchIssueSales call in try-catch
            let fmv;
            try {
                fmv = await this.fetchIssueSales(bestMatch.id, 'raw', 1);
            } catch (error) {
                console.warn('Failed to fetch issue sales:', error);
                fmv = null;
            }
            
            return { 
                ...bestMatch, 
                fmv: fmv,
                similarityScore: compareData[bestMatchIndex]
            };

        } catch (error) {
            console.error('Error in grabData:', error);
            throw error;
        }
}
    /**
     * 
     * @param {*} imageBuffer 
     * @param {*} isPng 
     * @returns {string} top comic book result data
     */
    async searchPriceCharting(imageBuffer: string | any[] | Buffer<ArrayBufferLike> | Uint8Array<ArrayBufferLike>, isPng: string | boolean) {
        // Read the image file

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
                    // IMPORTANT: Don't set content-type manually, let FormData handle it
                    ...form.getHeaders()
                },
                body: form,
                // Add credentials to include cookies
                credentials: "include"
            });

            console.log('Response status:', res.status);
            console.log('Response headers:', Object.fromEntries(res.headers.entries()));

            if (res.status === 200) {
                const result = await res.json();
                console.log('Success:', JSON.stringify(result, null, 2));

                return result.answer_records[0];
            } else {
                const errorText = await res.text();
                console.log('Error response:', errorText);
                return null
                try {
                    const errorJson = JSON.parse(errorText);
                    console.log('Error JSON:', JSON.stringify(errorJson, null, 2));
                } catch (e) {
                    console.log('Error text (not JSON):', errorText);
                }
            }

        } catch (error) {
            console.error('Fetch error:', error);
        }
    }

    /**
     * 
     * @param {*} title 
     * @returns An object of title: data
     */
    async scrapeCovrSearch(title: string | number | boolean) {
        const searchUrl = `https://covrprice.com/search/?search=${encodeURIComponent(title)}`;
        const browser = await puppeteer.launch({
            headless: false, // headed browser
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--disable-blink-features=AutomationControlled',
                '--no-first-run',
                '--disable-extensions'
            ],
            defaultViewport: { width: 1920, height: 1080 },
            ignoreDefaultArgs: ['--enable-automation'],
        timeout: 60000
        });

        const page = await browser.newPage();

        // Anti-detection tweaks
        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
            window.chrome = { runtime: {} };
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Set cookies before navigation
        await page.setCookie(
            { name: 'PHPSESSID', value: 'skdp5mk0gksrvkrsvp07hhc4sr', domain: 'covrprice.com' },
            { name: 'cerber_groove', value: '4a57d74e44eaa03b4c0ee4759b826630', domain: 'covrprice.com' },
            { name: 'cerber_groove_x_ZdGPujmESNaRIeDLJ3inqroh2Ul', value: 'KDS0cYpw97QPo5GvWkACfbs4TFxuL', domain: 'covrprice.com' },
            { name: 'wordpress_logged_in_3ec223733b8b9c07d90148e056c02445', value: 'RandyPierce3%7C1758918386%7CgXwACWzrCywnz5l78jbvILrEszsMAuG6kJESoy3lFu1%7Ce1ef9a4cffc8d4c0856661bb52b2da5e45112fef702690a29c2f9b397950c713', domain: 'covrprice.com' },
            { name: 'wordpress_sec_3ec223733b8b9c07d90148e056c02445', value: 'RandyPierce3%7C1758918386%7CgXwACWzrCywnz5l78jbvILrEszsMAuG6kJESoy3lFu1%7Ccd9b9fa6feea499a3ce45adc60fa983b35145ab5eee128a653302621732d4aa8', domain: 'covrprice.com' },
            { name: 'pvQzuCjG', value: 'BtoqLM.', domain: 'covrprice.com' },
            { name: 'lzHsmDObkpQ', value: 'YbsDSqCuOyc2kHaE', domain: 'covrprice.com' },
            { name: 'DQMjzNC_A', value: 'JCoXfMI4%5Bi', domain: 'covrprice.com' }
        );

        // Navigate and wait for search results
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
        await page.waitForSelector("article");

        // Run your code and return the data
        const itemData: any = await page.evaluate(async () => {
            // Helper function to wait for dropdowns to appear
            const waitForDropdowns = () => {
                return new Promise(resolve => setTimeout(resolve, 500));
            };

            // First, hover over and then click all the ellipsis dropdown buttons
            const ellipsisButtons: any = document.querySelectorAll('.issue-actions button.ant-dropdown-trigger');
        
            for (let button of ellipsisButtons) {
                // Hover first
                const hoverEvent = new MouseEvent('mouseenter', {
                    view: window,
                    bubbles: true,
                    cancelable: true
                });
                button.dispatchEvent(hoverEvent);
            
                // Then click
                button.click();
            }
        
            // Wait for dropdowns to fully appear
            await waitForDropdowns();
        
            let itemData:any = {};
        
            // Get all articles from the search results
            const articles = document.querySelectorAll('article.covr-grid-article');
        
            articles.forEach((article, index) => {
                // Extract image
                const img = article.querySelector('img')?.src || null;
            
                // Extract title, variant, and brand from col-issue-desc
                const titleElement = article.querySelector('.col-issue-desc .titleLink a');
                const title = titleElement?.textContent?.trim() || '';
                const href = titleElement?.href || '';
            
                // Extract product ID from the href
                let product_id: string = '';
                if (href) {
                    const urlParts = href.split('/');
                    product_id = urlParts[urlParts.length - 1]; // Gets the last part of the URL
                }
            
                // Get variant and brand from the desc div
                const descDiv = article.querySelector('.col-issue-desc');
                const descLines = descDiv?.textContent?.split('\n').filter(line => line.trim()) || [];
                const variant = descLines[1]?.trim() || '';
                const brand = descLines[2]?.trim() || '';
            
                // Extract year
                const yearElement = article.querySelector('.ant-col.ant-col-2.no-wrap.flex-vertical-center.flex-align-center');
                const year = yearElement?.textContent?.trim() || '';
            
                // Extract price info
                const priceElements = article.querySelectorAll('.ant-col.ant-col-2.no-wrap.flex-vertical-center.flex-align-center .mar-auto-0.flex');
                let currentPrice = '';
                let weeklyChange = '';
            
                if (priceElements.length >= 1) {
                    currentPrice = priceElements[0]?.textContent?.trim() || '';
                }
                if (priceElements.length >= 2) {
                    weeklyChange = priceElements[1]?.textContent?.trim() || '';
                }
            
                // Extract grade
                const gradeButton = article.querySelector('.ant-btn.ant-dropdown-trigger.greyButton.selectButton.grades-select');
                const grade = gradeButton?.textContent?.trim() || '';
            
                // Extract issue_id from "Buy In Marketplace" dropdown link
                // Since dropdowns are created sequentially, the nth dropdown corresponds to the nth article
                let issue_id = null;
                const allDropdowns = document.querySelectorAll('.ant-dropdown');
                if (allDropdowns[index]) {
                    const marketplaceLink = allDropdowns[index].querySelector('a[href*="issue_id="]');
                    if (marketplaceLink) {
                        const marketplaceHref = marketplaceLink.href;
                        if (marketplaceHref && marketplaceHref.includes('issue_id=')) {
                            issue_id = marketplaceHref.split('issue_id=')[1];
                        }
                    }
                }
            
                if (product_id) {
                    itemData[product_id] = {
                        image: img,
                        title: title,
                        variant: variant,
                        brand: brand,
                        year: year,
                        grade: grade,
                        currentPrice: currentPrice,
                        weeklyChange: weeklyChange,
                        id: product_id,
                        href: href,
                        issue_id: issue_id,
                        pricingHref: `https://covrprice.com/issue-sales/?issue_id=${issue_id}&tab=graded&page_ref=1`
                    };
                }
            });
        
            return itemData;
        });
        
        await browser.close()
        return itemData;
    }

    async covrPriceLogin() {

    }


    async loginToCovrPrice(username, password) {
        let browser;
        
        try {
            // Launch browser
            browser = await puppeteer.launch({
                headless: false, // Set to true for headless mode
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            const page = await browser.newPage();
            
            // Set user agent to avoid bot detection
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            
            // Set viewport
            await page.setViewport({ width: 1366, height: 768 });

            console.log('Navigating to login page...');
            
            // Navigate to login page
            await page.goto('https://covrprice.com/login/', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            console.log('Waiting for form elements...');
            
            // Wait for the form elements to be present
            await page.waitForSelector('#acf-field_63a33b33670c3', { timeout: 10000 });
            await page.waitForSelector('#password', { timeout: 10000 });
            await page.waitForSelector('input[type="submit"]', { timeout: 10000 });

            console.log('Filling out login form...');
            
            // Fill in the username/email field
            await page.type('#acf-field_63a33b33670c3', username, { delay: 100 });
            
            // Fill in the password field
            await page.type('#password', password, { delay: 100 });

            console.log('Submitting form...');
            
            // Submit the form and wait for navigation
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
                page.click('input[type="submit"]')
            ]);

            console.log('Login completed, navigating to homepage for nonce...');
            
            // Navigate to homepage to get the nonce
            await page.goto('https://covrprice.com/', {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            console.log('Extracting nonce from homepage...');
            
            // Extract nonce from dashboardSettings
            const nonce = await page.evaluate(() => {
                // Try to get nonce from dashboardSettings
                if (window.dashboardSettings && window.dashboardSettings.nonce) {
                    return window.dashboardSettings.nonce;
                }
                
                // Fallback: Look for it in script tags
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const content = script.textContent || script.innerHTML;
                    const match = content.match(/dashboardSettings\s*=\s*{[^}]*"nonce"\s*:\s*"([^"]+)"/);
                    if (match) {
                        return match[1];
                    }
                }
                
                return null;
            });
            
            // Get cookies
            const cookies = await page.cookies();
            const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            
            // Set class properties
            this.cookieString = cookieString;
            this.nonce = nonce;
            
            console.log('Extraction completed!');
            console.log('Cookie String:', this.cookieString);
            console.log('Nonce:', this.nonce);
            
            return {
                cookieString: this.cookieString,
                nonce: this.nonce
            };

        } catch (error) {
            console.error('Error during login process:', error);
            this.cookieString = null;
            this.nonce = null;
            return {
                cookieString: null,
                nonce: null,
                error: error.message
            };
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
   
    async requestCovrSearch(title: string | number | boolean, times = 0) {
    const filters = {showVariants: true, query: title, sort: false}
    const referrer = `https://covrprice.com/search/?search=${encodeURIComponent(title)}`;
    const encodedFilters = Buffer.from(JSON.stringify(filters), 'utf-8').toString('base64')
    const url = `https://covrprice.com/wp-json/covr/v1/search/issues?filters=${encodedFilters}&page=1&per_page=50`;
    
    const res = await fetch(url, {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "priority": "u=1, i",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-wp-nonce": this.nonce,
            "cookie": this.cookieString
        },
        "referrer": referrer,
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    });

    console.log(res.status);
    
    // Handle 403 (unauthorized) - try to re-login once
    if (res.status === 403 && times < 1) { 
        console.log('Got 403, attempting to re-login...');
        const result = await this.loginToCovrPrice('randypierce3@yahoo.com', 'Terrax9636');
        
        if (result.error) {
            console.log('Re-login failed:', result.error);
            throw new Error(`Login failed: ${result.error}`);
        }
        
        console.log('Re-login successful. New credentials:', this.cookieString, this.nonce);
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

    /**
     * @param {*} issueId
     * @param {*} tab 'raw' or 'graded'
     * @param {*} pageRef page number
     * @returns FMV data object
     */
    async fetchIssueSales(issueId: any, tab = 'raw', pageRef = 1) {
  
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();
  
        // Set cookies
        const cookies = [
            { name: 'PHPSESSID', value: 'skdp5mk0gksrvkrsvp07hhc4sr', domain: 'covrprice.com' },
            { name: 'cerber_groove', value: '4a57d74e44eaa03b4c0ee4759b826630', domain: 'covrprice.com' },
            { name: 'cerber_groove_x_ZdGPujmESNaRIeDLJ3inqroh2Ul', value: 'KDS0cYpw97QPo5GvWkACfbs4TFxuL', domain: 'covrprice.com' },
            { name: 'wordpress_logged_in_3ec223733b8b9c07d90148e056c02445', value: 'RandyPierce3%7C1758918386%7CgXwACWzrCywnz5l78jbvILrEszsMAuG6kJESoy3lFu1%7Ce1ef9a4cffc8d4c0856661bb52b2da5e45112fef702690a29c2f9b397950c713', domain: 'covrprice.com' },
            { name: 'wordpress_sec_3ec223733b8b9c07d90148e056c02445', value: 'RandyPierce3%7C1758918386%7CgXwACWzrCywnz5l78jbvILrEszsMAuG6kJESoy3lFu1%7Ccd9b9fa6feea499a3ce45adc60fa983b35145ab5eee128a653302621732d4aa8', domain: 'covrprice.com' },
            { name: 'pvQzuCjG', value: 'BtoqLM.', domain: 'covrprice.com' },
            { name: 'lzHsmDObkpQ', value: 'YbsDSqCuOyc2kHaE', domain: 'covrprice.com' },
            { name: 'DQMjzNC_A', value: 'JCoXfMI4%5Bi', domain: 'covrprice.com' }
        ];
  
        await page.setCookie(...cookies);
  
        const url = `https://covrprice.com/issue-sales/?issue_id=${issueId}&tab=${tab}&page_ref=${pageRef}`;
        await page.goto(url, { waitUntil: 'networkidle2' });
  
        const result = await page.evaluate(() => {
            // Get both script elements
            const rawScriptElement = document.querySelector(`[class="raw-sales-chart"] script`);
            const gradedScriptElement = document.querySelector(`[class="graded-sales-chart"] script`);

            const results = {};

            // Helper function to parse script content
            function parseScriptData(scriptElement: Element, type: string) {
                if (!scriptElement) return null;
      
                const scriptContent = scriptElement.innerHTML;
      
                // Extract labels and data using regex
                const labelsMatch = scriptContent.match(/labels:\s*\[(.*?)\]/);
                const dataMatch = scriptContent.match(/data:\s*\[(.*?)\]/);
      
                if (!labelsMatch || !dataMatch) return null;
      
                // Parse the arrays
                const labels = JSON.parse('[' + labelsMatch[1] + ']');
                const data = JSON.parse('[' + dataMatch[1] + ']').map(Number);
      
                // Create the object mapping labels to data
                const fmvData = {};
                labels.forEach((label: string, index: string | number) => {
                    fmvData[`${label.split(" ").join("_")}`] = data[index];
                });
      
                return fmvData;
            }

            // Parse both raw and graded data
            if (rawScriptElement) {
                results.raw = parseScriptData(rawScriptElement, 'raw');
            }
    
            if (gradedScriptElement) {
                results.graded = parseScriptData(gradedScriptElement, 'graded');
            }

            console.log(results);
            return results;
        });
  
        await browser.close();
        return result;
    }
}

export async function POST({ request }) {
    try {
        const data = await request.json();
        const { imageBuffer } = data;
        const buffer = Buffer.from(imageBuffer, 'base64');

        const pricingDetails = new ComicPricingDetails();
        const result = await pricingDetails.grabData(buffer, true);
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }   
}
