// app/src/routes/api/oauth/google/+server.ts
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const CLIENT_ID = '149920645749-um1lug44d4adj6skrgh0jpaiqnna4u9b.apps.googleusercontent.com';
const CLIENT_SECRET = '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';
const REDIRECT_URI = 'https://tuxtontech.com/api/oauth/google';

export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get('code');
  
  if (!code) {
    // Initial request - redirect to Google OAuth
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('access_type', 'offline');
    
    throw redirect(302, authUrl.toString());
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to get user info');
    }

    const googleUser = await userResponse.json();

    const user = {
      id: googleUser.id,
      email: googleUser.email,
      displayName: googleUser.name,
      photoURL: googleUser.picture,
      emailVerified: googleUser.verified_email,
    };

    // Return HTML that closes popup and notifies parent
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Complete</title>
        </head>
        <body>
          <script>
          // Store user data in parent window
          document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
          window.close();
    }, 1000);
          });
            if (window.opener) {
              window.opener.postMessage('google-auth-success', window.location.origin);
              // You might also want to store user data in localStorage or send it to your backend
              window.opener.localStorage.setItem('user', JSON.stringify(${JSON.stringify(user)}));
            }

          </script>
          <p>Authentication successful. You can close this window.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage('google-auth-error', window.location.origin);
            }
            window.close();
          </script>
          <p>Authentication failed. Please try again.</p>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
};