/**
 * Mobile-only landscape gate and safe-area shell.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    var gate = null;
    var lockTried = false;

    function ensureGate() {
        if (gate && gate.isConnected) return gate;
        gate = document.createElement('div');
        gate.id = 'vn-mobile-orient-gate';
        gate.setAttribute('aria-hidden', 'true');
        gate.innerHTML = '<div class="vn-orient-msg">请旋转至横屏</div><div class="vn-orient-sub">以获得完整仪式体验</div>';
        document.body.appendChild(gate);
        return gate;
    }

    function tryLockLandscape() {
        if (lockTried) return;
        lockTried = true;
        try {
            if (screen.orientation && typeof screen.orientation.lock === 'function') {
                screen.orientation.lock('landscape').catch(function () { lockTried = false; });
            }
        } catch (e) {
            lockTried = false;
        }
    }

    function sync() {
        ensureGate();
        var landscape = global.matchMedia('(orientation: landscape)').matches;
        document.documentElement.classList.toggle('vn-mobile-landscape', landscape);
        document.documentElement.classList.toggle('vn-mobile-portrait', !landscape);
        gate.hidden = landscape;
        if (landscape) tryLockLandscape();
    }

    function start() {
        ensureGate();
        sync();
        global.matchMedia('(orientation: landscape)').addEventListener('change', sync);
    }

    global.VNLandscapeMode = { start: start, tryLockLandscape: tryLockLandscape };
})(typeof window !== 'undefined' ? window : global);
