# RolePlay 首次体验短剧化产品落地计划

> 日期：2026-06-12
> 目标：把首次体验从“用户自己挑角色然后试聊”升级为“被看见、被牵引、被留下”的短剧式进入流程。
> 核心判断：用户不会因为功能说明留下，而是因为第一次 1-3 分钟内产生了私人化心理反应：这个地方好像知道我一点、这个角色不像普通 AI、这段关系还没结束。
> 实施状态：进行中
> 实施约束：遵守开闭原则；保留既有 `FirstMomentPreference`、推荐、首聊、续接、告别能力，通过新增 helper / component / event 扩展接入，不做重写式替换。

---

## 0. 状态和日志

| 时间 | 状态 | 记录 |
| --- | --- | --- |
| 2026-06-12 | doing | 开始实现首次体验短剧化二期；用户明确要求“原来不要改动，只是增加功能”，本轮按新增扩展层实施。 |
| 2026-06-12 | done | 新增 `roleplay-first-experience` helper 和两个检查脚本；先跑 RED，确认缺模块/缺 ranker 后实现，`pnpm tsx scripts/check-first-experience.ts` 通过。 |
| 2026-06-12 | done | 首页新增 `FirstExperienceDirector`，放在 For You 前；保留旧 `FirstMomentPreference` 作为兜底，并用 session flag 避免首次进入时两条偏好入口同时出现。 |
| 2026-06-12 | done | 推荐接口和 client fetch 增加可选 `firstImpression`，仅在有选择时重排结果；原 recent/private/popular bucket 逻辑保持不变。 |
| 2026-06-12 | done | moment event 白名单和质量统计并入首次体验 funnel 事件；旧 `first_impression_selected / continuation_hint_shown / wrap_up_clicked` 等事件保持兼容。 |
| 2026-06-12 | done | 聊天页新增 `FirstExperienceSceneNote`，基于既有 `humanMomentHooks` 展示一次悬念/告别盖章提示，并记录 `seed_revealed / goodbye_stamp_shown / first_chat_*` 事件；未改生成逻辑。 |
| 2026-06-12 | verified | `pnpm tsx scripts/check-first-experience.ts`、`pnpm tsx scripts/check-first-experience-integration.ts`、`pnpm exec tsc --noEmit` 均通过；定向 eslint 0 errors，仅脚本 ignore warning 和既有 baseline-browser-mapping 提示。 |
| 2026-06-12 | verified | 浏览器验证 `http://localhost:3000/en`：新 director 出现，点击 `Keep it light` 后显示含蓄反馈，For You 保持可见，旧偏好条未同时出现；`/en/chat/profile/rp-001` 可正常加载历史聊天和 Later 入口。 |
| 2026-06-12 | fixed | 复测“你在干嘛”时定位到聊天主链路的部分 DB 写操作缺少 transient retry；已给创建会话、写消息、更新会话状态/记忆、角色计数、质量事件写入补 `withTransientDatabaseRetry`，并新增 `scripts/check-roleplay-db-retry.ts` 防回退。 |
| 2026-06-12 | verified | 修复后浏览器再次发送“你在干嘛”，页面未出现 `Database connection was interrupted` 或 `Could not get a reply`，Chloe 正常回复并接上未完成草图种子。bb-browser CLI 仍因 daemon 初始化超时无法读取，但 in-app browser 已确认页面结果。 |
| 2026-06-12 | fixed | 用户提供后台事实日志：`failed to dial to edge with quic: timeout: no recent network activity`，更像 tunnel/edge 网络链路超时；同时发现聊天错误归类层把任意 `timeout` 都显示成 `Database connection was interrupted`。已新增 DB 重试内部标记，聊天 API 仅对标记过的 DB 错误显示数据库中断，其它 QUIC/tunnel/edge/timeout 显示 `Network connection was interrupted. Please retry in a moment.`，避免误导排障。 |
| 2026-06-12 | done | 新增关系回流链路：聊天页、RolePlay toast、AI Writer 在触发登录/注册/付费 gate 前保存当前关系地址并附带 `callbackUrl`；登录页/注册页切换和放弃入口保留原关系地址；pricing/checkout 将 `callbackUrl` 写入订单，支付成功 `payment/callback` 沿用订单 callback 回到原聊天页，支付取消也回原处。新增 `scripts/check-roleplay-return-flow.mjs`，并通过 `node scripts/check-roleplay-return-flow.mjs`、`pnpm exec tsc --noEmit`、定向 eslint。 |

## 1. 当前基础

项目已经具备一版“人性瞬间”基础，不需要推倒重做。

已存在能力：

- 首页 For You 推荐区：`src/shared/components/roleplay/roleplay-landing.tsx`
- 首页轻量偏好选择：`FirstMomentPreference`
- 用户 persona 存储：`src/shared/lib/roleplay-user-persona.ts`
- 推荐接口：`src/app/api/roleplay/recommendations/route.ts`
- 首聊 3 轮短剧 prompt：`src/app/api/roleplay/chat/route.ts`
- 聊天页续接提示：`RoleplayChat`
- 稍后告别入口：`RoleplayChat`
- 慢首响本地在场反馈：`RoleplayChat`
- 高峰语音/图片 hook：`humanMomentHooks`
- 前台人性瞬间打点：`src/shared/lib/roleplay-moment-events.ts`
- Admin 质量看板：`src/shared/components/roleplay/roleplay-quality-console.tsx`

当前缺口：

- 首页偏好选择在 For You 之后出现，心理顺序弱，用户先看到“商品货架”，再看到“你是谁”。
- 偏好只有 3 个静态选项，缺少“被识别”的反馈句。
- 推荐排序没有把首次偏好即时纳入匿名用户 For You。
- 聊天开场、3 轮首聊、离开仪式已有，但前台没有统一展示“这是你的第一幕/还有一件事没讲完”的导演层。
- 质量事件能记录点状行为，但缺少完整 funnel：曝光、选择、进聊、首轮回复、三轮完成、告别、回访。

---

## 2. 产品原则

1. 不做问卷，只做一个像剧情选择一样的轻动作。
2. 不解释功能，让角色和界面用行为证明“你被看见了”；前台文案不要直接说“被看见、被重视、被注意”。
3. 不给用户太多角色，首次只给 3 个“为你安排”的候选。
4. 不把悬念做成任务，悬念必须来自角色自己的生活、秘密、未完成小物件或未说完的话。
5. 不把告别做成退出确认，告别要像一次关系盖章。
6. 不要求登录后才有私人化，匿名用户也要先体验到差异；登录只是保存这段关系。

---

## 3. 首次体验总流程

### 第一幕：不说破的识别

触发：新用户进入首页，且没有 `roleplay:first-experience` 或服务端 persona。

前台体验：

- 首屏顶部不再直接压完整营销 H1。
- 先出现一个自然的三选一短句区，问的是“怎么开始”，不暴露后台的个性化识别意图。
- 用户选择后，立即显示一句识别反馈。
- For You 从“通用推荐”变成“基于刚才选择的 3 个角色”。
- “被看见”是后台设计目标，前台只让用户感觉：这个产品没有把我当普通流量。

示例：

| 选择 | 用户潜台词 | 识别反馈 | 推荐倾向 |
| --- | --- | --- | --- |
| 不想解释太多 | 我累了，不想把自己讲清楚 | “那今晚就不用把话说完整。” | 温柔、疗愈、慢热 |
| 想轻松一点 | 我想松口气，不想被教育 | “好，先把沉重的东西放门口。” | playful、调侃、轻推拉 |
| 想遇到一点阻力 | 我想要张力，不想要标准答案 | “明白。今晚不给你太容易的答案。” | guarded、高标准、冷感 |

### 第二幕：故事还没完

触发：用户点进角色聊天并完成第 1-3 轮。

前台体验：

- 第 1 轮：角色基于偏好和用户第一句做判断，不自我介绍。
- 第 2 轮：角色轻推用户，不无条件讨好。
- 第 3 轮：角色给情绪回报，并埋一个未完成种子。
- 第 3 轮回复后，聊天页顶部出现轻提示：`还没结束：{continuationSeed}`。

原则：

- 悬念不是“明天记得回来”，而是“她工作室那块空白板还没解释”。
- 提示只展示一次，避免像任务系统。
- 如果用户继续聊，不打断；如果用户离开，种子进入回访承接。

### 第三幕：这段时光被盖章

触发：用户点击“稍后”、输入离开意图、或首聊 3 轮后静默 30-60 秒。

前台体验：

- 输入区左侧的“稍后”升级为更有仪式感的轻按钮。
- 点击后发送自然离开语，后端生成专属告别。
- 告别后出现一条低调保存提示：`这段关系已替你留住。`
- 匿名用户看到登录引导，但文案围绕“保存这段关系”，不是“注册账号”。

---

## 4. 功能拆解

### P1：首页导演层

修改文件：

- `src/shared/components/roleplay/roleplay-landing.tsx`
- `src/config/locale/messages/en/roleplay.json`
- `src/config/locale/messages/zh/roleplay.json`

新增组件：

- `FirstExperienceDirector`
- `FirstExperienceChoice`
- `FirstExperienceReveal`

行为：

- 替代当前 `FirstMomentPreference` 的位置，放到 For You 之前。
- 检测 `localStorage['roleplay:first-experience']`。
- 未选择时展示 3 个剧情式选择。
- 选择后写入：
  - `roleplay:first-impression`
  - `roleplay:first-experience`
  - `roleplay:first-experience-selected-at`
- 选择后调用 `/api/roleplay/user-persona` 保存。
- 选择后刷新推荐区或给推荐接口传 `firstImpression`。

验收：

- 首次进入 3 秒内能看到“我和别人不同”的选择。
- 选择后不是直接消失，而是给一句识别反馈。
- 移动端不挤压角色卡，选项不溢出。

### P2：首次推荐重排

修改文件：

- `src/app/api/roleplay/recommendations/route.ts`
- `src/shared/lib/server/roleplay-home-data.ts`
- `src/shared/lib/roleplay-client.ts`

新增逻辑：

- `firstImpression=quiet|playful|guarded`
- 匿名请求也能根据 query 参数重排推荐。
- quiet 优先：healing、warm、companion、soft、memory 相关角色。
- playful 优先：play_fun、dating、teasing、light 相关角色。
- guarded 优先：cool、mysterious、high-standard、tension 相关角色。
- 保留 popular 兜底，避免推荐为空。

验收：

- 选择不同偏好，For You 前 3 个角色不同。
- 推荐接口返回 `buckets.firstImpression`，方便看排序来源。
- 未选择偏好时保持现有推荐逻辑。

### P3：首聊导演状态

修改文件：

- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/app/api/roleplay/chat/route.ts`
- `src/shared/lib/roleplay-chat-storage.ts`

新增状态：

- `firstExperienceStage`: `opening | turn_1 | turn_2 | turn_3 | seed_planted | goodbye_stamped | returning`
- 写入消息 metadata 或本地会话状态。

前台表现：

- 首聊前 3 轮不显示进度条，不显示任务式 UI。
- 只在关键瞬间显示一句小型状态：
  - 第 1 轮后：`她听见了你的开场方式。`
  - 第 3 轮后：`还没结束：{seed}`
  - 告别后：`这段关系已留住。`

验收：

- UI 不像 onboarding checklist。
- 用户可以忽略这些提示继续聊天。
- 刷新后不会重复展示已看过提示。

### P4：悬念种子前台化

修改文件：

- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/shared/lib/roleplay-personality.ts`

现有字段：

- `personalityCard.continuationSeed`

新增前台使用规则：

- 第 3 轮后展示一次 `continuationSeed`。
- 回访时继续展示现有 continuation strip。
- 如果角色回复实际没有自然提到 seed，不强行展示，避免前台和内容割裂。

验收：

- 悬念来自角色内容，不像系统硬塞。
- 同一 conversation 同一 seed 只曝光一次。
- 后台事件记录 `seed_revealed`。

### P5：专属告别仪式增强

修改文件：

- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/app/api/roleplay/chat/route.ts`
- locale 文案文件

新增行为：

- 首聊 3 轮后，如果用户 45 秒没有输入，在输入区上方出现轻提示：`要先把这一幕收好吗？`
- 用户点击后触发现有 `wrap_up_message`。
- 告别回复成功后，显示保存关系提示。
- 匿名用户提示：`保存这段关系，下次她会接着说。`

验收：

- 不自动发送离开消息，必须用户点击。
- 提示出现不遮挡输入框。
- 登录引导不打断已经生成的告别。

### P6：完整漏斗埋点

修改文件：

- `src/shared/lib/roleplay-moment-events.ts`
- `src/app/api/roleplay/moment-event/route.ts`
- `src/shared/models/roleplay-quality.ts`
- `src/shared/components/roleplay/roleplay-quality-console.tsx`

新增事件：

- `first_experience_exposed`
- `first_experience_selected`
- `first_experience_reveal_shown`
- `first_experience_recommendation_clicked`
- `first_chat_started`
- `first_chat_turn_1_completed`
- `first_chat_turn_3_completed`
- `seed_revealed`
- `goodbye_stamp_shown`
- `save_relationship_prompt_shown`
- `save_relationship_clicked`
- `returning_seed_resumed`

核心漏斗：

1. 首页首次体验曝光
2. 偏好选择
3. 推荐角色点击
4. 首条用户消息
5. 角色首轮回复完成
6. 三轮完成
7. 悬念曝光
8. 告别仪式
9. 回访续接

验收：

- Admin 可以看到整体转化率和角色维度转化。
- 可以定位流失在“没选择”“没点角色”“首响慢”“三轮没完成”哪一步。

---

## 5. 文案方向

中文：

- 首屏引导：`先选一个今晚的开场。`
- 安静：`不想解释太多`
- 轻松：`想轻松一点`
- 张力：`想遇到一点阻力`
- 识别反馈：
  - `那今晚就不用把话说完整。`
  - `好，先把沉重的东西放门口。`
  - `明白。今晚不给你太容易的答案。`
- 悬念提示：`还没结束：`
- 告别提示：`要先把这一幕收好吗？`
- 保存提示：`这段关系已替你留住。`

英文：

- Prompt: `Choose the way in.`
- Quiet: `No need to explain much`
- Playful: `Keep it light`
- Guarded: `Make it less easy`
- Reveal:
  - `Then you do not have to make the whole thing tidy.`
  - `Good. Leave the heavy parts at the door for a minute.`
  - `Understood. No easy answers tonight.`
- Seed: `Still open:`
- Goodbye: `Close this scene for now?`
- Save: `This thread is saved for next time.`

---

## 6. 数据结构

LocalStorage：

```json
{
  "roleplay:first-impression": "quiet",
  "roleplay:first-experience": "{\"choice\":\"quiet\",\"revealShown\":true,\"seedShownByConversation\":{},\"goodbyeStampedByConversation\":{}}",
  "roleplay:first-experience-selected-at": "2026-06-12T00:00:00.000Z"
}
```

Persona：

```json
{
  "firstImpression": "The user chose quiet, attentive companionship for the first meeting."
}
```

Chat message metadata：

```json
{
  "firstExperienceStage": "seed_planted",
  "humanMomentHooks": [
    { "type": "conversation_seed", "label": "Continuation seed", "detail": "..." }
  ]
}
```

---

## 7. 实施顺序

### 第 1 天：入口改造

- 把 `FirstMomentPreference` 升级为 `FirstExperienceDirector`。
- 调整位置到 For You 之前。
- 增加选择后的 reveal 状态。
- 加 locale 文案。
- 加曝光、选择、reveal 打点。

### 第 2 天：推荐联动

- 推荐接口支持 `firstImpression`。
- 客户端选择后刷新 For You。
- 推荐返回 bucket 信息。
- 验证三种选择的前三个角色差异。

### 第 3 天：聊天导演层

- 聊天页读取 first experience 状态。
- 第 1 轮、第 3 轮、seed、goodbye 后展示轻提示。
- 避免重复展示和刷新倒带。
- 添加对应打点。

### 第 4 天：告别和保存关系

- 首聊 3 轮后增加静默提示。
- 优化 wrap-up 入口文案。
- 匿名用户在告别后看到保存关系提示。
- 登录用户只显示保存成功感，不打扰。

### 第 5 天：质量看板和 QA

- Admin 增加首次体验 funnel。
- 增加角色维度首聊完成率。
- 补测试用例。
- 跑真实角色手测：Chloe、Maya、Leila、Elira、Noor。

---

## 8. 验收标准

产品体验：

- 新用户进入 3 秒内知道“这里会按我的状态安排角色”。
- 用户选择后 1 秒内得到识别反馈。
- 首次推荐前 3 个角色随选择变化。
- 首聊第 1 轮不自我介绍。
- 首聊第 3 轮能感到“故事还没完”。
- 离开时有专属告别，不是普通 goodbye。
- 回访时能接上 seed 或最后话题。

技术质量：

- `pnpm exec tsc --noEmit` 通过。
- 相关组件 eslint 无新增错误。
- 首页和聊天页移动端无溢出。
- moment event 失败不影响 UI。
- 未登录、已登录、接口失败三种场景都有兜底。

数据指标：

- 首次选择率目标：30% 以上。
- 选择后角色点击率目标：20% 以上。
- 首聊首轮完成率目标：60% 以上。
- 首聊三轮完成率目标：25% 以上。
- 三轮后 24 小时回访率比当前基线提升 15% 以上。

---

## 9. 风险和边界

- 风险：过度“识别”会让用户觉得被系统窥探。
  - 控制：只基于用户主动选择和输入，不暗示读取隐私。
- 风险：首页变复杂影响浏览效率。
  - 控制：首次体验只对新用户出现，选择后收起。
- 风险：剧情提示像任务系统。
  - 控制：不显示 checklist，不显示进度，只在关键瞬间露一句。
- 风险：推荐重排过强导致角色池变窄。
  - 控制：只影响前 3-6 个角色，后续仍混入 popular。
- 风险：告别提示打断沉浸。
  - 控制：只在首聊 3 轮后静默出现，不自动发送。

---

## 10. 最小可上线版本

如果只做一周内能上线的最小版本，优先级如下：

1. 首页首次体验导演层：选择 + 识别反馈。
2. 推荐接口按选择重排前 3 个角色。
3. 聊天第 3 轮后展示 `还没结束：{seed}`。
4. 告别后显示 `这段关系已替你留住。`
5. Admin 增加首次体验 funnel。

这 5 件事完成后，产品会从“角色列表 + 聊天工具”变成“第一次来就被安排了一段私人开场”的体验。
