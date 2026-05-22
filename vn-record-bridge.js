/**
 * 若页面仍引用已失效的 firebase/ 路径，由此脚本改加载根目录记录模块
 */
(function () {
    "use strict";
    if (window.__vnRecordBridgeDone) return;
    window.__vnRecordBridgeDone = true;

    var chain = [
        "venus-config.js",
        "user-input-logger.js",
        "ritual-logger.js",
        "event-hooks.js",
        "venus-record-boot.js"
    ];

    function loadSeq(i) {
        if (i >= chain.length) return;
        var src = chain[i];
        var exists = document.querySelector('script[src="' + src + '"]');
        if (exists) {
            loadSeq(i + 1);
            return;
        }
        var s = document.createElement("script");
        s.src = src;
        s.async = false;
        s.onload = function () { loadSeq(i + 1); };
        s.onerror = function () {
            console.error("[记录桥接] 加载失败:", src, location.href);
            loadSeq(i + 1);
        };
        document.head.appendChild(s);
    }

    loadSeq(0);
})();
