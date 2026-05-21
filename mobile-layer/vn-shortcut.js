/**
 * Mobile-only: skip VN (page2), go to hub (page3) after dream transition.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    function goHubAfterTransition() {
        var tl = document.getElementById('dream-transition');
        if (tl) {
            tl.style.display = 'none';
            tl.classList.remove('expanding');
            tl.style.opacity = '1';
        }
        document.querySelectorAll('.page').forEach(function (p) {
            p.classList.remove('active');
        });
        var page3 = document.getElementById('page3');
        if (page3) {
            page3.classList.add('active');
            page3.classList.add('hermes-mode');
            page3.classList.remove('venus-mode');
        }
        if (typeof global.showToast === 'function') {
            global.showToast('✦ 选择你的启示 ✦');
        }
    }

    function mobileDreamTransition() {
        var tl = document.getElementById('dream-transition');
        if (!tl) return;
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
