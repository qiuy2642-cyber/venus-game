/**
 * Isolated mobile mount point. Only #vn-mobile-root is owned by this layer.
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

    function alignToDivinationStage() {
        if (!root || root.hidden) return;
        var stage = document.getElementById('divination-stage');
        if (!stage || stage.style.display !== 'flex') {
            root.hidden = true;
            return;
        }
        var rect = stage.getBoundingClientRect();
        root.style.left = rect.left + 'px';
        root.style.top = rect.top + 'px';
        root.style.width = rect.width + 'px';
        root.style.height = rect.height + 'px';
        root.hidden = false;
    }

    function notifyStage(visible) {
        if (global.VNDivinationMirror && typeof global.VNDivinationMirror.onStageChange === 'function') {
            global.VNDivinationMirror.onStageChange(visible);
        }
    }

    function startStageWatch() {
        if (stageObserver) return;
        var stage = document.getElementById('divination-stage');
        if (!stage) return;
        var sync = function () {
            var visible = stage.style.display === 'flex';
            if (visible) alignToDivinationStage();
            else if (root) root.hidden = true;
            notifyStage(visible);
        };
        stageObserver = new MutationObserver(sync);
        stageObserver.observe(stage, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    function startAlignLoop() {
        var tick = function () {
            var stage = document.getElementById('divination-stage');
            if (root && stage && stage.style.display === 'flex') alignToDivinationStage();
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
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
        align: alignToDivinationStage,
        start: function () {
            ensureRoot();
            startStageWatch();
            startAlignLoop();
        },
        emit: emit,
        hide: function () {
            if (root) root.hidden = true;
        }
    };
})(typeof window !== 'undefined' ? window : global);
