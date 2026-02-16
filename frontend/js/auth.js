// ============================================
// TURATHYA - AUTHENTICATION
// User login, registration, session management
// Note: Core auth functions (getCurrentUser, isLoggedIn, isAdmin) 
// are now defined in api.js using token-based authentication
// ============================================

// ==================== SESSION MANAGEMENT ====================

function requireLogin() {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!isAdmin()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// ==================== UI HELPERS ====================

function updateAuthUI() {
    const user = getCurrentUser();
    const authLinks = document.querySelectorAll('.auth-link');
    const userLinks = document.querySelectorAll('.user-link');
    const adminLinks = document.querySelectorAll('.admin-link');
    const userNameElements = document.querySelectorAll('.user-name');

    if (user) {
        // Hide auth links (login/register)
        authLinks.forEach(link => link.style.display = 'none');

        // Show user links (account/logout)
        userLinks.forEach(link => link.style.display = '');

        // Show admin links if admin
        if (user.role === 'admin') {
            adminLinks.forEach(link => link.style.display = '');
        } else {
            adminLinks.forEach(link => link.style.display = 'none');
        }

        // Update user name
        userNameElements.forEach(el => el.textContent = user.full_name || user.email);
    } else {
        // Show auth links
        authLinks.forEach(link => link.style.display = '');

        // Hide user and admin links
        userLinks.forEach(link => link.style.display = 'none');
        adminLinks.forEach(link => link.style.display = 'none');
    }
}

// Run on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);
