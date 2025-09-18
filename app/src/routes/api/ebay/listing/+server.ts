import SimplifiedEbayLister from './ebay.js';
import type { RequestHandler } from './$types';
import { Buffer } from 'node:buffer'; // Import Buffer for Node.js environments

const CLIENT_ID = 'TuxtonTe-Sourcere-PRD-5755ec4ee-8cae39a6';
const CLIENT_SECRET = 'PRD-755ec4eef06a-daee-44d7-a153-2de8';
const AUTH_BASE = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

export const POST: RequestHandler = async ({ request }) => {
    try {
        const formData = await request.formData();
        const refreshToken = formData.get('refresh_token') as string;
        // Use getAll to get an array of files
        const imageFiles = formData.getAll('images') as File[]; // This will be an array of File objects
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

        // Convert all image files to an array of Buffers
        const imageBuffers: Buffer[] = [];
        const base64Images: string[] = []; // For potential image search or other base64 needs

        for (const file of imageFiles) {
            if (file instanceof File && file.size > 0) {
                const arrayBuffer = await file.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                imageBuffers.push(buffer);
                base64Images.push(buffer.toString('base64'));
            }
        }

        // Initialize eBay lister
        const ebayLister = new SimplifiedEbayLister();

        // Optional: Search by image first to check for similar items
        // For simplicity, using the first image for search. Adapt if searchByImage can handle multiple.
        let searchResults = null;
        if (base64Images.length > 0) {
            try {
                const searchResponse = await ebayLister.searchByImage(base64Images[0]);
                if (searchResponse.success) {
                    searchResults = searchResponse.results;
                }
            } catch (error) {
                console.warn('Image search failed:', error instanceof Error ? error.message : String(error));
                // Continue with listing even if image search fails
            }
        }

        // List the item
        // Pass the array of image buffers to listItem
        const listingResult = await ebayLister.listItem(
            itemData,
            refreshToken,
            AUTH_BASE,
            username,
            imageBuffers // <--- Now an array of Buffers
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