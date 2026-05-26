/* =================================================================
   hero-slider.js — Premium Framed Showcase  (v5)

   Responsibilities:
     1. initFrameImage() — Canvas-processes h-frame.png to remove the
        white background, giving the frame real transparency so the
        slider shows through cleanly.

     2. buildSlider() — injects slide elements into #heroFrameSlider
        and dots into #heroSliderDots.  Each slide has:
          <img>                → the auction image
          .slide-overlay       → bottom-left label scrim
            .slide-label (span)  → category / eyebrow text
            .slide-title (h3)    → auction name
            .slide-bid (span)    → current bid or estimate

     3. Auto-plays every INTERVAL ms with a fade (opacity) transition.
        No translate — pure opacity only for a gallery-worthy feel.

   ─────────────────────────────────────────────────────────────────
   HOW TO CHANGE SLIDER CONTENT
   Edit the SLIDES array below. Each entry needs:
     {
       src:      'path/to/image.jpg',   // relative to index.html
       label:    'Category',            // eyebrow text (ALL CAPS rendered via CSS)
       title:    'Auction title',       // shown below label
       bid:      'Current bid: SAR …'  // or 'Estimate: …'
     }
   ─────────────────────────────────────────────────────────────────
   HOW TO ADJUST FRAME INNER POSITION
   Edit the CSS custom properties in hero-frame.css:
     .frame-container {
       --fi-top:    13%;
       --fi-left:   12%;
       --fi-width:  76%;
       --fi-height: 72%;
     }
   Tweak until the slider sits perfectly inside the frame opening.
   ================================================================= */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     FEATURED AUCTION SLIDES
     ──────────────────────────────────────────────────────────────
     Each slide represents a real auction category shown as if
     selected from the TURATHYA catalogue. Overlay text is minimal:
     a category eyebrow, a concise title, and a bid price label.

     Paths are relative to index.html (root of /frontend/).
  ────────────────────────────────────────────────────────────── */
  /* ──────────────────────────────────────────────────────────────
     FALLBACK SLIDES — only used if API is unavailable or empty
  ────────────────────────────────────────────────────────────── */
  var FALLBACK_SLIDES = [
    {
      src:   'assets/images/hero-slide-painting.jpg',
      label: 'Fine Art',
      title: 'European Old Masters — Spring Edition'
    },
    {
      src:   'assets/images/hero-slide-furniture.jpg',
      label: 'Antique Furniture',
      title: 'Ottoman & Levantine Interiors'
    },
    {
      src:   'assets/images/hero-slide-jewelry.jpg',
      label: 'Rare Jewellery',
      title: 'Signed Pieces & Precious Gems'
    }
  ];

  /* ──────────────────────────────────────────────────────────────
     LOAD REAL SLIDES FROM API
     Fetches active lots sorted by bid activity.
     Returns an array of { src, label, title, bid, href } objects.
  ────────────────────────────────────────────────────────────── */
  async function loadSlides() {
    try {
      if (typeof lotsAPI === 'undefined') return FALLBACK_SLIDES;

      var result = await lotsAPI.getAll();
      var lots   = (result && result.lots) || [];
      var now    = new Date();

      /* Priority 1: manually marked is_featured — regardless of auction status */
      var featured = lots.filter(function (l) { return !!l.is_featured; });

      /* Priority 2 (fallback): lots currently in a live auction window */
      var pool;
      if (featured.length > 0) {
        pool = featured;
      } else {
        var active = lots.filter(function (lot) {
          var start = lot.start_date ? new Date(lot.start_date) : null;
          var end   = lot.end_date   ? new Date(lot.end_date)   : null;
          return lot.status === 'active' &&
                 (!start || start <= now) &&
                 (end && end > now);
        });
        active.sort(function (a, b) {
          var diff = Number(b.bid_count || 0) - Number(a.bid_count || 0);
          return diff !== 0 ? diff : Number(b.current_bid || 0) - Number(a.current_bid || 0);
        });
        pool = active;
      }

      var top = pool.slice(0, 5);
      if (top.length === 0) return FALLBACK_SLIDES;

      var lang = (typeof localStorage !== 'undefined' && localStorage.getItem('lang')) || 'ar';

      return top.map(function (lot) {
        var title = (lang === 'ar' && lot.title_ar) ? lot.title_ar
                  : (lot.title_en || lot.title || 'Auction Lot');
        var label = (lang === 'ar' && lot.category_ar) ? lot.category_ar
                  : (lot.category_en || lot.category_title || lot.auction_title || 'Lot');
        var src = lot.primary_image || lot.image_data || lot.auction_image
                || 'assets/images/placeholder.jpg';

        return { src: src, label: label, title: title, href: 'pages/lot.html?id=' + lot.id };
      });

    } catch (err) {
      console.warn('[hero-slider] API unavailable, using fallback slides.', err);
      return FALLBACK_SLIDES;
    }
  }


  /* ──────────────────────────────────────────────────────────────
     CONFIG
  ────────────────────────────────────────────────────────────── */
  var INTERVAL = 5200;   /* ms between auto-advances */

  /* Internal state */
  var current         = 0;
  var timer           = null;
  var isTransitioning = false;


  /* ══════════════════════════════════════════════════════════════
     FRAME IMAGE PROCESSOR
     ──────────────────────────────────────────────────────────────
     h-frame.png is saved as JPEG internally (white bg, no alpha).
     We draw it onto an off-screen Canvas, mark every neutral
     gray/white pixel as alpha=0, then put the result back as
     a transparent src on the .frame-image <img>.

     Thresholds:
       NEUTRAL_DIFF — max channel spread to consider "neutral"
                      Gold pixels have R-B ≈ 120, so 30 is safe.
       MIN_BRIGHT   — pixels darker than this are frame shadows
                      (brown/mahogany); keep them opaque.
  ══════════════════════════════════════════════════════════════ */
  /* ══════════════════════════════════════════════════════════════
     PIXEL-PERFECT SLIDER POSITIONING
     ──────────────────────────────────────────────────────────────
     Measures the LIVE RENDERED frame image (offsetWidth/Height)
     then computes exact pixel values for .frame-inner.

     No percentage guessing. No transforms. As the frame scales
     (clamp, viewport resize) this function re-runs and keeps
     the slider locked to the real gold liner coordinates.

     BORDER CONSTANTS — measured from ornate-frame-new.png:
       TOP/BOTTOM border  ≈ 14 % of rendered frame height
       LEFT/RIGHT border  ≈ 12 % of rendered frame width
     Adjust these four numbers if the alignment drifts.
   ══════════════════════════════════════════════════════════════ */
  /* ── CSS OWNS POSITIONING ──────────────────────────────────────
     .frame-inner is positioned via percentage-based CSS in hero-frame.css.
     top: 14%  left: 12%  width: 76%  height: 72%  (desktop)
     Adjustments for mobile are handled via media queries.
     No JS measurement needed — SVG scales the frame, CSS scales the inner.
  ────────────────────────────────────────────────────────────── */
  function positionSlider() {
    /* intentionally empty — CSS handles all positioning */
  }

  function initFrameImage() {
    /* ornate-frame-new.png already has alpha transparency from
       removebg — no Canvas reprocessing needed.               */
    var frameImg = document.getElementById('heroFrameImage');
    if (!frameImg) return;

    if (frameImg.complete) {
      positionSlider();
    } else {
      frameImg.addEventListener('load', positionSlider);
    }
  }


  /* ══════════════════════════════════════════════════════════════
     SLIDE RENDERER
     ──────────────────────────────────────────────────────────────
     Each slide structure:

       <div class="hero-slide [is-active]" role="tabpanel" aria-label="…">
         <img class="hero-slide-img" …>
         <div class="slide-overlay">
           <span class="slide-label">Category</span>
           <h3  class="slide-title">Auction Title</h3>
           <span class="slide-bid">Current bid: SAR …</span>
         </div>
       </div>
  ══════════════════════════════════════════════════════════════ */
  function buildSlider(SLIDES) {
    var slider   = document.getElementById('heroFrameSlider');
    var dotsWrap = document.getElementById('heroSliderDots');
    if (!slider || !dotsWrap || !SLIDES || SLIDES.length === 0) return;

    /* Reset state in case of reload */
    current         = 0;
    isTransitioning = false;
    if (timer) { clearInterval(timer); timer = null; }

    slider.innerHTML   = '';
    dotsWrap.innerHTML = '';

    SLIDES.forEach(function (slide, idx) {
      var isFirst = idx === 0;

      /* ── Slide element ── */
      var el = document.createElement('div');
      el.className = 'hero-slide' + (isFirst ? ' is-active' : '');
      el.setAttribute('role', 'tabpanel');
      el.setAttribute('aria-label', slide.title);

      /* Make entire slide clickable if href provided */
      if (slide.href) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', function () {
          window.location.href = slide.href;
        });
      }

      /* Image */
      var img = document.createElement('img');
      img.className = 'hero-slide-img';
      img.src       = slide.src;
      img.alt       = slide.title;
      img.loading   = isFirst ? 'eager' : 'lazy';
      img.draggable = false;

      /* Overlay scrim */
      var overlay = document.createElement('div');
      overlay.className = 'slide-overlay';

      /* Category eyebrow */
      var label = document.createElement('span');
      label.className   = 'slide-label';
      label.textContent = slide.label;

      /* Auction title */
      var title = document.createElement('h3');
      title.className   = 'slide-title';
      title.textContent = slide.title;

      /* Bid / estimate */
      var bid = document.createElement('span');
      bid.className   = 'slide-bid';
      bid.textContent = slide.bid;

      overlay.appendChild(label);
      overlay.appendChild(title);
      /* price/bid line intentionally removed for gallery-clean look */

      el.appendChild(img);
      el.appendChild(overlay);
      slider.appendChild(el);

      /* ── Navigation dot ── */
      var dot = document.createElement('button');
      dot.className = 'hero-dot' + (isFirst ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-selected', isFirst ? 'true' : 'false');
      dot.setAttribute('aria-label', 'Show slide ' + (idx + 1) + ': ' + slide.title);

      /* Capture idx for the click handler */
      (function (i) {
        dot.addEventListener('click', function () {
          goTo(i);
          resetAutoplay();
        });
      }(idx));

      dotsWrap.appendChild(dot);
    });

    /* Store length for goTo() wrapping */
    buildSlider._length = SLIDES.length;
  }


  /* ══════════════════════════════════════════════════════════════
     TRANSITIONS — opacity fade only
  ══════════════════════════════════════════════════════════════ */
  function goTo(index) {
    var slideCount = buildSlider._length || document.querySelectorAll('.hero-slide').length;
    if (isTransitioning || index === current) return;
    isTransitioning = true;

    var slides = document.querySelectorAll('.hero-slide');
    var dots   = document.querySelectorAll('.hero-dot');

    /* Deactivate current */
    if (slides[current]) slides[current].classList.remove('is-active');
    if (dots[current])   { dots[current].classList.remove('is-active'); dots[current].setAttribute('aria-selected', 'false'); }

    current = ((index % slideCount) + slideCount) % slideCount;

    /* Activate next */
    if (slides[current]) slides[current].classList.add('is-active');
    if (dots[current])   { dots[current].classList.add('is-active'); dots[current].setAttribute('aria-selected', 'true'); }

    /* Unlock after CSS transition (matches opacity 1.4s) */
    setTimeout(function () { isTransitioning = false; }, 1450);
  }

  function advance() {
    goTo(current + 1);
  }


  /* ══════════════════════════════════════════════════════════════
     AUTO-PLAY
  ══════════════════════════════════════════════════════════════ */
  function startAutoplay() {
    if (timer) clearInterval(timer);
    timer = setInterval(advance, INTERVAL);
  }

  function resetAutoplay() {
    startAutoplay();
  }

  /* Pause on hover */
  function bindHoverPause() {
    var container = document.querySelector('.frame-container');
    if (!container) return;

    container.addEventListener('mouseenter', function () {
      clearInterval(timer);
    });
    container.addEventListener('mouseleave', function () {
      resetAutoplay();
    });
  }

  /* Swipe on touch devices */
  function bindSwipe() {
    var slider = document.getElementById('heroFrameSlider');
    if (!slider) return;

    var startX = null;

    slider.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });

    slider.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 40) {
        diff < 0 ? goTo(current + 1) : goTo(current - 1);
        resetAutoplay();
      }
      startX = null;
    }, { passive: true });
  }

  /* Keyboard navigation (arrows) */
  function bindKeyboard() {
    document.addEventListener('keydown', function (e) {
      var hero = document.getElementById('hero-section');
      if (!hero) return;
      if (e.key === 'ArrowRight') { goTo(current + 1); resetAutoplay(); }
      if (e.key === 'ArrowLeft')  { goTo(current - 1); resetAutoplay(); }
    });
  }


  /* ══════════════════════════════════════════════════════════════
     INIT
  ══════════════════════════════════════════════════════════════ */
  async function init() {
    var slides = await loadSlides();
    initFrameImage();
    buildSlider(slides);
    startAutoplay();
    bindHoverPause();
    bindSwipe();
    bindKeyboard();
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
