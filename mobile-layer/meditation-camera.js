/**

 * Mobile meditation: real camera + FaceMesh; hands remain blocked in camera-guard.

 */

(function (global) {

    'use strict';



    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;



    function isMeditationPage() {

        var p = document.getElementById('page-meditation');

        return !!(p && p.classList.contains('active'));

    }



    function armMeditationCameraWindow() {

        global.__vnMeditationFlowActive = true;

        global.__vnMeditationWantsCamera = true;

        if (global.VNCameraGuard) {
            global.VNCameraGuard.setMeditationCamera(true);
            global.VNCameraGuard.stopTracks();
        }

    }



    function bindMeditationTriggers() {

        document.querySelectorAll('[onclick*="startMeditationFlow"]').forEach(function (el) {

            if (el.__vnMedArm) return;

            el.__vnMedArm = true;

            el.addEventListener('pointerdown', armMeditationCameraWindow, { passive: true, capture: true });

            el.addEventListener('touchstart', armMeditationCameraWindow, { passive: true, capture: true });

        });

    }



    function watchMeditationPage() {

        var page = document.getElementById('page-meditation');

        if (!page) return;

        var obs = new MutationObserver(function () {

            if (page.classList.contains('active')) {

                global.__vnMeditationWantsCamera = true;

                if (global.VNCameraGuard) global.VNCameraGuard.setMeditationCamera(true);

            } else {

                global.__vnMeditationFlowActive = false;

                global.__vnMeditationWantsCamera = false;

                if (global.VNCameraGuard) global.VNCameraGuard.setMeditationCamera(false);

            }

        });

        obs.observe(page, { attributes: true, attributeFilter: ['class'] });

    }



    function start() {

        bindMeditationTriggers();

        global.setTimeout(bindMeditationTriggers, 1000);

        watchMeditationPage();

    }



    global.VNMeditationCamera = { start: start };

})(typeof window !== 'undefined' ? window : global);


