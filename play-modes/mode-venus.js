/**
 * 维纳斯 · 恋心轨迹（面部识别 / 冥想）+ 恋签页协调
 */
(function (global) {
    'use strict';

    var faceMesh = null;
    var isMeditating = false;
    var eyesClosedStartTime = 0;

    function el(id) { return document.getElementById(id); }

    function initFaceMesh() {
        if (typeof FaceMesh === 'undefined') {
            console.warn('[VenusMode] FaceMesh 未加载');
            return;
        }
        if (faceMesh) return;
        faceMesh = new FaceMesh({
            locateFile: typeof global.mediapipeLocateFile === 'function'
                ? global.mediapipeLocateFile('face_mesh')
                : function (file) { return 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file; }
        });
        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
        faceMesh.onResults(onFaceResults);
    }

    function onFaceResults(results) {
        var indicator = el('face-status-indicator');
        if (!isMeditating) {
            if (indicator) indicator.innerText = '';
            return;
        }
        if (!indicator) return;
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            var landmarks = results.multiFaceLandmarks[0];
            var leftDist = Math.abs(landmarks[159].y - landmarks[145].y);
            var rightDist = Math.abs(landmarks[386].y - landmarks[374].y);
            var isClosed = leftDist < 0.015 && rightDist < 0.015;
            if (isClosed) {
                indicator.innerText = '● 灵魂已闭目感应中...';
                if (global.MeditationRitual) global.MeditationRitual.notifyEyesClosed();
                tickMeditation();
            } else {
                indicator.innerText = '○ 请闭上双眼';
                if (global.MeditationRitual) global.MeditationRitual.notifyEyesOpen();
                resetMeditationTick();
            }
        } else {
            indicator.innerText = '○ 未感应到面容';
            if (global.MeditationRitual) global.MeditationRitual.notifyEyesOpen();
            resetMeditationTick();
        }
    }

    function registerCamera() {
        if (!global.CameraManager) return;
        global.CameraManager.register('venus', async function (video) {
            if (isMeditating && faceMesh) {
                await faceMesh.send({ image: video });
            }
        });
    }

    function unregisterCamera() {
        if (global.CameraManager) global.CameraManager.unregister('venus');
    }

    function resetMeditationTick() {
        eyesClosedStartTime = 0;
        var timerEl = el('meditation-timer');
        if (timerEl) {
            timerEl.innerText = '5';
            timerEl.classList.remove('show');
        }
    }

    function tickMeditation() {
        var timerEl = el('meditation-timer');
        if (!timerEl) return;
        timerEl.classList.add('show');
        if (!eyesClosedStartTime) eyesClosedStartTime = Date.now();
        var elapsed = Math.floor((Date.now() - eyesClosedStartTime) / 1000);
        var remaining = 5 - elapsed;
        if (remaining !== parseInt(timerEl.innerText, 10)) {
            timerEl.innerText = String(Math.max(0, remaining));
            timerEl.style.opacity = (remaining % 2 === 0) ? '0.4' : '1';
        }
        if (remaining <= 0 && typeof global.finishMeditation === 'function') {
            global.finishMeditation();
        }
    }

    function stopLoveAtmosphere() {
        if (global.loveInterval) {
            clearInterval(global.loveInterval);
            global.loveInterval = null;
        }
        document.querySelectorAll('.heart-float').forEach(function (n) { n.remove(); });
    }

    function resetQ2Ui() {
        var q2 = el('page-q2');
        if (q2) q2.className = 'page';
        var form = el('expression-form');
        if (form) { form.style.display = ''; form.style.opacity = '1'; }
        var err = el('expression-error');
        if (err) err.style.opacity = '0';
        var result = el('venus-result-text');
        if (result) { result.style.opacity = '0'; result.innerHTML = ''; }
        var line = el('red-line-element');
        if (line) line.classList.remove('active');
    }

    global.VenusMode = {
        init: function () {
            initFaceMesh();
        },
        destroy: function () {
            isMeditating = false;
            if (global.MeditationRitual) global.MeditationRitual.exitMeditation();
            resetMeditationTick();
            unregisterCamera();
            var indicator = el('face-status-indicator');
            if (indicator) indicator.innerText = '';
            var locked = el('meditation-locked');
            if (locked) locked.style.opacity = '0';
            if (typeof global.lovesignStop === 'function') global.lovesignStop();
            document.body.classList.remove('lovesign-active');
            stopLoveAtmosphere();
            resetQ2Ui();
        },
        reset: function () {
            isMeditating = false;
            if (global.MeditationRitual) global.MeditationRitual.exitMeditation();
            resetMeditationTick();
            unregisterCamera();
        },
        beginMeditation: function () {
            isMeditating = true;
            eyesClosedStartTime = 0;
            initFaceMesh();
            if (global.MeditationRitual) global.MeditationRitual.enterMeditation();
            registerCamera();
            if (global.CameraManager) global.CameraManager.requestPermission();
        },
        endMeditation: function () {
            isMeditating = false;
            if (global.MeditationRitual) global.MeditationRitual.exitMeditation();
            resetMeditationTick();
            unregisterCamera();
            var indicator = el('face-status-indicator');
            if (indicator) indicator.innerText = '';
        },
        enterLovesign: function () {
            unregisterCamera();
            isMeditating = false;
            document.body.classList.add('lovesign-active');
        },
        leaveLovesign: function () {
            if (typeof global.lovesignStop === 'function') global.lovesignStop();
            document.body.classList.remove('lovesign-active');
        }
    };

    if (global.modeController) {
        global.modeController.register('venus', {
            init: function () { global.VenusMode.init(); },
            destroy: function () { global.VenusMode.destroy(); },
            reset: function () { global.VenusMode.reset(); }
        });
    }
})(window);
