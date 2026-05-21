/**
 * Isolated mobile mount point — portrait-first full viewport shell.
 */
(function (global) {
    'use strict';

    var root = null;
    var stageObserver = null;

    function ensureRoot() {
        if (root && root.isConnected) return root;
        root = document.createElement('div');
        root.id = 'vn-mobile-root';
        root.setAttribute('aria-live', 'polite');
        root.hidden = true;
        document.body.appendChild(root);
        return root;
    }

    function showRoot() {
        ensureRoot();
        root.hidden = false;
    }

    function notifyStage(visible) {
        if (visible) {
            showRoot();
            if (global.VNCameraGuard) global.VNCameraGuard.onDivinationOpen();
        } else {
            if (global.VNCameraGuard) global.VNCameraGuard.onDivinationClose();
            if (root) root.hidden = true;
        }
        if (global.VNDivinationMirror && typeof global.VNDivinationMirror.onStageChange === 'function') {
            global.VNDivinationMirror.onStageChange(visible);
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
        if (document.hidden) {
            if (global.VNDivinationMirror && global.VNDivinationMirror.pause) {
                global.VNDivinationMirror.pause();
            }
        } else if (global.VNDivinationMirror && global.VNDivinationMirror.resume) {
            global.VNDivinationMirror.resume();
        }
    }

    function emit(detail) {
        if (!root) return;
        root.dispatchEvent(new CustomEvent('vn-mobile-output', { bubbles: false, detail: detail }));
        if (detail && detail.type === 'toast' && typeof global.showToast === 'function') {
            global.showToast(detail.message);
        }
    }

    global.VNMobileRoot = {
        get: ensureRoot,
        start: function () {
            ensureRoot();
            startStageWatch();
            document.addEventListener('visibilitychange', onVisibilityChange);
        },
        emit: emit,
        hide: function () {
            if (root) root.hidden = true;
        }
    };
})(typeof window !== 'undefined' ? window : global);
