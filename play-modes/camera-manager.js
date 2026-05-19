/**
 * 共享摄像头与 MediaPipe Camera 帧循环（玩法间互斥注册 handler）
 */
(function (global) {
    'use strict';

    var stream = null;
    var mpCamera = null;
    var videoEl = null;
    var handlers = Object.create(null);
    var starting = false;

    function getVideo() {
        if (!videoEl) {
            videoEl = document.getElementById('input-video');
        }
        return videoEl;
    }

    function stopStream() {
        if (stream) {
            stream.getTracks().forEach(function (t) { t.stop(); });
            stream = null;
        }
        var v = getVideo();
        if (v) v.srcObject = null;
    }

    function stopMpCamera() {
        if (mpCamera && typeof mpCamera.stop === 'function') {
            try { mpCamera.stop(); } catch (e) { /* ignore */ }
        }
        mpCamera = null;
    }

    function hasHandlers() {
        return Object.keys(handlers).some(function (k) { return typeof handlers[k] === 'function'; });
    }

    function startMpCamera() {
        if (mpCamera || typeof Camera === 'undefined') return;
        var video = getVideo();
        if (!video) return;
        mpCamera = new Camera(video, {
            onFrame: async function () {
                var keys = Object.keys(handlers);
                for (var i = 0; i < keys.length; i++) {
                    var fn = handlers[keys[i]];
                    if (typeof fn === 'function') {
                        await fn(video);
                    }
                }
            },
            width: 640,
            height: 480
        });
        mpCamera.start();
    }

    async function ensureStream() {
        if (stream && stream.active) return stream;
        var video = getVideo();
        if (!video) throw new Error('input-video not found');
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await video.play().catch(function () {});
        return stream;
    }

    async function syncCameraLoop() {
        if (!hasHandlers()) {
            stopMpCamera();
            stopStream();
            return;
        }
        if (starting) return;
        starting = true;
        try {
            await ensureStream();
            startMpCamera();
        } catch (err) {
            console.warn('[CameraManager]', err);
            if (typeof global.showToast === 'function') {
                global.showToast('仪式需要访问相机以感应灵魂...');
            }
        } finally {
            starting = false;
        }
    }

    global.CameraManager = {
        register: function (modeId, frameHandler) {
            if (!modeId) return;
            if (typeof frameHandler === 'function') {
                handlers[modeId] = frameHandler;
            } else {
                delete handlers[modeId];
            }
            syncCameraLoop();
        },

        unregister: function (modeId) {
            delete handlers[modeId];
            syncCameraLoop();
        },

        requestPermission: async function () {
            try {
                await ensureStream();
                return true;
            } catch (err) {
                console.warn('[CameraManager] permission', err);
                return false;
            }
        },

        stopAll: function () {
            handlers = Object.create(null);
            stopMpCamera();
            stopStream();
        },

        getStream: function () { return stream; }
    };
})(window);
