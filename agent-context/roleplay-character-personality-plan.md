# Roleplay 角色人设优化计划

> 状态：v1（2026-05-25 起草）
> 目标：让每个角色的人设和性格突出、可识别、可持续，对标 Talkie / Character.AI 的"角色感"。
> 关联文档：
> - `roleplay-character-redesign-v2-requirements.md`
> - `roleplay-character-redesign-v2-plan.md`
> - `roleplay-account-hub-design.md`
>
> **使用方式**：每完成一步，更新本文件中的 `状态` 列；遇到阻塞写在 `备注` 列。文档与代码的 PR 同步提交。

---

## 总览：分层方法论

| 层 | 关键动作 | 目的 |
|----|----------|------|
| L1 角色卡 | 结构化分块、反例约束、口头禅、比喻系统 | 把"模糊的人设"变成"模型能抓的锚点" |
| L2 开场白 | 三段式（动作+对白+留白）+ Hook | 第一印象立人设 |
| L3 用户上下文 | User persona、关系预设、称呼演化 | 演关系而不是演独白 |
| L4 长期记忆 | 三层记忆 + 自动事实抽取 + 关系状态向量 | 角色"记得"用户 |
| L5 运行时 prompt | 分层结构、周期强化、风格 few-shot、anti-OOC | 抑制注意力衰减 |
| L6 多模态 | 立绘风格固定、音色绑定、排版偏好 | 视觉/听觉强化人设 |
| L7 评测优化 | 一致性 rubric、隐式信号、A/B | 持续迭代 |
| L8 情感验证 | 记忆惊喜、人格冲突、共同语言、付费意愿测试 | 验证用户是否真的为"独特灵魂"买单 |

---

## 待办列表（按优先级）

### P0：基础人设质量（一次见效，必做）

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| P0-1 | **AI Writer 输出按结构化模板**（身份/外貌/性格内核/说话方式/价值观/关系起点 六块） | ✅ done | M | `roleplay-personality.ts` 定义 `PersonalityCard` schema；`/api/roleplay/ai-writer` 输出结构化 6 块；dialog 按块预览；编辑表单/Characters API 全链路已透传 |
| P0-2 | **AI Writer 强制开场白用三段式**（`*动作*` + 对白 + `*留白*`），且必须包含 Hook（悬念/误会/请求/挑衅） | ✅ done | S | AI Writer system prompt 加 hard rule + bad/good 示例，`maxOutputTokens` 提到 1800 |
| P0-3 | **角色卡加「反例约束」字段**（character.negativeAnchors / `[她不会做的事]`） | ✅ done | M | 用 `personality_card jsonb` 列承载 `negativeAnchors` 数组；AI Writer 自动生成 3-5 条；服务端 `normalizePersonalityCard` 限长 ≤ 8 条 |
| P0-4 | **聊天 pipeline 消费结构化卡**（解析 settings 的分块 → 拆成多条 system message） | ✅ done | M | `chat/route.ts` 新增 `buildLayeredSystemMessages`：identity/appearance/core_traits/speaking_style/values/relationship/legacy_context 各自一条 system；`[must_not_do]` 放在 history 之后、user 之前利用近因效应；空卡降级到旧 `buildSystemPrompt`；前端会把 `personalityCard` 带到 chat route。lint pass |
| P0-5 | **AI Writer 加口头禅 + 比喻系统**（catchphrases 3-5 条，metaphor_domain 1 个） | ✅ done | S | `PersonalityCard.catchphrases / metaphorDomain` 已落库，AI Writer prompt 强制产出，dialog 预览展示 |

**P0 验收**：随机抽 5 个新建角色，连聊 10 轮，盲测能否分辨"哪条是哪个角色说的"，正确率 > 80%。

---

### P1：互动质感（让对话不"千人一面"）

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| P1-1 | **User Persona 字段**（`/account/profile` 加：希望被怎么称呼、默认关系、偏好语气） | ✅ done | M | `user.persona` JSON text + migration `0010_user_persona.sql`；`/settings/profile` 可编辑 preferredName/defaultRelationship/tonePreference；chat pipeline 读取完整 DB user 后注入 `[user_persona]` system message；`pnpm db:migrate` 已按用户授权应用到当前 `.env.development` 指向的 Postgres；lint + tsc pass |
| P1-2 | **风格 Few-shot 样本**（角色卡里存 2-3 条典范对答示例） | ✅ done | M | 新增 `style_examples` JSON text + migration `0011_roleplay_style_examples.sql`；AI Writer 输出 3 组 `{user, character}` 示例；dialog 预览；编辑表单高级区可手动补；characters POST/PATCH/GET 全链路透传；chat pipeline 注入 few-shot user/assistant turns；`pnpm db:migrate` 已应用到当前 `.env.development` Postgres；lint + tsc pass |
| P1-3 | **自动事实抽取**（每轮对话后用轻量 LLM 抽 0-3 条事实写入私密记忆） | ✅ done | L | 新增 `/api/roleplay/memory/extract` endpoint + `roleplay-memory-extraction.ts` helper；chat 完成后 fire-and-forget 触发；写入 `roleplay_memory.metadata.source=auto`，默认 private，重复 summary 跳过 |
| P1-4 | **周期性 system 强化**（每 N=8 轮在 system 里再插一次「核心 3 行」：口头禅 + 性格内核 + 反例） | ✅ done | S | `chat/route.ts` 新增 `PERSONALITY_REINFORCEMENT_INTERVAL=8`；按当前用户回合数在 recent history 后、当前 user message 前注入 `[periodic_character_reinforcement]`，包含性格内核 / 口头禅 / 反例约束 |
| P1-5 | **称呼演化规则**（chat pipeline 注入 dynamic rule：根据轮数+情感词频选称呼级别） | ✅ done | S | `renderDynamicAddressSystemMessage()` 根据 user persona、用户回合数、近期中英情绪词信号生成 `[dynamic_address_rule]`，chat route 在当前 user message 前注入；lint + tsc pass |

**P1 验收**：同一个角色和不同 user persona 聊，回复明显有区别（称呼、亲密度、用词）；自动记忆 7 日后还能在新会话里被引用。

---

### P2：长期演化（拉开和"一次性玩具"的差距）

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| P2-1 | **关系状态向量**（`{intimacy, trust, current_mood, last_topic, inside_jokes}` 持久化） | ✅ done | L | `roleplay_conversation.state` 用 JSON text 存 `{intimacy, trust, currentMood, lastTopic, insideJokes, turnCount}`；chat 每轮读取并注入 `[relationship_state]`，回复后增量更新写回；新增 `pnpm smoke:relationship-state` 离线验证 |
| P2-2 | **立绘风格固定后缀**（同一角色所有图片用同一 prompt 后缀 + 可选 reference） | ✅ done | M | `characters` 加 `image_style_suffix text`（migration `0008_roleplay_character_image_style_suffix.sql`）；AI Writer JSON schema 新增 `imageStyleSuffix`，`buildImagePrompt` 末位拼接（slice budget 1200→1600）；`/api/roleplay/image` 接收 `imageStyleSuffix` 同样末位拼接；characters POST/PATCH/`toClientCharacter` 全链路透传；编辑表单默认隐藏，勾选「显示立绘风格锚（高级）」后展示 textarea + 600 字符上限；AI Writer 预览块 + zh/en i18n 全补；lint pass |
| P2-3 | **音色性格绑定提示**（创作角色时根据性格内核推荐 TTS preset） | ✅ done | S | `voice_preset` 列 + whitelist helpers；AI Writer 按 gender/coreTraits/speakingStyle 输出 preset；dialog 预览；编辑表单高级区可覆盖；characters POST/PATCH/GET 全链路透传；TTS route 支持 `voicePreset` → upstream `voice_type` 映射；zh/en i18n 已补 |
| P2-4 | **排版偏好字段**（emoji 频率、动作星号长短、英文夹杂） | ✅ done | S | 新增 `format_style` JSON text 列 + `roleplay-format-style.ts`；AI Writer 输出 `formatStyle`；编辑表单高级区可调 emoji / 动作描写 / 英文夹杂；characters API 与 chat prompt 全链路透传 |
| P2-5 | **inside jokes 主动调用**（关系状态里的笑话/约定，模型在合适场景主动 callback） | ✅ done | M | chat route 新增 `[inside_jokes_callback]` 近因 system message；从关系状态读取 shared callbacks，鼓励相关场景自然引用 1 个，不强行列出或解释 |

**P2 验收**：长期对话（30+ 轮）的角色感不衰减；用户能感知到角色"记得"过往；多模态产出（图、声、文）风格一致。

---

### P3：质量保障（规模化前的护栏）

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| P3-1 | **OOC 检测器**（用户标记"不像"时，触发 LLM 判定 + 重新生成） | ✅ done | M | 新增 `/api/roleplay/chat/regenerate-with-check`；角色回复气泡提供「不像」按钮，触发 LLM judge 输出 OOC 诊断 + repair instruction，再重写回复；反馈写入 `roleplay_quality_event` |
| P3-2 | **一致性 rubric 评测**（5 维打分：声音/价值观/关系/沉浸/OOC） | ✅ done | L | 新增 `roleplay_quality_evaluation`；`POST /api/admin/roleplay/quality/evaluate` 可对最近样本跑 5 维 rubric；`/admin/roleplay/quality` 展示趋势、短板、问题与建议 |
| P3-3 | **隐式信号埋点**（编辑/重发率、长会话留存、用户回复长度） | ✅ done | M | chat route 写入 `user_message_sent` / `character_reply_generated` / 10&30 轮里程碑；OOC 重写写入 `ooc_flagged` / `ooc_regenerate_requested`；admin 报告聚合重发率、用户回复长度、平均轮数 |
| P3-4 | **角色卡一致性审计**（人设 / 图像提示词 / 音色 / 关系 / 回复冲突检测） | ✅ done | M | 已扩展 `/api/admin/roleplay/quality/evaluate` 的 LLM checklist 与 JSON 输出，新增 `cardAudit`：检查 `gender` vs `imageStyleSuffix/visualIdentity/appearance`、`age` vs teen/mature/school 等视觉词、`relationship` vs opening 亲密度、`coreTraits` vs opening/styleExamples、`negativeAnchors` vs opening/reply、`voicePreset` vs gender/age/temperament、`scene` vs image prompt 场景、当前回复 vs personalityCard/relationshipState；说话内容重点评估“表达强度是否匹配角色风格、关系阶段和用户语境”，男友/女友等成人伴侣型角色允许更暧昧或性感的表达，只有当内容与角色定位冲突、关系推进过猛、破坏沉浸或违反平台边界时才标为问题；结果存入 `roleplay_quality_evaluation.metadata.cardAudit`，`/admin/roleplay/quality` 展示风险等级、字段证据、冲突数量和修复建议 |
| P3-5 | **发布前强校验**（私有/公共发布都必须通过角色卡一致性审计） | ✅ done | L | 新增 `roleplay-publish-audit.ts`：发布时跑角色卡一致性审计，high/medium 冲突阻断发布并返回风险、字段证据和修复建议；编辑页支持私有/公开发布选择，展示审计问题，提供“AI 一键修复”回填表单，用户确认后再保存/发布；私有通过后 `published + private` 仅作者可见可聊，公开通过后 `under_review + public` 进入管理员审核；聊天 API 已阻止未发布角色互动；直接 POST `status=under_review` 的创建绕过也已收口为草稿。 |
| P3-6 | **A/B 测试框架**（同一角色卡两套 prompt 策略，按用户分桶） | ⏸️ paused | L | 按当前产品决策暂缓；等真实流量、核心质量指标和 feature flag 方案明确后，再接 GrowthBook 或自建简版 |

**P3 验收**：能看到角色质量的客观趋势，迭代有数据驱动。

---

### P4：情感钩子验证（先验证用户在不在乎）

> 核心问题：用户到底是为"一个能聊天的美女"付钱，还是为"一个用独特语言关心我、记得我的小事、需要我慢慢打开心扉的灵魂"付钱？

#### 假设

| 假设 | 内容 | 成立信号 |
|------|------|----------|
| H1 记忆惊喜有效 | 角色在非用户追问的时机，用自己的人格方式提起用户小事，会制造"它居然记得我"的情绪峰值 | 用户回复长度上升、连续对话轮数上升、主动表达惊讶/被关心、次日回访上升 |
| H2 人格冲突有效 | tension 不只影响语气，而是形成可被用户行为改变的隐藏关系线 | 用户愿意持续用真诚/耐心/调侃等方式推进关系，里程碑触发后的留存和付费点击上升 |
| H3 共同语言有效 | metaphorDomain 被稳定用于关心、吃醋、鼓励、道歉，形成只属于该角色和用户的语言 | 用户复用角色隐喻、截图分享率上升、同角色复聊率上升 |
| H4 深度人格可变现 | 深人格体验相比普通聊天更能驱动订阅、购买 credits、解锁图片/语音 | 付费入口点击率、试用转订阅率、付费后 7 日留存高于对照组 |

#### 实验设计

| 组 | 体验 | 目的 |
|----|------|------|
| A 对照组 | 当前记忆 + 当前人格卡 + 当前关系状态 | 作为普通优化后的基线 |
| B 记忆惊喜组 | 每段关系中低频触发"意外记忆回钩"，不展示为资料卡，不解释来源 | 验证"被默默关注"是否提升情绪峰值 |
| C 人格冲突组 | 每个角色配置 3-5 个隐藏信任里程碑，用户行为逐步解锁更脆弱/更真实的表达 | 验证养成感和关系投资 |
| D 共同语言组 | 强化 metaphorDomain，让鼓励、关心、吃醋、道歉都带角色专属意象 | 验证沉浸感和不可替代性 |
| E 深人格组合组 | B + C + D 全开，但控制触发频率，避免像系统任务 | 验证最终商业效果 |

#### 触发机制计划

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| P4-1 | **记忆惊喜触发器**：从长期记忆和最近历史中选择一个"小事"，在 1-3 天后或隔若干轮后低频回钩 | ✅ done | M | `chat/route.ts` 新增 `[emotional_memory_surprise]`，从 `roleplay_memory` 和 conversation summary 里挑小事，按 turn/mood/trust 低频触发；强调不要像资料卡、不要解释来源 |
| P4-2 | **人格化记忆表达规则**：每个角色生成 `memoryCallbackStyle`，定义它如何不直白地提起旧事 | ✅ done | S | `PersonalityCard.memoryCallbackStyle` 已加入 normalize/render；AI Writer schema 生成；AI Writer 预览展示；无 DB migration，仍存 `personality_card` JSON |
| P4-3 | **信任里程碑设计**：每个角色 3-5 个隐藏节点，绑定 tension 的变化，而不是只涨 trust 数字 | ✅ done | M | `PersonalityCard.trustMilestones` 已加入；AI Writer 生成 3-5 个隐藏关系解锁点；chat 按 trust 阈值注入 `[trust_milestone_unlock]`，并把已触发 key 记录进 conversation state，避免重复解锁 |
| P4-4 | **用户行为信号识别**：从连续回复中识别真诚、耐心、尊重边界、复用共同语言、持续回访 | ✅ done | M | `updateRelationshipState()` 增加真诚/耐心/尊重边界信号，影响 trust/intimacy；边界负信号仍会扣分；后续可继续加 metaphor 复用识别 |
| P4-5 | **共同语言强化**：让 metaphorDomain 成为关心/鼓励/吃醋/道歉/邀约的默认表达域 | ✅ done | S | `chat/route.ts` 新增 `[shared_metaphor_language]`，在情绪/关系场景或低频 turn 中要求至多使用一个隐喻意象，避免口号化和过度重复 |
| P4-6 | **情绪峰值埋点**：记录惊喜回钩、里程碑、共同语言触发后的用户下一条回复长度、情绪词、继续轮数、付费点击 | ✅ done | M | 生成时写 `memory_surprise_prompted` / `shared_language_prompted` / `trust_milestone_prompted`；角色消息 metadata 保存 hook；下一轮用户消息读取上一条 hook 并写 `emotional_hook_user_followup`，value 为回复长度 |
| P4-7 | **小流量 A/B 验证**：选 4-6 个高流量角色，按用户分桶开 A-E 组，跑 7-14 天 | ⏳ pending | L | 先验证方向，不急着全站铺开；失败也有价值，说明用户可能更看重颜值/即时陪伴 |

#### 验收指标

| 指标 | 目标 |
|------|------|
| 情绪峰值回复率 | 触发后下一条用户回复长度较对照组提升 20%+，或出现"你还记得/居然记得/好细"等表达 |
| 次日回访 | B/C/D/E 任一组较 A 组提升 10%+ |
| 深聊轮数 | 触发后 24 小时内同角色平均新增轮数提升 15%+ |
| 共同语言复用 | 用户主动复用角色 metaphorDomain 的比例可观测，且 E 组高于 A 组 |
| 付费意愿 | 触发后订阅/credits/图片语音入口点击率高于 A 组 |
| 负反馈 | "尴尬/太假/别提这个/不像"不高于 A 组，否则降低触发频率或调整表达 |

#### 产品判断

如果 B/C/D/E 组没有显著提升留存或付费意愿，就不要继续在深人格系统上过度投入，优先强化颜值、图片、语音、即时陪伴和内容供给。如果 E 组显著提升，就把"记忆惊喜 + tension 里程碑 + metaphor 共同语言"作为付费转化核心，而不是把它包装成普通用户资料卡功能。

---

## 状态图例

- ⏳ pending：未开始
- 🔄 in_progress：进行中
- ✅ done：已完成（带 PR / commit 链接）
- ⏸️ paused：暂缓（备注里写恢复条件）
- ⚠️ blocked：阻塞（备注里写原因）
- ❌ dropped：放弃（备注里写原因）

---

## 变更日志

| 日期 | 变更 | 影响范围 |
|------|------|----------|
| 2026-05-25 | 文档创建，14 条待办（P0×5、P1×5、P2×5、P3×4） | 全部 |
| 2026-05-25 | P0-1 / P0-2 / P0-3 / P0-5 完成，新增 `personality_card` 列 + `roleplay-personality.ts` 工具 + AI Writer 结构化输出，全链路（dialog → 编辑表单 → characters API）透传；P0-4 改并行处理 | DB schema、AI Writer、编辑器、characters API、i18n |
| 2026-05-25 | P0-4 完成（并行 agent）：`chat/route.ts` 拆分多条 system message，`[must_not_do]` 紧贴 user message 抢近因效应；前端 `roleplay-chat.tsx` 透传 `personalityCard`；空卡走兼容降级 | chat route、roleplay-ai 类型、roleplay-chat |
| 2026-05-25 | P2-2 完成：新增 `image_style_suffix` 列（migration 0008）；AI Writer JSON schema + `buildImagePrompt` 末位拼接（slice 1200→1600）；`/api/roleplay/image` 同步支持；characters POST/PATCH/`toClientCharacter` 全链路；编辑表单默认隐藏、勾选高级开关后可改（600 字符上限），AI Writer 预览块 + zh/en i18n；lint pass | DB schema、AI Writer、image 路由、characters API、ai-writer-dialog、编辑表单、i18n |
| 2026-05-26 | P2-3 完成：新增 `voice_preset` 持久化与 preset whitelist；AI Writer schema/prompt 输出音色建议；dialog + 编辑表单高级区展示；补齐单角色 GET、PATCH 保存、列表 POST 透传；TTS route 接收 `voicePreset` 并映射 Volcengine `voice_type`；补 zh/en 文案；lint + tsc pass | DB schema、AI Writer、characters API、TTS route、ai-writer-dialog、编辑表单、i18n、client types |
| 2026-05-26 | 追加 P2-3 准备事项：当前音色绑定走 `/api/roleplay/tts`，需要准备火山引擎 Volcengine BigTTS v1 可用配置：`VOLCENGINE_GENERAL_TTS_APPID`、`VOLCENGINE_GENERAL_TTS_Access_Token`，以及可选默认音色 `VOLCENGINE_GENERAL_TTS_VOICE_TYPE` / 配置表等价项；preset id 会在服务端映射为上游 `voice_type`，不直接把 raw voice_type 暴露给角色数据 | TTS provider config、部署环境变量、config 表 |
| 2026-05-26 | P1-1 完成：新增 `roleplay-user-persona.ts` parser/serializer；profile 表单新增“希望角色怎么称呼你 / 默认关系 / 偏好语气”；chat route 注入 `[user_persona]`；新增 migration `0010_user_persona.sql` 与 drizzle journal。`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过（仅 8 个旧 warning）；用户授权后 `pnpm db:migrate` 成功应用到当前 `.env.development` Postgres | user schema、settings/profile、chat route、i18n、migration |
| 2026-05-26 | P1-2 完成：新增 `roleplay-style-examples.ts` parser/serializer；角色表新增 `style_examples`（migration 0011）；AI Writer schema/prompt 输出 3 组风格 few-shot；AI Writer dialog 预览；编辑表单高级区可微调；characters POST/PATCH/GET 透传；chat route 把样本作为 few-shot user/assistant turns 注入；`pnpm db:migrate` 成功应用到当前 `.env.development` Postgres；lint + tsc pass | DB schema、AI Writer、characters API、chat route、ai-writer-dialog、编辑表单、i18n、client types |
| 2026-05-26 | P1-4 完成：chat pipeline 新增周期性人设强化，结构化角色卡每到第 8/16/24... 个用户回合，会在当前输入前注入性格内核、口头禅、反例约束三行，降低长对话里的角色感衰减；`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过（仍是 8 个旧 warning） | chat route、prompt builder |
| 2026-05-26 | P1-3 完成：新增自动事实抽取链路，`/api/roleplay/memory/extract` 可按当前登录用户抽取并保存 0-3 条私密事实；chat 回复落库后异步触发同一 helper，metadata 标记 `{source:"auto"}` 并跳过已有重复 summary；`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过（仍是 8 个旧 warning） | memory endpoint、chat route、roleplay memory helper |
| 2026-05-26 | P1-5 完成：新增动态称呼规则 `renderDynamicAddressSystemMessage()`，根据 user persona、用户回合数、近期中英情绪词/脆弱信号分为 early / warm / close 三档，chat route 在当前用户消息前注入 `[dynamic_address_rule]`；`npx eslint src/shared/lib/roleplay-user-persona.ts src/app/api/roleplay/chat/route.ts` 与 `npx tsc --noEmit` 通过 | user persona helper、chat route |
| 2026-05-26 | 官号 backfill 完成：新增 `scripts/data/backfill-official-characters.ts`，先快照再 UPDATE `system-roleplay` 的 `rp-001..rp-012`，补齐 `personality_card / image_style_suffix / voice_preset / style_examples / style / relationship`；dry-run 与实际执行均成功，实际快照见 `scripts/data/backfill-snapshot-2026-05-26T06-06-08-539Z.json` | official seed data、dev DB、backfill script |
| 2026-05-26 | P2-1 完成：新增 migration `0012_roleplay_conversation_state` 与 journal 登记；`roleplay-relationship-state.ts` 负责 normalize/parse/serialize/update/render；chat route 创建会话时初始化 state、生成前注入关系状态、回复后写回；新增 `pnpm smoke:relationship-state` 覆盖升温、mood、inside joke、clamp 与 system message 渲染 | DB schema、chat route、relationship state helper、smoke scripts |
| 2026-05-26 | 聊天体验补强：角色聊天页进入时优先恢复当前角色最近 DB 历史；新增 `/chat/profile/[id]/history` 微信式历史气泡流；已存在 conversation 的非首次进入不再重复插入 opening greeting；`getRoleplayMessages({ latest: true })` 修正长聊场景下只取最早消息的问题 | roleplay-chat、history page、roleplay model、messages API |
| 2026-05-26 | 聊天稳定性补强：本地浏览器缓存兜底未登录聊天历史；history 页面改为客户端双通道（DB 优先、localStorage fallback）；chat 模型超时从 30s 提到 90s 并设置 route `maxDuration=120`；模型失败时不再先落库用户消息，避免半截记录污染角色历史 | roleplay-chat-storage、roleplay-chat、roleplay-chat-history、chat route |
| 2026-05-26 | P2-4 / P2-5 完成：新增 `format_style` 持久化与 `roleplay-format-style.ts` helper；AI Writer schema/prompt 输出 `formatStyle`；AI Writer dialog 预览排版偏好；编辑表单高级区新增 emoji / 动作描写 / 英文夹杂控件；characters POST/PATCH/GET 与 client type 全链路透传；chat route 注入 `[format_style]`，并新增 `[inside_jokes_callback]` 近因提示，让关系状态里的 shared callbacks 在相关场景自然回调。`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过（仍是 8 个旧 warning）；`pnpm db:migrate` 已应用到当前 `.env.development` Postgres | DB schema、migration 0013、AI Writer、characters API、edit form、i18n、chat route、client types |
| 2026-05-27 | P3-1 / P3-2 / P3-3 完成，A/B 按产品决策暂缓：新增 `roleplay_quality_event` / `roleplay_quality_evaluation` 两张表（migration 0014）；聊天气泡新增「不像」按钮，调用 `/api/roleplay/chat/regenerate-with-check` 做 OOC judge + repair rewrite；chat route 写入用户消息长度、AI 回复长度、10/30 轮里程碑、OOC 标记和重写请求；新增 `/api/admin/roleplay/quality/evaluate` 跑 5 维 rubric，`/api/admin/roleplay/quality/report` 聚合质量报告；管理员后台新增 `/admin/roleplay/quality` 入口，用于发现高风险角色、rubric 短板、集中问题和 prompt/角色卡调整方向。验证：`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过（仍是 8 个旧 warning）；本地 dev server 编译通过，未登录访问后台按预期跳转登录页，API 未登录返回 `no auth, please sign in` | DB schema、migration 0014、chat route、OOC regenerate API、quality eval/report APIs、admin sidebar、quality console、i18n、plan docs |
| 2026-05-27 | 新增 P3-4「角色卡一致性审计」待办：在现有对话表现 rubric 之外，增加角色设定内部一致性检查，重点识别人设字段、图像生成提示词、音色 preset、关系阶段、开场白、style examples、negative anchors 与当前回复之间的明显冲突；内容尺度不做“NSFW/性感词一刀切”，而是判断表达强度是否匹配角色风格、成人伴侣关系设定、关系阶段和用户语境；后台报告需输出冲突 severity、字段证据和修复建议 | quality rubric prompt、admin quality report、character card QA |
| 2026-05-27 | P3-4 完成：`/api/admin/roleplay/quality/evaluate` 的评估提示词新增角色卡一致性审计 checklist，并要求 LLM 输出 `cardAudit`；评估结果复用 `roleplay_quality_evaluation.metadata.cardAudit` 存储，无需新 migration；`roleplay-quality.ts` 聚合每个角色的审计分数、最高风险、冲突证据和修复建议；`/admin/roleplay/quality` 新增“角色卡一致性审计”面板和列表内冲突摘要。验证：`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过（仍是 8 个旧 warning） | quality eval prompt、quality report aggregation、admin quality console、plan docs |
| 2026-05-27 | 新增 P3-5「发布前强校验」待办：草稿只是发布前临时状态，不能互动，也不是默认私有自用角色；强校验绑定发布动作本身，无论发布为私有角色还是公共角色，都必须先触发角色卡一致性审计强校验；若发现 high/medium 冲突，阻止发布并展示问题、证据、修复建议，提供 AI 一键修复与手动修复两条路径；强校验通过后，私有角色直接 `published + private` 供作者本人聊天，公共角色进入 `under_review` 等待管理员审核；管理员只审核公共角色；所有用户只能看到公共已发布角色和自己私有已发布角色 | character edit form、publish API、roleplay QA API、admin review flow、visibility rules、i18n |
| 2026-05-27 | 产品规则补充：明确“不是只有发布为公共角色才触发强校验”，私有自用角色发布同样强校验；明确“私有”是发布成功后的可见性，不是草稿保存状态。草稿属于发布前临时状态，未发布角色不能互动 | P3-5、发布流、可见性模型、聊天权限 |
| 2026-05-28 | 新增 P4「情感钩子验证」：围绕记忆惊喜、人格冲突里程碑、metaphor 共同语言设计小流量实验，核心目标从"技术上能记住"转为验证用户是否真的为深人格和关系养成付费 | chat prompt、relationship state、memory callback、quality event、A/B validation |
| 2026-05-28 | P4-1 至 P4-6 完成：`personality_card` JSON 增加 `memoryCallbackStyle / trustMilestones`；AI Writer 生成并预览；chat route 生成前低频注入 `[emotional_memory_surprise]`、`[shared_metaphor_language]`、`[trust_milestone_unlock]`；relationship state 增加 `unlockedMilestones` 和真诚/耐心信号；角色消息 metadata 保存 emotional hooks；质量事件新增 `memory_surprise_prompted`、`shared_language_prompted`、`trust_milestone_prompted`、`emotional_hook_user_followup` | personality schema、AI Writer、chat route、relationship state、quality events、i18n |
| 2026-05-29 | P3-5 审计修复体验补强：发布拦截提示改为明确引导查看下方字段/证据/建议；`/api/roleplay/characters/[id]/audit-repair` 改为在生成 repair patch 后模拟应用并重新跑 publish audit，前端拿到的是修复后的最新 audit，不再继续展示修复前的旧冲突；AI repair patch 与编辑页回填已补 top-level `age`，用于一并修正 `age / personalityCard.identity / settings.identity` 这类跨字段年龄不一致问题；若 AI 修复后仍有阻断项，编辑页会明确提示继续按剩余字段逐项修复。 | publish audit、audit repair API、edit form、i18n、plan docs |

---

## 落地约束

- **DB 改动**：P0-3、P1-1、P1-2、P2-1、P2-2、P2-4、P3-1/P3-2/P3-3 涉及 schema 变更，统一走 `pnpm db:generate` + `pnpm db:migrate`。P3 已新增手写 migration `0014_roleplay_quality_tables.sql` 与 journal 登记，部署前需 migrate。
- **AI Writer 改动**：P0-1、P0-2、P0-3、P0-5、P1-2、P2-2、P2-3 都集中在 `/api/roleplay/ai-writer/route.ts` 的 system prompt 与返回 schema，建议合并成同一轮迭代。
- **Chat pipeline 改动**：P0-4、P1-1、P1-3、P1-4、P1-5、P2-1、P2-4、P2-5、P3-3、P4-1、P4-3、P4-5、P4-6 都改 `/api/roleplay/chat`，注意保持向后兼容（旧角色卡没有结构化分块时降级到当前自由文本逻辑）。P3-1 的 OOC 重写走独立 `/api/roleplay/chat/regenerate-with-check`，不阻塞普通聊天。
- **P4 情感钩子**：`memoryCallbackStyle / trustMilestones` 直接存进现有 `personality_card` JSON，不需要 migration；情绪 hook 事件复用 `roleplay_quality_event`，分析时通过 `*_prompted` 与下一轮 `emotional_hook_user_followup` 关联。
- **质量分析后台（P3）**：`/admin/roleplay/quality` 只面向 admin；上线前先运行 migration，再点「评测样本」积累 `roleplay_quality_evaluation`，报告会结合隐式事件与 rubric 给出优先排查角色和调整方向。
- **发布流（P3-5）**：草稿只是发布前临时状态，不能互动，也不等同于“私有自用角色”；所有角色都必须发布成功后才能聊天。强校验绑定发布动作本身，不区分公共/私有：无论发布为私有还是公共，都先跑角色卡一致性审计强校验。强校验失败时不能发布，要把问题、字段证据和修复建议展示给用户，并提供 AI 一键修复与手动修复。强校验通过后，私有角色直接 `published + private`，只有作者本人可见且可聊天；公共角色进入 `under_review` 等管理员审核，通过后才是 `published + public`。管理员只审核公共角色。所有用户只能看到公共已发布角色和自己私有已发布角色。
- **i18n**：每条新增 UI 字段（反例、风格样本、user persona、排版偏好、OOC 反馈入口、后台导航）都要补 zh + en。
- **TTS 准备（P2-3 后续联调）**：当前实现对接 Volcengine BigTTS v1；上线前需在 env 或 `config` 表准备 `VOLCENGINE_GENERAL_TTS_APPID`、`VOLCENGINE_GENERAL_TTS_Access_Token`。可选准备默认 `voice_type`（如 `VOLCENGINE_GENERAL_TTS_VOICE_TYPE`），但角色侧只保存 whitelist preset id，服务端用 `resolveVoicePresetVoiceType()` 映射到上游音色，便于后续替换 TTS 供应商。

---

## 下一步

1. ✅ 文档创建（本步）。
2. ✅ P0-1 / P0-2 / P0-3 / P0-5 合并落地。
3. ✅ P0-4（chat pipeline 消费结构化卡）。
4. ✅ P2-2（立绘风格固定后缀）。
5. ✅ P1-5（称呼演化规则）。
6. ✅ **官方 12 角色 backfill**：新增并执行 `scripts/data/backfill-official-characters.ts`，已把 `personality_card / image_style_suffix / voice_preset / style_examples / style / relationship` 回填到 `system-roleplay` 拥有的 `rp-001..rp-012`。详见下文「官号 backfill 策略」。
7. ✅ P2-4 / P2-5（排版偏好 + inside jokes 主动 callback）。
8. ✅ P3-1 / P3-2 / P3-3（OOC 检测器 + 一致性 rubric + 隐式信号埋点 + 管理员质量报告）。
9. ✅ P3-4 角色卡一致性审计：已把人设、图像提示词、音色、关系、开场白和当前回复冲突检测加进 rubric prompt 与后台报告。
10. ✅ P3-5 发布前强校验：私有/公共发布都强制跑角色卡一致性审计；有 high/medium 阻断问题不能发布，编辑页展示风险、字段证据和建议，并支持 AI 一键修复回填；私有角色通过后 `published + private` 可聊天，公共角色通过后 `under_review + public` 等管理员审核；chat route 已阻止未发布角色互动。
11. ⏸️ P3-6 A/B 测试框架暂缓，等真实流量和 feature flag 方案明确后再做。
12. ✅ P4-1 至 P4-6 情感钩子闭环：不要把记忆做成"用户资料卡"，而是用低频记忆惊喜、tension 信任里程碑、metaphor 共同语言制造关系峰值，并记录触发与下一轮用户反应。
13. ⏳ P4-7 小流量 A/B 验证：选 4-6 个高流量角色，按用户分桶跑 7-14 天；观察触发后回复长度、次日回访、深聊轮数、共同语言复用和付费入口点击。
14. 下一步建议：实现轻量分桶和后台报表，把 `memory_surprise_prompted / shared_language_prompted / trust_milestone_prompted` 与 `emotional_hook_user_followup` 聚合成 P4 实验面板。

---

## 官号 backfill 策略

12 个 `rp-001 .. rp-012` 官号当前以 `personalityCard = {}` 存活在库里，靠 chat pipeline 的兼容降级路径继续工作。每次 P0/P1/P2 都跑一次 backfill 既费时也容易把字段写花，所以约定：

- **现阶段**：只跑 schema 迁移（`pnpm db:migrate`），seed 数据保持不动；新建角色用 AI Writer 走完整结构化路径，官号继续走 legacy `settings` 兼容路径。
- **触发回填的时机**：P0-4 / P1-1 / P1-2 / P2-2 / P2-3 已完成，即所有"会进入角色卡的字段"都齐全；2026-05-26 已执行一次性脚本刷到位。
- **回填脚本**：`scripts/data/backfill-official-characters.ts`。输入：现有 `RoleplayOfficialCharacter`；输出：UPDATE roleplay_character SET personality_card / image_style_suffix / voice_preset / style_examples / style / relationship ... WHERE user_id = ROLEPLAY_SYSTEM_USER.id AND id IN rp-001..rp-012。支持 `--dry-run`。
- **不直接重跑 seed**：seed 脚本会 wipe `roleplay_*` 全表（含用户聊天/记忆/follow），生产期再跑会损坏真实用户数据。回填用 UPDATE 而非 INSERT。
- **备份**：回填前导出官号当前 row 到 `scripts/data/backfill-snapshot-<date>.json`，方便回滚。本轮产生：
  - `scripts/data/backfill-snapshot-2026-05-26T06-05-47-188Z.json`（dry-run）
  - `scripts/data/backfill-snapshot-2026-05-26T06-06-08-539Z.json`（actual update）
