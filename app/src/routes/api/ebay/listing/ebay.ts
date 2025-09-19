interface ItemDimensions {
    height?: string | number;
    length?: string | number;
    width?: string | number;
    unit?: string;
}

interface ItemAspects {
    [key: string]: string[];
}

interface ItemData {
    price: string | number;
    quantity?: number;
    condition?: string;
    dimensions?: ItemDimensions;
    weight?: string | number;
    aspects?: ItemAspects;
    description: string;
    imageUrls?: string[];
    title: string;
    sku: string;
    quantityLimit?: number;
}

interface InventoryItem {
    currency: string;
    availability: {
        shipToLocationAvailability: {
            availabilityDistributions: Array<{
                fulfillmentTime: {
                    unit: string;
                    value: number;
                };
                merchantLocationKey: string;
                quantity: number;
            }>;
            quantity: number;
        };
    };
    price: {
        value: number;
        currency: string;
    };
    condition: string;
    locale: string;
    packageWeightAndSize: {
        dimensions: ItemDimensions;
        packageType: string;
        shippingIrregular: boolean;
        weight: {
            unit: string;
            value: string | number;
        };
    };
    product: {
        aspects: ItemAspects;
        description: string;
        imageUrls?: string[];
        title: string;
    };
    sku: string;
}

interface InventoryItemResponse {
  status: number;
  success: boolean;
}

interface RefreshTokenResponse {
    access_token: string;
    [key: string]: any;
}

interface SearchByImageResponse {
    status: number;
    success: boolean;
    results: ItemSummary[];
}

interface ItemSummary {
    itemId: string;
    title: string;
    [key: string]: any;
}

interface ImageUploadResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

class SimplifiedEbayLister {
  access_token: string;
  headers: { [key: string]: string };

  constructor() {
    this.access_token = "";
    this.headers = {
      "Authorization": `Bearer ${this.access_token}`,
      "Content-type": "application/json",
      "Content-Language": "en-US"
    };
  }

  async refreshToken(
    refreshToken: string,
    authBase: string
  ): Promise<string> {
    const formData = new URLSearchParams();
    formData.append('grant_type', 'refresh_token');
    formData.append('refresh_token', refreshToken);
    formData.append('scope', 'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.marketing.readonly https://api.ebay.com/oauth/api_scope/sell.marketing https://api.ebay.com/oauth/api_scope/sell.inventory.readonly https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account.readonly https://api.ebay.com/oauth/api_scope/sell.account https://api.ebay.com/oauth/api_scope/sell.fulfillment.readonly https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.analytics.readonly https://api.ebay.com/oauth/api_scope/sell.finances https://api.ebay.com/oauth/api_scope/sell.payment.dispute https://api.ebay.com/oauth/api_scope/commerce.identity.readonly');

    const response: Response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authBase}`
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status} - ${response.statusText}`);
    }

    const body: RefreshTokenResponse = await response.json();
    this.access_token = body.access_token;
    this.headers["Authorization"] = `Bearer ${this.access_token}`;
    console.log('OAuth token refreshed successfully');
    return this.access_token;
  }

  async getMerchantKey() {
    const response = await fetch(`https://api.ebay.com/sell/inventory/v1/location/`, {
      headers: this.headers
    });

    const data = await response.json();
    if (data.total && data.locations.length > 0) {
      return data.locations[0].merchantLocationKey;
    }
    return null;
  }

  async createMerchantKey(phone = "8041122211", zip = "23832") {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    for (let i = 0; i < 36; i++) {
      key += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const body = {
      location: {
        address: {
          country: "US",
          postalCode: zip
        },
      },
      locationType: ["WAREHOUSE"],
      phone: phone,
    };

    await fetch(`https://api.ebay.com/sell/inventory/v1/location/${key}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body)
    });

    return key;
  }

  async getPolicies() {
    const policyNames = ["fulfillment_policy", 'payment_policy', "return_policy"];
    const policies = [];

    for (const name of policyNames) {
      const response = await fetch(`https://api.ebay.com/sell/account/v1/${name}?marketplace_id=EBAY_US`, {
        method: "GET",
        headers: this.headers
      });

      const resBody = await response.json();

      if (resBody.errors) {
        throw new Error(`No ${name} policies found. Please create business policies.`);
      }

      const splitName = name.split("_");
      const camelCapName = splitName[0] + splitName[1].charAt(0).toUpperCase() + splitName[1].slice(1);
      const plural = splitName[0] + splitName[1].charAt(0).toUpperCase() + splitName[1].slice(1, splitName[1].length - 1) + "ies";
      
      const data = resBody[plural];
      if (data.length === 0) {
        policies.push(null);
      } else {
        policies.push(data[0][camelCapName + "Id"]);
      }
    }

    return policies;
  }

  // Method to upload image to eBay using XML Trading API with OAuth token
  async uploadImageToEbay(imageBuffer: Buffer, oauthToken: string): Promise<ImageUploadResponse> {
    try {
      // Create XML request for UploadSiteHostedPictures using OAuth token
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
    <RequesterCredentials>
        <eBayAuthToken>${oauthToken}</eBayAuthToken>
    </RequesterCredentials>
    <PictureSet>Supersize</PictureSet>
    <PictureData contentType="image/jpeg"></PictureData>
</UploadSiteHostedPicturesRequest>`;

      // Create multipart form data
      const boundary = '----FormBoundary' + Math.random().toString(36).substr(2);

      let body = '';
      body += `--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="XML Payload"\r\n\r\n`;
      body += xmlPayload;
      body += `\r\n--${boundary}\r\n`;
      body += `Content-Disposition: form-data; name="image"; filename="image.jpg"\r\n`;
      body += `Content-Type: image/jpeg\r\n\r\n`;

      // Convert body to buffer and append image data
      const bodyBuffer = Buffer.concat([
        Buffer.from(body, 'utf8'),
        imageBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
      ]);

      const response = await fetch('https://api.ebay.com/ws/api.dll', {
        method: 'POST',
        headers: {
          'X-EBAY-API-CALL-NAME': 'UploadSiteHostedPictures',
          'X-EBAY-API-SITEID': '0',
          'X-EBAY-API-RESPONSE-ENCODING': 'XML',
          'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
          'X-EBAY-API-DETAIL-LEVEL': '0',
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString()
        },
        body: bodyBuffer
      });

      if (response.ok) {
        const xmlText = await response.text();

        // Parse XML response to get the FullURL
        const fullUrlMatch = xmlText.match(/<FullURL>(.*?)<\/FullURL>/);
        if (fullUrlMatch && fullUrlMatch[1]) {
          return {
            success: true,
            imageUrl: fullUrlMatch[1]
          };
        } else {
          return {
            success: false,
            error: `eBay EPS upload failed: Could not parse FullURL from response`
          };
        }
      } else {
        const errorText = await response.text();
        return {
          success: false,
          error: `eBay EPS upload failed: ${response.status} - ${errorText}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `eBay EPS upload error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Fallback method to upload to your server
  async uploadToServer(imgBuffer: Buffer, username: string, sku: string): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData();
      const blob = new Blob([imgBuffer], { type: 'image/jpeg' });
      formData.append('image', blob, `${sku}.jpg`);
      formData.append('username', username);
      formData.append('sku', sku);

      // Replace with your actual server upload endpoint
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          imageUrl: data.imageUrl
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: `Server upload failed: ${JSON.stringify(errorData)}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Server upload error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  // Process multiple images with fallback - now uses OAuth token directly
  async processImages(imageBuffers: Buffer[], username: string, sku: string): Promise<string[]> {
    const imageUrls: string[] = [];

    for (let i = 0; i < imageBuffers.length; i++) {
      const buffer = imageBuffers[i];
      console.log(`Processing image ${i + 1}/${imageBuffers.length}`);

      // Try eBay Picture Services (EPS) first using OAuth token
      let uploadResult = await this.uploadImageToEbay(buffer, this.access_token);

      if (!uploadResult.success) {
        console.warn(`eBay EPS upload failed for image ${i + 1}: ${uploadResult.error}`);
        console.log('Trying server upload as fallback...');

        // Fallback to server upload
        uploadResult = await this.uploadToServer(buffer, username, sku);
      }

      if (uploadResult.success && uploadResult.imageUrl) {
        imageUrls.push(uploadResult.imageUrl);
        console.log(`Successfully uploaded image ${i + 1}: ${uploadResult.imageUrl}`);
      } else {
        console.error(`Failed to upload image ${i + 1}: ${uploadResult.error}`);
        // Continue with other images even if one fails
      }
    }

    return imageUrls;
  }

async createInventoryItem(itemData: ItemData, merchantKey: string): Promise<InventoryItemResponse> {
    const price = parseFloat(itemData.price as string);

    const inventoryItem: InventoryItem = {
        currency: "USD",
        availability: {
            shipToLocationAvailability: {
                availabilityDistributions: [
                    {
                        fulfillmentTime: {
                            unit: "BUSINESS_DAY",
                            value: 2
                        },
                        merchantLocationKey: merchantKey,
                        quantity: itemData.quantity || 10
                    }
                ],
                quantity: itemData.quantity || 10
            }
        },
        price: {
            value: price,
            currency: "USD"
        },
        condition: itemData.condition || "USED_GOOD",
        locale: "en_US",
        packageWeightAndSize: {
            dimensions: {
                height: itemData.dimensions?.height || '4',
                length: itemData.dimensions?.length || '4',
                width: itemData.dimensions?.width || '4',
                unit: "INCH"
            },
            packageType: "PACKAGE_THICK_ENVELOPE",
            shippingIrregular: false,
            weight: {
                unit: "OUNCE",
                value: itemData.weight || '3'
            }
        },
        product: {
            aspects: itemData.aspects || {
                Brand: ["Generic"],
                Type: ["Product"]
            },
            description: itemData.description,
            imageUrls: itemData.imageUrls,
            title: itemData.title,
        },
        sku: itemData.sku
    };

    const response = await fetch(`https://api.ebay.com/sell/inventory/v1/inventory_item/${itemData.sku}`, {
        method: "PUT",
        headers: this.headers,
        body: JSON.stringify(inventoryItem)
    });

  console.log(await response.json())

    return {
        status: response.status,
        success: response.ok
    };
}
  getCategoryId(): number {
    return 63;
  }

  async createOffer(itemData: { price: string; sku: any; description: any; quantityLimit: any; }, merchantKey: any, policyIds: any[]) {
    const price = parseFloat(itemData.price);
    
    const offer = {
      "sku": itemData.sku,
      "marketplaceId": "EBAY_US",
      "format": "FIXED_PRICE",
      'currency': "USD",
      "categoryId": this.getCategoryId(),
      "pricingSummary": {
        "price": {
          "value": price,
          "currency": "USD"
        }
      },
      "listingPolicies": {
        "fulfillmentPolicyId": policyIds[0],
        "returnPolicyId": policyIds[2],
        "paymentPolicyId": policyIds[1]
      },
      "tax": {
        "applyTax": true
      },
      "listingDescription": itemData.description,
      "quantityLimitPerBuyer": itemData.quantityLimit || 10,
      "merchantLocationKey": merchantKey,
      "includeCatalogProductDetails": false
    };

    const response = await fetch("https://api.ebay.com/sell/inventory/v1/offer", {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(offer)
    });

    const responseData = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      offerId: responseData.offerId,
      data: responseData
    };
  }

  async publishOffer(offerId: string) {
    const response = await fetch(`https://api.ebay.com/sell/inventory/v1/offer/${offerId}/publish`, {
      method: 'POST',
      headers: this.headers
    });

    const data = await response.json();
    
    return {
      status: response.status,
      success: response.ok,
      data: data,
      listingId: data.listingId
    };
  }

  async searchByImage(base64Image: string): Promise<SearchByImageResponse> {
    const response: Response = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search_by_image`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ image: base64Image })
    });

    const data: { itemSummaries?: ItemSummary[] } = await response.json();
    return {
      status: response.status,
      success: response.ok,
      results: data.itemSummaries || []
    };
  }

  async listItem(itemData: ItemData, refreshToken: string, authBase: string, username: string, imageBuffers: Buffer[] = []) {
    try {
      // Refresh token FIRST - this sets this.access_token and updates headers
      console.log('Refreshing OAuth token...');
      await this.refreshToken(refreshToken, authBase);

      // Get or create merchant key
      let merchantKey = await this.getMerchantKey();
      if (!merchantKey) {
        merchantKey = await this.createMerchantKey();
      }
      
      // Get policies
      const policies = await this.getPolicies();
      
      // Process images if provided - now uses the refreshed OAuth token
      if (imageBuffers && imageBuffers.length > 0) {
        console.log(`Processing ${imageBuffers.length} images...`);
        const uploadedImageUrls = await this.processImages(imageBuffers, username, itemData.sku);

        if (uploadedImageUrls.length > 0) {
          // Add uploaded images to itemData
          if (!itemData.imageUrls) {
            itemData.imageUrls = [];
          }
          // Prepend new images to existing ones
          itemData.imageUrls = [...uploadedImageUrls, ...itemData.imageUrls];
          console.log(`Successfully processed ${uploadedImageUrls.length} images`);
        } else {
          console.warn('No images were successfully uploaded');
        }
      }
      
      // Create inventory item
      const inventoryResult = await this.createInventoryItem(itemData, merchantKey);
      if (!inventoryResult.success) {
        throw new Error(`Failed to create inventory item: ${inventoryResult.status}`);
      }
      
      // Create offer
      const offerResult = await this.createOffer(
        {
          price: String(itemData.price),
          sku: itemData.sku,
          description: itemData.description,
          quantityLimit: itemData.quantityLimit
        },
        merchantKey,
        policies
      );
      if (!offerResult.success) {
        throw new Error(`Failed to create offer: ${JSON.stringify(offerResult.data)}`);
      }
      
      // Publish offer
      const publishResult = await this.publishOffer(offerResult.offerId);
      if (!publishResult.success) {
        throw new Error(`Failed to publish offer: ${JSON.stringify(publishResult.data)}`);
      }
      
      return {
        success: true,
        listingId: publishResult.listingId,
        offerId: offerResult.offerId,
        uploadedImages: itemData.imageUrls?.length || 0,
        message: "Item listed successfully"
      };
      
    } catch (error) {
      console.error('Error in listItem:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default SimplifiedEbayLister;