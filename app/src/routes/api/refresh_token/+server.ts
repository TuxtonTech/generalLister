import {CookieJar} from "tough-cookie";
import fetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import * as cheerio from "cheerio";

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

 async function refreshCovrPriceCookie(username: string, password: string) {
        // First request - get login page
        try {
        // Step 1: Get the login page to extract form data
        console.log('Fetching login page...');
        const loginPageResponse = await fetchWithCookies("https://covrprice.com/login", {
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
        const validationResponse = await fetchWithCookies("https://covrprice.com/wp-admin/admin-ajax.php", {
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
        const loginResponse = await fetchWithCookies("https://covrprice.com/login/", {
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
                cookieJar: fetchWithCookies.cookieJar // Return the cookie jar if your fetch function stores it
            };
        } else if (loginResponse.ok) {
            const loginHtml = await loginResponse.text();
            fs.writeFileSync('./a.html', loginHtml)
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
                    cookieJar: fetchWithCookies.cookieJar
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


    export async function POST({ request }: { request: Request }) {
        try {
            const data = await request.json();
            const { username, password } = data;
            const newJar = refreshCovrPriceCookie(username, password);
            return new Response(JSON.stringify({ success: true , newJar}), { status: 200 });
        } catch (error) {
            console.error('Error processing request:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
        }
    }