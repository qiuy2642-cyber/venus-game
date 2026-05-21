/**
 * Mobile layer entry.
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

    function bootApp() {
        document.documentElement.classList.add('vn-mobile-active');

        loadScript('mobile-layer/scene-cleanup.js', function () {
            if (window.VNSceneCleanup) window.VNSceneCleanup.start();
            loadScript('mobile-layer/vn-shortcut.js', function () {
                if (window.VNVnShortcut) window.VNVnShortcut.start();
                loadScript('mobile-layer/meditation-fallback.js', function () {
                    if (window.VNMeditationFallback) window.VNMeditationFallback.start();
                    loadScript('mobile-layer/divination-touch.js', function () {
                        loadScript('mobile-layer/mobile-root.js', function () {
                            if (window.VNMobileRoot) window.VNMobileRoot.start();
                        });
                    });
                });
            });
        });
    }

    function start() {
        if (window.VNMobileDetect && window.VNMobileDetect.isMobileLayer()) {
            bootApp();
        }
    }

    if (window.VNMobileDetect) {
        start();
    } else {
        loadScript('mobile-layer/detect.js', start);
    }
})();
