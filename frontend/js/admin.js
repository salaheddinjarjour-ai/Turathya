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

let whatsappAdminPollTimer = null;

window.stopWhatsAppIntegrationPolling = function () {
    if (whatsappAdminPollTimer) {
        clearInterval(whatsappAdminPollTimer);
        whatsappAdminPollTimer = null;
    }
};

window.loadWhatsAppIntegration = async function () {
    const statusEl = document.getElementById('whatsapp-admin-status');
    const stateEl = document.getElementById('whatsapp-connection-state');
    const jidEl = document.getElementById('whatsapp-connected-jid');
    const qrWrapper = document.getElementById('whatsapp-qr-wrapper');
    const qrImage = document.getElementById('whatsapp-qr-image');

    if (!statusEl || !stateEl || !jidEl || !qrWrapper || !qrImage) {
        return;
    }

    const refreshWhatsAppState = async () => {
        try {
            const qrPayload = await adminAPI.whatsapp.getQr();
            const isConnected = !!qrPayload.isConnected;

            stateEl.textContent = isConnected ? 'Connected ✅' : 'Disconnected ⚠️';
            jidEl.textContent = qrPayload.connectedJid || '-';

            if (isConnected) {
                // Hide QR section when connected
                qrWrapper.style.display = 'none';
                statusEl.className = 'alert alert-success';
                statusEl.textContent = 'WhatsApp is connected. Automated notifications are active.';
                statusEl.style.display = 'block';
            } else {
                // Always show QR section when disconnected
                qrWrapper.style.display = 'block';
                statusEl.className = 'alert alert-error';
                statusEl.textContent = 'WhatsApp is not connected. Scan the QR code below with your phone.';
                statusEl.style.display = 'block';

                if (qrPayload.qrCode) {
                    // QR code ready — show the image
                    qrImage.src = qrPayload.qrCode;
                    qrImage.style.display = 'block';
                    const loadingMsg = qrWrapper.querySelector('.qr-loading-msg');
                    if (loadingMsg) loadingMsg.remove();
                } else {
                    // QR not generated yet — show loading message
                    qrImage.style.display = 'none';
                    if (!qrWrapper.querySelector('.qr-loading-msg')) {
                        const loadingMsg = document.createElement('div');
                        loadingMsg.className = 'qr-loading-msg';
                        loadingMsg.style.cssText = 'padding: 2rem; font-size: 1rem; color: var(--color-graphite);';
                        loadingMsg.innerHTML = '<div style="font-size: 2rem; margin-bottom: 0.5rem;">⏳</div>Generating QR code, please wait…';
                        qrWrapper.appendChild(loadingMsg);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load WhatsApp admin state:', error);
            stateEl.textContent = 'Unavailable';
            jidEl.textContent = '-';
            qrWrapper.style.display = 'none';

            statusEl.className = 'alert alert-error';
            statusEl.textContent = error.message || 'Could not connect to WhatsApp bridge.';
            statusEl.style.display = 'block';
        }
    };

    window.stopWhatsAppIntegrationPolling();
    await refreshWhatsAppState();

    whatsappAdminPollTimer = setInterval(() => {
        refreshWhatsAppState();
    }, 5000);
}

// Require admin access
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('/admin')) {
        requireAdmin();
    }
});

// ==================== DASHBOARD STATS ====================

// ==================== LOAD DASHBOARD STATS ====================

window.loadDashboardStats = async function () {
    try {
        const { stats } = await adminAPI.getStats();

        document.getElementById('stat-total-auctions').textContent = stats.totalCategories ?? stats.totalAuctions;
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
        const { categories } = await adminAPI.categories.getAll();
        const tbody = document.querySelector('#auctions-table tbody');
        if (!tbody) return;

        if (categories.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 0;">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="m14.47 13.77-1.41 1.41L5 7.12 6.41 5.7l8.06 8.07zm-3.84-9.94L9.2 5.25l1.42 1.42 1.41-1.42-1.4-1.42zm9.2 9.2-1.42 1.42 1.42 1.41 1.41-1.41-1.41-1.42zm-3.54 3.53 2.12 2.13 1.41-1.41-2.12-2.13-1.41 1.41zM10 3L3 10l7 7 7-7-7-7zm0 12.59L5.41 11 10 6.41 14.59 11 10 15.59z"/></svg>
                            </div>
                            <h3 class="empty-state-title">No Categories Found</h3>
                            <p class="empty-state-text">Create your first category to get started.</p>
                        </div>
                    </td>
                </tr>`;
        } else {
            tbody.innerHTML = categories.map((category) => `
                <tr>
                    <td><strong class="text-accent">${category.title}</strong></td>
                    <td>${category.category || 'N/A'}</td>
                    <td>${category.product_count || 0}</td>
                    <td>${formatDate(category.updated_at || category.end_date)}</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" onclick="editAuction('${category.id}')">${t('buttons.edit')}</button>
                        <button class="btn btn-ghost btn-sm" onclick="confirmDeleteAuction('${category.id}')">${t('buttons.delete')}</button>
                    </td>
                </tr>
            `).join('');
        }

        // Update category select dropdown for products form
        const select = document.getElementById('category-select');
        if (select) {
            select.innerHTML = categories.length > 0
                ? categories.map((c) => `<option value="${c.id}">${c.title}</option>`).join('')
                : '<option value="">No Categories Available</option>';
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        showError('Failed to load categories');
    }
}

async function confirmDeleteAuction(auctionId) {
    if (!confirm(t('admin.deleteAuctionConfirm'))) {
        return;
    }

    try {
        await adminAPI.categories.delete(auctionId);
        showSuccess(t('notifications.auctionDeleted'));
        await loadAuctions();
        await loadDashboardStats();
    } catch (error) {
        console.error('Failed to delete auction:', error);
        showError(error.message || t('notifications.failedDeleteAuction'));
    }
}

// ==================== LOAD LOTS ====================

function _adminLotState(lot) {
    var now = new Date();
    var start = lot.start_date ? new Date(lot.start_date) : null;
    var end   = lot.end_date   ? new Date(lot.end_date)   : null;
    if (!start && !end) return 'gallery';
    if (end && end < now) return 'ended';
    if (start && start > now) return 'upcoming';
    return 'active';
}

function _buildLotRow(lot) {
    var estimate = (lot.estimate_low && lot.estimate_high)
        ? ('$' + Number(lot.estimate_low).toLocaleString() + ' - $' + Number(lot.estimate_high).toLocaleString())
        : 'N/A';
    var currentBid = (lot.current_bid && parseFloat(lot.current_bid) > 0)
        ? ('$' + parseFloat(lot.current_bid).toLocaleString())
        : t('admin.noBids');
    var bidderSafe = (lot.bidder_name || '').replace(/'/g, "\\'");
    var titleSafe  = (lot.title || '').replace(/'/g, "\\'");
    var highestBidder = lot.bidder_name
        ? '<a href="#" onclick="showBidderInfo(\'' + lot.id + '\',\'' + bidderSafe + '\',' + lot.lot_number + ');return false;" class="text-accent" style="cursor:pointer;text-decoration:underline;">' + lot.bidder_name + '</a>'
        : '<span class="text-muted">-</span>';
    var featColor = lot.is_featured ? '#C6A46C' : '#ccc';
    var featBtn   = '<button onclick="toggleLotFeatured(\'' + lot.id + '\',' + (!!lot.is_featured) + ')" title="' + (lot.is_featured ? 'Remove from homepage' : 'Feature on homepage') + '" style="background:none;border:none;cursor:pointer;font-size:1.3rem;line-height:1;padding:2px 6px;color:' + featColor + ';transition:color .2s;" onmouseover="this.style.color=\'#C6A46C\'" onmouseout="this.style.color=\'' + featColor + '\'">&#9733;</button>';
    return '<tr>'
        + '<td>' + lot.lot_number + '</td>'
        + '<td>' + (lot.title || '-') + '</td>'
        + '<td>' + (lot.auction_title || '-') + '</td>'
        + '<td>' + estimate + '</td>'
        + '<td>' + currentBid + '</td>'
        + '<td>' + highestBidder + '</td>'
        + '<td style="text-align:center;">' + featBtn + '</td>'
        + '<td>'
        + '<button class="btn btn-ghost btn-sm" onclick="editLot(\'' + lot.id + '\')">' + t('buttons.edit') + '</button> '
        + '<button class="btn btn-ghost btn-sm" onclick="confirmDeleteLot(\'' + lot.id + '\',' + lot.lot_number + ',\'' + titleSafe + '\')">' + t('buttons.delete') + '</button>'
        + '</td>'
        + '</tr>';
}

function _lotsGroupHeader(label, bgColor, count) {
    return '<tr style="background:' + bgColor + ';pointer-events:none;">'
        + '<td colspan="8" style="padding:8px 14px;font-size:0.75rem;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:#fff;border:none;">'
        + label + ' <span style="opacity:.65;font-weight:400;">(' + count + ')</span>'
        + '</td></tr>';
}

window.loadLots = async function () {
    try {
        const { lots } = await adminAPI.lots.getAll();
        const tbody = document.querySelector('#lots-table tbody');
        if (!tbody) return;

        if (!lots || lots.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="padding:0;">'
                + '<div class="empty-state">'
                + '<div class="empty-state-icon"><svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>'
                + '<h3 class="empty-state-title" data-i18n="admin.noLots">No Lots Found</h3>'
                + '<p class="empty-state-text" data-i18n="admin.noLotsDesc">Add lots to display them here.</p>'
                + '</div></td></tr>';
            return;
        }

        // Group lots by their computed state
        var gallery  = lots.filter(function(l){ return _adminLotState(l) === 'gallery';  });
        var active   = lots.filter(function(l){ return _adminLotState(l) === 'active';   });
        var upcoming = lots.filter(function(l){ return _adminLotState(l) === 'upcoming'; });
        var ended    = lots.filter(function(l){ return _adminLotState(l) === 'ended';    });

        var html = '';
        if (active.length)   html += _lotsGroupHeader('[Active]  \u0645\u0632\u0627\u062f \u0646\u0634\u0637 - Active Auction', '#2e7d32', active.length)   + active.map(_buildLotRow).join('');
        if (upcoming.length) html += _lotsGroupHeader('[Soon]    \u0642\u0627\u062f\u0645 - Upcoming Auction',                   '#1565c0', upcoming.length) + upcoming.map(_buildLotRow).join('');
        if (gallery.length)  html += _lotsGroupHeader('[Gallery] \u0645\u0639\u0631\u0636 - Gallery',                           '#6d4c41', gallery.length)  + gallery.map(_buildLotRow).join('');
        if (ended.length)    html += _lotsGroupHeader('[Ended]   \u0627\u0646\u062a\u0647\u0649 - Ended',                       '#37474f', ended.length)   + ended.map(_buildLotRow).join('');

        tbody.innerHTML = html;
        if (window.i18n) window.i18n.translatePage();
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

    const auctionData = {
        title: formData.get('titleEn') || formData.get('titleAr'),
        title_en: formData.get('titleEn'),
        title_ar: formData.get('titleAr'),
        description: formData.get('descriptionEn') || formData.get('descriptionAr'),
        description_en: formData.get('descriptionEn'),
        description_ar: formData.get('descriptionAr'),
        category: formData.get('categoryEn') || formData.get('categoryAr'),
        category_en: formData.get('categoryEn'),
        category_ar: formData.get('categoryAr'),
        location: formData.get('locationEn') || formData.get('locationAr'),
        location_en: formData.get('locationEn'),
        location_ar: formData.get('locationAr'),
        featured: formData.get('featured') === 'true'
        // Note: start_date/end_date now live on individual products (lots), not categories
    };

    const imageFile = formData.get('auctionImage');

    try {
        let auctionId = editingId;

        if (editingId) {
            // Update existing auction
            await adminAPI.categories.update(editingId, auctionData);
            showSuccess(t('notifications.auctionUpdated'));
        } else {
            // Create new auction
            const result = await adminAPI.categories.create(auctionData);
            auctionId = result.category.id;
            showSuccess(t('notifications.auctionCreated'));
        }

        // Upload image if provided
        if (imageFile && imageFile.size > 0 && auctionId) {
            try {
                await adminAPI.categories.uploadImage(auctionId, imageFile);
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
        // Reset placement to gallery mode
        if (typeof _setPlacementMode === 'function') _setPlacementMode('gallery');
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
    // Switch to auctions view so the form is visible and accessible
    if (typeof switchView === 'function') switchView('auctions');

    adminAPI.categories.getAll().then(({ categories }) => {
        // Use string coercion to handle both numeric and string IDs from the API
        const auction = categories.find((c) => String(c.id) === String(auctionId));
        if (!auction) {
            showError(t('notifications.auctionNotFound'));
            return;
        }

        const form = document.getElementById('auction-form');
        if (!form) return;

        // Safe field setter — silently skips missing fields
        const setVal = (name, value) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (el) el.value = value ?? '';
        };

        // Pre-fill form
        setVal('titleEn', auction.title_en || auction.title || '');
        setVal('titleAr', auction.title_ar || '');
        setVal('categoryEn', auction.category_en || auction.category || '');
        setVal('categoryAr', auction.category_ar || '');
        setVal('descriptionEn', auction.description_en || auction.description || '');
        setVal('descriptionAr', auction.description_ar || '');
        setVal('locationEn', auction.location_en || auction.location || '');
        setVal('locationAr', auction.location_ar || '');

        // Auction dates are now optional (timing lives on products/lots)
        if (auction.start_date) {
            const formatForInput = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };
            setVal('startDate', formatForInput(new Date(auction.start_date)));
            if (auction.end_date) setVal('endDate', formatForInput(new Date(auction.end_date)));
        }
        const featuredCheckbox = form.querySelector('[name="featured"]');
        if (featuredCheckbox) {
            featuredCheckbox.checked = !!auction.featured;
        }
        // Note: Can't pre-fill file input for security reasons

        // Set editing mode
        form.dataset.editingId = auctionId;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = t('admin.updateAuction');

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(error => {
        console.error('Failed to load auction for editing:', error);
        // Leave the form in create mode. If it kept a stale editingId, the next
        // submit would silently PATCH this auction instead of creating a new one.
        const form = document.getElementById('auction-form');
        if (form) {
            form.dataset.editingId = '';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = t('admin.createAuction');
        }
        showError(t('notifications.failedLoadAuctionDetails'));
    });
}

async function handleLotForm(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const editingId = form.dataset.editingId;

    // Extract and convert lot-level dates (optional)
    const startDateLocal = formData.get('startDate');
    const endDateLocal = formData.get('endDate');

    // Task 2: both-dates-or-neither validation
    const hasStart = !!(startDateLocal && startDateLocal.trim());
    const hasEnd   = !!(endDateLocal   && endDateLocal.trim());
    const warningEl = document.getElementById('lot-date-warning');
    if (warningEl) warningEl.style.display = (hasStart !== hasEnd) ? 'block' : 'none';
    if (hasStart !== hasEnd) {
        showError('يجب تحديد تاريخ البداية والنهاية معاً، أو تركهما فارغين. Both dates must be set together.');
        return;
    }

    const lotData = {
        category_id: formData.get('categoryId') || formData.get('auctionId'),
        lot_number: parseInt(formData.get('lotNumber')),
        title: formData.get('titleEn') || formData.get('titleAr'),
        title_en: formData.get('titleEn'),
        title_ar: formData.get('titleAr'),
        category: formData.get('categoryEn') || formData.get('categoryAr'),
        category_en: formData.get('categoryEn'),
        category_ar: formData.get('categoryAr'),
        description: formData.get('descriptionEn') || formData.get('descriptionAr'),
        description_en: formData.get('descriptionEn'),
        description_ar: formData.get('descriptionAr'),
        condition: formData.get('conditionEn') || formData.get('conditionAr'),
        condition_en: formData.get('conditionEn'),
        condition_ar: formData.get('conditionAr'),
        provenance: formData.get('provenanceEn') || formData.get('provenanceAr') || null,
        provenance_en: formData.get('provenanceEn') || null,
        provenance_ar: formData.get('provenanceAr') || null,
        // Financials — all optional, null when blank
        estimate_low:   formData.get('estimateMin') !== '' ? parseFloat(formData.get('estimateMin')) : null,
        estimate_high:  formData.get('estimateMax') !== '' ? parseFloat(formData.get('estimateMax')) : null,
        starting_bid:   formData.get('startingBid') !== '' ? parseFloat(formData.get('startingBid')) : null,
        reserve_price:  formData.get('reserve')     !== '' ? parseFloat(formData.get('reserve'))     : null,
        bid_increment: 100,
        // Dates — optional
        start_date: startDateLocal ? new Date(startDateLocal).toISOString() : null,
        end_date:   endDateLocal   ? new Date(endDateLocal).toISOString()   : null,
        // Featured flag
        is_featured: formData.get('isFeatured') === '1',
        show_in_gallery: formData.get('show_in_gallery') === 'true'
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
    // Switch to lots view so the form is visible and accessible
    if (typeof switchView === 'function') switchView('lots');

    adminAPI.lots.getAll().then(({ lots }) => {
        // Use string coercion to handle both numeric and string IDs from the API
        const lot = lots.find(l => String(l.id) === String(lotId));
        if (!lot) {
            showError(t('notifications.lotNotFound'));
            return;
        }

        const form = document.getElementById('lot-form');
        if (!form) return;

        // Safe field setter — silently skips missing fields
        const setVal = (name, value) => {
            const el = form.querySelector(`[name="${name}"]`);
            if (el) el.value = value ?? '';
        };

        // Pre-fill form
        setVal('categoryId', lot.category_id || lot.auction_id);
        setVal('lotNumber', lot.lot_number);
        setVal('titleEn', lot.title_en || lot.title || '');
        setVal('titleAr', lot.title_ar || '');
        setVal('categoryEn', lot.category_en || lot.category || '');
        setVal('categoryAr', lot.category_ar || '');
        setVal('descriptionEn', lot.description_en || lot.description || '');
        setVal('descriptionAr', lot.description_ar || '');
        setVal('conditionEn', lot.condition_en || lot.condition || '');
        setVal('conditionAr', lot.condition_ar || '');
        setVal('provenanceEn', lot.provenance_en || lot.provenance || '');
        setVal('provenanceAr', lot.provenance_ar || '');
        setVal('estimateMin', lot.estimate_low ?? '');
        setVal('estimateMax', lot.estimate_high ?? '');
        setVal('startingBid', lot.starting_bid ?? '');
        setVal('reserve', lot.reserve_price ?? '');

        // Pre-fill featured checkbox
        const featuredCb = form.querySelector('[name="isFeatured"]');
        if (featuredCb) featuredCb.checked = !!lot.is_featured;

        // Pre-fill lot-level auction dates if they exist
        if (lot.start_date || lot.end_date) {
            const formatForInput = (date) => {
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };
            if (lot.start_date) setVal('startDate', formatForInput(lot.start_date));
            if (lot.end_date) setVal('endDate', formatForInput(lot.end_date));
        }

        // Set editing mode
        form.dataset.editingId = lotId;
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.textContent = t('admin.updateLot');

        // Restore placement mode (gallery / auction / both) for this lot
        if (typeof window._adminRestorePlacementMode === 'function') {
            window._adminRestorePlacementMode(lot);
        }

        // Scroll to form
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }).catch(error => {
        console.error('Failed to load lot for editing:', error);
        // Same guard as editAuction — never leave a stale editingId behind.
        const form = document.getElementById('lot-form');
        if (form) {
            form.dataset.editingId = '';
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.textContent = t('admin.createLot');
        }
        showError(t('notifications.failedLoadLotDetails'));
    });
}

// ==================== FEATURED TOGGLE ====================

async function toggleLotFeatured(lotId, currentValue) {
    const newValue = !currentValue;
    try {
        await adminAPI.lots.update(lotId, { is_featured: newValue });
        showSuccess(newValue ? '★ Added to featured homepage' : 'Removed from featured homepage');
        await loadLots();
    } catch (err) {
        console.error('Failed to toggle featured:', err);
        showError('Failed to update featured status');
    }
}
window.toggleLotFeatured = toggleLotFeatured;

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


