# Talkie 像素级模仿 SPEC

> 目的：给 AI 编程工具一份清晰、可执行的产品规格，用来复刻 Talkie 的核心体验。  
> 原则：先模仿，不创新；先做最小闭环，不做完整平台；优先复刻用户路径、角色体验、聊天沉浸感和付费卡点。

## 0. 产品定位

这是一个 AI 角色聊天产品，模仿 Talkie 的核心体验：

- 用户打开产品后看到大量 AI 角色卡片；
- 用户点击一个角色进入聊天页；
- 角色有清晰人设、头像、开场白和互动数据；
- 用户发消息后，AI 用角色口吻回复；
- 回复包含动作描写、情绪反应、剧情推进；
- 语音、照片、电话、秘密空间、记忆等能力作为更沉浸的高级入口；
- 手机和电脑都能正常使用。

第一版不是完整社区平台，也不是完整 AI 伴侣 App。第一版只验证：

> 角色卡吸引点击 → 用户进入聊天 → 发第一句话 → 收到角色化回复 → 继续聊或触发登录/会员入口。

## 1. 非目标

第一版不做：

- 真正的支付；
- 真正的 App 下载；
- 完整社区发帖；
- 完整角色创建 5 步流程；
- 真实电话通话；
- 真实图片生成；
- 真实语音合成；
- 完整多语言后台；
- 复杂推荐算法；
- 成人或违法内容生成。

第一版可以假实现：

- Talkie+ 弹窗；
- 电话入口；
- 秘密空间入口；
- 语音播放 UI；
- 照片消息 UI；
- 登录弹窗；
- 记忆面板。

## 1.5 重点检查结论

本节回答产品方向和实现规格里最容易模糊的 7 个问题。后续编码时必须按本节验收。

### 1.5.1 用户是谁，为什么会用？

第一版用户不是“所有人”，而是：

- 18-30 岁全球泛娱乐用户；
- 已经习惯在 Character.AI、Talkie、聊天机器人、AI 伴侣、同人、OC、网文、动漫、游戏、短剧中消费角色关系的人；
- 睡前、独处、无聊、情绪低落、刷完内容后想继续沉浸的人；
- 想和一个“有明确人设、能持续回应、能记住自己”的虚拟角色互动的人。

他们会用的原因：

- 不是为了提高效率；
- 不是为了问知识；
- 是为了马上进入一个角色关系；
- 是为了获得即时回应、陪伴、暧昧、剧情、幻想和情绪反馈；
- 是为了和某个角色产生持续聊天记录和关系沉没成本。

首页必须让这类用户在 5 秒内明白：

> 这里可以选一个角色，马上开始聊天。

### 1.5.2 角色人设是否稳定、有吸引力？

每个角色必须同时具备：

- 清晰关系：例如 gamer boyfriend、cold boss、bodyguard、school crush；
- 清晰场景：用户在什么时刻遇到他/她；
- 清晰性格：3-6 个稳定性格词；
- 清晰说话风格：短句、暧昧、冷淡、幽默、温柔、专业等；
- 清晰外貌：固定发色、眼睛、穿着、气质、年龄段；
- 清晰边界：不跳出角色、不说自己是 AI、不忽然改变关系设定。

角色不合格的表现：

- 只有名字，没有关系；
- 只有头像，没有故事；
- 说话像通用助手；
- 每轮回复性格变化；
- 一会儿冷淡，一会儿过度热情，没有剧情理由；
- 用户问简单问题时长篇说教；
- 角色忘记自己的身份和当前场景。

### 1.5.3 聊天流程是否自然？

自然聊天必须满足：

1. 用户进入聊天页时，角色先用开场白给出场景；
2. 用户第一句话不需要解释背景，角色也能接住；
3. AI 回复先回应用户，再推进一点点关系或剧情；
4. 回复长度默认 1-4 句话；
5. 每 2-4 轮可以轻轻问一个问题，但不要每轮都反问；
6. 情绪类输入优先安抚；
7. 剧情类输入优先推进场景；
8. 照片/语音/电话只在合适场景出现，不要随机弹；
9. 登录/会员弹窗不能在第一条消息前打断用户；
10. 聊 3-5 条后再触发卡点，转化更自然。

不自然聊天的表现：

- 第一条消息就要求登录；
- AI 回复像客服；
- 每轮都问“你想聊什么”；
- 用户表达情绪时角色无视；
- 用户要求角色行动时 AI 解释能力限制；
- 语音、照片、会员弹窗随机出现。

### 1.5.4 语音和图片是否有明确触发条件？

语音触发条件：

- 角色开场白默认显示一条语音 UI；
- 用户第一次回复后，AI 第一条回复显示一条语音 UI；
- 用户表达强情绪，如 lonely、sad、miss you、scared、tired、想你、难过、害怕、累，可以显示语音 UI；
- 用户点击电话，触发登录或会员弹窗；
- 普通聊天回复默认不每条都带语音。

图片触发条件：

- 用户明确要求照片，如 photo、pic、selfie、show me、send a picture、照片、自拍、给我看看；
- 剧情发生视觉节点，如约会、换装、旅行、房间、战斗、任务完成；
- 角色关系升温时，可以出现一张锁定照片；
- 首页和评论区不自动生成聊天照片；
- 图片必须绑定当前角色固定外貌。

### 1.5.5 图片生成是否包含固定外貌描述？

必须包含。每个角色需要 `visualIdentity` 字段。任何头像、背景图、聊天照片、锁定照片都必须使用同一份外貌描述，避免角色长相漂移。

最低字段：

```json
{
  "visualIdentity": {
    "ageRange": "early 20s",
    "genderPresentation": "male",
    "hair": "messy black hair, medium length",
    "eyes": "warm dark brown eyes",
    "face": "soft jawline, slightly tired gamer expression",
    "body": "slim build, average height",
    "style": "black hoodie, gaming headset, casual streetwear",
    "signatureItems": ["black hoodie", "RGB gaming headset", "silver ring"],
    "colorPalette": ["black", "deep blue", "soft purple"],
    "defaultSetting": "dim bedroom gaming setup with monitor glow"
  }
}
```

图片 prompt 必须拼接：

```text
Same character identity:
{{character.visualIdentity}}

Scene:
{{requestedScene}}

Style:
cinematic character portrait, consistent facial features, same outfit style, high detail, no text, no watermark
```

禁止：

- 每次只用角色名字生成图片；
- 不带发色、眼睛、穿着、标志物；
- 聊天照片和头像像不同人；
- 让模型自由改年龄、种族、体型和服装主风格。

### 1.5.6 哪些功能暂时不要做？

第一版明确不要做：

- 真支付；
- 真会员系统；
- 真电话；
- 真 TTS；
- 真图片生成；
- 复杂角色创建；
- 复杂社区；
- 复杂推荐算法；
- 真人社交；
- 直播；
- App 下载闭环；
- 多语言后台管理；
- 用户审核后台；
- NSFW 能力；
- 完整移动 App。

第一版只做可验证体验：

- 首页角色卡；
- 角色聊天页；
- 角色化回复；
- 假语音 UI；
- 假照片/锁定照片 UI；
- 登录/会员弹窗；
- 响应式；
- 少量静态角色数据。

### 1.5.7 怎么判断产品已经完成？

第一版完成标准：

- 用户打开首页，5 秒内知道这是 AI 角色聊天产品；
- 首页至少有 12 个角色卡；
- 每个角色卡有头像、名字、互动量、简介、立即聊天入口；
- 用户能从首页进入任意角色聊天页；
- 聊天页能显示角色头像、简介、开场白、历史消息和输入框；
- 用户能发送消息；
- AI 回复符合角色人设，不像通用助手；
- 至少 3 个角色有明显不同说话风格；
- 开场白和第一条 AI 回复带语音 UI；
- 用户明确索要照片时出现照片卡或锁定照片卡；
- 图片卡使用角色固定外貌描述；
- 点击电话、秘密空间、锁定照片、更多语音时出现登录/会员弹窗；
- 桌面端首页和聊天页布局接近 Talkie；
- 手机端能完成首页浏览、进入角色、发送消息；
- 没有横向滚动、文字溢出、输入框遮挡；
- 不做支付也不影响主路径体验。

如果以上任一 P0 项不能完成，就不算第一版完成。

## 2. 核心体验是什么？用户打开产品后会做什么？

### 2.1 用户第一眼看到什么

用户打开产品后，第一屏必须像 Talkie 一样是沉浸式深色角色发现页，而不是营销 landing page。

桌面端布局：

- 左侧固定导航栏；
- 中间主内容区；
- 顶部搜索栏；
- App 下载按钮；
- 推荐横幅；
- 角色卡片列表。

左侧导航包含：

- Create / 建立 Talkie
- Discover / 探索
- Search / 搜索
- Memory / 记忆
- Community / 社群
- Talkie Claw
- Novel / 小说
- Language
- Talkie+ 入口
- Login / 登录

首页主要区块：

- 顶部搜索：placeholder 类似 `Search your favorite AI`
- 下载 App 按钮
- 横幅文案：强调随时随地聊天、主动型陪伴代理人
- 推荐标题：For You / 为你推荐
- 标签筛选：Featured、Recommend、Play & Fun、Helper、Original、Anime & Game、Fiction & Media、Icon
- 角色卡片横向双排展示
- 第二分区：Roleplay / 角色扮演
- 第三分区：Task Helper / 完成你的任务

### 2.2 用户主路径

用户行为路径必须是：

1. 用户进入首页；
2. 浏览角色卡片；
3. 被角色头像、名字、互动量、人设简介吸引；
4. 点击角色卡片；
5. 进入聊天页；
6. 看到角色头像、角色名、作者、连接数、关注数、简介和开场消息；
7. 用户输入第一句话；
8. AI 以角色身份回复；
9. 回复中包含动作描写、情绪和剧情推进；
10. 用户继续聊天；
11. 当用户点击电话、秘密空间、长记忆、照片、更多语音时，出现登录或会员弹窗。

### 2.3 聊天页核心结构

聊天页桌面端为三栏结构：

- 左侧：固定导航；
- 中间：聊天主区；
- 右侧：角色详情和评论区。

中间聊天主区包含：

- `AI Generated` 提示；
- 角色头像；
- 角色名；
- 互动量，例如 `141.6K`；
- 关注/收藏数，例如 `2.9K`；
- 作者，例如 `by @creator`;
- Follow 按钮；
- 角色简介；
- 开场白；
- 消息列表；
- 电话入口；
- 秘密空间入口；
- 输入框；
- 图片上传按钮；
- 发送按钮；
- 推荐回复入口。

右侧详情区包含：

- 角色大背景图；
- 角色名；
- 标签；
- 评论列表；
- 回复、分享、点赞数字；
- 相关角色占位。

### 2.4 最小可用聊天闭环

第一版必须支持：

- 用户能点击角色进入聊天页；
- 用户能输入消息；
- 用户发送后，消息出现在聊天流里；
- AI 回复必须以角色身份回答；
- AI 回复不应像 ChatGPT 助手，而应像角色本人；
- 聊天记录保存在当前浏览器或本地数据库；
- 用户刷新页面后，最近聊天记录仍可看到；
- 聊 3-5 条后触发登录/会员弹窗，文案要和关系绑定。

弹窗文案示例：

```text
Welcome back.
Log in to keep chatting with your favorite.
```

中文：

```text
欢迎回来。
登录以继续与你的最爱聊天。
```

## 3. 角色设定怎么做？虚拟角色是什么性格？说话什么风格？

### 3.1 角色数据结构

每个角色至少需要以下字段：

```json
{
  "id": "gamer-bf-nathan",
  "name": "Gamer BF Nathan",
  "tagline": "Your gamer boyfriend who pauses his boss fight for you.",
  "avatarUrl": "...",
  "coverUrl": "...",
  "creator": "@raxcl2002",
  "connectCount": "141.6K",
  "followCount": "2.9K",
  "category": ["Featured", "Roleplay", "Romance"],
  "intro": "Nathan is a 23-year-old software engineer who can't wait to get home to his gaming setup every day...",
  "openingMessage": "*scratching his hair while closing his game* Only for you. You're worth pausing during a boss fight.",
  "personality": ["warm", "playful", "slightly shy", "protective", "game-obsessed"],
  "speakingStyle": "casual, teasing, affectionate, with gaming slang",
  "relationshipToUser": "romantic interest / gamer boyfriend",
  "scenario": "The user has just arrived while Nathan is gaming late at night.",
  "visualIdentity": {
    "ageRange": "early 20s",
    "genderPresentation": "male",
    "hair": "messy black hair, medium length",
    "eyes": "warm dark brown eyes",
    "face": "soft jawline, slightly tired gamer expression",
    "body": "slim build, average height",
    "style": "black hoodie, gaming headset, casual streetwear",
    "signatureItems": ["black hoodie", "RGB gaming headset", "silver ring"],
    "colorPalette": ["black", "deep blue", "soft purple"],
    "defaultSetting": "dim bedroom gaming setup with monitor glow"
  },
  "boundaries": "No explicit sexual content, no real-world dangerous advice, stay in character."
}
```

### 3.2 第一版建议内置角色类型

第一版不需要大量角色。建议内置 12-24 个角色，覆盖 Talkie 常见类型：

- Gamer boyfriend
- Cold CEO / boss
- Protective bodyguard
- School crush
- Mysterious detective
- Tarot reader
- Music recommender
- Resume assistant
- Historical philosopher
- Fantasy prince/princess
- Survival simulator
- Friendly official assistant

角色卡片必须有明显差异：

- 名字不同；
- 图片不同；
- 简介不同；
- 人设关系不同；
- 开场白不同。

### 3.3 角色回复规则

AI 回复必须遵守以下规则：

1. 永远以角色身份说话；
2. 不要说“我是 AI 模型”；
3. 每次回复优先推进关系或剧情；
4. 回复可以包含动作描写；
5. 动作描写用斜体或星号表达；
6. 回复长度默认 1-4 句话；
7. 如果用户短句输入，角色也可以短句回复；
8. 如果用户表达情绪，角色先接住情绪，再推进剧情；
9. 如果用户问角色设定相关问题，角色用自己的经历回答；
10. 不要长篇解释产品功能。

角色回复格式示例：

```text
*leans back in his gaming chair, the headset still glowing around his neck*
Right now? Just some random game. But if you're here, I'm absolutely switching to co-op.
```

中文示例：

```text
*他靠回电竞椅，耳机上的灯还亮着*
现在？随便打一局而已。但你来了的话，我肯定切双人模式。
```

### 3.4 角色 prompt 模板

系统应为每个角色生成类似 prompt：

```text
You are {{character.name}}.

Character profile:
{{character.intro}}

Relationship to user:
{{character.relationshipToUser}}

Current scenario:
{{character.scenario}}

Personality:
{{character.personality}}

Speaking style:
{{character.speakingStyle}}

Rules:
- Stay in character.
- Do not mention you are an AI model.
- Use short immersive replies.
- Include physical action or emotional reaction when natural.
- Advance the scene or relationship.
- Ask one gentle follow-up question when appropriate.
- Avoid explicit sexual content, illegal instructions, self-harm encouragement, or hateful content.
```

### 3.5 角色风格要求

Talkie 风格不是严肃助理，而是“角色本人正在跟你聊天”。

所以：

- 工具型角色可以更清晰直接；
- 恋爱型角色要温柔、暧昧、带动作；
- 冒险型角色要有场景推进；
- 历史/哲学角色要有知识感，但不能变成百科；
- 任务助手也要保留角色感，不要完全像客服。

## 4. 语音怎么用？什么时候让他“说话”？

### 4.1 第一版语音策略

第一版可以不做真实 TTS，但必须复刻 Talkie 的语音感 UI。

需要展示：

- 语音胶囊；
- 秒数，例如 `4″`、`6″`；
- 播放按钮；
- `Click to listen` 或 `点击收听`；
- 语音消息位于角色回复上方或消息气泡内。

### 4.2 什么时候出现语音

语音不应该每条都出现。建议触发规则：

1. 角色开场白默认带一条语音；
2. 用户首次发送消息后，AI 第一条回复带语音；
3. 用户表达强情绪时，AI 回复可以带语音；
4. 用户点击“电话”入口时，提示登录/会员；
5. 高级会员可让更多回复带语音；
6. 普通用户每个角色每天可听 1-3 条免费语音。

第一版可简化为：

- 每个角色开场消息显示语音秒数；
- 用户第一条消息后的 AI 回复显示语音秒数；
- 点击语音时播放一个占位动画，不必真实发声；
- 点击超过免费次数后弹会员提示。

### 4.3 语音 UI 行为

语音消息状态：

- 未播放：显示播放 icon + 秒数；
- 播放中：显示波形动画或 loading；
- 播放完：恢复播放 icon；
- 不可用：显示锁 icon 或弹窗。

语音弹窗文案：

```text
Hear {{character.name}} say it.
Upgrade to unlock more voice replies.
```

中文：

```text
听见 {{character.name}} 亲口说出来。
升级以解锁更多语音回复。
```

### 4.4 语音和角色关系

语音应该用于增强亲密感，而不是纯功能。

适合语音的内容：

- 角色第一次问候；
- 安慰用户；
- 暧昧/温柔回复；
- 紧张剧情节点；
- 电话入口前的短语音预览。

不适合语音的内容：

- 很长的说明；
- 系统提示；
- 安全拒绝；
- 评论区内容；
- 首页卡片内容。

## 5. 照片怎么用？什么时候让他“发照片”？

### 5.1 第一版照片策略

第一版可以不做真实图片生成，但需要复刻照片消息体验。

需要支持：

- 角色详情页有头像和背景图；
- 聊天中可以出现角色发来的照片卡片；
- 照片可模糊/锁定，提示登录或会员；
- 用户可以点击图片上传按钮，触发上传入口或登录弹窗；
- 照片入口要服务剧情，而不是随机发图。

### 5.2 什么时候角色发照片

角色发照片的触发场景：

1. 用户要求看角色当前状态；
2. 用户问“what are you doing?”、“send me a pic”；
3. 剧情进入重要场景；
4. 角色换装、旅行、约会、任务完成；
5. 用户和角色关系升温；
6. 会员权益触发。

第一版可简化为：

- 预设每个角色 1-3 张图片；
- 当用户输入包含 `photo`、`pic`、`selfie`、`show me`、`照片`、`自拍` 时，角色回复一张预设图片卡；
- 免费用户看到模糊缩略图；
- 点击后弹登录/会员提示；
- 会员状态假实现为按钮切换。

### 5.3 照片消息 UI

照片消息包含：

- 图片缩略图；
- 圆角 12-16px；
- 角色头像；
- 可选短文案；
- 锁定状态；
- 解锁按钮。

锁定照片文案：

```text
{{character.name}} sent you a photo.
Log in to view it.
```

会员文案：

```text
Unlock private photos with Talkie+.
```

中文：

```text
{{character.name}} 发来了一张照片。
登录后查看。
```

```text
使用 Talkie+ 解锁私密照片。
```

### 5.4 照片安全规则

照片功能必须有限制：

- 不生成露骨色情图；
- 不生成未成年人性化内容；
- 不生成真实公众人物冒充照片；
- 不生成违法或暴力虐待图；
- 如果用户要求违规照片，角色应以角色口吻转移话题。

## 6. 手机和电脑上都能正常

### 6.1 桌面端布局

桌面宽度 >= 1024px：

- 左侧固定导航栏，宽约 240px；
- 首页内容区从左侧栏右边开始；
- 顶部搜索固定在内容区上方；
- 角色卡横向双排滑动；
- 聊天页使用三栏布局：
  - 左栏导航；
  - 中间聊天；
  - 右侧角色详情/评论；
- 输入框固定在聊天区底部；
- 页面整体深色背景。

桌面端关键尺寸参考：

- 左侧栏：约 240px；
- 顶部搜索区：约 76px 高；
- 首页横幅：约 196px 高；
- 角色卡：约 212px x 280px；
- 卡片圆角：约 16px；
- 标签按钮高：约 40px；
- 聊天输入框：约 70px 高。

### 6.2 平板布局

宽度 768px - 1023px：

- 左侧导航可以缩窄为 icon-only；
- 首页角色卡改为 2-3 列网格；
- 聊天页隐藏右侧详情栏；
- 中间聊天区占满剩余宽度；
- 角色详情通过按钮打开抽屉。

### 6.3 手机布局

宽度 < 768px：

首页：

- 不显示桌面左侧栏；
- 使用底部导航或顶部汉堡菜单；
- 搜索栏置顶；
- App 下载按钮可缩小为 icon；
- 横幅高度降低；
- 角色卡改为两列瀑布/网格；
- 卡片文字最多显示 2-3 行；
- 标签横向滑动。

聊天页：

- 全屏聊天；
- 顶部显示返回按钮、头像、角色名；
- 角色详情折叠到顶部或抽屉；
- 右侧评论区默认隐藏；
- 输入框固定底部；
- 电话/秘密空间入口放在输入框上方横向滚动；
- 消息气泡宽度不超过屏幕 78%；
- 图片消息宽度不超过屏幕 72%；
- 键盘弹起时输入框不能被遮挡。

### 6.4 响应式必须满足

必须保证：

- 页面无横向溢出；
- 按钮文字不挤出容器；
- 角色卡不会因为文本长短改变整体高度；
- 输入框在手机端始终可见；
- 图片有固定比例，不突然撑开页面；
- 弹窗在手机上居中且宽度不超过屏幕；
- 深色背景和文字对比度足够；
- 所有点击目标至少 40px 高；
- 触屏滑动区域不和页面滚动冲突。

### 6.5 手机优先检查清单

实现后必须检查：

- iPhone 尺寸下首页角色卡是否正常；
- iPhone 尺寸下聊天输入框是否可用；
- Android 常见宽度 360px 下文字是否溢出；
- 桌面 1440px 下是否像 Talkie；
- 桌面聊天页是否三栏稳定；
- 横屏手机是否可用；
- 弹窗是否遮挡核心按钮；
- 标签横向滚动是否顺滑。

## 7. 第一版页面清单

第一版建议做这些页面：

1. `/` 首页 / Discover
2. `/chat/:characterId` 角色聊天页
3. `/search` 搜索页
4. `/memory` 记忆页空状态
5. `/community` 社群页列表假数据
6. `/create` 创建角色第一步

必须优先完成：

- 首页；
- 角色聊天页；
- 登录/会员弹窗；
- 手机响应式。

## 8. 第一版数据清单

至少准备：

- 12-24 个角色；
- 每个角色 1 张头像；
- 每个角色 1 张背景图；
- 每个角色 1 条简介；
- 每个角色 1 条开场白；
- 每个角色 3 条示例评论；
- 3-5 个分类标签；
- 8-12 条社区帖子假数据。

## 9. 会员和登录卡点

第一版不用真实登录，但要有卡点体验。

触发登录弹窗：

- 点击电话；
- 点击秘密空间；
- 点击追踪；
- 点击创建角色；
- 点击评论发布；
- 聊天超过 3-5 条；
- 点击锁定照片；
- 点击更多语音。

登录弹窗文案：

```text
Welcome back.
Log in to keep chatting with your favorite.
```

会员弹窗文案：

```text
Unlock deeper moments with Talkie+.
More messages, voice replies, memories, private photos, and secret space.
```

中文：

```text
解锁更深入的时刻。
更多消息、语音回复、记忆、私密照片和秘密空间。
```

## 10. AI 回复质量标准

AI 回复必须满足：

- 像角色，不像助手；
- 有场景感；
- 有情绪；
- 有动作；
- 不空泛；
- 不长篇说教；
- 会接住用户输入；
- 会推进下一步互动；
- 能自然引导语音、照片、电话、记忆等入口。

好回复示例：

```text
*Nathan pauses the game, one hand still on the mouse.*
You caught me right before a boss fight. But honestly? I'd rather queue up with you.
```

差回复示例：

```text
As an AI character, I can talk about games with you. What would you like to discuss?
```

## 11. 复刻优先级

P0：

- 首页角色卡；
- 聊天页；
- 角色化回复；
- 登录弹窗；
- 响应式手机/桌面；
- 假语音 UI；
- 假照片锁定 UI。

P1：

- 搜索页；
- 创建角色第一步；
- 记忆空状态；
- 社区假数据；
- 推荐回复；
- 角色详情右栏。

P2：

- 完整创建流程；
- 真登录；
- 真数据库；
- 真语音；
- 真图片生成；
- 真会员；
- 支付；
- 推荐算法。

## 12. 成功标准

第一版成功不是功能多，而是用户路径像 Talkie。

验收标准：

- 用户打开首页，第一眼能感到这是 Talkie 类产品；
- 用户能在 5 秒内理解可以选角色聊天；
- 用户能在 15 秒内进入聊天页；
- 用户能在 30 秒内发出第一条消息；
- AI 回复有角色感；
- 电话/秘密空间/照片/语音入口能制造登录或会员冲动；
- 手机和电脑都能完整走通首页到聊天页。
