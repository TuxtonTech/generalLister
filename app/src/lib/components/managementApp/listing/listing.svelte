<script lang="ts">
    import { imageUrls } from "$lib/store/app/helpers/detailsPage";
    import { selectedPage } from "$lib/store/app/helpers/selectedPage";

    let dragActive = false;

    function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files) return;
        processFiles(input.files);
    }

    function handleDrop(event: DragEvent) {
        event.preventDefault();
        dragActive = false;
        
        if (event.dataTransfer?.files) {
            processFiles(event.dataTransfer.files);
        }
    }

    function handleDragOver(event: DragEvent) {
        event.preventDefault();
        dragActive = true;
    }

    function handleDragLeave(event: DragEvent) {
        event.preventDefault();
        dragActive = false;
    }

    function processFiles(files: FileList) {
        const urls: string[] = [];
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                urls.push(URL.createObjectURL(file));
            }
        }
        if (urls.length > 0) {
            imageUrls.set(urls);
            selectedPage.set('detailsModal');
        }
    }
</script>

<section id="listOptions">
    <div class="upload-section">
        <div 
            class="upload-area" 
            class:drag-active={dragActive}
            on:drop={handleDrop}
            on:dragover={handleDragOver}
            on:dragleave={handleDragLeave}
            role="button"
            tabindex="0"
            aria-label="Upload images"
        >
            <div class="upload-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <path d="M21 15L16 10L5 21"/>
                </svg>
            </div>
            <h3>Upload Images</h3>
            <p>Drag and drop your images here</p>
            <label for="fileInput" class="upload-button">
                <span>Browse Folders</span>
                <input
                    type="file"
                    id="fileInput"
                    multiple
                    accept="image/*"
                    on:change={handleFileChange}
                    webkitdirectory 
                />
            </label>
            <p class="file-info">Supports JPG, PNG, WebP • Max 10MB each</p>
        </div>
    </div>

    <div class="divider">
        <span>or</span>
    </div>
    
    <div class="camera-section">
        <button 
            class="camera-button" 
            on:click={() => selectedPage.set('cameraModal')}
            aria-label="Take photos with camera"
        >
            <div class="camera-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                </svg>
            </div>
            <span>Take Photos</span>
            <p>Use your camera to capture multiple images</p>
        </button>
    </div>
</section>

<style>
    #listOptions {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2rem;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 500px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .upload-section, .camera-section {
        width: 100%;
    }

    .upload-area {
        border: 3px dashed #cbd5e0;
        border-radius: 16px;
        padding: 3rem 2rem;
        text-align: center;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        transition: all 0.3s ease;
        cursor: pointer;
        color: #475569;
    }

    .upload-area:hover {
        border-color: #3b82f6;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.15);
    }

    .upload-area.drag-active {
        border-color: #059669;
        background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        color: #059669;
    }

    .upload-icon {
        color: #94a3b8;
        margin-bottom: 1rem;
        display: flex;
        justify-content: center;
    }

    .upload-area:hover .upload-icon {
        color: #3b82f6;
    }

    .upload-area.drag-active .upload-icon {
        color: #059669;
    }

    .upload-area h3 {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 600;
        color: inherit;
    }

    .upload-area p {
        margin: 0 0 1.5rem 0;
        color: #64748b;
        font-size: 1rem;
    }

    .upload-button {
        display: inline-flex;
        align-items: center;
        padding: 0.75rem 2rem;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        font-size: 1rem;
    }

    .upload-button:hover {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
    }

    #fileInput {
        display: none;
    }

    .file-info {
        font-size: 0.875rem !important;
        color: #94a3b8 !important;
        margin-top: 1rem !important;
    }

    .divider {
        display: flex;
        align-items: center;
        width: 100%;
        margin: 1rem 0;
    }

    .divider::before,
    .divider::after {
        content: '';
        flex: 1;
        height: 2px;
        background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
    }

    .divider span {
        padding: 0 1.5rem;
        font-size: 1.125rem;
        font-weight: 500;
        color: #64748b;
        background: white;
        border-radius: 20px;
        border: 2px solid #f1f5f9;
    }

    .camera-button {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        padding: 2rem;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
        border: none;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
        font-family: inherit;
    }

    .camera-button:hover {
        background: linear-gradient(135deg, #4f46e5, #4338ca);
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
    }

    .camera-icon {
        margin-bottom: 1rem;
        opacity: 0.9;
    }

    .camera-button span {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .camera-button p {
        margin: 0;
        opacity: 0.8;
        font-size: 0.9rem;
    }

    /* Mobile Styles */
    @media (max-width: 768px) {
        #listOptions {
            width: 95%;
            gap: 1.5rem;
            padding: 1rem;
        }

        .upload-area {
            padding: 2rem 1.5rem;
        }

        .upload-area h3 {
            font-size: 1.25rem;
        }

        .camera-button {
            padding: 1.5rem;
        }
    }

    @media (max-width: 480px) {
        .upload-area {
            padding: 1.5rem 1rem;
        }

        .camera-button {
            padding: 1.25rem;
        }

        .upload-button {
            padding: 0.6rem 1.5rem;
            font-size: 0.9rem;
        }
    }

    /* Dark mode support */
    /* @media (prefers-color-scheme: dark) { */
        .upload-area {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border-color: #475569;
            color: #e2e8f0;
            border: none;
        }

        .upload-area:hover {
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
            border-color: #60a5fa;
        }

        .upload-area.drag-active {
            background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
            border-color: #10b981;
            color: #10b981;
        }

        .upload-area p {
            color: #94a3b8;
        }

        .file-info {
            color: #64748b !important;
        }

        .divider span {
            background: #0f172a;
            border-color: #334155;
            color: #94a3b8;
        }

        .divider::before,
        .divider::after {
            background: linear-gradient(90deg, transparent, #334155, transparent);
        }
    /* } */
</style>