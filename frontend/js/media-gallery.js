// ============================================
// MEDIA GALLERY - Premium Auction House Component
// Main viewer, thumbnails, navigation, lightbox
// ============================================

class MediaGallery {
    constructor(containerId, mediaItems) {
        this.container = document.getElementById(containerId);
        this.mediaItems = mediaItems; // Array of { type: 'image'|'video', src, poster?, alt? }
        this.currentIndex = 0;
        this.lightboxOpen = false;

        this.init();
    }

    init() {
        if (!this.container || !this.mediaItems || this.mediaItems.length === 0) {
            console.error('MediaGallery: Invalid container or media items');
            return;
        }

        this.render();
        this.attachEventListeners();
        this.updateThumbnailScroll();
        this.generateVideoThumbnails();
    }

    getVideoPoster(media) {
        return media.generatedPoster || media.poster || media.fallbackPoster || '';
    }

    getFallbackPoster(media) {
        return media.fallbackPoster || '../assets/images/placeholder.jpg';
    }

    render() {
        const html = `
            <div class="media-gallery">
                <!-- Main Viewer -->
                <div class="media-viewer" id="media-viewer">
                    ${this.renderMainMedia(0)}

                    <div class="media-viewer-meta" id="media-viewer-meta">
                        <span class="media-count" id="media-count"></span>
                        <span class="media-type" id="media-type"></span>
                    </div>
                    
                    <!-- Navigation Arrows -->
                    ${this.mediaItems.length > 1 ? `
                        <button class="media-nav-btn prev" aria-label="Previous media" id="media-prev">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button class="media-nav-btn next" aria-label="Next media" id="media-next">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    ` : ''}
                    
                    <!-- Zoom Button (images only) -->
                    <button class="media-zoom-btn" aria-label="Zoom image" id="media-zoom" style="display: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            <line x1="11" y1="8" x2="11" y2="14"></line>
                            <line x1="8" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </button>
                </div>

                <!-- Thumbnails -->
                ${this.mediaItems.length > 1 ? `
                    <div class="media-thumbnails-container" id="thumbnails-container">
                        <button class="thumbnail-scroll-btn prev" aria-label="Scroll thumbnails left" id="thumb-scroll-prev">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <div class="media-thumbnails" id="media-thumbnails">
                            ${this.renderThumbnails()}
                        </div>
                        <button class="thumbnail-scroll-btn next" aria-label="Scroll thumbnails right" id="thumb-scroll-next">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                ` : ''}
            </div>

            <!-- Lightbox -->
            <div class="media-lightbox" id="media-lightbox">
                <button class="lightbox-close" aria-label="Close lightbox" id="lightbox-close">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <img id="lightbox-image" alt="">
            </div>
        `;

        this.container.innerHTML = html;
        this.updateViewerMeta();
    }

    renderMainMedia(index) {
        const media = this.mediaItems[index];
        const loading = index === 0 ? 'eager' : 'lazy';

        if (media.type === 'video') {
            const poster = this.getVideoPoster(media);
            return `
                <video 
                    controls 
                    playsinline 
                    preload="metadata"
                    ${poster ? `poster="${poster}"` : ''}
                    aria-label="${media.alt || 'Lot video'}"
                >
                    <source src="${media.src}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            return `
                <img 
                    src="${media.src}" 
                    alt="${media.alt || 'Lot image'}"
                    loading="${loading}"
                >
            `;
        }
    }

    renderThumbnails() {
        return this.mediaItems.map((media, index) => {
            const isActive = index === this.currentIndex ? 'active' : '';
            const playIcon = media.type === 'video' ? `
                <div class="play-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                </div>
            ` : '';

            if (media.type === 'video') {
                const poster = this.getVideoPoster(media);
                const fallbackPoster = this.getFallbackPoster(media);
                const initialPoster = poster || fallbackPoster;
                return `
                    <div class="media-thumbnail ${isActive}" 
                         data-index="${index}" 
                         tabindex="0" 
                         role="button"
                         aria-label="View video ${index + 1}">
                        ${initialPoster ? `<img src="${initialPoster}" alt="" loading="lazy" data-fallback="${fallbackPoster}">` : ''}
                        ${playIcon}
                    </div>
                `;
            } else {
                return `
                    <div class="media-thumbnail ${isActive}" 
                         data-index="${index}" 
                         tabindex="0" 
                         role="button"
                         aria-label="View image ${index + 1}">
                        <img src="${media.src}" alt="${media.alt || ''}" loading="lazy">
                    </div>
                `;
            }
        }).join('');
    }

    attachEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('media-prev');
        const nextBtn = document.getElementById('media-next');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigate(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigate(1));

        this.attachThumbnailListeners();
        this.attachThumbnailImageFallbacks();

        // Thumbnail scroll buttons
        const thumbScrollPrev = document.getElementById('thumb-scroll-prev');
        const thumbScrollNext = document.getElementById('thumb-scroll-next');

        if (thumbScrollPrev) {
            thumbScrollPrev.addEventListener('click', () => this.scrollThumbnails(-1));
        }
        if (thumbScrollNext) {
            thumbScrollNext.addEventListener('click', () => this.scrollThumbnails(1));
        }

        // Zoom button
        const zoomBtn = document.getElementById('media-zoom');
        if (zoomBtn) {
            zoomBtn.addEventListener('click', () => this.openLightbox());
        }

        // Lightbox close
        const lightboxClose = document.getElementById('lightbox-close');
        const lightbox = document.getElementById('media-lightbox');

        if (lightboxClose) {
            lightboxClose.addEventListener('click', () => this.closeLightbox());
        }
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox) this.closeLightbox();
            });
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.lightboxOpen) {
                if (e.key === 'Escape') this.closeLightbox();
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.navigate(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigate(1);
            } else if (e.key === 'Escape') {
                this.closeLightbox();
            }
        });

        // Update scroll buttons on resize
        window.addEventListener('resize', () => this.updateThumbnailScroll());
    }

    attachThumbnailImageFallbacks() {
        const thumbnails = document.querySelectorAll('.media-thumbnail');
        thumbnails.forEach((thumb) => {
            const index = Number(thumb.dataset.index);
            const media = this.mediaItems[index];
            if (!media || media.type !== 'video') return;

            const img = thumb.querySelector('img');
            if (!img) return;

            img.addEventListener('error', () => {
                const fallback = img.dataset.fallback || this.getFallbackPoster(media);
                if (fallback && img.src !== fallback) {
                    img.src = fallback;
                    return;
                }
                img.style.display = 'none';
            });
        });
    }

    attachThumbnailListeners() {
        const thumbnails = document.querySelectorAll('.media-thumbnail');
        thumbnails.forEach((thumb) => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                this.showMedia(index);
            });

            thumb.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const index = parseInt(thumb.dataset.index);
                    this.showMedia(index);
                }
            });
        });
    }

    async generateVideoThumbnails() {
        const videoIndexes = this.mediaItems
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.type === 'video' && !item.poster && !item.generatedPoster);

        for (const { item, index } of videoIndexes) {
            try {
                const generatedPoster = await this.generateThumbnailFromVideo(item.src);
                if (!generatedPoster) continue;

                item.generatedPoster = generatedPoster;
                this.updateVideoThumbnailInDom(index, generatedPoster);

                if (this.currentIndex === index) {
                    const currentVideo = document.querySelector('#media-viewer video');
                    if (currentVideo && !currentVideo.getAttribute('poster')) {
                        currentVideo.setAttribute('poster', generatedPoster);
                    }
                }
            } catch (error) {
                console.warn('Failed to generate video thumbnail:', error);
            }
        }
    }

    generateThumbnailFromVideo(src) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';
            video.src = src;

            const timeoutId = setTimeout(() => resolve(null), 5000);

            const cleanup = () => {
                clearTimeout(timeoutId);
                video.removeAttribute('src');
                video.load();
            };

            video.addEventListener('loadeddata', () => {
                const targetTime = Math.min(0.1, Math.max((video.duration || 0) / 2, 0));
                try {
                    video.currentTime = targetTime;
                } catch {
                    // Some browsers may block seeking this early; fallback to current frame
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 360;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        cleanup();
                        resolve(null);
                        return;
                    }
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    cleanup();
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                }
            }, { once: true });

            video.addEventListener('seeked', () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 360;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        cleanup();
                        resolve(null);
                        return;
                    }
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
                    cleanup();
                    resolve(dataUrl);
                } catch {
                    cleanup();
                    resolve(null);
                }
            }, { once: true });

            video.addEventListener('error', () => {
                cleanup();
                resolve(null);
            }, { once: true });
        });
    }

    updateVideoThumbnailInDom(index, posterSrc) {
        const thumb = document.querySelector(`.media-thumbnail[data-index="${index}"]`);
        if (!thumb) return;

        let img = thumb.querySelector('img');
        if (!img) {
            img = document.createElement('img');
            img.alt = '';
            img.loading = 'lazy';
            thumb.prepend(img);
        }

        const media = this.mediaItems[index];
        if (media) {
            img.dataset.fallback = this.getFallbackPoster(media);
        }

        img.onerror = () => {
            const fallback = img.dataset.fallback;
            if (fallback && img.src !== fallback) {
                img.src = fallback;
                return;
            }
            img.style.display = 'none';
        };

        img.src = posterSrc;
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.mediaItems.length) {
            this.showMedia(newIndex);
        }
    }

    showMedia(index) {
        if (index < 0 || index >= this.mediaItems.length) return;

        this.currentIndex = index;
        const viewer = document.getElementById('media-viewer');
        const mainContent = viewer.querySelector('img, video');

        // Update main viewer
        const newMedia = this.renderMainMedia(index);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newMedia;
        const newElement = tempDiv.firstElementChild;

        if (mainContent) {
            mainContent.replaceWith(newElement);
        }

        // Update thumbnails
        document.querySelectorAll('.media-thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });

        // Update zoom button visibility (only show for images)
        const zoomBtn = document.getElementById('media-zoom');
        if (zoomBtn) {
            zoomBtn.style.display = this.mediaItems[index].type === 'image' ? 'flex' : 'none';
        }

        // Scroll thumbnail into view
        const activeThumbnail = document.querySelector('.media-thumbnail.active');
        if (activeThumbnail) {
            activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }

        // Update navigation button states
        this.updateNavigationButtons();
        this.updateViewerMeta();
    }

    updateViewerMeta() {
        const countEl = document.getElementById('media-count');
        const typeEl = document.getElementById('media-type');
        const current = this.mediaItems[this.currentIndex];
        if (!countEl || !typeEl || !current) return;

        countEl.textContent = `${this.currentIndex + 1} / ${this.mediaItems.length}`;
        typeEl.textContent = current.type === 'video' ? 'Video' : 'Image';
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('media-prev');
        const nextBtn = document.getElementById('media-next');

        if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentIndex === this.mediaItems.length - 1;
    }

    scrollThumbnails(direction) {
        const container = document.getElementById('media-thumbnails');
        if (!container) return;

        const scrollAmount = 200;
        container.scrollBy({
            left: direction * scrollAmount,
            behavior: 'smooth'
        });
    }

    updateThumbnailScroll() {
        const container = document.getElementById('thumbnails-container');
        const thumbnails = document.getElementById('media-thumbnails');

        if (!container || !thumbnails) return;

        // Check if thumbnails overflow
        const hasScroll = thumbnails.scrollWidth > thumbnails.clientWidth;
        container.classList.toggle('has-scroll', hasScroll);
    }

    openLightbox() {
        if (this.mediaItems[this.currentIndex].type !== 'image') return;

        const lightbox = document.getElementById('media-lightbox');
        const lightboxImage = document.getElementById('lightbox-image');

        if (lightbox && lightboxImage) {
            lightboxImage.src = this.mediaItems[this.currentIndex].src;
            lightboxImage.alt = this.mediaItems[this.currentIndex].alt || 'Lot image';
            lightbox.classList.add('active');
            this.lightboxOpen = true;
            document.body.style.overflow = 'hidden';
        }
    }

    closeLightbox() {
        const lightbox = document.getElementById('media-lightbox');
        if (lightbox) {
            lightbox.classList.remove('active');
            this.lightboxOpen = false;
            document.body.style.overflow = '';
        }
    }
}

// Initialize gallery helper function
function initMediaGallery(containerId, mediaItems) {
    return new MediaGallery(containerId, mediaItems);
}
