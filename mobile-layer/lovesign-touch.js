/**

 * Mobile lovesign: block window touch (instant drawSlip); circle wash + tap-to-select.

 */

(function (global) {

    'use strict';



    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;



    var history = [];

    var touchStart = null;

    var bound = false;

    var MOVE_THRESH = 14;

    var TAP_MS = 420;



    function page() {

        return document.getElementById('page-lovesign');

    }



    function isActive() {

        var p = page();

        return !!(p && p.classList.contains('active'));

    }



    function normFromTouch(touch) {
        var box = document.getElementById('canvas-container');
        if (box) {
            var rect = box.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                return {
                    x: ((touch.clientX - rect.left) / rect.width) * 2 - 1,
                    y: -((touch.clientY - rect.top) / rect.height) * 2 + 1
                };
            }
        }
        return {
            x: (touch.clientX / global.innerWidth) * 2 - 1,
            y: -(touch.clientY / global.innerHeight) * 2 + 1
        };
    }



    function detectCircle(point) {

        if (global.__lovesignIsRunning && !global.__lovesignIsRunning()) return false;



        var now = Date.now();

        history.push({ x: point.x, y: point.y, time: now });

        history = history.filter(function (p) { return now - p.time < 1200; });

        if (history.length < 20) return false;



        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

        var sumX = 0, sumY = 0;

        history.forEach(function (p) {

            if (p.x < minX) minX = p.x;

            if (p.x > maxX) maxX = p.x;

            if (p.y < minY) minY = p.y;

            if (p.y > maxY) maxY = p.y;

            sumX += p.x;

            sumY += p.y;

        });



        var w = maxX - minX;

        var h = maxY - minY;

        if (w < 0.22 || h < 0.22) return false;

        var aspect = w / h;

        if (aspect < 0.55 || aspect > 1.8) return false;



        var cx = sumX / history.length;

        var cy = sumY / history.length;

        var distances = [];

        var sumDist = 0;

        history.forEach(function (p) {

            var d = Math.hypot(p.x - cx, p.y - cy);

            distances.push(d);

            sumDist += d;

        });

        var avgDist = sumDist / distances.length;

        var varianceSum = 0;

        distances.forEach(function (d) {

            varianceSum += Math.pow(d - avgDist, 2);

        });

        var stdDev = Math.sqrt(varianceSum / distances.length);

        if (stdDev / avgDist > 0.35) return false;



        var lastAngle = null;

        var sweepAngle = 0;

        history.forEach(function (p) {

            var angle = Math.atan2(p.y - cy, p.x - cx);

            if (lastAngle !== null) {

                var diff = angle - lastAngle;

                while (diff < -Math.PI) diff += Math.PI * 2;

                while (diff > Math.PI) diff -= Math.PI * 2;

                sweepAngle += diff;

            }

            lastAngle = angle;

        });



        if (Math.abs(sweepAngle) > 5.6) {

            history = [];

            return true;

        }

        return false;

    }



    function triggerWash() {

        var btn = document.getElementById('manual-wash-btn');

        if (btn) btn.click();

    }



    function simulateTap(touch) {

        var opts = {

            bubbles: true,

            cancelable: true,

            view: global,

            clientX: touch.clientX,

            clientY: touch.clientY,

            screenX: touch.screenX,

            screenY: touch.screenY

        };

        global.dispatchEvent(new MouseEvent('mousemove', opts));

        global.dispatchEvent(new MouseEvent('mousedown', opts));

        global.dispatchEvent(new MouseEvent('mouseup', opts));

    }



    function stopToWindow(e) {

        if (!isActive()) return;

        e.stopPropagation();

    }



    function onTouchStart(e) {

        if (!isActive() || !e.touches.length) return;

        stopToWindow(e);

        var t = e.touches[0];

        touchStart = { x: t.clientX, y: t.clientY, t: Date.now(), moved: false };

        history = [];

    }



    function onTouchMove(e) {

        if (!isActive() || !e.touches.length) return;

        stopToWindow(e);

        e.preventDefault();



        var t = e.touches[0];

        if (touchStart) {

            var dx = t.clientX - touchStart.x;

            var dy = t.clientY - touchStart.y;

            if (Math.hypot(dx, dy) > MOVE_THRESH) touchStart.moved = true;

        }



        var pt = normFromTouch(t);

        if (detectCircle(pt)) triggerWash();

    }



    function onTouchEnd(e) {

        if (!isActive()) return;

        stopToWindow(e);



        if (!touchStart || !e.changedTouches.length) {

            touchStart = null;

            return;

        }



        var t = e.changedTouches[0];

        var elapsed = Date.now() - touchStart.t;

        var dx = t.clientX - touchStart.x;

        var dy = t.clientY - touchStart.y;



        if (!touchStart.moved && elapsed < TAP_MS && Math.hypot(dx, dy) < MOVE_THRESH) {

            simulateTap(t);

        }



        touchStart = null;

    }



    function bind() {

        if (bound) return;

        var p = page();

        if (!p) return;

        p.addEventListener('touchstart', onTouchStart, { passive: false, capture: false });

        p.addEventListener('touchmove', onTouchMove, { passive: false, capture: false });

        p.addEventListener('touchend', onTouchEnd, { passive: false, capture: false });

        p.addEventListener('touchcancel', onTouchEnd, { passive: false, capture: false });

        bound = true;

    }



    function start() {

        bind();

        global.setTimeout(bind, 800);

    }



    global.VNLovesignTouch = { start: start };

})(typeof window !== 'undefined' ? window : global);


