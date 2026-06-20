(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const $$ = (s) => document.querySelectorAll(s);

    // ---- STATE ----
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

    // ---- HELPERS ----
    function toman(n) { return n.toLocaleString('fa-IR'); }

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
                    if (r < 10) chunkStr += units[r];
                    else if (r < 20) chunkStr += teens[r - 10];
                    else {
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
        if (typeof persianDate !== 'undefined') {
            const pd = new persianDate();
            pd.formatPersian = false;
            const date = pd.format('YYYY/MM/DD');
            const time = pd.format('HH:mm');
            return { date, time, full: date + ' - ' + time };
        }
        const now = new Date();
        const y = now.getFullYear();
        const mo = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const h = String(now.getHours()).padStart(2, '0');
        const mi = String(now.getMinutes()).padStart(2, '0');
        return {
            date: y + '/' + mo + '/' + d, time: h + ':' + mi, full: y + '/' + mo + '/' + d + ' - ' + h +
                ':' + mi
        };
    }

    // ---- TOAST ----
    window.showToast = function (msg, type) {
        type = type || 'info';
        const c = $('toastContainer');
        if (!c) return;
        const t = document.createElement('div');
        const cls = { error: 't-error', success: 't-success', info: '' };
        t.className = 'toast ' + (cls[type] || '');
        const ico = { error: 'fa-circle-exclamation', success: 'fa-circle-check', info: 'fa-circle-info' };
        t.innerHTML = '<i class="fa-solid ' + (ico[type] || ico.info) + '"></i><span>' + msg + '</span>';
        c.appendChild(t);
        requestAnimationFrame(function () {
            requestAnimationFrame(function () { t.classList.add('show'); });
        });
        setTimeout(function () {
            t.classList.remove('show');
            t.addEventListener('transitionend', function () { t.remove(); }, { once: true });
        }, 3200);
    };

    // ---- COPY ----
    window.copyText = function (text, label) {
        navigator.clipboard.writeText(text).then(function () {
            window.showToast((label || '') + ' کپی شد', 'success');
        });
    };

    // ---- SEARCH ----
    (function initSearch() {
        const searchToggle = $('searchToggle');
        const searchInput = $('searchInput');
        const searchClose = $('searchClose');
        if (!searchToggle || !searchInput || !searchClose) return;
        searchToggle.addEventListener('click', function () {
            S.searchOpen = !S.searchOpen;
            searchInput.classList.toggle('active', S.searchOpen);
            searchClose.classList.toggle('show', S.searchOpen);
            if (S.searchOpen) setTimeout(function () { searchInput.focus(); }, 100);
        });
        searchClose.addEventListener('click', function () {
            S.searchOpen = false;
            searchInput.classList.remove('active');
            searchClose.classList.remove('show');
            searchInput.value = '';
        });
        searchInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                var q = searchInput.value.trim();
                if (q) window.showToast('جستجو: "' + q + '"', 'info');
            }
            if (e.key === 'Escape') searchClose.click();
        });
    })();

    // ---- METHOD TABS ----
    $$('#methodTabs .tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            $$('#methodTabs .tab-btn').forEach(function (b) { b.classList.remove('active'); });
            $$('.panel').forEach(function (p) { p.classList.remove('active'); });
            this.classList.add('active');
            S.method = this.dataset.method;
            var panel = $('panel-' + S.method);
            if (panel) panel.classList.add('active');
            S.isPaymentMethodSelected = true;
            updateAll();
        });
    });

    // ---- GATEWAY ----
    $$('#gatewayGrid .gw-opt').forEach(function (opt) {
        opt.addEventListener('click', function () {
            $$('#gatewayGrid .gw-opt').forEach(function (o) { o.classList.remove('chosen'); });
            this.classList.add('chosen');
            var radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            S.gateway = this.dataset.gw;
            S.isPaymentMethodSelected = true;
        });
    });

    // ---- FILE UPLOAD ----
    (function initUpload() {
        const uploadBox = $('uploadBox');
        const receiptFile = $('receiptFile');
        const previewImg = $('previewImg');
        const removeFileBtn = $('removeFileBtn');
        if (uploadBox) {
            uploadBox.addEventListener('click', function () { if (receiptFile) receiptFile.click(); });
        }
        if (receiptFile) {
            receiptFile.addEventListener('change', function () {
                var file = this.files[0];
                if (!file) return;
                var r = new FileReader();
                r.onload = function (e) {
                    if (previewImg) {
                        previewImg.src = e.target.result;
                        previewImg.style.display = 'block';
                    }
                    if (removeFileBtn) removeFileBtn.style.display = 'inline-block';
                    if (uploadBox) uploadBox.style.display = 'none';
                    var errEl = $('receiptFile-err');
                    if (errEl) errEl.style.display = 'none';
                    checkOfflineValidation();
                };
                r.readAsDataURL(file);
            });
        }
        if (removeFileBtn) {
            removeFileBtn.addEventListener('click', function () {
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
    })();

    // ---- CART DATA ----
    var cartItems = [{
        id: 1,
        name: 'دوره جامع کنکور ریاضی',
        duration: '۱۲۰ ساعت',
        origPrice: 4800000,
        discount: 30,
        finalPrice: 3360000,
        img: 'https://images.pexels.com/photos/5212340/pexels-photo-5212340.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=80&w=120',
        instructor: 'استاد عباسی‌راد',
        qty: 1
    }, {
        id: 2,
        name: 'آمار و احتمال کنکور',
        duration: '۴۰ ساعت',
        origPrice: 2200000,
        discount: 20,
        finalPrice: 1760000,
        img: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=120&h=80&fit=crop',
        instructor: 'استاد رضایی',
        qty: 1
    }, {
        id: 3,
        name: 'دوره رایگان مقدماتی',
        duration: '۱۰ ساعت',
        origPrice: 1500000,
        discount: 100,
        finalPrice: 0,
        img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=120&h=80&fit=crop',
        instructor: 'استاد رایگان‌پور',
        qty: 1
    }, {
        id: 4,
        name: 'دوره بدون تخفیف',
        duration: '۳۰ ساعت',
        origPrice: 2500000,
        discount: 0,
        finalPrice: 2500000,
        img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=120&h=80&fit=crop',
        instructor: 'استاد ثابت‌قیمت',
        qty: 1
    },];

    // ---- RENDER FUNCTIONS ----
    function renderCart() {
        var tbody = $('cartBody');
        if (!tbody) return;
        if (cartItems.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-mute);font-family:var(--font-primary);">سبد خرید خالی است</td></tr>';
        } else {
            tbody.innerHTML = cartItems.map(function (item) {
                var isFree = item.finalPrice === 0;
                var hasDiscount = item.discount > 0 && !isFree;
                var discountDisplay = isFree ? '۱۰۰%' : (hasDiscount ? item.discount + '%' : '۰%');
                var discountClass = isFree ? 'full' : (hasDiscount ? '' : 'zero');
                var origPriceHtml;
                if (isFree) {
                    origPriceHtml = '<span class="text-free" style="font-weight:700;">رایگان</span>';
                } else if (hasDiscount) {
                    origPriceHtml = '<span class="price-orig-sm">' + toman(item.origPrice) + ' ت</span>';
                } else {
                    origPriceHtml =
                        '<span style="font-weight:600;font-size:13px;color:var(--text);font-family:var(--font-primary);">' +
                        toman(item.origPrice) + ' ت</span>';
                }
                var finalPriceHtml = isFree ?
                    '<span class="price-final-sm free">رایگان</span>' :
                    '<span class="price-final-sm">' + toman(item.finalPrice) + ' ت</span>';
                return '<tr>' +
                    '<td><div style="display:flex;align-items:center;gap:10px;">' +
                    '<img src="' + item.img + '" class="course-img" alt="' + item.name +
                    '" loading="lazy" />' +
                    '<div><div class="course-name">' + item.name + '</div>' +
                    '<div class="course-meta">' + item.instructor + '</div></div></div></td>' +
                    '<td>' + origPriceHtml + '</td>' +
                    '<td><span class="discount-badge ' + discountClass + '">' + discountDisplay +
                    '</span></td>' +
                    '<td>' + finalPriceHtml + '</td>' +
                    '<td><button class="remove-item-btn" data-id="' + item.id +
                    '"><i class="fa-solid fa-trash-can"></i></button></td>' +
                    '</tr>';
            }).join('');
        }
        updateAll();
    }

    function updateAll() {
        updateCartTotal();
        updateSidebar();
        updateInvoiceFinal();
        updateSidebarScroll();
        updateFinalInvoiceScroll();
    }

    function updateCartTotal() {
        var total = cartItems.reduce(function (sum, item) { return sum + item.finalPrice * item.qty; }, 0);
        var el = $('cartTotal');
        if (el) el.textContent = toman(total);
    }

    function updateSidebar() {
        var container = $('sidebarItems');
        if (!container) return;
        if (cartItems.length === 0) {
            container.innerHTML =
                '<p style="text-align:center;color:var(--text-mute);font-size:12px;padding:8px 0;font-family:var(--font-primary);">سبد خرید خالی است</p>';
        } else {
            container.innerHTML = cartItems.map(function (item) {
                var isFree = item.finalPrice === 0;
                var priceDisplay = isFree ? 'رایگان' : toman(item.finalPrice * item.qty) + ' ت';
                return '<div class="os-item">' +
                    '<img src="' + item.img + '" class="os-thumb" alt="" loading="lazy" />' +
                    '<span class="os-cname">' + item.name + '</span>' +
                    '<span class="os-cprice ' + (isFree ? 'free' : '') + '">' + priceDisplay +
                    '</span></div>';
            }).join('');
        }

        var totalOrig = cartItems.reduce(function (s, i) { return s + i.origPrice * i.qty; }, 0);
        var totalFinal = cartItems.reduce(function (s, i) { return s + i.finalPrice * i.qty; }, 0);
        var totalDisc = totalOrig - totalFinal;
        var disc = S.couponApplied ? S.couponAmt : 0;
        var finalPay = totalFinal - disc;

        $('sideOrigPrice').textContent = toman(totalOrig) + ' ت';
        var totalDiscAll = totalDisc + disc;
        var discText =  toman(totalDiscAll) + ' - ت';
        if (S.couponApplied && S.couponAmt) {
            discText +=
                ' <span style="font-size:10px;color:var(--text-mute);font-family:var(--font-primary);">(شامل تخفیف کد: − ' +
                toman(S.couponAmt) + ' ت)</span>';
        }
        $('sideDisc').innerHTML = discText;

        var couponLine = $('sideCouponLine');
        if (couponLine) couponLine.style.display = 'none';

        $('sideTotalAmount').textContent = toman(finalPay);
        $('sideTotalWords').textContent = numberToWords(finalPay) + ' تومان';
        $('sideSaving').textContent = toman(totalDisc + (S.couponApplied ? S.couponAmt : 0));
    }

    function updateSidebarScroll() {
        var container = $('sidebarItems');
        if (!container) return;
        var itemCount = cartItems.length;
        if (itemCount > 15) {
            container.classList.add('scrollable');
        } else {
            container.classList.remove('scrollable');
        }
    }

    function updateFinalInvoiceScroll() {
        var scrollContainer = $('finalInvoiceScroll');
        if (!scrollContainer) return;
        var rows = scrollContainer.querySelectorAll('tbody tr');
        var count = rows.length;
        if (count > 15) {
            scrollContainer.style.maxHeight = '340px';
            scrollContainer.style.overflowY = 'auto';
        } else {
            scrollContainer.style.maxHeight = 'none';
            scrollContainer.style.overflowY = 'visible';
        }
    }

















    function updateInvoiceFinal() {
        var now = getPersianDate();
        $('invoiceNumber').textContent = 'PTZ-' + Date.now().toString().slice(-8);
        $('invoicePaymentDateTime').textContent = now.full;

        $('finalFname').textContent = $('fname').value || '—';
        $('finalLname').textContent = $('lname').value || '—';
        $('finalPhone').textContent = $('phone').value || '—';
        $('finalEmail').textContent = $('email').value || '—';

        var methodMap = { offline: 'کارت به کارت', online: 'پرداخت آنلاین' };
        var methodText = methodMap[S.method] || 'کارت به کارت';










        var receiptInfo = $('finalReceiptInfo');
        var methodMap = { offline: 'کارت به کارت', online: 'پرداخت آنلاین' };
        var methodText = methodMap[S.method] || 'کارت به کارت';

        // دریافت مقادیر (در صورت وجود)
        var date = (S.method === 'offline' && $('offDate')) ? $('offDate').value : '—';
        var time = (S.method === 'offline' && $('offTime')) ? $('offTime').value : '—';
        var ref = (S.method === 'offline' && $('offRef')) ? $('offRef').value : '—';

        // ساختار دو ستونی مشابه بخش کاربر
        receiptInfo.innerHTML = `
  <div style="display:flex; justify-content:space-between; gap:12px;">
    <div class="invoice-info-body" style="flex:1;">
      <div><span>روش:</span> <span>${methodText}</span></div>
      <div><span>تاریخ واریز:</span> <span>${date}</span></div>
    </div>
    <div class="invoice-info-body" style="flex:1;">
      <div><span>ساعت واریز:</span> <span>${time}</span></div>
      <div><span>کد پیگیری:</span> <span>${ref}</span></div>
    </div>
  </div>
`;
        var tbody = $('finalInvoiceItems');
        if (!tbody) return;
        if (cartItems.length === 0) {
            tbody.innerHTML =
                '<tr><td colspan="2" style="text-align:center;padding:16px;color:var(--text-mute);font-family:var(--font-primary);">سبد خرید خالی است</td></tr>';
        } else {
            tbody.innerHTML = cartItems.map(function (item) {
                var isFree = item.finalPrice === 0;
                var courseDisplay = item.name + (item.instructor ? ' — ' + item.instructor : '');
                var qtyDisplay = item.qty > 1 ? ' ×' + item.qty : '';
                var priceDisplay = isFree ? 'رایگان' : toman(item.finalPrice * item.qty) + ' ت';
                return '<tr>' +
                    '<td style="text-align:right;font-weight:700;font-size:13px;padding:12px 16px;font-family:var(--font-primary);">' +
                    courseDisplay + qtyDisplay + '</td>' +
                    '<td style="text-align:center;font-weight:900;font-size:14px;color:' + (isFree ?
                        'var(--green)' : 'var(--purple)') + ';font-family:var(--font-primary);">' +
                    priceDisplay + '</td>' +
                    '</tr>';
            }).join('');
        }

        var totalOrig = cartItems.reduce(function (s, i) { return s + i.origPrice * i.qty; }, 0);
        var totalFinal = cartItems.reduce(function (s, i) { return s + i.finalPrice * i.qty; }, 0);
        var totalDisc = totalOrig - totalFinal;
        var disc = S.couponApplied ? S.couponAmt : 0;
        var finalPay = totalFinal - disc;

        $('invoiceOrigTotal').textContent = toman(totalOrig) + ' ت';
        var totalDiscAll = totalDisc + disc;
        var discText = toman(totalDiscAll) + '- ت';
        if (S.couponApplied && S.couponAmt) {
            discText +=
                ' <span style="font-size:11px;color:var(--text-mute);font-family:var(--font-primary);">(شامل تخفیف کد: − ' +
                toman(S.couponAmt) + ' ت)</span>';
        }
        $('invoiceDiscTotal').innerHTML = discText;
        $('invoiceFinalTotal').textContent = toman(finalPay);
        $('invoiceTotalWords').textContent = numberToWords(finalPay) + ' تومان';

        var couponRow = $('invoiceCouponRow');
        if (couponRow) couponRow.style.display = 'none';

        updateFinalInvoiceScroll();
    }





















    // ---- CART EVENTS ----
    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-item-btn');
        if (!btn) return;
        var id = parseInt(btn.dataset.id);
        cartItems = cartItems.filter(function (item) { return item.id !== id; });
        renderCart();
        window.showToast('محصول از سبد خرید حذف شد.', 'info');
    });

    var addBtn = $('addSampleBtn');
    if (addBtn) {
        addBtn.addEventListener('click', function () {
            var sample = {
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
            window.showToast('دوره نمونه به سبد خرید اضافه شد.', 'success');
        });
    }

    // ---- COUPON ----
    (function initCoupon() {
        var couponInput = $('couponInput');
        var couponBtn = $('couponBtn');
        var couponBtnTxt = $('couponBtnTxt');
        var couponOk = $('couponOk');
        var couponErr = $('couponErr');

        function shakeEl(el) {
            if (!el) return;
            el.classList.add('shake');
            el.addEventListener('animationend', function () { el.classList.remove('shake'); }, { once: true });
        }

        function applyCoupon() {
            if (S.couponApplied) return;
            if (!couponInput) return;
            var code = couponInput.value.trim().toUpperCase();
            if (couponOk) couponOk.classList.remove('show');
            if (couponErr) couponErr.classList.remove('show');
            if (!code) { shakeEl(couponInput); return; }
            if (couponBtnTxt) couponBtnTxt.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> بررسی...';
            if (couponBtn) couponBtn.disabled = true;

            setTimeout(function () {
                if (COUPONS.indexOf(code) !== -1) {
                    S.couponApplied = true;
                    if (couponOk) {
                        couponOk.innerHTML = '<i class="fa-solid fa-circle-check"></i> کد <strong>' +
                            code + '</strong> اعمال شد — <strong>' + toman(S.couponAmt) +
                            '</strong> تومان تخفیف گرفتید! <button class="cancel-coupon-btn" onclick="cancelCoupon()">لغو کد</button>';
                        couponOk.classList.add('show');
                    }
                    if (couponInput) {
                        couponInput.disabled = true;
                        couponInput.style.opacity = '0.55';
                    }
                    if (couponBtnTxt) couponBtnTxt.innerHTML = 'اعمال شد';
                    if (couponBtn) couponBtn.style.cursor = 'default';
                    updateAll();
                    window.showToast('کد تخفیف با موفقیت اعمال شد! 🎉', 'success');
                } else {
                    if (couponErr) couponErr.classList.add('show');
                    shakeEl(couponInput);
                    if (couponBtnTxt) couponBtnTxt.innerHTML =
                        '<i class="اعمال';
                    if (couponBtn) couponBtn.disabled = false;
                }
            }, 800);
        }

        window.applyCoupon = applyCoupon;

        window.cancelCoupon = function (showToastMsg) {
            showToastMsg = (showToastMsg !== undefined) ? showToastMsg : true;
            S.couponApplied = false;
            S.couponAmt = 512000;
            if (couponInput) {
                couponInput.disabled = false;
                couponInput.style.opacity = '1';
                couponInput.value = '';
            }
            if (couponBtnTxt) couponBtnTxt.innerHTML = '<i class="اعمال';
            if (couponBtn) {
                couponBtn.disabled = false;
                couponBtn.style.cursor = 'pointer';
            }
            if (couponOk) {
                couponOk.classList.remove('show');
                couponOk.innerHTML = '';
            }
            updateAll();
            if (showToastMsg) window.showToast('کد تخفیف لغو شد.', 'info');
        };

        if (couponInput) {
            couponInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyCoupon(); });
            couponInput.addEventListener('input', function () {
                if (!S.couponApplied) {
                    if (couponOk) couponOk.classList.remove('show');
                    if (couponErr) couponErr.classList.remove('show');
                }
            });
        }
        if (couponBtn) couponBtn.addEventListener('click', applyCoupon);
    })();

    // ---- STEP 1 VALIDATION ----
    var STEP1_FIELDS = [
        {
            id: 'fname', errId: 'fname-err', test: function (v) {
                return v.trim().length >= 2 && v.trim()
                    .length <= 55;
            }
        },
        {
            id: 'lname', errId: 'lname-err', test: function (v) {
                return v.trim().length >= 2 && v.trim()
                    .length <= 55;
            }
        },
        { id: 'phone', errId: 'phone-err', test: function (v) { return /^09\d{9}$/.test(v.trim()); } },
    ];

    function validateStep1Field(el, errId, test) {
        var val = el.value;
        var ok = test(val);
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !ok);
            el.classList.toggle('valid', ok);
            var e = $(errId);
            if (e) e.classList.toggle('show', !ok);
        } else {
            el.classList.remove('invalid', 'valid');
            var e2 = $(errId);
            if (e2) e2.classList.remove('show');
        }
        return ok;
    }

    STEP1_FIELDS.forEach(function (field) {
        var el = $(field.id);
        if (!el) return;
        if (field.id === 'phone') {
            el.addEventListener('input', function () {
                this.value = this.value.replace(/[^0-9]/g, '').substring(0, 11);
            });
        }
        el.addEventListener('input', function () {
            validateStep1Field(el, field.errId, field.test);
            checkStep1Validation();
        });
        el.addEventListener('blur', function () {
            validateStep1Field(el, field.errId, field.test);
            checkStep1Validation();
        });
        el.addEventListener('focusout', function () {
            validateStep1Field(el, field.errId, field.test);
            checkStep1Validation();
        });
    });

    function validateAllStep1() {
        var ok = true;
        STEP1_FIELDS.forEach(function (field) {
            var el = $(field.id);
            if (el) {
                var valid = validateStep1Field(el, field.errId, field.test);
                if (!valid) ok = false;
            }
        });
        return ok;
    }

    function checkStep1Validation() {
        var isValid = validateAllStep1();
        S.isStep1Valid = isValid;
        var nextBtn = $('step1NextBtn');
        if (nextBtn) nextBtn.disabled = !isValid;
        document.querySelectorAll('.step-header .cstep').forEach(function (el) {
            var step = parseInt(el.dataset.step);
            if (step > 1) el.classList.toggle('disabled', !isValid);
        });
    }

    // ============================================================
    //  HELPERS FOR PERSIAN DIGITS & AUTO-CORRECT
    // ============================================================
    function faToEnNumber(str) {
        var map = {
            '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8',
            '۹': '9'
        };
        return str.replace(/[۰-۹]/g, function (m) { return map[m] || m; });
    }

    function enToFaNumber(str) {
        var map = {
            '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', '5': '۵', '6': '۶', '7': '۷', '8': '۸',
            '9': '۹'
        };
        return str.replace(/[0-9]/g, function (m) { return map[m] || m; });
    }

    // ---- AUTO-CORRECT: TIME ----
    function autoCorrectTime(str) {
        var trimmed = str.trim();
        if (!trimmed) return '';
        var en = faToEnNumber(trimmed);
        var parts = en.split(':');
        if (parts.length !== 2) return '';
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return '';
        h = Math.min(Math.max(h, 0), 23);
        m = Math.min(Math.max(m, 0), 59);
        var result = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        return enToFaNumber(result);
    }

    // ---- AUTO-CORRECT: DATE ----
    function autoCorrectDate(str) {
        var trimmed = str.trim();
        if (!trimmed) return '';
        var en = faToEnNumber(trimmed);
        var parts = en.split('/');
        if (parts.length !== 3) return '';
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
        if (y < 1000 || y > 9999) y = 1400;
        m = Math.min(Math.max(m, 1), 12);
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var isLeap = (y % 400 === 0) || (y % 4 === 0 && y % 100 !== 0);
        if (m === 2 && isLeap) daysInMonth[1] = 29;
        d = Math.min(Math.max(d, 1), daysInMonth[m - 1]);
        var result = String(y) + '/' + String(m).padStart(2, '0') + '/' + String(d).padStart(2, '0');
        return enToFaNumber(result);
    }

    // ---- VALIDATION: TIME ----
    function isValidTime(str) {
        var trimmed = str.trim();
        if (!trimmed) return false;
        var en = faToEnNumber(trimmed);
        var parts = en.split(':');
        if (parts.length !== 2) return false;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return false;
        return h >= 0 && h <= 23 && m >= 0 && m <= 59;
    }

    // ---- VALIDATION: DATE ----
    function isValidDate(str) {
        var trimmed = str.trim();
        if (!trimmed) return false;
        var en = faToEnNumber(trimmed);
        var parts = en.split('/');
        if (parts.length !== 3) return false;
        var y = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var d = parseInt(parts[2], 10);
        if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
        if (y < 1000 || y > 9999) return false;
        if (m < 1 || m > 12) return false;
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var isLeap = (y % 400 === 0) || (y % 4 === 0 && y % 100 !== 0);
        if (m === 2 && isLeap) daysInMonth[1] = 29;
        if (d < 1 || d > daysInMonth[m - 1]) return false;
        return true;
    }

    // ---- OFFLINE VALIDATION (with auto-correct) ----
    var OFFLINE_REQUIRED = ['offDate', 'offTime'];

    function validateOfflineField(el, errId) {
        if (!el) return true;
        var val = el.value;
        var isValid = false;
        var errMsg = '';
        var corrected = '';

        if (el.id === 'offDate') {
            corrected = autoCorrectDate(val);
            isValid = isValidDate(corrected);
            if (!isValid && val.trim().length > 0) {
                errMsg = 'تاریخ واردشده معتبر نیست (فرمت: YYYY/MM/DD)';
            } else if (!isValid) {
                errMsg = 'لطفاً تاریخ واریز را انتخاب یا وارد کنید (YYYY/MM/DD)';
            }
            if (isValid && corrected !== val && corrected.length > 0) {
                el.value = corrected;
            }
        } else if (el.id === 'offTime') {
            corrected = autoCorrectTime(val);
            isValid = isValidTime(corrected);
            if (!isValid && val.trim().length > 0) {
                errMsg = 'ساعت واردشده معتبر نیست (فرمت: HH:MM ، 00-23 ساعت و 00-59 دقیقه)';
            } else if (!isValid) {
                errMsg = 'لطفاً ساعت واریز را انتخاب یا وارد کنید (HH:MM)';
            }
            if (isValid && corrected !== val && corrected.length > 0) {
                el.value = corrected;
            }
        } else {
            isValid = val.trim().length > 0;
        }

        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !isValid);
            el.classList.toggle('valid', isValid);
            var e = $(errId);
            if (e) {
                if (!isValid) {
                    e.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + errMsg;
                    e.classList.add('show');
                } else {
                    e.classList.remove('show');
                }
            }
        } else {
            el.classList.remove('invalid', 'valid');
            var e2 = $(errId);
            if (e2) {
                e2.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (el.id === 'offDate' ?
                    'لطفاً تاریخ واریز را انتخاب یا وارد کنید (YYYY/MM/DD)' :
                    'لطفاً ساعت واریز را انتخاب یا وارد کنید (HH:MM)');
                e2.classList.remove('show');
            }
        }
        return isValid;
    }

    // ---- bind validation ----
    OFFLINE_REQUIRED.forEach(function (id) {
        var el = $(id);
        if (!el) return;
        var errId = id + '-err';
        el.addEventListener('input', function () { validateOfflineField(this, errId); });
        el.addEventListener('blur', function () { validateOfflineField(this, errId); });
        el.addEventListener('focusout', function () { validateOfflineField(this, errId); });
    });

    function validateOfflineFields() {
        var ok = true;
        OFFLINE_REQUIRED.forEach(function (id) {
            var el = $(id);
            var errId = id + '-err';
            if (!el) return;
            var isValid = validateOfflineField(el, errId);
            if (!isValid) ok = false;
        });
        var fileInput = $('receiptFile');
        var fileErr = $('receiptFile-err');
        var hasFile = fileInput && fileInput.files && fileInput.files.length > 0;
        if (fileErr) fileErr.style.display = hasFile ? 'none' : 'block';
        if (!hasFile) ok = false;
        return ok;
    }

    function checkOfflineValidation() {
        if (S.method !== 'offline') return true;
        return validateOfflineFields();
    }

    var offRef = $('offRef');
    if (offRef) {
        offRef.addEventListener('input', function () {
            this.value = this.value.replace(/[^۰-۹0-9A-Za-z]/g, '').substring(0, 30);
            if (this.value.trim().length > 0) {
                this.classList.remove('invalid');
                this.classList.add('valid');
            } else {
                this.classList.remove('valid', 'invalid');
            }
        });
    }

    // ---- INPUT MASK with auto-correct (اصلاح شده برای روز دو رقمی) ----
    (function initMasks() {
        var offDate = $('offDate');
        var offTime = $('offTime');

        if (offDate) {
            offDate.addEventListener('input', function () {
                // ذخیره موقعیت مکان‌نما
                var cursorPos = this.selectionStart;
                // تعداد کاراکترهای عددی قبل از مکان‌نما
                var textBefore = this.value.substring(0, cursorPos);
                var digitsBefore = (textBefore.match(/[0-9۰-۹]/g) || []).length;

                var raw = this.value.replace(/[^0-9۰-۹]/g, '');
                var parts = [];
                if (raw.length >= 4) {
                    parts.push(raw.substring(0, 4));
                    if (raw.length >= 6) {
                        parts.push(raw.substring(4, 6));
                        if (raw.length >= 8) {
                            parts.push(raw.substring(6, 8));
                        } else {
                            parts.push(raw.substring(6));
                        }
                    } else {
                        parts.push(raw.substring(4));
                    }
                } else {
                    parts.push(raw);
                }
                var formatted = parts.join('/');
                if (formatted.length > 10) formatted = formatted.substring(0, 10);

                if (formatted !== this.value) {
                    this.value = formatted;
                    // محاسبه موقعیت جدید بر اساس تعداد ارقام قبل از مکان‌نما
                    var newPos = 0;
                    var digitCount = 0;
                    for (var i = 0; i < formatted.length; i++) {
                        if (formatted[i] === '/') continue;
                        digitCount++;
                        if (digitCount <= digitsBefore) {
                            newPos = i + 1;
                        }
                    }
                    this.setSelectionRange(newPos, newPos);
                }
                validateOfflineField(this, 'offDate-err');
            });

            offDate.addEventListener('blur', function () {
                var val = this.value.trim();
                if (val.length > 0 && val.length < 10) {
                    var raw = val.replace(/[^0-9۰-۹]/g, '');
                    var parts = [];
                    if (raw.length >= 4) {
                        parts.push(raw.substring(0, 4));
                        if (raw.length >= 6) {
                            parts.push(raw.substring(4, 6));
                            if (raw.length >= 8) {
                                parts.push(raw.substring(6, 8));
                            } else {
                                parts.push(raw.substring(6));
                            }
                        } else {
                            parts.push(raw.substring(4));
                        }
                    } else {
                        parts.push(raw);
                    }
                    var formatted = parts.join('/');
                    if (formatted.length > 10) formatted = formatted.substring(0, 10);
                    if (formatted !== this.value) this.value = formatted;
                }
                validateOfflineField(this, 'offDate-err');
            });
        }

        if (offTime) {
            offTime.addEventListener('input', function () {
                var raw = this.value.replace(/[^0-9۰-۹]/g, '');
                var parts = [];
                if (raw.length >= 2) {
                    parts.push(raw.substring(0, 2));
                    if (raw.length >= 4) {
                        parts.push(raw.substring(2, 4));
                    } else if (raw.length > 2) {
                        parts.push(raw.substring(2));
                    }
                } else {
                    parts.push(raw);
                }
                var formatted = parts.join(':');
                if (formatted.length > 5) formatted = formatted.substring(0, 5);
                if (formatted !== this.value) this.value = formatted;
                validateOfflineField(this, 'offTime-err');
            });

            offTime.addEventListener('blur', function () {
                var val = this.value.trim();
                if (val.length > 0 && val.length < 5) {
                    var raw = val.replace(/[^0-9۰-۹]/g, '');
                    var parts = [];
                    if (raw.length >= 2) {
                        parts.push(raw.substring(0, 2));
                        if (raw.length >= 4) {
                            parts.push(raw.substring(2, 4));
                        } else if (raw.length > 2) {
                            parts.push(raw.substring(2));
                        }
                    } else {
                        parts.push(raw);
                    }
                    var formatted = parts.join(':');
                    if (formatted.length > 5) formatted = formatted.substring(0, 5);
                    if (formatted !== this.value) this.value = formatted;
                }
                validateOfflineField(this, 'offTime-err');
            });
        }
    })();

    // ============================================================
    //  TIME PICKER CUSTOM — با دو Dropdown و دکمه تأیید (بدون چیپ‌های سریع)
    // ============================================================
    (function initCustomTimePicker() {
        var offTime = $('offTime');
        if (!offTime) return;

        var wrapper = offTime.closest('.time-picker-wrapper');
        if (!wrapper) return;

        var oldContainer = wrapper.querySelector('.time-custom-container');
        if (oldContainer) oldContainer.remove();

        var container = document.createElement('div');
        container.className = 'time-custom-container';
        wrapper.appendChild(container);

        var row = document.createElement('div');
        row.className = 'time-custom-row';
        container.appendChild(row);

        var dropdowns = document.createElement('div');
        dropdowns.className = 'time-custom-dropdowns';
        row.appendChild(dropdowns);

        var hourWrap = document.createElement('div');
        hourWrap.className = 'time-custom-dropdown';
        var hourSelect = document.createElement('select');
        hourSelect.id = 'customHourSelect';
        for (var h = 0; h < 24; h++) {
            var opt = document.createElement('option');
            var hStr = String(h).padStart(2, '0');
            opt.value = hStr;
            opt.textContent = enToFaNumber(hStr);
            if (h === 0) opt.selected = true;
            hourSelect.appendChild(opt);
        }
        hourWrap.appendChild(hourSelect);
        var hourLabel = document.createElement('div');
        hourLabel.className = 'time-custom-label';
        hourLabel.textContent = 'ساعت';
        hourWrap.appendChild(hourLabel);
        dropdowns.appendChild(hourWrap);

        var minWrap = document.createElement('div');
        minWrap.className = 'time-custom-dropdown';
        var minSelect = document.createElement('select');
        minSelect.id = 'customMinSelect';
        for (var m = 0; m < 60; m++) {
            var opt2 = document.createElement('option');
            var mStr = String(m).padStart(2, '0');
            opt2.value = mStr;
            opt2.textContent = enToFaNumber(mStr);
            if (m === 0) opt2.selected = true;
            minSelect.appendChild(opt2);
        }
        minWrap.appendChild(minSelect);
        var minLabel = document.createElement('div');
        minLabel.className = 'time-custom-label';
        minLabel.textContent = 'دقیقه';
        minWrap.appendChild(minLabel);
        dropdowns.appendChild(minWrap);

        var nowBtn = document.createElement('button');
        nowBtn.type = 'button';
        nowBtn.className = 'time-custom-now-btn';
        nowBtn.innerHTML = 'اکنون';
        row.appendChild(nowBtn);

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'time-custom-confirm-btn';
        confirmBtn.innerHTML = 'تایید';
        row.appendChild(confirmBtn);

        nowBtn.addEventListener('click', function (e) {
            e.preventDefault();
            var now = new Date();
            hourSelect.value = String(now.getHours()).padStart(2, '0');
            minSelect.value = String(now.getMinutes()).padStart(2, '0');
            updateInputFromSelects();
        });

        function updateInputFromSelects() {
            var hVal = hourSelect.value;
            var mVal = minSelect.value;
            var newVal = enToFaNumber(hVal + ':' + mVal);
            offTime.value = newVal;
            validateOfflineField(offTime, 'offTime-err');
            if (document.querySelector('.step-panel[data-step="4"].active')) {
                updateInvoiceFinal();
            }
        }

        hourSelect.addEventListener('change', updateInputFromSelects);
        minSelect.addEventListener('change', updateInputFromSelects);

        confirmBtn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            updateInputFromSelects();
            container.classList.remove('open');
            offTime.blur();
            var val = offTime.value.trim();
            if (val && isValidTime(val)) {
                window.showToast('ساعت ' + val + ' ثبت شد', 'success');
            }
        });

        offTime.addEventListener('focus', function () {
            var current = offTime.value.trim();
            if (current) {
                var en = faToEnNumber(current);
                var parts = en.split(':');
                if (parts.length === 2) {
                    var h = parts[0];
                    var m = parts[1];
                    if (h >= '00' && h <= '23') hourSelect.value = h;
                    if (m >= '00' && m <= '59') minSelect.value = m;
                }
            }
            container.classList.add('open');
        });

        var timeIcon = wrapper.querySelector('.time-picker-icon');
        if (timeIcon) {
            timeIcon.addEventListener('mousedown', function (e) { e.preventDefault(); });
            timeIcon.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (container.classList.contains('open')) {
                    container.classList.remove('open');
                } else {
                    container.classList.add('open');
                }
                offTime.focus();
            });
        }

        wrapper.addEventListener('focusout', function (e) {
            setTimeout(function () {
                var active = document.activeElement;
                if (!wrapper.contains(active)) {
                    container.classList.remove('open');
                }
            }, 0);
        });

        container.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        container.addEventListener('click', function (e) { e.stopPropagation(); });

        document.addEventListener('mousedown', function (e) {
            if (!wrapper.contains(e.target)) {
                container.classList.remove('open');
            }
        });

        offTime.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                container.classList.remove('open');
                offTime.blur();
            }
        });

        setTimeout(function () {
            var current = offTime.value.trim();
            if (current) {
                var en = faToEnNumber(current);
                var parts = en.split(':');
                if (parts.length === 2) {
                    var h = parts[0];
                    var m = parts[1];
                    if (h >= '00' && h <= '23') hourSelect.value = h;
                    if (m >= '00' && m <= '59') minSelect.value = m;
                }
            }
        }, 50);

        window.__customTimePicker = {
            container: container,
            hourSelect: hourSelect,
            minSelect: minSelect,
            confirmBtn: confirmBtn,
            updateInputFromSelects: updateInputFromSelects
        };
    })();

    // ---- STEP MANAGER ----
    window.goToStep = function (step) {
        if (step < 1 || step > 4) return;
        if (step > 1 && !S.isStep1Valid) {
            window.showToast('لطفاً ابتدا اطلاعات کاربری را کامل کنید.', 'error');
            validateAllStep1();
            return;
        }
        if (step === 4) {
            if (!S.isPaymentMethodSelected) {
                window.showToast('لطفاً روش پرداخت را انتخاب کنید.', 'error');
                return;
            }
            if (S.method === 'offline') {
                var isValid = validateOfflineFields();
                if (!isValid) {
                    window.showToast('لطفاً تمام فیلدهای اجباری (تاریخ، ساعت، فیش) را به‌درستی تکمیل کنید.',
                        'error');
                    return;
                }
            }
        }

        var sidebar = $('checkoutSidebar');
        var wrap = document.querySelector('.checkout-wrap');
        if (sidebar && wrap) {
            if (step === 4) {
                sidebar.classList.add('hidden');
                wrap.classList.add('sidebar-hidden');
            } else {
                sidebar.classList.remove('hidden');
                wrap.classList.remove('sidebar-hidden');
            }
        }

        document.querySelectorAll('.step-panel').forEach(function (p) { p.classList.remove('active'); });
        var panel = document.querySelector('.step-panel[data-step="' + step + '"]');
        if (panel) panel.classList.add('active');

        document.querySelectorAll('.step-header .cstep').forEach(function (el) {
            var s = parseInt(el.dataset.step);
            el.classList.remove('active', 'done');
            if (s === step) el.classList.add('active');
            else if (s < step) el.classList.add('done');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (step === 4) updateInvoiceFinal();
    };

    document.addEventListener('click', function (e) {
        var nextBtn = e.target.closest('.step-next-btn');
        if (nextBtn) {
            var next = parseInt(nextBtn.dataset.next);
            if (!isNaN(next)) {
                if (next === 4 && S.method === 'offline') {
                    var isValid = validateOfflineFields();
                    if (!isValid) {
                        window.showToast(
                            'لطفاً تمام فیلدهای واریز را به‌درستی تکمیل کنید و فیش را بارگذاری نمایید.',
                            'error');
                        return;
                    }
                }
                window.goToStep(next);
            }
        }
        var prevBtn = e.target.closest('.step-prev-btn');
        if (prevBtn) {
            var prev = parseInt(prevBtn.dataset.prev);
            if (!isNaN(prev)) window.goToStep(prev);
        }
    });

    document.querySelectorAll('.step-header .cstep').forEach(function (el) {
        el.addEventListener('click', function () {
            var step = parseInt(this.dataset.step);
            if (step === 1 || (step > 1 && S.isStep1Valid)) {
                window.goToStep(step);
            } else {
                window.showToast('لطفاً ابتدا اطلاعات مرحله ۱ را کامل کنید.', 'error');
            }
        });
    });

    // ---- MODAL ----
    window.closeModal = function () {
        var modal = $('modalOv');
        if (modal) modal.classList.remove('on');
    };
    window.goToPanel = function () {
        window.showToast('در حال انتقال به پنل کاربری...', 'success');
        window.closeModal();
    };

    var modalOv = $('modalOv');
    if (modalOv) {
        modalOv.addEventListener('click', function (e) { if (e.target === modalOv) window.closeModal(); });
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            window.closeModal();
            var searchClose = $('searchClose');
            if (S.searchOpen && searchClose) searchClose.click();
        }
    });

    // ---- FINAL PAY ----
    var finalPayBtn = $('finalPayBtn');
    if (finalPayBtn) {
        finalPayBtn.addEventListener('click', function () {
            var chk = $('termsChk');
            if (!chk || !chk.checked) {
                window.showToast('لطفاً قوانین را بپذیرید.', 'error');
                return;
            }
            var modal = $('modalOv');
            if (modal) {
                var tc = $('trackCode');
                if (tc) tc.textContent = 'PTZ-' + Date.now().toString().slice(-8);
                modal.classList.add('on');
            }
            window.showToast('پرداخت شما با موفقیت انجام شد!', 'success');
        });
    }

    // ============================================================
    //  CUSTOM JALALI CALENDAR — بدون کتابخانه خارجی
    // ============================================================
    (function initCustomDatePicker() {
        var offDateInput = document.getElementById('offDate');
        if (!offDateInput) return;

        var wrapper = offDateInput.closest('.date-picker-wrapper');
        if (!wrapper) return;

        function div(a, b) { return ~~(a / b); }

        function mod(a, b) { return a - ~~(a / b) * b; }

        function jalCal(jy) {
            var breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
            var bl = breaks.length,
                gy = jy + 621,
                leapJ = -14,
                jp = breaks[0],
                jm, jump = 0,
                n, i;
            for (i = 1; i < bl; i += 1) {
                jm = breaks[i];
                jump = jm - jp;
                if (jy < jm) break;
                leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
                jp = jm;
            }
            n = jy - jp;
            leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
            if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
            var leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
            var march = 20 + leapJ - leapG;
            if (jump - n < 6) n = n - jump + div(jump, 33) * 33;
            var leap = mod(mod(n + 1, 33) - 1, 4);
            if (leap === -1) leap = 4;
            return { leap: leap, gy: gy, march: march };
        }

        function g2d(gy, gm, gd) {
            var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
                div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
            d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
            return d;
        }

        function d2g(jdn) {
            var j = 4 * jdn + 139361631;
            j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
            var i = div(mod(j, 1461), 4) * 5 + 308;
            var gd = div(mod(i, 153), 5) + 1;
            var gm = mod(div(i, 153), 12) + 1;
            var gy = div(j, 1461) - 100100 + div(8 - gm, 6);
            return [gy, gm, gd];
        }

        function j2d(jy, jm, jd) {
            var r = jalCal(jy);
            return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
        }

        function d2j(jdn) {
            var gy = d2g(jdn)[0];
            var jy = gy - 621;
            var r = jalCal(jy);
            var jdn1f = g2d(r.gy, 3, r.march);
            var k = jdn - jdn1f,
                jm, jd;
            if (k >= 0) {
                if (k <= 185) { return [jy, 1 + div(k, 31), mod(k, 31) + 1]; }
                k -= 186;
            } else {
                jy -= 1;
                k += 179;
                if (r.leap === 1) k += 1;
            }
            jm = 7 + div(k, 30);
            jd = mod(k, 30) + 1;
            return [jy, jm, jd];
        }

        function isLeapJalali(jy) { return jalCal(jy).leap === 0; }

        function monthLength(jy, jm) {
            if (jm <= 6) return 31;
            if (jm <= 11) return 30;
            return isLeapJalali(jy) ? 30 : 29;
        }

        function weekdayOf(jy, jm, jd) {
            return mod(j2d(jy, jm, jd) + 2, 7);
        }

        function todayJalali() {
            var now = new Date();
            var jdn = g2d(now.getFullYear(), now.getMonth() + 1, now.getDate());
            return d2j(jdn);
        }

        var MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
            'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
        ];
        var WEEK_LETTERS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

        var today = todayJalali();
        var view = { jy: today[0], jm: today[1] };
        var selected = null;

        var oldContainer = wrapper.querySelector('.date-custom-container');
        if (oldContainer) oldContainer.remove();

        var container = document.createElement('div');
        container.className = 'date-custom-container';
        wrapper.appendChild(container);

        var header = document.createElement('div');
        header.className = 'date-custom-header';
        container.appendChild(header);

        var prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'date-custom-nav';
        prevBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
        header.appendChild(prevBtn);

        var titleWrap = document.createElement('div');
        titleWrap.className = 'date-custom-title';
        header.appendChild(titleWrap);

        var monthSelect = document.createElement('select');
        monthSelect.className = 'date-custom-month-select';
        MONTH_NAMES.forEach(function (name, idx) {
            var opt = document.createElement('option');
            opt.value = idx + 1;
            opt.textContent = name;
            monthSelect.appendChild(opt);
        });
        titleWrap.appendChild(monthSelect);

        var yearSelect = document.createElement('select');
        yearSelect.className = 'date-custom-year-select';
        var curJy = today[0];
        for (var y = curJy - 5; y <= curJy + 5; y++) {
            var optY = document.createElement('option');
            optY.value = y;
            optY.textContent = enToFaNumber(String(y));
            yearSelect.appendChild(optY);
        }
        titleWrap.appendChild(yearSelect);

        var nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'date-custom-nav';
        nextBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
        header.appendChild(nextBtn);

        var weekRow = document.createElement('div');
        weekRow.className = 'date-custom-weekrow';
        WEEK_LETTERS.forEach(function (l) {
            var c = document.createElement('span');
            c.textContent = l;
            weekRow.appendChild(c);
        });
        container.appendChild(weekRow);

        var grid = document.createElement('div');
        grid.className = 'date-custom-grid';
        container.appendChild(grid);

        var footer = document.createElement('div');
        footer.className = 'date-custom-footer';
        container.appendChild(footer);

        var todayBtn = document.createElement('button');
        todayBtn.type = 'button';
        todayBtn.className = 'date-custom-today-btn';
        todayBtn.innerHTML = '<i class="fa-solid fa-calendar-day"></i> امروز';
        footer.appendChild(todayBtn);

        function renderGrid() {
            monthSelect.value = view.jm;
            yearSelect.value = view.jy;
            grid.innerHTML = '';
            var firstWeekday = weekdayOf(view.jy, view.jm, 1);
            var len = monthLength(view.jy, view.jm);
            for (var i = 0; i < firstWeekday; i++) {
                var blank = document.createElement('span');
                blank.className = 'date-custom-day empty';
                grid.appendChild(blank);
            }
            for (var d = 1; d <= len; d++) {
                var btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'date-custom-day';
                btn.textContent = enToFaNumber(String(d));
                if (view.jy === today[0] && view.jm === today[1] && d === today[2]) {
                    btn.classList.add('is-today');
                }
                if (selected && selected.jy === view.jy && selected.jm === view.jm && selected.jd === d) {
                    btn.classList.add('is-selected');
                }
                (function (dayNum) {
                    btn.addEventListener('click', function () {
                        selected = { jy: view.jy, jm: view.jm, jd: dayNum };
                        applySelection();
                    });
                })(d);
                grid.appendChild(btn);
            }
        }

        function applySelection() {
            var val = enToFaNumber(
                String(selected.jy) + '/' +
                String(selected.jm).padStart(2, '0') + '/' +
                String(selected.jd).padStart(2, '0')
            );
            offDateInput.value = val;
            validateOfflineField(offDateInput, 'offDate-err');
            if (document.querySelector('.step-panel[data-step="4"].active')) updateInvoiceFinal();
            container.classList.remove('open');
            offDateInput.blur();
            window.showToast('تاریخ ' + val + ' ثبت شد', 'success');
        }

        function syncFromInputValue() {
            var current = offDateInput.value.trim();
            if (current && isValidDate(current)) {
                var en = faToEnNumber(current);
                var parts = en.split('/');
                selected = { jy: parseInt(parts[0], 10), jm: parseInt(parts[1], 10), jd: parseInt(parts[2], 10) };
                view = { jy: selected.jy, jm: selected.jm };
            } else {
                view = { jy: today[0], jm: today[1] };
            }
            renderGrid();
        }

        prevBtn.addEventListener('click', function (e) {
            e.preventDefault();
            view.jm -= 1;
            if (view.jm < 1) {
                view.jm = 12;
                view.jy -= 1;
            }
            renderGrid();
        });
        nextBtn.addEventListener('click', function (e) {
            e.preventDefault();
            view.jm += 1;
            if (view.jm > 12) {
                view.jm = 1;
                view.jy += 1;
            }
            renderGrid();
        });
        monthSelect.addEventListener('change', function () {
            view.jm = parseInt(this.value, 10);
            renderGrid();
        });
        yearSelect.addEventListener('change', function () {
            view.jy = parseInt(this.value, 10);
            renderGrid();
        });
        todayBtn.addEventListener('click', function (e) {
            e.preventDefault();
            selected = { jy: today[0], jm: today[1], jd: today[2] };
            view = { jy: today[0], jm: today[1] };
            applySelection();
            renderGrid();
        });

        offDateInput.addEventListener('focus', function () {
            syncFromInputValue();
            container.classList.add('open');
        });
        offDateInput.addEventListener('click', function (e) {
            e.stopPropagation();
            syncFromInputValue();
            container.classList.add('open');
        });
        var dateIcon = wrapper.querySelector('.date-picker-icon');
        if (dateIcon) {
            dateIcon.addEventListener('mousedown', function (e) { e.preventDefault(); });
            dateIcon.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                syncFromInputValue();
                if (container.classList.contains('open')) {
                    container.classList.remove('open');
                } else {
                    container.classList.add('open');
                }
                offDateInput.focus();
            });
        }

        wrapper.addEventListener('focusout', function () {
            setTimeout(function () {
                if (!wrapper.contains(document.activeElement)) {
                    container.classList.remove('open');
                }
            }, 0);
        });
        container.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        container.addEventListener('click', function (e) { e.stopPropagation(); });
        document.addEventListener('mousedown', function (e) {
            if (!wrapper.contains(e.target)) {
                container.classList.remove('open');
            }
        });
        offDateInput.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                container.classList.remove('open');
                offDateInput.blur();
            }
        });
        offDateInput.addEventListener('input', function () {
            var val = faToEnNumber(this.value.trim());
            if (isValidDate(val)) {
                var parts = val.split('/');
                view = { jy: parseInt(parts[0], 10), jm: parseInt(parts[1], 10) };
                selected = { jy: view.jy, jm: view.jm, jd: parseInt(parts[2], 10) };
                renderGrid();
            }
        });

        renderGrid();
    })();

    // ---- INIT ----
    renderCart();
    checkStep1Validation();
    window.goToStep(1);

})();