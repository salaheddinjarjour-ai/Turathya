/**
 * TURATHYA I18n System
 * Handles language switching, RTL/LTR, and translations
 */

class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('lang') || 'ar';
        this.translations = {};
        this.translationCache = {};
        this.fallbackLang = 'en';
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;

        // ── Failsafe: always reveal the page, even if init() crashes ──
        const _reveal = () => document.documentElement.classList.remove('i18n-pending');
        const _failsafe = setTimeout(_reveal, 1500);

        try {
            // Apply language immediately (before translations load)
            this.applyLanguage(this.currentLang);

            // Load header partial first
            await this.loadHeader();
            await this.loadFooter();

            // Then load translations
            await this.loadTranslations(this.currentLang);
            await this.ensureFallbackTranslations();

            // Translate page content
            this.translatePage();

            // Setup language toggle
            this.setupLanguageToggle();

            this.isInitialized = true;
        } finally {
            // Remove pending class to reveal content (whether success or error)
            clearTimeout(_failsafe);
            _reveal();

            window.dispatchEvent(new CustomEvent('i18nReady', {
                detail: { lang: this.currentLang }
            }));
        }
    }

    async loadHeader() {
        const headerContainer = document.getElementById('site-header');
        if (!headerContainer) return;

        try {
            // With clean URLs all pages are at root level — always fetch from /partials/
            const response = await fetch(`/partials/header.html?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Header not found');

            const html = await response.text();
            headerContainer.innerHTML = html;

            // Update navigation links — always absolute clean URLs
            this.updateNavigationPaths(false, '');


            // Set active nav link based on current page
            this.setActiveNavLink();

            // Update header auth state (show/hide login/logout buttons)
            if (typeof updateHeaderAuthState === 'function') {
                updateHeaderAuthState();
            }

            // Init user dropdown menu after header is injected
            if (typeof initUserMenu === 'function') {
                initUserMenu();
            }

            // ── Mobile Menu Overlay ──────────────────────────────────
            const mobileToggle  = document.querySelector('.mobile-menu-toggle');
            const mobileOverlay = document.getElementById('mobile-menu-overlay');
            const mobileClose   = document.querySelector('.mobile-menu-close');

            function openMobileMenu() {
                if (!mobileOverlay) return;
                mobileOverlay.classList.add('open');
                document.body.classList.add('menu-open');
                if (mobileToggle) {
                    mobileToggle.classList.add('is-active');
                    mobileToggle.setAttribute('aria-expanded', 'true');
                }
            }

            function closeMobileMenu() {
                if (!mobileOverlay) return;
                mobileOverlay.classList.remove('open');
                document.body.classList.remove('menu-open');
                if (mobileToggle) {
                    mobileToggle.classList.remove('is-active');
                    mobileToggle.setAttribute('aria-expanded', 'false');
                }
            }

            if (mobileToggle) {
                mobileToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mobileOverlay && mobileOverlay.classList.contains('open')
                        ? closeMobileMenu()
                        : openMobileMenu();
                });
            }

            if (mobileClose) {
                mobileClose.addEventListener('click', closeMobileMenu);
            }

            // Close when any mobile nav link is clicked
            if (mobileOverlay) {
                mobileOverlay.querySelectorAll('.mobile-nav-link').forEach(link => {
                    link.addEventListener('click', closeMobileMenu);
                });

                // Close on Escape key
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape') closeMobileMenu();
                });
            }
            // ────────────────────────────────────────────────────────
        } catch (error) {
            console.error('Failed to load header:', error);
        }
    }

    updateNavigationPaths(isInSubdir, basePath = '') {
        // With clean URLs all pages live at root level (/auctions, /collection, etc.)
        // Use absolute paths so links work correctly from any page depth.
        const links = {
            'logo-link':          '/',
            'auctions-link':      '/auctions',
            'collection-link':    '/collection',
            'about-link':         '/about-us',
            'contact-link':       '/contact',
            'account-link':       '/account',
            'admin-link':         '/admin',
            'login-link':         '/login',
            'register-link':      '/register',
            // User menu dropdown
            'user-login-link':    '/login',
            'user-register-link': '/register',
            'user-forgot-link':   '/login?forgot=1',
            // Mobile overlay mirrors
            'm-auctions-link':    '/auctions',
            'm-collection-link':  '/collection',
            'm-about-link':       '/about-us',
            'm-contact-link':     '/contact',
            'm-account-link':     '/account',
            'm-admin-link':       '/admin',
            'm-login-link':       '/login',
            'm-register-link':    '/register'
        };

        Object.entries(links).forEach(([id, href]) => {
            const link = document.getElementById(id);
            if (link) link.setAttribute('href', href);
        });

        // Logo: always use absolute path
        const logoImg = document.querySelector('.logo img');
        if (logoImg) {
            logoImg.src = '/assets/images/logo_burgundy.png';
        }
    }


    async loadFooter() {
        const footerContainer = document.getElementById('site-footer');
        if (!footerContainer) return;

        try {
            // With clean URLs all pages are at root level — always fetch from /partials/
            const response = await fetch(`/partials/footer.html?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Footer not found');

            const html = await response.text();
            footerContainer.innerHTML = html;

            // Footer links that are already absolute (/about-us, /contact etc.)
            // work correctly from any page — no path manipulation needed.
            // Only fix relative links (without leading /) that might remain.
            const links = footerContainer.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href
                    && !href.startsWith('http')
                    && !href.startsWith('#')
                    && !href.startsWith('/')
                    && !href.startsWith('mailto:')
                ) {
                    // Make relative link absolute
                    link.setAttribute('href', '/' + href);
                }
            });

        } catch (error) {
            console.error('Failed to load footer:', error);
        }
    }

    setActiveNavLink() {
        const currentPath = window.location.pathname.toLowerCase();
        const currentFile = currentPath.split('/').pop() || '/';
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href) return;
            const linkFile = href.split('/').pop().split('?')[0];
            if (linkFile && currentFile === linkFile) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async loadTranslations(lang) {
        try {
            if (this.translationCache[lang]) {
                this.translations = this.translationCache[lang];
                return;
            }

            // With clean URLs, always load translations from /locales/ (absolute)
            const response = await fetch(`/locales/${lang}.json?v=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${lang} translations`);
            }
            const loadedTranslations = await response.json();
            this.translationCache[lang] = loadedTranslations;
            this.translations = loadedTranslations;
        } catch (error) {
            console.error('Translation load error:', error);
            if (lang !== this.fallbackLang) {
                await this.loadTranslations(this.fallbackLang);
            }
        }
    }

    async ensureFallbackTranslations() {
        if (this.translationCache[this.fallbackLang]) return;

        const previousTranslations = this.translations;
        await this.loadTranslations(this.fallbackLang);
        this.translationCache[this.fallbackLang] = this.translations;
        this.translations = previousTranslations;
    }

    applyLanguage(lang) {
        this.currentLang = lang;

        // Set document attributes
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        // Toggle RTL class on body
        if (lang === 'ar') {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }

        // Save to localStorage
        localStorage.setItem('lang', lang);
    }

    async switchLanguage(lang) {
        if (lang === this.currentLang) return;

        this.applyLanguage(lang);
        await this.loadTranslations(lang);
        await this.ensureFallbackTranslations();
        this.translatePage();
        this.updateLanguageToggle();

        // Dispatch event for other scripts
        window.dispatchEvent(new CustomEvent('languageChanged', {
            detail: { lang }
        }));
    }

    translatePage() {
        // Translate text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                el.textContent = translation;
            }
        });

        // Translate placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                el.placeholder = translation;
            }
        });

        // Translate aria-labels
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.getAttribute('data-i18n-aria');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                el.setAttribute('aria-label', translation);
            }
        });

        // Translate titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                el.title = translation;
            }
        });

        // Translate alt text
        document.querySelectorAll('[data-i18n-alt]').forEach(el => {
            const key = el.getAttribute('data-i18n-alt');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                el.alt = translation;
            }
        });

        // Translate values
        document.querySelectorAll('[data-i18n-value]').forEach(el => {
            const key = el.getAttribute('data-i18n-value');
            const translation = this.getTranslation(key);
            if (translation && translation !== key) {
                el.value = translation;
            }
        });
    }

    getTranslation(key) {
        const keys = key.split('.');

        const resolveFromObject = (source) => {
            let value = source;

            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = value[k];
                } else {
                    return null;
                }
            }

            return value;
        };

        const primaryValue = resolveFromObject(this.translations);
        if (primaryValue !== null && primaryValue !== undefined) {
            return primaryValue;
        }

        const fallbackSource = this.translationCache[this.fallbackLang];
        const fallbackValue = fallbackSource ? resolveFromObject(fallbackSource) : null;
        if (fallbackValue !== null && fallbackValue !== undefined) {
            return fallbackValue;
        }

        return key;
    }

    // Helper method for JavaScript usage
    t(key) {
        return this.getTranslation(key);
    }

    setupLanguageToggle() {
        const toggles = document.querySelectorAll('.lang-toggle');

        toggles.forEach(toggle => {
            toggle.addEventListener('click', async (e) => {
                e.preventDefault();
                const lang = toggle.getAttribute('data-lang');
                await this.switchLanguage(lang);
            });
        });

        this.updateLanguageToggle();
    }

    updateLanguageToggle() {
        const toggles = document.querySelectorAll('.lang-toggle');

        toggles.forEach(toggle => {
            const lang = toggle.getAttribute('data-lang');
            if (lang === this.currentLang) {
                toggle.classList.add('active');
            } else {
                toggle.classList.remove('active');
            }
        });
    }

    // Formatting helpers
    formatNumber(number) {
        return new Intl.NumberFormat(this.currentLang).format(number);
    }

    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat(this.currentLang, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat(this.currentLang, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(new Date(date));
    }

    formatRelativeTime(date) {
        const rtf = new Intl.RelativeTimeFormat(this.currentLang, { numeric: 'auto' });
        const diff = new Date(date) - new Date();
        const days = Math.round(diff / (1000 * 60 * 60 * 24));

        if (Math.abs(days) < 1) {
            const hours = Math.round(diff / (1000 * 60 * 60));
            return rtf.format(hours, 'hour');
        }

        return rtf.format(days, 'day');
    }
}

// Initialize i18n when DOM is ready
// Initialize i18n when DOM is ready
window.i18n = new I18n();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.i18n.init());
} else {
    window.i18n.init();
}
