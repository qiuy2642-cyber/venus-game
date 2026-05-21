/**
 * Mobile: block Hands; camera + FaceMesh loop (meditation-face.js handles闭眼).
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    global.__vnMeditationWantsCamera = false;

    var origGetUserMedia = null;
    var faceLoopRaf = 0;
    var attachPromise = null;

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
        return tracks.some(function (t) { return t.readyState === 'live' && t.enabled; });
    }

    function videoReady(video) {
        return video && (video.readyState >= 2 || (video.videoWidth > 0 && video.videoHeight > 0));
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

    function buildVideoConstraints() {
        return {
            audio: false,
            video: {
                facingMode: { ideal: 'user' },
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 }
            }
        };
    }

    function attachMeditationStream() {
        if (!navigator.mediaDevices || !origGetUserMedia) {
            return Promise.reject(new Error('getUserMedia unavailable'));
        }
        var video = videoEl();
        if (!video) return Promise.reject(new Error('input-video missing'));

        if (attachPromise) return attachPromise;

        attachPromise = origGetUserMedia.call(navigator.mediaDevices, buildVideoConstraints())
            .then(function (stream) {
                if (video.srcObject && video.srcObject !== stream) {
                    try {
                        video.srcObject.getTracks().forEach(function (t) { t.stop(); });
                    } catch (e) { /* ignore */ }
                }
                video.srcObject = stream;
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                video.setAttribute('autoplay', 'true');
                video.muted = true;
                video.playsInline = true;
                return video.play();
            })
            .then(function () {
                return waitForVideoReady(video, 8000);
            })
            .finally(function () {
                attachPromise = null;
            });

        return attachPromise;
    }

    function waitForVideoReady(video, timeoutMs) {
        return new Promise(function (resolve, reject) {
            if (videoReady(video)) {
                resolve(video);
                return;
            }
            var done = false;
            function finish(ok) {
                if (done) return;
                done = true;
                video.removeEventListener('loadeddata', onReady);
                video.removeEventListener('loadedmetadata', onReady);
                video.removeEventListener('canplay', onReady);
                if (ok) resolve(video);
                else reject(new Error('video not ready'));
            }
            function onReady() {
                if (videoReady(video)) finish(true);
            }
            video.addEventListener('loadeddata', onReady);
            video.addEventListener('loadedmetadata', onReady);
            video.addEventListener('canplay', onReady);
            global.setTimeout(function () {
                if (videoReady(video)) finish(true);
                else finish(false);
            }, timeoutMs || 6000);
        });
    }

    function stopMeditationFaceLoop() {
        if (faceLoopRaf) {
            cancelAnimationFrame(faceLoopRaf);
            faceLoopRaf = 0;
        }
    }

    function meditationFaceLoop() {
        faceLoopRaf = 0;
        if (!isMeditationActive() || !shouldAllowCamera()) return;

        var video = videoEl();
        var faceMesh = global.__vnFaceMeshInstance;

        if (!faceMesh) {
            faceLoopRaf = requestAnimationFrame(meditationFaceLoop);
            return;
        }

        if (video && videoReady(video)) {
            if (global.VNMobileMeditationFace && global.VNMobileMeditationFace.sendFrame) {
                global.VNMobileMeditationFace.sendFrame(video, faceMesh);
            } else if (typeof faceMesh.send === 'function') {
                faceMesh.send({ image: video }).catch(function () { /* drop */ });
            }
        }

        faceLoopRaf = requestAnimationFrame(meditationFaceLoop);
    }

    function startMeditationFaceLoop() {
        stopMeditationFaceLoop();
        if (!isMeditationActive()) return;
        meditationFaceLoop();
    }

    function ensureMeditationVision() {
        if (!shouldAllowCamera()) return Promise.resolve();

        if (global.VNMobileMeditationFace) {
            global.VNMobileMeditationFace.installFaceMesh();
            global.VNMobileMeditationFace.rebindExistingInstance(global.__vnFaceMeshInstance);
            global.VNMobileMeditationFace.resetState();
        }

        return attachMeditationStream()
            .then(function () {
                startMeditationFaceLoop();
            })
            .catch(function (err) {
                console.warn('[VNCameraGuard] meditation vision failed', err);
                if (typeof global.showToast === 'function') {
                    global.showToast('请允许摄像头权限以完成闭眼冥想');
                }
            });
    }

    function primeMeditationStream() {
        if (!shouldAllowCamera()) return Promise.resolve();
        if (global.VNMobileMeditationFace) {
            global.VNMobileMeditationFace.installFaceMesh();
            global.VNMobileMeditationFace.resetState();
        }
        return attachMeditationStream().catch(function () { /* retry later */ });
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

    function installFaceMeshDelegate() {
        if (global.VNMobileMeditationFace && global.VNMobileMeditationFace.installFaceMesh) {
            return global.VNMobileMeditationFace.installFaceMesh();
        }
        return typeof global.FaceMesh !== 'undefined';
    }

    function pollMediapipe() {
        installFaceMeshDelegate();
        installHands();
        installCamera();
        if (!global.__vnFaceMeshWrapped || !global.__vnMobileHandsWrapped || !global.__vnMobileCameraWrapped) {
            global.setTimeout(pollMediapipe, 40);
        }
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
            if (!on) stopMeditationFaceLoop();
        },
        primeMeditationStream: primeMeditationStream,
        ensureMeditationVision: ensureMeditationVision,
        startMeditationFaceLoop: startMeditationFaceLoop,
        stopMeditationFaceLoop: stopMeditationFaceLoop,
        hasLiveVideoTrack: hasLiveVideoTrack,
        onDivinationOpen: stopInputVideoTracks,
        onDivinationClose: function () {
            if (!isMeditationActive()) stopInputVideoTracks();
        }
    };
})(typeof window !== 'undefined' ? window : global);
