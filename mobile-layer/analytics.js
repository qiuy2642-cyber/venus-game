/**
 * Mobile 专属事件写入 Firestore（复用 window.logUserInput）
 */
(function (global) {
    "use strict";

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    function log(eventType, payload) {
        if (typeof global.logUserInput !== "function") return;
        var p = payload || {};
        p.channel = "mobile-layer";
        global.logUserInput(eventType, p);
    }

    global.VNAnalytics = { log: log };

})(typeof window !== "undefined" ? window : global);
