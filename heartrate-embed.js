function hrGet(id) {
        const root = document.getElementById('page-heartrate');
        if (!root) return null;
        return root.querySelector('#' + id);
    }

    var HR_ELEMENT_KIND = { "水": "water", "火": "fire", "风": "wind", "土": "earth" };

    function hrElementOrb(element) {
        var kind = HR_ELEMENT_KIND[element] || "void";
        return '<span class="hr-element-orb hr-element-orb--' + kind + '" aria-hidden="true"></span>';
    }

    function hrRenderElementGlyphs(eleA, eleB) {
        return '<div class="hr-glyphs">' + hrElementOrb(eleA) +
            '<span class="hr-glyphs-x">×</span>' + hrElementOrb(eleB) + '</div>';
    }

    function hrSplitLines(text) {
        if (!text) return [];
        return String(text)
            .replace(/<[^>]+>/g, ' ')
            .split(/[。；;]\s*/)
            .map(function (s) { return s.trim(); })
            .filter(Boolean);
    }

    function setHrLines(id, text) {
        var el = hrGet(id);
        if (!el) return;
        var lines = hrSplitLines(text);
        if (!lines.length) {
            el.innerHTML = '';
            return;
        }
        el.innerHTML = lines.map(function (line) {
            return '<p class="hr-line">' + line + (line.match(/[。；]$/) ? '' : '。') + '</p>';
        }).join('');
        el.classList.add('hr-lines');
    }

    function hrRevealLines(containerId) {
        var root = hrGet(containerId);
        if (!root) return;
        var scope = root.classList.contains('hr-lines') ? root : root.querySelector('.hr-lines');
        if (!scope) scope = root;
        var lines = scope.querySelectorAll('.hr-line');
        lines.forEach(function (line, i) {
            line.classList.remove('hr-line-visible');
            line.style.animationDelay = (i * 0.14) + 's';
            requestAnimationFrame(function () {
                line.classList.add('hr-line-visible');
            });
        });
    }

    function hrRevealActScreen(screenId) {
        requestAnimationFrame(function () {
            var screen = hrGet(screenId);
            if (!screen) return;
            screen.querySelectorAll('.hr-lines').forEach(function (block) {
                block.querySelectorAll('.hr-line').forEach(function (line, i) {
                    line.classList.remove('hr-line-visible');
                    line.style.transitionDelay = (i * 0.14) + 's';
                    requestAnimationFrame(function () { line.classList.add('hr-line-visible'); });
                });
            });
        });
    }

    window.initHeartRatePage = function () {
        hrOnLoadDefaults();
    };

// 1. 16种 MBTI 恋爱模式数据库 (基于上传的精简版 MBTI PDF 抽取)
        const mbtiDb = {
            "ISTJ": {
                name: "ISTJ 物流师",
                core: "Si/Te/责任感/规则意识/稳定性",
                behavior: "慢热确认关系；以行动负责；稳定兑现承诺；避免情绪化表达；按计划经营关系",
                role: "执行者/稳定支撑者/规则维护者",
                trigger: "失控/不守规则/不可靠/计划被打乱",
                dynamics: "稳定结构型/长期承诺驱动"
            },
            "ISFJ": {
                name: "ISFJ 守护者",
                core: "Si/Fe/关怀/忠诚/细腻",
                behavior: "持续照顾对方；情绪 support 优先；压抑自我需求；关系稳定优先；默默付出",
                role: "照顾者/情感支撑者/维稳者",
                trigger: "被忽视/不被需要/情感冷淡/付出无回应",
                dynamics: "照顾型依附/稳定维系型关系"
            },
            "INFJ": {
                name: "INFJ 提倡者",
                core: "Ni/Fe/洞察力/理想主义/深度情感",
                behavior: "深度绑定关系；精神共鸣优先；慢热但强投入；隐性情绪表达；筛选式关系",
                role: "精神连接者/引导者/深度关系构建者",
                trigger: "背叛价值观/情感不真诚/表面关系/被误解",
                dynamics: "深度绑定型/精神共振型关系"
            },
            "INTJ": {
                name: "INTJ 建筑师",
                core: "Ni/Te/战略/独立/冷静",
                behavior: "慢热评估；目标导向关系；减少情绪干扰；明确边界；长期规划",
                role: "规划者/结构设计者/节奏控制者",
                trigger: "低效率/情绪干扰/不可预测/逻辑混乱",
                dynamics: "理性规划型/长期策略绑定"
            },
            "ISTP": {
                name: "ISTP 见赏家",
                core: "Ti/Se/独立/冷静/现实主义",
                behavior: "低频表达；行动代替语言；保持空间；临场互动；低绑定关系",
                role: "独立行动者/低依附伴侣/观察者",
                trigger: "被控制/情绪绑架/过度依赖/干涉自由",
                dynamics: "低依赖自由型/松散连接关系"
            },
            "ISFP": {
                name: "ISFP 探险家",
                core: "Fi/Se/感性/自由/审美",
                behavior: "感觉驱动选择；情绪互动自然；避免冲突；重体验；关系流动",
                role: "情绪体验者/美感伴侣/自由参与者",
                trigger: "压迫/控制/情感误解/审美冲突",
                dynamics: "感性流动型/体验驱动关系"
            },
            "INFP": {
                name: "INFP 调停者",
                core: "Fi/Ne/理想主义/情绪深度/敏感",
                behavior: "精神优先；理想化关系；慢热投入；内在独白; 回避冲突",
                role: "理想伴侣/情绪共鸣者/内在世界构建者",
                trigger: "价值否定/情感不真诚/被现实压迫/冲突压力",
                dynamics: "理想共振型/內在情感沉浸"
            },
            "INTP": {
                name: "INTP 思考者",
                core: "Ti/Ne/分析/理性/好奇",
                behavior: "低频表达；逻辑理解关系；观察型互动；兴趣驱动；忽冷忽热",
                role: "分析者/观察者/非情绪主导者",
                trigger: "逻辑错误/情绪压力/被控制/过度承诺",
                dynamics: "认知驱动型/间歇互动关系"
            },
            "ESTP": {
                name: "ESTP 企业家",
                core: "Se/Ti/行动/冒险/现实感",
                behavior: "快速推进；即时反馈；高互动；刺激驱动；不拖延",
                role: "推动者/行动核心/刺激源",
                trigger: "无聊/受限/控制/节奏过慢",
                dynamics: "即时反馈型/刺激驱动关系"
            },
            "ESFP": {
                name: "ESFP 表演者",
                core: "Se/Fi/外向/情绪表达/享乐",
                behavior: "高频互动；情绪外放；制造氛围；即时回应；娱乐化关系",
                role: "气氛制造者/情绪活跃者/点燃者",
                trigger: "被忽视/冷场/情绪压制/无趣关系",
                dynamics: "高情绪流动型/娱乐驱动关系"
            },
            "ENFP": {
                name: "ENFP 竞选者",
                core: "Ne/Fi/可能性/情绪热度/创造力",
                behavior: "快速投入；强情绪表达；探索关系可能性；高互动；波动大",
                role: "激发者/情绪扩散者/可能性创造者",
                trigger: "限制/冷却/不自由/否定可能性",
                dynamics: "高波动吸引型/可能性驱动关系"
            },
            "ENTP": {
                name: "ENTP 辩论家",
                core: "Ne/Ti/逻辑挑战/创新/变化",
                behavior: "辩论互动；探索关系；兴趣驱动；不稳定推进；刺激交流",
                role: "挑战者/刺激者/实验者",
                trigger: "思维限制/单调/情绪压制/无空间讨论",
                dynamics: "思维碰撞型/动态探索关系"
            },
            "ESFJ": {
                name: "ESFJ 执政官",
                core: "Fe/Si/社交协调/责任/关系维护",
                behavior: "主动维护关系；重反馈；情绪外向；社交投入；维稳关系",
                role: "关系管理者/情绪协调者/社交核心",
                trigger: "不被回应/被忽视/关系失衡/社交冲突",
                dynamics: "关系维护型/社交平衡型"
            },
            "ENFJ": {
                name: "ENFJ 教导者",
                core: "Fe/Ni/引导力/共情/组织力",
                behavior: "引导关系发展；情绪管理；关注成长；明确推进；高投入",
                role: "引导者/情感领导者/成长推动者",
                trigger: "不被需要/情绪冷淡/停滞关系/价值不被认可",
                dynamics: "成长驱动型/情绪引导关系"
            },
            "ESTJ": {
                name: "ESTJ 总经理",
                core: "Te/Si/结构/执行/控制力",
                behavior: "规划关系；强执行；重规则；直接表达；现实导向",
                role: "管理者/决策者/结构核心",
                trigger: "混乱/不可靠/不守规则/低效率",
                dynamics: "结构控制型/稳定执行关系"
            },
            "ENTJ": {
                name: "ENTJ 指挥官",
                core: "Te/Ni/战略/控制/目标导向",
                behavior: "目标驱动；主导节奏；高标准筛选；效率优先；情感克制",
                role: "主导者/战略控制者/长期规划核心",
                trigger: "失控/低效率/不成熟/权威挑战",
                dynamics: "权力结构型/长期目标绑定关系"
            }
        };

        // 2. 16种 LoveType 恋爱特质模型数据库
        const loveTypeDb = {
            "LAPE": {
                name: "LAPE 狮子队长",
                core: "Leadership / Adaptability / Protection / Empathy / 责任感强",
                behavior: "主动承担关系责任；优先保护对方；在关键节点推进关系；以行动支持伴侣；不强压但会接管局面",
                role: "领导者/保护者/支撑核心",
                trigger: "不被信任/伙伴受伤或被忽视/责任缺失/被依赖却无回馈",
                ideal: "FCRO (浪漫魔法师) / LCPO (推断兼容)",
                conflict: "FARE (能力重叠型竞争 / 低激情)",
                dynamics: "稳定支撑型/责任驱动型吸引"
            },
            "LAPO": {
                name: "LAPO 完美变色龙",
                core: "Leadership / Adaptability / Pliability / Openness / 多面性",
                behavior: "根据对象与场景切换行为风格；快速适应关系节奏；展示多种人格面向；以互动反馈调整自己；关系中动态变化",
                role: "适应者/变形者/社交整合者",
                trigger: "被限制/被固定定义/控制感过强/失去自由表达空间",
                ideal: "FCPO (爱情怪兽) / FAPE (良好兼容)",
                conflict: "LCRE (不可预测冲突 / 控制与反控制)",
                dynamics: "高变化吸引型/动态适配型关系"
            },
            "LARE": {
                name: "LARE 魅力平衡者",
                core: "Leadership / Acceptance / Realism / Emotional Intelligence / 平衡性",
                behavior: "维持关系均衡节奏；理性与情感并行处理；稳定推进关系；调和冲突；不过度依附或控制",
                role: "调停者/平衡者/稳定核心",
                trigger: "关系失衡/情绪失控/不真实表达/不尊重边界",
                ideal: "FCRE (聪明兔子) / LCPE、FCPO (良好兼容)",
                conflict: "FARO (低启动 + 疏离导致关系难开启)",
                dynamics: "低波动稳定型/渐进式建立关系"
            },
            "LARO": {
                name: "LARO 仰慕的前辈",
                core: "Leadership / Adult-like / Rational / Open-minded / 可靠性",
                behavior: "自然维持距离感；以理性方式处理关系；不主动制造氛围但提供安全感；在关键时刻给予支持；表达克制",
                role: "可靠前辈/稳定引导者/低干预支持者",
                trigger: "被误解为不可靠/失去尊重/被打破边界/情感被过度索取",
                ideal: "FCPE (忠犬八公) / FAPO / FAPE",
                conflict: "LARO (同型关系距离错位)",
                dynamics: "平行稳定型/低干预依附型"
            },
            "LCPE": {
                name: "LCPE 隐藏宝宝",
                core: "Lovable / Caring / Playful / Emotional / 反差柔软性",
                behavior: "表层社交友好；内在依赖与撒娇需求；情绪表达直接；容易建立亲密感；情感波动较明显",
                role: "被照顾者/情感依赖者/情绪核心点",
                trigger: "被忽视/不被宠爱/情感冷淡回应/安全感缺失",
                ideal: "FARO (神秘生物) / LARE (良好匹配) / LCPE (同型)",
                conflict: "FCPO (高刺激高冲突)",
                dynamics: "高情感依赖型/波动依恋型"
            },
            "LCPO": {
                name: "LCPO 主角",
                core: "Leadership / Social ability / Passion / Openness / 存在感强",
                behavior: "自然成为关系中心；主动推动互动节奏；情绪表达外放；吸引型社交行为；竞争与吸引并存",
                role: "中心角色/吸引者/推动者/舞台核心",
                trigger: "被忽视/失去关注焦点/被比较或竞争压制/情感不对等",
                ideal: "FAPO (恶魔与天使) / FARE / LAPE",
                conflict: "FCRO (高吸引 + 权力拉扯)",
                dynamics: "高吸引竞争型/舞台中心拉扯型"
            },
            "LCRE": {
                name: "LCRE 敏感探寻者 (隐藏宝宝)",
                core: "Leadership / Confident / Realistic / Emotional / 外放+内敏感",
                behavior: "外向积极互动；内在情绪敏感；私下需要独处恢复；表面自信推进关系；内心反复评估情感安全",
                role: "外向核心/内在依赖者/双层人格型参与者",
                trigger: "被误解为浅层/情感不被看见/失去空间/被强行理解或控制",
                ideal: "FARE (能干经理) / FCPE (相配)",
                conflict: "LAPO (不可预测适配冲突)",
                dynamics: "外热内收型/双层波动型关系"
            },
            "LCRO": {
                name: "LCRO 老板猫",
                core: "Leadership / Confidence / Realism / Openness / 独立性强",
                behavior: "坚持自我边界；主导关系方向；高自主决策；情感表达克制 but 强烈；冲突时不退让",
                role: "独立主导者/领地型控制者/强势个体",
                trigger: "被控制/被削弱自主权/不被尊重/权力被挑战",
                ideal: "FAPE (最后的爱人) / FCRE (良好) / FCPE (良好)",
                conflict: "LCRO (同型强冲突 / 权力对抗)",
                dynamics: "强对抗吸引型/权力拉扯型关系"
            },
            "FAPE": {
                name: "FAPE 最后的爱人",
                core: "Faithful / Accepting / Passionate / Empathetic / 极高忠诚度",
                behavior: "长期投入单一对象；持续情感给予；高接纳度；优先维系关系稳定；压抑冲突避免伤害",
                role: "奉献者/长期陪伴者/情感承载者",
                trigger: "被拒绝/被冷落/不被选择/关系不确定性",
                ideal: "LCRO (老板猫) / LAPO / LARO",
                conflict: "FAPE (同型过度包容导致沟通失真)",
                dynamics: "高忠诚稳定型/自我压抑维持型关系"
            },
            "FAPO": {
                name: "FAPO 小恶魔天使",
                core: "Flexibility / Attraction / Passion / Openness / 双重性格",
                behavior: "情绪表达极具反差；在温柔与挑逗间切换；主动制造吸引感；关系推进快；互动带不确定刺激感",
                role: "诱导者/情绪激活者/关系催化者",
                trigger: "被忽视魅力/无法控制吸引结果/情感反馈过低/失去互动张力",
                ideal: "LCPO (主角) / LARO (良好)",
                conflict: "FCRE (节奏错位 / 干扰型不匹配)",
                dynamics: "高刺激吸引型/反差拉扯型关系"
            },
            "FARE": {
                name: "FARE 能干管理者",
                core: "Flexibility / Adaptability / Responsibility / Empathy / 稳定协调力",
                behavior: "理性推进关系；优先处理现实问题；稳定回应情绪需求；避免极端冲突；持续维护关系结构",
                role: "协调者/管理者/稳定支撑者",
                trigger: "失去掌控/被误解为冷漠/责任被削弱/关系失衡",
                ideal: "LCRE (隐藏宝宝) / LCPO / FCRO",
                conflict: "LAPE (能力重叠但目标不同)",
                dynamics: "稳定管理型/功能协作型关系"
            },
            "FARO": {
                name: "FARO 神秘生物",
                core: "Free-thinking / Artistic / Intuitive / Originality / 高不可预测性",
                behavior: "行为不可预测；强调直觉与感觉；低规则互动；忽冷忽热；难以标准化关系推进",
                role: "观察者/神秘变量/非标准参与者",
                trigger: "被定义/被规则限制/被理解过度/失去自由表达空间",
                ideal: "FCRO (恋爱魔法师) / LAPO (良好)",
                conflict: "FARE (结构化管理冲突)",
                dynamics: "不可预测吸引型/非线性关系动力"
            },
            "FCPE": {
                name: "FCPE 忠犬八公",
                core: "Feeling-oriented / Caring / Flexibility / Extroversion / 忠诚度高",
                behavior: "一旦确认关系即长期投入；情感表达直接且持续；高度关注对方情绪；优先满足伴侣需求；依赖稳定情感反馈",
                role: "忠诚追随者/情感守护者/依附型支持者",
                trigger: "被忽视/情感不回应/不确定关系状态/被冷落",
                ideal: "LARO (仰慕的前辈) / LCRE / LCRO",
                conflict: "FCPE (同型情绪放大)",
                dynamics: "高依附忠诚型/情绪共振放大型关系"
            },
            "FCPO": {
                name: "FCPO 爱情怪兽",
                core: "Freedom / Passion / Playfulness / Openness / 高能量外放",
                behavior: "快速推进关系；强烈情绪表达；高频互动；制造刺激与新鲜感；主动掌控节奏",
                role: "驱动者/情绪发动机/关系冲击者",
                trigger: "被限制自由/互动冷淡/情感反馈不足/失去新鲜感",
                ideal: "LAPO (完美变色龙) / FARO / LARE",
                conflict: "LCPE (情绪依赖与自由冲突)",
                dynamics: "高强度推进型/刺激驱动型关系"
            },
            "FCRE": {
                name: "FCRE 聪明兔子",
                core: "Flexibility / Charm / Relationship-focused / Expressiveness / 策略性",
                behavior: "表面可爱亲和；实际高策略判断；快速分析关系局势；通过情绪表达影响对方；谨慎推进亲密关系",
                role: "策略观察者/情绪调节者/关系操控型温和者",
                trigger: "失去掌控感/被看穿策略/情绪失衡/关系不确定性过高",
                ideal: "LARE (魅力平衡者) / LCRO / FCRE",
                conflict: "FAPO (情绪扰动与节奏破坏)",
                dynamics: "策略平衡型/温和控制型关系"
            },
            "FCRO": {
                name: "FCRO 浪漫魔法师",
                core: "Freedom / Creativity / Romance / Openness / 想象力强",
                behavior: "以创意方式推进关系；制造浪漫与情绪仪式感；互动富有戏剧性；情感表达自由且直觉驱动；关系体验偏艺术化",
                role: "浪漫创造者/情绪魔法驱动者/吸引型表达者",
                trigger: "失去创造空间/关系变得单调/情感反馈不浪漫/被限制表达方式",
                ideal: "LAPE (狮子队长) / FARE (良好)",
                conflict: "LCPO (权力 / 吸引竞争型拉扯)",
                dynamics: "浪漫驱动型/高创造性吸引关系"
            }
        };

        const zodiacElements = {
            "巨蟹座": "水", "天蝎座": "水", "双鱼座": "水",
            "白羊座": "火", "狮子座": "火", "射手座": "火",
            "双子座": "风", "天秤座": "风", "水瓶座": "风",
            "金牛座": "土", "处女座": "土", "摩羯座": "土"
        };

        // 星象关系专属配对故事描述数据库 (act1Narratives)
        const act1Narratives = {
            "水-水": {
                atmosphere: "极高浓度的小宇宙潮汐。彼此之间没有物理屏障。一接触便如同两股水流自然交汇，充满极致的情感默契，无需言语即能察觉对方的情绪降雨。",
                rhythm: "几乎零时差的情感呼吸。但需警惕双方过于沉溺在彼此情绪漩涡中，一旦一方悲伤，另一方容易产生强烈的深海共振，引起难以自拔的感伤情绪。"
            },
            "火-火": {
                atmosphere: "白热化的引力磁场。双方初始便能产生爆破般的吸引力，热度攀升迅速。犹如在黑夜中点燃篝火，彼此直白、热烈、充满侵略性。",
                rhythm: "高强度、极频密的对撞节奏。双方一旦咬合便全速狂奔，在情绪好的时候如胶戏漆，一旦发生不合则会在极短时间内点燃边界，需要刻意维持安全的隔热带。"
            },
            "风-风": {
                atmosphere: "轻盈、自由而充满灵性呼吸的引力。像两道在云层穿梭的气流，被彼此的思维火花与独立氛围吸引。不会有压迫式的占有，氛围极度舒适自由。",
                rhythm: "高频互动但低度捆绑。前一秒在深夜促膝长谈宇宙哲理，后一秒则留给对方绝对的私密空间。虽然没有厚重的窒息感，但有时会因过于轻灵而显得缺乏沉淀。"
            },
            "土-土": {
                atmosphere: "稳固、踏实且高度契合的地面结构。两人像在坚实的地基上搭建浪漫大厦。相互评估非常务实，不轻易开启，但一旦开启便是以十年为单位的深耕。",
                rhythm: "低频且极为稳健的齿轮转动。生活和情感节奏如同老式钟摆，不会有瞬间爆发的激情，却拥有最持久的温度与无言的行动默契。"
            },
            "水-火": {
                atmosphere: "沸腾与升腾的极致矛盾。水试图包容、温润火，而火渴望以极高的热度蒸发水的矜持。这种水火交融的对立张力在初期会爆发出极强的宿命般宿醉感。",
                rhythm: "冷热交替的推拉节拍。火在前面狂热推进，水在后方温柔退让又隐性包裹，若契合得当会达成完美的水汽蒸腾，否则极易出现情绪过载或瞬间熄灭。"
            },
            "水-风": {
                atmosphere: "细腻的水滴随风飘散，呈现梦幻的雨雾氛围。风对水的深度感到好奇，水也沉迷于风无拘无束的灵动。双方有一层优雅的朦胧艺术感。",
                rhythm: "风起潮涌的不定节律。风的心思瞬息变幻，有时会让需要稳定情感反馈的水感到无法抓握；而水过于沉重细腻的内心，也可能被风误解为情绪裹挟。需要调频共进。"
            },
            "水-土": {
                atmosphere: "雨水浸润大地，泥土给水流以方向 and 河道。这是一组充满安全感与丰沃养分 get 到的经典组合。土为敏感的水提供最踏实的情感基石，水则滋润了土理性克制的外壳。",
                rhythm: "极为滋养的渐进式生长. 水在土的包容下能够肆意流淌情感，土在水的温柔照拂下也逐渐卸下防备。彼此是对方最可靠的避风港。"
            },
            "火-风": {
                atmosphere: "风助火势，一触即发。风源源不断地输送新奇想法与社交能量，让火的浪漫与斗志熊勋燃烧。彼此能迅速在社交和游乐中打成一片，极具动能。",
                rhythm: "高频率的化学反应链。彼此充满玩乐、聊天与共同冒险 of 驱动。不过在深夜安静下来时，如何将最初的狂欢热度沉淀为长期的精神契合，是需要跨越的门槛。"
            },
            "火-土": {
                atmosphere: "火山岩浆在大地之下涌动。土的稳定克制，能给高能量无处宣泄的火提供绝佳的安全着陆点；火的激情则能点燃土理性深处隐藏的野望与纯真。",
                rhythm: "互补但有延迟的咬合节拍. 火需要理解土在表达爱意时的慢热与严谨，土也需要学会在火表达情绪时不作冰冷的分析，而是先给予热烈的拥抱。"
            },
            "风-土": {
                atmosphere: "风拂过山岩，自由与坚守的遥遥致意。风被土的理性、规划感与靠谱深深吸引；土则在风的不设限想法中找到了打破沉闷世俗的解药。",
                rhythm: "理性碰撞的互动。由于两者都极具知性逻辑，日常交流顺畅。但由于土过于执着框架，风过于逃避规则，在遇到实际契约（如共同生活）时容易出现深层磨合。"
            }
        };

        // 数据存储对象
        const state = {
            A: { name: "", birthdate: "", zodiac: "", mbti: "", lovetype: "" },
            B: { name: "", birthdate: "", zodiac: "", mbti: "", lovetype: "" },
            calculatedData: null
        };

        // 安全更新 DOM 辅助函数，防止 null 引用错误
        function setTxt(id, value) {
            const el = hrGet(id);
            if (el) el.innerText = value;
        }

        function setInner(id, value) {
            const el = hrGet(id);
            if (el) el.innerHTML = value;
        }

        function setVal(id, value) {
            const el = hrGet(id);
            if (el) el.value = value;
        }

        // ================= CORE ALGORITHMS (底层心理学因缘建模) =================
        function compileRelationshipData() {
            const mA = mbtiDb[state.A.mbti] || mbtiDb["INFP"];
            const mB = mbtiDb[state.B.mbti] || mbtiDb["INTJ"];
            const lA = loveTypeDb[state.A.lovetype] || loveTypeDb["LCPE"];
            const lB = loveTypeDb[state.B.lovetype] || loveTypeDb["LAPE"];

            // 1. 星座层计算
            const eleA = zodiacElements[state.A.zodiac] || "水";
            const eleB = zodiacElements[state.B.zodiac] || "火";
            let combKey = `${eleA}-${eleB}`;
            let reverseKey = `${eleB}-${eleA}`;
            let act1Data = act1Narratives[combKey] || act1Narratives[reverseKey] || act1Narratives["水-土"];
            
            const act1Glyphs = hrRenderElementGlyphs(eleA, eleB);
            const act1Combination = `${eleA}象 &times; ${eleB}象`;
            const act1Lead = `${state.A.name} · ${state.A.zodiac} ｜ ${state.B.name} · ${state.B.zodiac}`;
            const act1Atmosphere = act1Data.atmosphere;
            const act1Rhythm = act1Data.rhythm;

            // 2. MBTI 认知结构计算
            let mbtiConflicts = "";
            if (state.A.mbti === state.B.mbti) {
                mbtiConflicts = `镜面共焦效应。由于双方同属 ${state.A.mbti}，沟通频段天然咬合。但也意味着你们拥有相同的认知死角，一旦爆发冲突极易陷入长久的冷处理或死结中。`;
            } else {
                let diffLetters = [];
                for(let i=0; i<4; i++) {
                    if(state.A.mbti[i] !== state.B.mbti[i]) diffLetters.push(state.A.mbti[i] + "/" + state.B.mbti[i]);
                }
                mbtiConflicts = `两性在 [ ${diffLetters.join(' | ')} ] 认知维度上的错频，往往在无声中埋下冲突引信。一方的触发红线往往是『${mA.trigger}』，而另一方则对『${mB.trigger}』极为敏锐，必须学会在彼此的对立边界小心退让。`;
            }

            // 3. LoveType 核心层计算
            let tensionValue = 5;
            let matchPercent = 75;

            if (lA.ideal.includes(state.B.lovetype) || lB.ideal.includes(state.A.lovetype)) {
                matchPercent += 15;
                tensionValue -= 2;
            }
            if (lA.conflict.includes(state.B.lovetype) || lB.conflict.includes(state.A.lovetype)) {
                matchPercent -= 15;
                tensionValue += 4;
            }
            if (state.A.lovetype === state.B.lovetype) {
                matchPercent -= 5;
                tensionValue += 1;
            }

            matchPercent = Math.max(60, Math.min(100, matchPercent));
            tensionValue = Math.max(1, Math.min(10, tensionValue));

            let pushPullText = `${state.A.name} · ${lA.name}，${lA.role}。${state.B.name} · ${lB.name}，${lB.role}。`;
            if (lA.role.includes("领") || lA.role.includes("主导") || lA.role.includes("管")) {
                pushPullText += `${state.A.name} 更常握住方向；${state.B.name} 以配合与包容回应。`;
            } else if (lB.role.includes("领") || lB.role.includes("主导") || lB.role.includes("管")) {
                pushPullText += `${state.B.name} 在关键节点提供安定；${state.A.name} 以柔软依恋回应。`;
            } else {
                pushPullText += `双方无强硬主控，以温和默契在各自情绪安全岛中互补。`;
            }
            pushPullText += `留意底线：${state.A.name} 易因「${lA.trigger}」退缩；${state.B.name} 则对「${lB.trigger}」格外敏感。`;

            // 4. 生日修正
            const dateA = new Date(state.A.birthdate || "2000-11-03");
            const dateB = new Date(state.B.birthdate || "1998-08-08");
            const monthA = dateA.getMonth() + 1;
            const monthB = dateB.getMonth() + 1;
            const dayA = dateA.getDate();
            const dayB = dateB.getDate();
            
            let fateTitle = "时空遥相呼应";
            let fateDesc = "双方在广袤的时间线上拥有独立的生命节律，你们的相遇打破了原本平行的轨道，在因缘际会下爆发出火花。这是一种跨越时间轴的引力叠加。";

            if (monthA === monthB) {
                fateTitle = "同月宿缘 (MONTHLY SYNCHRONY)";
                fateDesc = `极其美妙的同月巧合！在星盘能量场中，诞生于相同月份（${monthA}月）意味着你们共同呼吸着同一个季节的情绪离子。这在相遇之初就会提供一股极其天然、宛如重逢般的熟悉感。`;
                matchPercent += 3;
            } else if (Math.abs(monthA - monthB) === 6) {
                fateTitle = "对角互补 (SEASON OPPOSITIONS)";
                fateDesc = `你们出生在刚好相反的对半季节。一个在生机盎然中成长，另一个在凛冽克制里诞生。这种温度的极端反差带来了最致命的“对角吸引”，在潜意识中引导着双方无尽的靠近。`;
                matchPercent += 2;
            } else if (Math.abs(monthA - monthB) <= 2) {
                fateTitle = "季节同频 (SEASONAL INTERTWINE)";
                fateDesc = `你们同属于相近的季节（A:${monthA}月 / B:${monthB}月）。生命最初对自然的感知极其接近，这决定了你们在日常节奏、周末精力分配乃至作息偏好上，天生具备很强的协调性。`;
                matchPercent += 1;
            }
            
            if (Math.abs(dayA - dayB) <= 3 && monthA === monthB) {
                fateTitle = "灵魂双生子星";
                fateDesc += " 日期跨度在 3 天之内！这是一种在概率学和共时性层面具有宿命感的高度重合，生命中那些重大转折事件与情绪周期的波动重合率惊人。";
                matchPercent = Math.min(100, Math.max(60, matchPercent + 4));
            }

            matchPercent = Math.min(100, Math.max(60, matchPercent));

            // 5. 最终结算
            let finalTitle = "高吸引拉扯型关系";
            let finalSummary = "";

            if (matchPercent >= 90) {
                finalTitle = "灵魂引力 &bull; 终极共鸣契合体";
                finalSummary = `“这是一场在计算模型中近乎宿命的完美相遇。从《${lA.name}》与《${lB.name}》的深度宿缘，到四象元素的美妙呼应，你们不仅能在日常中达成无声的互补，更在精神极高处拥有相同的价值观，宛如在喧嚣世间找到了彼此最坚实的归宿。”`;
            } else if (matchPercent >= 80) {
                finalTitle = "稳定高阶互补型亲密关系";
                finalSummary = `“【${state.A.name}】的柔软依附与【${state.B.name}】的沉稳负责形成了极其稳和、安全的因缘网络。尽管由于MBTI认知带来的差异偶尔会有小小的沟通错位，打不开真实的爱意通路，但总能通过强大的LoveType底层张力得到包容与化解。”`;
            } else if (matchPercent >= 70) {
                finalTitle = "双向摸索与平衡拉扯型关系";
                finalSummary = `“一方的敏感温和，正遇上另一方的独立理智。你们在频繁的相互试探中确立对方在心里的专属底线。这种略带克制却充满吸引张力的推拉互动，使你们在情感深处更懂得呵护对方的脆弱。”`;
            } else {
                finalTitle = "强对抗吸引与独立探索型关系";
                finalSummary = `“你们是极具个性的两个独立行星。由于个性与防御姿态都极强，这注定是一场需要细致打磨的高难度关系。但在越过对立边界后，彼此将成为对方最坚硬的后盾与独一无二的情感解药。”`;
            }

            // 存储缓存
            state.calculatedData = {
                matchPercent, tensionValue,
                act1Glyphs, act1Combination, act1Lead, act1Atmosphere, act1Rhythm,
                mA, mB, mbtiConflicts,
                lA, lB, pushPullText,
                fateTitle, monthA, dayA, monthB, dayB, fateDesc,
                finalTitle, finalSummary
            };

            // 提前填充 ACT 展示，为切换做好准备
            setInner('act1-glyphs', act1Glyphs);
            setInner('act1-combination', act1Combination);
            setTxt('act1-lead', act1Lead);
            setHrLines('act1-atmosphere', act1Atmosphere);
            setHrLines('act1-rhythm', act1Rhythm);

            // ACT 2
            setTxt('act2-mbtiA-name', mA.name);
            setTxt('act2-mbtiA-core', mA.core);
            setHrLines('act2-mbtiA-desc', mA.behavior);
            setTxt('act2-mbtiB-name', mB.name);
            setTxt('act2-mbtiB-core', mB.core);
            setHrLines('act2-mbtiB-desc', mB.behavior);
            setHrLines('act2-conflict', mbtiConflicts);

            // ACT 3
            setTxt('act3-dynamic-pattern', lA.dynamics);
            setTxt('tension-value', `${tensionValue}/10`);
            
            const tensionBar = hrGet('tension-bar');
            if (tensionBar) {
                tensionBar.innerHTML = `<div class="bg-venus-red h-full animate-pulse" style="width: ${tensionValue*10}%"></div>`;
            }
            
            setTxt('act3-roleA-title', lA.name);
            setTxt('act3-roleA-trait', lA.core);
            setHrLines('act3-roleA-behavior', lA.behavior);
            setTxt('act3-roleB-title', lB.name);
            setTxt('act3-roleB-trait', lB.core);
            setHrLines('act3-roleB-behavior', lB.behavior);
            setTxt('act3-triggerA', lA.trigger);
            setTxt('act3-triggerB', lB.trigger || "责任缺失/被依赖无回馈");
            setHrLines('act3-push-pull', pushPullText);

            // ACT 4
            setTxt('act4-fate-title', fateTitle);
            setInner('act4-fate-dates', `${monthA}.${dayA} &times; ${monthB}.${dayB}`);
            setHrLines('act4-fate-desc', fateDesc);
        }

        function hrOnLoadDefaults() {
            // 默认参数初始化 A/B
            setVal('birthdateA', "2000-11-03");
            setVal('birthdateB', "1998-08-08");
            setVal('nameA', "林深");
            setVal('nameB', "简意");
            
            // 初始全局红线绘制，加入安全检查
            const globalRedLine = hrGet('global-red-line');
            if (globalRedLine) {
                globalRedLine.classList.add('animate-draw-line');
            }
        };

        // 切换屏幕的方法，利用高斯模糊显影与过渡样式，同时加入极其安全的空值保护与阶段渲染
        function switchScreen(fromId, toId) {
            const fromEl = hrGet(fromId);
            const toEl = hrGet(toId);

            if (fromEl) {
                fromEl.classList.add('blur-phase');
            }
            setTimeout(() => {
                if (fromEl) {
                    fromEl.classList.add('hidden');
                }
                if (toEl) {
                    toEl.classList.remove('hidden');
                    toEl.classList.add('blur-phase');
                    // 强制重绘
                    toEl.offsetHeight; 
                    toEl.classList.remove('blur-phase');
                    hrRevealActScreen(toId);
                }
            }, 600); // 增加过渡时间让显影细节更柔和
        }

        // ================= FLOW CONTROLLERS =================

        // 封面进入主填报页面
        function initializeEngine() {
            // 首先通过渐隐封面
            const preludeEl = hrGet('screen-prelude');
            if (preludeEl) {
                preludeEl.classList.add('blur-phase');
            }
            
            setTimeout(() => {
                if (preludeEl) preludeEl.classList.add('hidden');
                
                // 展现全局主 Header
                const mainHeader = hrGet('main-header');
                if (mainHeader) {
                    mainHeader.classList.remove('hidden');
                    mainHeader.offsetHeight; // 强制重绘
                    mainHeader.classList.remove('opacity-0');
                    mainHeader.classList.add('opacity-100');
                }

                // 展现同屏填报区
                const inputBothEl = hrGet('screen-input-both');
                if (inputBothEl) {
                    inputBothEl.classList.remove('hidden');
                    inputBothEl.offsetHeight;
                    inputBothEl.classList.remove('blur-phase');
                }
            }, 600);
        }

        function loadSample(type) {
            if (type === 1) {
                setVal('nameA', "沐沐");
                setVal('birthdateA', "2002-11-03");
                setVal('zodiacA', "天蝎座");
                setVal('mbtiA', "INFP");
                setVal('lovetypeA', "LCPE"); // 隐藏宝宝

                setVal('nameB', "烈阳");
                setVal('birthdateB', "1999-07-28");
                setVal('zodiacB', "狮子座");
                setVal('mbtiB', "ENTJ");
                setVal('lovetypeB', "LAPE"); // 狮子队长
            } else if (type === 2) {
                setVal('nameA', "羽白");
                setVal('birthdateA', "1997-05-14");
                setVal('zodiacA', "金牛座");
                setVal('mbtiA', "INTJ");
                setVal('lovetypeA', "FCRE"); // 聪明兔子

                setVal('nameB', "溪流");
                setVal('birthdateB', "1996-10-02");
                setVal('zodiacB', "天秤座");
                setVal('mbtiB', "INFJ");
                setVal('lovetypeB', "LARE"); // 魅力平衡者
            } else if (type === 3) {
                setVal('nameA', "极客阿风");
                setVal('birthdateA', "2001-02-14");
                setVal('zodiacA', "水瓶座");
                setVal('mbtiA', "ENTP");
                setVal('lovetypeA', "LAPO"); // 完美变色龙

                setVal('nameB', "火花");
                setVal('birthdateB', "2000-12-15");
                setVal('zodiacB', "射手座");
                setVal('mbtiB', "ENFP");
                setVal('lovetypeB', "FCPO"); // 爱情怪兽
            }
        }

        function submitProfiles() {
            // 读取 A 资料
            const elNameA = hrGet('nameA');
            const elBirthdateA = hrGet('birthdateA');
            const elZodiacA = hrGet('zodiacA');
            const elMbtiA = hrGet('mbtiA');
            const elLovetypeA = hrGet('lovetypeA');

            state.A.name = (elNameA ? elNameA.value : "") || "A方";
            state.A.birthdate = elBirthdateA ? elBirthdateA.value : "2000-11-03";
            state.A.zodiac = elZodiacA ? elZodiacA.value : "天蝎座";
            state.A.mbti = elMbtiA ? elMbtiA.value : "INFP";
            state.A.lovetype = elLovetypeA ? elLovetypeA.value : "LCPE";

            // 读取 B 资料
            const elNameB = hrGet('nameB');
            const elBirthdateB = hrGet('birthdateB');
            const elZodiacB = hrGet('zodiacB');
            const elMbtiB = hrGet('mbtiB');
            const elLovetypeB = hrGet('lovetypeB');

            state.B.name = (elNameB ? elNameB.value : "") || "B方";
            state.B.birthdate = elBirthdateB ? elBirthdateB.value : "1998-08-08";
            state.B.zodiac = elZodiacB ? elZodiacB.value : "狮子座";
            state.B.mbti = elMbtiB ? elMbtiB.value : "INTJ";
            state.B.lovetype = elLovetypeB ? elLovetypeB.value : "LAPE";

            if (typeof window.logUserInput === 'function') {
                window.logUserInput('heartrate_profiles', {
                    A: { name: state.A.name, birthdate: state.A.birthdate, zodiac: state.A.zodiac, mbti: state.A.mbti, lovetype: state.A.lovetype },
                    B: { name: state.B.name, birthdate: state.B.birthdate, zodiac: state.B.zodiac, mbti: state.B.mbti, lovetype: state.B.lovetype }
                });
            }

            switchScreen('screen-input-both', 'screen-transit');
        }

        // 送出请求过渡
        function deliverRequest() {
            if (typeof window.logUserInput === 'function') {
                window.logUserInput('heartrate_deliver', {
                    A: { name: state.A.name, birthdate: state.A.birthdate, zodiac: state.A.zodiac, mbti: state.A.mbti, lovetype: state.A.lovetype },
                    B: { name: state.B.name, birthdate: state.B.birthdate, zodiac: state.B.zodiac, mbti: state.B.mbti, lovetype: state.B.lovetype }
                });
            }
            // 先显示Loader进行命运渲染计算
            const transitEl = hrGet('screen-transit');
            if (transitEl) {
                transitEl.classList.add('blur-phase');
            }
            
            setTimeout(() => {
                if (transitEl) transitEl.classList.add('hidden');
                const loaderEl = hrGet('loader');
                if (loaderEl) {
                    loaderEl.classList.remove('hidden');
                }
                
                // 进行算法核心构建并缓存数据
                compileRelationshipData();

                setTimeout(() => {
                    if (loaderEl) {
                        loaderEl.classList.add('hidden');
                    }
                    const envelopeEl = hrGet('screen-envelope');
                    if (envelopeEl) {
                        envelopeEl.classList.remove('hidden');
                        envelopeEl.offsetHeight;
                        envelopeEl.classList.remove('blur-phase');
                    }
                }, 1600); // 仪式化延迟
            }, 400);
        }

        // 解封蜡封信件，缓缓过渡到奶油色信笺背景阶段 (Color Phase Shift)
        function meltSealAndOpen() {
            const waxSeal = hrGet('wax-seal');
            const sealThread = hrGet('seal-thread');
            const sealThread2 = hrGet('seal-thread-2');
            const envelopeEl = hrGet('screen-envelope');

            // 熔断与火漆崩碎效果
            if (waxSeal) waxSeal.classList.add('melt-seal-anim');
            if (sealThread) sealThread.classList.add('line-fade');
            if (sealThread2) sealThread2.classList.add('line-fade');

            setTimeout(() => {
                if (envelopeEl) {
                    envelopeEl.classList.add('letter-open');
                    envelopeEl.style.opacity = '0';
                    envelopeEl.style.transform = 'translateY(-60px) scale(0.95)';
                }
                
                setTimeout(() => {
                    if (envelopeEl) envelopeEl.classList.add('hidden');
                    
                    // 进入奶油色阶段，重塑页面色调 (Venus Color Palette)
                    document.body.classList.add('cream-phase');
                    
                    // 更新全局标题颜色以适应奶油色阶段
                    const ritualHeader = hrGet('header-ritual');
                    if (ritualHeader) {
                        ritualHeader.className = "text-[10px] uppercase tracking-[0.55em] text-venus-deep font-serif block mb-2 transition-colors duration-1000";
                    }
                    const headerTitle = hrGet('header-title');
                    if (headerTitle) {
                        headerTitle.className = "font-serif text-2xl md:text-3xl font-bold tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-venus-deep via-venus-red to-venus-deep transition-all duration-1000";
                    }

                    // 修改卡片和文本，使其在奶油信笺纸质感下优雅排版
                    adjustAestheticToCreamPhase();

                    // 直接解密开启 第一页：星座层
                    const act1El = hrGet('screen-act1');
                    if (act1El) {
                        act1El.classList.remove('hidden');
                        act1El.offsetHeight;
                        act1El.classList.remove('blur-phase');
                        hrRevealActScreen('screen-act1');
                    }
                }, 600);
            }, 800);
        }

        // 奶油色信笺阶段下各个面板的美学细节微调
        function adjustAestheticToCreamPhase() {
            // 对各个卡片实施轻拟物墨迹化改造
            const cardIds = [
                'screen-act1', 'screen-act2', 'screen-act3', 'screen-act4',
                'act1-badge-card', 'act2-card-A', 'act2-card-B', 'act2-conflict-card',
                'act3-dyn-card-1', 'act3-dyn-card-2', 'act3-role-card-A', 'act3-role-card-B',
                'act3-trigger-card', 'act3-narrative-card', 'act4-node-card'
            ];
            
            cardIds.forEach(id => {
                const el = hrGet(id);
                if (el) {
                    // 去除原夜空暗底，应用拟物条纹与暗褐色细线边框
                    el.style.backgroundColor = 'rgba(253, 251, 247, 0.95)';
                    el.style.color = '#2C1B1F';
                    el.style.borderColor = 'rgba(139, 92, 26, 0.28)';
                    el.classList.add('lined-paper'); // 赋予横格纸质感
                }
            });

            // 文字墨汁呢喃感渲染
            const textLabels = [
                'act1-title-1', 'act1-title-2', 'act2-label-A', 'act2-label-B',
                'act3-dyn-label-1', 'act3-dyn-label-2', 'act3-trigger-title',
                'act3-narrative-title', 'act4-node-label', 'act4-text-title'
            ];
            textLabels.forEach(id => {
                const el = hrGet(id);
                if (el) {
                    el.style.color = '#4C0519'; // 墨水恋色
                }
            });
        }

        // ================= STEP PROGESSION (Cards) =================

        function goToAct2() {
            switchScreen('screen-act1', 'screen-act2');
        }

        function goToAct3() {
            switchScreen('screen-act2', 'screen-act3');
        }

        function goToAct4() {
            switchScreen('screen-act3', 'screen-act4');
        }

        function goToFinal() {
            switchScreen('screen-act4', 'screen-final');
            // 延迟1.2秒启动命运爱心蓄能显影动画 (The final climax)
            setTimeout(() => {
                triggerFinalResonanceAnimation();
            }, 1200);
        }

        // ================= FINAL RESONANCE RHYTHM ANIMATOR =================

        function triggerFinalResonanceAnimation() {
            const data = state.calculatedData;
            if(!data) return;

            const ringStop = hrGet('grad-stop');
            const ringEmpty = hrGet('grad-empty');
            const display = hrGet('display-percent');
            const target = data.matchPercent;

            let current = 0; // 强制从0%开始

            // 核心动画节奏：
            // 0% -> 60%: 速度极快（充能）
            // 60% -> 75%: 减速缓冲
            // 75% -> 88%: 缓慢攀升，表现艰难
            // 88% -> 最终值: 极慢并伴随悬念停顿，最后锁定
            function step() {
                let delay = 15;

                if (current < 60) {
                    // 0% 到 60%：极速充能
                    delay = 10;
                } else if (current >= 60 && current < 75) {
                    // 60% 到 75%：骤然减速缓冲
                    delay = 45;
                } else if (current >= 75 && current < 88) {
                    // 75% 到 88%：阻尼感明显上升，缓慢艰难
                    delay = 80 + (current - 75) * 12;
                } else if (current >= 88 && current < target) {
                    // 88% 临近终点处：进行具有宿命感的深呼吸大停顿
                    if (current === 89 || current === target - 2) {
                        delay = 1200; // 悬念深呼吸停顿 1.2秒
                    } else {
                        delay = 400; // 步步为营的挪动
                    }
                }

                setTimeout(() => {
                    // 渐变填充爱心：底色向上蔓延
                    const offsetVal = current + "%";
                    if (ringStop) ringStop.setAttribute('offset', offsetVal);
                    if (ringEmpty) ringEmpty.setAttribute('offset', offsetVal);
                    
                    if (display) display.innerText = `${current}%`;

                    if (current < target) {
                        current++;
                        step();
                    } else {
                        // 锁定制动！触发强力双重脉动与样式改变
                        const heartSvg = hrGet('final-heart');
                        if (heartSvg) heartSvg.className = "w-full h-full filter drop-shadow-[0_0_20px_rgba(179,36,60,0.6)] double-heart-beat";
                        
                        // 文字转换为古典书写深墨色
                        if (display) display.className = "font-serif text-4xl font-semibold text-venus-deep select-none tracking-widest";
                        
                        const subEl = hrGet('display-percent-sub');
                        if (subEl) subEl.className = "text-[9px] text-venus-red/60 tracking-[0.25em] uppercase font-serif block mt-1";
                        
                        const headEl = hrGet('final-header-text');
                        if (headEl) headEl.className = "text-[10px] uppercase tracking-[0.35em] text-venus-deep/60 font-serif block";

                        // 背景纸质感完全晕染
                        const parchmentEl = hrGet('final-parchment');
                        if (parchmentEl) {
                            parchmentEl.classList.remove('opacity-0');
                            parchmentEl.classList.add('opacity-100');
                        }

                        // 填充最终结果
                        setInner('relationship-title', data.finalTitle);
                        setHrLines('relationship-summary', data.finalSummary.replace(/^[“"]|[”"]$/g, ''));
                        hrRevealLines('relationship-summary');
                        setTxt('result-badgeA', `${state.A.name} [${data.lA.name}]`);
                        setTxt('result-badgeB', `${state.B.name} [${data.lB.name}]`);

                        // 优雅显现结果卡片
                        setTimeout(() => {
                            const detailsEl = hrGet('final-result-details');
                            if (detailsEl) {
                                detailsEl.classList.remove('opacity-0');
                                detailsEl.classList.add('opacity-100');
                            }
                            
                            const actionsEl = hrGet('final-actions');
                            if (actionsEl) {
                                actionsEl.classList.remove('opacity-0');
                                actionsEl.classList.add('opacity-100');
                            }
                        }, 500);
                    }
                }, delay);
            }

            step();
        }

        function resetEngine() {
            // 重置状态与视图
            state.A = { name: "", birthdate: "", zodiac: "", mbti: "", lovetype: "" };
            state.B = { name: "", birthdate: "", zodiac: "", mbti: "", lovetype: "" };
            state.calculatedData = null;

            // 移除奶油信笺阶段样式，还原到虚空底色
            document.body.classList.remove('cream-phase');
            
            // 还原所有卡片样式
            const cardIds = [
                'screen-act1', 'screen-act2', 'screen-act3', 'screen-act4',
                'act1-badge-card', 'act2-card-A', 'act2-card-B', 'act2-conflict-card',
                'act3-dyn-card-1', 'act3-dyn-card-2', 'act3-role-card-A', 'act3-role-card-B',
                'act3-trigger-card', 'act3-narrative-card', 'act4-node-card'
            ];
            cardIds.forEach(id => {
                const el = hrGet(id);
                if (el) {
                    el.style.backgroundColor = '';
                    el.style.color = '';
                    el.style.borderColor = '';
                    el.classList.remove('lined-paper');
                }
            });

            // 还原标签样式
            const textLabels = [
                'act1-title-1', 'act1-title-2', 'act2-label-A', 'act2-label-B',
                'act3-dyn-label-1', 'act3-dyn-label-2', 'act3-trigger-title',
                'act3-narrative-title', 'act4-node-label', 'act4-text-title'
            ];
            textLabels.forEach(id => {
                const el = hrGet(id);
                if (el) {
                    el.style.color = '';
                }
            });

            // 隐藏全局主 Header 并恢复封面标题默认样式
            const mainHeader = hrGet('main-header');
            if (mainHeader) {
                mainHeader.classList.add('opacity-0');
                mainHeader.classList.add('hidden');
            }

            const ritualHeader = hrGet('header-ritual');
            if (ritualHeader) {
                ritualHeader.className = "text-[10px] uppercase tracking-[0.55em] text-venus-gold font-serif block mb-2 transition-colors duration-1000";
            }
            const headerTitle = hrGet('header-title');
            if (headerTitle) {
                headerTitle.className = "font-serif text-2xl md:text-3xl font-bold tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-venus-cream via-venus-rose to-venus-gold transition-all duration-1000";
            }

            // 复原输入框默认值
            setVal('birthdateA', "2000-11-03");
            setVal('birthdateB', "1998-08-08");
            setVal('nameA', "林深");
            setVal('nameB', "简意");

            // 复原爱心样式与百分比
            const ringStop = hrGet('grad-stop');
            const ringEmpty = hrGet('grad-empty');
            if (ringStop) ringStop.setAttribute('offset', '0%');
            if (ringEmpty) ringEmpty.setAttribute('offset', '0%');
            
            setTxt('display-percent', "0%");
            
            const display = hrGet('display-percent');
            if (display) display.className = "font-serif text-3xl md:text-4xl font-black text-venus-cream select-none transition-colors duration-1000 tracking-widest";
            
            const subEl = hrGet('display-percent-sub');
            if (subEl) subEl.className = "text-[8px] text-venus-cream/40 tracking-[0.25em] uppercase font-serif";
            
            const headEl = hrGet('final-header-text');
            if (headEl) headEl.className = "text-[10px] uppercase tracking-[0.35em] text-venus-rose/50 font-serif block";
            
            const heartSvg = hrGet('final-heart');
            if (heartSvg) heartSvg.className = "w-full h-full filter drop-shadow-[0_0_8px_rgba(161,29,51,0.3)]";
            
            const parchmentEl = hrGet('final-parchment');
            if (parchmentEl) parchmentEl.className = "absolute inset-0 opacity-0 transition-opacity duration-1000 parchment pointer-events-none z-0";
            
            const detailsEl = hrGet('final-result-details');
            if (detailsEl) detailsEl.className = "opacity-0 transition-opacity duration-1000 space-y-6 max-w-xl mx-auto";
            
            const actionsEl = hrGet('final-actions');
            if (actionsEl) actionsEl.className = "opacity-0 transition-opacity duration-1000 pt-2";

            // 复原蜡封信封和火漆
            const waxSeal = hrGet('wax-seal');
            const sealThread = hrGet('seal-thread');
            const sealThread2 = hrGet('seal-thread-2');
            const envelopeWrapper = hrGet('screen-envelope');
            
            if (waxSeal) waxSeal.className = "w-16 h-16 bg-gradient-to-br from-venus-rose via-venus-red to-venus-deep rounded-full shadow-lg flex items-center justify-center relative transition-transform duration-500 hover:rotate-6 active:scale-95 border border-venus-gold/35";
            if (sealThread) sealThread.className = "absolute w-24 h-0.5 bg-venus-rose/95 top-8 left-[-16px] rotate-12 origin-center transition-all duration-500";
            if (sealThread2) sealThread2.className = "absolute w-24 h-0.5 bg-venus-rose/95 top-8 left-[-16px] -rotate-12 origin-center transition-all duration-500";
            if (envelopeWrapper) envelopeWrapper.className = "screen-transition w-full max-w-md bg-[#1f1624] border-2 border-[#3d2744] p-8 rounded-2xl shadow-2xl text-center hidden opacity-0 translate-y-4 space-y-6 relative overflow-hidden";

            // 恢复首屏
            switchScreen('screen-final', 'screen-prelude');
        }

window.heartrateReset = resetEngine;
