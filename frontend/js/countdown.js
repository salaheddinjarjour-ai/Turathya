// ============================================
// TURATHYA - COUNTDOWN TIMER
// Real-time countdown for auctions and lots
// ============================================

class CountdownTimer {
    constructor(endDate, element, options = {}) {
        this.endDate = new Date(endDate);
        this.element = element;
        this.options = {
            onEnd: options.onEnd || null,
            onUpdate: options.onUpdate || null,
            compact: options.compact || false
        };
        this.interval = null;
        this.prevValues = null;
        this.parts = {};
        this.init();
    }

    init() {
        if (!this.options.compact && this.element) {
            this.renderFullSkeleton();
        }
        this.update();
        this.interval = setInterval(() => this.update(), 1000);
    }

    update() {
        const now = new Date();
        const diff = this.endDate - now;

        if (diff <= 0) {
            this.stop();
            if (this.element) {
                const endedText = (typeof i18n !== 'undefined' && i18n?.t)
                    ? i18n.t('time.ended')
                    : 'Ended';
                this.element.innerHTML = `<span class="text-muted">${endedText}</span>`;
            }
            if (this.options.onEnd) {
                this.options.onEnd();
            }
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (this.element) {
            if (this.options.compact) {
                this.renderCompact(days, hours, minutes, seconds);
            } else {
                this.renderFull(days, hours, minutes, seconds);
            }
        }

        if (this.options.onUpdate) {
            this.options.onUpdate({ days, hours, minutes, seconds, diff });
        }
    }

    renderFull(days, hours, minutes, seconds) {
        if (!this.element) return;

        if (!this.parts || !this.parts.days) {
            this.renderFullSkeleton();
        }

        const shouldAnimate = {
            days: this.prevValues ? this.prevValues.days !== days : false,
            hours: this.prevValues ? this.prevValues.hours !== hours : false,
            minutes: this.prevValues ? this.prevValues.minutes !== minutes : false,
            seconds: this.prevValues ? this.prevValues.seconds !== seconds : false
        };

        this.updatePart('days', String(days), shouldAnimate.days, days <= 0);
        this.updatePart('hours', String(hours).padStart(2, '0'), shouldAnimate.hours);
        this.updatePart('minutes', String(minutes).padStart(2, '0'), shouldAnimate.minutes);
        this.updatePart('seconds', String(seconds).padStart(2, '0'), shouldAnimate.seconds);

        this.prevValues = { days, hours, minutes, seconds };
    }

    renderFullSkeleton() {
        if (!this.element) return;

        const label = (key, fallback) => (typeof i18n !== 'undefined' && i18n?.t) ? i18n.t(key) : fallback;

        this.element.innerHTML = `
            <div class="countdown">
                <div class="countdown-item countdown-item--hidden" data-unit="days">
                    <span class="countdown-value"><span class="countdown-digits"></span></span>
                    <span class="countdown-label">${label('time.days', 'Days')}</span>
                </div>
                <div class="countdown-item" data-unit="hours">
                    <span class="countdown-value"><span class="countdown-digits"></span></span>
                    <span class="countdown-label">${label('time.hours', 'Hours')}</span>
                </div>
                <div class="countdown-item" data-unit="minutes">
                    <span class="countdown-value"><span class="countdown-digits"></span></span>
                    <span class="countdown-label">${label('time.minutes', 'Minutes')}</span>
                </div>
                <div class="countdown-item" data-unit="seconds">
                    <span class="countdown-value"><span class="countdown-digits"></span></span>
                    <span class="countdown-label">${label('time.seconds', 'Seconds')}</span>
                </div>
            </div>
        `;

        ['days', 'hours', 'minutes', 'seconds'].forEach((unit) => {
            const item = this.element.querySelector(`.countdown-item[data-unit="${unit}"]`);
            const digitsContainer = item?.querySelector('.countdown-digits');
            this.parts[unit] = { item, digitsContainer, digitSlots: [] };
        });

        this.ensureDigitSlots('days', 1, '0');
        this.ensureDigitSlots('hours', 2, '00');
        this.ensureDigitSlots('minutes', 2, '00');
        this.ensureDigitSlots('seconds', 2, '00');
    }

    updatePart(unit, value, animate, hidden = false) {
        const part = this.parts[unit];
        if (!part || !part.item || !part.digitsContainer) return;

        part.item.classList.toggle('countdown-item--hidden', hidden);
        if (hidden) return;

        const nextValue = String(value);
        const minDigits = unit === 'days' ? nextValue.length : 2;
        this.ensureDigitSlots(unit, minDigits, nextValue);

        const slots = part.digitSlots;
        const currentValue = slots.map((slot) => slot.current.textContent).join('');
        const paddedNext = nextValue.padStart(slots.length, '0');

        for (let index = 0; index < slots.length; index += 1) {
            const slot = slots[index];
            const targetDigit = paddedNext[index];
            const currentDigit = slot.current.textContent;

            if (!animate || currentValue === paddedNext || currentDigit === targetDigit) {
                slot.current.textContent = targetDigit;
                slot.next.textContent = targetDigit;
                slot.roll.classList.remove('is-animating');
                slot.roll.onanimationend = null;
                continue;
            }

            slot.next.textContent = targetDigit;
            slot.roll.classList.remove('is-animating');
            void slot.roll.offsetWidth;
            slot.roll.classList.add('is-animating');

            slot.roll.onanimationend = () => {
                slot.current.textContent = targetDigit;
                slot.next.textContent = targetDigit;
                slot.roll.classList.remove('is-animating');
                slot.roll.onanimationend = null;
            };
        }
    }

    ensureDigitSlots(unit, requiredCount, initialValue = '') {
        const part = this.parts[unit];
        if (!part || !part.digitsContainer) return;

        const targetCount = Math.max(requiredCount, 1);
        const existing = part.digitSlots || [];

        if (existing.length > targetCount) {
            for (let index = existing.length - 1; index >= targetCount; index -= 1) {
                const slot = existing[index];
                slot.wrapper.remove();
                existing.splice(index, 1);
            }
        }

        while (existing.length < targetCount) {
            const slot = this.createDigitSlot();
            part.digitsContainer.prepend(slot.wrapper);
            existing.unshift(slot);
        }

        const paddedInitial = String(initialValue || '').padStart(targetCount, '0').slice(-targetCount);
        existing.forEach((slot, index) => {
            const digit = paddedInitial[index] || '0';
            if (!slot.current.textContent) {
                slot.current.textContent = digit;
                slot.next.textContent = digit;
            }
        });

        part.digitSlots = existing;
    }

    createDigitSlot() {
        const wrapper = document.createElement('span');
        wrapper.className = 'countdown-digit';

        const roll = document.createElement('span');
        roll.className = 'countdown-roll';

        const current = document.createElement('span');
        current.className = 'countdown-current';

        const next = document.createElement('span');
        next.className = 'countdown-next';

        roll.appendChild(current);
        roll.appendChild(next);
        wrapper.appendChild(roll);

        return { wrapper, roll, current, next };
    }

    renderCompact(days, hours, minutes, seconds) {
        let text = '';
        if (days > 0) {
            text = `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            text = `${hours}h ${minutes}m ${seconds}s`;
        } else {
            text = `${minutes}m ${seconds}s`;
        }
        this.element.textContent = text;
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    destroy() {
        this.stop();
        if (this.element) {
            this.element.innerHTML = '';
        }
    }
}

// ==================== HELPER FUNCTIONS ====================

function initCountdowns() {
    const countdownElements = document.querySelectorAll('[data-countdown]');
    const timers = [];

    countdownElements.forEach(element => {
        const endDate = element.getAttribute('data-countdown');
        const compact = element.hasAttribute('data-compact');

        const timer = new CountdownTimer(endDate, element, {
            compact,
            onEnd: () => {
                // Reload data or update UI when auction ends
                if (element.hasAttribute('data-reload-on-end')) {
                    location.reload();
                }
            }
        });

        timers.push(timer);
    });

    return timers;
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', initCountdowns);
