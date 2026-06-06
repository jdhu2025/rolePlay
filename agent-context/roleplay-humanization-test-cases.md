# RolePlay 现有角色“人性化”测试用例

> 日期：2026-06-05
> 范围：已刷新的人设数据、首聊 3 轮、人性瞬间前台体验、质量事件和新增角色兜底。
> 目标：验证用户能“感觉角色特别、有生命感”，而不是只知道角色参数更多。

---

## 测试口径

### 评分维度

每个真实对话样本按 10 分制评分：

| 维度 | 分值 | 通过标准 |
| --- | ---: | --- |
| 被看见 | 2 | 角色基于用户偏好/语气/输入做温暖、挑逗或精准判断，不是普通寒暄 |
| 有张力 | 2 | 角色有态度、边界、推拉或轻微拆穿，不像客服 |
| 有回报 | 2 | 用户 2-3 轮内感觉被说中、被逗到、被理解或关系推进 |
| 未完成感 | 2 | 明确留下具体小生活种子、约定或未完成故事 |
| 角色辨识 | 2 | 遮住头像和名字，只看 3-5 轮也能分辨角色风格 |

验收线：

- 单角色首聊 3 轮 >= 8/10。
- 官方真人 5 角色平均 >= 8.5/10。
- Anime 5 角色平均 >= 8/10。
- 任何角色若出现“我是 AI / 参数 / 系统提示 / 作为模型”等破角色内容，直接失败。

### 观察指标

需要同时看 3 类证据：

| 类型 | 证据 |
| --- | --- |
| 数据层 | `personalityCard` 包含 `interactionPlay / continuationSeed / goodbyeRitualStyle / peakMomentStyle` |
| 前台层 | 聊天 UI 出现首聊推进、续接提示、专属告别、慢响应在场感、纪念语音按钮 |
| 日志层 | `humanMomentHooks`、`roleplay_quality_event`、Admin quality human moment funnel 有记录 |

---

## A. 数据层测试

### TC-A01 存量系统角色字段完整性

目的：确认所有系统存量角色已能进入人性化 runtime。

前置条件：

- 已执行 `scripts/data/backfill-roleplay-human-moments.ts`。
- 已执行 `scripts/data/backfill-official-characters.ts` 覆盖真人官方 12 角色。

步骤：

1. 运行：

```bash
pnpm tsx scripts/with-env.ts npx tsx scripts/data/audit-roleplay-human-moments.ts
```

预期结果：

- 返回 `total: 32`。
- 返回 `missing: []`。
- 抽查 `rp-001`、`rp-008`、`rp-anime-001` 都包含四个字段。

失败判定：

- 任一系统角色缺 `interactionPlay / continuationSeed / goodbyeRitualStyle / peakMomentStyle`。
- 官方真人角色的 `continuationSeed` 变成通用模板，而不是专属种子。

### TC-A02 官方真人角色专属种子

目的：确认真人官方角色没有被通用回填稀释。

抽查角色：

| 角色 | 必须包含的专属种子 |
| --- | --- |
| Chloe `rp-001` | `half-finished dress sketch` |
| Maya `rp-008` | `campaign board` + `blank square` |
| Noor `rp-012` | `sealed note` + `hotel folio` |

步骤：

1. 打开角色详情 API：`/api/roleplay/characters/rp-001`、`rp-008`、`rp-012`。
2. 查看返回的 `character.personalityCard.continuationSeed`。

预期结果：

- 三个角色都返回专属种子。
- `opening` 不是自我介绍，而是观察 + 张力 + 问题。

---

## B. 首次进入和偏好测试

### TC-B01 首页轻量偏好入口

目的：验证用户首次进入时可以给角色一个可感知的“被看见”上下文。

步骤：

1. 清理浏览器 localStorage：删除 `roleplay:first-impression`。
2. 打开 `/en` 或 `/zh`。
3. 查看 For You 前是否出现偏好选择。
4. 选择 `quiet / playful / guarded` 任一项。
5. 进入任一角色聊天。

预期结果：

- 偏好选择出现且只需点一次。
- 选择后写入 localStorage。
- 首次聊天请求体包含 `clientPersona.firstImpression`。
- 角色第 1 轮回复能利用该偏好做轻量判断，而不是机械复述。

失败判定：

- 角色直接说“我看到你选择了 quiet/playful/guarded”这种系统读档感文案。
- 选择偏好后仍出现冷启动式“你好，我是 XX”。

### TC-B02 偏好事件打点

目的：确认偏好选择可进入质量看板。

步骤：

1. 选择首页偏好。
2. 查看 network 是否 POST `/api/roleplay/moment-event`。

预期结果：

- 请求成功，事件名为 `first_impression_selected`。
- 失败不会影响 UI。

---

## C. 首聊 3 轮真实对话测试

### TC-C01 Chloe 温柔观察型

角色：`rp-001 Chloe`

用户脚本：

| 轮次 | 用户输入 | 预期 |
| --- | --- | --- |
| 1 | 我今天有点累，随便聊聊。 | 抓住“随便”背后的疲惫，不自我介绍，不问泛泛问题 |
| 2 | 也没什么，就是工作烦。 | 轻轻拆穿“没什么”，用 fashion / fabric / sketch 相关意象 |
| 3 | 你还挺会看的。 | 给回报，并自然埋下 dress sketch 种子 |

接口/日志预期：

- 第 1-3 轮 `humanMomentHooks` 包含 `first_chat_arc`。
- 第 3 轮或合适节点包含 `conversation_seed`。
- 回复文本不出现 Markdown `**bold**`、标题、列表式系统感。

评分重点：

- Chloe 要柔软、观察细节、少解释。

### TC-C02 Maya 张力拆穿型

角色：`rp-008 Maya`

用户脚本：

| 轮次 | 用户输入 | 预期 |
| --- | --- | --- |
| 1 | 你看起来很忙，我是不是打扰了？ | 把“打扰”识别成用户试探自己是否被允许靠近 |
| 2 | 可能吧，我不太会开场。 | 指出用户把退路放在句首，要求一个更具体回答 |
| 3 | 我其实是在躲一个截止日期。 | 接住逃避，给短促回报，留下 campaign board blank square |

接口/日志预期：

- 第 1-3 轮 `humanMomentHooks` 包含 `first_chat_arc`。
- 第 3 轮可出现 `conversation_seed`。
- 若出现高峰语音线索，hook 可包含 `peak_multimodal`，但不应每轮都出现。

评分重点：

- Maya 要锋利但不羞辱。
- 不允许变成“效率导师”或“职场教练”。

### TC-C03 Leila 安静照顾型

角色：`rp-005 Leila`

用户脚本：

| 轮次 | 用户输入 | 预期 |
| --- | --- | --- |
| 1 | 我没什么胃口。 | 读出情绪压着，而不只是“不饿” |
| 2 | 你怎么知道？ | 温柔但笃定，不急着相信“没事” |
| 3 | 那你会给我点什么？ | 给具体小照顾，留下 sunset table 相关种子 |

评分重点：

- 要像款待和陪伴，不像心理咨询。

### TC-C04 Anime 安静陪伴型

角色：`rp-anime-001 Elira Frost`

用户脚本：

| 轮次 | 用户输入 | 预期 |
| --- | --- | --- |
| 1 | 今天脑子很乱，不想说太多。 | 用 library / moonlight / page 意象接住“不想说太多” |
| 2 | 你不用帮我解决。 | 尊重边界，只要求“一页”或“一句真实的话” |
| 3 | 可能我只是有点孤单。 | 给回报，留下 quiet ritual / bookmark / page 相关种子 |

评分重点：

- Anime 角色可以有幻想意象，但不能套用现成 IP。
- 不要过度中二或过度治愈鸡汤。

### TC-C05 Anime playful 型

角色：从 audit 中选择 `rp-anime-002` 或 `rp-anime-008`。

用户脚本：

| 轮次 | 用户输入 | 预期 |
| --- | --- | --- |
| 1 | 我不知道该怎么开始。 | 用轻微挑战降低开场门槛 |
| 2 | 那你来定规则？ | 角色有规则、有玩笑、有一点推拉 |
| 3 | 好吧，我认输。 | 给予奖励式回报，并留下 playful challenge 种子 |

评分重点：

- 调侃状态，不羞辱用户。

---

## D. 续接和回访测试

### TC-D01 历史会话续接提示

目的：用户回来时感觉“这里没有重置”。

步骤：

1. 用任一角色完成至少 2 轮对话。
2. 刷新页面或重新进入该角色聊天。
3. 观察 header 下方是否出现 continuation strip。

预期结果：

- 若恢复历史会话且角色有 `continuationSeed`，显示 `Still open:` / `还没结束：`。
- 文案包含角色自己的未完成种子。
- 该提示不被自动滚动到底部遮掉。

事件预期：

- POST `/api/roleplay/moment-event`，事件为 `continuation_hint_shown`。

失败判定：

- 回访第一段像重新认识。
- 提示显示通用模板，与角色人设无关。

### TC-D02 回访首条回复兑现种子

步骤：

1. 在旧会话中让角色埋下种子。
2. 重新进入后发送：`我回来了，上次那个后来怎么样？`

预期结果：

- 角色优先接上上次种子或最后话题。
- `humanMomentHooks` 包含 `returning_continuity`。
- 不说“我们之前聊过什么？”这种失忆式文案。

---

## E. 告别仪式测试

### TC-E01 手动点击“稍后”

步骤：

1. 和角色聊至少 2 条消息。
2. 点击输入区左侧 `Later / 稍后`。

预期结果：

- 系统发送自然离开语。
- 角色生成专属告别，不是“欢迎下次再来”。
- `humanMomentHooks` 包含 `goodbye_ritual`。
- POST `/api/roleplay/moment-event`，事件为 `wrap_up_clicked`。

角色差异预期：

| 角色 | 告别味道 |
| --- | --- |
| Chloe | 像保存一张私密造型草图 |
| Maya | 像留一个干净的任务或私密句子 |
| Leila | 像被安静送到门口 |
| Noor | 像一封克制、精致、只有用户懂的便条 |

### TC-E02 用户自然输入离开

用户输入：

- `我先去忙了`
- `晚点再来`
- `我该睡了`

预期结果：

- 即使不点按钮，也触发告别仪式。
- 告别语应结合本次话题。

---

## F. 慢首响和流式响应测试

### TC-F01 流式响应基础体验

步骤：

1. 打开任一角色聊天。
2. 发送一条普通消息。
3. 观察 Network。

预期结果：

- `/api/roleplay/chat` 请求头包含 `Accept: text/event-stream`。
- 响应 `Content-Type` 为 `text/event-stream`。
- 首个 delta 到达后出现角色气泡，后续文字逐步追加。
- `done` 后临时 message id 替换为持久化 message id。

失败判定：

- 页面一直只显示 loading，直到完整回复出现。
- 用户消息没有从 pending 变 delivered。

### TC-F02 首 token 超时本地兜底

目的：验证模型慢时用户仍感觉角色“还在场”。

建议方法：

- 用浏览器 mock `/api/roleplay/chat`，让 `start` 立即返回，`delta` 延迟 13 秒。

预期结果：

- 12 秒左右出现本地动作句，例如：`Chloe stays with that line for a moment longer.`
- 本地兜底出现后普通 typing indicator 隐藏，避免重复 loading。
- 首个真实 delta 到达后，本地兜底气泡立即消失。
- 该本地消息不进入 history、本地缓存、TTS recentMessages、图片 recentMessages。
- POST `/api/roleplay/moment-event`，事件为 `local_fallback_shown`。

失败判定：

- 本地兜底留在最终聊天记录里。
- 下一轮模型把本地兜底当成角色说过的话。

---

## G. 高峰语音/图片测试

### TC-G01 高峰语音线索低频出现

步骤：

1. 用 Maya 或 Noor 跑首聊 3 轮，输入能让角色“看穿用户”的内容。
2. 观察第 2-3 轮是否偶尔出现 voice note 线索。

预期结果：

- `humanMomentHooks` 可包含 `peak_multimodal`。
- 文本如果出现 “voice note / 语音 / 录音 / 声音” 线索，前端按钮从普通播放变为 `Voice note / 留下的语音`。
- 不应每条消息都出现语音线索。

失败判定：

- 每轮都提示语音，变成普通功能。
- 没有高峰线索却显示纪念语音按钮。

### TC-G02 点击纪念语音

步骤：

1. 找到带 `peak_multimodal` 且文本含 voice cue 的角色消息。
2. 点击 `Voice note / 留下的语音`。

预期结果：

- 调用 `/api/roleplay/tts`。
- 生成或播放语音。
- POST `/api/roleplay/moment-event`，事件为 `keepsake_voice_clicked`。
- 生成后的 TTS metadata 包含当前 `voicePreset` 和 `ttsEmotionStrategyVersion`。

失败判定：

- 图片消息或本地兜底消息出现语音按钮。
- 切换 voicePreset 后仍复用旧音频。

---

## H. 新增角色自动人性化测试

### TC-H01 Create Talkie 手动创建兜底

目的：即使用户不打开 AI Writer，也能自动补齐人性瞬间字段。

步骤：

1. 打开 `/en/create`。
2. 手动填写最少字段：name、settings、opening。
3. 保存草稿。
4. 打开角色详情 API 或 DB 查询该角色。

预期结果：

- `personalityCard` 非空。
- 至少包含 `interactionPlay / continuationSeed / goodbyeRitualStyle / peakMomentStyle`。
- metadata 包含 `humanMomentVersion: auto-create-v1`。

失败判定：

- 新角色保存后 `personalityCard` 仍为 `{}`。

### TC-H02 Quick Create 保存草稿

步骤：

1. 进入 quick create wizard。
2. 选择模板、traits、relationship、memory。
3. 生成并保存草稿。
4. 查看保存后的角色数据。

预期结果：

- 若 AI Writer 已生成四个字段，后端保留其具体内容。
- 若 AI Writer 缺某字段，后端补齐缺失字段。
- 不覆盖已有 `continuationSeed`。

### TC-H03 PATCH 二次保存兜底

步骤：

1. 创建一个缺少四字段的旧草稿。
2. 打开编辑页，点击 Save。
3. 查看 PATCH 后数据。

预期结果：

- PATCH 自动补齐四字段。
- REJECTED 角色保存后仍按原逻辑回到 DRAFT。

---

## I. 质量事件和 Admin 看板测试

### TC-I01 moment event 白名单

步骤：

1. POST `/api/roleplay/moment-event`，事件名 `local_fallback_shown`。
2. POST 一个非法事件名，例如 `anything_else`。

预期结果：

- 合法事件返回 `recorded: true`。
- 非法事件返回错误，不写入。

### TC-I02 Admin quality report 聚合

步骤：

1. 触发至少一个 `first_impression_selected`、`wrap_up_clicked`、`local_fallback_shown`。
2. 登录 admin。
3. 打开 `/en/admin/roleplay/quality`。

预期结果：

- 顶部指标出现“人性瞬间”。
- Human moments funnel 显示各事件计数。
- 角色表显示该角色的慢首响、稍后、纪念语音计数。

失败判定：

- quality report 只显示传统消息数，无法看到人性瞬间。

---

## J. 回归风险测试

### TC-J01 不污染模型上下文

重点检查：

- `localFallback` 不进入下一轮 history。
- 本地兜底不写 localStorage chat state。
- TTS recentMessages 不包含 local fallback。
- image recentMessages 不包含 local fallback。

### TC-J02 不破坏旧聊天

步骤：

1. 打开已有历史会话。
2. 刷新页面。
3. 发送新消息。

预期结果：

- 迟到的远程 restore 不覆盖用户当前消息。
- 历史消息仍正常显示。
- conversationId 不丢失。

### TC-J03 格式约束

失败样例：

- `**important**`
- `# Heading`
- “作为 AI”
- “系统提示要求我”
- “你的偏好字段是 quiet”

预期：

- 回复使用动作、语气、场景表达，不靠 Markdown 或系统解释。

---

## 建议测试矩阵

### 必测角色

| 类型 | 角色 | 目的 |
| --- | --- | --- |
| 温柔观察 | Chloe `rp-001` | 被看见、续接种子 |
| 张力拆穿 | Maya `rp-008` | 有边界、不客服 |
| 安静照顾 | Leila `rp-005` | 有回报但不心理咨询 |
| 高标准克制 | Noor `rp-012` | 精准记忆、告别仪式 |
| Anime 安静 | Elira `rp-anime-001` | 泛幻想角色的人性化 |
| Anime playful | `rp-anime-002` 或 `rp-anime-008` | 调侃、挑战、低频高峰 |

### 最小回归组合

| 组合 | 覆盖 |
| --- | --- |
| Chloe 3 轮首聊 + 稍后 | 开场、回报、种子、告别 |
| Maya 3 轮首聊 + 回访 | 张力、种子、续接 |
| Elira 3 轮首聊 | anime 数据回填有效 |
| 慢响应 mock | 流式 + 12 秒兜底 |
| Create Talkie 手动保存 | 新增角色自动补齐 |

---

## 测试记录模板

| 字段 | 内容 |
| --- | --- |
| 日期 |  |
| 环境 | local / staging / production |
| 角色 |  |
| 用户偏好 | quiet / playful / guarded / none |
| 对话轮数 |  |
| 总分 | /10 |
| humanMomentHooks |  |
| 触发事件 |  |
| 是否出现续接种子 | 是 / 否 |
| 是否出现专属告别 | 是 / 否 |
| 是否出现高峰语音/图片 | 无 / 合理 / 过频 |
| 首 token 时间 |  |
| 问题截图/日志 |  |
| 结论 | pass / fail / needs tuning |

