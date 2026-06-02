# RolePlay v2 重构 — 落地计划

> 配套观察记录：`roleplay-character-redesign-v2-requirements.md`。
>
> **方向**：Talkie 内容平台向（grid + 8 类标签 + UGC 创建 + chat 三层），
> 视觉吸收 Crushly 糖系细节。
> **审核流**：`draft` 只是发布前临时编辑状态，不能互动；所有角色都必须通过发布前角色卡一致性强校验后才能聊天。发布为私有角色时直接 `published + private`，仅作者本人可见；发布为公共角色时先通过强校验，再进入 `under_review → published + public`（驳回回 `draft`，附原因）。
> **AI Writer**：v1 用 JSON 一次返回，不做 SSE。
> **聊天消息**：保留 `*action*` 旁白，前端用 markdown 解析渲染。
> **移动端**：所有页面 mobile-first 设计；导航用 sticky 顶栏 + 汉堡 drawer
> （复用 `src/shared/components/ui/sidebar.tsx` 的 Sheet 模式 +
> `useIsMobile` 钩子），bottom 输入区域加 `safe-area-inset-bottom` padding。

## 阶段总览

| 阶段 | 内容 | 阻塞 | 状态 |
|------|------|------|------|
| A | DB schema 升级（5 态 status / skills / tags / parent_id） | — | ✓ 已完成 |
| B | Create 流程（列表 + 表单 + AI Writer） | A | ✓ 已完成 |
| C | 首页升级（标签 chip + 移动顶栏 + 汉堡 drawer） | A | ✓ 已完成 |
| D | Chat 页重构（旁白 markdown + 评论楼中楼） | A | ✓ 已完成 |
| E | 审核后台 | A | ✓ 已完成 |
| F | 视觉糖（Crushly 渐变 / 卡片美学） | B/C/D | ✓ 已完成 |

状态标记约定：`☐ 未开始` / `▶ 进行中` / `✓ 已完成` / `⚠ 阻塞`。

---

## Phase A — DB Schema 升级

**目标**：把数据库扩到能承载 v2 字段模型，所有后续阶段都依赖此。

| 任务 | 文件 | 移动端影响 | 状态 |
|------|------|------------|------|
| A1. 新建 migration 0004：`roleplay_character` 加列 `skills text='[]'`、`chat_count integer=0`、`like_count integer=0`、`rejection_reason text=''`；`status` 旧值 `'created'` 回填成 `'published'` | `src/config/db/migrations/0004_roleplay_v2_status.sql` | — | ✓ |
| A2. 新建 migration 0005：`roleplay_tag`（id, slug, label_zh, label_en, sort_order）+ `roleplay_character_tag`（character_id, tag_id, PK 复合）+ 8 个种子 tag | `src/config/db/migrations/0005_roleplay_tags.sql` | — | ✓ |
| A3. 新建 migration 0006：`roleplay_character_comment` 加 `parent_id text NULL`、`like_count integer=0` | `src/config/db/migrations/0006_roleplay_comment_threading.sql` | — | ✓ |
| A4. 同步 drizzle schema：在 `schema.postgres.ts` 加上对应列；新增 `roleplay_tag` / `roleplay_character_tag` 表对象 | `src/config/db/schema.postgres.ts` | — | ✓ |
| A5. 升级 `RoleplayStatus` 枚举：`draft / under_review / published / rejected / deleted`；导出 `ROLEPLAY_CHARACTER_VISIBLE_STATUSES`；`getRoleplayCharacters` 默认过滤掉 `draft / under_review / rejected / deleted`，owner 通过 `ownerStatuses` 列出草稿；旧 `'created'` 在迁移里回填为 PUBLISHED | `src/shared/models/roleplay.ts` | — | ✓ |
| A6. 加 `getRoleplayTags`、`resolveTagIdsBySlug`、`getCharacterTagSlugs`、`setCharacterTagSlugs`、`incrementCharacterCounter` helper | `src/shared/models/roleplay.ts` | — | ✓ |
| A7. `pnpm lint && pnpm build` 通过（lint 仅 8 个旧 warning） | — | — | ✓ |

**完成标准**：`pnpm lint` + `pnpm build` 通过。`✓ 已完成`（lint: 8 warnings 全部是旧代码遗留；build: TS 编译通过 + Next 路由列表正常）。

---

## Phase B — Create 流程

**目标**：复刻 Talkie `/create` → `/create/edit` 全闭环，含 AI Writer。

| 任务 | 文件 | 移动端影响 | 状态 |
|------|------|------------|------|
| B1. `/create/page.tsx`：All / Draft / Under Review 三 tab + Create a Talkie CTA + 自己的草稿列表 | `src/app/[locale]/(landing)/create/page.tsx` + `src/shared/components/roleplay/roleplay-create-list.tsx` | tab 横向滚动；CTA 在 mobile 顶部 sticky | ✓ |
| B2. `GET /api/roleplay/my-characters?status=draft|under_review|all`：当前用户的所有非 deleted 角色 | `src/app/api/roleplay/my-characters/route.ts` | — | ✓ |
| B3. `/create/edit/[id]/page.tsx` 与 `/create/edit/page.tsx`（new）：复刻 Talkie 表单（Name + AI Writer / Gender 三选 / Settings / Intro / Opening / Skills / Image / Voice / Save / Publish） | `src/app/[locale]/(landing)/create/edit/page.tsx` + `src/app/[locale]/(landing)/create/edit/[id]/page.tsx` + `src/shared/components/roleplay/roleplay-character-edit-form.tsx` | 单列垂直布局；Save/Publish 在 mobile sticky 底部，桌面浮动顶部 | ✓ |
| B4. `POST /api/roleplay/ai-writer`：JSON 一次返回 `{name, settings, intro, opening}`，复用 `resolveTextProviderConfig` + `generateText` | `src/app/api/roleplay/ai-writer/route.ts` | — | ✓ |
| B5. AI Writer 弹窗组件（Cancel / Retry / Save 三按钮 + loading spinner） | `src/shared/components/roleplay/ai-writer-dialog.tsx` | mobile 全屏 sheet；桌面 modal | ✓ |
| B6. `PATCH /api/roleplay/characters/[id]`：Save → `status=draft`（仅保存草稿，不能互动）；新增 `POST /api/roleplay/characters/[id]/publish` → 私有/公共发布都先跑角色卡一致性强校验；私有通过后 `published + private`，公共通过后 `under_review` | `src/app/api/roleplay/characters/[id]/route.ts` + `src/app/api/roleplay/characters/[id]/publish/route.ts` | P3-5 需补强校验、私有发布路径、修复 UI | ✓（基础流已完成，强校验待做） |
| B7. i18n：补 `roleplay.create.*` 缺失文案（重用现有 keys，缺的补 zh + en）；新增 `roleplay.create.tabs.*`、`roleplay.create.ai_writer_dialog.*` | `src/config/locale/messages/{en,zh}/roleplay.json` | — | ✓ |
| B8. `GET /api/roleplay/tags`：返回 8 类（含 zh / en label），供 /create 表单 chip picker 使用 | `src/app/api/roleplay/tags/route.ts` | — | ✓ |

**完成标准**：登录用户能保存草稿，但草稿不能互动；私有/公共角色都必须发布成功后才能聊天；私有发布通过强校验后直接可用，公共发布通过强校验后进入 under_review；Draft 列表 / Under Review 列表都能看到对应记录。AI Writer 点击后能填充表单。P3-5 完成后，所有发布路径都必须通过角色卡一致性强校验。

---

## Phase C — 首页升级

**目标**：grid 上方加标签筛选；移动端套上 sticky 顶栏 + 汉堡 drawer。

| 任务 | 文件 | 移动端影响 | 状态 |
|------|------|------------|------|
| C1. `RoleplayLanding` 增加 `<TagChips>`：横向滚动 chip，bound 到 `/api/roleplay/tags`；点击 set query `?tag=anime_game` | `src/shared/components/roleplay/roleplay-landing.tsx` + `src/shared/components/roleplay/tag-chips.tsx` | mobile 横向滚动条隐藏；touch swipe ok | ✓ |
| C2. `GET /api/roleplay/characters` 支持 `?tag=` 与 `?status=published`（默认）；non-owner 默认只看 published | `src/app/api/roleplay/characters/route.ts` | — | ✓ |
| C3. `GET /api/roleplay/tags`：返回 8 类（含 zh / en label） | `src/app/api/roleplay/tags/route.ts` | — | ✓ |
| C4. 全站 sticky 顶栏：左 logo / 中搜索 / 右用户头像 + 汉堡（mobile only） | `src/shared/components/roleplay/roleplay-topbar.tsx` | scroll-aware：向下滚隐藏，向上滚显示（"自动隐藏菜单"）；hamburger 触发 `<Sheet>` drawer | ✓ |
| C5. Drawer 内容：`Create / Discover / Search / Memory / Community / Notifications` + 用户区 + 登出 | `src/shared/components/roleplay/roleplay-nav-drawer.tsx` | 复用 `ui/sheet.tsx` 模式 | ✓ |
| C6. `(landing)/layout.tsx` 包裹 topbar + main 容器，确保所有 landing 路由共享 | `src/app/[locale]/(landing)/layout.tsx` | mobile 顶栏 sticky + safe-area；main 加 `pt-14` 让位顶栏 | ✓ |

**完成标准**：mobile viewport 下导航能折叠到汉堡 drawer，向下滚动顶栏自动隐藏；标签 chip 能切换 grid 内容。

---

## Phase D — Chat 页重构

**目标**：把 chat 路由从"只有消息流"扩成 Talkie 的"对话 + 角色卡 + 评论"三层。

| 任务 | 文件 | 移动端影响 | 状态 |
|------|------|------------|------|
| D1. 拆 `roleplay-chat.tsx` 成三个 section：`<ChatStream>` / `<CharacterPanel>` / `<CommentBoard>`；首屏停在 ChatStream 底部 | `src/shared/components/roleplay/roleplay-chat.tsx` + `src/shared/components/roleplay/character-panel.tsx` + `src/shared/components/roleplay/comment-board.tsx` | mobile 单列垂直；桌面也单列（不做侧栏） | ✓（拆 CommentBoard 到 detail 页，chat 路由保留单层）|
| D2. 消息 markdown 解析：`*action*` → 斜体浅色 narration；`"对白"` 与裸文本 → 普通台词。前端纯函数 | `src/shared/lib/roleplay-message-format.ts` + 单元测试 | — | ✓（无独立测试，逻辑已被 chat 渲染验证）|
| D3. `/api/roleplay/chat` system prompt 加约束："Use *italics for actions* and plain text for dialogue" | `src/app/api/roleplay/chat/route.ts` | — | ✓ |
| D4. 评论楼中楼：顶层 + 二级 reply 折叠（"View N Replies"）；UI 复用 D1 的 `<CommentBoard>` | `src/shared/components/roleplay/comment-board.tsx` | mobile 留言输入框底部 sticky；reply 折叠减少滚动 | ✓ |
| D5. `GET/POST /api/roleplay/characters/[id]/comments` 改成支持 `parent_id`，列表返回 `{ root, replies[] }` 树形 | `src/app/api/roleplay/characters/[id]/comments/route.ts` | — | ✓ |
| D6. 用户消息已读双勾：消息成功 persist 后渲染 `✓✓` | `src/shared/components/roleplay/roleplay-chat.tsx` | — | ✓ |
| D7. 输入框 mobile 适配：`safe-area-inset-bottom`、textarea autoGrow 上限 6 行、Enter 发送 / Shift+Enter 换行 | `src/shared/components/roleplay/roleplay-chat.tsx` | sticky 底部 + 软键盘弹起时 scroll into view | ✓ |

**完成标准**：发一条消息后能看到 `✓✓`；角色回复中 `*action*` 渲染为斜体；评论区能 reply。

---

## Phase E — 审核后台

**目标**：管理员只审核用户提交为公共可见的角色；私有已发布角色不进入审核队列，但仍必须通过发布前强校验。

| 任务 | 文件 | 移动端影响 | 状态 |
|------|------|------------|------|
| E1. `/admin/roleplay/review/page.tsx`：列出 `status=under_review`，每条带 Approve / Reject + 拒绝原因输入 | `src/app/[locale]/(admin)/admin/roleplay/review/page.tsx` + `src/shared/components/roleplay/roleplay-review-console.tsx` | 后台默认桌面优先；mobile 表格转卡片 | ✓ |
| E2. `POST /api/admin/roleplay/[id]/moderate`：admin role 校验；写 `status=published` 或 `status=rejected` + `rejection_reason` | `src/app/api/admin/roleplay/[id]/moderate/route.ts` | — | ✓ |
| E3. 用户在 `/create` 列表里看到 `status=rejected` 的卡片显示 `rejection_reason`，可一键再编辑（reset 回 draft） | `src/shared/components/roleplay/roleplay-create-list.tsx` + `src/shared/components/roleplay/roleplay-character-edit-form.tsx` | — | ✓ |

**完成标准**：non-admin 访问 `/admin/roleplay/review` 被拒；admin 可批准 / 驳回；驳回原因能在用户侧显示。

---

## Phase F — 视觉糖

**目标**：把 Crushly 的糖系风味叠到 Talkie 骨架上。

| 任务 | 文件 | 移动端影响 | 状态 |
|------|------|------------|------|
| F1. 主题色 token：`--brand-gradient-from / --brand-gradient-to`（默认紫粉），登录后写到 `body data-theme` | `src/config/style/theme.css` | — | ✓（统一作为 `--roleplay-brand-gradient` CSS 变量，按需 inline 引用，未做 per-user theme switch）|
| F2. 卡片美学：圆角加大、`name + age` 前缀展示（如有 age）、轻 hover 阴影；按钮主色用 brand gradient | `src/shared/components/roleplay/roleplay-character-card.tsx` | — | ✓ |
| F3. Topbar / 主 CTA / Save / Publish 按钮统一 brand gradient | `src/shared/components/roleplay/roleplay-topbar.tsx` 等 | — | ✓ |

**完成标准**：截图对比 v1 → v2 视觉差异明显；不破坏可访问性（文字 contrast ≥ 4.5）。

---

## 移动端总原则（写给后续每一步看）

1. **mobile-first**：默认 viewport 是 ≤640px；用 `sm:` / `md:` 加桌面增强样式。
2. **sticky topbar 自动隐藏**：用 `useScrollDirection` 钩子，向下滚 `translateY(-100%)`、向上滚归位。
3. **底部安全区**：所有 fixed bottom 元素加 `pb-[max(env(safe-area-inset-bottom),12px)]`。
4. **drawer 不是 dialog**：用 `ui/sidebar.tsx` 的 Sheet（左侧滑入），不要遮全屏。
5. **触摸交互**：carousel / chip 横向滚动用 `touch-action: pan-x`；按钮最小 44×44。
6. **测试矩阵**：每阶段验收时用 Chrome DevTools 切到 iPhone 12 / Pixel 5 / iPad mini 三档跑一遍。

---

## 验收节奏

每完成一个 Phase：

1. 把对应 ☐ 改成 ✓，并加一行 "完成时间 / 关键 commit"。
2. 跑一次 `pnpm lint && pnpm build`，把任何剩余 warning 记到下一个 Phase 的"已知问题"。
3. 用 bb-browser 在 dev server 上跑一遍 mobile viewport（DevTools mobile mode）截图存到 `/tmp/v2-phase-X-*.png`。
4. 把更新后的本文件 commit（不和功能代码混在一起）。

---

## 收尾备忘（2026-05-25）

### 已完成的快照

桌面 viewport（1512×785，bb-browser 默认）：

- `/tmp/v2-smoke/01-landing-en.png` — 首页 grid + topbar + chip 行
- `/tmp/v2-smoke/02-create-list.png` — `/create` 列表（"My Talkies"）
- `/tmp/v2-smoke/03-create-edit-form.png` — `/create/edit` 完整表单（Name / Gender / Settings / Intro / First Message / Categories）
- `/tmp/v2-smoke/04-ai-writer-dialog.png` — AI Writer 入口（dialog 触发 click 因 ref 失效未抓到弹窗状态，dialog 本身可手测）

桌面 viewport 第二轮（2026-05-25 收尾追加）：

- `/tmp/v2-final-smoke/01-landing.png` — 首页（chip 行确认显示 All + 8 类，DOM 实有 12 张角色卡）
- `/tmp/v2-final-smoke/02-detail.png` — `/character/rp-001` 详情
- `/tmp/v2-final-smoke/03-chat.png` — `/chat/profile/rp-001` chat 页
- `/tmp/v2-final-smoke/04-create.png` — `/create` 列表（未登录跳 sign-in，符合预期）

### 收尾轮已完成

1. **`pnpm db:migrate` 执行成功**：之前 `meta/_journal.json` 只到 idx 3，drizzle 不知道还有 0004/0005/0006。补齐 journal 后重跑，三条 migration 全部应用。`roleplay_tag` / `roleplay_character_tag` 表存在，8 条 tag 种子入库；`roleplay_character` 多 `skills/chat_count/like_count/rejection_reason`；`roleplay_character_comment` 多 `parent_id/like_count`。
2. **`/api/roleplay/tags` 回归**：返回完整 8 类 tag（不再是 `migrationRequired:true`）；首页 chip 行 DOM 验证渲染 All + Featured / Recommend / Play & Fun / Helper / Original / Anime & Game / Fiction & Media / Icon。
3. **`/admin/roleplay/review` 权限链审计**：页面级 `(admin)/layout.tsx` 走 `requireAdminAccess`；API 层 `/api/admin/roleplay` 与 `/api/admin/roleplay/[id]/moderate` 各自再 `hasPermission(ADMIN_ACCESS)`；moderate 仅允许 `under_review → published/rejected`，reject 强制 reason。DB 里已存在一个 `super_admin` 用户（`millarwells21@gmail.com`），可直接登录验证。
4. **新增辅助脚本**：
   - `scripts/check-roleplay-db.mjs` — 看 roleplay 表结构 / tag 种子 / drizzle migration 进度。
   - `scripts/check-admin-state.mjs` — 看 admin 角色 / admin 用户 / under_review 队列。

### 收尾轮第二批（2026-05-25 晚 — UI / AI Writer / 数据清理）

完成了用户实测反馈的 8 个 bug 与 AI Writer 图片闭环：

1. **输入框文字不可见（全站）**：`global.css` 的 `input/select/textarea` base 规则之前不在 `@layer base` 里，加上 `bg-background` 没设 color。改为 `@layer base { color: inherit; caret-color: currentColor }`，让 input 继承父级文字色（roleplay 区 `text-white`、admin shell `text-foreground`），同时 `<Input>`/`<Textarea>` 的 className 显式补 `text-zinc-100 caret-white selection:bg-white/20`。
2. **Save / Publish 不跳 My Talkies**：`handlePublish` 成功后 `router.push('/create?tab=under_review')`；`/create` 列表读 `?tab=` 初始化 activeTab 并跟随 query 切。
3. **分类 chip 显示中文（en 站）**：表单 `tagLabel(tag, locale)` 改用 next-intl `useLocale()`；首页 `resolveLabel` 不再读 i18n catalogue，与表单一律走 API `labelEn / labelZh`。
4. **published / under_review 还能 Edit**：`roleplay-create-list.tsx` 卡片 `isLocked` 时不渲染 Edit；`/create/edit/[id]` 进入时若 `isLocked` 整表单 disabled + amber banner + 隐藏 Save/Publish。
5. **缺返回首页入口**：edit 页 + `/create` 列表头加 Home 按钮；nav drawer 加 My Talkies；topbar 桌面端管理员显式渲染 "Moderation queue" 链。
6. **publish 后首页看不到**：`/api/roleplay/characters/[id]/publish` 同时设 `visibility=public`；`/api/admin/roleplay/[id]/moderate` 的 approve 分支也兜底设 `public`；DB backfill 修了 2 条遗留 `private` 行。
7. **首页 chip 与创建页 tag 不一致**：两边一律用 `tag.labelEn / labelZh`，slug 单一真源。
8. **缺管理员后台入口**：新增 `GET /api/user/is-admin`（auth-only，anon 返回 `false`）；topbar 桌面端 + nav drawer 都按这个 flag 决定是否展示 Moderation queue 入口。

**AI Writer 一键含立绘**（实测用 volcengine doubao-seedream，文字 + 立绘 + R2 上传 ~80s 一次返回）：

- 服务端 `AI_TIMEOUT_MS` 30s → 180s；图片 90s；route `maxDuration` 显式 300s。
- `/api/roleplay/ai-writer` 在 `generateText` 之后跑 `tryGenerateImage()`：解析 image provider config → `generateOpenAICompatibleImage()` → `storageService.downloadAndUpload()` 把火山方舟 30 分钟到期的临时 URL 转存到 R2，回传永久 URL。
- 失败兜底：图片配置缺失 / 生成失败 / 上传失败 → `image.generated:false + reason`，文字仍正常返回，dialog 显示 amber "立绘未能生成 — <reason>" 提示。
- `AiWriterDraft` 加 `avatar / gallery`；dialog 显示 portrait 预览；`handleAiSave` 把 avatar 写到 `state.avatar` + `gallery: [avatar]`，"不覆盖用户已选的"规则与文字字段一致。
- 表单新增 Image preview field，可一键 Reset 撤销 AI 写入的立绘。
- PATCH/POST body 带 `avatar / cover / gallery`，与既有 character API 字段对齐。

**数据清理**：删除 3 条非种子角色（`TestApprove` / `naaaa11` / `bbbbnae`），仅保留 `rp-001..rp-012` 12 个种子角色。cascade 自动清理 tag/comment/asset 关联。

**新增文件**：

- `src/app/api/user/is-admin/route.ts` — 客户端探测当前用户 admin 状态。
- `scripts/seed-review-fixture.mjs` — 种 2 条 under_review fixture 用于审核流验证。
- `scripts/cleanup-review-fixture.mjs` — 删除上述 fixture。
- `scripts/check-user-roles.mjs` — 看任意 userId 的角色绑定。

**新增 i18n key**：`roleplay.create.home_label / locked_under_review / locked_published / draft_portrait / portrait_skipped`，`roleplay.nav.my_talkies / admin_review / sign_out`（en + zh 同步）。

### 仍未完成的事项

| 项 | 描述 | 阻塞 / 备注 |
|----|------|-------------|
| R1 | **真机 mobile viewport 验收**：iPhone 12 / Pixel 5 / iPad mini 三档分别截首页 / 详情 / chat | ✓ 已完成（2026-05-26）：改用 in-app browser viewport capability，不再依赖 `window.resizeTo`。iPhone 12 / Pixel 5 / iPad mini 三档分别验证 `/en`、`/en/character/rp-001`、`/en/chat/profile/rp-001`；全部无横向溢出，console error 为空 |
| R2 | **管理员 Approve / Reject 端到端验证** | ✓ 已完成（fixture + curl 双向 + bb-browser UI 截图） |
| R3 | **`parseMessage` 单测**：`src/shared/lib/roleplay-message-format.ts` 的 `*action*` / `"对白"` 解析逻辑没有独立测试 | repo 没有 `test` 脚本和 vitest/jest，引入测试框架是跨 feature 的基建工作 |
| R4 | **AI Writer 自动化覆盖**：离线 fixture + live API smoke 均有脚本入口，不保存角色；dialog UI 仍可手测 | ✓ 已完成（2026-05-26）：`pnpm smoke:ai-writer` 做离线结构校验；`node scripts/smoke-ai-writer.mjs --live --url http://localhost:3000 ...` 可显式调用真实 `/api/roleplay/ai-writer`，覆盖结构化人格卡、反例、few-shot、avatar URL 形状 |
| R5 | **Per-user theme switch**：F1 落地为统一 CSS 变量 + inline 引用，没做用户白/暗主题选择 | 非阻塞；要做时在 `theme.css` 加 `:root[data-theme=light]` 覆盖即可 |
| R6 | **Photo carousel 翻页停留位置** | ✓ 用户实测确认通过 |
| R7 | **生产环境 migration**：把 0004/0005/0006 应用到 staging / prod DB | 部署前 checklist 项 |
| R8 | **AI Writer 反复 retry 体验**：retry 时清空 imageMet，但若用户多次 retry 会在 R2 留下重复 png；可考虑后续按 ttl 清理 | 非阻塞，存储成本极低 |
| R9 | **AI Writer Model picker (R7-W1)**：在 `/admin` 加 "AI Writer 设置" 页，写 `config` 表，允许管理员动态切换 LLM / image 模型 / 图片尺寸 / 是否启用图片生成 | 见 `roleplay-character-redesign-v2-requirements.md` §1.2 |
| R10 | **AI Writer 用户级模型 (R7-W2)** + **单角色绑定模型 (R7-W3)** | 优先级低，见同上 §1.2 |

### 推进顺序（建议）

1. R7（生产 DB migration）— 上线前必做。
2. R9（AI Writer Model picker 管理员页）— 解放 env 重启依赖，体验项最有价值。
3. R3（parseMessage 单测）+ R5（主题切换）+ R10（用户级模型偏好）— 后台改进，非阻塞，按需排期。

### 收尾轮第三批（2026-05-26 — 计划复查 / mobile smoke）

1. **R1 mobile viewport 验收完成**：用 in-app browser `viewport.set()` 跑了 390×844（iPhone 12）、393×851（Pixel 5）、768×1024（iPad mini）三档；每档依次打开 `/en`、`/en/character/rp-001`、`/en/chat/profile/rp-001`。结果：核心内容均出现，`documentElement.scrollWidth <= clientWidth + 2`，无横向溢出；console error 为空。
2. **注意**：自动化时复用了新 tab 避开旧 Chrome error interstitial；第一次 locator 等待在 React 重渲染瞬间失效，改为 body text / placeholder 轮询后通过。
3. **相关 personality plan 进展**：P1-5 动态称呼规则已完成；官方 12 角色 backfill 脚本已新增并对当前开发库执行。

### 收尾轮第四批（2026-05-26 — 关系状态 / AI Writer 自动化）

1. **P2-1 关系状态向量完成并补齐迁移入口**：`roleplay_conversation.state` 已在 schema 与 migration `0012_roleplay_conversation_state.sql` 中存在，本轮补上 `meta/_journal.json` 的 `0012` 登记，避免 `pnpm db:migrate` 漏跑。chat route 已实现创建会话初始化、生成前 `[relationship_state]` 注入、回复后 `updateRelationshipState()` 写回。
2. **新增关系状态离线 smoke**：`pnpm smoke:relationship-state` 覆盖默认解析、亲密/信任递增、mood 检测、inside joke 捕获、分数 clamp、system message 渲染。
3. **AI Writer 自动化入口固化**：`pnpm smoke:ai-writer` 跑离线 fixture；live 模式继续用 `node scripts/smoke-ai-writer.mjs --live --url http://localhost:3000 --hint "..." --language en`，只调用 `/api/roleplay/ai-writer`，不保存角色，适合作为每次改 AI Writer prompt/schema 后的回归检查。
4. **P1-4 复查结果**：已完成。`chat/route.ts` 的 `PERSONALITY_REINFORCEMENT_INTERVAL = 8` 会在第 8/16/24... 个用户回合把核心性格、口头禅、反例约束作为 `[periodic_character_reinforcement]` 注入到当前 user message 前，减少长聊角色感衰减。

### 收尾轮第五批（2026-05-26 — 聊天历史恢复）

1. **确认消息保存范围**：`/api/roleplay/chat` 已经在登录用户场景下把用户消息和角色回复都写入 `roleplay_message`，并归属到 `roleplay_conversation`。
2. **修正进页恢复链路**：`RoleplayChat` 进入页面时现在优先读取 `/api/roleplay/conversations` 中当前角色的最新 conversation，再调用 `/api/roleplay/conversations/{id}/messages` 恢复双方历史消息；只有没有 DB 历史时才回退旧 `/api/roleplay/state` blob 或角色 opening。
3. **结果**：登录用户刷新页面、从角色详情重新进入 chat、或下次进入同一角色 chat 时，应显示上次双方历史聊天记录，并继续沿用同一个 `conversationId`。

### 收尾轮第六批（2026-05-26 — 微信式历史记录 / 非首次开场优化）

1. **新增角色级历史入口**：`RoleplayChat` header 右侧新增 history 图标，跳转 `/chat/profile/[id]/history`。新增 i18n key：`roleplay.chat_page.history / history_title / history_subtitle / history_empty / history_sign_in / continue_chat / conversation / messages_count`（zh + en）。
2. **新增微信式聊天历史页**：`src/app/[locale]/(landing)/chat/profile/[id]/history/page.tsx` 读取当前登录用户的 `roleplay_conversation`，按当前角色过滤，再拉取 `roleplay_message`。页面不做折叠会话卡，而是按时间合并成连续气泡流：中间时间戳、左侧角色头像气泡、右侧用户白色气泡，底部固定“继续聊天”按钮。
3. **非首次聊天不重复开场白**：`RoleplayChat` 加 `hasPriorChat` 规则。只要当前角色存在已保存 conversation 或旧 `/api/roleplay/state.conversationIds[characterId]`，即使消息 fetch 为空，也不再自动插入角色 opening，避免用户重新进入时重复“初次打招呼”。
4. **最近历史截取修正**：`getRoleplayMessages()` 新增 `latest` 参数。历史恢复与聊天上下文读取改为先按 `createdAt desc` 取最近 N 条，再 reverse 成正序展示/投喂，避免长聊超过 limit 时误拿最早消息。
5. **验证**：`npx eslint src/shared/models/roleplay.ts src/app/api/roleplay/chat/route.ts 'src/app/api/roleplay/conversations/[id]/messages/route.ts' src/shared/components/roleplay/roleplay-chat.tsx 'src/app/[locale]/(landing)/chat/profile/[id]/history/page.tsx'` 通过；`npx tsc --noEmit` 通过。唯一输出仍是既有 `baseline-browser-mapping` 版本提示。

### 收尾轮第七批（2026-05-26 — 登录态排查 / 本地缓存兜底 / Chat timeout）

1. **排查结论**：开发库中 `rp-001` 确有一条 `roleplay_conversation` 与两条 `roleplay_message`（user: `Hi` + character reply），但受管浏览器请求 `/api/roleplay/conversations` 返回 `authenticated:false`，说明页面当前未登录时不会读取 DB 历史。
2. **恢复链路增强**：`RoleplayChat` 匹配 conversation 时，除了 `conversation.characterId === characterId`，也兼容 `conversation.characterSnapshot.id === characterId`；旧 `/api/roleplay/state.conversationIds[characterId]` 存在时会继续调用 `/api/roleplay/conversations/{id}/messages` 拉取消息，而不是只记录 conversationId。
3. **未登录本地缓存兜底**：新增 `src/shared/lib/roleplay-chat-storage.ts`，在浏览器 localStorage 中按 characterId 保存最近 200 条消息与 conversationId。`RoleplayChat` 在 DB / legacy state 都没有恢复出消息时回读本地缓存；发送成功后同步写入本地缓存。
4. **历史页改为客户端双通道**：新增 `src/shared/components/roleplay/roleplay-chat-history.tsx`，`/chat/profile/[id]/history` 页面改为客户端组件：登录时优先 fetch DB conversations/messages；无登录态或 DB 无消息时 fallback 到 localStorage，仍以微信式气泡流展示。
5. **Chat timeout 修正**：`/api/roleplay/chat` 的 `AI_TIMEOUT_MS` 从 30s 提到 90s，并设置 `export const maxDuration = 120`；同时把 user message 落库移动到模型成功返回之后，避免模型 timeout 时留下只有用户消息、没有角色回复的半截记录。
6. **验证**：`npx eslint src/shared/lib/roleplay-chat-storage.ts src/shared/components/roleplay/roleplay-chat.tsx src/shared/components/roleplay/roleplay-chat-history.tsx 'src/app/[locale]/(landing)/chat/profile/[id]/history/page.tsx' src/app/api/roleplay/chat/route.ts` 通过；`npx tsc --noEmit` 通过。唯一输出仍是既有 `baseline-browser-mapping` 版本提示。

### 收尾轮第八批（2026-05-26 — 开发环境邮箱验证阻塞）

1. **问题**：本地登录时被 `/verify-email` 的 “Check your email” 页面挡住，但开发环境没有实际邮件链路可用。DB `config` 表没有 `email_verification_enabled=true` 行，默认设置也是 false；同时多个测试账号 `email_verified=false`，容易触发旧缓存/旧配置下的 403 验证跳转。
2. **服务端修正**：`src/core/auth/config.ts` 现在只有 `NODE_ENV=production` 且 `email_verification_enabled=true`、`resend_api_key`、`resend_sender_email` 三者都存在时，才启用 better-auth 的强制邮箱验证。本地 dev 永远不强制邮箱验证。
3. **前端修正**：`sign-in.tsx` 与 `sign-in-form.tsx` 只有在当前公开配置明确具备邮箱验证能力时，才把 403 跳转到 `/verify-email`；否则显示登录错误，不再误入 “Check your email”。
4. **临时数据修正**：已将拥有 `rp-001` 历史记录的测试账号 `author2@local.test` 标记为 `email_verified=true`，用于验证聊天历史恢复。
5. **验证**：`npx eslint src/core/auth/config.ts src/shared/blocks/sign/sign-in.tsx src/shared/blocks/sign/sign-in-form.tsx` 通过；`npx tsc --noEmit` 通过。若 dev server 已缓存旧 auth options，需要刷新登录页或重启 `pnpm dev`。

### 收尾轮第九批（2026-05-26 — Invalid origin 登录修正）

1. **问题**：`NEXT_PUBLIC_APP_URL` 配置为 `http://localhost:3000`，但本地测试会从 `127.0.0.1:3000` 或 `192.168.1.177:3000` 进入页面。better-auth 服务端只信任 `localhost` origin 时，登录提交会报 `Invalid origin`。
2. **服务端修正**：`src/core/auth/config.ts` 新增 `getTrustedOrigins()`；开发环境默认信任 `http://localhost:3000`、`http://127.0.0.1:3000`、`http://0.0.0.0:3000`、`http://192.168.1.177:3000`，并支持通过 `AUTH_TRUSTED_ORIGINS` 追加逗号分隔 origin。
3. **客户端修正**：`src/core/auth/client.ts` 在非 production 环境下使用 `window.location.origin` 作为 auth baseURL，避免页面从 LAN IP 打开时仍向 `localhost` 发 auth 请求。
4. **验证**：`npx eslint src/core/auth/config.ts src/core/auth/client.ts` 通过；`npx tsc --noEmit` 通过。该改动影响 auth 初始化，需要重启 `pnpm dev` 后生效。

### 收尾轮第十批（2026-05-26 — 右上角账号菜单 / 切换账号）

1. **问题**：RolePlay 顶栏右侧登录后只有头像入口，点击直接去 `/create`，无法确认当前账号，也没有明显的退出 / 切换账号操作，排查跨账号聊天历史很不方便。
2. **实现**：`src/shared/components/roleplay/roleplay-topbar.tsx` 将头像改为 dropdown menu：顶部展示当前账号头像/名称/邮箱；菜单项包含“个人资料”（`/settings/profile`）、“切换账号”（先 `signOut()` 再去 `/sign-in`）、“退出登录”（先 `signOut()` 再回首页）。
3. **文案**：补 `roleplay.nav.account / account_menu / profile / switch_account`，zh + en 同步。
4. **验证**：`npx eslint src/shared/components/roleplay/roleplay-topbar.tsx src/config/locale/messages/zh/roleplay.json src/config/locale/messages/en/roleplay.json` 通过（JSON locale 文件仍被 eslint 配置忽略，仅 warning）；`npx tsc --noEmit` 通过。

### 收尾轮第十一批（2026-05-26 — 历史记录所属账号确认 / 切换账号硬跳转）

1. **排查结论**：受管浏览器当前 session 仍是 `millarwells21@gmail.com`，而开发库中 `rp-001` 的已有历史只属于 `author2@local.test`；所以当前账号请求 `/api/roleplay/conversations` 返回空是符合用户隔离规则的。
2. **切换账号修正**：`RoleplayTopbar` 与 mobile drawer 的退出/切换账号从客户端软路由改为 `signOut()` 后 `window.location.assign(...)` 硬跳转，避免旧 session 被 sign-in 页面复用，导致看似切换账号但实际仍停留在旧账号。
3. **验证**：`npx eslint src/shared/components/roleplay/roleplay-topbar.tsx src/shared/components/roleplay/roleplay-nav-drawer.tsx` 通过；`npx tsc --noEmit` 通过。

### 收尾轮第十二批（2026-05-26 — 历史接口 no-store / 恢复调试提示）

1. **数据确认**：开发库中 `author2@local.test` 仍有 `rp-001` conversation，消息数为 2。
2. **缓存规避**：`/api/roleplay/conversations` 与 `/api/roleplay/conversations/[id]/messages` 增加 `dynamic='force-dynamic'`、`revalidate=0`；前端 fetch 这些接口时增加 `cache:'no-store'`，避免切换账号后拿到旧空列表。
3. **开发调试提示**：`RoleplayChat` 在 development 且未恢复出历史时，显示 `history debug: auth=... conversations=... matched=... restored=...`，用于区分未登录、当前账号无会话、角色未匹配、消息接口为空等情况。生产环境不显示。
4. **验证**：`npx eslint src/app/api/roleplay/conversations/route.ts 'src/app/api/roleplay/conversations/[id]/messages/route.ts' src/shared/components/roleplay/roleplay-chat.tsx src/shared/components/roleplay/roleplay-chat-history.tsx` 通过；`npx tsc --noEmit` 通过。
