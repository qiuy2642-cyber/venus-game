/**
 * Mobile-only: skip VN (page2), land on page3 with same look as desktop VN ending.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    function goHubAfterTransition() {
        var tl = document.getElementById('dream-transition');
        var page3 = document.getElementById('page3');

        document.querySelectorAll('.page').forEach(function (p) {
            p.classList.toggle('active', p === page3);
        });

        if (page3) {
            page3.classList.remove('venus-mode', 'hermes-mode');
        }

        document.body.style.backgroundColor = '';
        var overlay = document.querySelector('.bg-overlay');
        if (overlay) overlay.style.opacity = '';

        if (tl) {
            tl.style.display = 'none';
            tl.classList.remove('expanding');
            tl.style.opacity = '1';
            tl.style.transition = '';
        }

        document.documentElement.classList.remove('vn-skip-vn-transition');

        if (typeof global.showToast === 'function') {
            global.showToast('✦ 选择你的启示 ✦');
        }
    }

    function mobileDreamTransition() {
        var tl = document.getElementById('dream-transition');
        if (!tl) return;

        document.documentElement.classList.add('vn-skip-vn-transition');

        tl.style.display = 'flex';
        tl.style.opacity = '1';
        global.setTimeout(function () { tl.classList.add('expanding'); }, 50);
        global.setTimeout(function () {
            tl.style.opacity = '0';
            tl.style.transition = 'opacity 1.5s ease';
            global.setTimeout(goHubAfterTransition, 1500);
        }, 4000);
    }

    function bindStartButton() {
        var buttons = document.querySelectorAll('button[onclick*="triggerDreamTransition"]');
        buttons.forEach(function (btn) {
            if (btn.__vnMobileBound) return;
            btn.__vnMobileBound = true;
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopImmediatePropagation();
                mobileDreamTransition();
            }, true);
        });
    }

    function start() {
        bindStartButton();
        global.setTimeout(bindStartButton, 500);
    }

    global.VNVnShortcut = { start: start };
})(typeof window !== 'undefined' ? window : global);
