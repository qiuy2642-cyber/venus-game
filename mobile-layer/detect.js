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

    function isLovesignPageActive() {
        var p = document.getElementById('page-lovesign');
        return !!(p && p.classList.contains('active'));
    }

    global.VNMobileDetect = {
        isCoarsePointer: isCoarsePointer,
        isMobileLayer: isMobileLayer
    };

    global.__isMobileLightMode = function () {
        return isMobileLayer();
    };

    /** Lovesign embed: use canvas-container rect + tighter FOV on mobile portrait */
    global.__isMobileLandscapeRitual = function () {
        return isMobileLayer() && isLovesignPageActive();
    };
})(typeof window !== 'undefined' ? window : global);
