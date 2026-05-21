# Mobile Layer — Portrait-first（竖屏优先）

**Desktop baseline 不动。** 仅 `mobile-layer/*` + HTML 末尾 mobile 资源引用。

## 布局规则（独立于 desktop）

| 项 | Mobile portrait | Desktop（不改） |
|----|-----------------|------------------|
| 走马灯间距 | `gap = 14% × 屏宽`，上限 42px | `STEP_WIDTH = 230` |
| 卡牌宽 | `36% × 屏宽`，108–148px | 固定 margin/transform |
| 中心牌 | scale 1，opacity 1 | desktop 逻辑 |
| 相邻牌 | scale 0.76，opacity 0.5 | — |
| 远牌 | scale 0.6，opacity 0.22 + blur | — |
| 容器 | `#vn-mobile-root` 全屏竖屏 shell | `#divination-stage` |

## 摄像头

- 占卜：`camera-guard.js` 禁止 getUserMedia / Hands / Camera（冥想除外）
- desktop 粒子 canvas：绘制 noop + CSS 隐藏

## 已移除

- `landscape-mode.js` / `landscape.css`（横屏锁定与旋转门帘）
- 对齐 `#divination-stage` 矩形导致的 desktop 压缩叠层

## 交互（`#vn-mobile-root`）

- 滑动：换牌
- 点击：选中
- 长按 3 秒 + 松手：祈愿环 → 翻面
