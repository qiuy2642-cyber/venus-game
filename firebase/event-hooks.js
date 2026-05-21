/**
 * 自动挂钩：记忆碎片上传、占卜翻面、页面切换（desktop + mobile 共用）
 */
(function () {
    "use strict";

    function log(eventType, payload) {
        if (typeof window.logUserInput === "function") {
            window.logUserInput(eventType, payload || {});
        }
    }

    function readFlippedCardResult(card) {
        if (!card) return null;
        var res = card.querySelector(".f-res");
        var msg = card.querySelector(".f-msg");
        return {
            cardName: res ? String(res.innerText || "").trim() : "",
            message: msg ? String(msg.innerText || "").trim().slice(0, 200) : ""
        };
    }

    function onCardFlipped(card) {
        var data = readFlippedCardResult(card);
        if (!data || !data.cardName) return;
        if (typeof window.logUserCard === "function") {
            window.logUserCard(data.cardName);
        }
        log("divination_result", data);
    }

    function watchDivinationFlip() {
        var portal = document.getElementById("divine-card-portal");
        var row = document.getElementById("divine-card-row");
        var obs = new MutationObserver(function (mutations) {
            mutations.forEach(function (m) {
                if (m.attributeName !== "class" || !m.target.classList) return;
                if (m.target.classList.contains("flipped")) {
                    onCardFlipped(m.target);
                }
            });
        });
        if (portal) {
            obs.observe(portal, { attributes: true, subtree: true, attributeFilter: ["class"] });
        }
        if (row) {
            obs.observe(row, { attributes: true, subtree: true, attributeFilter: ["class"] });
        }
    }

    function watchFragmentUpload() {
        document.addEventListener("change", function (e) {
            var t = e.target;
            if (!t || t.id !== "fragment-upload" || !t.files || !t.files[0]) return;
            log("memory_fragment_upload", { name: t.files[0].name, size: t.files[0].size });
            if (typeof window.logUserUpload === "function") {
                window.logUserUpload(t.files[0]);
            }
        }, true);
    }

    function watchPageChanges() {
        document.querySelectorAll(".page").forEach(function (page) {
            var obs = new MutationObserver(function () {
                if (page.classList.contains("active")) {
                    log("page_view", { pageId: page.id });
                }
            });
            obs.observe(page, { attributes: true, attributeFilter: ["class"] });
        });
        var stage = document.getElementById("divination-stage");
        if (stage) {
            var stageObs = new MutationObserver(function () {
                if (stage.style.display === "flex") {
                    log("page_view", { pageId: "divination-stage" });
                }
            });
            stageObs.observe(stage, { attributes: true, attributeFilter: ["style"] });
        }
    }

    function boot() {
        watchFragmentUpload();
        watchDivinationFlip();
        window.setTimeout(watchPageChanges, 800);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})(typeof window !== "undefined" ? window : global);
