// app/src/routes/api/ebay/authentication/+server.ts
import QueryString from 'qs';
import type { RequestHandler } from './$types';

const CLIENT_ID = 'TuxtonTe-Sourcere-PRD-5755ec4ee-8cae39a6';
const CLIENT_SECRET = 'PRD-755ec4eef06a-daee-44d7-a153-2de8';
const REDIRECT_URI = 'https://tuxtontech.com/api/ebay/authentication';
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

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`eBay token exchange failed: ${response.status} ${errorText}`);
    }

    const tokenData = await response.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    const userInfoResponse = await fetch("https://apiz.ebay.com/commerce/identity/v1/user/", {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });

    if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        throw new Error(`eBay user info failed: ${userInfoResponse.status} ${errorText}`);
    }

    const userInfo = await userInfoResponse.json();
    const { userId, username } = userInfo;

    return {
        userId,
        name: username || userId,
        type: "ebay",
        oauthConnected: true,
        oAuthToken: access_token,
        refresh_token,
        expires_in,
        expires_at: Date.now() + (expires_in * 1000)
    };
}

export const GET: RequestHandler = async ({ url, cookies }) => {
    try {
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        
        if (error) {
            throw new Error(`eBay OAuth error: ${error}`);
        }
        
        if (!code) {
            throw new Error('No authorization code provided');
        }

        const userData = await authenticateEbayUser(code);

        // Set cookie for the main user session if needed
        const existingUser = cookies.get('userCookie');
        if (existingUser) {
            try {
                const user = JSON.parse(existingUser);
                user.ebayConnected = true;
                user.ebayData = userData;
                cookies.set('userCookie', JSON.stringify(user), {
                    path: '/',
                    sameSite: 'lax',
                    secure: true,
                    httpOnly: false
                });
            } catch (e) {
                console.error('Failed to update user cookie with eBay data:', e);
            }
        }

        // Return HTML to close popup and notify parent window
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>eBay Authentication Complete</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 20px;
                        background-color: #f5f5f5;
                    }
                    .container { 
                        max-width: 400px; 
                        margin: 0 auto; 
                        background: white; 
                        padding: 30px; 
                        border-radius: 8px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .success { color: #28a745; }
                    .loading { color: #007bff; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2 class="success">eBay Connected Successfully!</h2>
                    <p class="loading">Closing window...</p>
                </div>
                <script>
                    try {
                        // Store eBay user data in parent window's localStorage
                        if (window.opener && window.opener.localStorage) {
                            window.opener.localStorage.setItem('ebayUser', JSON.stringify(${JSON.stringify(userData)}));
                            window.opener.postMessage('ebay-auth-success', window.location.origin);
                        }
                    } catch (error) {
                        console.error('Failed to communicate with parent window:', error);
                    }
                    
                    // Close window after a short delay
                    setTimeout(function() {
                        window.close();
                    }, 1500);
                </script>
            </body>
            </html>
        `, { 
            headers: { 'Content-Type': 'text/html' } 
        });

    } catch (error) {
        console.error('eBay authentication error:', error);
        
        return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>eBay Authentication Error</title>
                <style>
                    body { 
                        font-family: Arial, sans-serif; 
                        text-align: center; 
                        padding: 20px;
                        background-color: #f5f5f5;
                    }
                    .container { 
                        max-width: 400px; 
                        margin: 0 auto; 
                        background: white; 
                        padding: 30px; 
                        border-radius: 8px; 
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .error { color: #dc3545; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2 class="error">✗ Authentication Failed</h2>
                    <p>${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
                    <p>Please try again.</p>
                </div>
                <script>
                    try {
                        if (window.opener) {
                            window.opener.postMessage('ebay-auth-error', window.location.origin);
                        }
                    } catch (e) {
                        console.error('Failed to communicate with parent window:', e);
                    }
                    
                    setTimeout(function() {
                        window.close();
                    }, 3000);
                </script>
            </body>
            </html>
        `, { 
            status: 500,
            headers: { 'Content-Type': 'text/html' } 
        });
    }
};