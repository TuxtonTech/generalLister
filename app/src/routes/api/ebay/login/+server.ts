import { redirect, json } from "@sveltejs/kit";

const CLIENT_ID = 'TuxtonTe-Sourcere-PRD-5755ec4ee-8cae39a6';


const REDIRECT_URI = 'https://tuxtontech.com/authenticate'

const AUTHORIZATION_ENDPOINT = 'https://auth.ebay.com/oauth2/authorize';


async function navigateToEbayLogin() {
    const authUrl = `${AUTHORIZATION_ENDPOINT}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/commerce.identity.readonly https://api.ebay.com/oauth/api_scope/sell.reputation https://api.ebay.com/oauth/api_scope/sell.reputation.readonly https://api.ebay.com/oauth/api_scope/commerce.notification.subscription https://api.ebay.com/oauth/api_scope/commerce.notification.subscription.readonly https://api.ebay.com/oauth/api_scope/sell.stores https://api.ebay.com/oauth/api_scope/sell.stores.readonly https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.account.readonly`;
    return authUrl
}

export async function GET() {
    try {
        const authUrl = await navigateToEbayLogin()
        return new Response(JSON.stringify({ authUrl }), {
            headers: { 'content-type': 'application/json' }
        });
    } catch(error) {
        if (error && typeof error === 'object' && 'status' in error && error.status >= 300 && error.status < 400) {
            throw error;
        }
        
        // Handle other errors by returning a proper Response
        console.error('Error generating eBay auth URL:', error);
        
        return new Response(
            JSON.stringify({ 
                error: 'Failed to generate authentication URL',
                message: error.message || 'Unknown error'
            }), 
            {
                status: 500,
                headers: { 'content-type': 'application/json' }
            }
        );
    }
}