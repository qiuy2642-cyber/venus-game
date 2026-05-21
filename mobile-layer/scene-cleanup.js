/**
 * Reset mobile viewport / overflow / divination DOM after scene changes.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    function resetViewport() {
        var html = document.documentElement;
        var body = document.body;
        html.style.overflowX = 'hidden';
        html.style.maxWidth = '100%';
        body.style.overflowX = 'hidden';
        body.style.overflowY = 'hidden';
        body.style.maxWidth = '100vw';
        body.style.width = '100%';
        body.style.transform = 'none';
        body.style.translate = 'none';
        body.style.position = '';
        html.scrollLeft = 0;
        body.scrollLeft = 0;
        window.scrollTo(0, 0);
    }

    function resetDivinationArtifacts() {
        var stage = document.getElementById('divination-stage');
        if (stage && stage.style.display === 'flex') return;

        if (global.VNDivinationTouch && global.VNDivinationTouch.forceTeardown) {
            global.VNDivinationTouch.forceTeardown();
        }
        if (global.VNMobileRoot && global.VNMobileRoot.hideTouchLayer) {
            global.VNMobileRoot.hideTouchLayer();
        }

        var portal = document.getElementById('divine-card-portal');
        if (portal) portal.innerHTML = '';

        document.querySelectorAll('.divine-card-item').forEach(function (card) {
            card.classList.remove('extracted', 'flipped');
            card.removeAttribute('style');
        });

        var row = document.getElementById('divine-card-row');
        if (row) {
            row.classList.remove('cards-dismissed');
        }

        var curtain = document.getElementById('divine-curtain');
        if (curtain) curtain.classList.remove('shrouded');

        var aura = document.getElementById('ritual-aura');
        if (aura) aura.style.display = 'none';
    }

    function resetBodySceneClasses() {
        document.body.classList.remove('lovesign-active', 'heartrate-active');
        var activePage = document.querySelector('.page.active');
        if (activePage && activePage.id === 'page3') {
            document.body.style.backgroundColor = '';
            var overlay = document.querySelector('.bg-overlay');
            if (overlay) overlay.style.opacity = '';
        }
    }

    function onActivePageChange() {
        resetViewport();
        resetDivinationArtifacts();
        resetBodySceneClasses();
    }

    function startWatch() {
        var obs = new MutationObserver(function (mutations) {
            var pageChanged = mutations.some(function (m) {
                return m.target.classList && m.target.classList.contains('page');
            });
            if (pageChanged) onActivePageChange();
        });
        document.querySelectorAll('.page').forEach(function (p) {
            obs.observe(p, { attributes: true, attributeFilter: ['class'] });
        });
        onActivePageChange();
    }

    global.VNSceneCleanup = {
        resetViewport: resetViewport,
        start: startWatch
    };
})(typeof window !== 'undefined' ? window : global);
