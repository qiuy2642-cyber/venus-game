/**
 * 依次尝试本地 vendor / 国内镜像 / jsDelivr，避免 ERR_TIMED_OUT 导致整页崩溃。
 */
(function (global) {
    var MP_VER = '0.4.1675469240';

    global.__mediapipeBase = global.__mediapipeBase || {};

    function loadScript(url) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = url;
            var skipCors = url.indexOf('tailwind') >= 0 || url.indexOf('vendor/') === 0;
            if (!skipCors) s.crossOrigin = 'anonymous';
            s.onload = function () { resolve(url); };
            s.onerror = function () { reject(new Error(url)); };
            document.head.appendChild(s);
        });
    }

    function loadFirst(urls) {
        var chain = Promise.reject();
        urls.forEach(function (url) {
            chain = chain.catch(function () { return loadScript(url); });
        });
        return chain;
    }

    function setMediapipeBase(pkg, loadedUrl) {
        if (loadedUrl.indexOf('./vendor/') === 0 || loadedUrl.indexOf('vendor/') >= 0) {
            global.__mediapipeBase[pkg] = 'vendor/mediapipe/' + pkg;
        } else if (loadedUrl.indexOf('jsdelivr') >= 0) {
            global.__mediapipeBase[pkg] = 'https://cdn.jsdelivr.net/npm/@mediapipe/' + pkg;
        } else if (loadedUrl.indexOf('unpkg.com') >= 0) {
            global.__mediapipeBase[pkg] = 'https://unpkg.com/@mediapipe/' + pkg + '@' + MP_VER;
        } else if (loadedUrl.indexOf('npmmirror') >= 0) {
            global.__mediapipeBase[pkg] =
                'https://cdn.npmmirror.com/packages/@mediapipe/' + pkg + '/' + MP_VER + '/files';
        } else {
            global.__mediapipeBase[pkg] = 'https://cdn.jsdelivr.net/npm/@mediapipe/' + pkg;
        }
    }

    global.mediapipeLocateFile = function (pkg) {
        return function (file) {
            var base = global.__mediapipeBase[pkg] || ('https://cdn.jsdelivr.net/npm/@mediapipe/' + pkg);
            return base + '/' + file;
        };
    };

    function mpUrls(pkg, file) {
        var f = file || (pkg + '.js');
        var name = f.replace(/\.js$/, '') === pkg ? pkg + '.js' : f;
        if (name === 'hands.js' || name === 'face_mesh.js') {
            /* keep */
        }
        var jsName = name.indexOf('.js') >= 0 ? name : pkg + '.js';
        return [
            'https://cdn.jsdelivr.net/npm/@mediapipe/' + pkg + '/' + jsName,
            'https://unpkg.com/@mediapipe/' + pkg + '@' + MP_VER + '/' + jsName,
            'https://cdn.npmmirror.com/packages/@mediapipe/' + pkg + '/' + MP_VER + '/files/' + jsName,
            'vendor/mediapipe/' + pkg + '/' + jsName
        ];
    }

    var bundles = [
        { pkg: 'hands', urls: mpUrls('hands', 'hands.js') },
        { pkg: 'face_mesh', urls: mpUrls('face_mesh', 'face_mesh.js') },
        { pkg: 'camera_utils', urls: mpUrls('camera_utils', 'camera_utils.js') },
        {
            name: 'tailwind',
            skip: function () { return typeof global.tailwind !== 'undefined'; },
            urls: ['https://cdn.tailwindcss.com']
        },
        {
            name: 'three',
            urls: [
                'https://cdn.bootcdn.net/ajax/libs/three.js/r128/three.min.js',
                'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
                'vendor/three.min.js'
            ]
        },
        {
            name: 'gsap',
            urls: [
                'https://cdn.bootcdn.net/ajax/libs/gsap/3.12.2/gsap.min.js',
                'https://cdn.jsdelivr.net/npm/gsap@3.12.2/dist/gsap.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js',
                'vendor/gsap.min.js'
            ]
        }
    ];

    global.depsReady = bundles.reduce(function (prev, item) {
        return prev.then(function () {
            if (item.skip && item.skip()) return Promise.resolve();
            return loadFirst(item.urls).then(function (used) {
                if (item.pkg) setMediapipeBase(item.pkg, used);
            });
        });
    }, Promise.resolve());

    global.depsReady.catch(function (err) {
        console.error('[cdn-loader] 部分依赖加载失败:', err);
    });

    global.applyTailwindConfig = function () {
        if (typeof global.tailwind === 'undefined') {
            console.warn('[cdn-loader] Tailwind 未加载，心跳页样式可能不完整');
            return;
        }
        global.tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        serif: ['Cinzel', 'Georgia', 'serif'],
                        playfair: ['Playfair Display', 'serif'],
                        sans: ['"Noto Serif SC"', 'serif']
                    },
                    colors: {
                        venus: {
                            red: '#B3243C',
                            deep: '#540D1A',
                            rose: '#E25C70',
                            cream: '#FCFAF2',
                            parchment: '#F5EFEB',
                            gold: '#C3A25A',
                            ink: '#2B1A1D',
                            dark: '#140D1A',
                            accent: '#FAF4EB'
                        }
                    }
                }
            }
        };
    };
})(window);
