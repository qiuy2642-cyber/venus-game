/**
 * Isolated mobile mount point. Only #vn-mobile-root is owned by this layer.
 */
(function (global) {
    'use strict';

    var root = null;
    var stageObserver = null;
    var alignRaf = 0;
    var alignActive = false;

    function ensureRoot() {
        if (root && root.isConnected) return root;
        root = document.createElement('div');
        root.id = 'vn-mobile-root';
        root.setAttribute('aria-live', 'polite');
        root.hidden = true;
        document.body.appendChild(root);
        root.addEventListener('pointerdown', function () {
            if (global.VNLandscapeMode) global.VNLandscapeMode.tryLockLandscape();
        }, { passive: true, once: false });
        return root;
    }

    function alignToDivinationStage() {
        if (!root || root.hidden) return;
        var stage = document.getElementById('divination-stage');
        if (!stage || stage.style.display !== 'flex') {
            root.hidden = true;
            stopAlignLoop();
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
        if (visible) {
            if (global.VNCameraGuard) global.VNCameraGuard.onDivinationOpen();
            if (global.VNLandscapeMode) global.VNLandscapeMode.tryLockLandscape();
        } else if (global.VNCameraGuard) {
            global.VNCameraGuard.onDivinationClose();
        }
        if (global.VNDivinationMirror && typeof global.VNDivinationMirror.onStageChange === 'function') {
            global.VNDivinationMirror.onStageChange(visible);
        }
    }

    function stopAlignLoop() {
        alignActive = false;
        if (alignRaf) {
            cancelAnimationFrame(alignRaf);
            alignRaf = 0;
        }
    }

    function startAlignLoop() {
        if (alignActive) return;
        alignActive = true;
        var tick = function () {
            if (!alignActive) return;
            var stage = document.getElementById('divination-stage');
            if (root && stage && stage.style.display === 'flex') {
                alignToDivinationStage();
                alignRaf = requestAnimationFrame(tick);
            } else {
                stopAlignLoop();
            }
        };
        alignRaf = requestAnimationFrame(tick);
    }

    function startStageWatch() {
        if (stageObserver) return;
        var stage = document.getElementById('divination-stage');
        if (!stage) return;
        var sync = function () {
            var visible = stage.style.display === 'flex';
            if (visible) {
                alignToDivinationStage();
                startAlignLoop();
            } else {
                if (root) root.hidden = true;
                stopAlignLoop();
            }
            notifyStage(visible);
        };
        stageObserver = new MutationObserver(sync);
        stageObserver.observe(stage, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    function onVisibilityChange() {
        if (document.hidden) {
            stopAlignLoop();
            if (global.VNDivinationMirror && global.VNDivinationMirror.pause) {
                global.VNDivinationMirror.pause();
            }
        } else {
            var stage = document.getElementById('divination-stage');
            if (stage && stage.style.display === 'flex') startAlignLoop();
            if (global.VNDivinationMirror && global.VNDivinationMirror.resume) {
                global.VNDivinationMirror.resume();
            }
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
        align: alignToDivinationStage,
        start: function () {
            ensureRoot();
            startStageWatch();
            document.addEventListener('visibilitychange', onVisibilityChange);
        },
        emit: emit,
        hide: function () {
            if (root) root.hidden = true;
            stopAlignLoop();
        }
    };
})(typeof window !== 'undefined' ? window : global);
