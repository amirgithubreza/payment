(function () {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const $$ = (s) => document.querySelectorAll(s);
    const jq = window.jQuery;

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
            date: y + '/' + mo + '/' + d, time: h + ':' + mi, full: y + '/' + mo + '/' + d + ' - ' + h + ':' +
                mi
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
                    origPriceHtml = '<span style="font-weight:600;font-size:13px;color:var(--text);font-family:var(--font-primary);">' +
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
        updateStepProgress();
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
        var discText = '− ' + toman(totalDiscAll) + ' ت';
        if (S.couponApplied && S.couponAmt) {
            discText += ' <span style="font-size:10px;color:var(--text-mute);font-family:var(--font-primary);">(شامل تخفیف کد: − ' + toman(S
                .couponAmt) + ' ت)</span>';
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
        var itemCount = cartItems.length;
        // محاسبه تعداد آیتم‌های واقعی در تی‌بادی
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
        var items = [];
        items.push('<div><span>روش:</span> <span>' + methodText + '</span></div>');
        if (S.method === 'offline') {
            var date = $('offDate') ? $('offDate').value : '—';
            var time = $('offTime') ? $('offTime').value : '—';
            var ref = $('offRef') ? $('offRef').value : '—';
            items.push('<div><span>تاریخ واریز:</span> <span>' + date + '</span></div>');
            items.push('<div><span>ساعت واریز:</span> <span>' + time + '</span></div>');
            items.push('<div><span>کد پیگیری:</span> <span>' + ref + '</span></div>');
        } else {
            items.push('<div><span>تاریخ واریز:</span> <span>—</span></div>');
            items.push('<div><span>ساعت واریز:</span> <span>—</span></div>');
            items.push('<div><span>کد پیگیری:</span> <span>—</span></div>');
        }
        receiptInfo.innerHTML = items.join('');

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
        var discText = '− ' + toman(totalDiscAll) + ' ت';
        if (S.couponApplied && S.couponAmt) {
            discText += ' <span style="font-size:11px;color:var(--text-mute);font-family:var(--font-primary);">(شامل تخفیف کد: − ' + toman(S
                .couponAmt) + ' ت)</span>';
        }
        $('invoiceDiscTotal').innerHTML = discText;
        $('invoiceFinalTotal').textContent = toman(finalPay);
        $('invoiceTotalWords').textContent = numberToWords(finalPay) + ' تومان';

        var couponRow = $('invoiceCouponRow');
        if (couponRow) couponRow.style.display = 'none';

        // بروزرسانی اسکرول فاکتور نهایی
        updateFinalInvoiceScroll();
    }

    // ---- STEP PROGRESS ANIMATION ----
    function updateStepProgress() {
        var activeStep = document.querySelector('.cstep.active');
        if (!activeStep) return;
        var step = parseInt(activeStep.dataset.step);
        var fill = $('stepProgressFill');
        if (!fill) return;
        // 4 steps: step1=12.5%, step2=37.5%, step3=62.5%, step4=87.5%
        var progressMap = { 1: 12.5, 2: 37.5, 3: 62.5, 4: 87.5 };
        var width = progressMap[step] || 12.5;
        fill.style.width = width + '%';
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
                        '<i class="fa-solid fa-check-circle"></i> اعمال';
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
            if (couponBtnTxt) couponBtnTxt.innerHTML = '<i class="fa-solid fa-check-circle"></i> اعمال';
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

    // ---- OFFLINE VALIDATION ----
    var OFFLINE_REQUIRED = ['offDate', 'offTime'];

    function validateOfflineField(el, errId) {
        if (!el) return true;
        var val = el.value;
        var isValid = val.trim().length > 0;
        if (val.trim().length > 0) {
            el.classList.toggle('invalid', !isValid);
            el.classList.toggle('valid', isValid);
            var e = $(errId);
            if (e) e.classList.toggle('show', !isValid);
        } else {
            el.classList.remove('invalid', 'valid');
            var e2 = $(errId);
            if (e2) e2.classList.remove('show');
        }
        return isValid;
    }

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

    // ---- INPUT MASK: تاریخ و ساعت ----
    (function initMasks() {
        var offDate = $('offDate');
        var offTime = $('offTime');

        if (offDate) {
            offDate.addEventListener('input', function () {
                var raw = this.value.replace(/\D/g, '');
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
                validateOfflineField(this, 'offDate-err');
            });

            offDate.addEventListener('blur', function () {
                var val = this.value.trim();
                if (val.length > 0 && val.length < 10) {
                    var raw = val.replace(/\D/g, '');
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
                var raw = this.value.replace(/\D/g, '');
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
                    var raw = val.replace(/\D/g, '');
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
                    window.showToast('لطفاً تمام فیلدهای اجباری (تاریخ، ساعت، فیش) را تکمیل کنید.', 'error');
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

        // بروزرسانی progress bar
        updateStepProgress();

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
                        window.showToast('لطفاً تمام فیلدهای واریز را تکمیل کنید و فیش را بارگذاری نمایید.',
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

    // ---- PERSIAN DATEPICKER ----
    (function initDatepickers() {
        var offDateInput = document.getElementById('offDate');
        var offTimeInput = document.getElementById('offTime');

        if (typeof jq === 'undefined' || !jq.fn || !jq.fn.pDatepicker) {
            console.warn('persian-datepicker not loaded.');
            return;
        }

        if (offDateInput) {
            jq(offDateInput).pDatepicker({
                format: 'YYYY/MM/DD',
                autoClose: true,
                initialValue: false,
                observer: true,
                onSelect: function () {
                    validateOfflineField(offDateInput, 'offDate-err');
                    if (document.querySelector('.step-panel[data-step="4"].active')) updateInvoiceFinal();
                }
            });
            offDateInput.addEventListener('click', function (e) {
                e.stopPropagation();
                jq(offDateInput).pDatepicker('show');
            });
            var icon = offDateInput.parentElement ? offDateInput.parentElement.querySelector(
                '.date-picker-icon') : null;
            if (icon) {
                icon.addEventListener('click', function (e) {
                    e.stopPropagation();
                    jq(offDateInput).pDatepicker('show');
                });
            }
        }

        if (offTimeInput) {
            jq(offTimeInput).pDatepicker({
                onlyTimePicker: true,
                format: 'HH:mm',
                autoClose: true,
                initialValue: false,
                observer: true,
                timePicker: {
                    enabled: true,
                    meridian: { enabled: false },
                    second: { enabled: false }
                },
                onSelect: function () {
                    validateOfflineField(offTimeInput, 'offTime-err');
                    if (document.querySelector('.step-panel[data-step="4"].active')) updateInvoiceFinal();
                }
            });
            offTimeInput.addEventListener('click', function (e) {
                e.stopPropagation();
                jq(offTimeInput).pDatepicker('show');
            });
            var timeIcon = offTimeInput.parentElement ? offTimeInput.parentElement.querySelector(
                '.time-picker-icon') : null;
            if (timeIcon) {
                timeIcon.addEventListener('click', function (e) {
                    e.stopPropagation();
                    jq(offTimeInput).pDatepicker('show');
                });
            }
        }
    })();

    // ---- INIT ----
    renderCart();
    checkStep1Validation();
    window.goToStep(1);

})();