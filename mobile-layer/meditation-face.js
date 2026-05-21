/**
 * Mobile-only闭眼检测：独立计时/完成逻辑，放宽 EAR，不依赖桌面 isMeditating。
 */
(function (global) {
    'use strict';

    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;

    var EAR_CLOSED = 0.028;
    var EAR_OPEN = 0.038;
    var HOLD_SECONDS = 5;

    var state = {
        eyesStart: 0,
        finished: false,
        lastClosed: false
    };

    var medCanvas = null;
    var medCtx = null;

    function isMeditationPage() {
        var p = document.getElementById('page-meditation');
        return !!(p && p.classList.contains('active'));
    }

    function resetState() {
        state.eyesStart = 0;
        state.finished = false;
        state.lastClosed = false;
    }

    function indicatorEl() {
        return document.getElementById('face-status-indicator');
    }

    function timerEl() {
        return document.getElementById('meditation-timer');
    }

    function eyeGap(landmarks, upper, lower) {
        if (!landmarks[upper] || !landmarks[lower]) return 1;
        return Math.abs(landmarks[upper].y - landmarks[lower].y);
    }

    function eyesClosed(landmarks) {
        var left = eyeGap(landmarks, 159, 145);
        var right = eyeGap(landmarks, 386, 374);
        var avg = (left + right) / 2;
        if (avg < EAR_CLOSED) return true;
        if (left < EAR_CLOSED && right < EAR_CLOSED) return true;
        if (avg < EAR_OPEN && left < EAR_OPEN && right < EAR_OPEN && state.lastClosed) return true;
        return false;
    }

    function resetTick() {
        state.eyesStart = 0;
        var t = timerEl();
        if (t) {
            t.innerText = '5';
            t.classList.remove('show');
        }
    }

    function tickClosed() {
        if (state.finished) return;
        var t = timerEl();
        if (!t) return;
        t.classList.add('show');
        if (!state.eyesStart) state.eyesStart = Date.now();

        var elapsed = Math.floor((Date.now() - state.eyesStart) / 1000);
        var remaining = HOLD_SECONDS - elapsed;
        if (remaining !== parseInt(t.innerText, 10)) {
            t.innerText = String(Math.max(0, remaining));
            t.style.opacity = (remaining % 2 === 0) ? '0.4' : '1';
        }
        if (remaining <= 0) finishMeditation();
    }

    function finishMeditation() {
        if (state.finished) return;
        state.finished = true;

        if (global.VNCameraGuard) global.VNCameraGuard.stopMeditationFaceLoop();

        var ind = indicatorEl();
        if (ind) ind.innerText = '';

        var locked = document.getElementById('meditation-locked');
        if (locked) locked.style.opacity = '1';

        if (global.MeditationRitual && typeof global.MeditationRitual.onVisualSuccess === 'function') {
            global.MeditationRitual.onVisualSuccess();
        }

        global.setTimeout(function () {
            document.querySelectorAll('.page').forEach(function (p) {
                p.classList.remove('active');
            });
            var q1 = document.getElementById('page-q1');
            if (q1) q1.classList.add('active');
            if (global.VNSceneCleanup && global.VNSceneCleanup.resetViewport) {
                global.VNSceneCleanup.resetViewport();
            }
            if (typeof global.showToast === 'function') {
                global.showToast('✦ 冥想完成 ✦');
            }
            if (global.VNAnalytics) global.VNAnalytics.log('meditation_complete', { method: 'mobile_face' });
        }, 2500);
    }

    function handleResults(results) {
        if (!isMeditationPage() || state.finished) return;

        var ind = indicatorEl();
        if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            state.lastClosed = false;
            resetTick();
            if (ind) ind.innerText = '○ 未感应到面容';
            if (global.MeditationRitual && global.MeditationRitual.notifyEyesOpen) {
                global.MeditationRitual.notifyEyesOpen();
            }
            return;
        }

        var lm = results.multiFaceLandmarks[0];
        var closed = eyesClosed(lm);
        state.lastClosed = closed;

        if (closed) {
            if (ind) ind.innerText = '● 灵魂已闭目感应中...';
            if (global.MeditationRitual && global.MeditationRitual.notifyEyesClosed) {
                global.MeditationRitual.notifyEyesClosed();
            }
            tickClosed();
        } else {
            if (ind) ind.innerText = '○ 请闭上双眼';
            if (global.MeditationRitual && global.MeditationRitual.notifyEyesOpen) {
                global.MeditationRitual.notifyEyesOpen();
            }
            resetTick();
        }
    }

    function getMedCanvas(video) {
        if (!medCanvas) {
            medCanvas = document.createElement('canvas');
            medCtx = medCanvas.getContext('2d', { willReadFrequently: true });
        }
        var w = video.videoWidth || 640;
        var h = video.videoHeight || 480;
        if (w < 2 || h < 2) return null;
        medCanvas.width = w;
        medCanvas.height = h;
        medCtx.drawImage(video, 0, 0, w, h);
        return medCanvas;
    }

    function installFaceMesh() {
        if (typeof global.FaceMesh === 'undefined') return false;

        if (!global.__vnFaceMeshWrapped) {
            var Real = global.FaceMesh;

            if (Real.prototype && typeof Real.prototype.send === 'function' && !Real.prototype.__vnSendHooked) {
                var protoSend = Real.prototype.send;
                Real.prototype.send = function () {
                    global.__vnFaceMeshInstance = this;
                    return protoSend.apply(this, arguments);
                };
                Real.prototype.__vnSendHooked = true;
            }

            global.FaceMesh = function (config) {
                var inst = new Real(config);
                global.__vnFaceMeshInstance = inst;
                patchInstanceOnResults(inst);
                return inst;
            };
            global.FaceMesh.prototype = Real.prototype;
            global.__vnFaceMeshWrapped = true;
        }

        if (global.__vnFaceMeshInstance) {
            patchInstanceOnResults(global.__vnFaceMeshInstance);
        }

        return true;
    }

    function patchInstanceOnResults(inst) {
        if (!inst || inst.__vnResultsChained) return;
        var origOnResults = inst.onResults.bind(inst);
        inst.onResults = function (fn) {
            origOnResults(function (results) {
                if (typeof fn === 'function') fn(results);
                handleResults(results);
            });
        };
        inst.__vnResultsChained = true;
    }

    /** Desktop initFaceMesh may run before this file loads — force mobile callback. */
    function rebindExistingInstance(inst) {
        if (!inst || inst.__vnRebound) return;
        var origOnResults = inst.onResults.bind(inst);
        origOnResults(function (results) {
            handleResults(results);
        });
        inst.onResults = function (fn) {
            origOnResults(function (results) {
                if (typeof fn === 'function') fn(results);
                handleResults(results);
            });
        };
        inst.__vnRebound = true;
        inst.__vnResultsChained = true;
    }

    function boot() {
        installFaceMesh();
        rebindExistingInstance(global.__vnFaceMeshInstance);
    }

    function sendFrame(video, faceMesh) {
        if (!faceMesh || typeof faceMesh.send !== 'function') return Promise.resolve();
        var canvas = getMedCanvas(video);
        if (canvas) {
            return faceMesh.send({ image: canvas }).catch(function () {
                return faceMesh.send({ image: video });
            });
        }
        return faceMesh.send({ image: video }).catch(function () { /* drop */ });
    }

    global.VNMobileMeditationFace = {
        handleResults: handleResults,
        installFaceMesh: installFaceMesh,
        rebindExistingInstance: rebindExistingInstance,
        sendFrame: sendFrame,
        resetState: resetState,
        isMeditationPage: isMeditationPage
    };

    boot();
    global.setInterval(function () {
        installFaceMesh();
        rebindExistingInstance(global.__vnFaceMeshInstance);
    }, 250);
})(typeof window !== 'undefined' ? window : global);
