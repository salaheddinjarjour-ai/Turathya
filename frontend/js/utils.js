// ============================================
// TURATHYA - UTILITY FUNCTIONS
// Date formatting, currency, URL helpers
// ============================================

// ==================== DATE & TIME ====================

function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    return `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;
}

function formatTimeRemaining(endDate) {
    const now = new Date();
    const end = new Date(endDate);
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
    const end = new Date(endDate);
    const diff = end - now;
    const hours = diff / (1000 * 60 * 60);
    return hours > 0 && hours <= hoursThreshold;
}

function hasEnded(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    return now >= end;
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

function calculateBuyersPremium(bidAmount, premiumPercent) {
    return bidAmount * (premiumPercent / 100);
}

function calculateTotal(bidAmount, premiumPercent) {
    return bidAmount + calculateBuyersPremium(bidAmount, premiumPercent);
}

// ==================== URL HELPERS ====================

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
    } catch (e) {
        console.error('Error parsing user data:', e);
        // Clear invalid data
        localStorage.removeItem('turathya_token');
        localStorage.removeItem('turathya_user');
        document.querySelectorAll('.auth-link').forEach(el => el.style.display = '');
        document.querySelectorAll('.user-link').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-link').forEach(el => el.style.display = 'none');
    }
}

function logout() {
    // Clear authentication data
    localStorage.removeItem('turathya_token');
    localStorage.removeItem('turathya_user');
    
    // Update header
    updateHeaderAuthState();
    
    // Redirect to home
    window.location.href = '../index.html';
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
