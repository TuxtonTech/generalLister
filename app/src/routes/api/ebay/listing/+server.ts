// +page.server.js or your API endpoint file
import SimplifiedEbayLister from './ebay.js';

const AUTH_BASE = 'YOUR_EBAY_AUTH_BASE_64'; // Your eBay app credentials encoded in base64

export async function POST({ request }) {
    try {
        const formData = await request.formData();
        const refreshToken = formData.get('refresh_token');
        const binaryImage = formData.get('image');
        const itemDataStr = formData.get('item_data');
        const username = formData.get('username') || 'default_user';

        if (!refreshToken || !binaryImage || !itemDataStr) {
            return Response.json({
                error: 'Missing required fields: refresh_token, image, and item_data are required'
            }, { status: 400 });
        }

        // Parse item data
        let itemData;
        try {
            itemData = JSON.parse(itemDataStr + "");
        } catch (error) {
            return Response.json({
                error: 'Invalid item_data JSON format'
            }, { status: 400 });
        }

        // Validate required item data fields
        const requiredFields = ['sku', 'title', 'description', 'price', 'categoryId', 'imageUrls'];
        const missingFields = requiredFields.filter(field => !itemData[field]);

        if (missingFields.length > 0) {
            return Response.json({
                error: `Missing required item data fields: ${missingFields.join(', ')}`
            }, { status: 400 });
        }

        // Convert image to base64 if needed for search
        let base64Image = null;
        if (binaryImage instanceof File) {
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
                console.warn('Image search failed:', typeof error === 'object' && error !== null && 'message' in error ? (error as { message?: string }).message : String(error));
                // Continue with listing even if image search fails
            }
        }

        // List the item
        const listingResult = await ebayLister.listItem(itemData, refreshToken, AUTH_BASE);

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
            error: 'Internal server error'
        }, { status: 500 });
    }
}

/*
- refresh_token: "your_ebay_refresh_token"
- username: "user123" (required for file storage path)
- image: Can be one of:
  * File (binary image data)
  * URL string (e.g., "https://example.com/image.jpg")
  * Base64 string
  * Leave empty/null if no image processing needed
- item_data: {
  "sku": "UNIQUE-SKU-123",
  "title": "Amazing Product Title",
  "description": "Detailed product description",
  "price": "29.99",
  "categoryId": "12345", // eBay category ID
  "imageUrls": ["https://example.com/image1.jpg"], // Optional - will be supplemented by processed image
  "quantity": 10,
  "condition": "NEW",
  "aspects": {
    "Brand": ["Your Brand"],
    "Color": ["Red", "Blue"],
    "Size": ["Large"]
  },
  "dimensions": {
    "height": "5",
    "length": "8", 
    "width": "3"
  },
  "weight": "1.5",
  "quantityLimit": 5
}

Image Processing Flow:
1. If image is a URL string → use directly
2. If image is binary data → try eBay's image hosting API
3. If eBay hosting fails → save to uploads/{username}/{safe_product_title}/index.jpg
4. Add processed image URL to the beginning of imageUrls array

Response includes:
- processedImageUrl: The final URL of the processed image (if any)
- All the standard listing response fields
*/