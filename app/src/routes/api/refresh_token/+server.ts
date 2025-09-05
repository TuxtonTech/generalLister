import {CookieJar} from "tough-cookie";
import fetch from "node-fetch";
import fetchCookie from "fetch-cookie";
import cheerio from "cheerio";

async function refreshCovrPriceCookie(username: string, password: string) {
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