/**
 * Portrait-first touch divination — #vn-mobile-root only.
 * Layout metrics independent from desktop STEP_WIDTH / translateX.
 */
(function (global) {
    'use strict';

    var LONG_MS = 3000;
    var RITUAL_MS = 4000;

    var activeIdx = 3;
    var phase = 'browse';
    var fortunes = [];
    var ritualStart = 0;
    var ritualRaf = 0;
    var longTimer = null;
    var longReady = false;
    var ptr = { x: 0, y: 0, t: 0, cardEl: null };
    var paused = false;
    var bound = false;
    var resizeObs = null;
    var ui = {};

    function root() {
        return global.VNMobileRoot ? global.VNMobileRoot.get() : null;
    }

    /** Mobile portrait carousel — not desktop 230px step */
    function portraitMetrics() {
        var r = root();
        var w = r ? r.clientWidth : 360;
        var h = r ? r.clientHeight : 640;
        var cardW = Math.round(Math.min(148, Math.max(108, w * 0.36)));
        var cardH = Math.round(cardW * 1.58);
        var gap = Math.round(Math.min(42, Math.max(28, w * 0.14)));
        return { w: w, h: h, cardW: cardW, cardH: cardH, gap: gap };
    }

    function applyCardBox(card, m) {
        card.style.width = m.cardW + 'px';
        card.style.height = m.cardH + 'px';
        card.style.marginLeft = -Math.round(m.cardW / 2) + 'px';
        card.style.marginTop = -Math.round(m.cardH / 2) + 'px';
    }

    function readDesktopFortunes() {
        var list = [];
        var items = document.querySelectorAll('#divine-card-row .divine-card-item');
        items.forEach(function (item) {
            var t = item.querySelector('.face-back .f-res');
            var s = item.querySelector('.face-back .f-msg');
            var btn = item.querySelector('.face-back .mystic-btn');
            list.push({
                title: t ? t.textContent.trim() : '',
                msg: s ? s.textContent.trim() : '',
                btn: btn ? btn.textContent.trim() : '归还记忆'
            });
        });
        return list;
    }

    function buildMirrorDOM() {
        var r = root();
        if (!r) return;
        r.innerHTML = '';
        r.dataset.mode = 'divination-portrait';

        ui.shell = document.createElement('div');
        ui.shell.className = 'vn-m-shell';
        ui.exit = document.createElement('button');
        ui.exit.type = 'button';
        ui.exit.className = 'vn-m-exit';
        ui.exit.textContent = '✕ 结束仪式';
        ui.exit.addEventListener('click', function () {
            var exit = document.querySelector('#divination-stage .exit-divine-btn');
            if (exit && typeof exit.click === 'function') exit.click();
            teardown();
        });
        ui.hintMain = document.createElement('div');
        ui.hintMain.className = 'vn-m-hint-main';
        ui.hintSub = document.createElement('div');
        ui.hintSub.className = 'vn-m-hint-sub';
        ui.stage = document.createElement('div');
        ui.stage.className = 'vn-m-stage';
        ui.row = document.createElement('div');
        ui.row.className = 'vn-m-card-row';
        ui.focus = document.createElement('div');
        ui.focus.className = 'vn-m-focus-slot';
        ui.focus.hidden = true;
        ui.ritual = document.createElement('div');
        ui.ritual.className = 'vn-m-ritual';
        ui.ritual.hidden = true;
        ui.ritual.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" class="vn-m-ring"/></svg><span>祈愿中</span>';
        ui.ring = ui.ritual.querySelector('.vn-m-ring');

        ui.stage.appendChild(ui.row);
        ui.stage.appendChild(ui.focus);
        ui.stage.appendChild(ui.ritual);
        ui.shell.appendChild(ui.exit);
        ui.shell.appendChild(ui.hintMain);
        ui.shell.appendChild(ui.hintSub);
        ui.shell.appendChild(ui.stage);
        r.appendChild(ui.shell);

        fortunes = readDesktopFortunes();
        if (fortunes.length < 7) {
            for (var i = fortunes.length; i < 7; i++) {
                fortunes.push({ title: '中', msg: '静待命运…', btn: '归还记忆' });
            }
        }

        ui.cards = [];
        fortunes.forEach(function (f, i) {
            var card = document.createElement('div');
            card.className = 'vn-m-card';
            card.dataset.idx = String(i);
            card.innerHTML =
                '<div class="vn-m-card-inner">' +
                '<div class="vn-m-face vn-m-front"><span class="vn-m-sym">✦</span></div>' +
                '<div class="vn-m-face vn-m-back">' +
                '<div class="vn-m-title"></div><div class="vn-m-msg"></div>' +
                '<button type="button" class="vn-m-dismiss"></button></div></div>';
            card.querySelector('.vn-m-title').textContent = f.title;
            card.querySelector('.vn-m-msg').textContent = f.msg;
            card.querySelector('.vn-m-dismiss').textContent = f.btn;
            ui.row.appendChild(card);
            ui.cards.push(card);
        });

        ui.row.addEventListener('click', onDismissClick);

        if (resizeObs) resizeObs.disconnect();
        resizeObs = new ResizeObserver(function () {
            if (phase === 'browse') layoutBrowse();
        });
        resizeObs.observe(r);
    }

    function setHint(main, sub) {
        if (ui.hintMain) ui.hintMain.textContent = main;
        if (ui.hintSub) ui.hintSub.textContent = sub;
    }

    function layoutBrowse() {
        if (!ui.cards || !ui.cards.length) return;
        var m = portraitMetrics();
        ui.cards.forEach(function (c, i) {
            applyCardBox(c, m);
            var off = i - activeIdx;
            var dist = Math.abs(off);
            var scale = dist === 0 ? 1 : dist === 1 ? 0.76 : 0.6;
            var op = dist === 0 ? 1 : dist === 1 ? 0.5 : 0.22;
            var blur = dist > 1 ? 'blur(0.6px)' : 'none';
            c.style.transform = 'translateX(' + (off * m.gap) + 'px) scale(' + scale + ')';
            c.style.opacity = String(op);
            c.style.zIndex = String(10 - dist);
            c.style.filter = blur;
            c.classList.toggle('vn-m-card--active', i === activeIdx);
        });
        if (ui.focus) ui.focus.hidden = true;
        if (ui.row) ui.row.hidden = false;
        if (ui.ritual) ui.ritual.hidden = true;
    }

    function layoutFocus() {
        var m = portraitMetrics();
        ui.row.hidden = true;
        ui.focus.hidden = false;
        var f = fortunes[activeIdx] || fortunes[0];
        var fw = Math.round(m.cardW * 1.08);
        var fh = Math.round(fw * 1.58);
        ui.focus.innerHTML =
            '<div class="vn-m-card vn-m-card--focus">' +
            '<div class="vn-m-card-inner" id="vn-m-focus-inner">' +
            '<div class="vn-m-face vn-m-front"><span class="vn-m-sym">✦</span></div>' +
            '<div class="vn-m-face vn-m-back">' +
            '<div class="vn-m-title"></div><div class="vn-m-msg"></div>' +
            '<button type="button" class="vn-m-dismiss"></button></div></div></div>';
        var el = ui.focus.firstElementChild;
        el.style.width = fw + 'px';
        el.style.height = fh + 'px';
        el.querySelector('.vn-m-title').textContent = f.title;
        el.querySelector('.vn-m-msg').textContent = f.msg;
        el.querySelector('.vn-m-dismiss').textContent = f.btn;
        el.querySelector('.vn-m-dismiss').addEventListener('click', onDismissClick);
    }

    function resetRitual() {
        ritualStart = 0;
        if (ritualRaf) cancelAnimationFrame(ritualRaf);
        ritualRaf = 0;
        if (ui.ritual) ui.ritual.hidden = true;
        if (ui.ring) ui.ring.style.strokeDashoffset = '283';
    }

    function ritualLoop() {
        if (paused || !ui.ritual || phase !== 'ritual') return;
        ui.ritual.hidden = false;
        if (!ritualStart) ritualStart = Date.now();
        var p = Math.min((Date.now() - ritualStart) / RITUAL_MS, 1);
        if (ui.ring) ui.ring.style.strokeDashoffset = String(283 - p * 283);
        if (p >= 1) {
            phase = 'flipped';
            var inner = document.getElementById('vn-m-focus-inner');
            if (inner) inner.classList.add('vn-m-flipped');
            resetRitual();
            setHint('✧ 祈愿已传达 ✧', '点击按钮归还记忆');
            if (global.VNMobileRoot) global.VNMobileRoot.emit({ type: 'toast', message: '命运已揭晓' });
            return;
        }
        ritualRaf = requestAnimationFrame(ritualLoop);
    }

    function clearLong() {
        if (longTimer) clearTimeout(longTimer);
        longTimer = null;
        longReady = false;
    }

    function swipeThreshold() {
        var m = portraitMetrics();
        return Math.max(32, Math.round(m.w * 0.09));
    }

    function onPointerDown(e) {
        if (phase === 'flipped') return;
        ptr.x = e.clientX;
        ptr.y = e.clientY;
        ptr.t = Date.now();
        ptr.cardEl = e.target && e.target.closest ? e.target.closest('.vn-m-card[data-idx]') : null;
        clearLong();
        if (phase === 'browse') {
            longTimer = setTimeout(function () {
                if (phase === 'browse') {
                    longReady = true;
                    setHint('✧ 可以松手了 ✧', '松开以祈愿翻面');
                }
            }, LONG_MS);
        }
    }

    function onPointerUp(e) {
        var dx = e.clientX - ptr.x;
        var dy = e.clientY - ptr.y;
        var elapsed = Date.now() - ptr.t;
        var th = swipeThreshold();

        if (longReady && phase === 'browse') {
            clearLong();
            layoutFocus();
            setHint('松开启动祈愿', '镜面翻转中…');
            phase = 'ritual';
            resetRitual();
            if (global.VNMobileRoot) global.VNMobileRoot.emit({ type: 'divination-lock', index: activeIdx });
            ritualRaf = requestAnimationFrame(ritualLoop);
            return;
        }
        clearLong();

        if (phase !== 'browse') return;

        if (elapsed < 450 && Math.abs(dx) < th * 0.65 && Math.abs(dy) < th * 0.65) {
            var card = ptr.cardEl;
            if (card && card.dataset.idx) {
                activeIdx = parseInt(card.dataset.idx, 10);
            }
            setHint('已选中第 ' + (activeIdx + 1) + ' 张', '长按 3 秒后松手翻面');
            layoutBrowse();
            return;
        }

        if (Math.abs(dx) >= th && Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0 && activeIdx < 6) activeIdx += 1;
            if (dx > 0 && activeIdx > 0) activeIdx -= 1;
            layoutBrowse();
            setHint('← 左右滑动巡视星轨 →', '点击选中 · 长按 3 秒松手翻面');
            if (global.VNMobileRoot) global.VNMobileRoot.emit({ type: 'divination-index', index: activeIdx });
        }
    }

    function onDismissClick(e) {
        if (!e.target.closest('.vn-m-dismiss')) return;
        var exit = document.querySelector('#divination-stage .exit-divine-btn');
        if (exit && typeof exit.click === 'function') exit.click();
        teardown();
    }

    function bindRoot() {
        if (bound) return;
        var r = root();
        if (!r) return;
        r.addEventListener('pointerdown', onPointerDown, { passive: true });
        r.addEventListener('pointerup', onPointerUp, { passive: true });
        r.addEventListener('pointercancel', clearLong, { passive: true });
        bound = true;
    }

    function unbindRoot() {
        if (!bound) return;
        var r = root();
        if (r) {
            r.removeEventListener('pointerdown', onPointerDown);
            r.removeEventListener('pointerup', onPointerUp);
            r.removeEventListener('pointercancel', clearLong);
        }
        bound = false;
        clearLong();
    }

    function teardown() {
        unbindRoot();
        resetRitual();
        if (resizeObs) {
            resizeObs.disconnect();
            resizeObs = null;
        }
        phase = 'browse';
        activeIdx = 3;
        var r = root();
        if (r) {
            r.innerHTML = '';
            r.hidden = true;
        }
        if (global.VNMobileRoot) global.VNMobileRoot.hide();
    }

    function onStageChange(visible) {
        if (!visible) {
            teardown();
            return;
        }
        if (global.VNCameraGuard) global.VNCameraGuard.onDivinationOpen();
        buildMirrorDOM();
        bindRoot();
        requestAnimationFrame(function () {
            layoutBrowse();
            setHint('← 左右滑动巡视星轨 →', '点击选中 · 长按 3 秒松手翻面');
        });
    }

    global.VNDivinationMirror = {
        onStageChange: onStageChange,
        pause: function () { paused = true; },
        resume: function () {
            paused = false;
            if (phase === 'ritual') ritualRaf = requestAnimationFrame(ritualLoop);
        }
    };
})(typeof window !== 'undefined' ? window : global);
