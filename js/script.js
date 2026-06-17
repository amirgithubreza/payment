'use strict';

/* ── STATE ──────────────────────────────── */
const S = {
    method: 'online',
    gateway: 'zarinpal',
    couponApplied: false,
    discountPct: 0,
    basePrice: 5120000,
    taxRate: 0.09,
    couponAmt: 512000,
    saving: 1880000,
    timerSecs: 15 * 60,
    timerInterval: null,
    searchOpen: false,
};

const COUPONS = ['MEHR1404', 'PISHTAZ50', 'WELCOME20', 'NOWRUZ25', 'VIP10', 'PHOTO10', 'PTZ20'];
const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

/* ── SEARCH ─────────────────────────────── */
const searchToggle = $('searchToggle');
const searchInput = $('searchInput');
const searchClose = $('searchClose');

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

/* ── METHOD TABS ────────────────────────── */
$$('#methodTabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        $$('#methodTabs .tab-btn').forEach(b => b.classList.remove('active'));
        $$('.panel').forEach(p => p.classList.remove('active'));
        this.classList.add('active');
        S.method = this.dataset.method;
        $('panel-' + S.method).classList.add('active');
        updatePayBtn();
        updateInstallment();
    });
});

function updatePayBtn() {
    const labels = {
        online: '<i class="fa-solid fa-lock"></i> پرداخت امن آنلاین',
        offline: '<i class="fa-solid fa-upload"></i> ثبت فیش واریزی',
        installment: '<i class="fa-solid fa-calendar-check"></i> درخواست پرداخت اقساطی'
    };
    $('payBtnLabel').innerHTML = labels[S.method] || labels.online;
}

/* ── GATEWAY SELECT ─────────────────────── */
$$('#gatewayGrid .gw-opt').forEach(opt => {
    opt.addEventListener('click', function () {
        $$('#gatewayGrid .gw-opt').forEach(o => o.classList.remove('chosen'));
        this.classList.add('chosen');
        this.querySelector('input[type="radio"]').checked = true;
        S.gateway = this.dataset.gw;
        const showCard = ['zarinpal', 'idpay', 'nextpay', 'mellat', 'saman'].includes(S.gateway);
        $('cardFormSection').classList.toggle('show', showCard);
    });
});

/* ── CARD FORMATTING ────────────────────── */
$('cardNumber').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 16);
    this.value = v.replace(/(\d{4})(?=\d)/g, '$1-');
    const brands = $$('#cardBrands i');
    brands.forEach(b => b.classList.remove('ab'));
    if (v.startsWith('4')) brands[0].classList.add('ab');
    else if (v.startsWith('5')) brands[1].classList.add('ab');
});

$('cardExpiry').addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').substring(0, 4);
    this.value = v.length > 2 ? v.substring(0, 2) + '/' + v.substring(2) : v;
});

$('cardCvv').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').substring(0, 4);
});

/* ── FILE UPLOAD ────────────────────────── */
const uploadBox = $('uploadBox'),
    receiptFile = $('receiptFile'),
    previewImg = $('previewImg'),
    removeFileBtn = $('removeFileBtn');

uploadBox.addEventListener('click', () => receiptFile.click());

receiptFile.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = e => {
        previewImg.src = e.target.result;
        previewImg.style.display = 'block';
        removeFileBtn.style.display = 'inline-block';
        uploadBox.style.display = 'none';
    };
    r.readAsDataURL(file);
});

removeFileBtn.addEventListener('click', () => {
    receiptFile.value = '';
    previewImg.style.display = 'none';
    removeFileBtn.style.display = 'none';
    uploadBox.style.display = 'block';
});

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
    $('taxDisplay').textContent = toman(tax) + ' ت';
    $('totalAmountEl').textContent = toman(final);
    if (disc > 0) {
        $('couponSavingDisp').textContent = '− ' + toman(disc) + ' ت';
        const line = $('couponSummLine');
        line.style.maxHeight = '40px';
        line.style.opacity = '1';
        $('savingAmtEl').textContent = toman(S.saving + disc);
    } else {
        $('savingAmtEl').textContent = toman(S.saving);
    }
    updateInstallment();
}

function updateInstallment() {
    const { final } = calcFinal();
    $('instAmount').textContent = toman(Math.round(final / 4));
}

/* ── COUPON ─────────────────────────────── */
const couponInput = $('couponInput'),
    couponOk = $('couponOk'),
    couponErr = $('couponErr'),
    couponBtn = $('couponBtn'),
    couponBtnTxt = $('couponBtnTxt');

couponInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyCoupon(); });
couponInput.addEventListener('input', () => {
    if (!S.couponApplied) {
        couponOk.classList.remove('show');
        couponErr.classList.remove('show');
    }
});

function applyCoupon() {
    if (S.couponApplied) return;
    const code = couponInput.value.trim().toUpperCase();
    couponOk.classList.remove('show');
    couponErr.classList.remove('show');
    if (!code) { shakeEl(couponInput); return; }
    couponBtnTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> بررسی...';
    couponBtn.disabled = true;
    setTimeout(() => {
        if (COUPONS.includes(code)) {
            S.couponApplied = true;
            couponOk.innerHTML =
                `<i class="fa-solid fa-circle-check"></i> کد <strong>${code}</strong> اعمال شد — <strong>${toman(S.couponAmt)}</strong> تومان تخفیف گرفتید!`;
            couponOk.classList.add('show');
            couponInput.disabled = true;
            couponInput.style.opacity = '.55';
            couponBtnTxt.innerHTML = '<i class="fa-solid fa-check-double"></i> اعمال شد';
            couponBtn.style.cursor = 'default';
            updatePrices();
            showToast('کد تخفیف با موفقیت اعمال شد! 🎉', 'success');
        } else {
            couponErr.classList.add('show');
            shakeEl(couponInput);
            couponBtnTxt.innerHTML = '<i class="fa-solid fa-check-circle"></i> اعمال';
            couponBtn.disabled = false;
        }
    }, 800);
}
window.applyCoupon = applyCoupon;

function shakeEl(el) {
    el.classList.add('shake');
    el.addEventListener('animationend', () => el.classList.remove('shake'), { once: true });
}

/* ── TIMER ──────────────────────────────── */
(function initTimer() {
    const el = $('timerEl');

    function render() {
        const m = String(Math.floor(S.timerSecs / 60)).padStart(2, '0');
        const s = String(S.timerSecs % 60).padStart(2, '0');
        el.textContent = m + ':' + s;
        el.classList.toggle('urgent', S.timerSecs <= 60);
    }
    render();
    S.timerInterval = setInterval(() => {
        if (S.timerSecs <= 0) {
            clearInterval(S.timerInterval);
            el.textContent = '00:00'; return;
        }
        S.timerSecs--;
        render();
    }, 1000);
})();

/* ── FORM VALIDATION ────────────────────── */
const FIELDS = [
    { id: 'fname', errId: 'fname-err', test: v => v.length >= 2 },
    { id: 'lname', errId: 'lname-err', test: v => v.length >= 2 },
    { id: 'phone', errId: 'phone-err', test: v => /^09\d{9}$/.test(v) },
    { id: 'email', errId: 'email-err', test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
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
    if (!chk.checked) {
        $('termsBox').classList.add('highlight');
        chk.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => $('termsBox').classList.remove('highlight'), 2800);
        showToast('لطفاً قوانین و مقررات را تأیید کنید.', 'error');
        return;
    }
    if (!validateAll()) {
        const first = document.querySelector('.form-input.invalid');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('لطفاً اطلاعات فرم را کامل و صحیح وارد کنید.', 'error');
        return;
    }
    if (S.method === 'offline') {
        const d = $('offDate').value.trim(),
            t = $('offTime').value.trim(),
            r = $('offRef').value.trim();
        if (!d || !t || !r || !receiptFile.files[0]) {
            showToast('لطفاً تمام فیلدها و فیش واریزی را تکمیل کنید.', 'error');
            return;
        }
    }
    if (S.method === 'online' && $('cardFormSection').classList.contains('show')) {
        const cn = $('cardNumber').value.replace(/\D/g, '');
        if (cn.length < 16) {
            showToast('لطفاً شماره کارت ۱۶ رقمی را وارد کنید.', 'error');
            $('cardNumber').focus(); return;
        }
        const ex = $('cardExpiry').value.trim();
        if (!/^\d{2}\/\d{2}$/.test(ex)) {
            showToast('لطفاً تاریخ انقضای کارت را صحیح وارد کنید.', 'error');
            $('cardExpiry').focus(); return;
        }
        if ($('cardCvv').value.trim().length < 3) {
            showToast('لطفاً کد CVV2 را وارد کنید.', 'error');
            $('cardCvv').focus(); return;
        }
    }

    // Go
    const ov = $('loadingOv');
    ov.classList.add('on');
    $('loadBarFill').style.width = '0%';
    ['ls1', 'ls2', 'ls3'].forEach(id => { $(id).classList.remove('active', 'done'); });

    const steps = [
        { id: 'ls1', txt: 'تأیید اطلاعات سفارش', delay: 0, end: 35 },
        { id: 'ls2', txt: 'برقراری ارتباط امن SSL', delay: 800, end: 72 },
        { id: 'ls3', txt: 'انتقال به درگاه پرداخت', delay: 1700, end: 100 }
    ];

    let tick = 0;
    const bar = $('loadBarFill');
    const iv = setInterval(() => {
        tick += 2;
        bar.style.width = Math.min(tick, 95) + '%';
        steps.forEach(s => {
            if (tick >= s.end - 1 && !$(s.id).classList.contains('done')) {
                $(s.id).classList.remove('active');
                $(s.id).classList.add('done');
                $(s.id).innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--green)"></i> ' + s
                    .txt;
            }
        });
    }, 50);

    steps.forEach(s => {
        setTimeout(() => {
            $(s.id).classList.add('active');
            $(s.id).innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="color:var(--purple)"></i> ' +
                s.txt;
        }, s.delay);
    });

    setTimeout(() => {
        clearInterval(iv);
        bar.style.width = '100%';
        setTimeout(() => {
            ov.classList.remove('on');
            $('trackCode').textContent = 'PTZ-' + Date.now().toString().slice(-8);
            $('modalOv').classList.add('on');
        }, 350);
    }, 2700);
}
window.startPayment = startPayment;

function closeModal() { $('modalOv').classList.remove('on'); }

function goToPanel() {
    showToast('در حال انتقال به پنل کاربری...', 'success');
    closeModal();
}
window.closeModal = closeModal;
window.goToPanel = goToPanel;

$('modalOv').addEventListener('click', e => { if (e.target === $('modalOv')) closeModal(); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); if (S.searchOpen) searchClose.click(); }
});

/* ── COPY ───────────────────────────────── */
function copyText(text, label) {
    navigator.clipboard.writeText(text).then(() => showToast(`<i class="fa-solid fa-copy"></i> ${label || ''} کپی شد`,
        'success'));
}
window.copyText = copyText;

/* ── TOAST ──────────────────────────────── */
function showToast(msg, type = 'info') {
    const c = $('toastContainer');
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