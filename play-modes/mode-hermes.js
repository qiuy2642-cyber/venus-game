/**
 * 赫尔墨斯 · 占卜卡牌 — 注册到 modeController，逻辑由 HTML 内 HermesPlay 提供
 */
(function (global) {
    'use strict';

    if (!global.HermesPlay) {
        console.warn('[HermesMode] HermesPlay 未定义，请确认主页面已加载 HermesPlay');
    }

    global.HermesMode = {
        init: function () {
            if (global.HermesPlay && typeof global.HermesPlay.start === 'function') {
                return global.HermesPlay.start();
            }
        },
        destroy: function () {
            if (global.HermesPlay && typeof global.HermesPlay.stop === 'function') {
                return global.HermesPlay.stop();
            }
        },
        reset: function () {
            if (global.HermesPlay && typeof global.HermesPlay.reset === 'function') {
                return global.HermesPlay.reset();
            }
        }
    };

    if (global.modeController) {
        global.modeController.register('hermes', {
            init: function () { global.HermesMode.init(); },
            destroy: function () { global.HermesMode.destroy(); },
            reset: function () { global.HermesMode.reset(); }
        });
    }
})(window);
