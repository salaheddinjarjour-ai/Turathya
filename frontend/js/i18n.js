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

        // Remove pending class to reveal content
        document.documentElement.classList.remove('i18n-pending');

        window.dispatchEvent(new CustomEvent('i18nReady', {
            detail: { lang: this.currentLang }
        }));
    }

    async loadHeader() {
        const headerContainer = document.getElementById('site-header');
        if (!headerContainer) return;

        try {
            // Determine root path based on current location
            const path = window.location.pathname;
            let basePath = '';

            if (path.includes('/pages/info/') || path.includes('\\pages\\info\\')) {
                basePath = '../../';
            } else if (path.includes('/pages/') || path.includes('\\pages\\')) {
                basePath = '../';
            }

            const response = await fetch(`${basePath}partials/header.html?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Header not found');

            const html = await response.text();
            headerContainer.innerHTML = html;

            // Update navigation links based on current directory
            const isInSubdir = basePath !== '';
            this.updateNavigationPaths(isInSubdir, basePath);

            // Set active nav link based on current page
            this.setActiveNavLink();

            // Update header auth state (show/hide login/logout buttons)
            if (typeof updateHeaderAuthState === 'function') {
                updateHeaderAuthState();
            }

            // Mobile Menu Toggle Logic
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            const mainNav = document.getElementById('main-nav');

            if (mobileToggle && mainNav) {
                mobileToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mainNav.classList.toggle('active');
                });

                // Close menu when clicking outside
                document.addEventListener('click', (e) => {
                    if (mainNav.classList.contains('active') &&
                        !mainNav.contains(e.target) &&
                        !mobileToggle.contains(e.target)) {
                        mainNav.classList.remove('active');
                    }
                });

                // Close menu when clicking a link
                mainNav.querySelectorAll('a').forEach(link => {
                    link.addEventListener('click', () => {
                        mainNav.classList.remove('active');
                    });
                });
            }
        } catch (error) {
            console.error('Failed to load header:', error);
        }
    }

    updateNavigationPaths(isInSubdir, basePath = '') {
        // If basePath is provided (e.g. '../../'), use it for root links.
        // If not, calculate default behavior.
        if (basePath === '' && isInSubdir) basePath = '../';

        const rootPath = basePath;
        const pagesPath = basePath + 'pages/';

        // Update links
        const links = {
            'logo-link': `${rootPath}index.html`,
            'auctions-link': `${pagesPath}auctions.html`,
            'collection-link': `${pagesPath}collection.html`,
            'account-link': `${pagesPath}account.html`,
            'admin-link': `${pagesPath}admin.html`,
            'login-link': `${pagesPath}login.html`,
            'register-link': `${pagesPath}register.html`
        };

        Object.entries(links).forEach(([id, href]) => {
            const link = document.getElementById(id);
            if (link) link.setAttribute('href', href);
        });

        // Update Logo Image Path
        const logoImg = document.querySelector('.logo img');
        if (logoImg) {
            const path = window.location.pathname;
            // Check if we are on the landing page (root index.html or just /)
            // and NOT in a subdirectory
            const isLandingData = document.body.dataset.page === 'landing'; // Best practice if we add data-page
            // Fallback to path check if data attribute missing
            const isLandingPath = !isInSubdir && (path.endsWith('index.html') || path.endsWith('/') || path.endsWith('TURATHYA/'));

            if (isLandingPath) {
                logoImg.src = `${rootPath}assets/images/Beigelogo.png`;
                // Optional: Add a class to help with styling if dimensions differ
                logoImg.classList.add('landing-logo');
            } else {
                logoImg.src = `${rootPath}assets/images/zauction-logo-new.png`;
                logoImg.classList.remove('landing-logo');
            }
        }
    }


    async loadFooter() {
        const footerContainer = document.getElementById('site-footer');
        if (!footerContainer) return;

        try {
            // Determine root path based on current location
            // Simple heuristic: count depth from root
            // We assume frontend/ is root. 
            // paths: /index.html (depth 0), /pages/auctions.html (depth 1), /pages/info/about.html (depth 2)

            const path = window.location.pathname;
            // Determine depth by checking for /pages/ and /info/
            let rootPath = './';
            if (path.includes('/pages/info/') || path.includes('\\pages\\info\\')) {
                rootPath = '../../';
            } else if (path.includes('/pages/') || path.includes('\\pages\\')) {
                rootPath = '../';
            }

            const response = await fetch(`${rootPath}partials/footer.html?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error('Footer not found');

            const html = await response.text();
            footerContainer.innerHTML = html;

            // Update footer links to be relative to current page
            // The partial has links like "pages/info/about.html" (relative to root)
            // We need to prepend rootPath to them?
            // If rootPath is './', links are "pages/info/..." (Correct for index.html)
            // If rootPath is '../', links become "../pages/info/..."
            // From pages/auctions.html: "../pages/info/about.html" -> goes up to root, then down to pages/info. Correct.
            // If rootPath is '../../', links become "../../pages/info/..."
            // From pages/info/about.html: "../../pages/info/about.html" -> goes up to root, then down. Correct.

            const links = footerContainer.querySelectorAll('a');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:')) {
                    link.setAttribute('href', rootPath + href);
                }
            });

        } catch (error) {
            console.error('Failed to load footer:', error);
        }
    }

    setActiveNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && currentPath.endsWith(href)) {
                link.classList.add('active');
            }
        });
    }

    async loadTranslations(lang) {
        try {
            if (this.translationCache[lang]) {
                this.translations = this.translationCache[lang];
                return;
            }

            // Determine root path based on current location
            const path = window.location.pathname;
            let basePath = '';

            if (path.includes('/pages/info/') || path.includes('\\pages\\info\\')) {
                basePath = '../../';
            } else if (path.includes('/pages/') || path.includes('\\pages\\')) {
                basePath = '../';
            }

            const response = await fetch(`${basePath}locales/${lang}.json?v=${new Date().getTime()}`);
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
