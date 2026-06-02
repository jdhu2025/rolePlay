# Roleplay Account Hub 设计方案

> 状态：draft v2（2026-05-25，用户拍板 Q1-Q4 后）
> 目标：为 Roleplay 移动版（Talkie 风格）补齐用户中心，覆盖登录登出、重置密码、用户信息、聊天记录、自创角色等。
> 关联文档：
> - `roleplay-character-redesign-v2-requirements.md`
> - `roleplay-character-redesign-v2-plan.md`
> - `talkie-shipany-spec.md`
> - 待补：`roleplay-billing-credits-design.md`（会员 / Credits 专项方案，见 §11）

## 决策记录（用户 2026-05-25 拍板）

| 编号 | 问题 | 决策 |
|------|------|------|
| **Q1** | URL 用 `/account` 还是 `/me`？ | **`/account`** |
| **Q2** | sign-in 页要不要在这一轮重做？ | **不新增 mobile 路由，直接改 desktop sign-in/sign-up 的 UI 让它跟 Talkie 风格一致**（暗色 + 圆角 + 移动优先），desktop 上仍能用 |
| **Q3** | 聊天记录是否支持删除？ | **按现状以后再补**，本期只做只读列表，不实现删除 |
| **Q4** | 会员 / Credits 入口怎么做？ | **本期只放一个最薄壳**（显示当前 credits 余额 + 「了解 Plus / Pro」跳 pricing），**单独立项写专门方案**：默认注册赠送多少 credits、聊天每条消费多少、Plus / Pro 的额度差异、续订与失效规则等 |

---

## 1. 现状盘点

### 1.1 已有的（desktop / ShipAny 风格）

- `[locale]/(landing)/settings/` 下七张子页：`profile / security / apikeys / billing / credits / invoices / payments`，使用 `FormCard`，宽屏卡片布局。
- `(auth)/`：`sign-in / sign-up / verify-email / no-permission`，better-auth 接管。
- 后端 API：
  - `/api/auth/[...all]`：better-auth catch-all（登录、注册、忘记密码、邮箱验证一站式）。
  - `/api/user/get-user-info`、`/api/user/is-admin`、`/api/user/get-user-credits`、`/api/user/is-email-verified`。
  - `/api/roleplay/conversations`（列表）+ `/api/roleplay/conversations/[id]`（详情）。
  - `/api/roleplay/my-characters`（当前用户的草稿/审核中/已发布）。
  - `/api/roleplay/memories`（私密 + 共享记忆）。
- Roleplay 顶栏 + nav drawer 已有「登录 / 注册 / 退出登录」按钮（i18n 完成），但跳转的是 desktop sign-in 页，跟 Talkie 风格脱节。

### 1.2 缺的部分

- 一个 Talkie 风格的「我」中心（移动优先、暗色、圆角卡片）。
- 全局聊天记录列表（数据有，UI 没；目前只能从角色详情进单个会话）。
- 重置密码入口（better-auth 支持 `forget-password`，但只在 sign-in 页隐式存在）。
- 「我的收藏 / 我的关注 / 已解锁照片」等 Talkie 截图里有占位但无后端的页面（先不做，列在 P3）。

---

## 2. 设计原则

- **不重写已有的 settings/auth**，移动端 Talkie 风格只做新壳。
- desktop（`/settings/*`）保留，给 ShipAny landing 访客用。
- 高级功能（API Keys、发票、支付方式）不在移动版重做，给一个 link 跳到 desktop。
- 移动优先：`dvh` 全屏暗色，圆角，跟 nav drawer / topbar 协调。
- 入口收口在 nav drawer + topbar 头像区。

---

## 3. 信息架构

URL：`[locale]/(landing)/account/`（layout 复用 roleplay nav drawer + topbar）

```
/account                        我（hub 首页：头像 + 昵称 + 入口卡片网格）
  ├─ /account/profile           查看 / 修改昵称 + 头像 + 简介
  ├─ /account/security          修改密码 / 触发重置密码邮件
  ├─ /account/chats             所有聊天历史（按角色分组 + 最近一条）
  ├─ /account/talkies           我创建的角色（= 现有 /create 列表）
  ├─ /account/memories          私密 + 共享记忆汇总
  ├─ /account/billing           会员状态 + credits 余额（薄壳，跳 desktop）
  └─ sign-out                   按钮直接调 better-auth signOut → 回首页
```

每个子页结构统一：
- 顶部返回按钮 + 标题。
- 主体卡片（`bg-zinc-900/60`，圆角 16px）。
- 底部如果有提交按钮，固定在 footer，留给 keyboard 顶起的空间。

---

## 4. 各模块实现细节

### 4.1 登录 / 登出 / 注册

| 项 | 现状 | 计划 |
|----|------|------|
| 登录入口 | nav-drawer + topbar 已有按钮 | 保留，跳 `/auth/sign-in` |
| 退出登录 | 按钮已在但**未接 better-auth signOut**（待确认） | 接 `authClient.signOut()` → push 到 `/`（首页）|
| sign-in / sign-up 页样式 | desktop 风格（白底卡片，宽屏布局） | **P1：直接改造现有 desktop sign-in/sign-up 的 UI**，让它在所有设备上都呈现 Talkie 风格（暗色背景 `bg-[#0b0b10]`、圆角输入框、大按钮、社交登录按钮统一色调），desktop 仍能正常使用，**不新增 mobile-only 路由** |

**改造范围（Q2 决策落地）**：
- 文件：`src/app/[locale]/(auth)/sign-in/page.tsx` + `sign-up/page.tsx` + 共用的 form 组件。
- 视觉：暗色背景、白色 logo、圆角 12px 输入框、大圆角按钮（Talkie 主色 + 黑底白字）。
- 布局：内容区 max-width 420px，垂直居中；移动端贴左右 16px 边距，桌面端居中。
- 文案：i18n key 不变，只换样式。
- 第三方登录按钮：保持 better-auth provider 配置不变，只统一颜色。

### 4.2 重置密码

- better-auth 内置 `auth.forgetPassword({ email })` + `auth.resetPassword({ token, newPassword })`。
- 新增页面：
  - `/account/security`：登录态下，「修改密码」（输入 old/new）+ 「我忘了当前密码」按钮触发邮件。
  - `/auth/forgot-password`：登出态下，输邮箱 → 发邮件。
  - `/auth/reset-password?token=...`：邮件 callback 落地，输入新密码。
- 邮件模板沿用 `/auth/verify-email` 同款；有些 better-auth 的邮件 hook 已经走 `transactional email` 适配器，不需要改 transport。

### 4.3 查看 / 修改用户信息

- 后端：`getUserInfo` + `updateUser` 已有（settings/profile/page.tsx 在用）。
- 前端 `/account/profile`：
  - 字段：头像（走 `/api/upload`）、昵称、简介。
  - 邮箱字段 disabled（跟 desktop 行为一致）。
- 表结构调整（可选）：`users` 表加 `bio text` 列，迁移成本一行。
  - 如果暂不加，先支持「头像 + 昵称」即可，简介列在 P2。

### 4.4 聊天记录

- 后端核对项（待确认）：
  - `/api/roleplay/conversations` 返回字段是否包含 `character_id / character_name / character_avatar / last_message / last_message_at`？如缺，补 join。
  - 是否按 `user_id` 自动过滤？如否，加 server-side 过滤。
- 前端 `/account/chats`：
  - 卡片列表：每条 = 角色头像 + 名字 + 最近一句 + 时间戳。
  - 点击 → `/chat/[characterId]?conversation=[id]`（继续聊，沿用现有 chat 路由）。
  - **本期只读，不做删除**（Q3 决策：按现状以后再补）。
  - 移动端无限滚动，每页 20 条。

### 4.5 自创角色

- 后端：`/api/roleplay/my-characters` 已有，状态字段齐全。
- 前端 `/account/talkies` 复用 `roleplay-create-list.tsx`（当前挂 `/create`）。
- 路由策略：
  - **保留 `/create` 作为创作首页**（含 CTA 卡片）。
  - 新增 `/account/talkies` 作为「我」入口。
  - 两个路由共用同一个组件，header / nav 配置不同即可。

### 4.6 记忆

- 后端：`/api/roleplay/memories` 已有。
- 前端 `/account/memories`：
  - 两个 tab：私密摘要 / 共享记忆。
  - 列表 = 角色 + 摘要内容 + 创建时间。
  - 点击 → 角色详情页（已有 memory 入口）。

### 4.7 会员 / Credits

> **Q4 决策**：本期入口最薄壳，专项方案另立文档。

- 移动版 `/account/billing`（最薄壳，本期实现）：
  - 显示当前 credits 余额（来自 `/api/user/get-user-credits`）。
  - 「了解 Plus / Pro」按钮 → 跳现有 `/pricing` 页。
  - 「管理订阅」按钮 → 跳 desktop `/settings/billing` 或 Stripe portal。
  - 不显示套餐档位、消费明细、续订规则等（这些放专项方案）。
- **专项方案待立**（见 §11 待办）：
  - 注册赠送 credits 的初始额度。
  - 聊天每条消息消耗多少 credits（区分 LLM 模型？区分文本/语音/图片？）。
  - Plus / Pro 的额度差异、价格、月度/年度。
  - 续订、失效、退款规则。
  - 管理后台对 credits 的运营工具。

---

## 5. i18n 影响

新增 namespace `roleplay.account`，预估 30-40 个 key：

```json
"account": {
  "title": "我",
  "subtitle": "管理账户、聊天历史和你的角色",
  "tabs": {
    "profile": "个人资料",
    "security": "账户安全",
    "chats": "聊天记录",
    "talkies": "我的 Talkie",
    "memories": "记忆",
    "billing": "会员与 Credits"
  },
  "profile": {
    "title": "个人资料",
    "name": "昵称",
    "email": "邮箱",
    "avatar": "头像",
    "bio": "简介",
    "save": "保存修改",
    "saved": "已更新"
  },
  "security": {
    "change_password_title": "修改密码",
    "current_password": "当前密码",
    "new_password": "新密码",
    "confirm_password": "确认新密码",
    "submit": "更新密码",
    "forgot_password": "我忘了当前密码",
    "reset_email_sent": "重置邮件已发送，请查收 {email}"
  },
  "chats": {
    "title": "聊天记录",
    "empty_title": "还没有聊天",
    "empty_text": "去发现页找一个聊得来的角色。",
    "continue": "继续聊",
    "delete": "删除"
  },
  "memories": {
    "title": "记忆",
    "tabs": { "private": "私密", "shared": "共享" }
  },
  "billing": {
    "title": "会员与 Credits",
    "current_plan": "当前套餐：{plan}",
    "credits_balance": "剩余 Credits：{balance}",
    "manage": "管理订阅"
  },
  "sign_out_confirm": "确定要退出登录？"
}
```

英文版同步生成。

---

## 6. 实施分期

| 阶段 | 内容 | 备注 |
|------|------|------|
| **P0** | `/account` hub 首页 + sign-out 接 better-auth signOut | 退出登录按钮当前可能未真正登出，需确认 |
| **P0** | `/account/profile`（昵称 + 头像） | 复用 `getUserInfo / updateUser` |
| **P0** | `/account/talkies`（复用 `roleplay-create-list`） | 路由别名 |
| **P1** | `/account/chats`（聊天历史，**只读**，无删除） | 需先确认 conversations API 字段 |
| **P1** | `/account/security` + 重置密码邮件流程 | 新增 forgot/reset 路由 + 邮件模板 |
| **P1** | **改造 desktop sign-in/sign-up UI 为 Talkie 风格** | Q2 决策，不新增 mobile 路由 |
| **P2** | `/account/memories` 薄壳 | 链接跳详情页 |
| **P2** | `/account/billing` 最薄壳（credits 余额 + 跳 pricing） | Q4 决策，专项方案另立 |
| **P3** | 我的收藏 / 关注 / 已解锁照片 | 后端缺数据，先放占位 |
| **P3** | 聊天软删除（schema + UI） | Q3 决策推迟，等专项需求 |

---

## 7. 待用户拍板的决策点（已闭环）

| 编号 | 问题 | 决策 |
|------|------|------|
| Q1 | URL 用 `/account` 还是 `/me`？ | ✅ `/account` |
| Q2 | sign-in 页要不要在这一轮重做？ | ✅ 直接改 desktop sign-in/sign-up UI 为 Talkie 风格，不新增 mobile 路由 |
| Q3 | 聊天记录是否支持删除？ | ✅ 按现状以后再补，本期只读 |
| Q4 | 会员 / Credits 入口怎么做？ | ✅ 本期最薄壳（余额 + 跳 pricing），专项方案另立 |
| Q5 | 头像上传是否复用现有 `/api/upload`？ | 待定（建议默认是） |
| Q6 | 是否在 `users` 表加 `bio` 列？ | 待定（建议加，但可放 P2） |

---

## 8. 风险与依赖

- **better-auth 的 signOut 客户端配置**：需要在 `authClient` 上调用，不能直接 fetch；当前 nav drawer 是否已经接对，待 P0 任务里核实。
- **conversations API 返回字段**：可能需要 join `roleplay_characters` 拿到角色头像/名字。
- **邮件 transport**：`forget-password` 邮件依赖 better-auth 的 email hook，本地开发需要 mock 或 console.log。
- **R2 头像存储路径**：避免和角色立绘 key namespace 冲突，建议 `users/avatar/{userId}.png`。

---

## 9. 衔接 v2 redesign

本设计与 `roleplay-character-redesign-v2-plan.md` 收尾备忘第二批兼容。建议 plan 文档追加：

```
- [ ] A1：/account hub + signOut 闭环（P0）
- [ ] A2：/account/profile（P0）
- [ ] A3：/account/talkies 别名（P0）
- [ ] A4：/account/chats 只读列表（P1，依赖 conversations API 字段确认）
- [ ] A5：/account/security + 忘记密码邮件流（P1）
- [ ] A6：改造 desktop sign-in/sign-up UI 为 Talkie 风格（P1，Q2 决策）
- [ ] A7：/account/memories 薄壳（P2）
- [ ] A8：/account/billing 最薄壳（P2，Q4 决策）
- [ ] A9：聊天软删除 schema + UI（P3，Q3 决策推迟）
```

---

## 10. 下一步

1. ✅ Q1-Q4 已闭环（见 §7）。
2. **建议起点**：先做 A1 + A2 + A3，一个 PR 闭环（hub 首页 + profile + talkies 别名 + signOut）。
3. 同步把 P0 待办挪到 plan 文档主列表。
4. **同步立项**：会员 / Credits 专项方案（见 §11），不阻塞 account hub 主线。

### 10.1 复查状态（2026-05-26）

- `/account` hub 路由尚未实现；当前代码只有既有 `/settings/profile`、`/create`、`/settings/*` 等入口。
- 本轮已确认 `P1-1 User Persona` 已在 `/settings/profile` 落地，并已被 chat pipeline 消费；它覆盖本设计里 profile 的一部分，但不是完整 account hub。
- 下一步仍建议按 A1 + A2 + A3 启动：`/account` 首页、profile 入口整合、`/account/talkies` 别名。
- 会员 / Credits 仍需独立方案文档 `roleplay-billing-credits-design.md`，未启动。

---

## 11. 待办：会员 / Credits 专项方案（独立立项）

> 来源：用户 2026-05-25 拍板 Q4。
> 状态：未启动，待 account hub P0 完成后或并行启动。
> 输出物：`roleplay-billing-credits-design.md`（新文档）。

### 11.1 需要回答的核心问题

**初始额度**
- 注册即送多少 credits？（如 100、500、1000）
- 邮箱验证后是否再加赠？
- 邀请好友是否赠送？是否限次？

**消费规则**
- 文本聊天每条消息消费多少 credits？
- 是否按 LLM 模型分档？（如 gpt-4o-mini = 1/条，gpt-4o = 5/条，sonnet = 8/条）
- 语音消息（TTS）单独计费？
- 图片生成（私密照片、立绘重绘）单独计费？
- 长上下文（超过 N tokens）是否额外计费？
- 失败的请求是否退还？

**套餐分档**
| 档位 | 月费（建议待定） | 月度 credits | 特色权益 |
|------|-----------------|--------------|----------|
| Free Beta | $0 | X | 基础聊天，限标准模型 |
| Plus Beta | $? | Y | 高级模型、私密照片、语音 |
| Pro Beta | $? | Z | 优先模型、长上下文、更高图片配额 |

**续订与失效**
- credits 是否月度清零？
- 套餐到期后未消费的 credits 是否结转？结转上限多少？
- 退款规则（按比例退？不退？）。

**运营工具**
- 管理员能否手动加赠 / 扣减用户 credits？
- 能否查看用户的消费明细？
- 是否需要 promo code / 礼品卡机制？

### 11.2 现有积木盘点

- `/api/user/get-user-credits` 已有，但需要确认返回字段（余额？类型？过期时间？）。
- `[locale]/(landing)/settings/credits/` 已有 desktop 页面。
- `[locale]/(landing)/pricing/` 已有，但当前仅展示套餐，未必接入真实结账。
- `src/shared/services/credit.ts` / `src/shared/models/credit.ts`（待确认是否存在）：消费/赠送的 service 层入口。
- ShipAny 自带 Stripe 支付链路，订阅回调已经有（看 `payments / subscriptions` 后台页）。

### 11.3 实施分期（待方案落地后细化）

- B0：补完 credits 数据模型（如果欠缺过期时间、来源标记）。
- B1：聊天消费 hook（每次发送消息扣 credits，余额不足时拦截 + 弹付费引导）。
- B2：注册赠送 + 邮箱验证赠送。
- B3：Pricing 页接 Stripe Checkout（如未接）。
- B4：管理后台运营工具（手动加扣 + 明细查看）。
- B5：promo code / 礼品卡（可选）。

### 11.4 决策依赖（先收集再写方案）

| 编号 | 问题 | 谁来定 |
|------|------|--------|
| C1 | 初始赠送 credits 数量 | 产品 |
| C2 | 各模型每条消费成本 | 产品 + 工程（看 token 成本核算） |
| C3 | 套餐价格、分档名称 | 产品 |
| C4 | 是否区分文本/语音/图片计费 | 产品 |
| C5 | 月度 credits 是否清零 / 结转 | 产品（影响留存策略） |
| C6 | 是否支持年付折扣 | 产品 |
| C7 | 退款政策 | 产品 + 法务 |
