/**
 * 部署自检：本地 http 与 Vercel https 是否成功加载 Firebase 配置与记录模块
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

        if (diag.configLoaded) {
            finish(diag);
            return;
        }

        var paths = ["venus-config.js", "venus-firebase-config.js"];
        var i = 0;
        function tryNext() {
            if (i >= paths.length) {
                finish(diag);
                return;
            }
            var configUrl = new URL(paths[i], document.baseURI).href;
            i += 1;
            fetch(configUrl, { method: "GET", cache: "no-store" })
                .then(function (res) {
                    diag.configHttpStatus = res.status;
                    if (res.ok) {
                        finish(diag);
                    } else {
                        tryNext();
                    }
                })
                .catch(function () {
                    tryNext();
                });
        }
        tryNext();
    }

    function finish(diag) {
        window.__firebaseDeployDiag = diag;

        if (diag.configLoaded && diag.loggerReady) {
            console.log("[Firebase 部署] 记录系统就绪", diag.host);
            return;
        }

        var reasons = [];
        if (diag.configHttpStatus === 404) {
            reasons.push("venus-config.js 在服务器上不存在（404，Upma 会过滤文件名含 firebase 的文件）");
        } else if (!diag.configLoaded) {
            reasons.push("FIREBASE_CONFIG 未定义");
        }
        if (!diag.sdkLoaded) reasons.push("Firebase SDK 未加载");
        if (!diag.logUserInput) reasons.push("user-input-logger.js 未加载");
        if (diag.configLoaded && diag.sdkLoaded && !diag.loggerReady) {
            reasons.push("Firestore 未初始化（常见：API 密钥未授权当前域名）");
        }

        console.warn("[Firebase 部署] 云端记录不可用 · " + location.host, reasons.join("；"), diag);

        if (location.protocol === "file:") return;

        setTimeout(function () {
            if (window.isUserInputLoggerReady && window.isUserInputLoggerReady()) return;
            if (typeof window.showToast === "function") {
                window.showToast("云端记录未连接（" + location.host + "）。请查看控制台 [Firebase 部署] 说明。");
            }
        }, 2500);
    }

    if (document.readyState === "loading") {
        window.addEventListener("load", runDiag);
    } else {
        runDiag();
    }
})();
