/**
 * 因缘记录殿 — 按类型分栏展示（占卜 / 调色 / 恋签 / 心跳 / 信笺 / 图片 / 浏览）
 */
(function () {
    "use strict";

    var PAGE_LABELS = {
        "page-q1": "恋心·色彩问卷",
        "page-lovesign": "恋签环节",
        "page-heartrate": "心跳共振",
        "page-meditation": "冥想",
        "page3": "page3",
        "page4": "维纳斯回廊",
        "divination-stage": "占卜",
        "unknown": "未知页面"
    };

    var EVENT_LABELS = {
        "color_q1_confirm": "色彩问卷确认",
        "lovesign_prayer": "恋签·心愿低语",
        "heartrate_profiles": "心跳·填报坐标",
        "heartrate_deliver": "心跳·递交共鸣",
        "venus_wish": "维纳斯·信笺心愿",
        "divination_card": "占卜·卡牌结果",
        "divination_result": "占卜·翻面结果",
        "color_saved": "恋心·调色(hex)",
        "memory_fragment_upload": "记忆碎片上传",
        "page_view": "页面浏览",
        "session_start": "会话开始"
    };

    /** eventType → 后台分栏容器 id */
    var BUCKETS = {
        cards: {
            title: "占卜卡牌",
            container: "list-cards",
            events: { divination_card: 1, divination_result: 1 }
        },
        colors: {
            title: "调色记录",
            container: "list-colors",
            events: { color_saved: 1, color_q1_confirm: 1 }
        },
        lovesign: {
            title: "恋签 · 心愿低语",
            container: "list-lovesign",
            events: { lovesign_prayer: 1 }
        },
        heartrate: {
            title: "心跳共振",
            container: "list-heartrate",
            events: { heartrate_profiles: 1, heartrate_deliver: 1 }
        },
        wishes: {
            title: "维纳斯 · 信笺心愿",
            container: "list-wishes",
            events: { venus_wish: 1 }
        },
        uploads: {
            title: "记忆碎片 · 上传记录",
            container: "list-upload-meta",
            events: { memory_fragment_upload: 1 }
        },
        nav: {
            title: "浏览轨迹（仅导航，非用户填写内容）",
            container: "list-nav",
            events: { page_view: 1, session_start: 1 }
        },
        other: {
            title: "其它记录",
            container: "list-other",
            events: {}
        }
    };

    var auth = null;
    var db = null;

    function particles() {
        var box = document.getElementById("particles");
        if (!box) return;
        for (var i = 0; i < 28; i++) {
            var p = document.createElement("div");
            p.className = "particle";
            p.style.left = Math.random() * 100 + "%";
            p.style.animationDuration = (8 + Math.random() * 12) + "s";
            p.style.animationDelay = Math.random() * 8 + "s";
            box.appendChild(p);
        }
    }

    function isConfigReady() {
        var c = window.FIREBASE_CONFIG;
        return c && c.projectId && String(c.projectId).indexOf("REPLACE_") !== 0;
    }

    function getAdminEmail() {
        return (window.FIREBASE_ADMIN_EMAIL || "").trim().toLowerCase();
    }

    function isAdminEmailConfigured() {
        var admin = getAdminEmail();
        return !!(admin && admin.indexOf("your_admin_email") < 0);
    }

    function isAdminEmail(email) {
        if (!isAdminEmailConfigured()) return false;
        return (email || "").trim().toLowerCase() === getAdminEmail();
    }

    function adminConfigHint() {
        if (isAdminEmailConfigured()) {
            return "请使用管理员邮箱登录（当前配置：" + getAdminEmail() + "）";
        }
        return "管理员邮箱尚未配置：请编辑 firebase-config.js，或复制 admin-email.local.example.js 为 admin-email.local.js。";
    }

    function loadOptionalLocalAdminEmail(done) {
        var s = document.createElement("script");
        s.src = "admin-email.local.js";
        s.onload = function () { done(); };
        s.onerror = function () { done(); };
        (document.head || document.documentElement).appendChild(s);
    }

    function initFirebase() {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        auth = firebase.auth();
        db = firebase.firestore();
    }

    function formatTime(ts) {
        if (!ts || !ts.toDate) return "—";
        var d = ts.toDate();
        var pad = function (n) { return n < 10 ? "0" + n : "" + n; };
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
            " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function escapeHtml(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function formatPayload(obj) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (e) {
            return String(obj);
        }
    }

    function getBucketKey(eventType) {
        var et = eventType || "";
        var keys = Object.keys(BUCKETS);
        for (var i = 0; i < keys.length; i++) {
            var b = BUCKETS[keys[i]];
            if (b.events && b.events[et]) return keys[i];
        }
        return "other";
    }

    function collectHex(payload) {
        var p = payload || {};
        var hex = p.color || p.mixedColor || "";
        if (hex.indexOf("rgb") === 0) {
            var m = hex.match(/\d+/g);
            if (m && m.length >= 3) {
                hex = "#" + m.slice(0, 3).map(function (n) {
                    var h = parseInt(n, 10).toString(16);
                    return h.length === 1 ? "0" + h : h;
                }).join("");
            }
        }
        return hex;
    }

    function formatHeartrateBody(payload) {
        var p = payload || {};
        var lines = [];
        ["A", "B"].forEach(function (side) {
            var x = p[side];
            if (!x) return;
            lines.push(
                side + "：" + (x.name || "—") +
                " · " + (x.birthdate || "—") +
                " · " + (x.zodiac || "—") +
                " · " + (x.mbti || "—") +
                " · " + (x.lovetype || "—")
            );
        });
        return lines.length ? lines.join("\n") : formatPayload(p);
    }

    function formatPayloadBody(eventType, payload) {
        var p = payload || {};
        if (eventType === "lovesign_prayer" || eventType === "venus_wish") {
            return p.text ? escapeHtml(p.text) : formatPayload(p);
        }
        if (eventType === "divination_card" || eventType === "divination_result") {
            var html = "<strong>" + escapeHtml(p.cardName || "—") + "</strong>";
            if (p.message) html += "<br><span style=\"opacity:0.85\">" + escapeHtml(p.message) + "</span>";
            return html;
        }
        if (eventType === "color_saved" || eventType === "color_q1_confirm") {
            var hex = collectHex(p) || "#ccc";
            return '<span class="swatch" style="background:' + hex + '"></span>' + escapeHtml(hex);
        }
        if (eventType === "heartrate_profiles" || eventType === "heartrate_deliver") {
            return escapeHtml(formatHeartrateBody(p)).replace(/\n/g, "<br>");
        }
        if (eventType === "memory_fragment_upload") {
            return escapeHtml((p.name || "文件") + " · " + (p.size != null ? p.size + " bytes" : ""));
        }
        if (eventType === "page_view") {
            return "进入页面：<code>" + escapeHtml(p.pageId || "—") + "</code>";
        }
        if (eventType === "session_start") {
            return "视口 " + escapeHtml(p.viewport || "—");
        }
        return escapeHtml(formatPayload(p));
    }

    function showGate(msg) {
        document.getElementById("gate").classList.remove("hidden");
        document.getElementById("main-panel").classList.add("hidden");
        var hint = document.getElementById("gate-hint");
        if (hint && msg) hint.textContent = msg;
    }

    function showMain(user) {
        document.getElementById("gate").classList.add("hidden");
        document.getElementById("main-panel").classList.remove("hidden");
        var who = document.getElementById("admin-who");
        if (who && user) who.textContent = "已登录：" + user.email;
    }

    function clearAllLists() {
        Object.keys(BUCKETS).forEach(function (key) {
            var el = document.getElementById(BUCKETS[key].container);
            if (el) el.innerHTML = "<p class=\"status\">加载中…</p>";
        });
        var up = document.getElementById("list-uploads");
        if (up) up.innerHTML = "<p class=\"status\">加载中…</p>";
    }

    function renderEmpty(containerId) {
        var el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = "";
        var empty = document.createElement("p");
        empty.className = "status";
        empty.textContent = "暂无记录。";
        el.appendChild(empty);
    }

    function buildInputCard(d) {
        var card = document.createElement("article");
        card.className = "card";
        var pageLabel = PAGE_LABELS[d.page] || d.page || "—";
        var eventLabel = EVENT_LABELS[d.eventType] || d.eventType || "—";
        var head = document.createElement("div");
        head.className = "card-head";
        head.innerHTML =
            '<span class="time">' + formatTime(d.createdAt) + "</span>" +
            '<span class="tag">' + escapeHtml(pageLabel) + "</span>" +
            '<span class="tag">' + escapeHtml(eventLabel) + "</span>";
        var anon = document.createElement("div");
        anon.className = "anon";
        anon.textContent = "匿名 ID：" + (d.anonId || "—");
        var body = document.createElement("div");
        body.className = "payload payload-rich";
        body.innerHTML = formatPayloadBody(d.eventType, d.payload);
        card.appendChild(head);
        card.appendChild(anon);
        card.appendChild(body);
        return card;
    }

    function renderBucketRows(containerId, rows) {
        var el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = "";
        if (!rows.length) {
            renderEmpty(containerId);
            return;
        }
        rows.forEach(function (r) {
            el.appendChild(r.el);
        });
    }

    function millis(ts) {
        return ts && ts.toMillis ? ts.toMillis() : 0;
    }

    function distributeInputs(snap) {
        var buckets = {};
        Object.keys(BUCKETS).forEach(function (k) {
            buckets[k] = [];
        });
        snap.forEach(function (doc) {
            var d = doc.data();
            var key = getBucketKey(d.eventType);
            buckets[key].push({
                createdAt: d.createdAt,
                el: buildInputCard(d)
            });
        });
        Object.keys(buckets).forEach(function (key) {
            buckets[key].sort(function (a, b) {
                return millis(b.createdAt) - millis(a.createdAt);
            });
            renderBucketRows(BUCKETS[key].container, buckets[key]);
        });
    }

    function countByBucket(snap) {
        var counts = {};
        Object.keys(BUCKETS).forEach(function (k) { counts[k] = 0; });
        snap.forEach(function (doc) {
            var key = getBucketKey(doc.data().eventType);
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }

    function loadStorageUploads() {
        return db.collection("user_uploads").orderBy("createdAt", "desc").limit(80).get()
            .then(function (snap) {
                var el = document.getElementById("list-uploads");
                if (!el) return;
                el.innerHTML = "";
                if (snap.empty) {
                    renderEmpty("list-uploads");
                    return;
                }
                snap.forEach(function (doc) {
                    var d = doc.data();
                    var card = document.createElement("article");
                    card.className = "card";
                    card.innerHTML =
                        '<div class="card-head"><span class="time">' + formatTime(d.createdAt) +
                        '</span><span class="tag">Storage 图片</span></div>';
                    if (d.url) {
                        var img = document.createElement("img");
                        img.className = "thumb";
                        img.src = d.url;
                        img.alt = "记忆碎片";
                        card.appendChild(img);
                    }
                    var link = document.createElement("div");
                    link.className = "anon";
                    link.textContent = d.url || "—";
                    card.appendChild(link);
                    el.appendChild(card);
                });
            })
            .catch(function (err) {
                console.warn("[admin] user_uploads", err);
                var el = document.getElementById("list-uploads");
                if (el) {
                    el.innerHTML = '<p class="err">图片读取失败：' + escapeHtml(err.message || err) + "</p>";
                }
            });
    }

    function mergeCardFromCollection() {
        return db.collection("user_cards").orderBy("createdAt", "desc").limit(80).get()
            .then(function (snap) {
                if (snap.empty) return;
                var rows = [];
                snap.forEach(function (doc) {
                    var d = doc.data();
                    var card = document.createElement("article");
                    card.className = "card";
                    card.innerHTML =
                        '<div class="card-head"><span class="time">' + formatTime(d.createdAt) +
                        '</span><span class="tag">卡牌库</span></div>' +
                        '<div class="payload payload-rich"><strong>' + escapeHtml(d.cardName || "—") + "</strong></div>";
                    rows.push({ createdAt: d.createdAt, el: card });
                });
                var el = document.getElementById("list-cards");
                if (!el || !rows.length) return;
                var existing = el.querySelectorAll(".card").length;
                var onlyEmpty = el.querySelector(".status");
                if (existing === 0 || (onlyEmpty && existing <= 0)) {
                    renderBucketRows("list-cards", rows);
                }
            })
            .catch(function () { /* 可选集合 */ });
    }

    function mergeColorFromCollection() {
        return db.collection("user_colors").orderBy("createdAt", "desc").limit(80).get()
            .then(function (snap) {
                if (snap.empty) return;
                var rows = [];
                snap.forEach(function (doc) {
                    var d = doc.data();
                    var hex = d.color || "#ccc";
                    var card = document.createElement("article");
                    card.className = "card";
                    card.innerHTML =
                        '<div class="card-head"><span class="time">' + formatTime(d.createdAt) +
                        '</span><span class="tag">调色库</span></div>' +
                        '<div class="payload payload-rich"><span class="swatch" style="background:' + hex +
                        '"></span>' + escapeHtml(hex) + "</div>";
                    rows.push({ createdAt: d.createdAt, el: card });
                });
                var el = document.getElementById("list-colors");
                if (!el || !rows.length) return;
                var onlyStatus = el.querySelector(".status") && !el.querySelector(".card");
                if (onlyStatus) renderBucketRows("list-colors", rows);
            })
            .catch(function () { /* 可选集合 */ });
    }

    function loadRecords() {
        var status = document.getElementById("status");
        var stats = document.getElementById("stats");

        if (!isConfigReady()) {
            status.innerHTML = '<p class="err">Firebase 尚未配置。</p>';
            return;
        }
        if (!isAdminEmailConfigured()) {
            status.innerHTML = '<p class="err">' + adminConfigHint() + "</p>";
            return;
        }

        status.textContent = "正在按类型整理因缘记录…";
        clearAllLists();

        db.collection("user_inputs")
            .orderBy("createdAt", "desc")
            .limit(400)
            .get()
            .then(function (snap) {
                distributeInputs(snap);
                var c = countByBucket(snap);
                status.textContent = snap.empty ? "暂无记录。" : "已按类型分栏展示（共 " + snap.size + " 条）";
                stats.textContent =
                    "卡牌 " + c.cards + " · 调色 " + c.colors + " · 恋签 " + c.lovesign +
                    " · 心跳 " + c.heartrate + " · 信笺 " + c.wishes +
                    " · 浏览 " + c.nav;
                return Promise.all([
                    loadStorageUploads(),
                    mergeCardFromCollection(),
                    mergeColorFromCollection()
                ]);
            })
            .catch(function (err) {
                status.innerHTML = '<p class="err">读取失败：' + escapeHtml(err.message || err) +
                    "<br>请确认已用管理员登录且 Firestore 规则已发布。</p>";
                console.error(err);
            });
    }

    function handleLogin() {
        var email = (document.getElementById("gate-email").value || "").trim();
        var pass = document.getElementById("gate-pass").value || "";
        var errEl = document.getElementById("gate-err");
        errEl.textContent = "";

        if (!isConfigReady()) {
            errEl.textContent = "Firebase 未配置";
            return;
        }
        initFirebase();

        auth.signInWithEmailAndPassword(email, pass)
            .then(function (cred) {
                if (!isAdminEmail(cred.user.email)) {
                    return auth.signOut().then(function () {
                        errEl.textContent = isAdminEmailConfigured()
                            ? "此账号无权访问。配置管理员：" + getAdminEmail()
                            : adminConfigHint();
                    });
                }
                showMain(cred.user);
                loadRecords();
            })
            .catch(function (err) {
                errEl.textContent = err.message || "登录失败";
            });
    }

    function handleLogout() {
        if (auth) auth.signOut();
        showGate("请使用管理员邮箱登录");
        document.getElementById("stats").textContent = "";
        document.getElementById("status").textContent = "";
        clearAllLists();
    }

    function boot() {
        particles();
        if (!isConfigReady()) {
            showGate("请先配置 firebase-config.js");
            return;
        }
        if (!isAdminEmailConfigured()) {
            showGate(adminConfigHint());
        }
        initFirebase();

        document.getElementById("gate-btn").addEventListener("click", handleLogin);
        document.getElementById("logout-btn").addEventListener("click", handleLogout);
        document.getElementById("refresh-btn").addEventListener("click", function () {
            if (auth.currentUser && isAdminEmail(auth.currentUser.email)) loadRecords();
        });

        auth.onAuthStateChanged(function (user) {
            if (user && isAdminEmail(user.email)) {
                showMain(user);
                loadRecords();
            } else {
                if (user) auth.signOut();
                showGate("请使用管理员邮箱登录");
            }
        });
    }

    function start() {
        loadOptionalLocalAdminEmail(boot);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start);
    } else {
        start();
    }
})();
