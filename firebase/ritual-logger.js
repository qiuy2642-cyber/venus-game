/**
 * 仪式数据：图片 Storage、卡牌名、调色 hex
 */
(function () {
    "use strict";

    if (typeof window.VENUS_SKIP_STORAGE_UPLOAD === "undefined") {
        window.VENUS_SKIP_STORAGE_UPLOAD = true;
    }

    var COL_UPLOADS = "user_uploads";
    var COL_CARDS = "user_cards";
    var COL_COLORS = "user_colors";
    var MAX_IMAGE_BYTES = 8 * 1024 * 1024;

    var db = null;
    var storage = null;
    var ready = false;

    function isConfigReady() {
        var c = window.FIREBASE_CONFIG;
        return c && c.projectId && String(c.projectId).indexOf("REPLACE_") !== 0;
    }

    function getAnonId() {
        if (typeof window.getMysticAnonId === "function") return window.getMysticAnonId();
        return "anon_unknown";
    }

    function init() {
        if (ready) return true;
        if (!isConfigReady() || typeof firebase === "undefined") return false;
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(window.FIREBASE_CONFIG);
            }
            db = firebase.firestore();
            if (typeof firebase.storage === "function") {
                storage = firebase.storage();
            }
            ready = !!db;
            return ready;
        } catch (err) {
            console.warn("[ritual-logger]", err);
            return false;
        }
    }

    function rgbStringToHex(rgb) {
        if (!rgb) return "";
        if (rgb.charAt(0) === "#") return rgb.slice(0, 7);
        var m = rgb.match(/\d+/g);
        if (!m || m.length < 3) return rgb;
        return "#" + m.slice(0, 3).map(function (n) {
            var h = parseInt(n, 10).toString(16);
            return h.length === 1 ? "0" + h : h;
        }).join("");
    }

    function logUserUpload(file) {
        if (window.VENUS_SKIP_STORAGE_UPLOAD) return Promise.resolve();
        if (!file || !file.type || file.type.indexOf("image/") !== 0) return Promise.resolve();
        if (file.size > MAX_IMAGE_BYTES) return Promise.resolve();
        if (!init() || !storage || !db) return Promise.resolve();

        var anon = getAnonId();
        var ext = (file.name && file.name.split(".").pop()) || "jpg";
        ext = String(ext).toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        var path = "uploads/" + anon + "/" + Date.now() + "." + ext;
        var ref = storage.ref(path);

        return ref.put(file).then(function () {
            return ref.getDownloadURL();
        }).then(function (url) {
            return db.collection(COL_UPLOADS).add({
                url: url,
                anonId: anon,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).catch(function (err) {
            console.warn("[ritual-logger] 图片上传失败", err);
        });
    }

    function logUserCard(cardName) {
        var name = String(cardName || "").trim().slice(0, 64);
        if (!name) return Promise.resolve();
        if (typeof window.logUserInput === "function") {
            window.logUserInput("divination_card", { cardName: name });
        }
        if (!init() || !db) return Promise.resolve();
        return db.collection(COL_CARDS).add({
            cardName: name,
            anonId: getAnonId(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () { /* user_inputs 已记 */ });
    }

    function logUserColor(colorHex) {
        var hex = rgbStringToHex(colorHex);
        if (!hex) return Promise.resolve();
        if (typeof window.logUserInput === "function") {
            window.logUserInput("color_saved", { color: hex });
        }
        if (!init() || !db) return Promise.resolve();
        return db.collection(COL_COLORS).add({
            color: hex,
            anonId: getAnonId(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function () { /* user_inputs 已记 */ });
    }

    window.logUserUpload = logUserUpload;
    window.logUserCard = logUserCard;
    window.logUserColor = logUserColor;
    window.rgbStringToHex = rgbStringToHex;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
