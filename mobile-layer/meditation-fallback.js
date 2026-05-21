/**
 * Mobile meditation: allow desktop flow; touch fallback when camera unavailable.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    var fallbackActive = false;
    var eyesStart = 0;
    var tickTimer = null;

    function isMeditationPage() {
        var p = document.getElementById('page-meditation');
        return !!(p && p.classList.contains('active'));
    }

    function hasVideoStream() {
        var v = document.getElementById('input-video');
        return !!(v && v.srcObject && v.srcObject.getTracks && v.srcObject.getTracks().length);
    }

    function stopFallback() {
        fallbackActive = false;
        eyesStart = 0;
        if (tickTimer) clearInterval(tickTimer);
        tickTimer = null;
        var hint = document.getElementById('vn-m-fallback-hint');
        if (hint) hint.remove();
    }

    function ensureFallbackHint() {
        var page = document.getElementById('page-meditation');
        if (!page || document.getElementById('vn-m-fallback-hint')) return;
        var hint = document.createElement('p');
        hint.id = 'vn-m-fallback-hint';
        hint.className = 'vn-m-fallback-hint';
        hint.textContent = '无需摄像头：按住屏幕闭目满 5 秒即可完成';
        page.appendChild(hint);
    }

    function tickFallback() {
        if (!fallbackActive || !isMeditationPage()) return;
        var timerEl = document.getElementById('meditation-timer');
        var indicator = document.getElementById('face-status-indicator');
        if (!eyesStart) return;
        var elapsed = Math.floor((Date.now() - eyesStart) / 1000);
        var remaining = 5 - elapsed;
        if (timerEl) {
            timerEl.classList.add('show');
            timerEl.innerText = String(Math.max(0, remaining));
            timerEl.style.opacity = remaining % 2 === 0 ? '0.4' : '1';
        }
        if (indicator) indicator.innerText = '● 闭目感应中（触屏）';
        if (remaining <= 0) {
            stopFallback();
            var locked = document.getElementById('meditation-locked');
            if (locked) locked.style.opacity = '1';
            if (typeof global.showToast === 'function') global.showToast('✦ 冥想完成 ✦');
            global.setTimeout(function () {
                document.querySelectorAll('.page').forEach(function (p) {
                    p.classList.remove('active');
                });
                var q1 = document.getElementById('page-q1');
                if (q1) q1.classList.add('active');
                if (global.VNSceneCleanup) global.VNSceneCleanup.resetViewport();
            }, 2500);
        }
    }

    function startFallbackMode() {
        if (fallbackActive) return;
        fallbackActive = true;
        ensureFallbackHint();
        var indicator = document.getElementById('face-status-indicator');
        if (indicator) indicator.innerText = '按住屏幕闭目 5 秒';
    }

    function onPointerDown() {
        if (!fallbackActive || !isMeditationPage()) return;
        eyesStart = Date.now();
        if (!tickTimer) tickTimer = setInterval(tickFallback, 200);
    }

    function onPointerUp() {
        if (!fallbackActive) return;
        if (eyesStart && Date.now() - eyesStart < 500) {
            eyesStart = 0;
            var indicator = document.getElementById('face-status-indicator');
            if (indicator) indicator.innerText = '按住屏幕闭目 5 秒';
            var timerEl = document.getElementById('meditation-timer');
            if (timerEl) {
                timerEl.innerText = '5';
                timerEl.classList.remove('show');
            }
        }
    }

    function bindFallbackPointers() {
        var page = document.getElementById('page-meditation');
        if (!page || page.__vnFbBound) return;
        page.__vnFbBound = true;
        page.addEventListener('pointerdown', onPointerDown, { passive: true });
        page.addEventListener('pointerup', onPointerUp, { passive: true });
        page.addEventListener('pointercancel', onPointerUp, { passive: true });
    }

    function armMeditationCameraWindow() {
        global.__vnMeditationFlowActive = true;
        if (global.VNCameraGuard) global.VNCameraGuard.setMeditationCamera(true);
        global.setTimeout(function () {
            global.__vnMeditationFlowActive = false;
            if (global.VNCameraGuard && !isMeditationPage()) {
                global.VNCameraGuard.setMeditationCamera(false);
            }
        }, 12000);
    }

    function checkNeedFallback() {
        if (!isMeditationPage()) {
            stopFallback();
            return;
        }
        global.setTimeout(function () {
            if (!isMeditationPage()) return;
            if (!hasVideoStream()) {
                startFallbackMode();
            }
        }, 1200);
    }

    function bindMeditationTriggers() {
        document.querySelectorAll('[onclick*="startMeditationFlow"]').forEach(function (el) {
            if (el.__vnMedArm) return;
            el.__vnMedArm = true;
            el.addEventListener('pointerdown', armMeditationCameraWindow, { passive: true, capture: true });
        });
    }

    function watchMeditationPage() {
        var page = document.getElementById('page-meditation');
        if (!page) return;
        var obs = new MutationObserver(function () {
            if (page.classList.contains('active')) {
                bindFallbackPointers();
                checkNeedFallback();
            } else {
                stopFallback();
                if (global.VNCameraGuard) global.VNCameraGuard.setMeditationCamera(false);
            }
        });
        obs.observe(page, { attributes: true, attributeFilter: ['class'] });
    }

    function start() {
        bindMeditationTriggers();
        global.setTimeout(bindMeditationTriggers, 1000);
        watchMeditationPage();
        bindFallbackPointers();
    }

    global.VNMeditationFallback = { start: start, stop: stopFallback };
})(typeof window !== 'undefined' ? window : global);
