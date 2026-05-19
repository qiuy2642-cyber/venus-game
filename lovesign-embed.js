(function () {
        const state = {
            isRunning: false,
            pointer: null, 
            rawPointer: {x: 0, y: 0},
            pointerHistory: [], 
            isPinching: false,
            hoveredSlip: null,
            selectedSlip: null,
            phase: 'idle', // 'idle' | 'drawing' | 'reading'
            stirVelocity: 0,
            lastPointerX: 0,
            lastPointerY: 0,
            activeLayer: 'A', 
            isSwapping: false,
        };

        const canvasContainer = document.getElementById('canvas-container');
        const startBtn = document.getElementById('start-btn');
        const startScreen = document.getElementById('start-screen');
        const transitionOverlay = document.getElementById('transition-overlay');
        const interactivePanel = document.getElementById('interactive-panel');
        const hintText = document.getElementById('hint-text');
        const fingerCursor = document.getElementById('finger-cursor');
        
        // 3D 纸张翻转结构层
        const resultCardContainer = document.getElementById('result-card-container');
        const resultCardInner = document.getElementById('result-card-inner');
        const showPrayerBtn = document.getElementById('show-prayer-btn');
        const backToFrontBtn = document.getElementById('back-to-front-btn');
        const sendPrayerBtn = document.getElementById('send-prayer-btn');
        const finalCloseBtn = document.getElementById('final-close-btn');
        const prayerTextInput = document.getElementById('prayer-text-input');
        const prayerCharCounter = document.getElementById('prayer-char-counter');
        const prayerFormArea = document.getElementById('prayer-form-area');
        const prayerSuccessArea = document.getElementById('prayer-success-area');

        const waxSeal = document.getElementById('wax-seal');
        const fortuneContent = document.getElementById('fortune-content');
        const fortuneSub = document.getElementById('fortune-sub');
        const stirIndicator = document.getElementById('stir-indicator');
        const manualWashBtn = document.getElementById('manual-wash-btn');

        let scene, camera, renderer, slipsGroupA, slipsGroupB, bgSlipsGroup, redThreadsGroup, particles;
        const slipsA = []; 
        const slipsB = []; 
        let raycaster, clock, waterPlane;

        // 维纳斯艺术专色体系
        const COLORS = {
            creamBg: 0xfcfaf2,     // 温暖奶油底
            pinkMist: 0xfdf3f0,    // 缥缈恋爱粉
            venusRed: 0x8b1a1a,    // 维纳斯暗红
            slipBase: 0xfdfbf7,    // 签纸古典淡色纸张质感
            cardBorder: 0xd6c0b3,  // 签纸边缘细金粉线
            darkBurgundy: 0x520c0c // 极深红
        };

        const SLIPS_PER_GROUP = 5;

        function initThreeJS() {
            state.pointer = new THREE.Vector2(-999, -999);

            scene = new THREE.Scene();
            scene.background = new THREE.Color(COLORS.creamBg);
            scene.fog = new THREE.FogExp2(COLORS.creamBg, 0.05);

            camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 100);
            camera.position.set(0, 11, 0.01); 
            camera.up.set(0, 0, -1); 
            camera.lookAt(0, 0, 0);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            canvasContainer.appendChild(renderer.domElement);

            raycaster = new THREE.Raycaster();
            clock = new THREE.Clock();

            createLights();
            createWaterMirror();
            createVenusRedThreads(); 
            createSlipsLayout();
            createLoveParticles();   

            window.addEventListener('resize', onWindowResize, false);
            
            // 绑定事件（仅保留键鼠与触控，去除手势多余层）
            window.addEventListener('mousemove', onMouseMove, false);
            window.addEventListener('mousedown', onMouseDown, false);
            window.addEventListener('mouseup', onMouseUp, false);
            
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchstart', onTouchStart, { passive: false });
            window.addEventListener('touchend', onTouchEnd, { passive: false });
            
            manualWashBtn.addEventListener('click', () => {
                triggerSwap();
            });

            waxSeal.addEventListener('click', () => {
                breakWaxSeal();
            });

            // 翻转到写信背面
            showPrayerBtn.addEventListener('click', () => {
                resultCardInner.style.transform = "rotateY(180deg)";
            });

            // 翻回背面
            backToFrontBtn.addEventListener('click', () => {
                resultCardInner.style.transform = "rotateY(0deg)";
            });

            // 监听输入
            prayerTextInput.addEventListener('input', (e) => {
                prayerCharCounter.innerText = `${e.target.value.length} / 60`;
            });

            // 点击寄往维纳斯
            sendPrayerBtn.addEventListener('click', () => {
                submitPrayer();
            });
        }

        function createLights() {
            const ambientLight = new THREE.AmbientLight(0xfff0ed, 1.4);
            scene.add(ambientLight);

            const mainMoonLight = new THREE.DirectionalLight(0xfff7f2, 1.1);
            mainMoonLight.position.set(5, 10, -5);
            scene.add(mainMoonLight);

            const poolLight = new THREE.PointLight(COLORS.venusRed, 1.8, 15);
            poolLight.position.set(0, -3, 0);
            scene.add(poolLight);
        }

        function createWaterMirror() {
            const planeGeo = new THREE.PlaneGeometry(60, 60);
            const planeMat = new THREE.MeshStandardMaterial({
                color: COLORS.pinkMist,
                roughness: 0.2,
                metalness: 0.05,
                transparent: true,
                opacity: 0.88
            });
            waterPlane = new THREE.Mesh(planeGeo, planeMat);
            waterPlane.rotation.x = -Math.PI / 2;
            waterPlane.position.y = -3.8;
            scene.add(waterPlane);
        }

        function createVenusRedThreads() {
            redThreadsGroup = new THREE.Group();
            scene.add(redThreadsGroup);

            const createSingleRedThread = (radius, heightOffset, speedCoeff, randomFactor) => {
                const points = [];
                const segments = 100;
                for (let i = 0; i <= segments; i++) {
                    const theta = (i / segments) * Math.PI * 2;
                    const r = radius + Math.sin(theta * 3 + randomFactor) * 0.4;
                    const x = Math.cos(theta) * r;
                    const z = Math.sin(theta) * r;
                    const y = heightOffset + Math.sin(theta * 5) * 0.15;
                    points.push(new THREE.Vector3(x, y, z));
                }
                
                const curve = new THREE.CatmullRomCurve3(points, true);
                const curvePoints = curve.getPoints(120);
                const geom = new THREE.BufferGeometry().setFromPoints(curvePoints);
                
                const mat = new THREE.LineBasicMaterial({
                    color: COLORS.venusRed,
                    transparent: true,
                    opacity: 0.35,
                    linewidth: 1 
                });

                const line = new THREE.Line(geom, mat);
                redThreadsGroup.add(line);

                return {
                    line: line,
                    basePoints: curvePoints,
                    speed: speedCoeff,
                    randomPhase: randomFactor
                };
            };

            state.weavingLines = [
                createSingleRedThread(4.2, -1.8, 0.4, 0.0),
                createSingleRedThread(2.5, -2.1, -0.6, 2.5),
                createSingleRedThread(3.4, -2.0, 0.2, 5.0)
            ];
        }

        function createSlipsLayout() {
            slipsGroupA = new THREE.Group();
            scene.add(slipsGroupA);

            slipsGroupB = new THREE.Group();
            scene.add(slipsGroupB);

            bgSlipsGroup = new THREE.Group();
            scene.add(bgSlipsGroup);

            const slipGeo = new THREE.PlaneGeometry(0.55, 1.98);
            const edgesGeo = new THREE.EdgesGeometry(slipGeo);

            const basePaperMat = new THREE.MeshStandardMaterial({
                color: COLORS.slipBase,
                roughness: 0.9,
                metalness: 0.02,
                side: THREE.DoubleSide,
                emissive: COLORS.venusRed,
                emissiveIntensity: 0.0
            });

            // 1. A 组签纸 (前景 - 默认初始活跃层)
            for (let i = 0; i < SLIPS_PER_GROUP; i++) {
                const mat = basePaperMat.clone();
                const mesh = new THREE.Mesh(slipGeo, mat);

                const edgeColor = Math.random() > 0.4 ? COLORS.cardBorder : COLORS.venusRed;
                const edgeMat = new THREE.LineBasicMaterial({ 
                    color: edgeColor, 
                    transparent: true, 
                    opacity: 0.45 
                });
                const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
                mesh.add(wireframe);

                const angle = (i / SLIPS_PER_GROUP) * Math.PI * 2;
                mesh.position.x = Math.cos(angle) * 3.8;
                mesh.position.z = Math.sin(angle) * 3.8;
                mesh.position.y = 1.0;

                mesh.rotation.x = -Math.PI / 2 + (Math.random() * 0.08 - 0.04);
                mesh.rotation.z = angle + Math.PI / 2;

                slipsGroupA.add(mesh);
                slipsA.push({
                    mesh: mesh,
                    wireframe: wireframe,
                    baseAngle: angle,
                    targetRadius: 3.8,
                    targetY: 1.0,
                    isResponding: false,
                    id: i
                });
            }

            // 2. B 组签纸 (中景/下沉景 - 默认初始非活跃层)
            for (let i = 0; i < SLIPS_PER_GROUP; i++) {
                const mat = basePaperMat.clone();
                mat.transparent = true;
                mat.opacity = 0.4; // 初始非活跃，半透明度

                const mesh = new THREE.Mesh(slipGeo, mat);

                const edgeColor = Math.random() > 0.4 ? COLORS.cardBorder : COLORS.venusRed;
                const edgeMat = new THREE.LineBasicMaterial({ 
                    color: edgeColor, 
                    transparent: true, 
                    opacity: 0.15 // 初始边框极高透明度
                });
                const wireframe = new THREE.LineSegments(edgesGeo, edgeMat);
                mesh.add(wireframe);

                const angle = (i / SLIPS_PER_GROUP) * Math.PI * 2 + (Math.PI / SLIPS_PER_GROUP); // 错开公转相位
                mesh.position.x = Math.cos(angle) * 2.1;
                mesh.position.z = Math.sin(angle) * 2.1;
                mesh.position.y = -1.5;

                mesh.rotation.x = -Math.PI / 2 + (Math.random() * 0.08 - 0.04);
                mesh.rotation.z = angle + Math.PI / 2;

                slipsGroupB.add(mesh);
                slipsB.push({
                    mesh: mesh,
                    wireframe: wireframe,
                    baseAngle: angle,
                    targetRadius: 2.1,
                    targetY: -1.5,
                    isResponding: false,
                    id: i
                });
            }

            // 3. 装饰性背景微型恋笺
            const bgSlipGeo = new THREE.PlaneGeometry(0.25, 0.9);
            const bgSlipMat = new THREE.MeshStandardMaterial({
                color: COLORS.slipBase,
                roughness: 0.9,
                transparent: true,
                opacity: 0.18,
                side: THREE.DoubleSide
            });
            for (let i = 0; i < 15; i++) {
                const mesh = new THREE.Mesh(bgSlipGeo, bgSlipMat);
                const radius = 5.0 + Math.random() * 3.5;
                const angle = Math.random() * Math.PI * 2;
                mesh.position.set(Math.cos(angle) * radius, -2.8 + Math.random() * 1.5, Math.sin(angle) * radius);
                mesh.rotation.set(-Math.PI / 2 + Math.random() * 0.15, 0, Math.random() * Math.PI * 2);
                bgSlipsGroup.add(mesh);
            }
        }

        const pools = {
            A: { 
                intro: [
                    "命运之针在此刻放慢了节拍，",
                    "风划过绯红的湖面却未惊起波澜，",
                    "红线的另一端今天沉入了一片幽谷，",
                    "夜空下的星宿此刻正缓缓闭上双眼，"
                ],
                body: [
                    "今天最适宜将炽热的情感内敛收存，留白往往比满溢更具张力。",
                    "切忌操之过急，或许彼此都需要一方私密而宁静的水域来安放灵魂。",
                    "不建议过早地揭开朦胧的轻纱，保持恰到好处的神秘与安静最是迷人。",
                    "将爱意在心底静静发酵，等待浓雾散去，那份心跳才愈发清晰珍贵。"
                ],
                badge: [
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 今日指引 · 宜静守本心 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 此时无声胜有声 · 宜自留呼吸 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 闭上双眼 · 静候红线微澜 ]</span>"
                ]
            },
            B: { 
                intro: [
                    "湖水正顺应着月光的引力静静流淌，",
                    "空气中充盈着一种似有若无的暧昧平衡，",
                    "维纳斯正端坐在命运之轮旁微笑着合眸，",
                    "两束灵魂的波长正在半透明的空气中自由交错，"
                ],
                body: [
                    "今天的最佳轨迹就是‘听凭水流’。无须设计任何对白，无须刻意安排偶遇。",
                    "让你们在各自的空间里自由舒展。当缘分成熟时，风自然会吹动你们的衣角。",
                    "学着享受这份未明身份的朦胧与摇摆，顺应水面每一次起落的温柔呼吸。",
                    "不需要过分用力地追问结果。将主动权轻巧地交回命运，静待墨水慢慢洇开。"
                ],
                badge: [
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 今日顺其自然 · 交托缘分指引 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 随风起舞 · 宜享受朦胧之美 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 无须强求航向 · 宜顺水流 ]</span>"
                ]
            },
            C: { 
                intro: [
                    "星轨正运行至温柔的交汇奇点，",
                    "水底的红线折射出微温而明亮的光晕，",
                    "命运正轻拍你的肩膀，给予你无限的灵感，",
                    "微凉的月光下，有缕温热的暗涌正悄然汇聚，"
                ],
                body: [
                    "今天是一个极其温和的推进时机。也许是一条若无其事的日常分享、或是一句柔软的问候。",
                    "主动去拨动那根若隐若现的红线。用最自然、最无压力的姿态向他/她递出一个微小的信号。",
                    "不要害怕打破平衡。今天你的一颦一笑都带有融化冰雪的魔力，勇敢迈出一小步吧。",
                    "适合轻叩他/她心房的门环。一句‘今天看到了好看的日落’就能带出无限的浪漫可能。"
                ],
                badge: [
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 今日适度主动 · 递出心动信号 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 勇敢试探 · 他/她也在等信号 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 轻轻拨动红线 · 心跳发生共鸣 ]</span>"
                ]
            },
            D: { 
                intro: [
                    "而此时此刻，对方的世界正处于一片无风的静海。",
                    "视线转到他/她那一端，情绪的波澜正悄然向内沉淀。",
                    "在宇宙遥远的回响中，他/她的星图呈现出温柔的静止。"
                ],
                body: [
                    "他/她今天或许正沉迷在生活的琐碎尘世、或处于自我的深度休憩中，表面看起来平淡如水，",
                    "暂时没有任何外露的波动。他/她需要一点静谧的私密空间去整理起伏的思绪，",
                    "情感被他/她妥帖地隐藏在不易察觉的心渊。虽然并未显现风浪，"
                ],
                outro: [
                    "但请相信，静水流深，这片沉静正是为了孕育下一次的心跳跃动。",
                    "不用为此感到气馁或焦虑，安静在神秘学里亦是一种无声的默契滋养。",
                    "对方或许正以一种沉稳的静默守护着你，不必言语，便是此时最温存的守望。"
                ],
                badge: [
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 对方状态 · 静水流深/蛰伏蓄势 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 对方心境 · 内敛沉淀/静候潮起 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 对方能量 · 宁静守望/无声陪伴 ]</span>"
                ]
            },
            E: { 
                intro: [
                    "维纳斯轻轻捕捉到了一丝甜美的叹息：对方今天想到了你。",
                    "命运的琴弦被悄然拨动，此时他/慢的脑海深处正落下了你的影子。",
                    "命运在今天产生了令人颤栗的隔空共鸣：他/她正为你微微失神。"
                ],
                body: [
                    "也许是在午后咖啡的香气里、或是看到了一片形状奇特的云，你的笑容突然闯入他/她的视线，",
                    "他/她今天在心底默默为你留出了一个极其柔软的位置，那份悸动如影随形，",
                    "在某个不经意的瞬间，关于你的一缕芬芳和记忆像温热的泉水一样漫过了他/慢的脑海，"
                ],
                outro: [
                    "那一刻，他/她的呼吸节奏确实因你而悄然漏了一拍。",
                    "这缕思念在风中穿梭，正跨越万水千山落回你的耳畔。",
                    "爱意的悸动信号已经发出，只等你在命运的这一端轻轻地收线回应。"
                ],
                badge: [
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 对方状态 · 思绪微澜/心有灵犀 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 对方心境 · 遥寄相思/情丝暗系 ]</span>",
                    "<span class='text-[0.75rem] font-semibold block text-center mt-3' style='color: var(--love-main); letter-spacing:0.2em;'>[ 对方能量 · 浪漫升温/情意绵绵 ]</span>"
                ]
            }
        };

        function createLoveParticles() {
            const particleCount = 100;
            const geom = new THREE.BufferGeometry();
            const pos = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            const toneRed = new THREE.Color(COLORS.venusRed);
            const tonePink = new THREE.Color(COLORS.pinkMist);

            for (let i = 0; i < particleCount; i++) {
                pos[i * 3] = (Math.random() - 0.5) * 12;
                pos[i * 3 + 1] = (Math.random() - 0.5) * 6 - 1; 
                pos[i * 3 + 2] = (Math.random() - 0.5) * 12;

                const mixColor = Math.random() > 0.4 ? tonePink : toneRed;
                colors[i * 3] = mixColor.r;
                colors[i * 3 + 1] = mixColor.g;
                colors[i * 3 + 2] = mixColor.b;
            }

            geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
            geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mat = new THREE.PointsMaterial({
                size: 0.08,
                vertexColors: true,
                transparent: true,
                opacity: 0.4,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            particles = new THREE.Points(geom, mat);
            scene.add(particles);
        }

        function calculateWaterStir(currX, currY) {
            const dx = currX - state.lastPointerX;
            const dy = currY - state.lastPointerY;
            const v = Math.sqrt(dx*dx + dy*dy);
            
            if (v > 18) {
                state.stirVelocity = Math.min(state.stirVelocity + 0.08, 1.9);
            }

            state.lastPointerX = currX;
            state.lastPointerY = currY;
        }

        function detectCircleGesture(point) {
            // 如果已经锁定了卡片，无条件屏蔽画圈检测，防止误触
            if (state.hoveredSlip && state.hoveredSlip.isResponding) {
                state.pointerHistory = []; 
                return;
            }

            const now = Date.now();
            state.pointerHistory.push({ x: point.x, y: point.y, time: now });
            
            // 1.2秒滑动窗口过滤
            state.pointerHistory = state.pointerHistory.filter(p => now - p.time < 1200);

            if (state.pointerHistory.length < 20) return;

            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            let sumX = 0, sumY = 0;
            
            for (let p of state.pointerHistory) {
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
                sumX += p.x;
                sumY += p.y;
            }

            const w = maxX - minX;
            const h = maxY - minY;

            // 扩大洗签所要求的最小圆圈半径，防止微小位移误判
            if (w < 0.28 || h < 0.28) return; 

            const aspect = w / h;
            if (aspect < 0.55 || aspect > 1.8) return;

            const cx = sumX / state.pointerHistory.length;
            const cy = sumY / state.pointerHistory.length;

            let distances = [];
            let sumDist = 0;
            for (let p of state.pointerHistory) {
                const d = Math.hypot(p.x - cx, p.y - cy);
                distances.push(d);
                sumDist += d;
            }
            const avgDist = sumDist / distances.length;
            let varianceSum = 0;
            for (let d of distances) {
                varianceSum += Math.pow(d - avgDist, 2);
            }
            const stdDev = Math.sqrt(varianceSum / distances.length);
            
            // 如果方差过大（不是正规圆周运动，比如杂乱无章的划线）直接予以排除
            if (stdDev / avgDist > 0.35) return;

            let lastAngle = null;
            let sweepAngle = 0;

            for (let p of state.pointerHistory) {
                const angle = Math.atan2(p.y - cy, p.x - cx);
                if (lastAngle !== null) {
                    let diff = angle - lastAngle;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    sweepAngle += diff;
                }
                lastAngle = angle;
            }

            // 需画圈达 320 度才判定洗签（一气呵成大动作）
            if (Math.abs(sweepAngle) > 5.6) {
                state.pointerHistory = [];
                triggerSwap();
            }
        }

        function triggerSwap() {
            if (state.isSwapping || state.phase === 'drawing' || state.phase === 'reading') return;
            state.isSwapping = true;

            stirIndicator.style.opacity = '1';
            setTimeout(() => { stirIndicator.style.opacity = '0'; }, 2000);

            gsap.to(state, { stirVelocity: 2.2, duration: 0.6, yoyo: true, repeat: 1 });

            const originalActive = state.activeLayer;
            const nextActive = originalActive === 'A' ? 'B' : 'A';
            
            const listGoingDown = originalActive === 'A' ? slipsA : slipsB;
            const listComingUp = originalActive === 'A' ? slipsB : slipsA;

            const duration = 2.0;
            const ease = "power2.inOut";

            // 1. 将原有的【前景】下沉变为【中景】
            listGoingDown.forEach(s => {
                s.targetRadius = 2.1;
                s.targetY = -1.5;
                s.baseAngle += Math.PI / 5; 

                gsap.to(s.mesh.position, {
                    y: s.targetY,
                    duration: duration,
                    ease: ease
                });

                gsap.to(s.mesh.material, {
                    opacity: 0.4,
                    transparent: true,
                    duration: duration,
                    ease: ease
                });

                gsap.to(s.wireframe.material, {
                    opacity: 0.15,
                    duration: duration
                });
            });

            // 2. 将原有的【中景】浮升变为【前景】
            listComingUp.forEach(s => {
                s.targetRadius = 3.8;
                s.targetY = 1.0;
                s.baseAngle -= Math.PI / 5; 

                gsap.to(s.mesh.position, {
                    y: s.targetY,
                    duration: duration,
                    ease: ease
                });

                gsap.to(s.mesh.material, {
                    opacity: 1.0,
                    transparent: false,
                    duration: duration,
                    ease: ease
                });

                gsap.to(s.wireframe.material, {
                    opacity: 0.45,
                    duration: duration
                });
            });

            setTimeout(() => {
                state.activeLayer = nextActive;
                state.isSwapping = false;
                clearHover();
            }, duration * 1000);
        }

        function onMouseMove(event) {
            if (state.phase !== 'idle') return;
            
            state.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
            state.pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // 让手势追踪圆环完美跟随鼠标移动
            fingerCursor.style.display = 'block';
            fingerCursor.style.left = `${event.clientX}px`;
            fingerCursor.style.top = `${event.clientY}px`;

            calculateWaterStir(event.clientX, event.clientY);
            detectCircleGesture({ x: state.pointer.x, y: state.pointer.y });
            checkInteraction(false);
        }

        function onMouseDown(event) {
            if (state.phase !== 'idle') return;
            state.isPinching = true;

            // 按下鼠标时，模拟“捏合并按压”的微动效，颜色变暗红且缩小
            fingerCursor.style.borderColor = '#8b1a1a';
            fingerCursor.style.transform = 'translate(-50%, -50%) scale(0.6)';

            // 只有当真正的点击/轻按事件触发时才强制抽卡，完美避免无捏合自动选定
            checkInteraction(true); 
        }

        function onMouseUp() {
            state.isPinching = false;
            fingerCursor.style.borderColor = 'var(--love-main)';
            fingerCursor.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        function onTouchStart(event) {
            if (event.touches.length === 0) return;
            state.isPinching = true;
            
            const touch = event.touches[0];
            state.pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
            state.pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            
            state.lastPointerX = touch.clientX;
            state.lastPointerY = touch.clientY;

            fingerCursor.style.display = 'block';
            fingerCursor.style.left = `${touch.clientX}px`;
            fingerCursor.style.top = `${touch.clientY}px`;
            fingerCursor.style.borderColor = '#8b1a1a';
            fingerCursor.style.transform = 'translate(-50%, -50%) scale(0.6)';
            
            checkInteraction(true); // 触控下点按立刻触发确认选签
        }

        function onTouchMove(event) {
            if (event.touches.length === 0) return;
            const touch = event.touches[0];
            
            state.pointer.x = (touch.clientX / window.innerWidth) * 2 - 1;
            state.pointer.y = -(touch.clientY / window.innerHeight) * 2 + 1;

            fingerCursor.style.display = 'block';
            fingerCursor.style.left = `${touch.clientX}px`;
            fingerCursor.style.top = `${touch.clientY}px`;

            calculateWaterStir(touch.clientX, touch.clientY);
            detectCircleGesture({ x: state.pointer.x, y: state.pointer.y });
            checkInteraction(false);
        }

        function onTouchEnd() {
            state.isPinching = false;
            fingerCursor.style.borderColor = 'var(--love-main)';
            fingerCursor.style.transform = 'translate(-50%, -50%) scale(1)';
        }

        function checkInteraction(forceDraw = false) {
            if (state.phase === 'drawing' || state.phase === 'reading' || state.isSwapping) return;

            raycaster.setFromCamera(state.pointer, camera);

            // 严格限定交互：只获取当前处于【活跃前景】的卡片组
            const activeGroup = state.activeLayer === 'A' ? slipsGroupA : slipsGroupB;
            const intersections = raycaster.intersectObjects(activeGroup.children);

            if (intersections.length > 0) {
                let hitMesh = intersections[0].object;
                if (hitMesh.type === 'LineSegments') hitMesh = hitMesh.parent;

                const targetList = state.activeLayer === 'A' ? slipsA : slipsB;
                const slipData = targetList.find(s => s.mesh === hitMesh);

                if (slipData && state.hoveredSlip !== slipData) {
                    clearHover();
                    state.hoveredSlip = slipData;
                    triggerHoverEffect(slipData);
                }

                // 只有当 forceDraw (即发生了鼠标Down或屏幕Touch) 为 true 时才选签
                if (forceDraw) {
                    drawSlip(state.hoveredSlip);
                }
            } else {
                clearHover();
            }
        }

        function triggerHoverEffect(slipData) {
            slipData.isResponding = true;
            document.body.style.cursor = 'pointer';

            gsap.to(slipData.wireframe.material, {
                opacity: 1.0,
                duration: 0.6
            });
            const crimsonColor = new THREE.Color(COLORS.venusRed);
            gsap.to(slipData.wireframe.material.color, {
                r: crimsonColor.r,
                g: crimsonColor.g,
                b: crimsonColor.b,
                duration: 0.6
            });

            gsap.to(slipData.mesh.rotation, {
                x: -Math.PI / 2.25, 
                duration: 0.8,
                ease: "power2.out"
            });

            gsap.to(slipData.mesh.material, {
                emissiveIntensity: 0.3,
                duration: 0.8
            });
        }

        function clearHover() {
            if (state.hoveredSlip) {
                const slipData = state.hoveredSlip;
                slipData.isResponding = false;
                document.body.style.cursor = 'default';

                gsap.to(slipData.wireframe.material, {
                    opacity: 0.45,
                    duration: 0.8
                });
                const cardBorderColor = new THREE.Color(COLORS.cardBorder);
                gsap.to(slipData.wireframe.material.color, {
                    r: cardBorderColor.r,
                    g: cardBorderColor.g,
                    b: cardBorderColor.b,
                    duration: 0.8
                });

                gsap.to(slipData.mesh.rotation, {
                    x: -Math.PI / 2,
                    duration: 0.8,
                    ease: "power2.out"
                });

                gsap.to(slipData.mesh.material, {
                    emissiveIntensity: 0.0,
                    duration: 0.8
                });

                state.hoveredSlip = null;
            }
        }

        function drawSlip(slipData) {
            state.phase = 'drawing';
            state.selectedSlip = slipData;
            fingerCursor.style.display = 'none';
            interactivePanel.classList.add('hidden');

            const mesh = slipData.mesh;
            
            if (state.activeLayer === 'A') {
                slipsGroupA.remove(mesh);
            } else {
                slipsGroupB.remove(mesh);
            }
            scene.add(mesh);

            const timeline = gsap.timeline({ onComplete: showEnvelopeResult });

            gsap.to(scene.fog, { density: 0.12, duration: 2.2 });
            slipsA.forEach(s => {
                if (s !== slipData) gsap.to(s.mesh.material, { opacity: 0.0, duration: 2.2 });
            });
            slipsB.forEach(s => {
                if (s !== slipData) gsap.to(s.mesh.material, { opacity: 0.0, duration: 2.2 });
            });

            timeline.to(mesh.position, {
                x: 0,
                y: 8.5, 
                z: 0,
                duration: 2.5,
                ease: "power3.inOut"
            }, 0);

            timeline.to(mesh.rotation, {
                x: -Math.PI / 2,
                y: 0,
                z: 0, 
                duration: 2.5,
                ease: "power3.inOut"
            }, 0);

            timeline.to(mesh.material, { emissiveIntensity: 0.8, duration: 2.0 }, 0.5);
            const loveRed = new THREE.Color(COLORS.venusRed);
            timeline.to(mesh.material.color, {
                r: loveRed.r, g: loveRed.g, b: loveRed.b,
                duration: 2.0
            }, 0.5);

            timeline.to(mesh.scale, {
                x: 6.8, y: 1.05,
                duration: 2.6,
                ease: "slow(0.7, 0.7, false)"
            }, 1.5);

            timeline.to(mesh.material, {
                opacity: 0.8,
                transparent: true,
                duration: 1.5
            }, 2.5);

            timeline.to(slipData.wireframe.material, { opacity: 0, duration: 1.0 }, 1.8);
        }

        function showEnvelopeResult() {
            state.phase = 'reading';
            
            gsap.to(resultCardContainer, {
                opacity: 1, pointerEvents: 'auto',
                duration: 2.2, ease: "power2.inOut"
            });

            drawCardiogramWave();
        }

        function drawCardiogramWave() {
            const canvas = document.getElementById('cardiogram-header');
            const ctx = canvas.getContext('2d');
            canvas.width = 120;
            canvas.height = 24;

            function draw() {
                if (state.phase !== 'reading') return;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.strokeStyle = 'rgba(139, 26, 26, 0.45)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                
                for (let i = 0; i < canvas.width; i++) {
                    let y = canvas.height / 2;
                    const pulseCenter = Math.sin(Date.now() * 0.005) * 15 + 60;
                    const distFromPulse = Math.abs(i - pulseCenter);
                    
                    if (distFromPulse < 12) {
                        y += Math.sin((i - pulseCenter) * 0.5) * 9 * Math.sin(Date.now() * 0.02);
                    } else {
                        y += Math.sin(i * 0.2 + Date.now() * 0.006) * 1.5;
                    }
                    
                    if (i === 0) ctx.moveTo(i, y);
                    else ctx.lineTo(i, y);
                }
                ctx.stroke();
                requestAnimationFrame(draw);
            }
            draw();
        }

        function breakWaxSeal() {
            waxSeal.classList.remove('heart-beat-centered');
            
            gsap.to(waxSeal, {
                scale: 0.1,
                opacity: 0,
                duration: 0.8,
                ease: "power2.in",
                onComplete: () => { waxSeal.style.display = 'none'; }
            });

            gsap.to(fortuneContent, {
                opacity: 1,
                filter: "blur(0px)",
                duration: 2.2,
                ease: "power1.inOut"
            });

            generateAestheticDivination();

            // 渐现“祈愿镌刻”写信入口：移除 hidden，使用 GSAP 进行丝滑的居中撑开过渡
            setTimeout(() => {
                showPrayerBtn.classList.remove('hidden');
                gsap.fromTo(showPrayerBtn, 
                    { opacity: 0, scale: 0.8 }, 
                    { opacity: 1, scale: 1, duration: 1.0, ease: "back.out(1.7)" }
                );
            }, 1500);
        }

        function generateAestheticDivination() {
            const rand1 = Math.random();
            let p1Group;
            if (rand1 < 0.15) p1Group = pools.A;
            else if (rand1 < 0.60) p1Group = pools.B;
            else p1Group = pools.C;

            const rand2 = Math.random();
            const p2Group = (rand2 < 0.50) ? pools.D : pools.E;

            const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

            // 构造第一段：指引文案 + 对应注释
            const part1Body = sample(p1Group.intro) + sample(p1Group.body);
            const part1Badge = sample(p1Group.badge);

            // 构造第二段：对方状态文案 + 对应注释
            const part2Body = sample(p2Group.intro) + sample(p2Group.body) + sample(p2Group.outro);
            const part2Badge = sample(p2Group.badge);

            // 将两段文字用高雅的分隔线隔开，并将各自的专属注释完美渲染在段落下方
            fortuneContent.innerHTML = `
                <div class="mb-4 text-left leading-relaxed">
                    “${part1Body}”
                    ${part1Badge}
                </div>
                <div class="border-t border-dashed border-[#8b1a1a]/15 my-4"></div>
                <div class="text-left leading-relaxed">
                    “${part2Body}”
                    ${part2Badge}
                </div>
            `;
            
            fortuneSub.innerText = "✦ 宿缘红线已解 ✦";
        }

        function submitPrayer() {
            const textValue = prayerTextInput.value.trim();

            if (typeof window.logUserInput === 'function') {
                window.logUserInput('lovesign_prayer', { text: textValue });
            }
            
            // 禁用按钮和输入框
            sendPrayerBtn.disabled = true;
            prayerTextInput.disabled = true;
            backToFrontBtn.style.display = 'none';

            // 触发 3D 端的空间回应：惊起巨大的金色红线粒子风暴，水波变红
            triggerAestheticSpaceResponse();

            // 1. 写信表单区如墨水遇水般晕开溶解
            gsap.to(prayerFormArea, {
                opacity: 0,
                y: -10,
                duration: 1.2,
                ease: "power2.inOut",
                onComplete: () => {
                    prayerFormArea.style.display = 'none';
                    
                    // 如果写了内容，显示定制祝福，否则直接显示经典祝福
                    if(textValue.length > 0) {
                        document.getElementById('prayer-status-text').innerHTML = `
                            “你的低语《${textValue.substring(0, 10)}${textValue.length > 10 ? '...' : ''}》已刻入红线。”<br>
                            命运之水流正温柔激荡，愿此番祈福终得良缘。
                        `;
                    }

                    // 2. 显示成功区域
                    prayerSuccessArea.classList.remove('hidden');
                    gsap.to(prayerSuccessArea, {
                        opacity: 1,
                        duration: 1.2,
                        ease: "power2.out"
                    });

                    // 3. 切换最后结束按钮
                    sendPrayerBtn.style.display = 'none';
                    finalCloseBtn.classList.remove('hidden');
                }
            });
        }

        function triggerAestheticSpaceResponse() {
            // 水流猛烈激荡
            gsap.to(state, { 
                stirVelocity: 3.5, 
                duration: 1.0, 
                onComplete: () => {
                    gsap.to(state, { stirVelocity: 0, duration: 4.0 });
                }
            });

            // 粒子瞬间加速并改变颜色：粒子呈现剧烈的耀眼金色和亮红混合升腾
            if (particles) {
                const geom = particles.geometry;
                const colors = geom.attributes.color.array;
                const pos = geom.attributes.position.array;

                const targetColor = new THREE.Color(0xd4af37); // 高贵纯金

                // 快速调整粒子位置和颜色
                for (let i = 0; i < colors.length / 3; i++) {
                    // 粒子聚集到中心再散开
                    pos[i * 3] *= 0.2;
                    pos[i * 3 + 2] *= 0.2;
                    pos[i * 3 + 1] = -3.5; // 从池底深处喷发

                    // 随几率变成亮金色
                    colors[i * 3] = targetColor.r;
                    colors[i * 3 + 1] = targetColor.g;
                    colors[i * 3 + 2] = targetColor.b;
                }
                geom.attributes.color.needsUpdate = true;
                geom.attributes.position.needsUpdate = true;
                
                // 暂时增大粒子大小，产生星芒爆散感
                gsap.to(particles.material, {
                    size: 0.18,
                    opacity: 0.9,
                    duration: 0.8,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => {
                        particles.material.size = 0.08;
                        particles.material.opacity = 0.4;
                    }
                });
            }

            // 水面亮起闪烁一秒暗红微光
            const burstColor = new THREE.Color(COLORS.venusRed);
            gsap.to(waterPlane.material.color, {
                r: burstColor.r, g: burstColor.g, b: burstColor.b,
                duration: 0.8,
                yoyo: true,
                repeat: 1
            });
        }

        function animate() {
            if (!state.isRunning) return;
            requestAnimationFrame(animate);

            const time = clock.getElapsedTime();

            state.stirVelocity *= 0.96;

            // 1. 让命运红线组根据水流速度做波澜波动
            if (state.weavingLines) {
                state.weavingLines.forEach(lineData => {
                    lineData.line.rotation.y = time * 0.05 * lineData.speed + (state.stirVelocity * 0.1);
                    lineData.line.position.y = -2.0 + Math.sin(time + lineData.randomPhase) * 0.08;
                });
            }

            // 2. 签纸公转与呼吸起伏
            const animateGroup = (list, isForeground) => {
                list.forEach(slipData => {
                    if (slipData === state.selectedSlip) return;

                    if (!slipData.isResponding) {
                        const speedBase = isForeground ? 0.08 : 0.045;
                        const actualSpeed = speedBase + (state.stirVelocity * 0.12);
                        slipData.baseAngle += actualSpeed * 0.035;

                        const r = slipData.targetRadius;
                        const destX = Math.cos(slipData.baseAngle) * r;
                        const destZ = Math.sin(slipData.baseAngle) * r;

                        const floatCycle = isForeground ? 1.2 : 0.75;
                        const floatAmp = isForeground ? 0.15 : 0.08;
                        const waveY = slipData.targetY + Math.sin(time * floatCycle + slipData.baseAngle) * floatAmp;

                        slipData.mesh.position.x += (destX - slipData.mesh.position.x) * 0.06;
                        slipData.mesh.position.z += (destZ - slipData.mesh.position.z) * 0.06;
                        slipData.mesh.position.y += (waveY - slipData.mesh.position.y) * 0.06;

                        const targetRotZ = slipData.baseAngle + Math.PI / 2;
                        const waveRotX = -Math.PI / 2 + Math.sin(time * 1.2 + slipData.baseAngle) * 0.04 * (1.0 + state.stirVelocity);

                        slipData.mesh.rotation.x += (waveRotX - slipData.mesh.rotation.x) * 0.06;
                        slipData.mesh.rotation.z += (targetRotZ - slipData.mesh.rotation.z) * 0.06;
                    }
                });
            };

            animateGroup(slipsA, state.activeLayer === 'A');
            animateGroup(slipsB, state.activeLayer === 'B');

            bgSlipsGroup.rotation.y = time * 0.01;

            // 3. 粒子运动漂流
            if (particles) {
                const positions = particles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += 0.002 + (state.stirVelocity * 0.005);
                    positions[i] += Math.sin(time * 0.8 + positions[i + 1]) * 0.003;

                    if (positions[i + 1] > 5) {
                        positions[i + 1] = -4; 
                    }
                }
                particles.geometry.attributes.position.needsUpdate = true;
                particles.rotation.y = time * 0.005;
            }

            renderer.render(scene, camera);
        }

        function onWindowResize() {
            if (camera && renderer) {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            }
        }

        // 开始按钮动作：触发高斯模糊过渡幕帘与3D渲染初始化
        startBtn.addEventListener('click', () => {
            // 1. 瞬间淡出首页文字
            gsap.to(startScreen, {
                opacity: 0,
                y: -15,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                    startScreen.classList.add('hidden');
                }
            });

            // 2. 将全屏高斯模糊幕帘拉起（淡入至最浓郁的唯美迷雾状态）
            transitionOverlay.classList.remove('opacity-0');
            transitionOverlay.classList.add('opacity-100');

            // 3. 在云雾深处静默初始化并生成 3D 命运之池，保证不出现任何画面撕裂和突兀感
            setTimeout(() => {
                initThreeJS();

                // 准备显示池底部的操作和指引
                interactivePanel.classList.remove('hidden');
                gsap.fromTo(interactivePanel, 
                    { opacity: 0, y: 15 }, 
                    { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }
                );

                state.isRunning = true;
                animate();

                // 4. 拨云见日：徐徐淡去高斯模糊幕帘，让水面在指尖柔和绽现
                setTimeout(() => {
                    transitionOverlay.classList.remove('opacity-100');
                    transitionOverlay.classList.add('opacity-0');
                }, 400);

            }, 800);
        });

        window.lovesignStop = function () {
            state.isRunning = false;
            if (fingerCursor) fingerCursor.style.display = 'none';
        };
})();
