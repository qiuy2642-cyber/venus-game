/**
 * Coarse-pointer mobile detection only. Never used on desktop fine pointer.
 */
(function (global) {
    'use strict';

    function isCoarsePointer() {
        try {
            return window.matchMedia('(pointer: coarse)').matches;
        } catch (e) {
            return 'ontouchstart' in window;
        }
    }

    function isMobileLayer() {
        return isCoarsePointer();
    }

    global.VNMobileDetect = {
        isCoarsePointer: isCoarsePointer,
        isMobileLayer: isMobileLayer
    };
})(typeof window !== 'undefined' ? window : global);
