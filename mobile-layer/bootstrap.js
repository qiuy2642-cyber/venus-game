/**
 * Mobile layer entry — coarse pointer only. No global patches.
 */
(function () {
    'use strict';

    function loadScript(src, cb) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = function () { if (cb) cb(); };
        s.onerror = function () { console.warn('[mobile-layer] failed:', src); if (cb) cb(); };
        document.head.appendChild(s);
    }

    function boot() {
        if (!window.VNMobileDetect || !window.VNMobileDetect.isMobileLayer()) return;

        loadScript('mobile-layer/divination-mirror.js', function () {
            loadScript('mobile-layer/mobile-root.js', function () {
                if (window.VNMobileRoot) window.VNMobileRoot.start();
            });
        });
    }

    loadScript('mobile-layer/detect.js', boot);
})();
