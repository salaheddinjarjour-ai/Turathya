/**
 * TURATHYA Theme Manager
 * Handles identifying, applying, and persisting theme validation.
 */

const ThemeManager = {
    // Default theme based on original design
    defaultTheme: {
        '--theme-bg': '#F4F1EA',        // Refined Ivory
        '--theme-surface': '#FFFFFF',   // White
        '--theme-surface-2': '#E6DFD2', // Parchment
        '--theme-text': '#262626',      // Charcoal
        '--theme-text-muted': '#8C8C8C',// Grey
        '--theme-accent': '#2F4F3E',    // Deep Olive
        '--theme-accent-2': '#3E6B55',  // Olive Light
        '--theme-border': '#D8D2C6',    // Border
        '--theme-success': '#3E6B55',
        '--theme-error': '#9C4F4F',
        '--theme-warning': '#7A6A3A'
    },

    // Theme Version for cache busting/migration
    themeVersion: '2.0-olive',

    /**
     * Initialize theme system
     * Runs on page load to apply saved theme
     */
    init() {
        const savedTheme = localStorage.getItem('site_theme');
        const savedVersion = localStorage.getItem('theme_version');

        // Detection for old gold theme values
        // Only migrate if we detect the old Antique Gold specific hex
        const hasGoldValues = savedTheme && savedTheme.includes('#B8956A');

        // Force migration if version doesn't match AND we detect old gold
        // OR if there is no saved version but we see gold
        if ((savedTheme && hasGoldValues) || (savedTheme && savedVersion !== this.themeVersion)) {
            try {
                // Check parsed object for specific gold keys if needed, but string check is faster for legacy detection
                const parsed = JSON.parse(savedTheme);
                if (parsed['--theme-accent'] === '#B8956A' || parsed['--theme-accent'] === '#d4af37') {
                    console.log('Old Gold Theme detected. Migrating to Deep Olive.');
                    this.saveTheme(this.defaultTheme);
                } else {
                    // It's a custom theme (not gold), so we preserve it but update version
                    this.applyTheme(parsed);
                    localStorage.setItem('theme_version', this.themeVersion);
                }
            } catch (e) {
                console.error('Failed to parse saved theme', e);
                this.resetTheme();
            }
        } else if (!savedTheme) {
            // First visit or cleared cache
            this.saveTheme(this.defaultTheme);
        } else {
            // Up to date
            this.applyTheme(JSON.parse(savedTheme));
        }
    },

    /**
     * Apply a theme object to the document root
     * @param {Object} theme - Key-value pairs of CSS variables
     */
    applyTheme(theme) {
        const root = document.documentElement;
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    },

    /**
     * Reset to default theme
     */
    resetTheme() {
        const root = document.documentElement;
        // Remove inline styles to revert to CSS file defaults
        Object.keys(this.defaultTheme).forEach(key => {
            root.style.removeProperty(key);
        });
        localStorage.removeItem('site_theme');
    },

    /**
     * Get current effective theme
     */
    getCurrentTheme() {
        const savedTheme = localStorage.getItem('site_theme');
        return savedTheme ? JSON.parse(savedTheme) : this.defaultTheme;
    },

    /**
     * Save theme to local storage
     * @param {Object} theme 
     */
    saveTheme(theme) {
        localStorage.setItem('site_theme', JSON.stringify(theme));
        localStorage.setItem('theme_version', this.themeVersion);
        this.applyTheme(theme);
    }
};

// Auto-init on load
// We use a self-executing function to avoid polluting global namespace too much,
// but expose ThemeManager for the editor.
window.ThemeManager = ThemeManager;
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
});
