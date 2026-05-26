/* ═══════════════════════════════════════════════════════
   TURATHYA — Shared Lot Card Helpers
   buildCardImageHTML()  →  slider or single image HTML
   initCardSliders()     →  activate all sliders on page
   buildGalleryCard()    →  gallery card HTML (no price)
   buildAuctionCard()    →  auction card HTML (with price)
   ═══════════════════════════════════════════════════════ */

/* ─── Build image slider HTML ─────────────────────────
   images: string[]  (array of URLs, at least 1)
   Returns a .lot-img-wrap div string                    */
function buildCardImageHTML(images, lotNumTag, badgeHTML) {
  const tags = `
    ${lotNumTag ? `<div class="lot-num-tag">${lotNumTag}</div>` : ''}
    ${badgeHTML ? `<div class="lot-badge-wrap">${badgeHTML}</div>` : ''}
  `;

  if (!images || images.length <= 1) {
    const src = (images && images[0]) || '../assets/images/placeholder.jpg';
    return `<div class="lot-img-wrap">
      <img loading="lazy" src="${src}" alt="">
      ${tags}
    </div>`;
  }

  // Multiple images → slider
  const slides = images.map(src => `
    <div class="lot-slider-slide">
      <img loading="lazy" src="${src}" alt="">
    </div>`).join('');

  const dots = images.map((_, i) =>
    `<button class="lot-slider-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Image ${i+1}"></button>`
  ).join('');

  return `<div class="lot-img-wrap" data-slider>
    <div class="lot-slider" style="transform:translateX(0)">${slides}</div>
    <button class="lot-slider-btn lot-slider-prev" aria-label="Previous">&#8249;</button>
    <button class="lot-slider-btn lot-slider-next" aria-label="Next">&#8250;</button>
    <div class="lot-slider-dots">${dots}</div>
    ${tags}
  </div>`;
}

/* ─── Activate all card sliders on page ───────────────
   Call after any dynamic card injection.
   Safe to call multiple times (uses data-slider-init).   */
function initCardSliders(root) {
  const scope = root || document;
  scope.querySelectorAll('[data-slider]:not([data-slider-init])').forEach(wrap => {
    wrap.setAttribute('data-slider-init', '1');

    const slider = wrap.querySelector('.lot-slider');
    if (!slider) return;

    const slides = slider.querySelectorAll('.lot-slider-slide');
    const dots   = wrap.querySelectorAll('.lot-slider-dot');
    if (slides.length < 2) return;

    let current = 0;
    const isRtl = document.documentElement.dir === 'rtl';

    function goTo(idx) {
      current = (idx + slides.length) % slides.length;
      const dir = isRtl ? 1 : -1;
      slider.style.transform = `translateX(${dir * current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    wrap.querySelector('.lot-slider-prev')?.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      goTo(isRtl ? current + 1 : current - 1);
    });
    wrap.querySelector('.lot-slider-next')?.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      goTo(isRtl ? current - 1 : current + 1);
    });
    dots.forEach((dot, i) => {
      dot.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); goTo(i); });
    });

    // Touch/swipe
    let startX = 0;
    wrap.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < 30) return;
      goTo(dx < 0 ? (isRtl ? current - 1 : current + 1) : (isRtl ? current + 1 : current - 1));
    }, { passive: true });
  });
}

/* ─── Extract images from lot data ───────────────────── */
function getLotImages(lot) {
  const images = [];
  if (lot.primary_image) images.push(lot.primary_image);
  if (lot.image_data && lot.image_data !== lot.primary_image) images.push(lot.image_data);
  if (Array.isArray(lot.media)) {
    lot.media.forEach(m => {
      const url = m.url || m.file_path || m;
      if (url && !images.includes(url)) images.push(url);
    });
  }
  if (images.length === 0) images.push('../assets/images/placeholder.jpg');
  return images;
}

/* ─── Gallery Card (collection / home — no price) ────── */
function buildGalleryCard(lot) {
  const LABELS = { 'auction.lot': 'Lot' };
  const T = (k) => {
    if (window.i18n && window.i18n.t) { const v = window.i18n.t(k); if (v && v !== k) return v; }
    return LABELS[k] || k;
  };
  const localStr = (obj, field) => {
    if (typeof localizedField === 'function') return localizedField(lot, field);
    const lang = document.documentElement.lang || 'ar';
    return lot[`${field}_${lang}`] || lot[field] || '';
  };

  const title   = localStr(lot, 'title');
  const cat     = localStr(lot, 'category') || T('auction.lot');
  const desc    = localStr(lot, 'description') || '';
  const catGrp  = lot.category_title || lot.auction_title || '';
  const lotTag  = lot.lot_number ? `LOT ${lot.lot_number}` : '';
  const images  = getLotImages(lot);

  const imgHTML = buildCardImageHTML(images, lotTag, '');

  return `
    <a href="lot.html?id=${lot.id}&view=collection" class="lot-card lot-card-fade">
      ${imgHTML}
      <div class="lot-body">
        <div class="lot-cat">${cat}</div>
        <h3 class="lot-title">${title}</h3>
        ${catGrp ? `<p class="lot-sub">${catGrp}</p>` : ''}
        ${desc ? `<p class="lot-desc">${desc.slice(0, 120)}${desc.length > 120 ? '…' : ''}</p>` : ''}
      </div>
    </a>`;
}

/* ─── Auction Card (auctions page — with price + timer) ─ */
function buildAuctionCard(lot, isPast) {
  const LABELS = {
    'auction.lot': 'Lot',
    'auction.startingBid': 'Starting Bid',
    'auction.currentBid': 'Current Bid',
    'auction.ended': 'Ended',
    'auction.endingSoon': 'Ending Soon',
    'time.ended': 'Ended',
  };
  const T = (k) => {
    if (window.i18n && window.i18n.t) { const v = window.i18n.t(k); if (v && v !== k) return v; }
    return LABELS[k] || k;
  };
  const localStr = (obj, field) => {
    if (typeof localizedField === 'function') return localizedField(lot, field);
    const lang = document.documentElement.lang || 'ar';
    return lot[`${field}_${lang}`] || lot[field] || '';
  };


  const title   = localStr(lot, 'title');
  const cat     = localStr(lot, 'category') || T('auction.lot');
  const catGrp  = lot.category_title || lot.auction_title || '';
  const lotTag  = lot.lot_number ? `LOT ${lot.lot_number}` : '';
  const images  = getLotImages(lot);

  // Badge — no "live" badge on cards
  let badgeHTML = '';
  if (isPast) {
    badgeHTML = `<span class="badge-ended-neutral">${T('auction.ended')}</span>`;
  } else if (typeof isEndingSoon === 'function' && isEndingSoon(lot.end_date)) {
    badgeHTML = `<span class="badge-ending-gold"><span class="badge-pulse-dot"></span>${T('auction.endingSoon')}</span>`;
  }

  const imgHTML = buildCardImageHTML(images, lotTag, badgeHTML);

  const amount = lot.current_bid && Number(lot.current_bid) > 0
    ? Number(lot.current_bid) : Number(lot.starting_bid || 0);
  const amountLabel = lot.current_bid && Number(lot.current_bid) > 0
    ? T('auction.currentBid') : T('auction.startingBid');
  const fmtAmount = typeof formatCurrency === 'function' ? formatCurrency(amount) : amount;

  const timerCell = isPast
    ? `<span class="lot-timer">${T('time.ended')} ${typeof formatDate === 'function' ? formatDate(lot.end_date) : ''}</span>`
    : `<span class="lot-timer" data-lot-end="${lot.end_date || ''}">—</span>`;

  const cardClass = `lot-card has-auction${isPast ? ' is-past' : ''}`;
  const archiveParam = isPast ? '&archive=true' : '';

  return `
    <a href="lot.html?id=${lot.id}${archiveParam}" class="${cardClass}">
      ${imgHTML}
      <div class="lot-body">
        <div class="lot-cat">${cat}</div>
        <h3 class="lot-title">${title}</h3>
        ${catGrp ? `<p class="lot-sub">${catGrp}</p>` : ''}
        <div class="lot-divider"></div>
        <div class="lot-price-row">
          <div>
            <div class="lot-price-label">${amountLabel}</div>
            <div class="lot-price-value">${fmtAmount}</div>
          </div>
          ${timerCell}
        </div>
      </div>
    </a>`;
}
