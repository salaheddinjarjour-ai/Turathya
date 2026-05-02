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
  var SLIDES = [
    {
      src:   'assets/images/hero-slide-painting.jpg',
      label: 'Fine Art',
      title: 'European Old Masters — Spring Edition',
      bid:   'Opening from SAR 4,200'
    },
    {
      src:   'assets/images/hero-slide-furniture.jpg',
      label: 'Antique Furniture',
      title: 'Ottoman & Levantine Interiors',
      bid:   'Current Bid: SAR 11,500'
    },
    {
      src:   'assets/images/hero-slide-jewelry.jpg',
      label: 'Rare Jewellery',
      title: 'Signed Pieces & Precious Gems',
      bid:   'Estimate: SAR 8,000 – 22,000'
    },
    {
      src:   'assets/images/hero-slide-ceramics.jpg',
      label: 'Ceramics & Porcelain',
      title: 'East Asian & Iznik Ceramics',
      bid:   'Opening from SAR 1,800'
    }
  ];


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
  var BORDER = {
    top:    0.14,   /* 14% inset → matches ornate-frame-new.png top border   */
    bottom: 0.18,   /* 18% inset → bottom border slightly taller (ornamental) */
    left:   0.12,   /* 12% inset → left border                                */
    right:  0.12    /* 12% inset → right border                               */
  };

  function positionSlider() {
    var frameImg = document.getElementById('heroFrameImage');
    var inner    = document.querySelector('.frame-inner');
    if (!frameImg || !inner) return;

    var fw = frameImg.offsetWidth;    /* rendered frame width  */
    var fh = frameImg.offsetHeight;   /* rendered frame height */
    if (!fw || !fh) return;           /* image not yet painted */

    /* Exact pixel coordinates of the inner opening */
    var top    = Math.round(fh * BORDER.top);
    var left   = Math.round(fw * BORDER.left);
    var width  = Math.round(fw * (1 - BORDER.left  - BORDER.right));
    var height = Math.round(fh * (1 - BORDER.top   - BORDER.bottom));

    inner.style.top       = top    + 'px';
    inner.style.left      = left   + 'px';
    inner.style.width     = width  + 'px';
    inner.style.height    = height + 'px';
    inner.style.right     = 'auto';   /* clear CSS inset — avoid conflict with width  */
    inner.style.bottom    = 'auto';   /* clear CSS inset — avoid conflict with height */
    inner.style.transform = 'none';   /* override any residual CSS centring           */
  }

  /* Re-measure on every resize (frame width is fluid / clamp) */
  window.addEventListener('resize', positionSlider);

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
  function buildSlider() {
    var slider   = document.getElementById('heroFrameSlider');
    var dotsWrap = document.getElementById('heroSliderDots');
    if (!slider || !dotsWrap || SLIDES.length === 0) return;

    slider.innerHTML   = '';
    dotsWrap.innerHTML = '';

    SLIDES.forEach(function (slide, idx) {
      var isFirst = idx === 0;

      /* ── Slide element ── */
      var el = document.createElement('div');
      el.className = 'hero-slide' + (isFirst ? ' is-active' : '');
      el.setAttribute('role', 'tabpanel');
      el.setAttribute('aria-label', slide.title);

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
      overlay.appendChild(bid);

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
  }


  /* ══════════════════════════════════════════════════════════════
     TRANSITIONS — opacity fade only
  ══════════════════════════════════════════════════════════════ */
  function goTo(index) {
    if (isTransitioning || index === current) return;
    isTransitioning = true;

    var slides = document.querySelectorAll('.hero-slide');
    var dots   = document.querySelectorAll('.hero-dot');

    /* Deactivate current */
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('is-active');
    dots[current].setAttribute('aria-selected', 'false');

    current = (index + SLIDES.length) % SLIDES.length;

    /* Activate next */
    slides[current].classList.add('is-active');
    dots[current].classList.add('is-active');
    dots[current].setAttribute('aria-selected', 'true');

    /* Unlock after CSS transition (matches opacity 1.4s) */
    setTimeout(function () {
      isTransitioning = false;
    }, 1450);
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
  function init() {
    initFrameImage();   /* measure frame → set exact px position  */
    buildSlider();      /* inject slides + dots                    */
    startAutoplay();    /* begin auto-play                         */
    bindHoverPause();   /* pause on hover                          */
    bindSwipe();        /* swipe support                           */
    bindKeyboard();     /* arrow key navigation                    */
  }

  /* Run after DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
