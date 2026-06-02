# RolePlay 角色选择器与详情页 — 设计草案

这是一份纯文档的设计草案，**不包含组件代码**。等图片 agent 报完每人 3-5 张图、`src/data/roleplay-characters.ts` 的 `images` 字段更新好之后，再照这份文档写组件即可。

---

## 1. 页面与路由

| 路由 | 角色 | 改造方向 |
| ---- | ---- | -------- |
| `/[locale]` | 首屏 | 当前是 `<TalkieMvp />` 的整套大壳。改成"角色选择器"为第一视觉。仍可保留下方的发现/任务等区块作为次级内容，但顶部 viewport 必须是角色卡。 |
| `/[locale]/character/[id]` | 角色详情 | 新建独立的多图详情视图，不再走 `<TalkieMvp initialView="profile">`。这一路由是从首屏点击卡片后的着陆点。 |
| `/[locale]/chat/profile/[id]` | 旧入口 | 暂时保留，301 重定向到 `/character/[id]` 或维持别名。后续可清理。 |

着陆判断标准（用户在文档里说的）：**首屏即"可用的角色选择体验"，不是营销 hero**。所以 `/[locale]` 这个 page.tsx 的第一屏内容必须是卡片列表，不是大字标语 + Try Claw 这种 marketing hero。

## 2. 组件树

```
LandingPage (server component, /[locale]/page.tsx)
└── <RoleplayLanding />          // client, fetches /api/roleplay/characters once
    ├── <RoleplayPicker />        // 主区域，卡片列表
    │   └── <RoleplayCharacterCard />  // 单卡，含多图 carousel
    │       └── <PhotoCarousel />        // 共享：多图 + dots/arrows/swipe
    └── <RoleplaySecondary />     // 可选：旧的 hero/任务/发现区，放卡片下方


CharacterDetailPage (server component, /[locale]/character/[id]/page.tsx)
└── <RoleplayCharacterDetail characterId="rp-001" />   // client
    ├── <PhotoCarousel large />          // 复用同一个 carousel
    ├── <CharacterMeta />                 // 名字、年龄、occupation、location
    ├── <CharacterBio />                  // bio + tags + personality
    └── <StartChatButton />               // 跳到 /chat/profile/[id] 或现有聊天入口
```

`<PhotoCarousel />` 抽成共享组件是关键 —— 卡片预览和详情页都用同一个，dot/arrow/swipe 行为完全一致。

## 3. 数据流

- `<RoleplayLanding />` 在 mount 时调用 `fetchRoleplayCharacters()`（已经在 `src/shared/lib/roleplay-client.ts` 里实现）。
- 返回的 `RoleplayCharacterClient[]` 已经按 `sortOrder` 排好，`avatar`/`gallery` 都是绝对 URL，可以直接喂 `<img>`。
- 不需要 SSR fetch；首屏阻塞会拖慢 LCP，且 R2 图片本身也是异步加载，先骨架后填充更顺。
- 详情页接收 `id` 参数，先在客户端用同一个 `fetchRoleplayCharacters()` 拉列表然后 find，或者直接 fetch `/api/roleplay/characters/[id]`（目前没这个 endpoint，可以后续加；先用 list-then-find 不增 endpoint）。

## 4. PhotoCarousel 行为

- 输入：`images: string[]` (1-5 项), `alt: string`, 可选 `aspectRatio`、`size`。
- 控件：
  - dots：在底部居中，数量 = `images.length`；当前项放大 + 高亮。
  - arrows：左右半透明圆形按钮，仅在 ≥ md 屏幕显示，hover 才完全可见。
  - swipe：触摸端横向 swipe 翻页；用 CSS scroll-snap + `IntersectionObserver` 同步当前 index。
  - 键盘：左右方向键翻页（仅在 carousel 处于聚焦时）。
- 性能：
  - 首张 `loading="eager"` + `fetchpriority="high"`；其余 `loading="lazy"`。
  - 预加载下一张：当用户翻到第 N 张，给 N+1 加 `<link rel="preload">` 或者直接 `new Image()`。
  - 1 张图时不渲染 dots / arrows，避免 UI 噪点。
- 退化：图片加载失败时显示一个统一的 fallback（深灰底 + 角色首字母）。

## 5. RoleplayCharacterCard 视觉

约束（来自原文档）：

- **不要嵌套卡片**：卡片本体就是一张大图加底部信息栏，不要内部再画一层圆角小卡。
- **文字不压脸**：底部信息栏使用线性渐变遮罩从底向上，文字只落在脸下方区域。
- **文字不溢出**：name + age 用 `min-w-0 truncate`，tag 行限制 `line-clamp-1`。
- **不要营销 hero section**。
- **卡片之间不要长得一模一样**：靠图片本身做差异化，UI 元素保持统一。
- **足够密集但仍以视觉为主**：移动端 1 列，平板 2 列，桌面 3 列；图卡占比 ≥ 70% 高度。

布局（mobile-first）：

```
┌────────────────────┐
│                        │
│                        │
│      character          │  ← 主图，9:13~3:4 portrait
│      photo (carousel)  │
│                        │
│                        │
│  ●○○                  │  ← carousel dots 浮在右下角内边距 12px
├────────────────────────┤
│ Name 22 · Lisbon       │  ← name + age + location, 单行 truncate
│ Travel writer who…     │  ← intro, line-clamp-2
│ #travel  #beach        │  ← tags 取前 3 个
└────────────────────────┘
```

整张卡可点击，点击进入 `/character/[id]`。

## 6. 详情页视觉

- 顶部 `<PhotoCarousel large />`，固定 9:13 portrait，桌面端最大宽度 ~480px。
- 信息栏：
  - h1 = `name`，旁边 `age` 小字。
  - `occupation · location`（使用 `readCharacterSettings(c).occupation/location`）。
  - bio（多行）、tags（chips）、personality（chips，淡一点）。
- CTA：`Start chat` 按钮 + `Back to characters` 文本链接。
- 移动端使用全屏滚动；桌面端 carousel 固定在左、信息在右的两栏布局。

## 7. i18n keys（需要新增）

挂在 `roleplay.picker` 命名空间下，新加而不复用 `home`，避免和旧 hero 文案纠缠：

| key | en | zh |
| --- | --- | --- |
| `roleplay.picker.title` | Choose someone to talk to | 选择想聊的人 |
| `roleplay.picker.subtitle` | 12 characters, photo-first | 12 位角色，先看脸 |
| `roleplay.picker.empty` | No characters available yet | 暂无角色 |
| `roleplay.picker.loading` | Loading… | 加载中… |
| `roleplay.picker.photo_count` | `{n} photos` | `{n} 张照片` |
| `roleplay.detail.start_chat` | Start chat | 开始聊天 |
| `roleplay.detail.back` | Back to characters | 返回角色 |
| `roleplay.detail.occupation` | Occupation | 职业 |
| `roleplay.detail.location` | Location | 位置 |
| `roleplay.detail.bio` | About | 关于 |
| `roleplay.detail.personality` | Personality | 性格 |
| `roleplay.detail.tags` | Tags | 标签 |
| `roleplay.carousel.next` | Next photo | 下一张 |
| `roleplay.carousel.prev` | Previous photo | 上一张 |
| `roleplay.carousel.position` | `Photo {current} of {total}` | `第 {current} 张，共 {total} 张` |

可复用的旧 key：`roleplay.profile.age`, `roleplay.profile.intro`, `roleplay.profile.opening`, `roleplay.chat.message`。其余 home/categories/task_cards 的 key 不必动，做次级展示时仍可继续用。

## 8. 移动端优先的具体取舍

- 卡片宽度：`w-full` 单列，`max-w-md mx-auto` 居中；scroll-snap 整张卡贴齐顶部。
- 字号：name 22px / age 14px / intro 14px，移动端可读不挤。
- 图片高度：`aspect-[3/4]`，避免特别高的 9:16 在小屏给 keyboard 上滑挤变形。
- 触控区：整张卡可点；carousel 的 swipe 不能"吃掉"卡级点击 —— 用阈值（位移 > 24px 才认作翻页，否则触发 `onClick`）。
- carousel arrows 在 mobile 隐藏（屏幕窄，按钮容易盖脸）；只留 dots。

## 9. 与现有 `talkie-mvp.tsx` 的关系

旧组件不直接编辑，按以下顺序换源：

1. 新建 `src/shared/components/roleplay/roleplay-picker.tsx`、`roleplay-character-detail.tsx`、`roleplay-character-card.tsx`、`roleplay-photo-carousel.tsx`。
2. 把 `/[locale]/page.tsx` 的根组件从 `<TalkieMvp />` 切换成新的 `<RoleplayLanding />`。
3. 把 `/[locale]/character/[id]/page.tsx` 切到 `<RoleplayCharacterDetail />`。
4. `/[locale]/chat/profile/[id]/page.tsx` 暂时保留旧 `TalkieMvp`，等聊天页重写时再处理。
5. 旧静态 `characters` 数组和 `talkie-mvp.tsx` 的相关 view 在新路径稳定后删（已经在主 todo 文档里列好 6 个引用点）。

## 10. 不在本次范围

- 聊天页本身的重写（`<TalkieMvp initialView="chat">`）。
- 创建角色 (`create` view)、社区、记忆、收藏几个子 view —— 它们和角色选择器解耦，可以保留旧实现暂时挂在二级路由里。
- TTS / 图像生成入口。
- A/B 测试 / Feature flag —— 当前没有真实用户，直接换实现即可。

---

写组件时的最短动作链：

1. 跑 `node scripts/data/validate-roleplay-characters.mjs`，确认 12 角色 + 文件名都对得上。
2. 写 `<PhotoCarousel />`，在一个测试页面（或 Storybook 等价物）里手动验通。
3. 写 `<RoleplayCharacterCard />` 包 carousel。
4. 写 `<RoleplayLanding />` 拉数据 → 渲染卡片网格。
5. 替换 `/[locale]/page.tsx` 根组件。
6. 写详情页，复用 carousel。
7. 替换 `/[locale]/character/[id]/page.tsx` 根组件。
8. 加 8 个新的 i18n key（en + zh 两套）。
9. `pnpm lint && pnpm build`，浏览器烟测移动端 viewport。
