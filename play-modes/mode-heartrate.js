/**
 * 维纳斯 · 心跳共振频率
 */
(function (global) {
    'use strict';

    global.HeartrateMode = {
        init: function () {
            document.body.classList.add('heartrate-active');
            if (typeof global.applyTailwindConfig === 'function') {
                global.applyTailwindConfig();
            }
            var bootHr = function () {
                if (typeof global.initHeartRatePage === 'function') {
                    global.initHeartRatePage();
                }
            };
            requestAnimationFrame(function () {
                requestAnimationFrame(bootHr);
            });
        },
        destroy: function () {
            document.body.classList.remove('heartrate-active');
            if (typeof global.heartrateReset === 'function') {
                global.heartrateReset();
            }
        },
        reset: function () {
            if (typeof global.heartrateReset === 'function') {
                global.heartrateReset();
            }
        }
    };

    if (global.modeController) {
        global.modeController.register('heartrate', {
            init: function () { global.HeartrateMode.init(); },
            destroy: function () { global.HeartrateMode.destroy(); },
            reset: function () { global.HeartrateMode.reset(); }
        });
    }
})(window);
