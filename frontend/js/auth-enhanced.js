/* ═══════════════════════════════════════════════════
   TURATHYA — Auth Enhancements
   Country Selector · Password Toggle · OTP Inputs
   ═══════════════════════════════════════════════════ */

const TURATHYA_COUNTRIES = [
  { flag:'🇸🇦', name:'السعودية',    nameEn:'Saudi Arabia',  code:'+966' },
  { flag:'🇦🇪', name:'الإمارات',    nameEn:'UAE',            code:'+971' },
  { flag:'🇰🇼', name:'الكويت',      nameEn:'Kuwait',         code:'+965' },
  { flag:'🇶🇦', name:'قطر',         nameEn:'Qatar',          code:'+974' },
  { flag:'🇧🇭', name:'البحرين',     nameEn:'Bahrain',        code:'+973' },
  { flag:'🇴🇲', name:'عُمان',       nameEn:'Oman',           code:'+968' },
  { flag:'🇯🇴', name:'الأردن',      nameEn:'Jordan',         code:'+962' },
  { flag:'🇱🇧', name:'لبنان',       nameEn:'Lebanon',        code:'+961' },
  { flag:'🇸🇾', name:'سوريا',       nameEn:'Syria',          code:'+963' },
  { flag:'🇮🇶', name:'العراق',      nameEn:'Iraq',           code:'+964' },
  { flag:'🇾🇪', name:'اليمن',       nameEn:'Yemen',          code:'+967' },
  { flag:'🇵🇸', name:'فلسطين',      nameEn:'Palestine',      code:'+970' },
  { flag:'🇪🇬', name:'مصر',         nameEn:'Egypt',          code:'+20'  },
  { flag:'🇱🇾', name:'ليبيا',       nameEn:'Libya',          code:'+218' },
  { flag:'🇹🇳', name:'تونس',        nameEn:'Tunisia',        code:'+216' },
  { flag:'🇩🇿', name:'الجزائر',     nameEn:'Algeria',        code:'+213' },
  { flag:'🇲🇦', name:'المغرب',      nameEn:'Morocco',        code:'+212' },
  { flag:'🇸🇩', name:'السودان',     nameEn:'Sudan',          code:'+249' },
  { flag:'🇸🇴', name:'الصومال',     nameEn:'Somalia',        code:'+252' },
  { flag:'🇹🇷', name:'تركيا',       nameEn:'Turkey',         code:'+90'  },
  { flag:'🇬🇧', name:'بريطانيا',    nameEn:'United Kingdom', code:'+44'  },
  { flag:'🇺🇸', name:'أمريكا',      nameEn:'United States',  code:'+1'   },
  { flag:'🇩🇪', name:'ألمانيا',     nameEn:'Germany',        code:'+49'  },
  { flag:'🇫🇷', name:'فرنسا',       nameEn:'France',         code:'+33'  },
];

/* ─── Country Selector ─────────────────────────────── */
function buildCountrySelector(btnId, dropdownId, hiddenId) {
  const btn      = document.getElementById(btnId);
  const dropdown = document.getElementById(dropdownId);
  const hidden   = document.getElementById(hiddenId);
  if (!btn || !dropdown || !hidden) return;

  const isAr = document.documentElement.lang === 'ar';

  /* render list */
  function renderList(filter = '') {
    const q = filter.toLowerCase();
    const matches = TURATHYA_COUNTRIES.filter(c =>
      c.code.includes(q) ||
      c.name.includes(filter) ||
      c.nameEn.toLowerCase().includes(q)
    );
    dropdown.querySelector('.country-list').innerHTML = matches.map((c, i) => `
      <div class="country-option ${c.code === hidden.value ? 'selected' : ''}"
           data-code="${c.code}" data-flag="${c.flag}" tabindex="0"
           role="option" aria-selected="${c.code === hidden.value}">
        <span class="o-flag">${c.flag}</span>
        <span class="o-name">${isAr ? c.name : c.nameEn}</span>
        <span class="o-code">${c.code}</span>
      </div>`).join('');

    dropdown.querySelectorAll('.country-option').forEach(opt => {
      opt.addEventListener('click', () => selectCountry(opt));
      opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectCountry(opt); });
    });
  }

  function selectCountry(opt) {
    const code = opt.dataset.code;
    const flag = opt.dataset.flag;
    hidden.value = code;
    btn.querySelector('.c-flag').textContent = flag;
    btn.querySelector('.c-code').textContent = code;
    btn.setAttribute('aria-expanded', 'false');
    dropdown.classList.remove('open');
    dropdown.querySelector('.country-search input').value = '';
    renderList();
  }

  /* toggle open */
  btn.addEventListener('click', () => {
    const open = dropdown.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    if (open) {
      renderList();
      setTimeout(() => dropdown.querySelector('.country-search input')?.focus(), 50);
    }
  });

  /* close on outside click */
  document.addEventListener('click', e => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  /* search */
  dropdown.querySelector('.country-search input').addEventListener('input', e => {
    renderList(e.target.value.trim());
  });

  /* initial render with default */
  renderList();
}

/* ─── Password Toggle ──────────────────────────────── */
function initPasswordToggle(inputId, toggleId) {
  const input  = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  if (!input || !toggle) return;

  const eyeOpen = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const eyeOff  = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

  toggle.innerHTML = eyeOpen;
  toggle.setAttribute('aria-pressed', 'false');

  toggle.addEventListener('click', () => {
    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    toggle.innerHTML = visible ? eyeOpen : eyeOff;
    toggle.setAttribute('aria-pressed', String(!visible));
  });
}

/* ─── OTP Inputs (enhanced) ────────────────────────── */
function initOtpInputs(containerSelector) {
  const container = document.querySelector(containerSelector || '.otp-inputs');
  if (!container) return;
  const digits = [...container.querySelectorAll('.otp-digit')];

  digits.forEach((inp, i) => {
    /* switch to text for reliable maxlength */
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.maxLength = 1;

    inp.addEventListener('input', () => {
      inp.value = inp.value.replace(/\D/g, '').slice(-1);
      inp.classList.toggle('filled', !!inp.value);
      if (inp.value && i < digits.length - 1) digits[i + 1].focus();
    });

    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace') {
        if (!inp.value && i > 0) { digits[i - 1].value = ''; digits[i - 1].classList.remove('filled'); digits[i - 1].focus(); }
        inp.classList.remove('filled');
      }
      if (e.key === 'ArrowLeft'  && i > 0) digits[i - 1].focus();
      if (e.key === 'ArrowRight' && i < digits.length - 1) digits[i + 1].focus();
    });

    inp.addEventListener('paste', e => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      [...text].slice(0, digits.length - i).forEach((ch, j) => {
        if (digits[i + j]) { digits[i + j].value = ch; digits[i + j].classList.add('filled'); }
      });
      const next = Math.min(i + text.length, digits.length - 1);
      digits[next].focus();
    });

    inp.addEventListener('focus', () => inp.select());
  });
}

function getOtpValue(containerSelector) {
  const container = document.querySelector(containerSelector || '.otp-inputs');
  return container ? [...container.querySelectorAll('.otp-digit')].map(d => d.value).join('') : '';
}

function clearOtpInputs(containerSelector) {
  const container = document.querySelector(containerSelector || '.otp-inputs');
  if (!container) return;
  container.querySelectorAll('.otp-digit').forEach(d => { d.value = ''; d.classList.remove('filled'); });
  container.querySelector('.otp-digit')?.focus();
}

/* Build the dropdown HTML shell — call before buildCountrySelector */
function buildCountryDropdownShell(dropdownId) {
  const el = document.getElementById(dropdownId);
  if (!el) return;
  el.innerHTML = `
    <div class="country-search">
      <input type="text" placeholder="🔍 ابحث..." autocomplete="off" aria-label="Search country">
    </div>
    <div class="country-list" role="listbox"></div>`;
}
