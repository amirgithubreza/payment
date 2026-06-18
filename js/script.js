'use strict';

/* ── STATE ──────────────────────────────── */
const S = {
    method: 'offline',
    gateway: 'zarinpal',
    couponApplied: false,
    discountPct: 0,
    basePrice: 5120000,
    taxRate: 0.09,
    couponAmt: 512000,
    saving: 1880000,
    searchOpen: false,
};

const COUPONS = ['MEHR1404', 'PISHTAZ50', 'WELCOME20', 'NOWRUZ25', 'VIP10', 'PHOTO10', 'PTZ20'];
const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

/* ── SEARCH ─────────────────────────────── */
const searchToggle = $('searchToggle');
const searchInput = $('searchInput');
const searchClose = $('searchClose');

if (searchToggle && searchInput && searchClose) {
    searchToggle.addEventListener('click', () => {
        S.searchOpen = !S.searchOpen;
        searchInput.classList.toggle('active', S.searchOpen);
        searchClose.classList.toggle('show', S.searchOpen);
        if (S.searchOpen) setTimeout(() => searchInput.focus(), 100);
    });

    searchClose.addEventListener('click', () => {
        S.searchOpen = false;
        searchInput.classList.remove('active');
        searchClose.classList.remove('show');
        searchInput.value = '';
    });

    searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) showToast(`جستجو: "${q}"`, 'info');
        }
        if (e.key === 'Escape') searchClose.click();
    });
}

/* ── METHOD TABS ────────────────────────── */
$$('#methodTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        $$('#methodTabs .tab-btn').forEach(b => b.classList.remove('active'));
        $$('.panel').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        S.method = this.dataset.method;
        $('panel-' + S.method).classList.add('active');
        updatePayBtn();
    });
});

function updatePayBtn() {
    const labels = {
        online: 'پرداخت امن آنلاین',
        offline: 'ثبت فیش واریزی'
    };
    const btn = $('payBtnLabel');
    if (btn) btn.innerHTML = labels[S.method] || labels.offline;
}

/* ── GATEWAY SELECT ─────────────────────── */
$$('#gatewayGrid .gw-opt').forEach(opt => {
    opt.addEventListener('click', function () {
        $$('#gatewayGrid .gw-opt').forEach(o => o.classList.remove('chosen'));
        this.classList.add('chosen');
        this.querySelector('input[type="radio"]').checked = true;
        S.gateway = this.dataset.gw;
        const showCard = ['zarinpal', 'idpay', 'nextpay', 'mellat', 'saman'].includes(S.gateway);
        const cardSection = $('cardFormSection');
        if (cardSection) cardSection.classList.toggle('show', showCard);
    });
});

/* ── CARD FORMATTING ────────────────────── */
const cardNumber = $('cardNumber');
if (cardNumber) {
    cardNumber.addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = v.replace(/(\d{4})(?=\d)/g, '$1-');
        const brands = $$('#cardBrands i');
        brands.forEach(b => b.classList.remove('ab'));
        if (v.startsWith('4')) brands[0].classList.add('ab');
        else if (v.startsWith('5')) brands[1].classList.add('ab');
    });
}

const cardExpiry = $('cardExpiry');
if (cardExpiry) {
    cardExpiry.addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '').substring(0, 4);
        this.value = v.length > 2 ? v.substring(0, 2) + '/' + v.substring(2) : v;
    });
}

const cardCvv = $('cardCvv');
if (cardCvv) {
    cardCvv.addEventListener('input', function () {
        this.value = this.value.replace(/\D/g, '').substring(0, 4);
    });
}

/* ── FILE UPLOAD ────────────────────────── */
const uploadBox = $('uploadBox');
const receiptFile = $('receiptFile');
const previewImg = $('previewImg');
const removeFileBtn = $('removeFileBtn');

if (uploadBox) {
    uploadBox.addEventListener('click', () => { if (receiptFile) receiptFile.click(); });
}

if (receiptFile) {
    receiptFile.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = e => {
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            if (removeFileBtn) removeFileBtn.style.display = 'inline-block';
            if (uploadBox) uploadBox.style.display = 'none';
        };
        r.readAsDataURL(file);
    });
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        if (receiptFile) receiptFile.value = '';
        if (previewImg) {
            previewImg.style.display = 'none';
            previewImg.src = '';
        }
        if (removeFileBtn) removeFileBtn.style.display = 'none';
        if (uploadBox) uploadBox.style.display = 'block';
    });
}

/* ── PRICING ────────────────────────────── */
function calcFinal() {
    const disc = S.couponApplied ? S.couponAmt : 0;
    const after = S.basePrice - disc;
    const tax = Math.round(after * S.taxRate);
    return { disc, after, tax, final: after + tax };
}

function toman(n) { return n.toLocaleString('fa-IR'); }

function updatePrices() {
    const { disc, tax, final } = calcFinal();
    const taxEl = $('taxDisplay');
    const totalEl = $('totalAmountEl');
    const savingEl = $('savingAmtEl');
    const couponLine = $('couponSummLine');
    const couponDisp = $('couponSavingDisp');

    if (taxEl) taxEl.textContent = toman(tax) + ' ت';
    if (totalEl) totalEl.textContent = toman(final);

    if (disc > 0) {
        if (couponDisp) couponDisp.textContent = '− ' + toman(disc) + ' ت';
        if (couponLine) {
            couponLine.style.maxHeight = '40px';
            couponLine.style.opacity = '1';
        }
        if (savingEl) savingEl.textContent = toman(S.saving + disc);
    } else {
        if (savingEl) savingEl.textContent = toman(S.saving);
        if (couponLine) {
            couponLine.style.maxHeight = '0';
            couponLine.style.opacity = '0';
        }
    }

    const wordsEl = $('totalWords');
    if (wordsEl) {
        const num = calcFinal().final;
        const w = numberToWords(num);
        wordsEl.textContent = w + ' تومان';
    }
}

function numberToWords(n) {
    const units = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
    const teens = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
    const tens = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
    const scales = ['', 'هزار', 'میلیون', 'میلیارد'];

    if (n === 0) return 'صفر';
    let parts = [];
    let num = Math.floor(n);
    let scaleIdx = 0;
    while (num > 0) {
        let chunk = num % 1000;
        if (chunk > 0) {
            let chunkStr = '';
            let h = Math.floor(chunk / 100);
            let r = chunk % 100;
            if (h > 0) {
                chunkStr += (h === 1 ? 'صد' : units[h] + 'صد');
                if (r > 0) chunkStr += ' و ';
            }
            if (r > 0) {
                if (r < 10) {
                    chunkStr += units[r];
                } else if (r < 20) {
                    chunkStr += teens[r - 10];
                } else {
                    let t = Math.floor(r / 10);
                    let u = r % 10;
                    chunkStr += tens[t];
                    if (u > 0) chunkStr += ' و ' + units[u];
                }
            }
            if (scaleIdx > 0) chunkStr += ' ' + scales[scaleIdx];
            parts.unshift(chunkStr);
        }
        num = Math.floor(num / 1000);
        scaleIdx++;
    }
    return parts.join(' و ');
}

/* ── COUPON ─────────────────────────────── */
const couponInput = $('couponInput');
const couponOk = $('couponOk');
const couponErr = $('couponErr');
const couponBtn = $('couponBtn');
const couponBtnTxt = $('couponBtnTxt');

if (couponInput) {
    couponInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyCoupon(); });
    couponInput.addEventListener('input', () => {
        if (!S.couponApplied) {
            if (couponOk) couponOk.classList.remove('show');
            if (couponErr) couponErr.classList.remove('show');
        }
    });
}

function applyCoupon() {
    if (S.couponApplied) return;
    if (!couponInput) return;
    const code = couponInput.value.trim().toUpperCase();
    if (couponOk) couponOk.classList.remove('show');
    if (couponErr) couponErr.classList.remove('show');
    if (!code) { shakeEl(couponInput); return; }
    if (couponBtnTxt) couponBtnTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> بررسی...';
    if (couponBtn) couponBtn.disabled = true;

    setTimeout(() => {
        if (COUPONS.includes(code)) {
            S.couponApplied = true;
            if (couponOk) {
                couponOk.innerHTML =
                    `<i class="fa-solid fa-circle-check"></i> کد <strong>${code}</strong> اعمال شد — <strong>${toman(S.couponAmt)}</strong> تومان تخفیف گرفتید!`;
                couponOk.classList.add('show');
            }
            if (couponInput) {
                couponInput.disabled = true;
                couponInput.style.opacity = '.55';
            }
            if (couponBtnTxt) couponBtnTxt.innerHTML = 'اعمال شد';
            if (couponBtn) couponBtn.style.cursor = 'default';
            updatePrices();
            showToast('کد تخفیف با موفقیت اعمال شد! 🎉', 'success');
        } else {
            if (couponErr) couponErr.classList.add('show');
            shakeEl(couponInput);
            if (couponBtnTxt) couponBtnTxt.innerHTML = '<i class="fa-solid fa-check-circle"></i> اعمال';
            if (couponBtn) couponBtn.disabled = false;
        }
    }, 800);
}
window.applyCoupon = applyCoupon;

function shakeEl(el) {
    if (!el) return;
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}

/* ── FORM VALIDATION ────────────────────── */
const FIELDS = [
    { id: 'fname', errId: 'fname-err', test: v => v.length >= 2 },
    { id: 'lname', errId: 'lname-err', test: v => v.length >= 2 },
    { id: 'phone', errId: 'phone-err', test: v => /^09\d{9}$/.test(v) },
    // { id: 'email', errId: 'email-err', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
];

FIELDS.forEach(({ id, errId, test }) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('blur', () => validateField(el, test, errId));
    el.addEventListener('input', () => {
        if (el.classList.contains('invalid')) validateField(el, test, errId);
    });
});

function validateField(el, test, errId) {
    const ok = test(el.value.trim());
    el.classList.toggle('invalid', !ok);
    el.classList.toggle('valid', ok);
    const e = $(errId);
    if (e) e.classList.toggle('show', !ok);
    return ok;
}

function validateAll() {
    let ok = true;
    FIELDS.forEach(({ id, errId, test }) => {
        const el = $(id);
        if (el && !validateField(el, test, errId)) ok = false;
    });
    return ok;
}

/* ── PAYMENT FLOW ───────────────────────── */
function startPayment() {
    const chk = $('termsChk');
    if (!chk || !chk.checked) {
        const termsBox = $('termsBox');
        if (termsBox) {
            termsBox.classList.add('highlight');
            termsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => termsBox.classList.remove('highlight'), 2800);
        }
        showToast('لطفاً قوانین و مقررات را تأیید کنید.', 'error');
        return;
    }

    if (!validateAll()) {
        const first = document.querySelector('.form-input.invalid');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('لطفاً اطلاعات فرم را کامل و صحیح وارد کنید.', 'error');
        return;
    }

    // اگر روش آنلاین باشد، کارت رو اعتبارسنجی کن
    if (S.method === 'online') {
        const cardSection = $('cardFormSection');
        if (cardSection && cardSection.classList.contains('show')) {
            const cn = $('cardNumber');
            const cvv = $('cardCvv');
            const exp = $('cardExpiry');
            if (!cn || cn.value.replace(/\D/g, '').length < 16) {
                showToast('لطفاً شماره کارت ۱۶ رقمی را وارد کنید.', 'error');
                if (cn) cn.focus();
                return;
            }
            if (!exp || !/^\d{2}\/\d{2}$/.test(exp.value.trim())) {
                showToast('لطفاً تاریخ انقضای کارت را صحیح وارد کنید.', 'error');
                if (exp) exp.focus();
                return;
            }
            if (!cvv || cvv.value.trim().length < 3) {
                showToast('لطفاً کد CVV2 را وارد کنید.', 'error');
                if (cvv) cvv.focus();
                return;
            }
        } else {
            showToast('لطفاً درگاه پرداخت را انتخاب کنید.', 'error');
            return;
        }
    }

    // روش آفلاین
    if (S.method === 'offline') {
        const offDate = $('offDate');
        const offTime = $('offTime');
        const offRef = $('offRef');
        if (!offDate || !offTime || !offRef || !offDate.value.trim() || !offTime.value.trim() || !offRef.value
            .trim()) {
            showToast('لطفاً تمام فیلدهای واریز را تکمیل کنید.', 'error');
            return;
        }
        if (!receiptFile || !receiptFile.files || !receiptFile.files[0]) {
            showToast('لطفاً فیش واریزی را بارگذاری کنید.', 'error');
            return;
        }
    }

    // بارگذاری
    const ov = $('loadingOv');
    if (ov) ov.classList.add('on');
    const bar = $('loadBarFill');
    if (bar) bar.style.width = '0%';
    ['ls1', 'ls2', 'ls3'].forEach(id => {
        const el = $(id);
        if (el) { el.classList.remove('active', 'done'); }
    });

    const steps = [
        { id: 'ls1', txt: 'تأیید اطلاعات سفارش', delay: 0, end: 35 },
        { id: 'ls2', txt: 'برقراری ارتباط امن SSL', delay: 800, end: 72 },
        { id: 'ls3', txt: 'انتقال به درگاه پرداخت', delay: 1700, end: 100 }
    ];

    let tick = 0;
    const iv = setInterval(() => {
        tick += 2;
        if (bar) bar.style.width = Math.min(tick, 95) + '%';
        steps.forEach(s => {
            const el = $(s.id);
            if (tick >= s.end - 1 && el && !el.classList.contains('done')) {
                el.classList.remove('active');
                el.classList.add('done');
                el.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--green)"></i> ' + s
                    .txt;
            }
        });
    }, 50);

    steps.forEach(s => {
        setTimeout(() => {
            const el = $(s.id);
            if (el) {
                el.classList.add('active');
                el.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--purple)"></i> ' +
                    s.txt;
            }
        }, s.delay);
    });

    setTimeout(() => {
        clearInterval(iv);
        if (bar) bar.style.width = '100%';
        setTimeout(() => {
            if (ov) ov.classList.remove('on');
            const tc = $('trackCode');
            if (tc) tc.textContent = 'PTZ-' + Date.now().toString().slice(-8);
            const modal = $('modalOv');
            if (modal) modal.classList.add('on');
        }, 350);
    }, 2700);
}
window.startPayment = startPayment;

function closeModal() {
    const modal = $('modalOv');
    if (modal) modal.classList.remove('on');
}

function goToPanel() {
    showToast('در حال انتقال به پنل کاربری...', 'success');
    closeModal();
}
window.closeModal = closeModal;
window.goToPanel = goToPanel;

const modalOv = $('modalOv');
if (modalOv) {
    modalOv.addEventListener('click', e => { if (e.target === modalOv) closeModal(); });
}
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); if (S.searchOpen && searchClose) searchClose.click(); }
});

/* ── COPY ───────────────────────────────── */
function copyText(text, label) {
    navigator.clipboard.writeText(text).then(() =>
        showToast(`<i class="fa-solid fa-copy"></i> ${label || ''} کپی شد`, 'success')
    );
}
window.copyText = copyText;

/* ── TOAST ──────────────────────────────── */
function showToast(msg, type = 'info') {
    const c = $('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    const cls = { error: 't-error', success: 't-success', info: '' };
    t.className = 'toast ' + (cls[type] || '');
    const ico = { error: 'fa-circle-exclamation', success: 'fa-circle-check', info: 'fa-circle-info' };
    t.innerHTML = `<i class="fa-solid ${ico[type] || ico.info}"></i><span>${msg}</span>`;
    c.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    setTimeout(() => {
        t.classList.remove('show');
        t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 3200);
}
window.showToast = showToast;

/* ── INIT ───────────────────────────────── */
updatePrices();
updatePayBtn();