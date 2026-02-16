// ============================================
// TURATHYA - ADMIN FUNCTIONS
// Create auctions, add lots, manage content
// ============================================

// Lot Media Manager
class LotMediaManager {
    constructor() {
        this.mediaFiles = [];
        this.draggedIndex = null;
    }

    handleFilesSelect(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        const errorDiv = document.getElementById('lot-media-error');
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';

        files.forEach(file => {
            // Validate file type
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            if (!isImage && !isVideo) {
                this.showError(tt('notifications.invalidMediaType', { file: file.name }));
                return;
            }

            // Validate file size (10MB for images, 100MB for videos)
            const maxSize = isImage ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
            if (file.size > maxSize) {
                this.showError(tt('notifications.mediaTooLarge', { file: file.name, max: isImage ? '10MB' : '100MB' }));
                return;
            }

            // Add to media files
            if (isImage) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.mediaFiles.push({
                        file: file,
                        type: 'image',
                        url: e.target.result,
                        thumbnail: null
                    });
                    this.renderPreview();
                };
                reader.readAsDataURL(file);
            } else {
                // For videos, generate thumbnail
                this.processVideoFile(file);
            }
        });

        // Reset input
        event.target.value = '';
    }

    async processVideoFile(file) {
        const videoUrl = URL.createObjectURL(file);

        try {
            const thumbnail = await this.generateVideoThumbnail(videoUrl);

            this.mediaFiles.push({
                file: file,
                type: 'video',
                url: videoUrl,
                thumbnail: thumbnail
            });
            this.renderPreview();
        } catch (error) {
            console.error('Failed to generate video thumbnail:', error);
            this.showError(tt('notifications.failedProcessVideo', { file: file.name }));
        }
    }

    generateVideoThumbnail(videoUrl) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';

            video.addEventListener('loadeddata', () => {
                // Seek to 1 second or 10% of duration, whichever is smaller
                video.currentTime = Math.min(1, video.duration * 0.1);
            });

            video.addEventListener('seeked', () => {
                try {
                    // Create canvas and draw video frame
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    // Convert to base64 JPEG (smaller than PNG)
                    const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                    // Clean up
                    video.remove();

                    resolve(thumbnailDataUrl);
                } catch (error) {
                    reject(error);
                }
            });

            video.addEventListener('error', (e) => {
                reject(new Error('Failed to load video'));
            });
        });
    }

    showError(message) {
        const errorDiv = document.getElementById('lot-media-error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    renderPreview() {
        const grid = document.getElementById('lot-media-preview-grid');
        if (this.mediaFiles.length === 0) {
            grid.style.display = 'none';
            return;
        }

        grid.style.display = 'grid';
        grid.innerHTML = this.mediaFiles.map((media, index) => `
            <div class="media-preview-item ${index === 0 ? 'first-item' : ''}" 
                 draggable="true"
                 data-index="${index}"
                 ondragstart="lotMediaManager.handleDragStart(event, ${index})"
                 ondragover="lotMediaManager.handleDragOver(event)"
                 ondrop="lotMediaManager.handleDrop(event, ${index})"
                 ondragend="lotMediaManager.handleDragEnd(event)">
                ${media.type === 'image' ? `
                    <img src="${media.url}" alt="Media ${index + 1}">
                ` : `
                    <img src="${media.thumbnail || media.url}" alt="Video ${index + 1}">
                    <div class="media-play-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                    </div>
                `}
                <button type="button" class="remove-media-btn" onclick="lotMediaManager.removeMedia(${index})">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `).join('');
    }

    removeMedia(index) {
        this.mediaFiles.splice(index, 1);
        this.renderPreview();
    }

    handleDragStart(event, index) {
        this.draggedIndex = index;
        event.target.classList.add('dragging');
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event, dropIndex) {
        event.preventDefault();
        if (this.draggedIndex === null || this.draggedIndex === dropIndex) return;

        // Reorder media files
        const [draggedItem] = this.mediaFiles.splice(this.draggedIndex, 1);
        this.mediaFiles.splice(dropIndex, 0, draggedItem);

        this.draggedIndex = null;
        this.renderPreview();
    }

    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        this.draggedIndex = null;
    }

    reset() {
        this.mediaFiles = [];
        this.renderPreview();
    }

    getMediaFiles() {
        return this.mediaFiles;
    }
}

// Initialize lot media manager
const lotMediaManager = new LotMediaManager();

function t(key) {
    return (typeof i18n !== 'undefined' && i18n?.t) ? i18n.t(key) : key;
}

function tt(key, replacements = {}) {
    let message = t(key);
    Object.entries(replacements).forEach(([name, value]) => {
        message = message.replace(`{${name}}`, String(value));
    });
    return message;
}

// Require admin access
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin.html')) {
        requireAdmin();
    }
});

// ==================== DASHBOARD STATS ====================

// ==================== LOAD DASHBOARD STATS ====================

window.loadDashboardStats = async function () {
    try {
        const { stats } = await adminAPI.getStats();

        document.getElementById('stat-total-auctions').textContent = stats.totalAuctions;
        document.getElementById('stat-active-lots').textContent = stats.activeLots;
        document.getElementById('stat-total-users').textContent = stats.totalUsers;
        document.getElementById('stat-pending-users').textContent = stats.pendingApprovals;
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
        showError(t('notifications.failedLoadDashboardStats'));
    }
}

// ==================== LOAD AUCTIONS ====================

window.loadAuctions = async function () {
    try {
        const { auctions } = await adminAPI.auctions.getAll();
        const tbody = document.querySelector('#auctions-table tbody');
        if (!tbody) return;

        if (auctions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 0;">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="m14.47 13.77-1.41 1.41L5 7.12 6.41 5.7l8.06 8.07zm-3.84-9.94L9.2 5.25l1.42 1.42 1.41-1.42-1.4-1.42zm9.2 9.2-1.42 1.42 1.42 1.41 1.41-1.41-1.41-1.42zm-3.54 3.53 2.12 2.13 1.41-1.41-2.12-2.13-1.41 1.41zM10 3L3 10l7 7 7-7-7-7zm0 12.59L5.41 11 10 6.41 14.59 11 10 15.59z"/></svg>
                            </div>
                            <h3 class="empty-state-title" data-i18n="admin.noAuctions">No Auctions Found</h3>
                            <p class="empty-state-text" data-i18n="admin.noAuctionsDesc">Create your first auction to get started.</p>
                        </div>
                    </td>
                </tr>`;
        } else {
            tbody.innerHTML = auctions.map(auction => `
                <tr>
                    <td><strong class="text-accent">${auction.title}</strong></td>
                    <td>${auction.category || 'N/A'}</td>
                    <td>${auction.lot_count || 0}</td>
                    <td>${formatDate(auction.end_date)}</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" onclick="editAuction('${auction.id}')">${t('buttons.edit')}</button>
                        <button class="btn btn-ghost btn-sm" onclick="confirmDeleteAuction('${auction.id}')">${t('buttons.delete')}</button>
                    </td>
                </tr>
            `).join('');
        }

        // Update auction select dropdown for lots form
        const select = document.getElementById('auction-select');
        if (select) {
            select.innerHTML = auctions.length > 0
                ? auctions.map(a => `<option value="${a.id}">${a.title}</option>`).join('')
                : `<option value="">${t('admin.noAuctionsAvailable')}</option>`;
        }
    } catch (error) {
        console.error('Failed to load auctions:', error);
        showError(t('notifications.failedLoadAuctions'));
    }
}

async function confirmDeleteAuction(auctionId) {
    if (!confirm(t('admin.deleteAuctionConfirm'))) {
        return;
    }

    try {
        await adminAPI.auctions.delete(auctionId);
        showSuccess(t('notifications.auctionDeleted'));
        await loadAuctions();
        await loadDashboardStats();
    } catch (error) {
        console.error('Failed to delete auction:', error);
        showError(error.message || t('notifications.failedDeleteAuction'));
    }
}

// ==================== LOAD LOTS ====================

window.loadLots = async function () {
    try {
        const { lots } = await adminAPI.lots.getAll();
        const tbody = document.querySelector('#lots-table tbody');
        if (!tbody) return;

        if (lots.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="padding: 0;">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
                            </div>
                            <h3 class="empty-state-title" data-i18n="admin.noLots">No Lots Found</h3>
                            <p class="empty-state-text" data-i18n="admin.noLotsDesc">Add lots to your auctions to display them here.</p>
                        </div>
                    </td>
                </tr>`;
        } else {
            tbody.innerHTML = lots.map(lot => {
                const estimate = lot.estimate_low && lot.estimate_high
                    ? `$${lot.estimate_low.toLocaleString()} - $${lot.estimate_high.toLocaleString()}`
                    : 'N/A';
                const currentBid = lot.current_bid && parseFloat(lot.current_bid) > 0
                    ? `$${parseFloat(lot.current_bid).toLocaleString()}`
                    : t('admin.noBids');

                // Highest bidder display
                const highestBidder = lot.bidder_name
                    ? `<a href="#" onclick="showBidderInfo('${lot.id}', '${(lot.title || '').replace(/'/g, "\\'")}', ${lot.lot_number}); return false;" class="text-accent" style="cursor: pointer; text-decoration: underline;">${lot.bidder_name}</a>`
                    : `<span class="text-muted">${t('admin.noBids')}</span>`;

                // Use the lot's actual status field
                const statusBadgeClass = lot.status === 'active' ? 'success' : 'secondary';
                const statusText = lot.status.charAt(0).toUpperCase() + lot.status.slice(1);

                return `
                    <tr>
                        <td>${lot.lot_number}</td>
                        <td>${lot.title}</td>
                        <td>${lot.auction_title || 'N/A'}</td>
                        <td>${estimate}</td>
                        <td>${currentBid}</td>
                        <td>${highestBidder}</td>
                        <td><span class="badge badge-${statusBadgeClass}">${statusText}</span></td>
                        <td>
                            <button class="btn btn-ghost btn-sm" onclick="editLot('${lot.id}')">${t('buttons.edit')}</button>
                            <button class="btn btn-ghost btn-sm" onclick="confirmDeleteLot('${lot.id}', ${lot.lot_number}, '${lot.title}')">${t('buttons.delete')}</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Failed to load lots:', error);
        showError(t('notifications.failedLoadLots'));
    }
}

async function confirmDeleteLot(lotId, lotNumber, title) {
    if (!confirm(tt('admin.deleteLotConfirm', { lotNumber, title }))) {
        return;
    }

    try {
        await adminAPI.lots.delete(lotId);
        showSuccess(t('notifications.lotDeleted'));
        await loadLots();
        await loadDashboardStats();
    } catch (error) {
        console.error('Failed to delete lot:', error);
        showError(error.message || t('notifications.failedDeleteLot'));
    }
}

// ==================== FORM HANDLERS ====================

async function handleAuctionForm(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const editingId = form.dataset.editingId;

    // Convert datetime-local values to ISO 8601 strings with timezone
    const startDateLocal = formData.get('startDate');
    const endDateLocal = formData.get('endDate');

    // Create Date objects which will be in local timezone
    // Then convert to ISO string for proper UTC storage
    const startDate = new Date(startDateLocal);
    const endDate = new Date(endDateLocal);

    const auctionData = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        location: formData.get('location'),
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        buyers_premium: parseFloat(formData.get('buyersPremium')) || 5
    };

    const imageFile = formData.get('auctionImage');

    try {
        let auctionId = editingId;

        if (editingId) {
            // Update existing auction
            await adminAPI.auctions.update(editingId, auctionData);
            showSuccess(t('notifications.auctionUpdated'));
        } else {
            // Create new auction
            const result = await adminAPI.auctions.create(auctionData);
            auctionId = result.auction.id;
            showSuccess(t('notifications.auctionCreated'));
        }

        // Upload image if provided
        if (imageFile && imageFile.size > 0 && auctionId) {
            try {
                await adminAPI.auctions.uploadImage(auctionId, imageFile);
                showSuccess(t('notifications.auctionAndImageSaved'));
            } catch (error) {
                console.error('Image upload error:', error);
                const errorMsg = error.message || 'Unknown error';
                showError(tt('notifications.auctionSavedImageFailed', { error: errorMsg }));
            }
        } else if (!editingId) {
            // No image provided for new auction
            showSuccess(t('notifications.auctionCreated'));
        }

        // Reset form
        form.reset();
        form.dataset.editingId = '';
        form.querySelector('button[type="submit"]').textContent = t('admin.createAuction');

        await loadAuctions();
        await loadDashboardStats();
    } catch (error) {
        console.error('Auction form error:', error);
        showError(error.message || t('notifications.failedSaveAuction'));
    }
}

function editAuction(auctionId) {
    // We need to fetch the auction details
    adminAPI.auctions.getAll().then(({ auctions }) => {
        const auction = auctions.find(a => a.id === auctionId);
        if (!auction) {
            showError(t('notifications.auctionNotFound'));
            return;
        }

        const form = document.getElementById('auction-form');
        if (!form) return;

        // Pre-fill form
        form.querySelector('[name="title"]').value = auction.title;
        form.querySelector('[name="category"]').value = auction.category || '';
        form.querySelector('[name="description"]').value = auction.description || '';
        form.querySelector('[name="location"]').value = auction.location || '';
        form.querySelector('[name="buyersPremium"]').value = auction.buyers_premium || 5;

        // Convert UTC dates to local datetime-local format
        // The database stores dates in UTC, but datetime-local inputs need local time
        const startDate = new Date(auction.start_date);
        const endDate = new Date(auction.end_date);

        // Format as YYYY-MM-DDTHH:MM for datetime-local input
        const formatForInput = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        form.querySelector('[name="startDate"]').value = formatForInput(startDate);
        form.querySelector('[name="endDate"]').value = formatForInput(endDate);
        // Note: Can't pre-fill file input for security reasons

        // Set editing mode
        form.dataset.editingId = auctionId;
        form.querySelector('button[type="submit"]').textContent = t('admin.updateAuction');

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(error => {
        console.error('Failed to load auction for editing:', error);
        showError(t('notifications.failedLoadAuctionDetails'));
    });
}

async function handleLotForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const editingId = form.dataset.editingId;

    const lotData = {
        auction_id: formData.get('auctionId'),
        lot_number: parseInt(formData.get('lotNumber')),
        title: formData.get('title'),
        category: formData.get('category'),
        description: formData.get('description'),
        condition: formData.get('condition'),
        provenance: formData.get('provenance') || null,
        estimate_low: parseFloat(formData.get('estimateMin')),
        estimate_high: parseFloat(formData.get('estimateMax')),
        starting_bid: parseFloat(formData.get('startingBid')),
        reserve_price: parseFloat(formData.get('reserve')) || 0,
        bid_increment: parseFloat(formData.get('bidIncrement')) || 100
    };

    try {
        if (editingId) {
            // Update existing lot
            await adminAPI.lots.update(editingId, lotData);
            showSuccess(t('notifications.lotUpdated'));
            form.dataset.editingId = '';
            form.querySelector('button[type="submit"]').textContent = t('admin.createLot');
        } else {
            // Create new lot
            const result = await adminAPI.lots.create(lotData);

            // Upload media files if provided
            if (result.lot && lotMediaManager.mediaFiles.length > 0) {
                const mediaFiles = lotMediaManager.getMediaFiles();

                for (let i = 0; i < mediaFiles.length; i++) {
                    const mediaItem = mediaFiles[i];
                    const mediaFormData = new FormData();
                    mediaFormData.append('file', mediaItem.file);
                    mediaFormData.append('media_type', mediaItem.type);

                    // Add thumbnail for videos
                    if (mediaItem.type === 'video' && mediaItem.thumbnail) {
                        mediaFormData.append('thumbnail', mediaItem.thumbnail);
                    }

                    try {
                        await adminAPI.lots.uploadMedia(result.lot.id, mediaFormData);
                    } catch (error) {
                        console.error(`Failed to upload media ${i + 1}:`, error);
                        showError(tt('notifications.failedUploadMediaFile', { file: mediaItem.file.name }));
                    }
                }
            }

            showSuccess(t('notifications.lotCreatedWithMedia'));
        }

        form.reset();
        lotMediaManager.reset();

        await loadLots();
        await loadDashboardStats();
    } catch (error) {
        console.error('Lot form error:', error);
        showError(error.message || t('notifications.failedSaveLot'));
    }
}

function editLot(lotId) {
    // Fetch lot details from API
    adminAPI.lots.getAll().then(({ lots }) => {
        const lot = lots.find(l => l.id === lotId);
        if (!lot) {
            showError(t('notifications.lotNotFound'));
            return;
        }

        const form = document.getElementById('lot-form');
        if (!form) return;

        // Pre-fill form
        const auctionSelect = form.querySelector('[name="auctionId"]');
        if (auctionSelect) auctionSelect.value = lot.auction_id;

        form.querySelector('[name="lotNumber"]').value = lot.lot_number;
        form.querySelector('[name="title"]').value = lot.title;
        form.querySelector('[name="category"]').value = lot.category || '';
        form.querySelector('[name="description"]').value = lot.description || '';
        form.querySelector('[name="condition"]').value = lot.condition || '';
        form.querySelector('[name="provenance"]').value = lot.provenance || '';
        form.querySelector('[name="estimateMin"]').value = lot.estimate_low || '';
        form.querySelector('[name="estimateMax"]').value = lot.estimate_high || '';
        form.querySelector('[name="startingBid"]').value = lot.starting_bid || '';
        form.querySelector('[name="reserve"]').value = lot.reserve_price || 0;
        form.querySelector('[name="bidIncrement"]').value = lot.bid_increment || 100;

        // Set editing mode
        form.dataset.editingId = lotId;
        form.querySelector('button[type="submit"]').textContent = t('admin.updateLot');

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(error => {
        console.error('Failed to load lot for editing:', error);
        showError(t('notifications.failedLoadLotDetails'));
    });
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    const auctionForm = document.getElementById('auction-form');
    if (auctionForm) {
        auctionForm.addEventListener('submit', handleAuctionForm);
    } else {
        console.warn('Auction form not found');
    }

    const lotForm = document.getElementById('lot-form');
    if (lotForm) {
        lotForm.addEventListener('submit', handleLotForm);

        // Initialize Media Upload Manager
        const mainMediaContainer = document.getElementById('main-media-upload');
        const secondaryMediaContainer = document.getElementById('secondary-media-grid');

        if (mainMediaContainer && secondaryMediaContainer) {
            window.mediaUploadManager = new MediaUploadManager({
                mainMediaContainer: 'main-media-upload',
                secondaryMediaContainer: 'secondary-media-grid'
            });
        }
    }

    // Initialize bidder info modal close handlers
    const bidderModalBackdrop = document.getElementById('bidder-info-modal');
    if (bidderModalBackdrop) {
        bidderModalBackdrop.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', closeBidderInfoModal);
        });
        bidderModalBackdrop.addEventListener('click', (e) => {
            if (e.target === bidderModalBackdrop) {
                closeBidderInfoModal();
            }
        });

        const removeTopBtn = document.getElementById('remove-top-bidder-btn');
        if (removeTopBtn) {
            removeTopBtn.addEventListener('click', removeTopBidderFromCurrentLot);
        }
    }

    // Load initial data
    loadDashboardStats();
    loadAuctions();

    // Live refresh active admin view (no manual refresh needed)
    setInterval(async () => {
        if (document.hidden) return;

        const activeView = document.querySelector('.admin-view.active');
        const viewId = activeView?.id || '';

        try {
            if (viewId === 'view-dashboard') {
                await loadDashboardStats();
            } else if (viewId === 'view-auctions') {
                await loadAuctions();
            } else if (viewId === 'view-lots') {
                await loadLots();
            } else if (viewId === 'view-users' && typeof loadUsers === 'function') {
                await loadUsers();
            }
        } catch (error) {
            console.debug('Admin live refresh skipped:', error?.message || error);
        }
    }, 15000);
});

// Show bidder info modal
window.showBidderInfo = async function (lotId, lotTitle, lotNumber) {
    const modalBackdrop = document.getElementById('bidder-info-modal');
    if (!modalBackdrop) return;

    modalBackdrop.dataset.lotId = lotId;

    document.getElementById('bidder-name').textContent = t('admin.loading');
    document.getElementById('bidder-email').textContent = '-';
    document.getElementById('bidder-phone').textContent = '-';
    document.getElementById('bidder-bid-amount').textContent = '-';
    document.getElementById('bidder-lot-info').textContent = `Lot #${lotNumber}: ${lotTitle}`;

    modalBackdrop.classList.add('active');

    await loadAllBiddersForLot(lotId);
};

async function loadAllBiddersForLot(lotId) {
    const listEl = document.getElementById('all-bidders-list');
    const removeTopBtn = document.getElementById('remove-top-bidder-btn');
    const auditNoteEl = document.getElementById('bidder-audit-note');

    if (!listEl || !removeTopBtn || !auditNoteEl) return;

    listEl.innerHTML = `<div style="padding: 0.75rem; color: var(--color-text-light);">${t('admin.loadingBidders')}</div>`;
    removeTopBtn.style.display = 'none';

    try {
        const { bidders } = await adminAPI.lots.getBidders(lotId);

        if (!bidders || bidders.length === 0) {
            document.getElementById('bidder-name').textContent = t('admin.noBids');
            document.getElementById('bidder-email').textContent = '-';
            document.getElementById('bidder-phone').textContent = '-';
            document.getElementById('bidder-bid-amount').textContent = '-';
            listEl.innerHTML = `<div style="padding: 0.75rem; color: var(--color-text-light);">${t('admin.noBiddersYet')}</div>`;
            return;
        }

        const topBidder = bidders[0];
        document.getElementById('bidder-name').textContent = topBidder.user.full_name || 'N/A';
        document.getElementById('bidder-email').textContent = topBidder.user.email || 'N/A';
        document.getElementById('bidder-phone').textContent = topBidder.user.phone || 'N/A';
        document.getElementById('bidder-bid-amount').textContent = `$${parseFloat(topBidder.amount).toLocaleString()}`;

        listEl.innerHTML = bidders.map((bidder, index) => `
            <div style="padding: 0.6rem 0.75rem; border-bottom: ${index < bidders.length - 1 ? '1px solid var(--color-border)' : 'none'}; background: ${index === 0 ? 'rgba(47, 79, 62, 0.08)' : 'transparent'};">
                <div style="display: flex; justify-content: space-between; gap: 0.75rem; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">#${bidder.rank} ${bidder.user.full_name || t('common.unknown')}</div>
                        <div style="font-size: 0.85rem; color: var(--color-text-light);">${bidder.user.email || 'N/A'}${bidder.user.phone ? ` • ${bidder.user.phone}` : ''}</div>
                    </div>
                    <div style="font-weight: 700; color: ${index === 0 ? 'var(--theme-accent-dark)' : 'inherit'};">$${parseFloat(bidder.amount).toLocaleString()}</div>
                </div>
            </div>
        `).join('');

        removeTopBtn.style.display = 'inline-flex';
    } catch (error) {
        console.error('Failed to load bidders:', error);
        listEl.innerHTML = `<div style="padding: 0.75rem; color: var(--color-error);">${t('notifications.failedLoadBidders')}</div>`;
    }
}

async function removeTopBidderFromCurrentLot() {
    const modalBackdrop = document.getElementById('bidder-info-modal');
    const auditNoteEl = document.getElementById('bidder-audit-note');
    if (!modalBackdrop) return;

    const lotId = modalBackdrop.dataset.lotId;
    if (!lotId) return;

    const confirmRemove = confirm(t('admin.removeTopBidderConfirm'));
    if (!confirmRemove) return;

    try {
        const result = await adminAPI.lots.removeTopBidder(lotId);

        if (auditNoteEl) {
            const removedName = result?.removed_bidder?.name || t('admin.unknownBidder');
            const removedAmount = result?.removed_bidder?.amount
                ? `$${parseFloat(result.removed_bidder.amount).toLocaleString()}`
                : 'N/A';
            const removedBy = result?.audit?.removed_by?.email || 'admin';
            const removedAt = result?.audit?.removed_at
                ? new Date(result.audit.removed_at).toLocaleString()
                : new Date().toLocaleString();

            auditNoteEl.textContent = tt('admin.auditRemovedTopBidder', {
                name: removedName,
                amount: removedAmount,
                by: removedBy,
                at: removedAt
            });
            auditNoteEl.style.display = 'block';
        }

        showSuccess(t('notifications.topBidderRemoved'));
        await loadAllBiddersForLot(lotId);
        await loadLots();
        await loadDashboardStats();
    } catch (error) {
        console.error('Failed to remove top bidder:', error);
        showError(error.message || t('notifications.failedRemoveTopBidder'));
    }
}

// Close bidder info modal
function closeBidderInfoModal() {
    const modalBackdrop = document.getElementById('bidder-info-modal');
    const auditNoteEl = document.getElementById('bidder-audit-note');
    if (modalBackdrop) {
        modalBackdrop.classList.remove('active');
    }
    if (auditNoteEl) {
        auditNoteEl.textContent = '';
        auditNoteEl.style.display = 'none';
    }
}

// Make functions globally available for inline onclick handlers
window.loadDashboardStats = loadDashboardStats;
window.loadAuctions = loadAuctions;
window.loadLots = loadLots;
window.editAuction = editAuction;
window.editLot = editLot;
window.confirmDeleteAuction = confirmDeleteAuction;
window.confirmDeleteLot = confirmDeleteLot;

// --- MOBILE SIDEBAR LOGIC ---
window.toggleAdminSidebar = function () {
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    }
}

// Close sidebar when clicking outside (overlay)
document.addEventListener('DOMContentLoaded', () => {
    // Create overlay if it doesn't exist
    if (!document.querySelector('.sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.classList.add('sidebar-overlay');
        overlay.onclick = window.toggleAdminSidebar; // Click to close
        document.body.appendChild(overlay);
    }

    // Close sidebar on nav item click (mobile)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 1024) {
                const sidebar = document.getElementById('adminSidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    window.toggleAdminSidebar();
                }
            }
        });
    });
});


