/**
 * 部署自检：Vercel / 本地是否成功加载 Firebase
 */
(function () {
    "use strict";

    function runDiag() {
        var diag = {
            host: location.host,
            protocol: location.protocol,
            configLoaded: !!(window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.projectId),
            sdkLoaded: typeof firebase !== "undefined",
            logUserInput: typeof window.logUserInput === "function",
            loggerReady: typeof window.isUserInputLoggerReady === "function" && window.isUserInputLoggerReady(),
            configHttpStatus: null
        };

        var configUrl = new URL("firebase/firebase-config.js", document.baseURI).href;
        fetch(configUrl, { method: "GET", cache: "no-store" })
            .then(function (res) {
                diag.configHttpStatus = res.status;
                if (!res.ok) {
                    console.error("[Firebase 部署] 无法加载 " + configUrl + " HTTP " + res.status);
                }
                finish(diag);
            })
            .catch(function (err) {
                diag.configFetchError = String(err.message || err);
                finish(diag);
            });
    }

    function finish(diag) {
        window.__firebaseDeployDiag = diag;
        if (diag.configLoaded && diag.loggerReady) {
            console.log("[Firebase 部署] 记录系统就绪", diag.host);
            return;
        }
        var reasons = [];
        if (diag.configHttpStatus === 404) reasons.push("firebase/ 文件夹未部署");
        if (!diag.configLoaded) reasons.push("FIREBASE_CONFIG 未定义");
        if (!diag.sdkLoaded) reasons.push("Firebase SDK 未加载");
        if (!diag.logUserInput) reasons.push("user-input-logger.js 未加载");
        if (diag.configLoaded && diag.sdkLoaded && !diag.loggerReady) {
            reasons.push("Firestore 未初始化（检查 API 密钥域名）");
        }
        console.warn("[Firebase 部署] 云端记录不可用", reasons.join("；"), diag);
    }

    if (document.readyState === "loading") {
        window.addEventListener("load", runDiag);
    } else {
        runDiag();
    }
})();
