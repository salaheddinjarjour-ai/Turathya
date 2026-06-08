// ============================================
// MEDIA UPLOAD MANAGER - Admin Media Upload
// Handles main + secondary media with drag-and-drop
// ============================================

class MediaUploadManager {
    constructor(options = {}) {
        this.mainMediaContainer = options.mainMediaContainer;
        this.secondaryMediaContainer = options.secondaryMediaContainer;
        this.maxImageSize = options.maxImageSize || 5 * 1024 * 1024; // 5MB
        this.maxVideoSize = options.maxVideoSize || 50 * 1024 * 1024; // 50MB

        this.mainMedia = null;
        this.secondaryMedia = [];
        this.draggedIndex = null;

        this.init();
    }

    init() {
        this.setupMainMediaControls();
        this.setupSecondaryMediaControls();
    }

    // ==================== MAIN MEDIA ====================

    setupMainMediaControls() {
        const typeRadios = document.querySelectorAll('input[name="mainMediaType"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.updateMainMediaUpload(radio.value));
        });

        // Initialize with default type (image)
        this.updateMainMediaUpload('image');
    }

    updateMainMediaUpload(type) {
        const uploadContainer = document.getElementById('main-media-upload');
        if (!uploadContainer) return;

        const accept = type === 'video' ? 'video/mp4,video/webm' : 'image/jpeg,image/png,image/jpg';

        uploadContainer.innerHTML = `
            <div class="upload-control">
                <input type="file" 
                       id="main-media-file" 
                       accept="${accept}" 
                       style="display: none"
                       onchange="mediaUploadManager.handleMainMediaSelect(event)">
                <button type="button" class="upload-btn" onclick="document.getElementById('main-media-file').click()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    Upload ${type === 'video' ? 'Video' : 'Image'}
                </button>
                <div class="upload-error" id="main-media-error"></div>
            </div>
        `;
    }

    handleMainMediaSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const type = document.querySelector('input[name="mainMediaType"]:checked').value;
        const error = this.validateFile(file, type);

        if (error) {
            this.showError('main-media-error', error);
            return;
        }

        this.hideError('main-media-error');
        this.processMainMedia(file, type);
    }

    processMainMedia(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.mainMedia = {
                type: type,
                url: e.target.result,
                poster: type === 'video' ? this.generateVideoPoster(e.target.result) : null,
                filename: file.name
            };
            this.renderMainMediaPreview();
        };
        reader.readAsDataURL(file);
    }

    renderMainMediaPreview() {
        const container = document.getElementById('main-media-preview');
        if (!container || !this.mainMedia) return;

        const isVideo = this.mainMedia.type === 'video';

        container.innerHTML = `
            <div class="media-preview">
                <div class="media-preview-content">
                    ${isVideo ? `
                        <video src="${this.mainMedia.url}" controls preload="metadata"></video>
                    ` : `
                        <img src="${this.mainMedia.url}" alt="Main media preview">
                    `}
                </div>
                <div class="media-preview-actions">
                    <button type="button" class="btn btn-ghost btn-sm" onclick="mediaUploadManager.replaceMainMedia()">
                        Replace
                    </button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="mediaUploadManager.removeMainMedia()">
                        Remove
                    </button>
                </div>
            </div>
        `;
        container.classList.remove('empty');
    }

    replaceMainMedia() {
        document.getElementById('main-media-file').click();
    }

    removeMainMedia() {
        this.mainMedia = null;
        const container = document.getElementById('main-media-preview');
        if (container) {
            container.innerHTML = '';
            container.classList.add('empty');
        }
    }

    // ==================== SECONDARY MEDIA ====================

    setupSecondaryMediaControls() {
        const input = document.getElementById('secondary-media-input');
        if (input) {
            input.addEventListener('change', (e) => this.handleSecondaryMediaSelect(e));
        }
    }

    handleSecondaryMediaSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        files.forEach(file => {
            const type = file.type.startsWith('video/') ? 'video' : 'image';
            const error = this.validateFile(file, type);

            if (error) {
                this.showError('secondary-media-error', `${file.name}: ${error}`);
                return;
            }

            this.processSecondaryMedia(file, type);
        });

        // Reset input
        event.target.value = '';
    }

    processSecondaryMedia(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const media = {
                type: type,
                url: e.target.result,
                poster: type === 'video' ? this.generateVideoPoster(e.target.result) : null,
                filename: file.name,
                sortOrder: this.secondaryMedia.length
            };
            this.secondaryMedia.push(media);
            this.renderSecondaryMedia();
        };
        reader.readAsDataURL(file);
    }

    renderSecondaryMedia() {
        const container = document.getElementById('secondary-media-grid');
        if (!container) return;

        if (this.secondaryMedia.length === 0) {
            container.classList.add('empty');
            container.innerHTML = '';
            return;
        }

        container.classList.remove('empty');
        container.innerHTML = this.secondaryMedia.map((media, index) => `
            <div class="media-card" 
                 draggable="true" 
                 data-index="${index}"
                 ondragstart="mediaUploadManager.handleDragStart(event, ${index})"
                 ondragover="mediaUploadManager.handleDragOver(event)"
                 ondrop="mediaUploadManager.handleDrop(event, ${index})"
                 ondragend="mediaUploadManager.handleDragEnd(event)">
                <div class="media-card-preview">
                    ${media.type === 'video' ? `
                        <video src="${media.url}" preload="metadata"></video>
                        <div class="video-overlay">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                    ` : `
                        <img src="${media.url}" alt="Secondary media ${index + 1}">
                    `}
                    <div class="media-card-type">${media.type}</div>
                    <div class="drag-handle">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </div>
                </div>
                <div class="media-card-actions">
                    <button type="button" onclick="mediaUploadManager.setAsMain(${index})">Set Main</button>
                    <button type="button" class="btn-danger" onclick="mediaUploadManager.removeSecondary(${index})">Remove</button>
                </div>
            </div>
        `).join('');
    }

    // ==================== DRAG AND DROP ====================

    handleDragStart(event, index) {
        this.draggedIndex = index;
        event.currentTarget.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
    }

    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const card = event.currentTarget;
        if (!card.classList.contains('dragging')) {
            card.classList.add('drag-over');
        }
    }

    handleDrop(event, targetIndex) {
        event.preventDefault();
        event.currentTarget.classList.remove('drag-over');

        if (this.draggedIndex === null || this.draggedIndex === targetIndex) return;

        // Reorder array
        const draggedItem = this.secondaryMedia[this.draggedIndex];
        this.secondaryMedia.splice(this.draggedIndex, 1);
        this.secondaryMedia.splice(targetIndex, 0, draggedItem);

        // Update sort orders
        this.secondaryMedia.forEach((media, index) => {
            media.sortOrder = index;
        });

        this.renderSecondaryMedia();
    }

    handleDragEnd(event) {
        event.currentTarget.classList.remove('dragging');
        document.querySelectorAll('.media-card').forEach(card => {
            card.classList.remove('drag-over');
        });
        this.draggedIndex = null;
    }

    // ==================== ACTIONS ====================

    setAsMain(index) {
        const media = this.secondaryMedia[index];

        // Move current main to secondary if exists
        if (this.mainMedia) {
            this.secondaryMedia.push({
                ...this.mainMedia,
                sortOrder: this.secondaryMedia.length
            });
        }

        // Set selected as main
        this.mainMedia = { ...media };

        // Remove from secondary
        this.secondaryMedia.splice(index, 1);

        // Update sort orders
        this.secondaryMedia.forEach((m, i) => {
            m.sortOrder = i;
        });

        // Update UI
        const typeRadio = document.querySelector(`input[name="mainMediaType"][value="${media.type}"]`);
        if (typeRadio) typeRadio.checked = true;

        this.renderMainMediaPreview();
        this.renderSecondaryMedia();
    }

    removeSecondary(index) {
        this.secondaryMedia.splice(index, 1);

        // Update sort orders
        this.secondaryMedia.forEach((media, i) => {
            media.sortOrder = i;
        });

        this.renderSecondaryMedia();
    }

    // ==================== VALIDATION ====================

    validateFile(file, type) {
        if (type === 'image') {
            if (!file.type.startsWith('image/')) {
                return 'File must be an image';
            }
            if (file.size > this.maxImageSize) {
                return `Image must be less than ${this.maxImageSize / 1024 / 1024}MB`;
            }
        } else if (type === 'video') {
            if (!file.type.startsWith('video/')) {
                return 'File must be a video';
            }
            if (file.size > this.maxVideoSize) {
                return `Video must be less than ${this.maxVideoSize / 1024 / 1024}MB`;
            }
        }
        return null;
    }

    showError(elementId, message) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('active');
            setTimeout(() => this.hideError(elementId), 5000);
        }
    }

    hideError(elementId) {
        const errorEl = document.getElementById(elementId);
        if (errorEl) {
            errorEl.classList.remove('active');
        }
    }

    generateVideoPoster(videoUrl) {
        // In a real app, this would extract a frame from the video
        // For demo, we'll return null and use the video element itself
        return null;
    }

    // ==================== DATA EXPORT ====================

    getData() {
        return {
            mainMedia: this.mainMedia,
            secondaryMedia: this.secondaryMedia
        };
    }

    setData(data) {
        if (data.mainMedia) {
            this.mainMedia = data.mainMedia;
            const typeRadio = document.querySelector(`input[name="mainMediaType"][value="${data.mainMedia.type}"]`);
            if (typeRadio) typeRadio.checked = true;
            this.renderMainMediaPreview();
        }

        if (data.secondaryMedia && data.secondaryMedia.length > 0) {
            this.secondaryMedia = data.secondaryMedia;
            this.renderSecondaryMedia();
        }
    }

    reset() {
        this.mainMedia = null;
        this.secondaryMedia = [];
        this.removeMainMedia();
        this.renderSecondaryMedia();
    }
}

// Global instance (initialized in /admin)
let mediaUploadManager = null;
