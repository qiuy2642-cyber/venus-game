/**
 * Mobile-only: block camera / MediaPipe Hands outside meditation.
 * Desktop never loads this file.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    global.__vnBlockDivineCanvas = false;

    function isMeditationActive() {
        var page = document.getElementById('page-meditation');
        return !!(page && page.classList.contains('active'));
    }

    function isDivinationActive() {
        var stage = document.getElementById('divination-stage');
        return !!(stage && stage.style.display === 'flex');
    }

    function shouldAllowCamera() {
        return isMeditationActive();
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

    function setDivinationVisionBlock(block) {
        global.__vnBlockDivineCanvas = !!block;
        if (block) stopInputVideoTracks();
    }

    function patchCanvas2D() {
        if (global.__vnCanvas2DPatched) return;
        var names = ['fillRect', 'arc', 'fill', 'beginPath', 'clearRect'];
        names.forEach(function (name) {
            var orig = CanvasRenderingContext2D.prototype[name];
            if (typeof orig !== 'function') return;
            CanvasRenderingContext2D.prototype[name] = function () {
                if (global.__vnBlockDivineCanvas && this.canvas && this.canvas.id === 'divine-canvas') {
                    return;
                }
                return orig.apply(this, arguments);
            };
        });
        global.__vnCanvas2DPatched = true;
    }

    function patchGetUserMedia() {
        if (global.__vnGUMPatched || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        var orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function (constraints) {
            if (!shouldAllowCamera()) {
                return Promise.reject(new DOMException('Camera disabled on mobile outside meditation', 'NotAllowedError'));
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
                    if (!shouldAllowCamera()) return;
                    if (typeof fn === 'function') fn(results);
                });
            };
            if (typeof inst.send === 'function') {
                var origSend = inst.send.bind(inst);
                inst.send = function () {
                    if (!shouldAllowCamera()) return Promise.resolve();
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
        var Real = global.Camera;
        global.Camera = function (videoEl, options) {
            var opts = options || {};
            var origOnFrame = opts.onFrame;
            opts.onFrame = async function () {
                if (!shouldAllowCamera()) return;
                if (typeof origOnFrame === 'function') return origOnFrame.apply(this, arguments);
            };
            var cam = new Real(videoEl, opts);
            var origStart = cam.start.bind(cam);
            cam.start = function () {
                if (!shouldAllowCamera()) return;
                return origStart();
            };
            return cam;
        };
        global.Camera.prototype = Real.prototype;
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
        var sync = function () {
            var on = stage.style.display === 'flex';
            setDivinationVisionBlock(on && !isMeditationActive());
        };
        var obs = new MutationObserver(sync);
        obs.observe(stage, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    function watchMeditationPage() {
        var page = document.getElementById('page-meditation');
        if (!page) return;
        var sync = function () {
            if (page.classList.contains('active')) {
                setDivinationVisionBlock(false);
            } else {
                stopInputVideoTracks();
                if (isDivinationActive()) setDivinationVisionBlock(true);
            }
        };
        var obs = new MutationObserver(sync);
        obs.observe(page, { attributes: true, attributeFilter: ['class'] });
        sync();
    }

    patchGetUserMedia();
    patchCanvas2D();
    pollMediapipe();
    watchDivinationStage();
    watchMeditationPage();

    global.VNCameraGuard = {
        stopTracks: stopInputVideoTracks,
        onDivinationOpen: function () {
            setDivinationVisionBlock(true);
        },
        onDivinationClose: function () {
            setDivinationVisionBlock(false);
            stopInputVideoTracks();
        }
    };
})(typeof window !== 'undefined' ? window : global);
