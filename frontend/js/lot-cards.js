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

  const title  = localStr(lot, 'title');
  const cat    = localStr(lot, 'category') || T('auction.lot');
  const desc   = localStr(lot, 'description') || '';
  const catGrp = lot.category_title || lot.auction_title || '';
  const lotTag = lot.lot_number ? `LOT ${lot.lot_number}` : '';
  const images = getLotImages(lot);
  const imgHTML = buildCardImageHTML(images, lotTag, '');

  // Resolve lot page path — works from both root (index.html) and pages/ subfolder
  // Build SEO slug URL (e.g. /lot/antique-vase-lot-203-<uuid>)
  const lotUrl = (typeof getLotUrl === 'function')
    ? getLotUrl(lot, { view: 'collection' })
    : (() => {
        const _inPages = window.location.pathname.includes('/pages/');
        return (_inPages ? 'lot.html' : 'pages/lot.html') + '?id=' + lot.id + '&view=collection';
      })();

  // WhatsApp inquiry — separate <a> so it is NOT nested inside another <a>
  const waNumber = window.TURATHYA_WA_NUMBER || '966500000000';
  const lang2    = localStorage.getItem('lang') || 'ar';
  const isAr     = lang2 === 'ar';
  const waMsg    = encodeURIComponent(isAr
    ? '\u0645\u0631\u062d\u0628\u0627\u064b\u060c \u0623\u0648\u062f \u0627\u0644\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0639\u0646 \u0627\u0644\u0642\u0637\u0639\u0629: ' + title
    : 'Hello, I would like to inquire about: ' + title);
  const waLabel  = isAr ? '\u0627\u0633\u062a\u0641\u0633\u0627\u0631 \u0639\u0628\u0631 \u0648\u0627\u062a\u0633\u0627\u0628' : 'Inquire via WhatsApp';
  const waHref   = 'https://wa.me/' + waNumber + '?text=' + waMsg;

  // Card uses a <div role="link"> so the nested WA <a> is valid HTML
  return `
    <div class="lot-card lot-card-fade"
         role="link"
         tabindex="0"
         onclick="window.location='${lotUrl}'"
         onkeydown="if(event.key==='Enter')window.location='${lotUrl}'"
         style="cursor:pointer;">
      ${imgHTML}
      <div class="lot-body">
        <div class="lot-cat">${cat}</div>
        <h3 class="lot-title">${title}</h3>
        ${catGrp ? `<p class="lot-sub">${catGrp}</p>` : ''}
        ${desc   ? `<p class="lot-desc">${desc.slice(0,120)}${desc.length>120?'\u2026':''}</p>` : ''}
        <div class="lot-divider"></div>
        <a href="${waHref}" target="_blank" rel="noopener noreferrer"
           class="lot-wa-inquiry-btn"
           onclick="event.stopPropagation();"
           aria-label="${waLabel}">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex-shrink:0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          ${waLabel}
        </a>
      </div>
    </div>`;
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
    <a href="${(typeof getLotUrl === 'function') ? getLotUrl(lot, archiveParam ? {archive:true} : {}) : ('lot.html?id=' + lot.id + archiveParam)}" class="${cardClass}">
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
