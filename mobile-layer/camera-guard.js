/**
 * Mobile-only: block Hand tracking & auto camera outside meditation.
 * FaceMesh / meditation camera still allowed. Desktop never loads this file.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    function isMeditationActive() {
        var page = document.getElementById('page-meditation');
        return !!(page && page.classList.contains('active'));
    }

    function shouldAllowCamera() {
        return isMeditationActive();
    }

    function shouldAllowHands() {
        return false;
    }

    function stopInputVideoTracks() {
        var video = document.getElementById('input-video');
        if (!video) return;
        var stream = video.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(function (t) {
                try { t.stop(); } catch (e) { /* ignore */ }
            });
        }
        video.srcObject = null;
    }

    function patchGetUserMedia() {
        if (global.__vnGUMPatched || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        var orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function (constraints) {
            if (!shouldAllowCamera()) {
                return Promise.reject(new DOMException('Mobile camera only for meditation', 'NotAllowedError'));
            }
            return orig(constraints);
        };
        global.__vnGUMPatched = true;
    }

    function installHands() {
        if (global.__vnMobileHandsWrapped || typeof global.Hands === 'undefined') return false;
        var Real = global.Hands;
        global.Hands = function (config) {
            var inst = new Real(config);
            var origOnResults = inst.onResults.bind(inst);
            inst.onResults = function (fn) {
                origOnResults(function (results) {
                    if (!shouldAllowHands()) return;
                    if (typeof fn === 'function') fn(results);
                });
            };
            if (typeof inst.send === 'function') {
                var origSend = inst.send.bind(inst);
                inst.send = function () {
                    if (!shouldAllowHands()) return Promise.resolve();
                    return origSend.apply(inst, arguments);
                };
            }
            return inst;
        };
        global.Hands.prototype = Real.prototype;
        global.__vnMobileHandsWrapped = true;
        return true;
    }

    function installCamera() {
        if (global.__vnMobileCameraWrapped || typeof global.Camera === 'undefined') return false;
        var RealCamera = global.Camera;
        global.Camera = function (videoEl, options) {
            var opts = options || {};
            var origOnFrame = opts.onFrame;
            opts.onFrame = async function () {
                if (!shouldAllowCamera()) return;
                if (typeof origOnFrame === 'function') return origOnFrame.apply(this, arguments);
            };
            var cam = new RealCamera(videoEl, opts);
            var origStart = cam.start.bind(cam);
            cam.start = function () {
                if (!shouldAllowCamera()) return;
                return origStart();
            };
            return cam;
        };
        global.Camera.prototype = RealCamera.prototype;
        global.__vnMobileCameraWrapped = true;
        return true;
    }

    function pollMediapipe() {
        installHands();
        installCamera();
        if (!global.__vnMobileHandsWrapped || !global.__vnMobileCameraWrapped) {
            global.setTimeout(pollMediapipe, 60);
        }
    }

    function watchDivinationStage() {
        var stage = document.getElementById('divination-stage');
        if (!stage) return;
        var obs = new MutationObserver(function () {
            if (stage.style.display === 'flex' && !isMeditationActive()) {
                stopInputVideoTracks();
            }
        });
        obs.observe(stage, { attributes: true, attributeFilter: ['style'] });
    }

    patchGetUserMedia();
    pollMediapipe();
    watchDivinationStage();

    global.VNCameraGuard = {
        stopTracks: stopInputVideoTracks,
        onDivinationOpen: stopInputVideoTracks,
        onDivinationClose: function () {
            if (!isMeditationActive()) stopInputVideoTracks();
        }
    };
})(typeof window !== 'undefined' ? window : global);
