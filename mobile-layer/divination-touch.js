/**
 * Touch → desktop divination DOM. Ritual: swipe → tap center → long press → flip.
 */
(function (global) {
    'use strict';

    var LONG_MS = 3000;
    var RITUAL_MS = 4000;

    var activeIdx = 3;
    var isExtracted = false;
    var extractedEl = null;
    var ritualStartTime = 0;
    var ritualRaf = 0;
    var longTimer = null;
    var longReady = false;
    var ptr = { x: 0, y: 0, t: 0 };
    var bound = false;
    var paused = false;

    function root() {
        return global.VNMobileRoot ? global.VNMobileRoot.get() : null;
    }

    function mobileStep() {
        return Math.round(Math.min(68, Math.max(40, window.innerWidth * 0.11)));
    }

    function mobileHalfW() {
        return Math.round(Math.min(72, Math.max(50, window.innerWidth * 0.19)));
    }

    function setLabels(main, sub) {
        var label = document.getElementById('gesture-label');
        var sublabel = document.getElementById('gesture-sublabel');
        if (label) label.innerText = main;
        if (sublabel) sublabel.innerText = sub;
    }

    function getPortal() {
        var portal = document.getElementById('divine-card-portal');
        if (!portal) {
            portal = document.createElement('div');
            portal.id = 'divine-card-portal';
            portal.setAttribute('aria-hidden', 'true');
            document.body.appendChild(portal);
        }
        return portal;
    }

    function applyPortalCardLayout(card) {
        if (!card) return;
        var portal = getPortal();
        if (card.parentElement !== portal) portal.appendChild(card);
        var w = Math.min(264, Math.round(window.innerWidth * 0.52));
        var h = Math.round(w * 1.7);
        card.style.setProperty('transition', 'none', 'important');
        card.style.setProperty('position', 'fixed', 'important');
        card.style.setProperty('left', '0', 'important');
        card.style.setProperty('right', '0', 'important');
        card.style.setProperty('top', '0', 'important');
        card.style.setProperty('bottom', '0', 'important');
        card.style.setProperty('width', w + 'px', 'important');
        card.style.setProperty('height', h + 'px', 'important');
        card.style.setProperty('margin', 'auto', 'important');
        card.style.setProperty('transform', 'none', 'important');
        card.style.setProperty('opacity', '1', 'important');
        card.style.setProperty('z-index', '100012', 'important');
        card.style.setProperty('transform-style', 'flat', 'important');
    }

    function updateCardsPosition() {
        var cards = document.querySelectorAll('#divine-card-row .divine-card-item');
        var step = mobileStep();
        var half = mobileHalfW();
        cards.forEach(function (c, i) {
            if (c.closest('#divine-card-portal')) return;
            if (c.classList.contains('extracted') || c.classList.contains('flipped')) return;
            var offset = i - activeIdx;
            var tx = offset * step;
            var tz = Math.abs(offset) * -200;
            var ry = offset * 22;
            var dist = Math.abs(offset);
            c.style.left = '50%';
            c.style.marginLeft = -half + 'px';
            c.style.transform = 'translateX(' + tx + 'px) translateZ(' + tz + 'px) rotateY(' + ry + 'deg)';
            c.style.opacity = String(Math.max(0.08, 1 - dist * 0.35));
            c.style.zIndex = String(100 - dist);
            c.style.filter = dist > 2 ? 'blur(1px)' : 'none';
            c.style.transition = 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.55s ease, filter 0.4s ease';
        });
    }

    function resetRitual() {
        ritualStartTime = 0;
        if (ritualRaf) cancelAnimationFrame(ritualRaf);
        ritualRaf = 0;
        var aura = document.getElementById('ritual-aura');
        if (aura) aura.style.display = 'none';
        var ring = document.querySelector('#ritual-progress circle');
        if (ring) ring.style.strokeDashoffset = '283';
    }

    function setShrouded(on) {
        var curtain = document.getElementById('divine-curtain');
        if (curtain) {
            if (on) curtain.classList.add('shrouded');
            else curtain.classList.remove('shrouded');
        }
    }

    function extractCard() {
        extractedEl = document.querySelectorAll('#divine-card-row .divine-card-item')[activeIdx];
        if (!extractedEl) return;
        isExtracted = true;
        extractedEl.classList.add('extracted');
        applyPortalCardLayout(extractedEl);
        var row = document.getElementById('divine-card-row');
        if (row) row.classList.add('cards-dismissed');
        setShrouded(false);
        resetRitual();
        if (typeof global.showToast === 'function') global.showToast('已锁定命运之牌');
        setLabels('命运之牌已就位', '长按屏幕 3 秒，松手开始祈愿');
    }

    function processRitual() {
        if (paused || !extractedEl || extractedEl.classList.contains('flipped')) return;
        var aura = document.getElementById('ritual-aura');
        var ring = document.querySelector('#ritual-progress circle');
        setShrouded(true);
        if (aura) aura.style.display = 'flex';
        setLabels(' 抵住下巴，虔诚许愿', '保持长按…');
        if (!ritualStartTime) ritualStartTime = Date.now();
        var progress = Math.min((Date.now() - ritualStartTime) / RITUAL_MS, 1);
        if (ring) ring.style.strokeDashoffset = String(283 - progress * 283);
        if (progress >= 1) {
            extractedEl.classList.add('flipped');
            applyPortalCardLayout(extractedEl);
            resetRitual();
            setShrouded(true);
            setLabels('✧ 祈愿已传达 ✧', '点击背面按钮归还记忆');
            if (typeof global.showToast === 'function') global.showToast('命运已揭晓');
            return;
        }
        ritualRaf = requestAnimationFrame(processRitual);
    }

    function clearLong() {
        if (longTimer) clearTimeout(longTimer);
        longTimer = null;
        longReady = false;
    }

    function onPointerDown(e) {
        if (extractedEl && extractedEl.classList.contains('flipped')) return;
        ptr.x = e.clientX;
        ptr.y = e.clientY;
        ptr.t = Date.now();
        clearLong();
        if (isExtracted && extractedEl && !extractedEl.classList.contains('flipped')) {
            longTimer = setTimeout(function () {
                longReady = true;
                setLabels('✧ 可以松手祈愿 ✧', '松手后命运之环将闭合');
            }, LONG_MS);
        }
    }

    function onPointerUp(e) {
        var dx = e.clientX - ptr.x;
        var dy = e.clientY - ptr.y;
        var elapsed = Date.now() - ptr.t;
        var th = Math.max(32, window.innerWidth * 0.08);

        if (isExtracted && longReady && extractedEl && !extractedEl.classList.contains('flipped')) {
            clearLong();
            ritualStartTime = 0;
            ritualRaf = requestAnimationFrame(processRitual);
            return;
        }
        clearLong();

        if (isExtracted) return;

        if (elapsed < 450 && Math.abs(dx) < th * 0.7 && Math.abs(dy) < th * 0.7) {
            var row = document.getElementById('divine-card-row');
            if (row) {
                var rect = row.getBoundingClientRect();
                var ratio = (e.clientX - rect.left) / Math.max(rect.width, 1);
                activeIdx = Math.min(6, Math.max(0, Math.round(ratio * 6)));
            }
            updateCardsPosition();
            extractCard();
            return;
        }

        if (Math.abs(dx) >= th && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0 && activeIdx < 6) activeIdx += 1;
            if (dx > 0 && activeIdx > 0) activeIdx -= 1;
            updateCardsPosition();
            setLabels('← 左右滑动巡视星轨 →', '点击卡牌以锁定命运');
        }
    }

    function bindRoot() {
        if (bound) return;
        var r = root();
        if (!r) return;
        r.addEventListener('pointerdown', onPointerDown, { passive: true });
        r.addEventListener('pointerup', onPointerUp, { passive: true });
        r.addEventListener('pointercancel', clearLong, { passive: true });
        bound = true;
    }

    function unbindRoot() {
        if (!bound) return;
        var r = root();
        if (r) {
            r.removeEventListener('pointerdown', onPointerDown);
            r.removeEventListener('pointerup', onPointerUp);
            r.removeEventListener('pointercancel', clearLong);
        }
        bound = false;
        clearLong();
    }

    function forceTeardown() {
        unbindRoot();
        resetRitual();
        setShrouded(false);
        isExtracted = false;
        extractedEl = null;
        activeIdx = 3;
        if (global.VNCameraGuard) global.VNCameraGuard.onDivinationClose();
    }

    function onStageChange(visible) {
        if (!visible) {
            forceTeardown();
            if (global.VNMobileRoot) global.VNMobileRoot.hideTouchLayer();
            if (global.VNSceneCleanup) global.VNSceneCleanup.resetViewport();
            return;
        }
        if (global.VNCameraGuard) global.VNCameraGuard.onDivinationOpen();
        if (global.VNMobileRoot) global.VNMobileRoot.showTouchLayer();
        bindRoot();
        setLabels('← 左右滑动巡视星轨 →', '点击卡牌以锁定命运');
        global.setTimeout(function () {
            activeIdx = 3;
            isExtracted = false;
            extractedEl = null;
            setShrouded(false);
            var row = document.getElementById('divine-card-row');
            if (row) row.classList.remove('cards-dismissed');
            updateCardsPosition();
        }, 1100);
    }

    global.VNDivinationTouch = {
        onStageChange: onStageChange,
        forceTeardown: forceTeardown,
        pause: function () { paused = true; },
        resume: function () {
            paused = false;
            if (isExtracted && extractedEl && !extractedEl.classList.contains('flipped')) {
                ritualRaf = requestAnimationFrame(processRitual);
            }
        },
        relayout: updateCardsPosition
    };
})(typeof window !== 'undefined' ? window : global);
