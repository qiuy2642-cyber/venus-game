/**
 * Mobile: block Hands; real camera + FaceMesh only during meditation.
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    global.__vnMeditationWantsCamera = false;
    var origGetUserMedia = null;

    function isMeditationActive() {
        var page = document.getElementById('page-meditation');
        return !!(page && page.classList.contains('active'));
    }

    function shouldAllowCamera() {
        return !!(
            global.__vnMeditationWantsCamera ||
            global.__vnMeditationFlowActive ||
            isMeditationActive()
        );
    }

    function shouldAllowHands() {
        return false;
    }

    function fakeVideoStream() {
        var canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        return Promise.resolve(canvas.captureStream(0));
    }

    function videoEl() {
        return document.getElementById('input-video');
    }

    function hasLiveVideoTrack() {
        var video = videoEl();
        if (!video || !video.srcObject) return false;
        var tracks = video.srcObject.getVideoTracks ? video.srcObject.getVideoTracks() : [];
        return tracks.some(function (t) { return t.readyState === 'live'; });
    }

    function stopInputVideoTracks() {
        var video = videoEl();
        if (!video) return;
        if (isMeditationActive() || shouldAllowCamera()) return;
        var stream = video.srcObject;
        if (stream && typeof stream.getTracks === 'function') {
            stream.getTracks().forEach(function (t) {
                try { t.stop(); } catch (e) { /* ignore */ }
            });
        }
        video.srcObject = null;
    }

    function attachMeditationStream() {
        if (!navigator.mediaDevices || !origGetUserMedia) {
            return Promise.reject(new Error('getUserMedia unavailable'));
        }
        var video = videoEl();
        if (!video) return Promise.reject(new Error('input-video missing'));

        return origGetUserMedia.call(navigator.mediaDevices, {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            },
            audio: false
        }).then(function (stream) {
            video.srcObject = stream;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', 'true');
            video.muted = true;
            return video.play().catch(function () { /* autoplay policy */ });
        });
    }

    function restartMediaPipeCamera() {
        var cam = global.__vnMediaPipeCamera;
        if (!cam) return Promise.resolve();
        try {
            if (typeof cam.stop === 'function') cam.stop();
        } catch (e) { /* ignore */ }
        if (typeof cam.start === 'function') {
            return Promise.resolve(cam.start());
        }
        return Promise.resolve();
    }

    function ensureMeditationVision() {
        if (!shouldAllowCamera()) return Promise.resolve();

        return attachMeditationStream()
            .then(restartMediaPipeCamera)
            .catch(function (err) {
                console.warn('[VNCameraGuard] meditation vision failed', err);
                if (typeof global.showToast === 'function') {
                    global.showToast('请允许摄像头权限以完成闭眼冥想');
                }
            });
    }

    function patchGetUserMedia() {
        if (global.__vnGUMPatched || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function (constraints) {
            if (shouldAllowCamera()) {
                return origGetUserMedia(constraints);
            }
            return fakeVideoStream();
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
            global.__vnMediaPipeCamera = cam;
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
        setMeditationCamera: function (on) {
            global.__vnMeditationWantsCamera = !!on;
        },
        ensureMeditationVision: ensureMeditationVision,
        hasLiveVideoTrack: hasLiveVideoTrack,
        onDivinationOpen: stopInputVideoTracks,
        onDivinationClose: function () {
            if (!isMeditationActive()) stopInputVideoTracks();
        }
    };
})(typeof window !== 'undefined' ? window : global);
