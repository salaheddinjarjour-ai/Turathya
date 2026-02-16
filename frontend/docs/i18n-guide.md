# TURATHYA Internationalization (i18n) Guide

## Overview
The TURATHYA website now supports English and Arabic with full RTL (Right-to-Left) support for Arabic. The system uses a lightweight, custom i18n module that loads translations dynamically and applies them using data attributes.

## Quick Start

### 1. Include Required Files
Add these to your HTML `<head>`:

```html
<!-- RTL CSS -->
<link rel="stylesheet" href="css/rtl.css">
<!-- Language Toggle Component CSS -->
<link rel="stylesheet" href="css/components/lang-toggle.css">

<!-- i18n Module (before other scripts) -->
<script src="js/i18n.js"></script>
```

### 2. Add Language Toggle to Navigation
```html
<nav class="nav">
  <!-- Your nav links -->
  
  <!-- Language Toggle -->
  <div class="lang-toggle-container">
    <a href="#" class="lang-toggle" data-lang="en" aria-label="Switch to English">EN</a>
    <a href="#" class="lang-toggle" data-lang="ar" aria-label="التبديل إلى العربية">العربية</a>
  </div>
</nav>
```

### 3. Mark Content for Translation
Use `data-i18n` attributes on elements:

```html
<!-- Text Content -->
<h1 data-i18n="hero.title">Curated timed auctions</h1>
<p data-i18n="hero.subtitle">Discover exceptional pieces</p>

<!-- Placeholders -->
<input type="text" data-i18n-placeholder="forms.emailPlaceholder" placeholder="Enter your email">

<!-- Aria Labels -->
<button data-i18n-aria="buttons.close" aria-label="Close">×</button>

<!-- Titles -->
<abbr data-i18n-title="auction.estimate" title="Estimate">EST</abbr>

<!-- Alt Text -->
<img data-i18n-alt="auction.featured" alt="Featured Auction" src="...">

<!-- Button Values -->
<input type="submit" data-i18n-value="buttons.submit" value="Submit">
```

## Translation Keys Structure

Translations are organized in nested JSON objects:

```json
{
  "nav": { "home": "Home", "auctions": "Auctions" },
  "hero": { "title": "...", "subtitle": "..." },
  "auction": { "currentBid": "Current Bid", "estimate": "Estimate" },
  "buttons": { "submit": "Submit", "cancel": "Cancel" },
  "forms": { "email": "Email", "emailPlaceholder": "Enter your email" }
}
```

Access nested keys with dot notation: `data-i18n="nav.home"`

## Using i18n in JavaScript

The global `i18n` object provides helper methods:

```javascript
// Get a translation
const title = i18n.t('hero.title');

// Format numbers
const formatted = i18n.formatNumber(1234567); // "1,234,567" or "١٬٢٣٤٬٥٦٧"

// Format currency
const price = i18n.formatCurrency(5000, 'USD'); // "$5,000.00" or "US$ ٥٬٠٠٠٫٠٠"

// Format dates
const date = i18n.formatDate('2024-12-25'); // "December 25, 2024" or "٢٥ ديسمبر ٢٠٢٤"

// Format relative time
const relative = i18n.formatRelativeTime('2024-12-25'); // "in 2 days" or "خلال يومين"

// Get current language
const currentLang = i18n.currentLang; // 'en' or 'ar'

// Listen for language changes
window.addEventListener('languageChanged', (e) => {
  console.log('Language changed to:', e.detail.lang);
  // Re-render dynamic content
});
```

## Dynamic Content Translation

For content generated in JavaScript:

```javascript
function renderAuction(auction) {
  return `
    <div class="auction-card">
      <h3>${auction.title}</h3>
      <p data-i18n="auction.currentBid">${i18n.t('auction.currentBid')}</p>
      <span class="price">${i18n.formatCurrency(auction.currentBid)}</span>
      <button data-i18n="buttons.placeBid">${i18n.t('buttons.placeBid')}</button>
    </div>
  `;
}

// After rendering, apply translations
document.getElementById('container').innerHTML = renderAuction(auction);
i18n.translatePage(); // Re-translate the page
```

## RTL Styling Best Practices

### What Automatically Flips
- Text alignment
- Margins and padding (using logical properties)
- Float directions
- Navigation order
- Breadcrumbs

### What Stays the Same
- Images and media
- Most icons
- Numbers and currency
- Logos
- Gallery/grid layouts

### Custom RTL Styles
Use `body.rtl` selector:

```css
/* Specific RTL adjustments */
body.rtl .custom-element {
  margin-inline-start: 1rem; /* Use logical properties */
}

/* Keep numbers LTR in RTL */
body.rtl .price {
  direction: ltr;
  unicode-bidi: embed;
}
```

## Adding New Translations

### 1. Add to English (locales/en.json)
```json
{
  "newSection": {
    "key1": "English text",
    "key2": "More English text"
  }
}
```

### 2. Add to Arabic (locales/ar.json)
```json
{
  "newSection": {
    "key1": "النص العربي",
    "key2": "المزيد من النص العربي"
  }
}
```

### 3. Use in HTML
```html
<p data-i18n="newSection.key1">English text</p>
```

## Common Translation Keys

### Navigation
- `nav.home`, `nav.auctions`, `nav.login`, `nav.register`, `nav.account`, `nav.admin`, `nav.logout`

### Buttons
- `buttons.submit`, `buttons.cancel`, `buttons.save`, `buttons.delete`, `buttons.edit`, `buttons.create`

### Forms
- `forms.email`, `forms.password`, `forms.emailPlaceholder`, `forms.passwordPlaceholder`

### Auction
- `auction.currentBid`, `auction.startingBid`, `auction.estimate`, `auction.placeBid`, `auction.lots`

### Time
- `time.days`, `time.hours`, `time.minutes`, `time.seconds`, `time.ended`, `time.endsIn`

### Common
- `common.loading`, `common.success`, `common.error`, `common.yes`, `common.no`

## Testing

### Manual Testing
1. Open the website
2. Click the language toggle (EN/العربية)
3. Verify:
   - All text translates correctly
   - Layout switches to RTL for Arabic
   - Numbers and currency remain LTR
   - Language preference persists on page reload

### Browser Testing
Test in multiple browsers:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers

### RTL Testing Checklist
- [ ] Text aligns correctly
- [ ] Navigation reverses properly
- [ ] Forms are usable
- [ ] Tables display correctly
- [ ] Modals and dropdowns position correctly
- [ ] Icons and images don't flip incorrectly
- [ ] Numbers and currency stay LTR

## Troubleshooting

### Translations Not Showing
1. Check browser console for errors
2. Verify JSON files are valid (use JSONLint)
3. Ensure i18n.js loads before other scripts
4. Check that translation keys match exactly (case-sensitive)

### RTL Layout Issues
1. Verify `css/rtl.css` is loaded
2. Check that `body.rtl` class is applied
3. Use browser DevTools to inspect CSS
4. Ensure logical properties are used (margin-inline, padding-inline)

### Language Not Persisting
1. Check localStorage in DevTools
2. Verify `localStorage.getItem('lang')` returns correct value
3. Clear browser cache and try again

## Performance

The i18n system is lightweight:
- Translation files: ~13KB each (gzipped: ~3KB)
- i18n.js module: ~6KB (gzipped: ~2KB)
- RTL CSS: ~8KB (gzipped: ~2KB)
- Total overhead: ~22KB uncompressed, ~7KB gzipped

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11+ (with polyfills for fetch and Intl)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

Potential improvements:
- Add more languages (French, Spanish, etc.)
- Lazy load translation files
- Translation management UI for admins
- Automatic language detection based on browser settings
- Pluralization support
- Date/time formatting with timezone support
