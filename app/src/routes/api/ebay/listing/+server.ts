// app/src/routes/api/ebay/listing/+server.ts
import SimplifiedEbayLister from './ebay.js';
import type { RequestHandler } from './$types';

const CLIENT_ID = 'TuxtonTe-Sourcere-PRD-5755ec4ee-8cae39a6';
const CLIENT_SECRET = 'PRD-755ec4eef06a-daee-44d7-a153-2de8';
const AUTH_BASE = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const refreshToken = formData.get('refresh_token') as string;
        const binaryImage = formData.get('image') as File;
        const itemDataStr = formData.get('item_data') as string;
        const username = (formData.get('username') as string) || 'default_user';

        if (!refreshToken || !itemDataStr) {
            return Response.json({
                error: 'Missing required fields: refresh_token and item_data are required'
            }, { status: 400 });
        }

        // Parse item data
        let itemData;
        try {
            itemData = JSON.parse(itemDataStr);
        } catch (error) {
            return Response.json({
                error: 'Invalid item_data JSON format'
            }, { status: 400 });
        }

        // Validate required item data fields
        const requiredFields = ['sku', 'title', 'description', 'price'];
        const missingFields = requiredFields.filter(field => !itemData[field]);

        if (missingFields.length > 0) {
            return Response.json({
                error: `Missing required item data fields: ${missingFields.join(', ')}`
            }, { status: 400 });
        }

        // Convert image to base64 if needed for search
        let base64Image = null;
        if (binaryImage instanceof File && binaryImage.size > 0) {
            const arrayBuffer = await binaryImage.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            base64Image = buffer.toString('base64');
        }

        // Initialize eBay lister
        const ebayLister = new SimplifiedEbayLister();

        // Optional: Search by image first to check for similar items
        let searchResults = null;
        if (base64Image) {
            try {
                const searchResponse = await ebayLister.searchByImage(base64Image);
                if (searchResponse.success) {
                    searchResults = searchResponse.results;
                }
            } catch (error) {
                console.warn('Image search failed:', error instanceof Error ? error.message : String(error));
                // Continue with listing even if image search fails
            }
        }

        // List the item
        const listingResult = await ebayLister.listItem(
            itemData, 
            refreshToken, 
            AUTH_BASE, 
            username, 
            binaryImage
        );

        if (listingResult.success) {
            return Response.json({
                success: true,
                message: listingResult.message,
                listingId: listingResult.listingId,
                offerId: listingResult.offerId,
                searchResults: searchResults // Optional: include search results if available
            });
        } else {
            return Response.json({
                error: listingResult.error
            }, { status: 400 });
        }

    } catch (error) {
        console.error('Server error:', error);
        return Response.json({
            error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
        }, { status: 500 });
    }
};