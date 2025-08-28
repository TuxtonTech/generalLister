<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { imageUrls } from "$lib/store/app/helpers/detailsPage";
    import { selectedPage } from "$lib/store/app/helpers/selectedPage";

    let videoElement: HTMLVideoElement;
    let canvasElement: HTMLCanvasElement;
    let stream: MediaStream | null = null;
    let capturedImages: string[] = [];
    let isCapturing = false;
    let cameraError = '';
    let facingMode = 'environment'; // 'user' for front, 'environment' for back
    let isFlashOn = false;
    let showCountdown = false;
    let countdown = 0;


    $: {
    }

    onMount(async () => {
        console.log("Cam Inited")
        await initializeCamera();
    });

    onDestroy(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });

    async function initializeCamera() {
        try {
            cameraError = '';
            
            // Stop existing stream
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const constraints = {
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoElement.srcObject = stream;
            
        } catch (error) {
            console.error('Error accessing camera:', error);
            cameraError = 'Unable to access camera. Please check permissions.';
        }
    }

    function startCountdown() {
        capturePhoto();
        
        //Visual Count Down Interval ------------------
        // showCountdown = true;
        // countdown = 0;
        // const countdownInterval = setInterval(() => {
        //     countdown--;
        //     if (countdown <= 0) {
        //         clearInterval(countdownInterval);
        //         showCountdown = false;
        //     }
        // }, 1000);
    }

    function capturePhoto() {
        if (!videoElement || !canvasElement || isCapturing) return;
        
        isCapturing = true;
        
        // Set canvas dimensions to match video
        const context = canvasElement.getContext('2d');
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        
        // Draw the video frame to canvas
        context?.drawImage(videoElement, 0, 0);
        
        // Convert to blob and create URL
        canvasElement.toBlob((blob) => {
            if (blob) {
                const imageUrl = URL.createObjectURL(blob);
                    imageUrls.update((urls)=> {
                       const index = urls.findIndex(v => v == null)
                        urls[index] = imageUrl
                        return urls
                   })
                    
                    selectedPage.set('detailsModal');
                    capturedImages = [...capturedImages, imageUrl];
            }
            isCapturing = false;
        }, 'image/jpeg', 0.9);
    }

    function deleteImage(index: number) {
        // Revoke the URL to free memory
        URL.revokeObjectURL(capturedImages[index]);
        capturedImages = capturedImages.filter((_, i) => i !== index);
    }

    function switchCamera() {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        initializeCamera();
    }

    function toggleFlash() {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            // if (capabilities.torch) {
            //     isFlashOn = !isFlashOn;
            //     track.applyConstraints({
            //         advanced: [{ "torch": isFlashOn }]
            //     }).catch(() => {
            //         // Flash not supported, ignore
            //         isFlashOn = false;
            //     });
            // }
        }
    }

    function proceedToDetails() {
        console.log(capturedImages.length)
        if (capturedImages.length > 0) {
            imageUrls.set(capturedImages);
            selectedPage.set('detailsModal');
        }
    }

    function goBack() {
        // Clean up captured images
        capturedImages.forEach(url => URL.revokeObjectURL(url));
        selectedPage.set('listing'); // or whatever your main page is called
    }

    function retakeAll() {
        capturedImages.forEach(url => URL.revokeObjectURL(url));
        capturedImages = [];
    }
</script>

<div class="camera-modal">
    <div class="camera-header">
        <button class="header-btn" on:click={goBack} aria-label="Go back">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
        </button>
        
        <h2>Take Photos</h2>
        
        <div class="header-actions">
            <button 
                class="header-btn" 
                class:active={isFlashOn}
                on:click={toggleFlash} 
                aria-label="Toggle flash"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
            </button>
            
            <button class="header-btn" on:click={switchCamera} aria-label="Switch camera">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2m2 4h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2"/>
                    <circle cx="8" cy="9" r="2"/>
                    <path d="M15 12h.01"/>
                </svg>
            </button>
        </div>
    </div>

    <div class="camera-content">
        {#if cameraError}
            <div class="error-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Camera Access Required</h3>
                <p>{cameraError}</p>
                <button class="retry-btn" on:click={initializeCamera}>
                    Try Again
                </button>
            </div>
        {:else}
            <div class="camera-container">
                <!-- Camera view -->
                <div class="video-container">
                    <video 
                        bind:this={videoElement}
                        autoplay
                        muted
                        playsinline
                        class="camera-video"
                    ></video>
                    
                    <!-- Countdown overlay -->
                    {#if showCountdown}
                        <div class="countdown-overlay">
                            <div class="countdown-number">{countdown}</div>
                        </div>
                    {/if}

                    <!-- Camera overlay UI -->
                    <div class="camera-overlay">
                        <div class="frame-guide"></div>
                        
                        {#if capturedImages.length > 0}
                            <div class="image-counter">
                                {capturedImages.length} photo{capturedImages.length !== 1 ? 's' : ''} taken
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Camera controls -->
                <div class="camera-controls">
                    <div class="control-row">
                        {#if capturedImages.length > 0}
                            <button class="control-btn secondary" on:click={retakeAll}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 12c0-4.97 4.03-9 9-9s9 4.03 9 9-4.03 9-9 9c-2.5 0-4.74-1.01-6.36-2.64"/>
                                    <path d="M3 8v4h4"/>
                                </svg>
                                Retake All
                            </button>
                        {:else}
                            <div></div>
                        {/if}

                        <button 
                            class="capture-btn" 
                            class:capturing={isCapturing}
                            on:click={startCountdown}
                            disabled={isCapturing || showCountdown}
                            aria-label="Take photo"
                        >
                            <div class="capture-inner"></div>
                        </button>

                        {#if capturedImages.length > 0}
                            <button class="control-btn primary" on:click={proceedToDetails}>
                                Continue
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 18l6-6-6-6"/>
                                </svg>
                            </button>
                        {:else}
                            <div></div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>

    <!-- Captured images strip -->
    {#if capturedImages.length > 0}
        <div class="images-strip">
            <div class="images-container">
                {#each capturedImages as imageUrl, index}
                    <div class="image-thumb">
                        <img src={imageUrl} alt="Captured photo {index + 1}" />
                        <button 
                            class="delete-thumb" 
                            on:click={() => deleteImage(index)}
                            aria-label="Delete photo {index + 1}"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6L18 18"/>
                            </svg>
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- Hidden canvas for image capture -->
    <canvas bind:this={canvasElement} style="display: none;"></canvas>
</div>

<style>
    .camera-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        color: white;
        display: flex;
        flex-direction: column;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .camera-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .camera-header h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .header-actions {
        display: flex;
        gap: 0.5rem;
    }

    .header-btn {
        background: transparent;
        border: 2px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 0.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .header-btn:hover,
    .header-btn.active {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.5);
    }

    .camera-content {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .error-state {
        text-align: center;
        padding: 2rem;
        color: #ef4444;
    }

    .error-state svg {
        margin-bottom: 1rem;
        opacity: 0.7;
    }

    .error-state h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
    }

    .error-state p {
        margin: 0 0 2rem 0;
        opacity: 0.8;
    }

    .retry-btn {
        background: #ef4444;
        color: white;
        border: none;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.3s ease;
    }

    .retry-btn:hover {
        background: #dc2626;
    }

    .camera-container {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .video-container {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #000;
    }

    .camera-video {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .countdown-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
    }

    .countdown-number {
        font-size: 4rem;
        font-weight: bold;
        color: white;
        animation: countdownPulse 1s ease-in-out;
    }

    @keyframes countdownPulse {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.2); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
    }

    .camera-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
    }

    .frame-guide {
        width: min(80%, 300px);
        aspect-ratio: 1;
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(2px);
    }

    .image-counter {
        position: absolute;
        top: 1rem;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 20px;
        font-size: 0.9rem;
        font-weight: 500;
        backdrop-filter: blur(10px);
    }

    .camera-controls {
        padding: 1.5rem;
        background: rgba(0, 0, 0, 0.8);
        backdrop-filter: blur(10px);
    }

    .control-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        max-width: 400px;
        margin: 0 auto;
    }

    .capture-btn {
        width: 70px;
        height: 70px;
        background: transparent;
        border: 4px solid white;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        position: relative;
    }

    .capture-btn:hover {
        transform: scale(1.1);
    }

    .capture-btn.capturing {
        border-color: #ef4444;
    }

    .capture-inner {
        width: 50px;
        height: 50px;
        background: white;
        border-radius: 50%;
        transition: all 0.2s ease;
    }

    .capture-btn.capturing .capture-inner {
        background: #ef4444;
        transform: scale(0.8);
    }

    .control-btn {
        padding: 0.75rem 1.5rem;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
    }

    .control-btn.secondary {
        background: transparent;
        color: white;
    }

    .control-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.5);
    }

    .control-btn.primary {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }

    .control-btn.primary:hover {
        background: #2563eb;
        border-color: #2563eb;
    }

    .images-strip {
        background: rgba(0, 0, 0, 0.9);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        padding: 1rem;
        backdrop-filter: blur(10px);
    }

    .images-container {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding: 0.5rem 0;
    }

    .image-thumb {
        position: relative;
        flex-shrink: 0;
        width: 60px;
        height: 60px;
        border-radius: 8px;
        overflow: hidden;
        border: 2px solid rgba(255, 255, 255, 0.3);
    }

    .image-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .delete-thumb {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 24px;
        height: 24px;
        background: #ef4444;
        color: white;
        border: 2px solid #000;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: all 0.3s ease;
    }

    .delete-thumb:hover {
        background: #dc2626;
        transform: scale(1.1);
    }

    /* Mobile optimizations */
    @media (max-width: 768px) {
        .camera-header {
            padding: 0.75rem;
        }

        .camera-header h2 {
            font-size: 1.1rem;
        }

        .header-btn {
            padding: 0.4rem;
        }

        .control-row {
            max-width: 100%;
            padding: 0 1rem;
        }

        .capture-btn {
            width: 60px;
            height: 60px;
        }

        .capture-inner {
            width: 40px;
            height: 40px;
        }

        .control-btn {
            padding: 0.6rem 1rem;
            font-size: 0.8rem;
        }

        .images-strip {
            padding: 0.75rem;
        }

        .image-thumb {
            width: 50px;
            height: 50px;
        }
    }

    @media (max-width: 480px) {
        .camera-controls {
            padding: 1rem;
        }

        .control-btn span {
            display: none;
        }

        .frame-guide {
            width: 90%;
        }

        .image-counter {
            font-size: 0.8rem;
            padding: 0.4rem 0.8rem;
        }
    }

    /* Landscape orientation on mobile */
    @media (orientation: landscape) and (max-height: 500px) {
        .camera-header {
            padding: 0.5rem;
        }

        .camera-controls {
            padding: 0.75rem;
        }

        .images-strip {
            padding: 0.5rem;
        }
    }

    /* High contrast mode support */
    @media (prefers-contrast: high) {
        .header-btn,
        .control-btn {
            border-width: 3px;
        }

        .capture-btn {
            border-width: 5px;
        }

        .frame-guide {
            border-width: 3px;
        }
    }

    /* Reduced motion support */
    @media (prefers-reduced-motion: reduce) {
        * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
        }

        .capture-btn:hover,
        .control-btn:hover,
        .header-btn:hover {
            transform: none;
        }
    }
    </style>