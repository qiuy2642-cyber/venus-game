# Mobile Layer — Portrait-first，对标 Desktop 美术

## 原则

- **Desktop HTML/逻辑不修改**（仅 HTML 末尾 mobile 资源引用）
- Mobile 使用 **同一套** `.divine-card-item` / mandala / ritual-aura / divine-canvas
- 仅隐藏 `#cam-preview`；**不禁用** FaceMesh 冥想摄像头
- 占卜：**无 Hands / 无自动 camera**；触控替代手势

## 模块

| 文件 | 作用 |
|------|------|
| `camera-guard.js` | 禁止 Hands；`getUserMedia` 仅冥想页 |
| `vn-shortcut.js` | 窥视命运转场后直达 page3「选择你的启示」 |
| `divination-touch.js` | 驱动 desktop 卡牌 DOM + portrait spacing |
| `mobile-root.js` | 透明触控层 |
| `mobile.css` / `portrait.css` | 竖屏缩放 desktop 占卜样式 |

## 触控映射

| Desktop 手势 | Mobile |
|--------------|--------|
| 手左右移动 | 左右滑动 |
| 握拳选牌 | 点击选中 |
| 下巴祈愿 | 长按 3 秒 + 松手 → 祈愿环 → 翻面 |

## 布局（独立于 desktop STEP 230）

- `gap ≈ 12%` 屏宽（42–72px）
- 卡牌宽约 `36vw`（≤140px）
- `perspective` / mandala / 双面色系保持 desktop
