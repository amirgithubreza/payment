'use strict';

/* ── STATE ──────────────────────────────── */
const S = {
    method: 'offline',
    gateway: 'zarinpal',
    couponApplied: false,
    couponAmt: 512000,
    searchOpen: false,
    isStep1Valid: false,
    isPaymentMethodSelected: true,
    maxQty: 50,
};

const COUPONS = ['MEHR1404', 'PISHTAZ50', 'WELCOME20', 'NOWRUZ25', 'VIP10', 'PHOTO10', 'PTZ20'];
const $ = (id) => document.getElementById(id);
const $$ = (s) => document.querySelectorAll(s);

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

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) showToast(`جستجو: "${q}"`, 'info');
        }
        if (e.key === 'Escape') searchClose.click();
    });
}

/* ── METHOD TABS ────────────────────────── */
$$('#methodTabs .tab-btn').forEach((btn) => {
    btn.addEventListener('click', function () {
        $$('#methodTabs .tab-btn').forEach((b) => b.classList.remove('active'));
        $$('.panel').forEach((p) => p.classList.remove('active'));
        this.classList.add('active');
        S.method = this.dataset.method;
        $('panel-' + S.method).classList.add('active');
        S.isPaymentMethodSelected = true;
        updateAll();
    });
});

/* ── GATEWAY SELECT ─────────────────────── */
$$('#gatewayGrid .gw-opt').forEach((opt) => {
    opt.addEventListener('click', function () {
        $$('#gatewayGrid .gw-opt').forEach((o) => o.classList.remove('chosen'));
        this.classList.add('chosen');
        this.querySelector('input[type="radio"]').checked = true;
        S.gateway = this.dataset.gw;
        const showCard = ['zarinpal', 'idpay', 'nextpay', 'mellat', 'saman'].includes(S.gateway);
        const cardSection = $('cardFormSection');
        if (cardSection) cardSection.classList.toggle('show', showCard);
        S.isPaymentMethodSelected = true;
    });
});

/* ── CARD FORMATTING ────────────────────── */
const cardNumber = $('cardNumber');
if (cardNumber) {
    cardNumber.addEventListener('input', function () {
        let v = this.value.replace(/\D/g, '').substring(0, 16);
        this.value = v.replace(/(\d{4})(?=\d)/g, '$1-');
        const brands = $$('#cardBrands i');
        brands.forEach((b) => b.classList.remove('ab'));
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
    uploadBox.addEventListener('click', () => {
        if (receiptFile) receiptFile.click();
    });
}

if (receiptFile) {
    receiptFile.addEventListener('change', function () {
        const file = this.files[0];
        if (!file) return;
        const r = new FileReader();
        r.onload = (e) => {
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
            if (removeFileBtn) removeFileBtn.style.display = 'inline-block';
            if (uploadBox) uploadBox.style.display = 'none';
            const errEl = document.getElementById('receiptFile-err');
            if (errEl) errEl.style.display = 'none';
            checkOfflineValidation();
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
        checkOfflineValidation();
    });
}

/* ── HELPERS ────────────────────────────── */
function toman(n) {
    return n.toLocaleString('fa-IR');
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
                chunkStr += h === 1 ? 'صد' : units[h] + 'صد';
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

function getPersianDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return {
        date: `${year}/${month}/${day}`,
        time: `${hours}:${minutes}`,
        full: `${year}/${month}/${day} - ${hours}:${minutes}`
    };
}

/* ── CART MANAGEMENT ────────────────────── */
let cartItems = [
    {
        id: 1,
        name: 'دوره جامع کنکور ریاضی',
        duration: '۱۲۰ ساعت',
        origPrice: 4800000,
        discount: 30,
        finalPrice: 3360000,
        img: 'https://images.pexels.com/photos/5212340/pexels-photo-5212340.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=80&w=120',
        instructor: 'استاد عباسی‌راد',
        qty: 1,
    },
    {
        id: 2,
        name: 'آمار و احتمال کنکور',
        duration: '۴۰ ساعت',
        origPrice: 2200000,
        discount: 20,
        finalPrice: 1760000,
        img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=120&h=80&fit=crop',
        instructor: 'استاد رضایی',
        qty: 1,
    },
    {
        id: 3,
        name: 'دوره رایگان مقدماتی',
        duration: '۱۰ ساعت',
        origPrice: 1500000,
        discount: 100,
        finalPrice: 0,
        img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&h=80&fit=crop',
        instructor: 'استاد رایگان‌پور',
        qty: 1,
    },
    {
        id: 4,
        name: 'دوره بدون تخفیف',
        duration: '۳۰ ساعت',
        origPrice: 2500000,
        discount: 0,
        finalPrice: 2500000,
        img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=120&h=80&fit=crop',
        instructor: 'استاد ثابت‌قیمت',
        qty: 1,
    },
];

/* ── RENDER FUNCTIONS ───────────────────── */
function renderCart() {
    const tbody = document.getElementById('cartBody');
    if (!tbody) return;

    if (cartItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-mute);">سبد خرید خالی است</td></tr>`;
    } else {
        tbody.innerHTML = cartItems
            .map((item) => {
                const isFree = item.finalPrice === 0;
                const hasDiscount = item.discount > 0 && !isFree;
                return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:8px;">
                <img src="${item.img}" class="course-img" alt="${item.name}" loading="lazy" />
                <div>
                  <div class="course-name">${item.name}</div>
                  <div class="course-meta">${item.instructor}</div>
                </div>
              </div>
            </td>
            <td style="color:var(--text-mute);font-size:11px;white-space:nowrap;">${item.duration}</td>
            <td>
              <div class="price-combo">
                ${hasDiscount ? `<span class="price-orig-sm">${toman(item.origPrice)} ت</span>` : ''}
                ${isFree ? '<span class="price-final-sm free">رایگان</span>' : `<span class="price-final-sm">${toman(item.finalPrice)} ت</span>`}
              </div>
            </td>
            <td>
              <div class="qty-control">
                <button class="qty-btn" data-id="${item.id}" data-action="dec" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
                <input type="text" class="qty-input" value="${item.qty}" data-id="${item.id}" readonly />
                <button class="qty-btn" data-id="${item.id}" data-action="inc" ${item.qty >= S.maxQty ? 'disabled' : ''}>+</button>
              </div>
            </td>
            <td class="row-total" data-id="${item.id}">
              ${isFree ? '<strong style="color:var(--green);">رایگان</strong>' : `<strong>${toman(item.finalPrice * item.qty)} ت</strong>`}
            </td>
            <td>
              <button class="remove-item-btn" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
            </td>
          </tr>
        `;
            })
            .join('');
    }
    updateAll();
}

function updateAll() {
    updateCartTotal();
    updateSidebar();
    updateInvoiceFinal();
}

function updateCartTotal() {
    const total = cartItems.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);
    const el = document.getElementById('cartTotal');
    if (el) el.textContent = toman(total);
}

function updateSidebar() {
    const container = document.getElementById('sidebarItems');
    if (!container) return;

    if (cartItems.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-mute);font-size:12px;padding:8px 0;">سبد خرید خالی است</p>';
    } else {
        container.innerHTML = cartItems
            .map((item) => {
                const isFree = item.finalPrice === 0;
                return `
          <div class="os-item">
            <img src="${item.img}" class="os-thumb" alt="" loading="lazy" />
            <span class="os-cname">${item.name} <span style="font-weight:400;color:var(--text-mute);font-size:10px;">×${item.qty}</span></span>
            <span class="os-cprice ${isFree ? 'free' : ''}">${isFree ? 'رایگان' : toman(item.finalPrice * item.qty) + ' ت'}</span>
          </div>
        `;
            })
            .join('');
    }

    const totalOrig = cartItems.reduce((s, i) => s + i.origPrice * i.qty, 0);
    const totalFinal = cartItems.reduce((s, i) => s + i.finalPrice * i.qty, 0);
    const totalDisc = totalOrig - totalFinal;
    const disc = S.couponApplied ? S.couponAmt : 0;
    const finalPay = totalFinal - disc;

    document.getElementById('sideOrigPrice').textContent = toman(totalOrig) + ' ت';
    document.getElementById('sideDisc').textContent = `− ${toman(totalDisc)} ت`;
    document.getElementById('sideCount').textContent = cartItems.length + ' دوره';

    // ردیف تخفیف کد (بالای تخفیف دوره‌ها)
    const couponLine = document.getElementById('sideCouponLine');
    const couponDisc = document.getElementById('sideCouponDisc');
    if (S.couponApplied && S.couponAmt) {
        couponLine.style.display = 'flex';
        couponDisc.textContent = `− ${toman(S.couponAmt)} ت`;
    } else {
        couponLine.style.display = 'none';
    }

    document.getElementById('sideTotalAmount').textContent = toman(finalPay);
    document.getElementById('sideTotalWords').textContent = numberToWords(finalPay) + ' تومان';
    document.getElementById('sideSaving').textContent = toman(totalDisc + (S.couponApplied ? S.couponAmt : 0));
}

/* ── FINAL INVOICE (مرحله ۴) ────────────── */
function updateInvoiceFinal() {
    const now = getPersianDate();

    document.getElementById('invoiceNumber').textContent = 'PTZ-' + Date.now().toString().slice(-8);
    document.getElementById('invoiceDate').textContent = `تاریخ: ${now.date}`;
    document.getElementById('invoiceTime').textContent = `ساعت: ${now.time}`;
    document.getElementById('invoicePaymentDateTime').textContent = now.full;

    document.getElementById('finalFname').textContent = document.getElementById('fname').value || '—';
    document.getElementById('finalLname').textContent = document.getElementById('lname').value || '—';
    document.getElementById('finalPhone').textContent = document.getElementById('phone').value || '—';
    document.getElementById('finalEmail').textContent = document.getElementById('email').value || '—';

    const methodMap = { offline: 'کارت به کارت', online: 'پرداخت آنلاین' };
    document.getElementById('finalMethod').textContent = methodMap[S.method] || 'کارت به کارت';

    const receiptInfo = document.getElementById('finalReceiptInfo');
    const receiptImg = document.getElementById('finalReceiptImg');
    if (S.method === 'offline') {
        const date = document.getElementById('offDate')?.value || '';
        const time = document.getElementById('offTime')?.value || '';
        const ref = document.getElementById('offRef')?.value || '';
        const fileInput = document.getElementById('receiptFile');
        if (date && time && ref && fileInput && fileInput.files && fileInput.files[0]) {
            receiptInfo.innerHTML = `
        <div><span>تاریخ واریز:</span> <span>${date}</span></div>
        <div><span>ساعت واریز:</span> <span>${time}</span></div>
        <div><span>کد پیگیری:</span> <span>${ref}</span></div>
      `;
            const reader = new FileReader();
            reader.onload = (e) => {
                receiptImg.src = e.target.result;
                receiptImg.style.display = 'block';
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            receiptInfo.innerHTML = '<div style="color:var(--text-mute);">اطلاعات واریز تکمیل نشده است</div>';
            receiptImg.style.display = 'none';
        }
    } else {
        receiptInfo.innerHTML = '<div style="color:var(--text-mute);">پرداخت آنلاین</div>';
        receiptImg.style.display = 'none';
    }

    const tbody = document.getElementById('finalInvoiceItems');
    if (!tbody) return;

    if (cartItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-mute);">سبد خرید خالی است</td></tr>`;
    } else {
        tbody.innerHTML = cartItems
            .map((item) => {
                const isFree = item.finalPrice === 0;
                const hasDiscount = item.discount > 0 && !isFree;
                return `
          <tr>
            <td class="inv-course-name" style="text-align:right;">
              ${item.name}
              <div class="inv-course-meta">${item.instructor}</div>
            </td>
            <td>${item.duration}</td>
            <td>
              ${hasDiscount || isFree ? `<span class="inv-price-orig">${toman(item.origPrice)} ت</span>` : `<span>${toman(item.origPrice)} ت</span>`}
            </td>
            <td>
              ${item.discount > 0 ? `<span class="inv-discount-badge">${item.discount}%</span>` : '<span class="inv-discount-badge zero">۰%</span>'}
            </td>
            <td>
              <span class="inv-price-final ${isFree ? 'free' : ''}">${isFree ? 'رایگان' : toman(item.finalPrice) + ' ت'}</span>
            </td>
          </tr>
        `;
            })
            .join('');
    }

    // محاسبه مجموع
    const totalOrig = cartItems.reduce((s, i) => s + i.origPrice * i.qty, 0);
    const totalFinal = cartItems.reduce((s, i) => s + i.finalPrice * i.qty, 0);
    const totalDisc = totalOrig - totalFinal;
    const disc = S.couponApplied ? S.couponAmt : 0;
    const finalPay = totalFinal - disc;
    const count = cartItems.length;

    // به‌روزرسانی عناصر فاکتور
    document.getElementById('invoiceCourseCount').textContent = count + ' دوره';
    document.getElementById('invoiceOrigTotal').textContent = toman(totalOrig) + ' ت';
    document.getElementById('invoiceDiscTotal').textContent = `− ${toman(totalDisc)} ت`;
    document.getElementById('invoiceFinalTotal').textContent = toman(finalPay);
    document.getElementById('invoiceTotalWords').textContent = numberToWords(finalPay) + ' تومان';

    // ردیف تخفیف کد (بالای تخفیف کل دوره‌ها)
    const couponRow = document.getElementById('invoiceCouponRow');
    const couponDiscEl = document.getElementById('invoiceCouponDisc');
    if (S.couponApplied && S.couponAmt) {
        couponRow.style.display = 'flex';
        couponDiscEl.textContent = `− ${toman(S.couponAmt)} ت`;
        // تخفیف کل دوره‌ها را به‌روز نگه دار (بدون احتساب تخفیف کد)
        document.getElementById('invoiceDiscTotal').textContent = `− ${toman(totalDisc)} ت`;
    } else {
        couponRow.style.display = 'none';
        document.getElementById('invoiceDiscTotal').textContent = `− ${toman(totalDisc)} ت`;
    }
}

/* ── CART EVENTS ────────────────────────── */
document.addEventListener('click', function (e) {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    const action = btn.dataset.action;
    const item = cartItems.find((i) => i.id === id);
    if (!item) return;

    if (action === 'inc') {
        if (item.qty >= S.maxQty) {
            showToast(`حداکثر تعداد مجاز ${S.maxQty} عدد است.`, 'error');
            return;
        }
        item.qty += 1;
    } else if (action === 'dec') {
        if (item.qty <= 1) return;
        item.qty -= 1;
    }
    renderCart();
});

document.addEventListener('click', function (e) {
    const btn = e.target.closest('.remove-item-btn');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    cartItems = cartItems.filter((item) => item.id !== id);
    renderCart();
    showToast('محصول از سبد خرید حذف شد.', 'info');
});

document.getElementById('addSampleBtn')?.addEventListener('click', function () {
    const sample = {
        id: Date.now(),
        name: 'دوره نمونه جدید',
        duration: '۲۰ ساعت',
        origPrice: 1200000,
        discount: 15,
        finalPrice: 1020000,
        img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=120&h=80&fit=crop',
        instructor: 'استاد نمونه',
        qty: 1,
    };
    cartItems.push(sample);
    renderCart();
    showToast('دوره نمونه به سبد خرید اضافه شد.', 'success');
});

/* ── COUPON ─────────────────────────────── */
const couponInput = $('couponInput');
const couponOk = $('couponOk');
const couponErr = $('couponErr');
const couponBtn = $('couponBtn');
const couponBtnTxt = $('couponBtnTxt');

if (couponInput) {
    couponInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applyCoupon();
    });
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
    if (!code) {
        shakeEl(couponInput);
        return;
    }
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
                couponInput.style.opacity = '0.55';
            }
            if (couponBtnTxt) couponBtnTxt.innerHTML = 'اعمال شد';
            if (couponBtn) couponBtn.style.cursor = 'default';
            updateAll();
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

/* ── FORM VALIDATION (مرحله ۱) ──────────── */
const STEP1_FIELDS = [
    { id: 'fname', errId: 'fname-err', test: (v) => v.trim().length >= 2 },
    { id: 'lname', errId: 'lname-err', test: (v) => v.trim().length >= 2 },
    { id: 'phone', errId: 'phone-err', test: (v) => /^09\d{9}$/.test(v.trim()) },
];

STEP1_FIELDS.forEach(({ id, errId, test }) => {
    const el = $(id);
    if (!el) return;

    el.addEventListener('input', () => {
        const val = el.value;
        const ok = test(val);
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !ok);
            el.classList.toggle('valid', ok);
            const e = $(errId);
            if (e) e.classList.toggle('show', !ok);
        } else {
            el.classList.remove('invalid', 'valid');
            const e = $(errId);
            if (e) e.classList.remove('show');
        }
        checkStep1Validation();
    });

    el.addEventListener('blur', () => {
        const val = el.value;
        const ok = test(val);
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !ok);
            el.classList.toggle('valid', ok);
            const e = $(errId);
            if (e) e.classList.toggle('show', !ok);
        } else {
            el.classList.remove('invalid', 'valid');
            const e = $(errId);
            if (e) e.classList.remove('show');
        }
        checkStep1Validation();
    });

    el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const val = el.value;
            const ok = test(val);
            if (val.trim().length > 0) {
                el.classList.toggle('invalid', !ok);
                el.classList.toggle('valid', ok);
                const e = $(errId);
                if (e) e.classList.toggle('show', !ok);
            } else {
                el.classList.remove('invalid', 'valid');
                const e = $(errId);
                if (e) e.classList.remove('show');
            }
            checkStep1Validation();
        }
    });
});

function validateAllStep1() {
    let ok = true;
    STEP1_FIELDS.forEach(({ id, errId, test }) => {
        const el = $(id);
        if (el) {
            const val = el.value;
            const valid = test(val);
            if (val.trim().length > 0) {
                el.classList.toggle('invalid', !valid);
                el.classList.toggle('valid', valid);
                const e = $(errId);
                if (e) e.classList.toggle('show', !valid);
                if (!valid) ok = false;
            } else {
                el.classList.remove('invalid', 'valid');
                const e = $(errId);
                if (e) e.classList.remove('show');
                ok = false;
            }
        }
    });
    return ok;
}

function checkStep1Validation() {
    const isValid = validateAllStep1();
    S.isStep1Valid = isValid;

    const nextBtn = document.getElementById('step1NextBtn');
    if (nextBtn) {
        nextBtn.disabled = !isValid;
    }

    document.querySelectorAll('.step-header .cstep').forEach((el) => {
        const step = parseInt(el.dataset.step);
        if (step > 1) {
            if (isValid) {
                el.classList.remove('disabled');
            } else {
                el.classList.add('disabled');
            }
        }
    });
}

/* ── VALIDATION OFFLINE ─────────────────── */
const OFFLINE_FIELDS = [
    { id: 'offDate', errId: 'offDate-err', test: (v) => v.trim().length > 0 },
    { id: 'offTime', errId: 'offTime-err', test: (v) => v.trim().length > 0 },
    { id: 'offRef', errId: 'offRef-err', test: (v) => v.trim().length > 0 },
];

function validateOfflineFields() {
    let ok = true;
    OFFLINE_FIELDS.forEach(({ id, errId, test }) => {
        const el = $(id);
        if (!el) return;
        const val = el.value;
        const isValid = test(val);
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !isValid);
            el.classList.toggle('valid', isValid);
            const e = $(errId);
            if (e) e.classList.toggle('show', !isValid);
        } else {
            el.classList.remove('invalid', 'valid');
            const e = $(errId);
            if (e) e.classList.remove('show');
        }
        if (!isValid) ok = false;
    });

    const fileInput = document.getElementById('receiptFile');
    const fileErr = document.getElementById('receiptFile-err');
    const hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
    if (fileErr) {
        fileErr.style.display = hasFile ? 'none' : 'block';
    }
    if (!hasFile) ok = false;

    return ok;
}

function checkOfflineValidation() {
    if (S.method !== 'offline') return true;
    return validateOfflineFields();
}

OFFLINE_FIELDS.forEach(({ id, errId, test }) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => {
        const val = el.value;
        const ok = test(val);
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !ok);
            el.classList.toggle('valid', ok);
            const e = $(errId);
            if (e) e.classList.toggle('show', !ok);
        } else {
            el.classList.remove('invalid', 'valid');
            const e = $(errId);
            if (e) e.classList.remove('show');
        }
    });
    el.addEventListener('blur', () => {
        const val = el.value;
        const ok = test(val);
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !ok);
            el.classList.toggle('valid', ok);
            const e = $(errId);
            if (e) e.classList.toggle('show', !ok);
        } else {
            el.classList.remove('invalid', 'valid');
            const e = $(errId);
            if (e) e.classList.remove('show');
        }
    });
});

/* ── STEP MANAGER ────────────────────────── */
function goToStep(step) {
    if (step < 1 || step > 4) return;

    if (step > 1 && !S.isStep1Valid) {
        showToast('لطفاً ابتدا اطلاعات کاربری را کامل کنید.', 'error');
        validateAllStep1();
        return;
    }

    if (step === 4) {
        if (!S.isPaymentMethodSelected) {
            showToast('لطفاً روش پرداخت را انتخاب کنید.', 'error');
            return;
        }
        if (S.method === 'offline') {
            const isValid = validateOfflineFields();
            if (!isValid) {
                showToast('لطفاً تمام فیلدهای واریز را تکمیل کنید و فیش را بارگذاری نمایید.', 'error');
                return;
            }
        }
        if (S.method === 'online') {
            const cardSection = document.getElementById('cardFormSection');
            if (cardSection && cardSection.classList.contains('show')) {
                const cn = document.getElementById('cardNumber');
                const cvv = document.getElementById('cardCvv');
                const exp = document.getElementById('cardExpiry');
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
            }
        }
    }

    const sidebar = document.getElementById('checkoutSidebar');
    const wrap = document.querySelector('.checkout-wrap');
    if (sidebar && wrap) {
        if (step === 4) {
            sidebar.classList.add('hidden');
            wrap.classList.add('sidebar-hidden');
        } else {
            sidebar.classList.remove('hidden');
            wrap.classList.remove('sidebar-hidden');
        }
    }

    document.querySelectorAll('.step-panel').forEach((p) => p.classList.remove('active'));
    const panel = document.querySelector(`.step-panel[data-step="${step}"]`);
    if (panel) panel.classList.add('active');

    document.querySelectorAll('.step-header .cstep').forEach((el) => {
        const s = parseInt(el.dataset.step);
        el.classList.remove('active', 'done');
        if (s === step) el.classList.add('active');
        else if (s < step) el.classList.add('done');
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step === 4) updateInvoiceFinal();
}
window.goToStep = goToStep;

document.addEventListener('click', function (e) {
    const nextBtn = e.target.closest('.step-next-btn');
    if (nextBtn) {
        const next = parseInt(nextBtn.dataset.next);
        if (!isNaN(next)) {
            if (next === 4 && S.method === 'offline') {
                const isValid = validateOfflineFields();
                if (!isValid) {
                    showToast('لطفاً تمام فیلدهای واریز را تکمیل کنید و فیش را بارگذاری نمایید.', 'error');
                    return;
                }
            }
            goToStep(next);
        }
    }
    const prevBtn = e.target.closest('.step-prev-btn');
    if (prevBtn) {
        const prev = parseInt(prevBtn.dataset.prev);
        if (!isNaN(prev)) goToStep(prev);
    }
});

/* ── FINAL PAY ──────────────────────────── */
document.getElementById('finalPayBtn')?.addEventListener('click', function () {
    const chk = document.getElementById('termsChk');
    if (!chk || !chk.checked) {
        showToast('لطفاً قوانین را بپذیرید.', 'error');
        return;
    }
    const modal = document.getElementById('modalOv');
    if (modal) {
        const tc = document.getElementById('trackCode');
        if (tc) tc.textContent = 'PTZ-' + Date.now().toString().slice(-8);
        modal.classList.add('on');
    }
    showToast('پرداخت شما با موفقیت انجام شد!', 'success');
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

/* ── MODAL ───────────────────────────────── */
function closeModal() {
    const modal = $('modalOv');
    if (modal) modal.classList.remove('on');
}
window.closeModal = closeModal;

function goToPanel() {
    showToast('در حال انتقال به پنل کاربری...', 'success');
    closeModal();
}
window.goToPanel = goToPanel;

const modalOv = $('modalOv');
if (modalOv) {
    modalOv.addEventListener('click', (e) => {
        if (e.target === modalOv) closeModal();
    });
}
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        if (S.searchOpen && searchClose) searchClose.click();
    }
});









// script.js (تغییرات اصلی)

// ── COUPON ───────────────────────────────
// ... (بقیه کدها به جز توابع تغییر یافته)

function applyCoupon() {
    if (S.couponApplied) return;
    if (!couponInput) return;
    const code = couponInput.value.trim().toUpperCase();
    if (couponOk) couponOk.classList.remove('show');
    if (couponErr) couponErr.classList.remove('show');
    if (!code) {
        shakeEl(couponInput);
        return;
    }
    if (couponBtnTxt) couponBtnTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> بررسی...';
    if (couponBtn) couponBtn.disabled = true;

    setTimeout(() => {
        if (COUPONS.includes(code)) {
            S.couponApplied = true;
            if (couponOk) {
                couponOk.innerHTML = `
                    <i class="fa-solid fa-circle-check"></i> کد <strong>${code}</strong> اعمال شد — <strong>${toman(S.couponAmt)}</strong> تومان تخفیف گرفتید!
                    <button class="cancel-coupon-btn" onclick="cancelCoupon()">لغو کد</button>
                `;
                couponOk.classList.add('show');
            }
            if (couponInput) {
                couponInput.disabled = true;
                couponInput.style.opacity = '0.55';
            }
            if (couponBtnTxt) couponBtnTxt.innerHTML = 'اعمال شد';
            if (couponBtn) couponBtn.style.cursor = 'default';
            updateAll();
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

// ── CANCEL COUPON ────────────────────────
function cancelCoupon() {
    S.couponApplied = false;
    S.couponAmt = 0;
    const input = document.getElementById('couponInput');
    if (input) {
        input.disabled = false;
        input.style.opacity = '1';
        input.value = '';
    }
    const btnTxt = document.getElementById('couponBtnTxt');
    if (btnTxt) btnTxt.innerHTML = '<i class="fa-solid fa-check-circle"></i> اعمال';
    const btn = document.getElementById('couponBtn');
    if (btn) {
        btn.disabled = false;
        btn.style.cursor = 'pointer';
    }
    const ok = document.getElementById('couponOk');
    if (ok) {
        ok.classList.remove('show');
        ok.innerHTML = '';
    }
    updateAll();
    showToast('کد تخفیف لغو شد.', 'info');
}
window.cancelCoupon = cancelCoupon;
// ── UPDATE SIDEBAR ──────────────────────
function updateSidebar() {
    const container = document.getElementById('sidebarItems');
    if (!container) return;

    if (cartItems.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text-mute);font-size:12px;padding:8px 0;">سبد خرید خالی است</p>';
    } else {
        container.innerHTML = cartItems
            .map((item) => {
                const isFree = item.finalPrice === 0;
                return `
          <div class="os-item">
            <img src="${item.img}" class="os-thumb" alt="" loading="lazy" />
            <span class="os-cname">${item.name} <span style="font-weight:400;color:var(--text-mute);font-size:10px;">×${item.qty}</span></span>
            <span class="os-cprice ${isFree ? 'free' : ''}">${isFree ? 'رایگان' : toman(item.finalPrice * item.qty) + ' ت'}</span>
          </div>
        `;
            })
            .join('');
    }

    const totalOrig = cartItems.reduce((s, i) => s + i.origPrice * i.qty, 0);
    const totalFinal = cartItems.reduce((s, i) => s + i.finalPrice * i.qty, 0);
    const totalDisc = totalOrig - totalFinal;
    const disc = S.couponApplied ? S.couponAmt : 0;
    const finalPay = totalFinal - disc;

    document.getElementById('sideOrigPrice').textContent = toman(totalOrig) + ' ت';
    const totalDiscAll = totalDisc + disc;
    let discText = `− ${toman(totalDiscAll)} ت`;
    if (S.couponApplied && S.couponAmt) {
        discText += ` <span style="font-size:10px;color:var(--text-mute);">(شامل تخفیف کد: − ${toman(S.couponAmt)} ت)</span>`;
    }
    document.getElementById('sideDisc').innerHTML = discText;
    document.getElementById('sideCount').textContent = cartItems.length + ' دوره';

    // مخفی کردن ردیف تخفیف کد (چون در همان خط نمایش داده می‌شود)
    const couponLine = document.getElementById('sideCouponLine');
    if (couponLine) couponLine.style.display = 'none';

    document.getElementById('sideTotalAmount').textContent = toman(finalPay);
    document.getElementById('sideTotalWords').textContent = numberToWords(finalPay) + ' تومان';
    document.getElementById('sideSaving').textContent = toman(totalDisc + (S.couponApplied ? S.couponAmt : 0));
}

// ── FINAL INVOICE (مرحله ۴) ──────────────
function updateInvoiceFinal() {
    const now = getPersianDate();

    document.getElementById('invoiceNumber').textContent = 'PTZ-' + Date.now().toString().slice(-8);
    document.getElementById('invoiceDate').textContent = `تاریخ: ${now.date}`;
    document.getElementById('invoiceTime').textContent = `ساعت: ${now.time}`;
    document.getElementById('invoicePaymentDateTime').textContent = now.full;

    document.getElementById('finalFname').textContent = document.getElementById('fname').value || '—';
    document.getElementById('finalLname').textContent = document.getElementById('lname').value || '—';
    document.getElementById('finalPhone').textContent = document.getElementById('phone').value || '—';
    document.getElementById('finalEmail').textContent = document.getElementById('email').value || '—';

    const methodMap = { offline: 'کارت به کارت', online: 'پرداخت آنلاین' };
    document.getElementById('finalMethod').textContent = methodMap[S.method] || 'کارت به کارت';

    const receiptInfo = document.getElementById('finalReceiptInfo');
    const receiptImg = document.getElementById('finalReceiptImg');
    if (S.method === 'offline') {
        const date = document.getElementById('offDate')?.value || '';
        const time = document.getElementById('offTime')?.value || '';
        const ref = document.getElementById('offRef')?.value || '';
        const fileInput = document.getElementById('receiptFile');
        if (date && time && ref && fileInput && fileInput.files && fileInput.files[0]) {
            receiptInfo.innerHTML = `
        <div><span>تاریخ واریز:</span> <span>${date}</span></div>
        <div><span>ساعت واریز:</span> <span>${time}</span></div>
        <div><span>کد پیگیری:</span> <span>${ref}</span></div>
      `;
            const reader = new FileReader();
            reader.onload = (e) => {
                receiptImg.src = e.target.result;
                receiptImg.style.display = 'block';
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            receiptInfo.innerHTML = '<div style="color:var(--text-mute);">اطلاعات واریز تکمیل نشده است</div>';
            receiptImg.style.display = 'none';
        }
    } else {
        receiptInfo.innerHTML = '<div style="color:var(--text-mute);">پرداخت آنلاین</div>';
        receiptImg.style.display = 'none';
    }

    const tbody = document.getElementById('finalInvoiceItems');
    if (!tbody) return;

    if (cartItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--text-mute);">سبد خرید خالی است</td></tr>`;
    } else {
        tbody.innerHTML = cartItems
            .map((item) => {
                const isFree = item.finalPrice === 0;
                const hasDiscount = item.discount > 0 && !isFree;
                return `
          <tr>
            <td class="inv-course-name" style="text-align:right;">
              ${item.name}
              <div class="inv-course-meta">${item.instructor}</div>
            </td>
            <td>${item.duration}</td>
            <td>
              ${hasDiscount || isFree ? `<span class="inv-price-orig">${toman(item.origPrice)} ت</span>` : `<span>${toman(item.origPrice)} ت</span>`}
            </td>
            <td>
              ${item.discount > 0 ? `<span class="inv-discount-badge">${item.discount}%</span>` : '<span class="inv-discount-badge zero">۰%</span>'}
            </td>
            <td>
              <span class="inv-price-final ${isFree ? 'free' : ''}">${isFree ? 'رایگان' : toman(item.finalPrice) + ' ت'}</span>
            </td>
          </tr>
        `;
            })
            .join('');
    }

    // محاسبه مجموع
    const totalOrig = cartItems.reduce((s, i) => s + i.origPrice * i.qty, 0);
    const totalFinal = cartItems.reduce((s, i) => s + i.finalPrice * i.qty, 0);
    const totalDisc = totalOrig - totalFinal;
    const disc = S.couponApplied ? S.couponAmt : 0;
    const finalPay = totalFinal - disc;
    const count = cartItems.length;

    // به‌روزرسانی عناصر فاکتور
    document.getElementById('invoiceCourseCount').textContent = count + ' دوره';
    document.getElementById('invoiceOrigTotal').textContent = toman(totalOrig) + ' ت';
    const totalDiscAll = totalDisc + disc;
    let discText = `− ${toman(totalDiscAll)} ت`;
    if (S.couponApplied && S.couponAmt) {
        discText += ` <span style="font-size:11px;color:var(--text-mute);">(شامل تخفیف کد: − ${toman(S.couponAmt)} ت)</span>`;
    }
    document.getElementById('invoiceDiscTotal').innerHTML = discText;
    document.getElementById('invoiceFinalTotal').textContent = toman(finalPay);
    document.getElementById('invoiceTotalWords').textContent = numberToWords(finalPay) + ' تومان';

    // مخفی کردن ردیف تخفیف کد (چون در همان خط نمایش داده می‌شود)
    const couponRow = document.getElementById('invoiceCouponRow');
    if (couponRow) couponRow.style.display = 'none';
}




/* ── INIT ───────────────────────────────── */
renderCart();
checkStep1Validation();
goToStep(1);

