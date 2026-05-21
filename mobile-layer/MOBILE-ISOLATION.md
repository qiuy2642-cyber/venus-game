# Mobile Layer — 物理隔离（强制）

**Desktop baseline:** `60992c5`。禁止 import / 修改任何 desktop scene、state、animation 文件。

## 五条规则

1. **不碰 desktop 核心文件** — 仅 `mobile-layer/*` + HTML 末尾 3 行集成。
2. **独立状态** — 占卜索引、相位、翻转均在 `mobile-layer` 闭包内，不共享 desktop state machine。
3. **不 patch Hands / Camera** — 禁止 override 全局构造函数；desktop 实例保持原样。
4. **事件只在 `#vn-mobile-root` 内** — `pointerdown/up` 等仅绑定 root；禁止 `window`/`document` 级监听。
5. **不修改 desktop DOM** — 不改 class/style/子节点；仅 **只读** `querySelector` 同步签文；**输出** 为 root 内镜面 UI、`CustomEvent('vn-mobile-output')`、可选 `showToast()`、`.exit-divine-btn.click()`。

## 架构

| 模块 | 职责 |
|------|------|
| `mobile-root.js` | 创建唯一挂载点 `#vn-mobile-root`，对齐 `#divination-stage` 区域（MutationObserver 仅观察 style，不写 desktop 节点） |
| `divination-mirror.js` | 镜面触控：滑动 / 点击 / 长按 3 秒松手 → 祈愿环 → 翻面 |
| `bootstrap.js` | coarse pointer 下加载上述模块 |

## Mobile 摄像头策略（`camera-guard.js`）

- 粗指针设备：**占卜阶段**禁止 `getUserMedia`、Hands `send`、Camera `onFrame`
- **冥想阶段**（`#page-meditation.active`）允许摄像头 + FaceMesh
- 占卜粒子 canvas 绘制在 mobile 占卜时被 noop（降低发热）

## 横屏（`landscape-mode.js`）

- 竖屏全屏提示；横屏尝试 `screen.orientation.lock('landscape')`
- safe-area 由 `#vn-mobile-root` / orient-gate CSS 处理

## PWA

未启用；与 mobile 分阶段。
