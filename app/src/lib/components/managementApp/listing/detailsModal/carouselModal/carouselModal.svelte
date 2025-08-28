<script lang="ts">
    import { imageUrls } from "$lib/store/app/helpers/detailsPage";
	import { selectedPage } from "$lib/store/app/helpers/selectedPage";

    let currentImageIndex = 0;

    $: {
        if ($imageUrls.length === 0) {
            console.log('Redirecting to home as no images exist.');
        }
    }

    function nextImage() {
        currentImageIndex = (currentImageIndex + 1) % $imageUrls.length;
    }

    function prevImage() {
        currentImageIndex = (currentImageIndex - 1 + $imageUrls.length) % $imageUrls.length;
    }

	function addImage() {
		imageUrls.update((urls) => {
			const newUrls =  currentImageIndex > urls.length ? [...urls, null] : [...urls.slice(0, currentImageIndex), null, ...urls.slice(currentImageIndex++)]
			console.log(newUrls, currentImageIndex)
			return newUrls

		})

		selectedPage.set('cameraModal')
	}

    function deleteImage() {
        imageUrls.update((urls) => {
            const newUrls = urls.filter((_, index) => index !== currentImageIndex);
            
            if (currentImageIndex >= newUrls.length) {
                currentImageIndex = newUrls.length - 1;
            }
            if (newUrls.length === 0) {
                currentImageIndex = 0;
            }
            return newUrls;
        });
    }

	function retryImage() {
		imageUrls.update((urls) => {
			urls[currentImageIndex] = null
			return urls
		})

		console.log(imageUrls)
		selectedPage.set('cameraModal')
	}

    // Handle keyboard navigation
    function handleKeydown(event: any) {
        if (event.key === 'ArrowLeft') {
            prevImage();
        } else if (event.key === 'ArrowRight') {
            nextImage();
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="carousel-container">
    {#if $imageUrls.length > 0}
        <!-- Navigation arrows -->
        <button
            class="nav-arrow nav-arrow--prev"
            on:click={prevImage}
            disabled={$imageUrls.length <= 1}
            aria-label="Previous image"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>

        <!-- Main content area -->
        <div class="carousel-main">
            <!-- Image display area -->
            <div class="image-container">
                <img
                    class="carousel-image"
                    src={$imageUrls[currentImageIndex]}
                    alt="Gallery image {currentImageIndex + 1} of {$imageUrls.length}"
                    loading="lazy"
                />
                
                <!-- Image counter -->
                <div class="image-counter">
                    {currentImageIndex + 1} / {$imageUrls.length}
                </div>
            </div>
            
            <!-- Action buttons -->
            <div class="action-buttons">
                <button 
                    class="action-btn action-btn--retry" 
                    on:click={() => {retryImage()}}
                    aria-label="Retake image"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C9.61914 21 7.5 19.7529 6.22852 17.8398" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <path d="M3 8V12H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Retake</span>
                </button>
                <button 
                    class="action-btn action-btn--add" 
                    on:click={addImage}
                    aria-label="Add another image"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(45deg);">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="sr-only">Add</span>
                </button>
                <button 
                    class="action-btn action-btn--delete" 
                    on:click={deleteImage}
                    aria-label="Delete current image"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="sr-only">Delete</span>
                </button>
            </div>
        </div>

        <!-- Navigation arrows -->
        <button
            class="nav-arrow nav-arrow--next"
            on:click={nextImage}
            disabled={$imageUrls.length <= 1}
            aria-label="Next image"
        >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </button>

        <!-- Dot indicators (for mobile) -->
        {#if $imageUrls.length > 1}
            <div class="dot-indicators">
                {#each $imageUrls as _, index}
                    <button
                        class="dot-indicator"
                        class:active={index === currentImageIndex}
                        on:click={() => currentImageIndex = index}
                        aria-label="Go to image {index + 1}"
                    ></button>
                {/each}
            </div>
        {/if}
    {:else}
        <div class="no-images">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2"/>
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
                <path d="M21 15L16 10L5 21" stroke="currentColor" stroke-width="2"/>
            </svg>
            <h3>No images to display</h3>
            <p>Upload some images to get started!</p>
        </div>
    {/if}
</div>

<style>
    .carousel-container {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: clamp(1rem, 3vw, 2rem);
        padding: 1rem;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        position: relative;
        color: #ecf0f1;
        box-sizing: border-box;
		height: 100%;
    }

    .carousel-main {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        flex: 1;
        min-width: 0;
        max-width: 100%;
    }

    .image-container {
        position: relative;
        background: linear-gradient(145deg, #2c3e50, #34495e);
        border-radius: 12px;
        padding: 1rem;
        box-shadow: 
            0 10px 25px rgba(0, 0, 0, 0.3),
            0 4px 10px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
    }

	.image-container img {
		height: 250px !important;
	}

    .carousel-image {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 8px;
        transition: transform 0.3s ease;
    }

    .carousel-image:hover {
        transform: scale(1.02);
    }

    .image-counter {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 500;
        backdrop-filter: blur(4px);
    }

    .nav-arrow {
        background: rgba(0, 0, 0, 0.6);
        color: #ecf0f1;
        border: none;
        border-radius: 50%;
        width: clamp(40px, 8vw, 56px);
        height: clamp(40px, 8vw, 56px);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        backdrop-filter: blur(4px);
        flex-shrink: 0;
    }

    .nav-arrow:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.8);
        transform: scale(1.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .nav-arrow:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        background: rgba(0, 0, 0, 0.3);
    }

    .action-buttons {
        display: flex;
        gap: 1rem;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        font-size: 0.9rem;
        font-weight: 600;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .action-btn--retry {
        background: linear-gradient(135deg, #3498db, #2980b9);
        color: white;
    }

    .action-btn--retry:hover {
        background: linear-gradient(135deg, #2980b9, #1f618d);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }

	.action-btn--add {
        background: linear-gradient(135deg, #34db95, #298eb9);
        color: white;
    }

    .action-btn--add:hover {
        background: linear-gradient(135deg, #2980b9, #1f618d);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }

    .action-btn--delete {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        padding: 0.75rem;
        width: auto;
        min-width: 48px;
    }

    .action-btn--delete:hover {
        background: linear-gradient(135deg, #c0392b, #a93226);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(231, 76, 60, 0.4);
    }

    .dot-indicators {
        display: none;
        gap: 0.5rem;
        justify-content: center;
        position: absolute;
        bottom: -2.5rem;
        left: 50%;
        transform: translateX(-50%);
    }

    .dot-indicator {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        border: none;
        cursor: pointer;
        transition: all 0.3s ease;
    }

    .dot-indicator.active {
        background: #3498db;
        transform: scale(1.2);
    }

    .no-images {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 3rem;
        text-align: center;
        color: #bdc3c7;
        opacity: 0.8;
    }

    .no-images svg {
        opacity: 0.6;
    }

    .no-images h3 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .no-images p {
        margin: 0;
        font-size: 1rem;
        opacity: 0.8;
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    /* Tablet styles */
    @media (max-width: 1024px) {
        .carousel-container {
            gap: 1rem;
        }

        .image-container {
            max-width: 80vw;
            height: clamp(250px, 40vh, 400px);
        }
    }

    /* Mobile styles */
    @media (max-width: 768px) {
        .carousel-container {
            flex-direction: column;
            gap: 1rem;
            padding: 1rem 0.5rem;
        }

        .nav-arrow {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            z-index: 10;
            width: 44px;
            height: 44px;
        }

        .nav-arrow--prev {
            left: 0.5rem;
        }

        .nav-arrow--next {
            right: 0.5rem;
        }

        .carousel-main {
            width: 100%;
            gap: 1rem;
        }

        .image-container {
            max-width: 95vw;
            height: clamp(200px, 35vh, 350px);
            margin: 0 1rem;
        }

        .action-buttons {
            gap: 0.75rem;
        }

        .action-btn {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
        }

        .action-btn--delete {
            padding: 0.6rem;
            min-width: 44px;
        }

        .dot-indicators {
            display: flex;
        }
    }

    /* Small mobile styles */
    @media (max-width: 480px) {
        .carousel-container {
            padding: 0.5rem;
			height: auto;
        }

        .image-container {
            height: 100%;
            padding: 0.75rem;
        }

        .nav-arrow {
            width: 40px;
            height: 40px;
        }

        .nav-arrow--prev {
            left: 0.25rem;
        }

        .nav-arrow--next {
            right: 0.25rem;
        }

        .action-buttons {
            flex-direction: row;
            gap: 0.5rem;
        }

        .action-btn span {
            display: none;
        }

        .action-btn--delete span {
            display: inline;
        }
    }

    /* High-resolution displays */
    @media (min-width: 1200px) {
        .carousel-container {
            gap: 2rem;
        }

        .image-container {
        }
    }

    /* Accessibility improvements */
    @media (prefers-reduced-motion: reduce) {
        * {
            transition: none !important;
            animation: none !important;
        }
    }

    /* Dark mode support */
    @media (prefers-color-scheme: light) {
        .carousel-container {
            color: #2c3e50;
        }

        .image-container {
            background: linear-gradient(145deg, #ecf0f1, #d5dbdb);
        }

        .nav-arrow {
            background: rgba(255, 255, 255, 0.9);
            color: #2c3e50;
        }

        .nav-arrow:hover:not(:disabled) {
            background: rgba(255, 255, 255, 1);
        }

        .no-images {
            color: #7f8c8d;
        }
    }
</style>