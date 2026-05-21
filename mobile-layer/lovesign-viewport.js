/**
 * Mobile lovesign: resize Three.js to canvas box so slips stay in view.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    function relayout() {
        if (typeof global.onWindowResize === 'function') {
            global.onWindowResize();
        } else {
            global.dispatchEvent(new Event('resize'));
        }
    }

    function bindStartBtn() {
        var btn = document.getElementById('start-btn');
        if (!btn || btn.__vnLsViewport) return;
        btn.__vnLsViewport = true;
        btn.addEventListener('click', function () {
            global.setTimeout(relayout, 900);
            global.setTimeout(relayout, 2200);
        }, { passive: true });
    }

    function watchLovesignPage() {
        var page = document.getElementById('page-lovesign');
        if (!page) return;
        var obs = new MutationObserver(function () {
            if (page.classList.contains('active')) {
                global.setTimeout(relayout, 80);
                global.setTimeout(relayout, 400);
                global.setTimeout(relayout, 1200);
            }
        });
        obs.observe(page, { attributes: true, attributeFilter: ['class'] });
        global.addEventListener('resize', function () {
            if (page.classList.contains('active')) relayout();
        });
    }

    function start() {
        watchLovesignPage();
        bindStartBtn();
        global.setTimeout(bindStartBtn, 800);
    }

    global.VNLovesignViewport = { start: start, relayout: relayout };
})(typeof window !== 'undefined' ? window : global);
