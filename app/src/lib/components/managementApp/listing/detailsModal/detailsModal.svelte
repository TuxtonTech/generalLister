<script lang="ts">
	import { accountsStore } from "$lib/store/app/accounts/accounts";
	import { imageUrls } from "$lib/store/app/helpers/detailsPage";
	import { selectedPage } from "$lib/store/app/helpers/selectedPage";
	import { onDestroy, onMount } from "svelte";
    import CarouselModal from "./carouselModal/carouselModal.svelte";
	import { form } from "$app/server";
    
    // Form fields
    let title: string = '';
    let price: number | null = null;
    let quantity: number | null = null;
    let description: string = '';
    // Listing Aspects logic:
    let aspectInput: string = '';
    let listingAspects: string[] = [];
    let lastItem: string = ''

    // Loading state for FMV lookup
    let isLoadingFMV: boolean = false;
    let fmvData: any = null;

    let accounts: any[] = [];
    accountsStore.subscribe(value => {
        accounts = value;
    });
    $: {

    }

    async function blobUrlToBinary(blobUrl: string) {
    if (!blobUrl) return;
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    // This gives you binary data as ArrayBuffer
    return blob
}   


async function formatData(blobUrl: string, username: string, password: string) {
    const blob = await  blobUrlToBinary(blobUrl);
    const formData = new FormData();
    if(!blob) return formData

    formData.append('image', blob);
    formData.append('username', username);
    formData.append('password', password);
    return formData
}

    async function blobUrlToBase64(blobUrl: string) {
        if (!blobUrl) return;
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
                const base64Data = base64.split(',')[1];
                resolve(base64Data);
            };
            reader.readAsDataURL(blob);
        });
    }

    function fillFormFromFMVData(data: any) {
        // Fill title - combine publisher, title, and variant info
        let autoTitle = '';
        if (data.publisher) autoTitle += data.publisher + ' ';
        if (data.title) autoTitle += data.title;
        if (data.variant_name) autoTitle += ` (${data.variant_name})`;
        title = autoTitle.trim();

        // Fill price based on FMV data
        if (data.fmv && data.fmv.length > 0) {
            // Use the most recent sale or average
            const latestSale = data.fmv[0];
            if (latestSale.price) {
                price = parseFloat(latestSale.price);
            }
        } else if (data.sold?.raw) {
            // Fallback to raw FMV value
            price = parseFloat(data.sold.raw);
        }

        // Set default quantity
        if (!quantity) quantity = 1;
        // Generate description from available data
        let autoDescription = '';
        if (data.publisher) autoDescription += `Publisher: ${data.publisher}\n`;
        if (data.title) autoDescription += `Series: ${data.title}\n`;
        if (data.variant_name) autoDescription += `Variant: ${data.variant_name}\n`;
        if (data.fmv) {
            if(data.grade && data.fmv.graded && Object.keys(data.fmv.graded).length > 0) {
                autoDescription += `Grade: ${data.grade}`
                autoDescription += `Issue: ${data.comic_issue}`
                const gradedPrices = Object.entries(data.fmv.graded)
                for(let [key, value] of gradedPrices) {
                    if(key == data.grade) {
                        price = parseFloat(value + "")
                    }
                }
                const desc = gradedPrices.map(([grade, price]) => `${grade}: ${price}`)
                .join(', ');
                autoDescription += `Graded FMV: ${desc}\n`;
            } else if (data.fmv.raw && Object.keys(data.fmv.raw).length > 0) {
                const rawPrices = Object.entries(data.fmv.raw)
                    .map(([condition, price]) => `${condition}: ${price}`)
                    .join(', ');
                autoDescription += `Raw FMV: ${rawPrices}\n`;
            }
        }
        if (data.similarityScore) {
            autoDescription += `Match Confidence: ${(data.similarityScore * 100).toFixed(1)}%\n`;
        }
        if (data.fmv && data.fmv.length > 0) {
            autoDescription += `Recent Sales Available: ${data.fmv.length} sales found\n`;
        }
        description = autoDescription.trim();
        // Auto-add relevant aspects/tags
        const autoAspects = [];
        if (data.publisher) autoAspects.push(data.publisher);
        if (data.variant_name) autoAspects.push(data.variant_name);
        if (data.sold?.graded && parseFloat(data.sold.graded) > 0) autoAspects.push('Graded');
        // Add aspects that aren't already in the list
        autoAspects.forEach(aspect => {
            if (!listingAspects.includes(aspect)) {
                listingAspects = [...listingAspects, aspect];
            }
        });
    }


    onDestroy(() => {
        // Reset form state when modal is closed
        // title = '';
        // price = null;
        // quantity = null;
        // description = '';
        // aspectInput = '';
        // listingAspects = [];
        // isLoadingFMV = false;
        // fmvData = null;
        // lastItem = '';
        // imageUrls.set([]);
    })
    
    $: {
    // In your Svelte component
async function processBatchImages() {
    try {
        if ($imageUrls.length === 0) {
            console.error('No images to process');
            return;
        }

        const formData = new FormData();
        // Convert each URL to blob and add to FormData
        for (let i = 0; i < $imageUrls.length; i++) {
            const url = $imageUrls[i];
            // Fetch the image as blob
            const response = await fetch(url);
            const blob = await response.blob();
            
            // Add to FormData with 'images' field name (plural for batch)
            formData.append('images', blob, `image_${i}.jpg`);
        }
        
        formData.append('format', 'base64');
        formData.append('include_info', 'true');
        // Send to your batch endpoint
        const result = await fetch('/api/batch_image_formatting', {
            method: 'POST',
            body: formData
        });
        const data = await result.json();
        console.log('Batch processing result:', data);
        
    } catch (error) {
        console.error('Error processing batch images:', error);
    }
}
        // Handle empty image URLs - navigate to listing
        if ($imageUrls.length === 0) {
            selectedPage.set("listing");
        }

        // Handle FMV API call for the first image
        else if ($imageUrls.length >= 1 && $imageUrls[0] && lastItem !== $imageUrls[0]) {
            (async () => { 
                try {
                    // Update lastItem immediately to prevent duplicate calls
                    lastItem = $imageUrls[0] + "";
                    isLoadingFMV = true;
                    fmvData = null;
               
                    // Convert 
                    const account = $accountsStore.find(account => account.type === 'covr');
                    if (!account) {
                        alert('Please add a Covr account in the Accounts Section to enable FMV lookup.');
                        selectedPage.set('accounts');
                        return;
                    }

                    const imageFormData = await formatData($imageUrls[0] + "", account.username, account.password);
                    // console.log('Base64 length:', binaryBuffer);

                    // Find COVR account


                    // Make FMV API call
                    const r = await fetch('/api/fmv', {
                        method: 'POST',
                        body: imageFormData
                    });
                    if (r.ok) {
                        const data = await r.json();
                        console.log('FMV API Response:', data);

                        fmvData = data;

                        // Auto-fill the form with the returned data
                        fillFormFromFMVData(data);
                    } else {

                        // console.error('FMV API error:', result.status, result.statusText);
                        // Optionally show user-friendly error message
                        alert(`Failed to get FMV data: ${r.statusText}`);
                    }

                    // await processBatchImages()
                } catch (error) {
                    console.error('Error calling FMV API:', error);
                    // Optionally show user-friendly error message
                    // alert('Failed to process image for FMV lookup');
                } finally {
                    isLoadingFMV = false;
                }
            })();
        }
    }
    function addAspect(event: KeyboardEvent) {
        if (event.key === 'Enter' && aspectInput.trim() !== '') {
            event.preventDefault();
            listingAspects = [...listingAspects, aspectInput.trim()];
            aspectInput = '';
        }
    }

    function removeAspect(index: number) {
        listingAspects = listingAspects.filter((_, i) => i !== index);
    }

    // Selectable Marketplaces
    let marketplaces = [
        { name: 'eBay', selected: false },
        // { name: 'Facebook', selected: false },
        // { name: 'Etsy', selected: false },
    ];
    // Add this line with your other reactive variables at the top of the <script>


async function handleSubmit() {
    // 1. Find the first available eBay account from your store
    const ebayAccount = accounts.find(acc => acc.type === 'ebay' && acc.oAuthToken);

    // 2. Check if an eBay account is configured
    if (!ebayAccount) {
        alert('No configured eBay account found. Please add one in the Accounts section.');
        selectedPage.set('accounts'); // Redirect user to add an account
        return;
    }
    
    // 3. Check for the refresh token
    if (!ebayAccount.refresh_token) {
        alert('The selected eBay account is missing a refresh token. Please reconnect the account.');
        return;
    }

    // 4. Format the aspects correctly
    const formattedAspects: { [key: string]: string[] } = {};
    if (listingAspects.length > 0) {
        // Assume the first aspect is the Brand
        formattedAspects['Brand'] = [listingAspects[0]];
        // Group the rest under Features
        if (listingAspects.length > 1) {
            formattedAspects['Features'] = listingAspects.slice(1);
        }
    }

    const itemData = {
        sku: Date.now(), // Generate a unique SKU for each listing
        title,
        price,
        quantity,
        description,
        aspects: formattedAspects, // Use the new formatted object
        marketplaces: marketplaces.filter(m => m.selected).map(m => m.name),
        fmvData: fmvData
    };
    const formData = new FormData();

    // 5. Use the dynamic credentials from the store
    formData.append('refresh_token', ebayAccount.refresh_token);
    formData.append('username', ebayAccount.name); // Using the account name as the username
    formData.append('item_data', JSON.stringify(itemData));
    // 6. Fetch each image URL, convert it to a Blob, and append it
    for (const imageUrl of $imageUrls) {
        if (imageUrl) {
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                formData.append('images', blob, 'image.jpg');
            } catch (error) {
                console.error('Error fetching image blob:', error);
                alert('Could not process one or more images. Please try again.');
                return; // Stop the submission if an image fails
            }
        }
    }

    // 7. Send the request
    try {
        const res = await fetch('/api/ebay/listing', {
            method: 'POST',
            body: formData
            // No 'Content-Type' header needed; 
        });
        if (res.ok) {
            const result = await res.json();
            console.log('Listing successful:', result);
            alert('Listing created successfully! Listing ID: ' + result.listingId);
        } else {
            const errorResult = await res.json();
            console.error('Failed to create listing:', errorResult);
            alert('Failed to create listing: ' + errorResult.error);
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('An error occurred while submitting the form.');
    }
}

    // Function to manually refresh FMV data
    function refreshFMV() {
        if ($imageUrls[0]) {
            lastItem = ''; // Reset to trigger the reactive statement
        }
    }
</script>
<div class="quadrant-container">
    
    <!-- Top Left: Basic Info -->
    <div class="quadrant info-quadrant" style="grid-area: info;">
        <div class="quadrant-content">
            <h3>Basic Information</h3>
            
            <!-- Loading indicator -->
            {#if isLoadingFMV}
                <div class="loading-indicator">
                    <span>🔍 Analyzing image and fetching market data...</span>
                </div>
            {/if}

            <!-- FMV Data Summary -->
            {#if fmvData}
                <div class="fmv-summary">
                    <small>
                        Auto-filled from image analysis 
                        (Confidence: {(fmvData.similarityScore * 100).toFixed(1)}%)
                        <button type="button" on:click={refreshFMV} class="refresh-btn" title="Refresh data">🔄</button>
                    </small>
                </div>
            {/if}
            
            <div class="form-group">
                <label for="title">Title</label>
                <input 
                type="text" 
                id="title" 
                bind:value={title} 
                placeholder="Enter listing title..."
                required 
                />
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="price">Price</label>
                    <div class="input-wrapper">
                        <span class="currency">$</span>
                        <input 
                        type="number" 
                        id="price" 
                        bind:value={price} 
                        min="0" 
                        step="0.01"
                        placeholder="0.00"
                        required 
                        />
                    </div>
                </div>
                <div class="form-group">
                    <label for="quantity">Quantity</label>
                    <input 
                    type="number" 
                    id="quantity" 
                    bind:value={quantity} 
                    min="1"
                    placeholder="1"
                    required 
                    />
                </div>
            </div>
            
            <div class="form-group">
                <label for="aspects">Listing Tags</label>
                <div class="aspects-input-container">
                    <input
                    type="text"
                        id="aspects"
                        placeholder="Add tags and press Enter..."
                        bind:value={aspectInput}
                        on:keydown={addAspect}
                        />
                        <div class="aspects-list">
                            {#each listingAspects as aspect, index}
                            <div class="aspect-tag">
                                {aspect}
                                <button 
                                type="button" 
                                on:click={() => removeAspect(index)} 
                                class="remove-btn"
                                aria-label="Remove tag"
                                >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                            </button>
                        </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Top Right: Gallery -->
    <div class="quadrant gallery-quadrant" style="grid-area: gallery;">
        <CarouselModal />
    </div>
    <!-- Bottom Left: Description -->
    <div class="quadrant description-quadrant" style="grid-area: description;">
        <div class="quadrant-content">
            <h3>Description</h3>
            
            <div class="form-group full-height">
                <label for="description">Product Description</label>
                <textarea 
                    id="description" 
                    bind:value={description}
                    placeholder="Describe your item in detail..."
                    class="full-height-textarea"
                ></textarea>
            </div>
        </div>
    </div>

    <!-- Bottom Right: Marketplaces & Submit -->
    <div class="quadrant marketplace-quadrant" style="grid-area: marketplace">
        <div class="quadrant-content">
            <h3>Marketplaces</h3>
            
            <div class="marketplace-grid">
                {#each marketplaces as marketplace}
                    <label class="marketplace-option">
                        <input 
                            type="checkbox" 
                            bind:checked={marketplace.selected}
                            class="marketplace-checkbox"
                        />
                        <div class="marketplace-card" class:selected={marketplace.selected}>
                            <div class="marketplace-icon">
                                {#if marketplace.name === 'eBay'}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                    </svg>
                                <!-- {:else if marketplace.name === 'Facebook'}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
                                {:else}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                    </svg> -->
                                {/if}
                            </div>
                            <span class="marketplace-name">{marketplace.name}</span>
                            {#if marketplace.selected}
                                <div class="check-icon">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                            {/if}
                        </div>
                    </label>
                {/each}
            </div>

            <button 
                type="button" 
                class="submit-btn" 
                on:click={handleSubmit}
                disabled={!title || !price || !quantity}
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19L7 14L8.41 12.59L11 15.17V5H13V15.17L15.59 12.59L17 14L12 19Z" fill="currentColor"/>
                </svg>
                Submit Listing
            </button>
        </div>
    </div>
</div>

<style>
    .quadrant-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 1px;
        background: #1a252f;
        color: #ecf0f1;
        /* height: auto; */
        max-height: fit-content;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
        height: 100%;
        grid-template-areas:
        "gallery info"
        "description marketplace";
    }

    .quadrant {
        background: linear-gradient(135deg, #2c3e50, #34495e);
        border-radius: 0;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .info-quadrant {
        overflow-y: hidden;
    }

    .gallery-quadrant {
        background: linear-gradient(135deg, #2c3e50, #34495e);
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .quadrant-content {
        padding: 1.5rem;
        height: 100%;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        box-sizing: border-box;
    }

    h3 {
        margin: 0 0 1.5rem 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #3498db;
        text-align: center;
        border-bottom: 2px solid rgba(52, 152, 219, 0.3);
        padding-bottom: 0.75rem;
    }

    #price {
        padding-left: 22px;
    }

    .form-group {
        margin-bottom: 1.25rem;
    }

    .form-group.full-height {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-bottom: 0;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        font-size: 0.9rem;
        color: #bdc3c7;
    }

    input[type="text"],
    input[type="number"],
    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid rgba(127, 140, 141, 0.3);
        border-radius: 6px;
        background: rgba(52, 73, 94, 0.8);
        color: #ecf0f1;
        box-sizing: border-box;
        font-size: 0.9rem;
        transition: all 0.3s ease;
    }

    input:focus, textarea:focus {
        outline: none;
        border-color: #3498db;
        background: rgba(52, 73, 94, 1);
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    .currency {
        position: absolute;
        left: 0.75rem;
        color: #95a5a6;
        font-weight: 500;
        z-index: 2;
    }

    .input-wrapper input {
        padding-left: 2rem;
    }

    .full-height-textarea {
        flex: 1;
        min-height: 200px;
        resize: none;
    }

    .form-row {
        display: flex;
        gap: 1rem;
    }

    .form-row .form-group {
        flex: 1;
    }

    .aspects-input-container {
        border: 1px solid rgba(127, 140, 141, 0.3);
        border-radius: 6px;
        background: rgba(52, 73, 94, 0.8);
        padding: 0.75rem;
        transition: all 0.3s ease;
    }

    .aspects-input-container:focus-within {
        border-color: #3498db;
        background: rgba(52, 73, 94, 1);
        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
    }

    .aspects-input-container input {
        border: none;
        background: transparent;
        padding: 0;
        margin: 0;
    }

    .aspects-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }

    .aspect-tag {
        display: flex;
        align-items: center;
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
        padding: 0.4rem 0.75rem;
        border-radius: 16px;
        font-size: 0.8rem;
        font-weight: 500;
        gap: 0.5rem;
    }

    .remove-btn {
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 0;
        opacity: 0.7;
        transition: opacity 0.2s ease;
    }

    .remove-btn:hover {
        opacity: 1;
    }

    .marketplace-grid {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
        flex: 1;
    }

    .marketplace-option {
        cursor: pointer;
        display: block;
    }

    .marketplace-checkbox {
        display: none;
    }

    .marketplace-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        border: 2px solid rgba(127, 140, 141, 0.3);
        border-radius: 8px;
        background: rgba(52, 73, 94, 0.5);
        transition: all 0.3s ease;
        position: relative;
    }

    .marketplace-card:hover {
        border-color: #3498db;
        background: rgba(52, 73, 94, 0.8);
        transform: translateY(-1px);
    }

    .marketplace-card.selected {
        border-color: #27ae60;
        background: rgba(39, 174, 96, 0.1);
    }

    .marketplace-icon {
        width: 24px;
        height: 24px;
        color: #95a5a6;
    }

    .marketplace-card.selected .marketplace-icon {
        color: #27ae60;
    }

    .marketplace-name {
        font-weight: 500;
        flex: 1;
    }

    .check-icon {
        width: 16px;
        height: 16px;
        color: #27ae60;
    }

    .submit-btn {
        width: 100%;
        padding: 1rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: white;
        background: linear-gradient(135deg, #27ae60, #229954);
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .submit-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #229954, #1e8449);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(39, 174, 96, 0.3);
    }

    .submit-btn:disabled {
        background: linear-gradient(135deg, #7f8c8d, #6c757d);
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
        .quadrant-container {
            grid-template-columns: 1fr;
            grid-template-rows: auto auto auto auto;
            height: calc(100%);
            min-height: 100vh;
            grid-template-areas:
            "gallery"
            "info"
            "description"
            "marketplace";
        }

        .quadrant-content {
            padding: 1rem;
        }

        .gallery-quadrant {
            min-height: 50vh;
        }
    }

    @media (max-width: 768px) {
        .quadrant-container {
            gap: 0;
            height: auto;
            /* min-height: calc(100vh - 2rem); */
            /* overflow: scroll; */
        }

        .quadrant {
            border-radius: 0;
        }

        .quadrant-content {
            padding: 1rem 0.75rem;
            overflow-y: auto;
        }

        h3 {
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }

        .form-row {
            flex-direction: column;
            gap: 0;
        }

        .form-row .form-group {
            margin-bottom: 1rem;
        }

        .gallery-quadrant {
        }

        .full-height-textarea {
            min-height: 120px;
            max-height: 200px;
        }

        .marketplace-grid {
            gap: 0.5rem;
        }

        .marketplace-card {
            padding: 0.75rem;
        }
    }

    @media (max-width: 480px) {
        .quadrant-content {
            padding: 0.75rem 0.5rem;
        }

        input[type="text"],
        input[type="number"],
        textarea {
            padding: 0.6rem;
            font-size: 0.85rem;
        }

        .submit-btn {
            padding: 0.8rem 1rem;
            font-size: 0.9rem;
        }
    }

    /* Custom scrollbar for webkit browsers */
    .quadrant-content::-webkit-scrollbar {
        width: 6px;
    }

    .quadrant-content::-webkit-scrollbar-thumb {
        background: rgba(52, 152, 219, 0.5);
        border-radius: 3px;
    }

    .quadrant-content::-webkit-scrollbar-track {
        background: transparent;
    }


     .loading-indicator {
        background: #f0f9ff;
        border: 1px solid #0ea5e9;
        border-radius: 4px;
        padding: 8px 12px;
        margin-bottom: 12px;
        font-size: 14px;
        color: #0369a1;
    }

    .fmv-summary {
        background: #f0fdf4;
        border: 1px solid #22c55e;
        border-radius: 4px;
        padding: 8px 12px;
        margin-bottom: 12px;
        font-size: 12px;
        color: #166534;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .refresh-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 14px;
        margin-left: 8px;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .refresh-btn:hover {
        opacity: 1;
    }
</style>