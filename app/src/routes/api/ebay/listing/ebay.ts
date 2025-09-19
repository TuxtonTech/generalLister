// src/routes/api/ebay/listing/ebay.ts

// ... (Keep all the interface definitions at the top: ItemDimensions, ItemAspects, etc.)

// Placeholder function for a real image upload service.
// In a real application, this would upload the buffer to a service like
// Firebase Storage, AWS S3, or Cloudinary and return the public URL.
async function uploadImage(imageBuffer: Buffer): Promise<string> {
  // This is a placeholder. You need to implement a real upload service.
  // For now, we'll return a placeholder URL to demonstrate the data flow.
  // NOTE: This will not work in production as the URL is not real.
  console.log(`[Placeholder] "Uploading" image of size ${imageBuffer.length} bytes...`);
  return `https://your-image-hosting.com/placeholder_${Date.now()}.jpg`;
}


class SimplifiedEbayLister {
  // ... (Keep the constructor and other methods like refreshToken, getMerchantKey, etc., the same)
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

    const response: Response = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authBase}`
      },
      body: formData
    });

    const body: RefreshTokenResponse = await response.json();
    this.access_token = body.access_token;
    this.headers["Authorization"] = `Bearer ${this.access_token}`;
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
        condition: itemData.condition || "NEW",
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

    return {
        status: response.status,
        success: response.ok
    };
}

  async createOffer(itemData: { price: string; sku: any; categoryId: any; description: any; quantityLimit: any; }, merchantKey: any, policyIds: any[]) {
    const price = parseFloat(itemData.price);
    
    const offer = {
      "sku": itemData.sku,
      "marketplaceId": "EBAY_US",
      "format": "FIXED_PRICE",
      'currency': "USD",
      "categoryId": "170062",
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

  // *** MODIFIED FUNCTION ***
  async listItem(itemData: ItemData, refreshToken: string, authBase: string, username: string | undefined, imageBuffers: Buffer[] | null = null) {
    try {
      // Refresh token
      await this.refreshToken(refreshToken, authBase);
      
      // Get or create merchant key
      let merchantKey = await this.getMerchantKey();
      if (!merchantKey) {
        merchantKey = await this.createMerchantKey();
      }
      
      // Get policies
      const policies = await this.getPolicies();
      
      // --- START: NEW IMAGE HANDLING LOGIC ---
      // Upload images and add their URLs to itemData
      if (imageBuffers && imageBuffers.length > 0) {
        const imageUrls = await Promise.all(
          imageBuffers.map(buffer => uploadImage(buffer))
        );
        itemData.imageUrls = imageUrls;
      }
      // --- END: NEW IMAGE HANDLING LOGIC ---
      
      // Create inventory item
      const inventoryResult = await this.createInventoryItem(itemData, merchantKey);
      if (!inventoryResult.success) {
        // Provide a more detailed error message
        throw new Error(`Failed to create inventory item. Status: ${inventoryResult.status}`);
      }
      
      // Create offer
      const offerResult = await this.createOffer(
        {
          price: String(itemData.price),
          sku: itemData.sku,
          categoryId: itemData.categoryId, // Ensure categoryId is passed
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
        message: "Item listed successfully"
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export default SimplifiedEbayLister;