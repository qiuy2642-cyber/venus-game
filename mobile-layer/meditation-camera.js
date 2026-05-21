/**
 * Mobile meditation: user-gesture camera prime + visible min preview for Android/iOS.
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

        preview.classList.add('vn-meditation-cam-mount');
        preview.style.display = 'block';
        preview.style.position = 'fixed';
        preview.style.right = '0';
        preview.style.bottom = '0';
        preview.style.left = 'auto';
        preview.style.top = 'auto';
        preview.style.width = '1px';
        preview.style.height = '1px';
        preview.style.minWidth = '160px';
        preview.style.minHeight = '120px';
        preview.style.maxWidth = '200px';
        preview.style.maxHeight = '150px';
        preview.style.opacity = '0.02';
        preview.style.pointerEvents = 'none';
        preview.style.zIndex = '5';
        preview.style.overflow = 'hidden';
        preview.style.objectFit = 'cover';

        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
    }

    function restorePreviewHome() {
        var preview = document.getElementById('cam-preview');
        if (!preview || !previewHome || !previewHome.parent) return;
        if (preview.parentNode === previewHome.parent) return;

        if (global.VNCameraGuard) global.VNCameraGuard.stopMeditationFaceLoop();

        if (previewHome.next && previewHome.next.parentNode === previewHome.parent) {
            previewHome.parent.insertBefore(preview, previewHome.next);
        } else {
            previewHome.parent.appendChild(preview);
        }
        preview.removeAttribute('style');
        preview.classList.remove('vn-meditation-cam-mount');
        var video = document.getElementById('input-video');
        if (video) {
            video.removeAttribute('style');
        }
    }

    function onUserGesturePrime() {
        armMeditationCameraWindow();
        mountPreviewForMeditation();
        if (global.VNMobileMeditationFace) global.VNMobileMeditationFace.resetState();
        if (global.VNCameraGuard) {
            global.VNCameraGuard.primeMeditationStream();
        }
    }

    function kickVisionPipeline() {
        if (!isMeditationPage()) return;
        mountPreviewForMeditation();
        if (global.VNCameraGuard) {
            global.VNCameraGuard.ensureMeditationVision();
        }
    }

    function scheduleVisionKicks() {
        kickVisionPipeline();
        global.setTimeout(kickVisionPipeline, 100);
        global.setTimeout(kickVisionPipeline, 350);
        global.setTimeout(kickVisionPipeline, 800);
        global.setTimeout(kickVisionPipeline, 1600);
        global.setTimeout(kickVisionPipeline, 2800);
    }

    function bindMeditationTriggers() {
        document.querySelectorAll('[onclick*="startMeditationFlow"]').forEach(function (el) {
            if (el.__vnMedArm) return;
            el.__vnMedArm = true;

            el.addEventListener('touchstart', function () {
                onUserGesturePrime();
            }, { passive: true, capture: true });

            el.addEventListener('pointerdown', function () {
                onUserGesturePrime();
            }, { passive: true, capture: true });

            el.addEventListener('click', function () {
                armMeditationCameraWindow();
                mountPreviewForMeditation();
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
                if (global.VNMobileMeditationFace) global.VNMobileMeditationFace.resetState();
                if (global.VNCameraGuard) {
                    global.VNCameraGuard.setMeditationCamera(true);
                }
                mountPreviewForMeditation();
                scheduleVisionKicks();
            } else {
                global.__vnMeditationFlowActive = false;
                global.__vnMeditationWantsCamera = false;
                if (global.VNCameraGuard) {
                    global.VNCameraGuard.setMeditationCamera(false);
                }
                if (global.VNMobileMeditationFace) global.VNMobileMeditationFace.resetState();
                restorePreviewHome();
            }
        });
        obs.observe(page, { attributes: true, attributeFilter: ['class'] });
    }

    function start() {
        bindMeditationTriggers();
        global.setTimeout(bindMeditationTriggers, 800);
        global.setTimeout(bindMeditationTriggers, 2000);
        watchMeditationPage();
    }

    global.VNMeditationCamera = {
        start: start,
        kickVisionPipeline: kickVisionPipeline
    };
})(typeof window !== 'undefined' ? window : global);
