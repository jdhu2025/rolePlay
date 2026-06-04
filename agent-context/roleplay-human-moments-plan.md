# RolePlay 人性瞬间角色优化计划

> 状态：v1（2026-06-03 起草并开始实现）
> 目标：不追求让用户相信角色“真的活着”，而是在首次 3 分钟内让用户产生清晰心理反应：被看见、有张力、有回报、故事没完。
> 核心判断：用户不是因为角色参数丰富而留下，而是因为第一次聊完后觉得“这个角色有点意思，我想再试几句”。

---

## 人性里的 4 个按钮

| 按钮 | 用户感受 | 角色前台表现 |
| --- | --- | --- |
| 被看见 | “它注意到我了” | 基于轻量偏好、语气或公开信息做一个温暖/挑逗/精准的猜测 |
| 有张力 | “它不是客服式 AI” | 不无条件讨好，有态度、有边界、有一点推拉 |
| 有回报 | “它说中了/逗到我/懂我了” | 2-3 轮内给出情绪命中、调侃、认可或关系推进 |
| 未完成感 | “我想知道后来怎样” | 留下一个小生活悬念、小约定或下次可兑现的种子 |

---

## 首次体验短剧

| 阶段 | 目的 | 前台瞬间 |
| --- | --- | --- |
| 开场 10 秒 | 被看见 | “哦？猫派的人来了啊。我猜你今天想要一点安静的陪伴？” |
| 首聊第 1 轮 | 识别用户 | 角色基于偏好/语气做一个轻判断，不说“你好，我是 XX” |
| 首聊第 2 轮 | 制造张力 | 角色轻轻推用户一下，例如拆穿“还好” |
| 首聊第 3 轮 | 给回报并埋种 | 角色命中情绪后留下一个未完成的小生活钩子 |
| 首次离开 | 关系盖章 | 根据本次聊天生成专属告别仪式 |
| 二次回访 | 兑现记忆 | 第一段回复接上上次未完成种子或最后话题 |
| 高峰时刻 | 放大记忆点 | 只在第一次被看穿、第一次告别、第一次回来兑现时提示“她留下了一条语音/照片” |

---

## 待办列表

### P0：重写所有角色开场白

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P0-1 | ✅ done | 官方真人 12 角色 opening 全部改成“观察 + 张力 + 问题”，不再自我介绍 |
| P0-2 | ✅ done | AI Writer opening 规则升级：必须在 10 秒内制造“被看见”的感觉，禁止自我介绍式开场 |

验收：用户 10 秒内愿意回第一句。

### P1：每个角色设计互动玩法

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P1-1 | ✅ done | `personalityCard` 新增 `interactionPlay`，定义角色的核心互动乐趣 |
| P1-2 | ✅ done | 官方真人 12 角色回填互动玩法、未完成种子、告别仪式和高峰时刻 |

验收：遮住头像和名字，只看 3-5 轮对话，也能分辨角色。

### P2：首聊 3 轮强引导

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P2-1 | ✅ done | chat runtime 注入首聊 3 轮短剧提示：被看见 → 张力/命中 → 回报/埋种 |
| P2-2 | ✅ done | 用 5 个真实官方角色做低消耗首聊脚本 QA，详见 `agent-context/roleplay-first-chat-qa-report.md` |
| P2-3 | ✅ done | Maya 真实小样本通过：第 1、2、3 轮分别返回 `first_chat_arc`，第 3 轮干净复测返回 `conversation_seed` |
| P2-4 | ✅ done | 首聊等待体验优化：首聊 3 轮回复预算从 420 token 收到 300 token；前端 thinking 升级为三阶段在场反馈 |
| P2-5 | ✅ done | 已接入 SSE 流式响应：后端 `stream: true` 边生成边发 `delta`，前端边读边更新角色气泡；下一层可继续评估更快模型路由 |
| P2-6 | ✅ done | 首聊快速模型路由：新增可选 `roleplay_fast_model / ROLEPLAY_FAST_MODEL`，首聊前 3 轮优先使用 fast model；未配置时保持默认模型 |
| P2-7 | ✅ done | 首聊速度监控：记录 `firstChatTurn / firstTokenMs / generationMs / streamed / firstChatFastModel`，用于判断慢点来自模型首 token 还是总生成 |
| P2-8 | ✅ done | 首 token 超时兜底：若 12 秒仍未收到首个 `delta`，前端临时展示一句角色“在场”的本地过渡动作；真实回复开始后立即移除，不写入历史、缓存、TTS 或图片上下文 |

验收：首聊 3 轮后，用户感觉“这不是普通 AI 问答”。

### P3：首次进入轻量偏好问题

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P3-1 | ✅ done | 首页 For You 前加入 1 个轻量偏好选择：“今晚，你更想遇到谁？” |
| P3-2 | ✅ done | 将答案写入 user persona；未登录/未同步时走 localStorage 并随聊天请求传入 |

验收：用户感觉角色“注意到了我”，不是系统机械读取资料。

### P4：专属告别仪式

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P4-1 | ✅ done | chat runtime 检测离开/晚安/去忙等意图，生成一次专属告别 |
| P4-2 | ✅ done | 聊天输入区补轻量“稍后再聊”入口，点击后发送自然离开语触发专属告别 |

验收：首次离开时，用户感觉这次聊天“有主题、有记忆点”。

### P5：二次回访兑现钩子

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P5-1 | ✅ done | chat runtime 在回访时优先接上上次种子、最后话题或角色小生活 |
| P5-2 | ✅ done | 前端进入聊天页时，若恢复到历史会话且角色有未完成种子，展示轻量续接提示 |

验收：用户明显感觉“这里不是重置的”。

### P6：高峰时刻语音/图片强化

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P6-1 | ✅ done | chat runtime 只在首次被看穿、首次告别、首次回访兑现等高峰时刻提示语音/图片 |
| P6-2 | ✅ done | 高峰回复若出现“留下语音”线索，前端将普通播放按钮升级为“Voice note / 留下的语音”纪念按钮；仍由用户点击后生成 TTS，避免每条自动消耗 |

验收：语音/图片像纪念品，而不是普通功能。

### P7：人性瞬间可观测性

| 任务 | 状态 | 说明 |
| --- | :---: | --- |
| P7-1 | ✅ done | 新增 `/api/roleplay/moment-event`，用现有 `roleplay_quality_event` 记录前端人性瞬间，事件名走白名单 |
| P7-2 | ✅ done | 首页偏好选择、续接提示展示、稍后告别点击、首 token 慢兜底展示、纪念语音点击接入非阻塞打点 |

验收：后续能看出用户被哪个瞬间吸引、在哪个等待点流失，而不是只看总消息数。

---

## 操作日志

| 日期 | 记录 |
| --- | --- |
| 2026-06-03 | 创建计划文档，确认首聊强引导从 5 轮收敛为 3 轮。 |
| 2026-06-03 | 开始实现 P1/P2/P4/P5/P6 的轻量 runtime 版本：先复用 `personalityCard` JSON 和 chat prompt，不新增 DB migration。 |
| 2026-06-03 | 完成第一批实现：`personalityCard` 增加 `interactionPlay / continuationSeed / goodbyeRitualStyle / peakMomentStyle`；AI Writer schema 和 quick-create 示例同步生成；chat runtime 新增 `[first_chat_3_turn_arc]`、`[goodbye_ritual]`、`[returning_continuity]`、`[peak_moment_multimodal]`，并写入 `humanMomentHooks` 与质量事件。`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）。 |
| 2026-06-03 | 刷新旧官方真人角色：`scripts/data/backfill-official-characters.ts` 为 rp-001 至 rp-012 补专属 human moment profile，并实际回填数据库；刷新前快照见 `scripts/data/backfill-snapshot-2026-06-03T09-09-43-152Z.json`。抽查 rp-001 / rp-008 / rp-012 确认新 opening、`interactionPlay`、`continuationSeed` 已落库。 |
| 2026-06-03 | 完成 P3 首次偏好入口：扩展 `RoleplayUserPersona.firstImpression`；新增 `/api/roleplay/user-persona` GET/POST；首页新增轻量选择条；聊天请求携带本地 persona，后端对登录和未登录用户都可注入首聊上下文。 |
| 2026-06-03 | P3 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）；浏览器打开 `http://localhost:3000/en`，确认选择条出现在 For You 前、点击后进入 Saved 并自动收起，console 无错误。 |
| 2026-06-03 | 完成 P4-2：聊天输入区新增轻量 wrap-up 动作，文案为 “Later / 稍后”，点击后发送自然离开语，让后端 `[goodbye_ritual]` 生成专属告别；避免用户必须手动输入“晚安/先走了”。 |
| 2026-06-03 | P4-2 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（JSON locale 文件按配置被忽略，非错误）；浏览器打开 `/en/chat/profile/rp-001`，确认有历史消息时输入区左侧显示 wrap-up 按钮，aria label 正常，未发现 console error。 |
| 2026-06-03 | 完成 P5-2：聊天页恢复历史时，在消息流顶部显示轻量 continuation strip，例如 “Still open: a half-finished dress sketch...”，让回访感不是只靠历史消息列表。 |
| 2026-06-03 | P5-2 验证：刷新 `/en/chat/profile/rp-001`，确认 continuation strip 固定显示在 header 下方，不会被自动滚动到底部逻辑滚走；wrap-up 按钮仍在输入区左侧；console 无错误。 |
| 2026-06-03 | 完成 P6-2：`/api/roleplay/chat` 返回 `emotionalHooks / humanMomentHooks`；前端把 hooks 写入消息 metadata；当 `peak_multimodal` 回复文本实际包含 voice note / 语音线索时，播放按钮显示为更醒目的 “Voice note / 留下的语音” keepsake 状态，点击后复用现有 TTS 生成与缓存链路。 |
| 2026-06-03 | 完成 P0-2 收口：AI Writer opening 硬规则补充“first 10 seconds feel noticed”，并明确禁止自我介绍式开场；生成角色时优先产出观察、情绪猜测和可回复钩子。 |
| 2026-06-03 | P6-2 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）；浏览器刷新 `/en/chat/profile/rp-001` 普通聊天页无运行错误。未主动触发真实高峰回复，以避免额外消耗模型/语音额度；keepsake 状态已通过 hooks 写入、文本线索检测和 UI 分支静态验证。 |
| 2026-06-03 | 聊天输入框补 `id/name`，改善表单语义；浏览器剩余表单字段提示来自页面其它输入，不影响本次聊天改动。 |
| 2026-06-03 | 最终浏览器回归：强刷 `/en/chat/profile/rp-001` 后 console 无消息；空会话态、输入框、发送按钮渲染正常。 |
| 2026-06-03 | 完成 P2-2 低消耗手测：新增 `agent-context/roleplay-first-chat-qa-report.md`，用 Chloe / Sienna / Leila / Maya / Noor 五个真实官方角色做首聊 3 轮脚本 QA，按“被看见 / 张力 / 回报 / 未完成感 / 角色辨识”评分，平均 9.6/10；真实 LLM 小样本拆到 P2-3。 |
| 2026-06-03 | P2-3 真实测试发现断点：聊天页优先使用本地 official fallback，覆盖了 DB 刷新后的 `personalityCard` 和新 opening，导致 `/api/roleplay/chat` 收不到人性瞬间字段；已修为 API 角色优先、本地角色仅兜底。 |
| 2026-06-03 | P2-3 Maya 第 1 轮复测通过：请求体包含完整 `personalityCard`，响应返回 `humanMomentHooks: first_chat_arc`；文本抓住用户怕打扰的状态，有角色张力。第 2 轮请求结构正确但长时间 pending，记录为首聊等待体验风险，未继续第 3 轮。 |
| 2026-06-03 | P2-3 继续复测：Maya 第 2 轮返回 `first_chat_arc`，文本有张力但出现 `**linger**` Markdown 加粗痕迹；chat 系统格式规则已改为禁止 Markdown bold/headings，强调必须通过语气和动作完成。 |
| 2026-06-03 | P2-3 第 3 轮暴露历史 race：迟到的远程历史恢复覆盖了当前消息流，导致第 2 轮用户消息丢失，后端误判仍是第 2 轮；聊天页新增 `userInteractedRef`，用户开始发送后不再允许加载中的远程恢复倒带当前对话。 |
| 2026-06-03 | P2-3 第 3 轮干净复测通过：用 Maya DB 角色和正确 2 轮历史直接调用 chat API，响应返回 `first_chat_arc` 第 3 轮、`conversation_seed` 和 `peak_multimodal` 候选；文本自然提到 campaign board 的 blank square。耗时约 27.9s，新增 P2-4 跟进首聊等待体验。 |
| 2026-06-03 | 完成 P2-4：后端首聊 3 轮 `maxOutputTokens` 从 420 收到 300，并在首聊提示中要求 45-90 words 的短而准回复；前端 pending indicator 改为三阶段文案：caught that / choosing the line carefully / still here。 |
| 2026-06-03 | P2-4 浏览器验证：Maya 首聊发送后依次出现 “Maya caught that.”、“Maya is choosing the line carefully.”、“Maya is still here, taking a little longer.”；布局未溢出。该测试请求仍长时间 pending，已刷新中止，记录为 P2-5：供应商首 token / 模型路由问题。 |
| 2026-06-03 | 完成 P2-5 流式响应：`/api/roleplay/chat` 支持 `stream: true`，返回 `text/event-stream`，事件包含 `start / delta / done / error`；OpenAI-compatible direct provider 走原生 SSE，AI SDK provider 走 `streamText().textStream`。 |
| 2026-06-03 | P2-5 前端接入：普通发送改为 `generateRoleplayReplyStream`，首个 `delta` 到达时插入临时角色气泡，后续 token 追加，`done` 后替换为持久化后的 message id、hooks、billing、conversationId；图片 holding reply 也支持走流式事件。 |
| 2026-06-03 | P2-5 浏览器验证：Maya 首聊请求头为 `Accept: text/event-stream`，响应为 `Content-Type: text/event-stream; charset=utf-8`；页面最终显示角色回复，用户消息变 delivered，console 无运行错误。当前 provider 仍可能首 token 较慢，后续如需进一步提速应做快速模型路由。 |
| 2026-06-03 | 完成 P2-6：新增 Admin AI 设置 `roleplay_fast_model`，并支持 env `ROLEPLAY_FAST_MODEL`；chat route 在首聊前 3 轮、且未指定 request/character model 时，把 provider candidates 的 model 覆盖为 fast model，响应 `routing.firstChatFastModel` 便于观测。 |
| 2026-06-03 | P2-6 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）。未配置 fast model 时路由不启用，保持原默认模型行为。 |
| 2026-06-04 | 完成 P2-7：`character_reply_generated` 质量事件 metadata 增加 `firstChatTurn / firstTokenMs / generationMs / streamed / firstChatFastModel`；chat 响应也返回 `timing`，方便前端或日志观察首聊速度。 |
| 2026-06-04 | P2-7 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）。 |
| 2026-06-04 | 完成 P2-8：聊天页在流式首 token 超过 12 秒未到时插入 `localFallback` 角色动作句，例如 “Chloe stays with that line for a moment longer.”；首个真实 delta 或请求结束会清理该本地消息，并隐藏重复的 typing indicator。 |
| 2026-06-04 | P2-8 防污染处理：`localFallback` 被过滤出模型 history、本地缓存、图片 recentMessages、TTS recentMessages 和再生成 history，确保它只影响前台等待体验，不进入角色记忆或后续生成。 |
| 2026-06-04 | P2-8 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）。浏览器打开 `/en/chat/profile/rp-001` 无运行错误；通过临时 mock 慢流式响应确认 12 秒兜底动作句能出现。 |
| 2026-06-04 | 完成 P7：新增客户端人性瞬间事件 API 和 helper，记录 `first_impression_selected / continuation_hint_shown / wrap_up_clicked / local_fallback_shown / keepsake_voice_clicked`；事件统一进入 `roleplay_quality_event`，metadata 固定 `source: client_moment`。 |
| 2026-06-04 | P7 验证：`pnpm exec tsc --noEmit` 通过；定向 eslint 通过（仅 baseline-browser-mapping 旧数据提示）。浏览器直接 POST `/api/roleplay/moment-event` 返回 `{ recorded: true }`；页面无新增 runtime error。验证时观察到一次 `/api/auth/get-session` 500 后自动恢复为 200，和 moment event 接口无关。 |

---

## 实施原则

- 不把角色参数露给用户，用户只感受前台瞬间。
- 不做重问卷，首次偏好问题只问 1 个。
- 不让角色像客服，角色必须有态度、边界和一点推拉。
- 不每条消息都上语音/图片，只在高峰时刻出现。
- 不把钩子做成任务，钩子应该是小生活、小秘密、小约定。
