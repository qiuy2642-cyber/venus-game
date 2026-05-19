/**
 * 玩法切换：destroy 当前 → init 目标
 */
(function (global) {
    'use strict';

    var modes = Object.create(null);
    var currentId = null;

    function switchTo(nextId) {
        var next = nextId || 'idle';
        if (currentId === next) {
            if (next !== 'idle' && modes[next] && typeof modes[next].init === 'function') {
                modes[next].init();
            }
            return Promise.resolve();
        }
        if (currentId && modes[currentId] && typeof modes[currentId].destroy === 'function') {
            try { modes[currentId].destroy(); } catch (e) { console.error('[mode]', currentId, 'destroy', e); }
        }
        currentId = next === 'idle' ? null : next;
        if (!currentId && global.CameraManager) {
            global.CameraManager.stopAll();
        }
        if (currentId && modes[currentId] && typeof modes[currentId].init === 'function') {
            try { modes[currentId].init(); } catch (e) { console.error('[mode]', currentId, 'init', e); }
        }
        return Promise.resolve();
    }

    global.modeController = {
        register: function (id, api) {
            if (!id || !api) return;
            modes[id] = api;
        },
        switchTo: switchTo,
        getCurrent: function () { return currentId; },
        resetCurrent: function () {
            if (currentId && modes[currentId] && typeof modes[currentId].reset === 'function') {
                modes[currentId].reset();
            }
        }
    };
})(window);
