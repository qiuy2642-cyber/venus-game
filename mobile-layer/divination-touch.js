/**
 * Touch → desktop divination DOM. Ritual: swipe → tap center → long press → flip.
 */
(function (global) {
    'use strict';

    var RITUAL_MS = 3000;
    var CIRCUMFERENCE = 283;

    var activeIdx = 3;
    var isExtracted = false;
    var extractedEl = null;
    var ptr = { x: 0, y: 0, t: 0 };
    var bound = false;
    var paused = false;
    var layoutGuard = null;
    var applyingLayout = false;

    /** Single source of truth for long-press ritual */
    var ritual = {
        active: false,
        startTime: 0,
        raf: 0
    };

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
        applyingLayout = true;
        cards.forEach(function (c, i) {
            if (c.closest('#divine-card-portal')) return;
            if (c.classList.contains('extracted') || c.classList.contains('flipped')) return;
            var offset = i - activeIdx;
            var dist = Math.abs(offset);

            if (dist > 1) {
                c.style.visibility = 'hidden';
                c.style.pointerEvents = 'none';
                c.style.opacity = '0';
                c.style.transform = 'translateX(0) translateZ(-400px) rotateY(0deg)';
                return;
            }

            c.style.visibility = 'visible';
            c.style.pointerEvents = 'auto';
            var tx = offset * step;
            var tz = dist * -200;
            var ry = offset * 22;
            c.style.left = '50%';
            c.style.marginLeft = -half + 'px';
            c.style.transform = 'translateX(' + tx + 'px) translateZ(' + tz + 'px) rotateY(' + ry + 'deg)';
            c.style.opacity = offset === 0 ? '1' : '0.42';
            c.style.zIndex = String(100 - dist);
            c.style.filter = offset === 0 ? 'none' : 'blur(0.4px)';
            c.style.transition = 'transform 0.55s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.55s ease, filter 0.4s ease, visibility 0.35s ease';
        });
        applyingLayout = false;
    }

    function startLayoutGuard() {
        stopLayoutGuard();
        var row = document.getElementById('divine-card-row');
        if (!row) return;
        layoutGuard = new MutationObserver(function () {
            if (applyingLayout || isExtracted) return;
            updateCardsPosition();
        });
        layoutGuard.observe(row, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'class']
        });
        var delays = [0, 50, 150, 400, 800, 1200, 1800, 2500];
        delays.forEach(function (ms) {
            global.setTimeout(updateCardsPosition, ms);
        });
    }

    function stopLayoutGuard() {
        if (layoutGuard) {
            layoutGuard.disconnect();
            layoutGuard = null;
        }
    }

    function curtainEl() {
        return document.getElementById('divine-curtain');
    }

    function auraEl() {
        return document.getElementById('ritual-aura');
    }

    function ringEl() {
        return document.querySelector('#ritual-progress circle');
    }

    function setShroudLevel(progress) {
        var curtain = curtainEl();
        if (!curtain) return;
        if (progress <= 0) {
            curtain.classList.remove('shrouded');
            curtain.style.background = '';
            curtain.style.backdropFilter = '';
            return;
        }
        curtain.classList.add('shrouded');
        var alpha = Math.min(0.7, 0.7 * progress);
        curtain.style.background = 'rgba(26, 20, 16, ' + alpha + ')';
        curtain.style.backdropFilter = 'blur(' + Math.min(5, progress * 5) + 'px)';
    }

    function setProgressVisual(progress) {
        var ring = ringEl();
        if (ring) {
            ring.style.transition = 'none';
            ring.style.strokeDashoffset = String(CIRCUMFERENCE - progress * CIRCUMFERENCE);
        }
        var aura = auraEl();
        if (aura) aura.style.display = progress > 0 ? 'flex' : 'none';
    }

    function clearRitualVisuals() {
        ritual.active = false;
        ritual.startTime = 0;
        if (ritual.raf) {
            cancelAnimationFrame(ritual.raf);
            ritual.raf = 0;
        }
        setShroudLevel(0);
        setProgressVisual(0);
        if (extractedEl) extractedEl.classList.remove('vn-ritual-holding');
        setTouchLayerCardInteract(false);
    }

    function setTouchLayerCardInteract(on) {
        var r = root();
        if (!r) return;
        if (on) r.classList.add('vn-m-card-interact');
        else r.classList.remove('vn-m-card-interact');
    }

    function tickRitual() {
        if (!ritual.active || paused || !extractedEl || extractedEl.classList.contains('flipped')) {
            ritual.raf = 0;
            return;
        }

        var elapsed = Date.now() - ritual.startTime;
        var progress = Math.min(elapsed / RITUAL_MS, 1);

        setShroudLevel(progress);
        setProgressVisual(progress);
        setLabels('✧ 虔诚许愿中 ✧', '保持长按 ' + Math.max(1, Math.ceil((RITUAL_MS - elapsed) / 1000)) + ' 秒…');

        if (progress >= 1) {
            completeRitual();
            return;
        }

        ritual.raf = requestAnimationFrame(tickRitual);
    }

    function beginRitualHold() {
        if (!extractedEl || extractedEl.classList.contains('flipped')) return;
        ritual.active = true;
        ritual.startTime = Date.now();
        extractedEl.classList.add('vn-ritual-holding');
        setShroudLevel(0.08);
        setProgressVisual(0.02);
        setLabels('✧ 虔诚许愿中 ✧', '保持长按 3 秒…');
        if (ritual.raf) cancelAnimationFrame(ritual.raf);
        ritual.raf = requestAnimationFrame(tickRitual);
    }

    function abortRitualHold() {
        if (!ritual.active) return;
        clearRitualVisuals();
        if (isExtracted) {
            setLabels('命运之牌已就位', '长按屏幕 3 秒完成祈愿');
        }
    }

    function completeRitual() {
        clearRitualVisuals();
        if (!extractedEl) return;
        extractedEl.classList.add('flipped');
        applyPortalCardLayout(extractedEl);
        setShroudLevel(1);
        setTouchLayerCardInteract(true);
        setLabels('✧ 祈愿已传达 ✧', '点击牌面按钮归还启示');
        if (typeof global.showToast === 'function') global.showToast('命运已揭晓');
    }

    function extractCard() {
        extractedEl = document.querySelectorAll('#divine-card-row .divine-card-item')[activeIdx];
        if (!extractedEl) return;
        isExtracted = true;
        extractedEl.classList.add('extracted');
        applyPortalCardLayout(extractedEl);
        var row = document.getElementById('divine-card-row');
        if (row) row.classList.add('cards-dismissed');
        clearRitualVisuals();
        if (typeof global.showToast === 'function') global.showToast('已锁定命运之牌');
        setLabels('命运之牌已就位', '长按屏幕 3 秒完成祈愿');
    }

    function onPointerDown(e) {
        if (extractedEl && extractedEl.classList.contains('flipped')) return;
        ptr.x = e.clientX;
        ptr.y = e.clientY;
        ptr.t = Date.now();
        if (isExtracted && extractedEl && !extractedEl.classList.contains('flipped')) {
            beginRitualHold();
        }
    }

    function onPointerUp(e) {
        var dx = e.clientX - ptr.x;
        var dy = e.clientY - ptr.y;
        var elapsed = Date.now() - ptr.t;
        var th = Math.max(32, window.innerWidth * 0.08);

        if (ritual.active) {
            var progress = (Date.now() - ritual.startTime) / RITUAL_MS;
            if (progress < 1) abortRitualHold();
            return;
        }

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
        r.addEventListener('pointercancel', abortRitualHold, { passive: true });
        bound = true;
    }

    function unbindRoot() {
        if (!bound) return;
        var r = root();
        if (r) {
            r.removeEventListener('pointerdown', onPointerDown);
            r.removeEventListener('pointerup', onPointerUp);
            r.removeEventListener('pointercancel', abortRitualHold);
        }
        bound = false;
        clearRitualVisuals();
    }

    function forceTeardown() {
        unbindRoot();
        stopLayoutGuard();
        clearRitualVisuals();
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
        activeIdx = 3;
        isExtracted = false;
        extractedEl = null;
        var row = document.getElementById('divine-card-row');
        if (row) row.classList.remove('cards-dismissed');
        startLayoutGuard();
    }

    global.VNDivinationTouch = {
        onStageChange: onStageChange,
        forceTeardown: forceTeardown,
        pause: function () { paused = true; },
        resume: function () {
            paused = false;
            if (ritual.active) ritual.raf = requestAnimationFrame(tickRitual);
        },
        relayout: updateCardsPosition
    };
})(typeof window !== 'undefined' ? window : global);
