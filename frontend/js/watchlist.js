// ============================================
// TURATHYA - WATCHLIST / FAVORITES
// Add/remove items from watchlist
// ============================================

// Cache watchlist in memory
let watchlistCache = new Set();

// ==================== LOAD WATCHLIST ====================

async function loadWatchlistCache() {
    if (!isLoggedIn()) {
        return;
    }
    
    try {
        const { watchlist } = await watchlistAPI.getAll();
        watchlistCache = new Set((watchlist || []).map(item => item.lot_id));
    } catch (error) {
        console.error('Failed to load watchlist cache:', error);
        watchlistCache = new Set();
    }
}

// ==================== TOGGLE WATCHLIST ====================

async function toggleWatchlist(lotId) {
    if (!isLoggedIn()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    const inWatchlist = watchlistCache.has(lotId);

    try {
        if (inWatchlist) {
            await watchlistAPI.remove(lotId);
            watchlistCache.delete(lotId);
        } else {
            await watchlistAPI.add(lotId);
            watchlistCache.add(lotId);
        }

        // Update UI
        updateWatchlistButtons(lotId);

        return !inWatchlist;
    } catch (error) {
        console.error('Watchlist toggle error:', error);
        // Reload cache on error
        await loadWatchlistCache();
        updateWatchlistButtons();
    }
}

// ==================== UPDATE UI ====================

function updateWatchlistButtons(lotId = null) {
    if (!isLoggedIn()) return;

    const buttons = lotId
        ? document.querySelectorAll(`[data-watchlist-lot="${lotId}"]`)
        : document.querySelectorAll('[data-watchlist-lot]');

    buttons.forEach(button => {
        const buttonLotId = button.getAttribute('data-watchlist-lot');
        const inWatchlist = watchlistCache.has(buttonLotId);

        if (inWatchlist) {
            button.classList.add('active');
            button.setAttribute('title', 'Remove from watchlist');
        } else {
            button.classList.remove('active');
            button.setAttribute('title', 'Add to watchlist');
        }
    });
}

// ==================== WATCHLIST ICON SVG ====================

function getWatchlistIcon() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  `;
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', async () => {
    if (isLoggedIn()) {
        // Load watchlist cache from API
        await loadWatchlistCache();
        // Update all watchlist buttons on page load
        updateWatchlistButtons();
    }

    // Add click handlers to watchlist buttons
    document.addEventListener('click', (e) => {
        const button = e.target.closest('[data-watchlist-lot]');
        if (button) {
            e.preventDefault();
            e.stopPropagation();
            const lotId = button.getAttribute('data-watchlist-lot');
            toggleWatchlist(lotId);
        }
    });
});

// Make toggleWatchlist available globally
window.toggleWatchlist = toggleWatchlist;
window.updateWatchlistButtons = updateWatchlistButtons;
window.loadWatchlistCache = loadWatchlistCache;
