/**
 * PWA：注册 SW（安装到桌面/主屏幕需 manifest 图标）
 */
(function (global) {
    'use strict';

    function isFileProtocol() {
        return global.location && global.location.protocol === 'file:';
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in global.navigator)) return;
        if (isFileProtocol()) {
            console.warn('[PWA] 请用本地服务器 http:// 打开，勿用 file://');
            return;
        }
        global.addEventListener('load', function () {
            global.navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function (err) {
                console.warn('[PWA] SW register failed', err);
            });
        });
    }

    registerServiceWorker();
})(window);
