/**

 * Mobile meditation: mount camera out of hidden stage, restart FaceMesh pipeline.

 */

(function (global) {

    'use strict';



    if (!global.VNMobileDetect || !global.VNMobileDetect.isMobileLayer()) return;



    var previewHome = null;



    function meditationPage() {

        return document.getElementById('page-meditation');

    }



    function isMeditationPage() {

        var p = meditationPage();

        return !!(p && p.classList.contains('active'));

    }



    function armMeditationCameraWindow() {

        global.__vnMeditationFlowActive = true;

        global.__vnMeditationWantsCamera = true;

        if (global.VNCameraGuard) {

            global.VNCameraGuard.setMeditationCamera(true);

        }

    }



    function mountPreviewForMeditation() {

        var preview = document.getElementById('cam-preview');

        var video = document.getElementById('input-video');

        if (!preview || !video) return;



        if (!previewHome) {

            previewHome = { parent: preview.parentNode, next: preview.nextSibling };

        }



        if (preview.parentNode !== document.body) {

            document.body.appendChild(preview);

        }



        preview.style.display = 'block';

        preview.style.position = 'fixed';

        preview.style.left = '-9999px';

        preview.style.top = '0';

        preview.style.width = '2px';

        preview.style.height = '2px';

        preview.style.opacity = '0.01';

        preview.style.pointerEvents = 'none';

        preview.style.zIndex = '1';

        preview.style.overflow = 'hidden';

        preview.classList.add('vn-meditation-cam-mount');

    }



    function restorePreviewHome() {

        var preview = document.getElementById('cam-preview');

        if (!preview || !previewHome || !previewHome.parent) return;

        if (preview.parentNode === previewHome.parent) return;

        if (previewHome.next && previewHome.next.parentNode === previewHome.parent) {

            previewHome.parent.insertBefore(preview, previewHome.next);

        } else {

            previewHome.parent.appendChild(preview);

        }

        preview.removeAttribute('style');

        preview.classList.remove('vn-meditation-cam-mount');

    }



    function kickVisionPipeline() {

        mountPreviewForMeditation();

        if (!global.VNCameraGuard) return;

        if (!global.VNCameraGuard.hasLiveVideoTrack()) {

            global.VNCameraGuard.ensureMeditationVision();

            return;

        }

        global.VNCameraGuard.ensureMeditationVision();

    }



    function scheduleVisionKicks() {

        kickVisionPipeline();

        global.setTimeout(kickVisionPipeline, 120);

        global.setTimeout(kickVisionPipeline, 450);

        global.setTimeout(kickVisionPipeline, 900);

    }



    function bindMeditationTriggers() {

        document.querySelectorAll('[onclick*="startMeditationFlow"]').forEach(function (el) {

            if (el.__vnMedArm) return;

            el.__vnMedArm = true;

            el.addEventListener('pointerdown', armMeditationCameraWindow, { passive: true, capture: true });

            el.addEventListener('touchstart', armMeditationCameraWindow, { passive: true, capture: true });

            el.addEventListener('click', function () {

                armMeditationCameraWindow();

                scheduleVisionKicks();

            }, { capture: true });

        });

    }



    function watchMeditationPage() {

        var page = meditationPage();

        if (!page) return;

        var obs = new MutationObserver(function () {

            if (page.classList.contains('active')) {

                global.__vnMeditationWantsCamera = true;

                if (global.VNCameraGuard) global.VNCameraGuard.setMeditationCamera(true);

                scheduleVisionKicks();

            } else {

                global.__vnMeditationFlowActive = false;

                global.__vnMeditationWantsCamera = false;

                if (global.VNCameraGuard) global.VNCameraGuard.setMeditationCamera(false);

                restorePreviewHome();

            }

        });

        obs.observe(page, { attributes: true, attributeFilter: ['class'] });

    }



    function start() {

        bindMeditationTriggers();

        global.setTimeout(bindMeditationTriggers, 1000);

        watchMeditationPage();

    }



    global.VNMeditationCamera = { start: start, kickVisionPipeline: kickVisionPipeline };

})(typeof window !== 'undefined' ? window : global);


