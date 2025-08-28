<script lang="ts">
    // Form fields
    let title: string = '';
    let price: number | null = null;
    let quantity: number | null = null;
    let description: string = '';

    // Listing Aspects logic:
    let aspectInput: string = '';
    let listingAspects: string[] = [];

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
        { name: 'Facebook', selected: false },
        { name: 'Etsy', selected: false },
    ];

    function handleSubmit() {
        const formData = {
            title,
            price,
            quantity,
            listingAspects,
            description,
            selectedMarketplaces: marketplaces.filter(m => m.selected).map(m => m.name),
        };
        console.log('Form data submitted:', formData);
        alert('Form submitted! Check the console for the data.');
    }
</script>

<div class="form-wrapper">
    <form on:submit|preventDefault={handleSubmit}>
        <div class="scrollable-form-content">
            <h2>Listing Information</h2>
            <div class="form-group">
                <label for="title">Title:</label>
                <input type="text" id="title" bind:value={title} required />
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="price">Price:</label>
                    <input style="padding-left: 20px" type="number" id="price" bind:value={price} min="0" step="any" required />
                </div>
                <div class="form-group">
                    <label for="quantity">Quantity:</label>
                    <input type="number" id="quantity" bind:value={quantity} min="0" required />
                </div>
            </div>

            <div class="form-group">
                <label for="aspects">Listing Aspects:</label>
                <div class="aspects-input-container">
                    <input
                        type="text"
                        id="aspects"
                        placeholder="Type and press Enter to add"
                        bind:value={aspectInput}
                        on:keydown={addAspect}
                    />
                    <div class="aspects-list">
                        {#each listingAspects as aspect, index}
                            <div class="aspect-tag">
                                {aspect}
                                <button type="button" on:click={() => removeAspect(index)} class="remove-btn">&times;</button>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="description">Description:</label>
                <textarea id="description" bind:value={description}></textarea>
            </div>

            <h3>Marketplaces</h3>
            <table class="marketplace-table">
                <thead>
                    <tr>
                        <th>Select</th>
                        <th>Marketplace</th>
                    </tr>
                </thead>
                <tbody>
                    {#each marketplaces as marketplace}
                        <tr>
                            <td><input type="checkbox" bind:checked={marketplace.selected} /></td>
                            <td>{marketplace.name}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
        
        <button type="submit" class="submit-btn">Submit Listing</button>
    </form>
</div>

<style>
    :root {
        --primary-color: #3498db;
        --secondary-color: #ecf0f1;
        --background-color: #2c3e50;
        --text-color: #ecf0f1;
    }

    /* Base styles (desktop first) */
    .form-wrapper {
        max-width: 600px;
        padding: 0;
        background: var(--background-color);
        color: var(--text-color);
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        height: 100%;
        overflow: hidden;
    }
    
    form {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 94dvh;
    }

    .scrollable-form-content {
        padding: 2rem;
        overflow-y: auto;
        flex-grow: 1;
    }

    h2, h3 {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    .form-group label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }

    input[type="text"],
    input[type="number"],
    textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #7f8c8d;
        border-radius: 4px;
        background: #34495e;
        color: var(--text-color);
        box-sizing: border-box;
    }

    input:focus, textarea:focus {
        outline: none;
        border-color: var(--primary-color);
    }

    textarea {
        min-height: 100px;
        resize: vertical;
    }

    .form-row {
        display: flex;
        gap: 1.5rem;
    }

    .form-row .form-group {
        flex: 1;
    }

    .aspects-input-container {
        border: 1px solid #7f8c8d;
        border-radius: 4px;
        background: #34495e;
        padding: 0.5rem;
    }

    .aspects-input-container input {
        border: none;
        background: transparent;
        padding: 0.25rem;
    }

    .aspects-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .aspect-tag {
        display: flex;
        align-items: center;
        background: var(--primary-color);
        color: white;
        padding: 0.4rem 0.6rem;
        border-radius: 12px;
        font-size: 0.9rem;
    }

    .remove-btn {
        background: transparent;
        border: none;
        color: white;
        font-size: 1.2rem;
        margin-left: 0.5rem;
        cursor: pointer;
    }

    .marketplace-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1.5rem;
    }

    .marketplace-table th,
    .marketplace-table td {
        padding: 0.75rem;
        text-align: left;
        border-bottom: 1px solid #34495e;
    }

    .marketplace-table th {
        background: #34495e;
        font-weight: bold;
    }

    .submit-btn {
        width: 100%;
        padding: 1rem;
        font-size: 1rem;
        font-weight: bold;
        color: white;
        background: var(--primary-color);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s ease;
        position: sticky;
        bottom: 0;
        z-index: 10;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .submit-btn:hover {
        background-color: #2980b9;
    }

    /* Custom Scrollbar Styles */
    .scrollable-form-content::-webkit-scrollbar {
        width: 12px;
    }

    .scrollable-form-content::-webkit-scrollbar-thumb {
        background-color: #557999;
        border-radius: 6px;
        border: 3px solid #2c3e50;
    }

    .scrollable-form-content::-webkit-scrollbar-thumb:hover {
        background-color: #6a95b7;
    }

    .scrollable-form-content::-webkit-scrollbar-track {
        background: #34495e;
    }

    /* Mobile Styles */
    @media (max-width: 768px) {
        /* Reduce padding and margin for smaller screens */
        .form-wrapper {
            max-width: 100%;
            border-radius: 0;
            box-shadow: none;
            height: 100vh;
        }

        .scrollable-form-content {
            padding: 1rem;
        }

        .form-row {
            flex-direction: column; /* Stack price and quantity vertically */
            gap: 0;
        }

        .form-row .form-group {
            flex: unset;
        }

        .form-row .form-group:last-child {
            margin-top: 1.5rem;
        }

        h2, h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }

        .form-group label {
            font-size: 0.9rem;
        }

        input[type="text"],
        input[type="number"],
        textarea {
            font-size: 0.9rem;
            padding: 0.6rem;
            padding-left: 22px;

        }
        
        #price {
        }

        .marketplace-table th,
        .marketplace-table td {
            font-size: 0.9rem;
            padding: 0.5rem;
        }

        .submit-btn {
            font-size: 0.9rem;
            padding: 0.8rem;
        }
    }
    #price {
            padding-left: 22px !important;
        }
</style>