// ============================================
// TURATHYA - BIDDING SYSTEM
// Place bids, validate, update UI
// ============================================

// Store current lot data
let currentLotData = null;

// ==================== BID MODAL ====================

async function showBidModal(lotId) {
    // Check if user is logged in
    if (!getToken()) {
        window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
        return;
    }

    // Check if user is approved
    let user = getCurrentUser();
    if (user && user.status !== 'approved' && typeof authAPI !== 'undefined' && typeof authAPI.getMe === 'function') {
        try {
            const profile = await authAPI.getMe();
            if (profile?.user) {
                const refreshedUser = {
                    id: profile.user.id,
                    email: profile.user.email,
                    full_name: profile.user.full_name || profile.user.fullName || profile.user.email,
                    role: profile.user.role,
                    status: profile.user.status
                };
                setAuth(getToken(), refreshedUser);
                user = refreshedUser;
            }
        } catch {
            // Continue using cached user if profile refresh fails
        }
    }

    if (user && user.status !== 'approved') {
        alert('Your account is pending admin approval. You can view the site but cannot place bids until approved. Please check back later or contact support.');
        return;
    }

    try {
        // Fetch latest lot data
        const { lot } = await lotsAPI.getById(lotId);
        
        if (!lot) {
            alert('Lot not found');
            return;
        }

        currentLotData = lot;

        // Prevent opening modal for closed lots
        const isClosed = hasEnded(lot.end_date) || lot.status !== 'active';
        if (isClosed) {
            alert('Bidding is closed for this lot.');
            return;
        }

        const currentBid = lot.current_bid && lot.current_bid > 0 ? lot.current_bid : lot.starting_bid;
        const minBid = lot.current_bid && lot.current_bid > 0 
            ? parseFloat(lot.current_bid) + parseFloat(lot.bid_increment || 100)
            : parseFloat(lot.starting_bid);

        const modal = document.getElementById('bid-modal');
        if (!modal) return;

        // Update modal content
        document.getElementById('bid-lot-title').textContent = lot.title;
        document.getElementById('bid-current-bid').textContent = formatCurrency(currentBid);
        document.getElementById('bid-min-bid').textContent = formatCurrency(minBid);

        const bidInput = document.getElementById('bid-amount');
        const increment = parseFloat(lot.bid_increment) || 100;
        bidInput.value = minBid;
        bidInput.min = minBid;
        bidInput.step = increment;

        // Update increment label
        const incrementLabel = document.getElementById('bid-increment-label');
        if (incrementLabel) {
            incrementLabel.textContent = formatCurrency(increment);
        }

        // Clear previous errors
        const errorElement = document.getElementById('bid-error');
        if (errorElement) {
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        }

        // Store lot ID on modal
        modal.setAttribute('data-lot-id', lotId);

        // Show modal
        modal.classList.add('active');
    } catch (error) {
        console.error('Failed to load lot for bidding:', error);
        alert('Failed to load lot details');
    }
}

function hideBidModal() {
    const modal = document.getElementById('bid-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function hideBidConfirmModal() {
    const modal = document.getElementById('bid-confirm-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function confirmBidPlacement(bidAmount) {
    const modal = document.getElementById('bid-confirm-modal');
    const messageElement = document.getElementById('confirm-bid-message');
    const cancelButton = document.getElementById('confirm-bid-cancel');
    const submitButton = document.getElementById('confirm-bid-submit');
    const closeButton = document.getElementById('bid-confirm-close');

    const messageTemplate = (typeof i18n !== 'undefined' && i18n?.t)
        ? i18n.t('bidModal.confirmBid')
        : 'Confirm your bid of {amount}?';
    const message = messageTemplate.replace('{amount}', formatCurrency(bidAmount));

    if (!modal || !messageElement || !cancelButton || !submitButton || !closeButton) {
        return Promise.resolve(window.confirm(message));
    }

    messageElement.textContent = message;
    modal.classList.add('active');

    return new Promise((resolve) => {
        let settled = false;

        const cleanup = () => {
            cancelButton.removeEventListener('click', onCancel);
            submitButton.removeEventListener('click', onConfirm);
            closeButton.removeEventListener('click', onCancel);
            modal.removeEventListener('click', onBackdropClick);
        };

        const finish = (confirmed) => {
            if (settled) return;
            settled = true;
            cleanup();
            hideBidConfirmModal();
            resolve(confirmed);
        };

        const onCancel = () => finish(false);
        const onConfirm = () => finish(true);
        const onBackdropClick = (e) => {
            if (e.target === modal) {
                finish(false);
            }
        };

        cancelButton.addEventListener('click', onCancel);
        submitButton.addEventListener('click', onConfirm);
        closeButton.addEventListener('click', onCancel);
        modal.addEventListener('click', onBackdropClick);
    });
}

async function handleBidSubmit(event) {
    event.preventDefault();

    const modal = document.getElementById('bid-modal');
    const lotId = modal.getAttribute('data-lot-id');
    const bidAmount = parseFloat(document.getElementById('bid-amount').value);
    const errorElement = document.getElementById('bid-error');

    try {
        const confirmed = await confirmBidPlacement(bidAmount);
        if (!confirmed) {
            return;
        }

        // Place bid via API
        const result = await bidsAPI.place(lotId, bidAmount);

        if (result.bid) {
            // Show success message
            showBidSuccess(currentLotData, bidAmount);
            hideBidModal();

            // Refresh page data
            if (typeof loadLot === 'function') {
                setTimeout(() => loadLot(), 1000);
            } else {
                setTimeout(() => window.location.reload(), 1000);
            }
        }
    } catch (error) {
        console.error('Bid placement error:', error);
        
        // Show error message
        if (errorElement) {
            errorElement.textContent = error.message || 'Failed to place bid. Please try again.';
            errorElement.style.display = 'block';
        }
    }
}

function showBidSuccess(lot, bidAmount) {
    const modal = document.getElementById('bid-success-modal');
    if (!modal) return;

    document.getElementById('success-lot-title').textContent = lot.title;
    document.getElementById('success-bid-amount').textContent = formatCurrency(bidAmount);

    const buyersPremium = lot.buyers_premium || 25;
    const premium = (bidAmount * buyersPremium) / 100;
    const total = bidAmount + premium;

    document.getElementById('success-premium-percent').textContent = buyersPremium;
    document.getElementById('success-buyers-premium').textContent = formatCurrency(premium);
    document.getElementById('success-total').textContent = formatCurrency(total);

    modal.classList.add('active');
}

function hideBidSuccessModal() {
    const modal = document.getElementById('bid-success-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Increment bid by bid increment amount
function incrementBid() {
    const bidInput = document.getElementById('bid-amount');
    const increment = currentLotData ? parseFloat(currentLotData.bid_increment) || 100 : 100;
    const currentValue = parseFloat(bidInput.value) || 0;
    bidInput.value = currentValue + increment;
}

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', () => {
    // Bid form submission
    const bidForm = document.getElementById('bid-form');
    if (bidForm) {
        bidForm.addEventListener('submit', handleBidSubmit);
    }

    // Modal close buttons
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            hideBidModal();
            hideBidConfirmModal();
            hideBidSuccessModal();
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop) {
                hideBidModal();
                hideBidConfirmModal();
                hideBidSuccessModal();
            }
        });
    });
});
