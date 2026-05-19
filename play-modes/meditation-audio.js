/**
 * 闭眼冥想 · 五秒仪式音效（心跳 1~4 秒 + 第 5 秒收尾风铃）
 * 由摄像头闭眼状态驱动，非按钮测试模式。
 */
(function (global) {
    'use strict';

    var HEARTBEAT_CLIP_SEC = 0.85;
    var VOL_HEARTBEAT = 0.52;
    var VOL_HEARTBEAT_SOFT = 0.42;
    var VOL_CHIME = 0.38;
    var FINALE_CLIP_SEC = 0.95;
    var FINALE_FADE_OUT_SEC = 0.42;
    var CHIME_GAP_SEC = 0.18;
    var CHIME_FADE_IN_SEC = 0.9;
    var RITUAL_TOTAL_MS = 5200;

    var PATHS = { heartbeat: '', chime: '' };
    var timerIds = [];
    var activeAudios = [];
    var activeSources = [];
    var activeRamps = [];
    var bufferCache = {};
    var audioCtx = null;
    var buffersLoading = null;
    var soundsReady = false;
    var sequenceToken = 0;

    var ritualState = 'idle';
    var config = { onSuccess: null, onReset: null };

    function resolveSoundUrl(basePath) {
        var exts = ['mp3', 'wav'];
        return new Promise(function (resolve, reject) {
            var i = 0;
            function tryNext() {
                if (i >= exts.length) {
                    reject(new Error('未找到 ' + basePath + ' (.mp3/.wav)'));
                    return;
                }
                var url = new URL(basePath + '.' + exts[i++], window.location.href).href;
                var audio = new Audio();
                audio.addEventListener('error', tryNext, { once: true });
                audio.addEventListener('canplaythrough', function () { resolve(url); }, { once: true });
                audio.src = url;
                audio.load();
            }
            tryNext();
        });
    }

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (global.AudioContext || global.webkitAudioContext)();
        }
        return audioCtx;
    }

    function resumeContext() {
        var ctx = getAudioContext();
        if (ctx.state === 'suspended') return ctx.resume();
        return Promise.resolve();
    }

    function resetAll() {
        sequenceToken += 1;
        timerIds.forEach(function (id) {
            clearTimeout(id);
            clearInterval(id);
        });
        timerIds = [];
        activeAudios.forEach(function (audio) {
            try { audio.pause(); audio.currentTime = 0; } catch (e) { /* ignore */ }
        });
        activeAudios = [];
        activeSources.forEach(function (item) {
            try { if (item.source) item.source.stop(); } catch (e) { /* ignore */ }
            try {
                if (item.source) item.source.disconnect();
                if (item.gain) item.gain.disconnect();
            } catch (e2) { /* ignore */ }
        });
        activeSources = [];
        activeRamps.forEach(function (cancel) { try { cancel(); } catch (e) { /* ignore */ } });
        activeRamps = [];
    }

    function trackAudio(audio) {
        activeAudios.push(audio);
        audio.addEventListener('ended', function () {
            var i = activeAudios.indexOf(audio);
            if (i !== -1) activeAudios.splice(i, 1);
        });
        return audio;
    }

    function schedule(fn, delayMs) {
        var id = setTimeout(fn, delayMs);
        timerIds.push(id);
        return id;
    }

    function easeIn(t) { return t * t; }
    function easeOut(t) { return t * (2 - t); }

    function rampVolume(audio, from, to, durationMs, easeFn, onDone) {
        var start = performance.now();
        var cancelled = false;
        function cancel() { cancelled = true; }
        activeRamps.push(cancel);
        function tick(now) {
            if (cancelled) return;
            var t = Math.min(1, (now - start) / durationMs);
            var e = easeFn ? easeFn(t) : t;
            audio.volume = Math.min(1, Math.max(0.001, from + (to - from) * e));
            if (t < 1) requestAnimationFrame(tick);
            else {
                var i = activeRamps.indexOf(cancel);
                if (i !== -1) activeRamps.splice(i, 1);
                if (onDone) onDone();
            }
        }
        requestAnimationFrame(tick);
    }

    function trackSource(source, gain) {
        activeSources.push({ source: source, gain: gain });
        source.onended = function () {
            var i = activeSources.findIndex(function (x) { return x.source === source; });
            if (i !== -1) activeSources.splice(i, 1);
        };
    }

    function loadArrayBuffer(url) {
        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
                else reject(new Error('HTTP ' + xhr.status));
            };
            xhr.onerror = function () { reject(new Error('网络错误')); };
            xhr.send();
        });
    }

    function preloadBuffers(urls) {
        return Promise.all(urls.map(function (url) {
            if (bufferCache[url]) return bufferCache[url];
            function decode(ab) {
                var ctx = getAudioContext();
                return ctx.decodeAudioData(ab).then(function (buf) {
                    bufferCache[url] = buf;
                    return buf;
                });
            }
            if (typeof fetch === 'function') {
                return fetch(url).then(function (res) {
                    if (!res.ok) throw new Error('无法加载 ' + url);
                    return res.arrayBuffer();
                }).then(decode).catch(function () {
                    return loadArrayBuffer(url).then(decode);
                });
            }
            return loadArrayBuffer(url).then(decode);
        }));
    }

    function tryPreloadBuffers() {
        if (buffersLoading || !PATHS.heartbeat) return buffersLoading;
        buffersLoading = preloadBuffers([PATHS.heartbeat, PATHS.chime]).catch(function () { /* html fallback ok */ })
            .then(function () { buffersLoading = null; });
        return buffersLoading;
    }

    function playClip(src, volume, clipSec) {
        if (!src) return null;
        var audio = trackAudio(new Audio(src));
        audio.volume = Math.min(1, Math.max(0, volume));
        audio.currentTime = 0;
        var stopId = setTimeout(function () {
            try { audio.pause(); audio.currentTime = 0; } catch (e) { /* ignore */ }
        }, (clipSec || HEARTBEAT_CLIP_SEC) * 1000);
        timerIds.push(stopId);
        var p = audio.play();
        if (p && p.catch) p.catch(function () { /* ignore */ });
        return audio;
    }

    function playHeartbeat(volume) {
        playClip(PATHS.heartbeat, volume != null ? volume : VOL_HEARTBEAT, HEARTBEAT_CLIP_SEC);
    }

    function playHeartbeatFinaleHtml(volume) {
        var peak = Math.min(1, Math.max(0, volume));
        var audio = trackAudio(new Audio(PATHS.heartbeat));
        audio.volume = 0.001;
        audio.currentTime = 0;
        var p = audio.play();
        if (p && p.catch) p.catch(function () { /* ignore */ });
        rampVolume(audio, 0.001, peak, 70, easeIn);
        schedule(function () {
            rampVolume(audio, peak, 0.001, FINALE_FADE_OUT_SEC * 1000, easeOut, function () {
                try { audio.pause(); audio.currentTime = 0; } catch (e) { /* ignore */ }
            });
        }, Math.max(0, (FINALE_CLIP_SEC - FINALE_FADE_OUT_SEC) * 1000));
        schedule(function () {
            try { audio.pause(); } catch (e2) { /* ignore */ }
        }, FINALE_CLIP_SEC * 1000);
    }

    function playChimeGentleHtml(volume, delayMs) {
        schedule(function () {
            var peak = Math.min(1, Math.max(0, volume != null ? volume : VOL_CHIME));
            var audio = trackAudio(new Audio(PATHS.chime));
            audio.volume = 0.001;
            audio.currentTime = 0;
            var p = audio.play();
            if (p && p.catch) p.catch(function () { /* ignore */ });
            rampVolume(audio, 0.001, peak, CHIME_FADE_IN_SEC * 1000, easeIn);
        }, delayMs || 0);
    }

    function playHeartbeatFinale(volume) {
        var buf = bufferCache[PATHS.heartbeat];
        if (!buf) {
            playHeartbeatFinaleHtml(volume);
            return;
        }
        var ctx = getAudioContext();
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var gain = ctx.createGain();
        src.connect(gain);
        gain.connect(ctx.destination);
        trackSource(src, gain);
        var now = ctx.currentTime;
        var peak = Math.min(1, Math.max(0, volume));
        var clip = FINALE_CLIP_SEC;
        var fadeOut = FINALE_FADE_OUT_SEC;
        var fadeStart = Math.max(0.12, clip - fadeOut);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), now + 0.06);
        gain.gain.setValueAtTime(peak, now + fadeStart);
        gain.gain.exponentialRampToValueAtTime(0.001, now + clip);
        src.start(0, 0, clip);
    }

    function playChimeGentle(volume, delaySec) {
        var buf = bufferCache[PATHS.chime];
        if (!buf) {
            playChimeGentleHtml(volume, (delaySec || 0) * 1000);
            return;
        }
        var ctx = getAudioContext();
        var src = ctx.createBufferSource();
        src.buffer = buf;
        var gain = ctx.createGain();
        src.connect(gain);
        gain.connect(ctx.destination);
        trackSource(src, gain);
        var now = ctx.currentTime;
        var startAt = now + (delaySec || 0);
        var peak = Math.min(1, Math.max(0, volume != null ? volume : VOL_CHIME));
        gain.gain.setValueAtTime(0.001, startAt);
        gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.001), startAt + CHIME_FADE_IN_SEC);
        src.start(startAt);
    }

    /** 五秒仪式：0~3 秒轻柔心跳，第 5 拍（4s）收尾 + 风铃 */
    function startSequence() {
        if (!soundsReady) return;
        resetAll();
        var token = sequenceToken;
        resumeContext();
        tryPreloadBuffers();

        var fifthBeatAt = 4000;
        var chimeDelaySec = FINALE_CLIP_SEC + CHIME_GAP_SEC;

        [0, 1000, 2000, 3000].forEach(function (t) {
            schedule(function () {
                if (token !== sequenceToken || ritualState !== 'running') return;
                playHeartbeat(VOL_HEARTBEAT_SOFT);
            }, t);
        });

        schedule(function () {
            if (token !== sequenceToken || ritualState !== 'running') return;
            playHeartbeatFinale(VOL_HEARTBEAT_SOFT * 0.88);
            playChimeGentle(VOL_CHIME * 0.92, chimeDelaySec);
        }, fifthBeatAt);
    }

    var MeditationAudio = {
        playHeartbeat: playHeartbeat,
        playWindChime: function (vol) { playChimeGentle(vol != null ? vol : VOL_CHIME, CHIME_GAP_SEC); },
        resetAll: resetAll,
        isReady: function () { return soundsReady; }
    };

    var MeditationRitual = {
        init: function (opts) {
            opts = opts || {};
            config.onSuccess = opts.onSuccess || null;
            config.onReset = opts.onReset || null;
            var base = opts.soundBase || {
                heartbeat: 'assets/sounds/heartbeat',
                chime: 'assets/sounds/wind_chime'
            };
            return Promise.all([
                resolveSoundUrl(base.heartbeat),
                resolveSoundUrl(base.chime)
            ]).then(function (urls) {
                PATHS.heartbeat = urls[0];
                PATHS.chime = urls[1];
                soundsReady = true;
                if (global.location && global.location.protocol !== 'file:') tryPreloadBuffers();
                return true;
            }).catch(function (err) {
                console.warn('[MeditationRitual] 音频加载失败:', err);
                soundsReady = false;
                return false;
            });
        },

        enterMeditation: function () {
            resetAll();
            ritualState = 'monitoring';
            resumeContext();
            if (soundsReady) tryPreloadBuffers();
        },

        exitMeditation: function () {
            resetAll();
            ritualState = 'idle';
        },

        notifyEyesClosed: function () {
            if (ritualState !== 'monitoring' || !soundsReady) return;
            ritualState = 'running';
            startSequence();
        },

        notifyEyesOpen: function () {
            if (ritualState === 'idle') return;
            var wasRunning = ritualState === 'running';
            resetAll();
            if (ritualState === 'success') {
                ritualState = 'monitoring';
                return;
            }
            ritualState = 'monitoring';
            if (wasRunning && typeof config.onReset === 'function') config.onReset();
        },

        onVisualSuccess: function () {
            if (ritualState === 'running') {
                ritualState = 'success';
            }
        },

        getState: function () { return ritualState; },

        resetSequenceOnly: function () {
            resetAll();
            if (ritualState === 'running') ritualState = 'monitoring';
        }
    };

    global.MeditationAudio = MeditationAudio;
    global.MeditationRitual = MeditationRitual;

    global.addEventListener('beforeunload', function () {
        resetAll();
        ritualState = 'idle';
    });
})(window);
