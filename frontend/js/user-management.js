// ============================================
// TURATHYA - USER MANAGEMENT (ADMIN)
// Approve, reject, suspend, promote/demote users
// ============================================

// ==================== USER MANAGEMENT FUNCTIONS ====================

function t(key) {
    return (typeof i18n !== 'undefined' && i18n?.t) ? i18n.t(key) : key;
}

async function approveUser(userId) {
    try {
        await adminAPI.users.approve(userId);
        showSuccess(t('notifications.userApproved'));
        return true;
    } catch (error) {
        console.error('Failed to approve user:', error);
        showError(error.message || t('notifications.failedApproveUser'));
        return false;
    }
}

async function rejectUser(userId) {
    try {
        await adminAPI.users.reject(userId);
        showSuccess(t('notifications.userRejected'));
        return true;
    } catch (error) {
        console.error('Failed to reject user:', error);
        showError(error.message || t('notifications.failedRejectUser'));
        return false;
    }
}

async function suspendUser(userId) {
    try {
        await adminAPI.users.suspend(userId);
        showSuccess(t('notifications.userSuspended'));
        return true;
    } catch (error) {
        console.error('Failed to suspend user:', error);
        showError(error.message || t('notifications.failedSuspendUser'));
        return false;
    }
}

async function reactivateUser(userId) {
    try {
        await adminAPI.users.unsuspend(userId);
        showSuccess(t('notifications.userReactivated'));
        return true;
    } catch (error) {
        console.error('Failed to reactivate user:', error);
        showError(error.message || t('notifications.failedReactivateUser'));
        return false;
    }
}

async function deleteUserAccount(userId) {
    if (!confirm(t('notifications.deleteUserConfirm'))) {
        return false;
    }

    try {
        await adminAPI.users.delete(userId);
        showSuccess(t('notifications.userDeleted'));
        return true;
    } catch (error) {
        console.error('Failed to delete user:', error);
        showError(error.message || t('notifications.failedDeleteUser'));
        return false;
    }
}

async function makeAdmin(userId) {
    if (!confirm('Promote this user to Admin? They will have full dashboard access.')) return false;
    try {
        await adminAPI.users.setRole(userId, 'admin');
        showSuccess('User promoted to Admin.');
        return true;
    } catch (error) {
        showError(error.message || 'Failed to promote user.');
        return false;
    }
}

async function removeAdmin(userId) {
    if (!confirm('Remove Admin role from this user?')) return false;
    try {
        await adminAPI.users.setRole(userId, 'user');
        showSuccess('Admin role removed.');
        return true;
    } catch (error) {
        showError(error.message || 'Failed to remove admin role.');
        return false;
    }
}

// ==================== UI FUNCTIONS ====================

// In-memory cache so search never triggers extra API calls
let _cachedUsers = [];

function renderUsersTable(users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;">${t('admin.noUsersFound')}</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(user => {
        const statusBadge = getStatusBadge(user.status);
        const roleBadge   = getRoleBadge(user.role);
        const actions = getUserActions(user);
        return `
            <tr>
                <td>${user.full_name || t('common.na')}</td>
                <td>${user.email}</td>
                <td>${formatDate(user.created_at)}</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${actions}</td>
            </tr>
        `;
    }).join('');
}

function applyUserSearch() {
    const searchQuery = (document.getElementById('user-search')?.value || '').trim().toLowerCase();
    if (!searchQuery) {
        renderUsersTable(_cachedUsers);
        return;
    }
    const filtered = _cachedUsers.filter(u =>
        (u.full_name || '').toLowerCase().includes(searchQuery) ||
        (u.email || '').toLowerCase().includes(searchQuery)
    );
    renderUsersTable(filtered);
}

// Attach search input listener once (safe to call multiple times)
function initUserSearch() {
    const input = document.getElementById('user-search');
    if (!input || input.dataset.searchBound) return;
    input.dataset.searchBound = '1';
    input.addEventListener('input', applyUserSearch);
}

window.loadUsers = async function () {
    try {
        const filter = document.getElementById('user-status-filter')?.value || 'all';

        const filters = {};
        if (filter !== 'all') filters.status = filter;

        const { users } = await adminAPI.users.getAll(filters);
        _cachedUsers = users || [];

        // Apply any existing search query on fresh data
        applyUserSearch();

        // Bind search input (idempotent)
        initUserSearch();
    } catch (error) {
        console.error('Failed to load users:', error);
        showError(t('notifications.failedLoadUsers'));
    }
}

function getRoleBadge(role) {
    if (role === 'admin') {
        return `<span class="badge" style="background:rgba(198,164,108,.18);color:#a07830;border:1px solid rgba(198,164,108,.45);">&#9733; Admin</span>`;
    }
    return `<span class="badge" style="background:rgba(100,100,100,.10);color:var(--theme-text-muted);border:1px solid rgba(100,100,100,.2);">User</span>`;
}

function getStatusBadge(status) {
    const badges = {
        pending:   `<span class="badge badge-warning">${t('admin.pendingApproval')}</span>`,
        approved:  `<span class="badge badge-success">${t('admin.approved')}</span>`,
        rejected:  `<span class="badge badge-error">${t('admin.rejected')}</span>`,
        suspended: `<span class="badge badge-error">${t('admin.suspended')}</span>`
    };
    return badges[status] || status;
}

function getUserActions(user) {
    const currentUser = getCurrentUser();
    const isSelf = currentUser && String(currentUser.id) === String(user.id);
    const actions = [];

    // ── Role toggle ───────────────────────────────────────────────
    if (user.role === 'admin') {
        if (!isSelf) {
            // Demote button (shield-off icon)
            actions.push(`<button class="btn btn-ghost btn-sm" style="color:#c0392b;" onclick="removeAdmin('${user.id}').then(s=>{ if(s) loadUsers(); })" title="Remove Admin">
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 .34-.09.67-.19 1-.3V20.7A10.1 10.1 0 0 1 5 11V6.3l7-3.11 7 3.11v5.38c-.33.03-.67.04-1 .08V9.24L12 6.87 5 9.24V11c0 3.35 1.56 6.4 4 8.42v1.28c-3.67-2.33-6-6.41-6-9.7V5l9-4 9 4v6.5c-.32-.05-.66-.08-1-.1V6l-7-3.13z"/><line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>`);
        }
    } else {
        // Promote button (crown icon)
        actions.push(`<button class="btn btn-ghost btn-sm" style="color:#a07830;" onclick="makeAdmin('${user.id}').then(s=>{ if(s) loadUsers(); })" title="Make Admin">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm2.7 2c-.4 0-.7.3-.7.7v.6c0 .4.3.7.7.7h8.6c.4 0 .7-.3.7-.7v-.6c0-.4-.3-.7-.7-.7H7.7z"/></svg>
        </button>`);

        // ── Status actions (non-admin users only) ─────────────────
        if (user.status === 'pending') {
            actions.push(`<button class="btn btn-ghost btn-sm" onclick="approveUser('${user.id}').then(s=>{ if(s) loadUsers(); })" title="${t('admin.approve')}"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></button>`);
            actions.push(`<button class="btn btn-ghost btn-sm" onclick="rejectUser('${user.id}').then(s=>{ if(s) loadUsers(); })" title="${t('admin.reject')}"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>`);
        } else if (user.status === 'approved') {
            actions.push(`<button class="btn btn-ghost btn-sm" onclick="suspendUser('${user.id}').then(s=>{ if(s) loadUsers(); })" title="${t('admin.suspend')}"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg></button>`);
        } else if (user.status === 'suspended' || user.status === 'rejected') {
            actions.push(`<button class="btn btn-ghost btn-sm" onclick="reactivateUser('${user.id}').then(s=>{ if(s) loadUsers(); })" title="${t('admin.reactivate')}"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/></svg></button>`);
        }
    }

    // ── Delete (never on yourself) ────────────────────────────────
    if (!isSelf) {
        actions.push(`<button class="btn btn-ghost btn-sm" onclick="deleteUserAccount('${user.id}').then(s=>{ if(s) loadUsers(); })" title="${t('buttons.delete')}"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>`);
    }

    return actions.join(' ');
}

// ==================== BIDDING VALIDATION ====================

// These functions are no longer used as validation happens on the backend
// Kept for backward compatibility but return default values
function canUserBid(userId) {
    return true; // Backend will handle validation
}

function validateBidPermission(userId) {
    return { allowed: true }; // Backend will handle validation
}
