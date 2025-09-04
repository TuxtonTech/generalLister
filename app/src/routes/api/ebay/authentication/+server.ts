import QueryString from 'qs';
const CLIENT_ID = 'TuxtonTe-Sourcere-PRD-5755ec4ee-8cae39a6';
const CLIENT_SECRET = 'PRD-755ec4eef06a-daee-44d7-a153-2de8';
const REDIRECT_URI = 'https://tuxtontech.com/authenticate';
const TOKEN_ENDPOINT = 'https://api.ebay.com/identity/v1/oauth2/token';
const auth64Base = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

async function authenticateEbayUser(code: string) {
    const response = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth64Base}`
        },
        body: QueryString.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET
        })
    });

    const { access_token, refresh_token, expires_in } = await response.json();

    const userInfoResponse = await fetch("https://apiz.ebay.com/commerce/identity/v1/user/", {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });

    const { userId, username } = await userInfoResponse.json();

    return {
        userId,
        name: username,
        type: "ebay",
        oauthConnected: true,
        oAuthToken: access_token,
        refresh_token,
        expires_in
    };
}

export async function GET(event) {
    try {
        const code = event.url.searchParams.get('code');
        if (!code) throw new Error('No code provided');

        const userData = await authenticateEbayUser(code);

        // Set cookie via event.cookies
        event.cookies.set('userCookie', JSON.stringify(userData), {
            path: '/',
            sameSite: 'lax'
        });

        // Return minimal HTML to close popup
        return new Response(`
            <script>
                window.opener.postMessage('ebay-auth-success', window.location.origin);
                window.close();
            </script>
        `, { headers: { 'Content-Type': 'text/html' } });

    } catch (error) {
        return new Response(`Error: ${error.message}`, { status: 500 });
    }
}