/**
 * Transparent touch layer + divination stage observer.
 */
(function (global) {
    'use strict';

    var root = null;
    var stageObserver = null;

    function ensureRoot() {
        if (root && root.isConnected) return root;
        root = document.createElement('div');
        root.id = 'vn-mobile-root';
        root.setAttribute('aria-hidden', 'true');
        root.hidden = true;
        document.body.appendChild(root);
        return root;
    }

    function notifyStage(visible) {
        if (global.VNDivinationTouch && typeof global.VNDivinationTouch.onStageChange === 'function') {
            global.VNDivinationTouch.onStageChange(visible);
        }
    }

    function startStageWatch() {
        if (stageObserver) return;
        var stage = document.getElementById('divination-stage');
        if (!stage) return;
        var sync = function () {
            notifyStage(stage.style.display === 'flex');
        };
        stageObserver = new MutationObserver(sync);
        stageObserver.observe(stage, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    function onVisibilityChange() {
        if (!global.VNDivinationTouch) return;
        if (document.hidden && global.VNDivinationTouch.pause) global.VNDivinationTouch.pause();
        else if (global.VNDivinationTouch.resume) global.VNDivinationTouch.resume();
    }

    global.VNMobileRoot = {
        get: ensureRoot,
        showTouchLayer: function () {
            var r = ensureRoot();
            r.hidden = false;
            r.classList.add('vn-m-touch-active');
        },
        hideTouchLayer: function () {
            if (root) {
                root.hidden = true;
                root.classList.remove('vn-m-touch-active');
            }
        },
        start: function () {
            ensureRoot();
            startStageWatch();
            document.addEventListener('visibilitychange', onVisibilityChange);
        }
    };
})(typeof window !== 'undefined' ? window : global);
