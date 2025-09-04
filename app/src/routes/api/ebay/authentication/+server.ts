
import { accountsStore } from '$lib/store/app/accounts/accounts.js';
import QueryString from 'qs'
import {json, redirect} from '@sveltejs/kit'
const CLIENT_ID = 'TuxtonTe-Sourcere-PRD-5755ec4ee-8cae39a6';
const CLIENT_SECRET = 'PRD-755ec4eef06a-daee-44d7-a153-2de8';
const auth64Base = (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET)).toString('base64')


const REDIRECT_URI = 'https://tuxtontech.com/authenticate'

const AUTHORIZATION_ENDPOINT = 'https://auth.ebay.com/oauth2/authorize';
const TOKEN_ENDPOINT = 'https://api.ebay.com/identity/v1/oauth2/token';


async function authenticateEbayUser(req: any) {
    const { code } = req.query;

    const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
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
        method: "GET",
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    });

    const userReqData = await userInfoResponse.json();

    const userId = userReqData.userId;
    const username = userReqData.username;
    
    const userData = {
        userId,
        "name": username,
        oauthConnected: true,
        oAuthToken: access_token,
        refresh_token,
        expires_in,
        type: "ebay",
    }

    return userData
}


export async function GET({req}) {
    try {
        const userData = await authenticateEbayUser(req)
        accountsStore.add(userData)
        throw redirect(301, '/app')
        // return json({status: 200, data: userData})
    } catch (error) {
        
    }
}