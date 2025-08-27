<script lang="ts">
	import { imageUrls } from "$lib/store/app/helpers/detailsPage";
	import { selectedPage } from "$lib/store/app/helpers/selectedPage";

	
	function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        const files = input.files;
        const urls: string[] = [];
        for (const file of files) {
            // Create a URL for each file and push it to the array
            urls.push(URL.createObjectURL(file));
        }
        // Send the array of URLs to the store
        imageUrls.set(urls);
        // You can also change the view here to automatically show the details
        selectedPage.set('detailsModal');
    }
</script>

<section id="listOptions">
	<label for="fileInput">
		<p>Import Images</p>
		<input 
			type="file" 
			id="fileInput" 
			multiple 
			accept="image/*"
			on:change={handleFileChange}
		/>
	</label>
	
	<p>or</p>
	
	<button on:click={() => selectedPage.set('cameraModal')}>Take pictures</button>
</section>

<style>
	#listOptions {
		/* Use Flexbox for cleaner centering and layout */
		display: flex;
		gap: 2rem;
		justify-content: center;
		align-items: center;
		
		position: absolute;
		bottom: 45%;
		left: 50%;
		transform: translateX(-50%); /* Centers the element horizontally */
		
		font-size: xx-large;
		font-weight: 200;
	}

	/* Hide the actual file input to style a custom "button" */
	#fileInput {
		display: none;
	}

	/* Style the label to look like the button */
	label {
		cursor: pointer;
		padding: 0.5em 1em;
		border: 1px solid #ccc;
		border-radius: 5px;
		text-align: center;
	}
	
	p {
		margin: 0;
	}
</style>