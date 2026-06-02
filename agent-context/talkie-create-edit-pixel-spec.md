# Talkie Create/Edit 像素级模仿分析

采样时间：2026-05-18  
采样地址：`https://www.talkie-ai.com/create/edit?npc_id=399034862309606`  
截图：`talkie-create-edit-logged-2026-05-18.png`  
视口：1512 x 785，DPR 2

## 1. 页面气质

这是一个深色创作者工作台，不是营销页。视觉关键词是：

- 黑底、低对比卡片、弱边框；
- 工具型三栏布局；
- 左侧表单密集输入，中间能力配置，右侧实时预览；
- 控件圆角克制，常用 8px / 12px / 16px；
- 文本以白色 90%、60%、40% 透明度分层。

整体要避免大面积渐变、装饰图形、英雄区和卡片堆叠。这个页面的高级感来自克制、密度和稳定间距。

## 2. 全局布局

```text
body 1512 x 785
header 1512 x 76
main   1512 x 709

main:
left editor area   x 0      y 76  w 985.9  h 709
right preview area x 1009.9 y 76  w 502.1  h 709
gutter between     about 24px
```

背景：

- `body`: `#000000`
- 主内容区域：透明黑底；
- 分栏边界靠卡片与极弱边框区分，不使用明显分割线。

## 3. 顶部栏

尺寸：

- 高度：76px
- 内边距：24px 横向，16px 纵向
- 左侧返回按钮区域从 x 24 开始；
- 右侧按钮组从 x 1212 开始。

内容：

- 左侧返回 icon，44 x 44，深色圆角按钮；
- 标题 `Homework Helper`，白色；
- 状态 `Draft`，带小 clock icon，灰色；
- 右侧 `Save` 和 `Publish`。

按钮：

```css
.save {
  width: 128px;
  height: 44px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.6);
  font: 600 16px Arial;
}

.publish {
  width: 128px;
  height: 44px;
  border-radius: 8px;
  background: #ffffff;
  color: #161823;
  font: 600 16px Arial;
}
```

按钮组间距约 20px。

## 4. 左侧编辑区

左侧总宽约 986px，内容从 x 24 开始。顶部行高度约 70px：

- 标题 `Create Your Talkie`: x 24, y 99.8, 20px, weight 500, white；
- 模型选择器：x 723.4, y 90.5, w 238, h 42；
- 模型选择器背景 `rgba(255,255,255,0.08)`，边框 `rgba(255,255,255,0.1)`，圆角 8px。

内容区从 y 146.5 开始，分为左右两列：

```text
meta form column   x 24    w 474.7 h 638.5
extra config col   x 518.7 w 442.7 h 638.5
gap                about 20px
```

## 5. 表单列

外壳：

- x 24, y 146.5, w 474.7, h 638.5；
- 背景 `rgba(255,255,255,0.04)`；
- 圆角 `16px 16px 0 0`；
- 内部 form x 40, y 162.5, w 437.7；
- 左右 padding 16px。

字段标签：

```css
.label {
  font-size: 16px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.9);
  line-height: 28px;
}
```

输入框：

- 单行名称字段视觉高度 42px；
- 输入文本 15px，`rgba(255,255,255,0.9)`；
- 输入容器背景接近 `rgba(255,255,255,0.04)` 到 `rgba(255,255,255,0.06)`；
- 字数统计右下或右侧，14px，`rgba(255,255,255,0.4)`。

Gender 行：

- 标签左侧，选项从 x 191.3 开始；
- radio 文本 16px 左右；
- 选项间距约 28px；
- 未选圆圈边框灰色。

长文本框：

- `Settings` 字段整体高度约 403px；
- 标签区 y 338.5，高 44px；
- 提示 `Update` 用黄色小标签；
- 说明文字 `rgba(255,255,255,0.45-0.6)`；
- 文本区域背景延续表单内部深灰；
- 底部有 mention chips 和字符计数。

## 6. 中间能力卡片

卡片容器在 x 518.7，宽 442.7。每张卡背景：

```css
.config-card {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 16px;
}
```

卡片尺寸：

- Skill：w 442.7, h 201.2, y 146.5；
- Image：w 442.7, h 170.6, y 371.7；
- Voice：w 442.7, h 170.6, y 566.3；
- 卡片垂直间距约 24px。

标题行：

- 标题 16px，weight 500，`rgba(255,255,255,0.9)`；
- 左侧 chevron icon；
- 右侧 Add 按钮。

Add 按钮：

```css
.outline-add {
  height: 30px;
  min-width: 67px;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: transparent;
  color: rgba(255, 255, 255, 0.9);
  gap: 4px;
}
```

说明文字：

- 14px；
- `rgba(255,255,255,0.6)`；
- 行高约 20px。

虚线上传区：

- 宽度约 410px；
- 高度约 76-90px；
- 圆角约 12px；
- 边框 `1px dashed rgba(255,255,255,0.18)`；
- 图标居中，灰色 40%-50%。

## 7. 右侧预览区

右侧区域：

```text
right area x 1009.9 y 76 w 502.1 h 709
inner x 1034.4 w 453.6
```

标题：

- `Preview and Testing`
- x 1034.4, y 76.5, h 51.5；
- 20px，weight 500，white；
- padding top/bottom 14px。

聊天预览卡：

- x 1034.4, y 128, w 453.6, h 641；
- 背景 `rgba(0,0,0,0.373)`；
- 圆角 16px；
- 内部纵向布局。

Notice：

- 顶部 y 160 左右；
- 14px；
- 灰色 `rgba(255,255,255,0.35-0.45)`。

角色占位图：

- 中央大号 Talkie logo，深灰；
- 视觉中心偏上，约 y 230-420；
- 透明度低，不能抢过表单。

Intro 气泡：

- x 1046.4, y 637, w 429.6, h 60；
- 圆角 10px；
- 背景接近透明：`rgba(19,94,97,0.01)`；
- 文本 14px，weight 500，`rgba(255,255,255,0.7)`；
- 左右 padding 16px，上下约 10px。

底部输入：

- 输入容器 x 1086.3, y 709, w 389.7, h 40；
- 背景 `rgba(255,255,255,0.08)`；
- 圆角 16px；
- 左侧 reset 区宽约 52px；
- textarea x 1102.3, y 718, w 284.9, h 22；
- 右侧圆形加号按钮。

## 8. 色彩 Token

```css
:root {
  --page-bg: #000000;
  --surface-1: rgba(255, 255, 255, 0.04);
  --surface-2: rgba(255, 255, 255, 0.08);
  --surface-3: rgba(255, 255, 255, 0.15);
  --preview-bg: rgba(0, 0, 0, 0.373);
  --border-subtle: rgba(255, 255, 255, 0.1);
  --border-dashed: rgba(255, 255, 255, 0.18);
  --text-primary: rgba(255, 255, 255, 0.9);
  --text-title: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-muted: rgba(255, 255, 255, 0.4);
  --button-dark: rgba(255, 255, 255, 0.15);
  --button-light-text: #161823;
  --accent-yellow: #f4cf66;
}
```

## 9. 字体层级

全局字体是系统无衬线：

```css
font-family: -apple-system, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
```

层级：

- 页面标题：20px / 500；
- section 标题：16px / 500；
- 表单 label：16px / 400；
- 输入内容：15px / 400；
- 说明文字：14px / 400；
- 顶部按钮：16px / 600；
- 小按钮：14px 左右。

## 10. 响应式建议

桌面优先保持三栏：

- 1440px 以上：左编辑区约 65%，右预览约 33%，中间 24px gap；
- 1200-1439px：压缩中间卡片列，右侧保持 420px 以上；
- 1024-1199px：左侧表单和能力卡改为上下堆叠，右侧仍固定；
- 1024px 以下：右侧预览改为可折叠 drawer 或底部 preview tab。

实现时不要让表单列和预览列互相挤压到文本换行失控。关键控件必须设置稳定高度和 min-width。

## 11. 仿制验收清单

- 首屏是工作台，不出现 landing hero；
- 顶部栏高 76px，Save/Publish 在右上且尺寸一致；
- 左侧编辑区从 x 24 开始，右侧预览从 x 1009 左右开始；
- 表单外壳、能力卡、预览卡都使用低透明白/黑表面；
- 所有主要圆角不超过 16px；
- Add 按钮是 pill outline，不是实心主按钮；
- 上传区使用弱虚线边框和居中 icon；
- Preview 聊天卡底部输入固定在底部；
- 整体文本层级低调，说明文字不要纯白；
- 页面不使用彩色大面积渐变、营销文案、嵌套卡片。
