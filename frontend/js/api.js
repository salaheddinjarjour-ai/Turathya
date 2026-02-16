// API Configuration — auto-detect backend URL based on environment
const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : 'https://turathya-backend.onrender.com/api';

// Get token from localStorage
function getToken() {
    return localStorage.getItem('turathya_token');
}

// Get current user from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem('turathya_user');
    return userStr ? JSON.parse(userStr) : null;
}

// Set user and token
function setAuth(token, user) {
    localStorage.setItem('turathya_token', token);
    localStorage.setItem('turathya_user', JSON.stringify(user));

    // Update header to reflect logged-in state
    if (typeof updateHeaderAuthState === 'function') {
        updateHeaderAuthState();
    }
}

// Clear auth
function clearAuth() {
    localStorage.removeItem('turathya_token');
    localStorage.removeItem('turathya_user');

    // Update header to reflect logged-out state
    if (typeof updateHeaderAuthState === 'function') {
        updateHeaderAuthState();
    }
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || 'Request failed');
        error.response = data;
        throw error;
    }

    return data;
}

// Auth API
const authAPI = {
    async register(email, password, confirm_password, full_name, phone) {
        return apiRequest('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, confirm_password, full_name, phone })
        });
    },

    async requestRegistrationOtp(email, password, confirm_password, full_name, phone) {
        return apiRequest('/auth/register/request-otp', {
            method: 'POST',
            body: JSON.stringify({ email, password, confirm_password, full_name, phone })
        });
    },

    async verifyRegistrationOtp(email, otp) {
        const data = await apiRequest('/auth/register/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ email, otp })
        });

        if (data.token && data.user) {
            setAuth(data.token, data.user);
        }

        return data;
    },

    async login(email, password) {
        const data = await apiRequest('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (data.token && data.user) {
            setAuth(data.token, data.user);
        }

        return data;
    },

    async googleOAuth(idToken) {
        const data = await apiRequest('/auth/oauth/google', {
            method: 'POST',
            body: JSON.stringify({ id_token: idToken })
        });

        if (data.token && data.user) {
            setAuth(data.token, data.user);
        }

        return data;
    },

    async getMe() {
        return apiRequest('/auth/me');
    },

    logout() {
        clearAuth();
        window.location.href = '../index.html';
    }
};

async function syncAuthUserStatus() {
    const token = getToken();
    if (!token) return;

    try {
        const data = await authAPI.getMe();
        if (!data?.user) return;

        const refreshedUser = {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.full_name || data.user.fullName || data.user.email,
            role: data.user.role,
            status: data.user.status
        };

        setAuth(token, refreshedUser);
    } catch (error) {
        if (error?.message && /token|401|expired|invalid/i.test(error.message)) {
            clearAuth();
        }
    }
}

if (getToken()) {
    void syncAuthUserStatus();
}

// Auctions API
const auctionsAPI = {
    async getAll(filters = {}) {
        const params = new URLSearchParams(filters);
        return apiRequest(`/auctions?${params}`);
    },

    async getById(id) {
        return apiRequest(`/auctions/${id}`);
    },

    async getLots(auctionId) {
        return apiRequest(`/auctions/${auctionId}/lots`);
    }
};

// Lots API
const lotsAPI = {
    async getAll(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/lots${queryString ? '?' + queryString : ''}`);
    },

    async getById(id) {
        return apiRequest(`/lots/${id}`);
    },

    async getBids(lotId, limit = 10) {
        return apiRequest(`/lots/${lotId}/bids?limit=${limit}`);
    }
};

// Bids API
const bidsAPI = {
    async place(lot_id, amount) {
        return apiRequest('/bids', {
            method: 'POST',
            body: JSON.stringify({ lot_id, amount })
        });
    },

    async getMyBids() {
        return apiRequest('/bids/my-bids');
    }
};

// Watchlist API
const watchlistAPI = {
    async getAll() {
        return apiRequest('/watchlist');
    },

    async add(lot_id) {
        return apiRequest('/watchlist', {
            method: 'POST',
            body: JSON.stringify({ lot_id })
        });
    },

    async remove(lotId) {
        return apiRequest(`/watchlist/${lotId}`, {
            method: 'DELETE'
        });
    }
};

// Admin API
const adminAPI = {
    async getStats() {
        return apiRequest('/admin/stats');
    },

    users: {
        async getAll(filters = {}) {
            const params = new URLSearchParams(filters);
            return apiRequest(`/admin/users?${params}`);
        },

        async approve(userId) {
            return apiRequest(`/admin/users/${userId}/approve`, {
                method: 'PATCH'
            });
        },

        async reject(userId) {
            return apiRequest(`/admin/users/${userId}/reject`, {
                method: 'PATCH'
            });
        },

        async suspend(userId) {
            return apiRequest(`/admin/users/${userId}/suspend`, {
                method: 'PATCH'
            });
        },

        async delete(userId) {
            return apiRequest(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
        }
    },

    auctions: {
        async getAll() {
            return apiRequest('/admin/auctions');
        },

        async create(auctionData) {
            return apiRequest('/admin/auctions', {
                method: 'POST',
                body: JSON.stringify(auctionData)
            });
        },

        async uploadImage(auctionId, imageFile) {
            const formData = new FormData();
            formData.append('image', imageFile);

            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/admin/auctions/${auctionId}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }
            return data;
        },

        async update(auctionId, updates) {
            return apiRequest(`/admin/auctions/${auctionId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
        },

        async delete(auctionId) {
            return apiRequest(`/admin/auctions/${auctionId}`, {
                method: 'DELETE'
            });
        }
    },

    lots: {
        async getAll(auctionId = null) {
            const params = auctionId ? `?auction_id=${auctionId}` : '';
            return apiRequest(`/admin/lots${params}`);
        },

        async create(lotData) {
            return apiRequest('/admin/lots', {
                method: 'POST',
                body: JSON.stringify(lotData)
            });
        },

        async update(lotId, updates) {
            return apiRequest(`/admin/lots/${lotId}`, {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });
        },

        async uploadMedia(lotId, formData) {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/admin/lots/${lotId}/media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }
            return data;
        },

        async uploadImage(lotId, formData) {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/admin/lots/${lotId}/image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Image upload failed');
            }
            return data;
        },

        async deleteMedia(mediaId) {
            return apiRequest(`/admin/lots/media/${mediaId}`, {
                method: 'DELETE'
            });
        },

        async delete(lotId) {
            return apiRequest(`/admin/lots/${lotId}`, {
                method: 'DELETE'
            });
        },

        async getBidders(lotId) {
            return apiRequest(`/admin/lots/${lotId}/bidders`);
        },

        async removeTopBidder(lotId) {
            return apiRequest(`/admin/lots/${lotId}/top-bid`, {
                method: 'DELETE'
            });
        }
    }
};

// Check if user is logged in
function isLoggedIn() {
    return !!getToken();
}

// Check if user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Check if user is approved
function isApproved() {
    const user = getCurrentUser();
    return user && user.status === 'approved';
}

// Redirect if not logged in
function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Redirect if not admin
function requireAdmin() {
    if (!requireLogin()) return false;

    if (!isAdmin()) {
        const message = (typeof i18n !== 'undefined' && i18n?.t)
            ? i18n.t('admin.accessDenied')
            : 'Admin access required';
        alert(message);
        window.location.href = '/index.html';
        return false;
    }
    return true;
}

// Show error message
function showError(message) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, 'error', 2200);
        return;
    }
    alert(message);
}

// Show success message
function showSuccess(message) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, 'success', 2000);
        return;
    }
    alert(message);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format datetime
function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

const SOCKET_IO_CDN_URL = 'https://cdn.socket.io/4.7.5/socket.io.min.js';

function getSocketServerUrl() {
    try {
        const apiUrl = new URL(API_BASE_URL);
        return `${apiUrl.protocol}//${apiUrl.host}`;
    } catch {
        return (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:3000'
            : 'https://turathya-backend.onrender.com';
    }
}

function ensureSocketIoClient() {
    if (typeof window.io === 'function') {
        return Promise.resolve(true);
    }

    const existingScript = document.querySelector('script[data-socket-io-client="true"]');
    if (existingScript) {
        return new Promise((resolve) => {
            existingScript.addEventListener('load', () => resolve(typeof window.io === 'function'), { once: true });
            existingScript.addEventListener('error', () => resolve(false), { once: true });
        });
    }

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = SOCKET_IO_CDN_URL;
        script.async = true;
        script.dataset.socketIoClient = 'true';
        script.addEventListener('load', () => resolve(typeof window.io === 'function'), { once: true });
        script.addEventListener('error', () => resolve(false), { once: true });
        document.head.appendChild(script);
    });
}

// Floating widget for ongoing bids (non-admin users)
const bidStatusWidget = {
    refreshTimer: null,

    tr(key) {
        if (!(typeof i18n !== 'undefined' && i18n?.t)) {
            return '';
        }

        const translated = i18n.t(key);
        return translated === key ? '' : translated;
    },

    getCurrentLocale() {
        const lang = (typeof i18n !== 'undefined' && i18n?.currentLang)
            ? i18n.currentLang
            : (localStorage.getItem('lang') || 'en');
        return lang === 'ar' ? 'ar-EG' : 'en-US';
    },

    getLotHref(lotId) {
        const inPagesDir = window.location.pathname.includes('/pages/');
        return `${inPagesDir ? '' : 'pages/'}lot.html?id=${lotId}`;
    },

    shouldShow() {
        const user = getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin') return false;

        const path = window.location.pathname.toLowerCase();
        return !path.includes('/login.html') && !path.includes('/register.html');
    },

    ensureElement() {
        let widget = document.getElementById('bid-status-widget');
        if (widget) {
            this.updateStaticText();
            return widget;
        }

        widget = document.createElement('aside');
        widget.id = 'bid-status-widget';
        widget.className = 'bid-status-widget';
        widget.innerHTML = `
            <div class="bid-status-widget-header">
                <span class="bid-status-widget-title">${this.tr('common.myOngoingBids') || 'My Ongoing Bids'}</span>
                <button type="button" class="bid-status-widget-toggle" id="bid-status-widget-toggle" aria-label="${this.tr('common.toggleBidsWidget') || 'Toggle bids widget'}">−</button>
            </div>
            <div class="bid-status-widget-body" id="bid-status-widget-body">
                <div class="bid-status-widget-empty">${this.tr('common.loadingBidStatus') || 'Loading bid status...'}</div>
            </div>
        `;

        document.body.appendChild(widget);

        const toggleBtn = document.getElementById('bid-status-widget-toggle');
        toggleBtn?.addEventListener('click', () => {
            widget.classList.toggle('collapsed');
            toggleBtn.textContent = widget.classList.contains('collapsed') ? '+' : '−';
        });

        return widget;
    },

    updateStaticText() {
        const title = document.querySelector('#bid-status-widget .bid-status-widget-title');
        const toggleBtn = document.getElementById('bid-status-widget-toggle');
        const empty = document.querySelector('#bid-status-widget-body .bid-status-widget-empty');

        if (title) title.textContent = this.tr('common.myOngoingBids') || 'My Ongoing Bids';
        if (toggleBtn) toggleBtn.setAttribute('aria-label', this.tr('common.toggleBidsWidget') || 'Toggle bids widget');
        if (empty) {
            const hasContent = document.querySelector('#bid-status-widget-body .bid-status-widget-item');
            if (!hasContent) {
                empty.textContent = this.tr('common.loadingBidStatus') || 'Loading bid status...';
            }
        }
    },

    getOngoingBidSummaries(bids) {
        const now = Date.now();
        const byLot = new Map();
        const currentUser = getCurrentUser();

        bids.forEach((bid) => {
            const endTime = new Date(bid.auction_end_date).getTime();
            if (!endTime || endTime <= now) return;

            const existing = byLot.get(bid.lot_id);
            if (!existing || Number(bid.amount) > Number(existing.amount) || new Date(bid.created_at) > new Date(existing.created_at)) {
                byLot.set(bid.lot_id, bid);
            }
        });

        return Array.from(byLot.values())
            .sort((a, b) => new Date(a.auction_end_date) - new Date(b.auction_end_date))
            .slice(0, 4)
            .map((bid) => {
                const current = Number(bid.current_bid || bid.starting_bid || 0);
                const mine = Number(bid.amount || 0);
                const isWinning = bid.highest_bidder_id && currentUser
                    ? String(bid.highest_bidder_id) === String(currentUser.id)
                    : mine >= current;
                return {
                    lotId: bid.lot_id,
                    lotTitle: bid.lot_title || this.tr('account.unknownLot'),
                    lotNumber: bid.lot_number,
                    auctionTitle: bid.auction_title || this.tr('nav.auctions'),
                    auctionEndDate: bid.auction_end_date,
                    myBid: mine,
                    currentBid: current,
                    status: isWinning
                        ? this.tr('account.winning')
                        : this.tr('account.outbid')
                };
            });
    },

    render(items) {
        const body = document.getElementById('bid-status-widget-body');
        if (!body) return;
        const tr = (key) => this.tr(key);

        if (!items || items.length === 0) {
            body.innerHTML = `<div class="bid-status-widget-empty">${tr('common.noOngoingBids') || 'No ongoing bids'}</div>`;
            return;
        }

        body.innerHTML = items.map((item) => {
            const badgeClass = item.status === tr('account.winning') ? 'badge-success' : 'badge-unsold';
            const endDate = new Date(item.auctionEndDate).toLocaleString(this.getCurrentLocale(), {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <a class="bid-status-widget-item" href="${this.getLotHref(item.lotId)}">
                    <div class="bid-status-widget-top">
                        <div>
                            <div class="bid-status-widget-lot">Lot #${item.lotNumber}: ${item.lotTitle}</div>
                            <div class="bid-status-widget-auction">${item.auctionTitle}</div>
                        </div>
                        <span class="badge ${badgeClass}">${item.status}</span>
                    </div>
                    <div class="bid-status-widget-meta">
                        <div>${tr('common.yourBid') || 'Your bid'}: ${formatCurrency(item.myBid)}</div>
                        <div>${tr('common.current') || 'Current'}: ${formatCurrency(item.currentBid)}</div>
                        <div>${tr('common.ends') || 'Ends'}: ${endDate}</div>
                    </div>
                </a>
            `;
        }).join('');
    },

    async refresh() {
        if (!this.shouldShow()) return;

        const widget = this.ensureElement();
        try {
            const { bids } = await bidsAPI.getMyBids();
            const items = this.getOngoingBidSummaries(bids || []);
            if (items.length === 0) {
                widget.style.display = 'none';
                return;
            }
            widget.style.display = '';
            this.render(items);
        } catch (error) {
            // Hide widget for users without bidding permission or when endpoint is unavailable
            widget.style.display = 'none';
        }
    },

    init() {
        if (!this.shouldShow()) return;
        this.refresh();

        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }
        this.refreshTimer = setInterval(() => this.refresh(), 30000);
    }
};

const liveBidSocket = {
    socket: null,
    subscribedLotIds: new Set(),
    syncTimer: null,
    refreshRaf: null,

    shouldEnable() {
        const user = getCurrentUser();
        return !!user && user.role !== 'admin' && !!getToken();
    },

    async syncLotSubscriptions() {
        if (!this.socket || !this.socket.connected) return;

        try {
            const { bids } = await bidsAPI.getMyBids();
            const now = Date.now();
            const activeLotIds = new Set(
                (bids || [])
                    .filter((bid) => new Date(bid.auction_end_date).getTime() > now)
                    .map((bid) => String(bid.lot_id))
            );

            activeLotIds.forEach((lotId) => {
                if (!this.subscribedLotIds.has(lotId)) {
                    this.socket.emit('join-lot', lotId);
                    this.subscribedLotIds.add(lotId);
                }
            });

            Array.from(this.subscribedLotIds).forEach((lotId) => {
                if (!activeLotIds.has(lotId)) {
                    this.socket.emit('leave-lot', lotId);
                    this.subscribedLotIds.delete(lotId);
                }
            });
        } catch (error) {
            console.debug('Socket subscription sync skipped:', error?.message || error);
        }
    },

    triggerLiveRefresh() {
        if (this.refreshRaf) return;

        this.refreshRaf = requestAnimationFrame(async () => {
            this.refreshRaf = null;

            try {
                if (typeof loadBids === 'function') {
                    await loadBids();
                }
            } catch (error) {
                console.debug('Socket loadBids refresh skipped:', error?.message || error);
            }

            try {
                if (typeof bidStatusWidget?.refresh === 'function') {
                    await bidStatusWidget.refresh();
                }
            } catch (error) {
                console.debug('Socket bid widget refresh skipped:', error?.message || error);
            }
        });
    },

    async init() {
        if (!this.shouldEnable()) return;

        const loaded = await ensureSocketIoClient();
        if (!loaded || typeof window.io !== 'function') {
            return;
        }

        if (this.socket) return;

        this.socket = window.io(getSocketServerUrl(), {
            transports: ['websocket', 'polling']
        });

        this.socket.on('connect', () => {
            this.syncLotSubscriptions();
        });

        this.socket.on('lot-updated', () => {
            this.triggerLiveRefresh();
        });

        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }
        this.syncTimer = setInterval(() => this.syncLotSubscriptions(), 15000);
    }
};

function initializeLiveUiFeatures() {
    bidStatusWidget.init();
    liveBidSocket.init();
}

window.addEventListener('DOMContentLoaded', () => {
    if (typeof i18n !== 'undefined' && i18n?.isInitialized) {
        initializeLiveUiFeatures();
        return;
    }

    const initializeOnce = () => {
        initializeLiveUiFeatures();
        window.removeEventListener('i18nReady', initializeOnce);
    };

    window.addEventListener('i18nReady', initializeOnce);
});

window.addEventListener('languageChanged', () => {
    if (!bidStatusWidget.shouldShow()) return;
    bidStatusWidget.updateStaticText();
    bidStatusWidget.refresh();
});

// Lightweight live refresh for dynamic pages
const livePageRefresh = {
    timer: null,

    getHandler() {
        const path = window.location.pathname.toLowerCase();

        if (path.endsWith('/index.html') || path === '/' || path.endsWith('/frontend/')) {
            return async () => {
                if (typeof loadFeaturedAuctions === 'function') await loadFeaturedAuctions();
                if (typeof loadEndingSoon === 'function') await loadEndingSoon();
            };
        }

        if (path.endsWith('/pages/auctions.html')) {
            return async () => {
                if (typeof loadFeaturedAuctions === 'function') await loadFeaturedAuctions();
                if (typeof loadOngoingAuctions === 'function') await loadOngoingAuctions();
                if (typeof loadPastAuctions === 'function') await loadPastAuctions();
            };
        }

        if (path.endsWith('/pages/auction.html')) {
            return async () => {
                if (typeof loadLots === 'function') await loadLots();
            };
        }

        if (path.endsWith('/pages/lot.html')) {
            return async () => {
                if (typeof loadLot === 'function') await loadLot();
            };
        }

        if (path.endsWith('/pages/account.html')) {
            return async () => {
                if (typeof loadBids === 'function') await loadBids();
                if (typeof loadWatchlist === 'function') await loadWatchlist();
            };
        }

        if (path.endsWith('/pages/collection.html')) {
            return async () => {
                if (typeof initCollection === 'function') await initCollection();
            };
        }

        return null;
    },

    getIntervalMs() {
        const path = window.location.pathname.toLowerCase();
        if (path.endsWith('/pages/lot.html')) return 10000;
        if (path.endsWith('/pages/auction.html')) return 15000;
        if (path.endsWith('/pages/account.html')) return 5000;
        return 30000;
    },

    async refresh(handler) {
        if (document.hidden) return;
        try {
            await handler();
        } catch (error) {
            console.debug('Live refresh skipped:', error?.message || error);
        }
    },

    init() {
        const handler = this.getHandler();
        if (!handler) return;

        const intervalMs = this.getIntervalMs();
        this.timer = setInterval(() => this.refresh(handler), intervalMs);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    livePageRefresh.init();
});
