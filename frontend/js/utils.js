// ============================================
// TURATHYA - UTILITY FUNCTIONS
// Date formatting, currency, URL helpers
// ============================================

// ==================== DATE & TIME ====================

function parseDateSafe(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const raw = String(value).trim();
    if (!raw) return null;

    const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
    const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw;

    if (!hasTimezone) {
        const dateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/);
        if (dateTimeMatch) {
            const [, y, m, d, hh, mm, ss = '0', ms = '0'] = dateTimeMatch;
            const date = new Date(
                Number(y),
                Number(m) - 1,
                Number(d),
                Number(hh),
                Number(mm),
                Number(ss),
                Number(ms.padEnd(3, '0'))
            );
            return Number.isNaN(date.getTime()) ? null : date;
        }

        const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const [, y, m, d] = dateOnlyMatch;
            const date = new Date(Number(y), Number(m) - 1, Number(d));
            return Number.isNaN(date.getTime()) ? null : date;
        }
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(dateString) {
    const date = parseDateSafe(dateString);
    if (!date) return '—';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateTime(dateString) {
    const date = parseDateSafe(dateString);
    if (!date) return '—';
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
}

function formatTimeRemaining(endDate) {
    const now = new Date();
    const end = parseDateSafe(endDate);
    if (!end) return '—';
    const diff = end - now;

    if (diff <= 0) {
        return 'Ended';
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

function isEndingSoon(endDate, hoursThreshold = 24) {
    const now = new Date();
    const end = parseDateSafe(endDate);
    if (!end) return false;
    const diff = end - now;
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= hoursThreshold;
}

function hasEnded(endDate) {
    const now = new Date();
    const end = parseDateSafe(endDate);
    if (!end) return false;
    return now >= end;
}

// ==================== PRODUCT TYPE DETECTION ====================

/**
 * Returns true if a lot is an AUCTION item (has bidding data).
 *
 * PRIMARY check: lot_has_auction — a boolean computed server-side in SQL,
 * true only when the lot's OWN starting_bid > 0 AND start_date AND end_date
 * are all set on the lot row itself (not inherited from the parent auction).
 *
 * FALLBACK (when lot_has_auction not in response): checks lot.starting_bid
 * with safe null/empty/zero guards. Intentionally does NOT check start_date
 * or end_date here because those fields may be overwritten by the parent
 * auction's dates in older API responses.
 *
 * Collection-only items always have starting_bid = 0 / null.
 */
function hasAuction(lot) {
    // Primary: lot has both start and end dates set
    if (lot.start_date && lot.end_date) return true;
    // Secondary: server-computed flag (legacy API responses)
    if (lot.lot_has_auction !== undefined && lot.lot_has_auction !== null) {
        return lot.lot_has_auction === true || lot.lot_has_auction === 't' || lot.lot_has_auction === 'true' || lot.lot_has_auction === 1;
    }
    return false;
}

/**
 * Returns the current state of a lot:
 *   'gallery'          — no auction dates set
 *   'upcoming'         — auction not yet started
 *   'active'           — auction is live
 *   'ended'            — auction window has passed
 */
function getLotState(lot) {
    const now = new Date();
    const start = lot.start_date ? parseDateSafe(lot.start_date) : null;
    const end   = lot.end_date   ? parseDateSafe(lot.end_date)   : null;
    if (!start && !end) return 'gallery';
    if (end && end < now)  return 'ended';
    if (start && start > now) return 'upcoming';
    return 'active';
}

// ==================== CURRENCY ====================

function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatEstimate(min, max, currency = 'USD') {
    return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
}

// ==================== BILINGUAL HELPER ====================

/**
 * Returns the localized value for a bilingual field.
 * Usage: localizedField(lot, 'title') → lot.title_ar or lot.title_en based on current lang
 *
 * Priority (Arabic mode):  title_ar → title_en → title
 * Priority (English mode): title_en → title     → title_ar
 * This prevents English mode from ever showing Arabic as a fallback.
 */
function localizedField(obj, field) {
    const lang = localStorage.getItem('lang') || 'ar';
    if (lang === 'ar') {
        return obj[field + '_ar'] || obj[field + '_en'] || obj[field] || '';
    }
    // English (or any non-Arabic lang)
    return obj[field + '_en'] || obj[field] || obj[field + '_ar'] || '';
}

// ==================== TIERED BID INCREMENT ====================

/**
 * Returns the bid increment based on tiered rules:
 * 0–100 → +10, 100–500 → +20, 500–1000 → +50, 1000–10000 → +100, Above 10000 → +500
 */
function getBidIncrement(currentBid) {
    const bid = parseFloat(currentBid) || 0;
    if (bid < 100) return 10;
    if (bid < 500) return 20;
    if (bid < 1000) return 50;
    if (bid < 10000) return 100;
    return 500;
}

// ==================== AUCTION LINK HELPER ====================

/**
 * Returns the correct href for an auction card.
 * If auction has exactly 1 lot, link directly to that lot page.
 */
function getAuctionHref(auction, basePath = '') {
    if (parseInt(auction.lot_count) === 1 && auction.single_lot_id) {
        return `${basePath}lot.html?id=${auction.single_lot_id}`;
    }
    return `${basePath}/auction?id=${auction.id}`;
}

// ==================== URL HELPERS ====================


// ══════════════════════════════════════════════════════════════════
//  Slug URL helpers — SEO-friendly product URLs
//  Format: /lot/<title-slug>-<uuid>
//  Example: /lot/antique-gold-watch-lot-203-f7fe478f-ef66-...
// ══════════════════════════════════════════════════════════════════

/**
 * Transliterate Arabic characters to Latin for URL slugs.
 * Falls back to English title if available.
 */
function makeLotSlug(lot) {
    // Prefer English title for slug (cleanest for SEO)
    const title = (lot.title_en || lot.title || lot.title_ar || '').trim();
    const lotNum = lot.lot_number ? `lot-${lot.lot_number}` : '';

    const arabicMap = {
        'أ':'a','إ':'a','آ':'a','ا':'a','ب':'b','ت':'t','ث':'th','ج':'j',
        'ح':'h','خ':'kh','د':'d','ذ':'dh','ر':'r','ز':'z','س':'s','ش':'sh',
        'ص':'s','ض':'d','ط':'t','ظ':'z','ع':'a','غ':'gh','ف':'f','ق':'q',
        'ك':'k','ل':'l','م':'m','ن':'n','ه':'h','و':'w','ؤ':'w','ي':'y',
        'ئ':'y','ى':'a','ة':'h','ء':'','لا':'la','ال':'al'
    };

    let slug = title.toLowerCase();
    // Replace Arabic letters
    Object.entries(arabicMap).forEach(([ar, lat]) => {
        slug = slug.split(ar).join(lat);
    });

    slug = slug
        .replace(/[^a-z0-9\s-]/g, '')   // remove non-latin chars
        .replace(/\s+/g, '-')             // spaces → dashes
        .replace(/-+/g, '-')               // collapse multiple dashes
        .replace(/^-|-$/g, '')             // trim leading/trailing dashes
        .slice(0, 60);                     // max 60 chars for title part

    const parts = [slug, lotNum, lot.id].filter(Boolean);
    return parts.join('-');
}

/**
 * Build a canonical SEO-friendly URL for a lot.
 * Returns absolute URL like /lot/antique-gold-watch-lot-203-<uuid>
 */
function getLotUrl(lot, opts) {
    opts = opts || {};
    const slug = makeLotSlug(lot);
    const base  = '/lot/' + slug;
    const params = new URLSearchParams();
    if (opts.view)    params.set('view', opts.view);
    if (opts.archive) params.set('archive', '1');
    const qs = params.toString();
    return qs ? base + '?' + qs : base;
}

/**
 * Extract lot UUID from either:
 *   /lot/<slug>-<uuid>            (new SEO URL)
 *   ?id=<uuid>                    (legacy URL)
 */
function getLotIdFromUrl() {
    // Try slug URL first
    const pathMatch = window.location.pathname.match(
        /\/lot\/.+-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
    );
    if (pathMatch) return pathMatch[1];
    // Fallback to ?id= query param (backward compat)
    return new URLSearchParams(window.location.search).get('id');
}

function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function setUrlParameter(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
}

function removeUrlParameter(name) {
    const url = new URL(window.location);
    url.searchParams.delete(name);
    window.history.pushState({}, '', url);
}

// ==================== DOM HELPERS ====================

function createElement(tag, className = '', content = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.textContent = content;
    return element;
}

function show(element) {
    if (element) element.style.display = '';
}

function hide(element) {
    if (element) element.style.display = 'none';
}

function toggle(element) {
    if (element) {
        element.style.display = element.style.display === 'none' ? '' : 'none';
    }
}

// ==================== VALIDATION ====================

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePhone(phone) {
    // Basic phone validation: must start with + and contain 10-15 digits
    const re = /^\+[1-9]\d{9,14}$/;
    return re.test(phone);
}

function validateRequired(value) {
    return value && value.trim().length > 0;
}

function validateNumber(value, min = null, max = null) {
    const num = parseFloat(value);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
}

// ==================== ARRAY HELPERS ====================

function sortBy(array, key, ascending = true) {
    return array.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
        return 0;
    });
}

function filterBy(array, filters) {
    return array.filter(item => {
        return Object.keys(filters).every(key => {
            const filterValue = filters[key];
            if (filterValue === null || filterValue === undefined || filterValue === '') {
                return true;
            }
            return item[key] === filterValue;
        });
    });
}

// ==================== SLUG GENERATION ====================

function generateSlug(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function generateId(prefix = 'item') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== DEBOUNCE ====================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== SCROLL ====================

function scrollToTop(smooth = true) {
    window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
    });
}

function scrollToElement(element, offset = 0) {
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
        top: top,
        behavior: 'smooth'
    });
}

// ==================== HEADER AUTH STATE ====================

function updateHeaderAuthState() {
    // Get current user from token
    const token = localStorage.getItem('turathya_token');
    const userStr = localStorage.getItem('turathya_user');
    
    // Hide approval banner by default
    const approvalBanner = document.getElementById('approval-banner');
    if (approvalBanner) {
        approvalBanner.style.display = 'none';
    }
    
    if (!token || !userStr) {
        // Not logged in - show login/register, hide user links
        document.querySelectorAll('.auth-link').forEach(el => el.style.display = '');
        document.querySelectorAll('.user-link').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-link').forEach(el => el.style.display = 'none');
        updateUserMenuState(null);
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        // Logged in - hide login/register, show user links
        document.querySelectorAll('.auth-link').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.user-link').forEach(el => el.style.display = '');
        
        // Show admin link only for admins
        if (user.role === 'admin') {
            document.querySelectorAll('.admin-link').forEach(el => el.style.display = '');
        } else {
            document.querySelectorAll('.admin-link').forEach(el => el.style.display = 'none');
        }
        
        // Show approval pending banner for unapproved users
        if (user.status !== 'approved' && approvalBanner) {
            approvalBanner.style.display = 'block';
        }
        updateUserMenuState(user);
    } catch (e) {
        console.error('Error parsing user data:', e);
        // Clear invalid data
        localStorage.removeItem('turathya_token');
        localStorage.removeItem('turathya_user');
        document.querySelectorAll('.auth-link').forEach(el => el.style.display = '');
        document.querySelectorAll('.user-link').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-link').forEach(el => el.style.display = 'none');
        updateUserMenuState(null);
    }
}

function getWelcomePrefix() {
    if (typeof window.i18n !== 'undefined' && window.i18n?.t) {
        const val = window.i18n.t('userMenu.welcome');
        if (val) return val;
    }
    const isRTL = document.documentElement.getAttribute('dir') === 'rtl';
    return isRTL ? 'مرحباً،' : 'Welcome,';
}

function updateUserMenuState(user) {
    const guestMenu = document.getElementById('guestMenu');
    const authMenu = document.getElementById('authMenu');
    const btnText = document.getElementById('userBtnText');
    const avatar = document.getElementById('userAvatar');
    const nameDisplay = document.getElementById('userNameDisplay');

    if (!guestMenu || !authMenu || !btnText) return;

    if (!user) {
        guestMenu.style.display = 'block';
        authMenu.style.display = 'none';
        // Reset to Account label (i18n will populate on load)
        if (!btnText.getAttribute('data-i18n')) {
            btnText.textContent = 'Account';
        }
        return;
    }

    guestMenu.style.display = 'none';
    authMenu.style.display = 'block';

    const displayName = user.full_name || user.name || user.email || 'User';
    const firstName = String(displayName).trim().split(' ')[0] || 'User';
    const welcome = getWelcomePrefix();
    btnText.textContent = `${welcome} ${firstName}`;

    if (avatar) avatar.textContent = firstName.charAt(0).toUpperCase();
    if (nameDisplay) nameDisplay.textContent = firstName;
}

function initUserMenu() {
    const btn = document.getElementById('userBtn');
    const dropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('user-logout-btn');
    const menu = document.getElementById('userMenu');

    if (!btn || !dropdown || !menu) return;

    const closeDropdown = () => {
        dropdown.classList.remove('active');
        dropdown.setAttribute('aria-hidden', 'true');
        btn.setAttribute('aria-expanded', 'false');
    };

    const openDropdown = () => {
        dropdown.classList.add('active');
        dropdown.setAttribute('aria-hidden', 'false');
        btn.setAttribute('aria-expanded', 'true');
    };

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.contains('active') ? closeDropdown() : openDropdown();
    });

    menu.addEventListener('mouseenter', openDropdown);
    menu.addEventListener('mouseleave', closeDropdown);

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target)) closeDropdown();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDropdown();
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof logout === 'function') logout();
        });
    }
}

document.addEventListener('DOMContentLoaded', initUserMenu);

function logout() {
    // Clear authentication data
    localStorage.removeItem('turathya_token');
    localStorage.removeItem('turathya_user');
    
    // Update header
    updateHeaderAuthState();
    
    // Redirect to home
    window.location.href = '/';
}

// ==================== TOAST NOTIFICATIONS ====================

function ensureToastContainer() {
    let container = document.getElementById('toast-container');
    if (container) return container;

    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showToast(message, type = 'info', duration = 2000) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;

    const text = document.createElement('div');
    text.className = 'toast-message';
    text.textContent = String(message || '');

    const dismiss = document.createElement('button');
    dismiss.className = 'toast-dismiss';
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Dismiss notification');
    dismiss.innerHTML = '&times;';

    let removed = false;
    const removeToast = () => {
        if (removed) return;
        removed = true;
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 220);
    };

    dismiss.addEventListener('click', removeToast);

    toast.appendChild(text);
    toast.appendChild(dismiss);
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    setTimeout(removeToast, duration);
}

window.showToast = showToast;

// Replace blocking browser alerts with non-blocking styled toasts
window.alert = function (message) {
    showToast(message, 'info', 2000);
};

// ==================== WHATSAPP FLOATING BUTTON ====================

/**
 * Business WhatsApp number (international format, no +).
 * Set window.TURATHYA_WA_NUMBER before utils.js loads to override.
 */
const TURATHYA_WA_NUMBER = window.TURATHYA_WA_NUMBER || '966500000000';

function injectWhatsAppFAB() {
    if (document.getElementById('turathya-wa-fab')) return; // already injected

    // Inject CSS if not already present
    if (!document.querySelector('link[href*="whatsapp-btn.css"]')) {
        const depth = window.location.pathname.split('/').filter(Boolean).length;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : (window.location.pathname.includes('/pages/') ? '../' : '');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = prefix + 'css/components/whatsapp-btn.css';
        document.head.appendChild(link);
    }

    const lang = localStorage.getItem('lang') || 'ar';
    const isAr = lang === 'ar';
    const label = isAr ? 'تواصل معنا' : 'Chat with us';
    const greeting = encodeURIComponent(isAr
        ? 'مرحباً، أود الاستفسار عن قطعة من موقع تراثيا.'
        : 'Hello, I would like to inquire about a lot on Turathya.');

    const fab = document.createElement('a');
    fab.id      = 'turathya-wa-fab';
    fab.href    = `https://wa.me/${TURATHYA_WA_NUMBER}?text=${greeting}`;
    fab.target  = '_blank';
    fab.rel     = 'noopener noreferrer';
    fab.setAttribute('aria-label', label);
    fab.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span class="wa-fab-label">${label}</span>`;
    document.body.appendChild(fab);
}

// Inject after DOM is ready (works even if script runs before DOMContentLoaded)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWhatsAppFAB);
} else {
    injectWhatsAppFAB();
}

// Re-inject label when language changes
window.addEventListener('languageChanged', () => {
    const existing = document.getElementById('turathya-wa-fab');
    if (existing) existing.remove();
    injectWhatsAppFAB();
});
