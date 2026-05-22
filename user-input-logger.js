/**
 * 用户输入后台记录 — Firestore collection: user_inputs
 */
(function () {
    "use strict";

    var COLLECTION = "user_inputs";
    var ANON_KEY = "mystic_anon_uid";
    var db = null;
    var ready = false;

    function isConfigReady() {
        var c = window.FIREBASE_CONFIG;
        if (!c || !c.projectId) return false;
        if (String(c.projectId).indexOf("REPLACE_") === 0) return false;
        if (String(c.apiKey).indexOf("REPLACE_") === 0) return false;
        return true;
    }

    function getPlatform() {
        if (window.VNMobileDetect && typeof window.VNMobileDetect.isMobileLayer === "function") {
            return window.VNMobileDetect.isMobileLayer() ? "mobile" : "desktop";
        }
        return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent || "") ? "mobile" : "desktop";
    }

    function getAnonId() {
        try {
            var id = localStorage.getItem(ANON_KEY);
            if (!id) {
                id = "anon_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 11);
                localStorage.setItem(ANON_KEY, id);
            }
            return id;
        } catch (e) {
            return "anon_session_" + Date.now().toString(36);
        }
    }

    function getCurrentPageLabel() {
        var active = document.querySelector(".page.active");
        if (active && active.id) return active.id;
        if (document.body.classList.contains("heartrate-active")) return "page-heartrate";
        if (document.body.classList.contains("lovesign-active")) return "page-lovesign";
        var stage = document.getElementById("divination-stage");
        if (stage && stage.style.display === "flex") return "divination-stage";
        return "unknown";
    }

    function initFirebase() {
        if (ready) return true;
        if (!isConfigReady()) {
            console.warn("[记录系统] 尚未配置 Firebase。");
            return false;
        }
        if (typeof firebase === "undefined") {
            console.warn("[记录系统] Firebase SDK 未加载。");
            return false;
        }
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(window.FIREBASE_CONFIG);
            }
            db = firebase.firestore();
            ready = true;
            console.log("[记录系统] Firestore 已就绪 ·", location.host);
            return true;
        } catch (err) {
            console.warn("[记录系统] 初始化失败", err);
            return false;
        }
    }

    function getRecordCategory(eventType) {
        var et = eventType || "";
        if (et === "divination_card" || et === "divination_result") return "cards";
        if (et === "color_saved" || et === "color_q1_confirm") return "colors";
        if (et === "lovesign_prayer") return "lovesign";
        if (et === "heartrate_profiles" || et === "heartrate_deliver") return "heartrate";
        if (et === "venus_wish") return "wishes";
        if (et === "memory_fragment_upload") return "uploads";
        if (et === "page_view" || et === "session_start") return "nav";
        return "other";
    }

    function logUserInput(eventType, payload) {
        try {
            if (!ready) initFirebase();
            if (!ready || !db) {
                console.warn("[记录系统] 跳过写入（未就绪）", location.host, eventType);
                return Promise.resolve();
            }

            var doc = {
                anonId: getAnonId(),
                page: getCurrentPageLabel(),
                platform: getPlatform(),
                category: getRecordCategory(eventType),
                eventType: eventType || "unknown",
                payload: payload || {},
                userAgent: (navigator.userAgent || "").slice(0, 240),
                host: location.host || "",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            return db.collection(COLLECTION).add(doc).then(function () {
                console.log("[记录系统] 已写入", eventType, location.host);
            }).catch(function (err) {
                var code = err && err.code ? err.code : "";
                var msg = err && err.message ? err.message : String(err);
                console.warn("[记录系统] 上传失败", location.host, code, msg);
                window.__lastFirestoreWriteError = { host: location.host, code: code, message: msg, eventType: eventType };
                if (code === "permission-denied") {
                    console.warn("[记录系统] Firestore 拒绝写入：请检查规则是否已发布，或 API 密钥是否已添加", location.host);
                }
            });
        } catch (e) {
            console.warn("[记录系统]", e);
            return Promise.resolve();
        }
    }

    window.getMysticAnonId = getAnonId;
    window.logUserInput = logUserInput;
    window.isUserInputLoggerReady = function () {
        return ready;
    };

    function boot() {
        initFirebase();
        if (ready && typeof window.logUserInput === "function") {
            window.logUserInput("session_start", {
                viewport: window.innerWidth + "x" + window.innerHeight
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
