// ============================================
// TURATHYA - HERO VIDEO REPLAY ON SCROLL
// IntersectionObserver-based video control
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const heroVideo = document.getElementById('hero-video');
    const heroSection = document.querySelector('.hero');

    if (!heroVideo || !heroSection) return;

    let wasVisible = true; // Track previous visibility state

    // IntersectionObserver configuration
    const observerOptions = {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of hero is visible
    };

    // Observer callback
    const handleIntersection = (entries) => {
        entries.forEach(entry => {
            const isVisible = entry.isIntersecting;

            // Hero section became visible after being hidden
            if (isVisible && !wasVisible) {
                heroVideo.currentTime = 0; // Reset to start
                heroVideo.play().catch(() => {});
            }
            // Hero section left viewport
            else if (!isVisible && wasVisible) {
                heroVideo.pause();
            }

            // Update state
            wasVisible = isVisible;
        });
    };

    // Create observer
    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    observer.observe(heroSection);

    // Freeze on last frame when video ends
    heroVideo.addEventListener('ended', () => {
        if (heroVideo.duration) {
            heroVideo.currentTime = Math.max(0, heroVideo.duration - 0.05);
            heroVideo.pause();
        }
    });

    // Handle Reduced Motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleReducedMotion(e) {
        if (e.matches) {
            heroVideo.autoplay = false;
            heroVideo.pause();
            heroVideo.currentTime = 0;
        } else {
            if (heroVideo.paused && heroVideo.currentTime === 0) {
                heroVideo.play().catch(() => {});
            }
        }
    }

    // Initial check
    handleReducedMotion(prefersReducedMotion);

    // Listen for changes
    prefersReducedMotion.addEventListener('change', handleReducedMotion);
});
