import puppeteer from "puppeteer";
import fs from 'fs/promises'
import FormData from 'form-data';
import path from 'path';
import fetch from 'node-fetch';

class ComicPricingDetails {

    constructor() {
    }


    async grabData(imageBuffer, isPng) {
        const topResult = await this.searchPriceCharting(imageBuffer, isPng)
        const title = topResult.name
        const searchResults = await this.scrapeCovrSearch(title)
        //Download all images
        //Send them to python server with original(comparison) image
        //Identify the proper comic
        const resultObj = {}
        const resultVals = Object.values(searchResults)
        const imageBuffers = []
        for(let val of resultVals) {
            const imageResponse = await fetch(val.image);
            const imageData = await imageResponse.arrayBuffer();
            imageBuffers.push(imageData)
        }
        const compareResponse = await fetch('http://localhost:5000/api/compare', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_image: Array.from(imageBuffer),
                comparison_images: imageBuffers.map(buf => Array.from(buf))
            })
        });

        const compareData = await compareResponse.json();
        console.log(compareData)
        if(compareData.length == 0) return null
         
        const bestMatchIndex = compareData.reduce((bestIndex, currentValue, currentIndex, array) => {
            return currentValue < array[bestIndex] ? currentIndex : bestIndex;
        }, 0);
        console.log(`Best match index: ${bestMatchIndex}, Similarity score: ${compareData[bestMatchIndex]}`);
        const bestMatch = resultVals[bestMatchIndex]
        const fmv = await this.fetchIssueSales(bestMatch.issue_id, 'raw', 1)
        resultObj[bestMatch.issue_id] = fmv
        return { ...bestMatch, fmv: fmv }
    }




    /**
     * 
     * @param {*} imageBuffer 
     * @param {*} isPng 
     * @returns {string} top comic book result data
     */
    async searchPriceCharting(imageBuffer, imagePath) {
        // Read the image file

        console.log(`Image size: ${imageBuffer.length} bytes`);

        // Create proper FormData
        const form = new FormData();

        // Determine content type
        const extension = path.extname(imagePath).toLowerCase();
        const contentType = extension === '.png' ? 'image/png' : 'image/jpeg';

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
    async scrapeCovrSearch(title) {
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
        const itemData = await page.evaluate(async () => {
            // Helper function to wait for dropdowns to appear
            const waitForDropdowns = () => {
                return new Promise(resolve => setTimeout(resolve, 500));
            };

            // First, hover over and then click all the ellipsis dropdown buttons
            const ellipsisButtons = document.querySelectorAll('.issue-actions button.ant-dropdown-trigger');
        
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
        
            let itemData = {};
        
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
                let product_id = null;
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

    /**
     * @param {*} issueId
     * @param {*} tab 'raw' or 'graded'
     * @param {*} pageRef page number
     * @returns FMV data object
     */
    async fetchIssueSales(issueId, tab = 'raw', pageRef = 1) {
  
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
            function parseScriptData(scriptElement, type) {
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
                labels.forEach((label, index) => {
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

        const pricingDetails = new ComicPricingDetails();
        const result = await pricingDetails.grabData(Buffer.from(imageBuffer), true);
        return new Response(JSON.stringify(result), { status: 200 });
    } catch (error) {
        console.error('Error processing request:', error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }   
}
