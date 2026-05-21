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

## 已移除（违反规则）

- `vision-shim.js` — 曾 patch 全局 Hands/Camera
- `meditation-perf.js` — 曾写全局 `__vnMeditationSkipFrame`
- 对 `#divine-card-row` / `gesture-label` 等的写操作

## PWA

未启用；与 mobile 分阶段。
