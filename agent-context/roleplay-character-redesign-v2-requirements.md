# RolePlay 角色系统重构 v2 — 观察记录

> 本文件先把对 talkie-ai.com 的现场观察按字段、流程、UI 维度记录下来，作为下一版
> 需求文档的素材。**这是观察笔记，不是需求决策**；后续需求合并 Crushly 视觉风格
> 时再单独成稿。

来源：talkie-ai.com（已登录账号实地浏览 `/`、`/create`、AI Writer 弹窗、聊天
详情页）。

---

## 1. AI Writer（Echo 示例自动填充）

入口位置：创建表单顶部 Name 字段旁的「AI Writer」按钮。

点击后弹出 dialog，一次性把 **Name / Gender / Settings / Intro / Opening** 五个
字段全填上一份完整的"草稿"。实测样例是 **Echo（数字乌托邦的霓虹灯 AI）**：

- Name: `Echo` (4/18)
- Intro: 917/2000 字描写
- Opening: 208/500 字开场白
- 弹窗右上角有「Retry」按钮，可整体重抽
- 底部 Cancel / Save，Save 后内容写回主表单

含义：这正是"用户在 AI 帮助下生成心仪的角色"的成熟形态。流程是
**一键骨架 → 用户在编辑器逐字段微调 → 单字段 Retry 重抽**，而不是让用户从空白
表单开始填。

### 1.1 v2 扩展（2026-05-25 追加）— AI Writer 一键含立绘

需求决议：AI Writer 必须在生成 Name / Settings / Intro / Opening 这四段文字的
**同一次请求**里，再跑一张角色立绘并回填到表单的 `avatar` / `cover` /
`gallery[0]`。理由：

- 用户期望"一键生成角色"是闭环（文字 + 形象），目前文字回填后用户卡在"得自己上传图"。
- 现有 `roleplay_character` 已经有 `avatar_url / cover_url / gallery` 字段以及
  `/api/roleplay/image` + `generateOpenAICompatibleImage()` + R2 / S3 兜底链路，
  零额外基础设施。

具体规则：

| 项 | 决议 |
|----|------|
| 触发时机 | AI Writer dialog 点 Generate / Retry → 后端先 `generateText`，再用文本里 `intro+settings` 当 prompt 调一次 image API |
| Image provider | **先用现有默认配置**：`resolveImageProviderConfig()` 解析 `IMAGE_GENERATION_*` 或回退到 `VOLCENGINE_*`（DEFAULT_IMAGE_MODEL = `doubao-seedream-5-0-260128`，DEFAULT_IMAGE_SIZE = `2k`） |
| LLM provider | **先用现有默认配置**：`resolveTextProviderConfig()`（DEFAULT_MODEL = `openai/gpt-4o-mini`，环境变量族见 `ai-provider.ts`） |
| 临时 URL 持久化 | 生成出的图片要 `storageService.downloadAndUpload()` 拉回来上传到 R2/S3，再返回最终公网 URL。不允许把火山方舟 30 分钟到期的临时 url 直接落库 |
| 失败兜底 | 图片生成失败 → 文字仍然返回（但 draft.avatar = ''），dialog 显示文字成功 + 图片失败提示，用户仍可 Save 文字部分 |
| draft 字段扩展 | `AiWriterDraft` 加 `avatar?: string`、`gallery?: string[]`；dialog 渲染图片预览；父表单 `handleAiSave` 把 `avatar` 写到 `state.avatar`、`gallery: [avatar]` |
| 超时 | 已经把 `AI_TIMEOUT_MS` 提到 180s（文字），图片侧已有自己的 90s 超时，整体上限走 route `maxDuration = 300s` |

### 1.2 后续待办（不在本次实现）

- **R7-W1：Model picker（管理员级）**：在 `/admin` 加一个 "AI Writer 设置" 页，
  写 `config` 表（已有 `getAllConfigs / setConfig` 基础设施）。允许管理员动态切
  换 LLM 模型 / image 模型 / 图片尺寸 / 是否启用图片生成，无需重启。优先级：中。
- **R7-W2：用户级模型偏好**：在 AI Writer dialog 顶部加 model dropdown
  （候选列表硬编码或从新 endpoint 读），fetch body 多塞 `model`，复用
  `resolveTextProviderConfig({ requestModel })` 的现有路径。优先级：低。
- **R7-W3：单角色绑定模型**：`roleplay_character.model` 字段已存在但没串起来，
  让用户能为单个角色锁定推理模型（影响 chat reply）。优先级：低。

---

## 2. 角色字段模型（核心字段）

| 字段 | 限制 | 影响对话 | 备注 |
|------|------|----------|------|
| Name | ≤18 字符 | — | |
| Gender | Male / Female / Non-Binary | — | 单选 |
| Settings | ≤4000 字 | ✅ 是 | 后端 system prompt 来源 |
| Intro | ≤2000 字 | ❌ 否 | 展示给用户看的简介 |
| Opening | ≤500 字 | — | 角色开场白 |
| Skill | 可挂载技能 | — | Image Generation / Song Creation 等 |
| Image | — | — | 头像 / 封面图 |
| Voice | — | — | TTS 声音 |

字段提示里用 **Mention User / Mention Talkie** 这类 mention chip，让用户在 prompt
中引用 `{{user}}` / `{{character}}` 之类的变量。

`Settings` 与 `Intro` 的拆分是关键：前者是给 AI 看的、后者是给用户看的。我们
当前实现是合一的，需要拆。

---

## 3. 草稿 / 审核流（用户角色管理）

`/create` 页面顶部有三个 tab：

- **All** — 全部
- **Draft** — 草稿
- **Under Review** — 审核中

发布前的状态机：用户编辑 → **Save**（落草稿） → **Publish**（进入审核） →
审核通过才进 picker。

含义：

- 用户创建的角色 **不能** 直接进入主 picker；
- 数据库需要 `roleplay_character.status` 字段，取值至少：
  `draft / under_review / published`（rejected 视情况补）。

---

## 4. 聊天详情页布局

实测页面：Ethan Sterling 的角色详情页 / 聊天页。结构如下：

**头部**

- 角色头像 + 名字
- 互动数：`31.2K`（chat 数）、`671`（评论 / 收藏数）
- 创作者：`@Niskko2003`
- 「追蹤」按钮（关注创作者）
- 功能按钮：「他們的電話」、「秘密空間」（角色专属玩法入口）

**正文**

- 角色簡介
- 开场气氛 / 场景描述
- 留言区：60 条评论，明显在做社区氛围

**底部**

- 输入栏
- 表情 / 附件 / 语音

含义：聊天页不是一条单纯的对话流，而是带社交属性的"角色卡"。我们之前的
chat 页只有消息流，需要把"创作者归属 + 评论 + 角色专属玩法"这层补上。

---

## 5. 分类体系（tag taxonomy）

Talkie 首页一级标签横排：

```
Featured | 🌟 Recommend | Play & Fun | Helper | Original | Anime & Game | Fiction & Media | Icon
```

共 8 个，可直接照抄。我们项目目前没有标签筛选层，加这条就能直接支持「动漫
等各种类型角色」的浏览需求。

---

## 6. Talkie 创建表单（实测 `/create/edit`）

通过 bb-browser 实地走完 `/create` → `Create a Talkie` → `/create/edit`，捕获到
完整字段排布与交互。截图：`/tmp/talkie-create-edit-step1.png`。

**布局自上而下**

1. 顶栏：左侧返回，右侧 `Save`（保存草稿）+ `Publish`（提交审核）两个按钮始终
   常驻。
2. `Daily Chat Model` chip — 模型选择入口（默认值为 Daily Chat Model，可点开切
   换）。
3. **Name** ≤18 字 + 行内 `AI Writer` 按钮（金/紫渐变 chip）。
4. **Gender** 三选一 chip：`Male` / `Female` / `Non-Binary`。
5. **Settings** —— 大段 textarea，标题旁标注 `Impact the character's reply`。
   - Placeholder：`Settings of the character, including all the background…`
   - 文本框上方有 mention chip：`User` / `Talkie`，点击后会向 textarea 插入
     `{{user}}` / `{{char}}` 占位符。
6. **Intro** —— 大段 textarea，标题旁标注 `No impact on the character's reply`。
   - Placeholder：`Anything you want to show or say to the users…`
7. **Opening** —— textarea：`The opening starts the conversation and sets the…`
8. **Skill** 区域：`Add` 按钮，挂载技能（Image Generation / Song Creation 等）。
9. **Image** 区块：上传角色图。
10. **Voice** 区块：右上角带 `Reset` + 文本框（应该是搜索/试听用），用于挑选 TTS。

**关键交互**

- **AI Writer 真正一键填四字段。** 实测点击 `AI Writer` chip 后弹出 modal，
  里面会 streaming 生成 `Name / Settings / Intro / Opening`。本次实跑生成的是
  「Zephyr — The Keeper of Whispers」：
  - Name: `Zephyr`
  - Settings 起首：`In the dim glow of a forgotten world, a wanderer emerges
    from the mist…`（约 500 字，含「The Keeper of Whispers」「ancient robe」
    「{{user}}` 之类的占位）。
  - Opening: `The winds whispered your name long before we met, traveler.
    I am Zephyr, ***e, let us walk the path less traveled together.`
- **Modal 底部按钮：`Cancel` / `Save`；右上角是 `Retry`。** Save 把内容写回
  主表单各字段；Retry 整体重抽；Cancel 抛弃。**没有按字段级单独 Retry**，
  之前笔记里"单字段 Retry 重抽"的描述需要修正：实际是整体重抽 + 主表单里
  逐字段手动改。
- AI Writer 生成在 modal 内是 **流式输出**，可见字符一段段补全，不会一次性
  弹出完整结果（说明后端是 SSE / chunked completion，不是一次性 JSON）。
- **AI Writer Save 的字段写回有 bug 嫌疑**：本次实测点 Save 后用 DOM eval 检
  查主表单，发现：
  - `Name` 输入框 → 空（应该写入 `Zephyr`，结果落空）。
  - `textarea[0]`（Settings）→ 仅 `Zephyr` 6 字。
  - `textarea[1]`（Intro）→ 929 字（应是 Settings 的"In the dim glow…"内容）。
  - `textarea[2]`（Opening）→ 123 字（"The winds whispered your name…"，符合
    预期）。
  这说明：要么 Talkie 自己 mapping 错位（Settings 的内容写到了 Intro），要么
  存在更多隐藏字段我没列全（比如 Name 与 Settings 之间还有"Tagline"之类）。
  **复刻时不要照抄这个 mapping**，应该设计成显式四字段对齐，避免错位。

**对我们的实现的含义**

- 表单字段需新增：`Settings`（≤4000）、`Intro`（≤2000）、`Opening`（≤500）、
  `Gender`、`Skill[]`。当前 `roleplay_character` 表的 `settings/intro/opening`
  概念基本对得上，但需要把 mention chip / 占位符规范化（`{{user}}` /
  `{{char}}`）。
- AI Writer 后端需要一个端点：`POST /api/roleplay/ai-writer`，输入可空，输出
  四字段（Name / Settings / Intro / Opening）。**Streaming 输出可后置**，
  v1 直接 JSON 一次返回也能用。
- `Save` 与 `Publish` 是两个不同的端点：
  - `Save` → 写 `status='draft'`，不做内容审核。
  - `Publish` → 写 `status='under_review'`，触发 moderation pipeline。

---

## 7. Crushly 首页（截图 `/tmp/crushly-home-2.png`）

实测 `https://crushly.com/`，**未登录就能直接看到角色**，没有强制登录墙。

**整体风格**

- 紫粉渐变 + 大量光晕，整体糖果系，与 Talkie 的"霓虹机能"截然不同。
- 角色卡比例极大，**单角色 hero 卡占据首屏中央**，左右两侧空很多，整体
  极强的"Tinder for AI girlfriend"感。
- 角色信息只有：头像、`姓名 + 年龄`（例如 `Carla 21` / `Lena 20`）。没有
  category tab、没有 chat 数、没有创作者归属。

**底部主操作**

只有两颗大按钮：

- ✗ **No**（红色圆按钮，跳过）
- ✓ **Make Her Yours**（粉色大按钮，进聊天）

完全是 Tinder 滑卡的 UI 翻译。**没有 Talkie 那种"瀑布流网格"。**

**侧栏（折叠菜单）**

`🏠 Home` / `💬 Messages` / `⚙️ Settings` / `🚪 Logout` +
`🌓 Dark Mode` 切换 + `🎨 Color Palette` 自定义。注意：

- 强调了 **主题色自定义**（用户能调整粉/紫主色），这是 Crushly 的视觉差异点。
- `/messages` 路径未登录时 404，说明 chat 入口只能从首页 `Make Her Yours`
  进入。

**对我们的实现的含义**

- 首页 UX 有两条岔路：
  - **Talkie 路线**：grid + 标签筛选，更"内容平台"。
  - **Crushly 路线**：单卡 + Tinder 滑动，更"私域陪伴"。
- 如果目标是「能展示动漫等各种类型角色」（用户原话），**Talkie 路线更合适**，
  因为 grid + tag 才能容纳大量角色。Crushly 那种单卡屏幕不利于浏览。
- 但 Crushly 的视觉糖（渐变、Color Palette、大头图、年龄前缀）可以挪用到
  Talkie-grid 里的"卡片美学"层。

---

## 8. Talkie 聊天页（实测 send → reply 全流程）

实测页：`https://www.talkie-ai.com/zh-Hant/chat/gamer-bf-nathan-12442`。
截图：`/tmp/talkie-chat-nathan.png`（进入态）、
`/tmp/talkie-chat-nathan-after-send.png`（发出后）、
`/tmp/talkie-chat-nathan-reply.png`（等回复）。

**页面分区（从上到下）**

1. 顶部全局导航：`go to talkie home page` 链接 + `建立 Talkie / 探索 / 搜尋
   / 記憶 / 社群 / 通知 / Talkie Claw` 一字排开。
   - **这条全局导航在 chat 页依然存在**，不像 IM 那样独占整个 viewport。
2. 角色卡块：头像、名字「Gamer BF Nathan」、`由 @raxcl2002`、`追蹤` 按钮。
3. 语音条：`4″ 點擊收聽` —— 角色 TTS 试听。
4. 角色专属玩法按钮：`他們的電話` / `秘密空間`（chat 之外的二级互动入口）。
5. 主输入框：placeholder「訊息 Gamer BF Nat...，AI 回覆」。
   - **textarea，不是 input**；按 Enter 发送（实测 dispatchEvent Enter 即触
     发上行）。
6. **正文不是单纯消息流**，而是「角色簡介 + 留言区」。本次进入页面时主区已经
   能直接看到：
   - `簡介` 文本：`Nathan is a 23-year-old software engineer who can't wait
     to get home to his gaming setup every day. Nathan is the guy who lives
     in his favorite black hoodie…`（简介反复出现 3 次，疑似不同卡片版本）。
   - 一组用户留言（不是用户与角色的对话），每条带 `回覆 / 分享` 操作 +
     回复数字（1 / 6 / 3 / 1 / 1 / 1），最后是 `View 14 Replies`。
7. 留言提交框：textarea「輸入您對此 Talkie 的留言...」+ `取消 / 發布` 按钮。
   - **这是社区评论流，不是私聊**。

**send → reply 实测**

通过 DOM eval 把 `hey Nathan, just got off work, what are you up to?` 写入
`textarea.ant-input`（class `ChatBox_inputControl`）后按 Enter，**实际是
发出去了**。从 `.ChatBox_chatContainer__5qWUs` 里读到完整对话流（已脱敏）：

```
[用户]  hey Nathan, just got off work, what are you up to?
[Nathan] 4″點擊收聽
        scratching his hair while closing his game
        Only for you. You're worth pausing during a boss fight.
```

更早历史里还看到：

```
[用户]  are you ok?
[Nathan] 6″
        jumps up from the gaming chair, nearly knocking over an energy drink can
        Yeah! I'm fine! Just got really into the game and forgot to eat.
        You wanna order a pizza?
```

**消息结构清楚了**：

- 每条角色消息有 **三段**：
  1. **语音条**：`6″` / `4″` 等时长前缀，可点击播放 TTS。
  2. **动作旁白**：第三人称叙述（`scratching his hair while closing his
     game`），约等于小说里的"心理 / 动作描写"。视觉上用斜体或浅色字与对白
     区隔。
  3. **角色对白**：第一人称台词。
- 用户消息只有纯文本（无语音、无旁白）。
- 渲染层把这些拼到 `ChatBox_message` 块里，没有传统 IM 那种气泡区分；外层
  Wrapper 是 `ChatBox_chatContainer`、输入框是 `ChatBox_inputControl`。
- 之前观察以为「Talkie chat 进入页只有简介 + 评论」是错的：**正文同时
  有对话流 + 角色简介 + 留言区**，三块在同一页平铺，靠滚动切换；首屏停在
  对话流位置。简介和留言之所以在 DOM 探针靠前是因为静态渲染顺序。

**对我们的实现的含义**

- chat 路由 UX 是 **"对话流 + 角色卡 + 留言区"三层平铺**，靠滚动切换。我们
  当前 `roleplay-chat.tsx` 只渲染对话流，需要叠加：
  - 上半屏 chat container（默认进入位置）。
  - 中段 角色简介 / 创作者 / 关注 / 角色专属玩法（"他們的電話" 这类入口）。
  - 下半屏 留言区（顶层评论 + reply 折叠）。
- 角色消息要支持 **三段渲染**：语音 + 动作旁白 + 对白。生成端 prompt 需要约
  束模型输出 `*action*` / `dialogue` 两段（行业常用 markdown asterisk 包动
  作），前端解析后用不同样式渲染。
- 数据模型：
  - `roleplay_message.kind` 加 `voice_url`、`narration`、`text` 三字段，或者
    用单字段 markdown 由前端解析。
  - `roleplay_character_comment` 表（character_id / user_id / parent_id /
    text / like_count）支持楼中楼。
- 输入框是 textarea + Enter 发送（实测 Enter keydown 直接触发上行；shift
  + Enter 应该是换行，未现场验证）。**没有右侧 send 按钮**——纯键盘交互，
  这跟 Crushly / 我们当前 `Send` 圆按钮不一样。手机端如果不放 send 按钮，
  iOS 软键盘要显示「换行/发送」切换才能用。

---

## 10. Crushly 聊天页（实测 send → reply 全流程）

实测页：`https://crushly.com/messenger/`（首页点 `Lena Start a conversation`
也会跳到这里）。截图：
- `/tmp/crushly-messenger-empty.png`（进入态）
- `/tmp/crushly-lena-after-reply.png`（发完一句后）

**布局**

- 顶部：左侧汉堡 `×`（关闭 / 折叠侧栏）+ 数字 `49`（金币 / 货币计数）。
- 侧栏内容：
  - `🏠 Home` / `👀 See other women` / `💬 Messages` / `⚙️ Settings` /
    `🚪 Logout`
  - `🌓 Dark Mode` 切换、`🎨 Color Palette 0/7` 配色解锁进度。
- 主区：单一对话视图（`Lena` + 上一条预览：`Hey, just winding down afte...`），
  右上角有 **`Break up`** 按钮（解除关系；从交互语义上等于 Talkie 的"取消
  追蹤"）。
- 底部输入：`textarea[placeholder=Message]` + `Attach file` + 一颗发送图标
  按钮（无文字 label）。

**send → reply 实测**

输入 `hi Lena, what are you up to tonight?` 点击发送图标，约 8 秒内拿到回复：

```
[用户]  hi Lena, what are you up to tonight?       Just now ✓✓
[Lena]  Hey, just winding down after classes.
        How's your night going?                    Just now
                                                   1 per message
```

观察：

- **每条用户消息底部都打 `✓✓` 已读标识** —— 模拟 WhatsApp/Telegram 的双勾。
  这是"虚拟女友"产品的典型情绪锚点，让对话感觉"真人在读"。
- **每条回复右下角写 `1 per message`** —— 这是 **按条计费提示**，对应顶部
  `49` 金币条。每发一句消耗 1 个 credit，**和 Talkie 的"无限免费聊天"商业
  模式完全相反**。
- 用户消息没有头像，角色消息也只是名字 + 文本，没有 Talkie 那种"语音 +
  动作旁白 + 对白"三段结构。**纯文本气泡**，更像 IM。
- 没有评论区、没有创作者、没有"角色专属玩法"按钮。整个 messenger 就是
  一对一私聊。

**对我们的实现的含义**

- Crushly 的 chat 就是 IM 的 1:1 翻版：
  - **侧栏 + 单聊主区** 的两列布局，移动端折叠成 drawer。
  - **已读双勾** 是廉价高情绪价值的细节。可以加，但语义要诚实——只有当
    后端真的把消息打到对方上下文了才显示双勾。
  - **按条计费提示** 暴露了 paywall 节奏。我们短期不做付费可以省掉，但
    UI 上得给"剩余 credit"留位置（顶栏数字位）。
- Crushly 没有"对话流之外的内容"，与 Talkie 的"chat = profile + 对话 + 评论"
  方向相反。**两个产品要做的取舍**：
  - 如果走"AI 女友"私聊向，Crushly 模式更直接。
  - 如果走"角色平台"内容向，Talkie 模式更可扩展。
  - 用户原话"想做成适合手机展示、能自动隐藏菜单"+"展示动漫等各种类型角色"
    更倾向 **Talkie 内容向**：grid 浏览 + chat 详情。Crushly 的细节（已读、
    Color Palette、糖系渐变）作为视觉糖叠加上来。
- **关键差异点（用于决策）**：
  | 维度 | Talkie | Crushly |
  |------|--------|---------|
  | 首页 | grid + 8 类标签 | Tinder 单卡 |
  | chat 入口 | 直链 chat URL | 必须在首页 swipe 解锁 |
  | chat 内容 | 对话 + 角色卡 + 评论 | 纯对话 |
  | 消息结构 | 语音 / 动作旁白 / 对白 三段 | 纯文本气泡 |
  | 商业模式 | 免费 + 订阅 -50% | 按条 1 credit |
  | UGC | 用户自建角色 + 草稿/审核 | 无（平台预设） |
  | 视觉 | 暗紫 / 霓虹机能 | 紫粉 / 糖系 + Color Palette |
  | 关系操作 | `追蹤` / `取消追蹤` | `Break up` |

---

## 11. 实测中遇到的非业务问题（备忘）

- bb-browser viewport 卡在 1512×785（managed Chrome 不响应 `window.resizeTo`）
  导致这次都是按桌面端抓的，**移动端排布需要后续单独抓**。需求里"适合手机
  展示、能自动隐藏菜单"这条暂时没有现场观察支撑，需要再看一次。
- Talkie 首页 `Google vignette` 广告会拦截 card click，DOM click 不可靠。
  解决：用 `document.querySelectorAll('a[href*=chat]')` 拿真实 URL，再
  `bb-browser open` 直接进。
- Crushly `/messages` 路径不存在，chat 入口只在首页底部 `Make Her Yours`。
  下一次抓 chat 详情得先在首页点该按钮，再读 URL。

---

## 下一步建议（更新版）

1. **下一次开始抓**：
   - Talkie 移动端布局（用真实手机 / Chrome DevTools mobile mode 抓），
     重点看导航是不是 hamburger / sticky bottom tab。
   - Talkie chat 详情页 **完整对话流**：发一句 → 看回复 → 看 typing 动画
     和留言区 UX。本次只抓了进入页，没走 send → reply。
   - Crushly chat 详情页：从首页 `Make Her Yours` 进入，抓输入栏和回复样式。
   - Crushly create 流程：先确认它是否允许用户自建（vs 全平台预设角色）。
2. **基于上面的字段模型，把当前项目 `roleplay_character` schema 升级**：
   - 新增 `gender`、`skills jsonb`、`status enum`、`creator_user_id`、
     `chat_count`、`like_count`。
   - 拆 `settings`（system prompt）与 `intro`（用户可见简介）。
3. **AI Writer 端点**：先做非 streaming 版（一次返回 JSON 四字段），UI 上
   先复刻 Talkie 那个 modal 形态（Cancel / Retry / Save 三按钮）。
4. **首页 picker**：照 Talkie 的 8 个一级 tag 做横向滚动栏，下面 grid。
   暂不做 Crushly 的 Tinder 模式（与"展示多类型角色"的目标冲突）。
