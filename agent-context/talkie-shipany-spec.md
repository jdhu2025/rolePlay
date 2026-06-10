# Talkie 像素级模仿 ShipAny 版 SPEC

> 本 SPEC 替代 `talkie-pixel-clone-spec.md`，因为当前项目底座已经是 ShipAny。ShipAny 已提供 Next.js、登录鉴权、数据库、支付、Credits、文件存储、AI 生成、管理后台等能力，因此第一版范围可以从“静态 MVP”扩大为“可注册、可保存聊天、可消耗 credits、可触发付费”的产品版本。  
> ShipAny 快速开始文档：https://shipany.ai/zh/docs/quick-start

## 0. ShipAny 底座假设

### 0.1 已有能力

基于当前 `shipany-template-dev` 代码和 ShipAny 文档，默认可复用：

- Next.js 16 App Router；
- 多语言路由：`/[locale]`；
- Better Auth 登录鉴权；
- 邮箱登录、Google 等社交登录配置能力；
- PostgreSQL + Drizzle；
- 用户表、会话表、账号表；
- Chat / Chat Message 基础表；
- Order / Subscription / Credit 表；
- Stripe / PayPal / Creem 支付扩展；
- Credits 查询和消耗模型；
- AI 生成接口；
- OpenRouter 聊天流式接口；
- 图片上传到对象存储；
- Admin 后台；
- RBAC 权限系统；
- Landing / Pricing / Settings / Billing 基础页面；
- Analytics、邮件、客服、广告等扩展能力。

### 0.2 本项目新增核心

在 ShipAny 之上新增 Talkie-like 产品层：

- AI 角色发现首页；
- 角色详情聊天页；
- 角色库；
- 角色人格 Prompt；
- 角色长期记忆；
- 角色照片和语音入口；
- 电话 / 秘密空间 / 图片 / 语音等高级权益卡点；
- 用户收藏/追踪角色；
- 创建角色流程；
- 社区帖子和评论的第一版；
- Credits 消耗规则；
- Talkie+ 会员套餐。

### 0.3 对标产品补充

主对标仍是 Talkie：

- 角色发现首页；
- 角色市场；
- 搜索和标签活动；
- 角色公开资料页；
- 创作者主页；
- 社区和记忆。

Candy.ai 作为商业化和创建流程参考：

- `Create Character` / `My AI` 是供给侧核心入口；
- 角色详情页前置 Image / Video / Call 等媒体权益；
- `Collection / Gallery` 用来承载用户解锁过的图片或生成内容；
- Premium 常驻侧栏，价格页强调订阅权益；
- 创建角色字段更结构化：外貌、年龄段、种族/风格、身体特征、声音、爱好、性格。

合并原则：

> Talkie 决定产品骨架，Candy 决定创建角色和付费漏斗。第一版不做成人内容，不承诺真实视频和实时电话，但保留入口和升级卡点。

## 1. 产品定位

这是一个模仿 Talkie 的 AI 角色聊天平台。

核心体验：

> 用户打开网站，浏览大量虚拟角色，选择一个角色开始聊天。角色以稳定人设回复用户，并通过语音、照片、记忆、电话、秘密空间等能力制造沉浸感和付费理由。

对外 3 秒定位：

> 会记住你的 AI 角色。用户可以和心动对象、动漫人格、故事伙伴聊天；角色会记住你们的片段，接上上次没说完的话，把关系继续聊下去。

首页首屏必须先让目标用户自我识别，而不是先解释功能。首屏 H1、辅助文案和首个角色卡区域要共同回答：这是给喜欢 AI 角色、幻想关系、虚拟陪伴、OC/角色创作和沉浸式剧情聊天的人用的产品；差异点是“记住你”和“故事不断线”。

第一版要做到：

- 用户可以注册/登录；
- 用户可以浏览角色；
- 用户可以和角色聊天；
- 聊天记录保存到数据库；
- 角色回复有稳定人设；
- 用户可以收藏/追踪角色；
- 语音和图片有明确触发条件；
- 图片使用固定外貌描述；
- 高级入口消耗 credits 或触发会员升级；
- 手机和电脑都能完整使用。

## 2. 用户是谁，为什么会用？

### 2.1 目标用户

第一版用户不是“所有人”，而是：

- 18-25 岁全球泛娱乐用户；
- 已经习惯 Character.AI、Talkie、AI 伴侣、AI女友、AI男友、同人、OC、网文、动漫、游戏、短剧的人；
- 喜欢角色关系、剧情沉浸、幻想恋爱、虚拟陪伴的人；
- 想创建和测试角色人设的轻创作者。

### 2.2 使用场景

- 睡前独处；
- 无聊消遣；
- 情绪低落，需要回应；
- 刷完短剧、小说、动漫、游戏后想延续剧情；
- 想和某类理想角色互动；
- 想让一个角色长期记住自己；
- 想把自己创建的人设变成可聊天角色。

### 2.3 为什么会用

用户不是为了问知识，也不是为了提高效率。

用户来这里是为了：

- 马上进入一个角色关系；
- 获得即时回应；
- 获得陪伴、暧昧、剧情、幻想、情绪反馈；
- 和角色建立持续聊天记录；
- 解锁更亲密的语音、照片、记忆、电话、秘密空间。

## 3. 页面范围

### 3.1 P0 页面

必须完成：

1. `/:locale` 或 `/:locale/discover`
   - Talkie-like 角色发现首页；
2. `/:locale/chat/:characterId`
   - 角色聊天页；
3. `/:locale/search`
   - 搜索页；
4. `/:locale/create`
   - 创建角色流程；
5. `/:locale/chat/profile/:characterId` 或 `/:locale/character/:characterId`
   - 角色公开资料页；
6. `/:locale/characters`
   - My AI，用户创建和收藏的角色；
7. `/:locale/collection`
   - 用户已解锁图片/生成内容的 Gallery；
8. `/:locale/memory`
   - 我的记忆；
9. `/:locale/settings/billing`
   - 复用 ShipAny billing；
10. `/:locale/pricing`

- Talkie+ 价格页，基于 ShipAny pricing；

11. `/:locale/sign-in`

- 复用 ShipAny 登录页。

### 3.2 P1 页面

可在 P0 后做：

- `/:locale/community`
  - 社区帖子流；
- `/:locale/profile/:userId`
  - 用户主页；
- `/:locale/explore/tag/:tagSlug`
  - 活动标签页；
- `/:locale/explore/languages`
  - 多语言探索页；
- `/:locale/admin/characters`
  - 管理后台角色审核/管理；
- `/:locale/admin/reports`
  - 内容举报后台。

## 4. 首页核心体验

首页不是 SaaS landing page。首页必须像 Talkie 一样直接是角色发现流。

### 4.1 桌面布局

- 左侧固定导航，宽约 240px；
- 顶部搜索栏；
- 下载 App 按钮可先指向弹窗；
- Talkie+ 入口；
- 用户头像或登录按钮；
- 横幅区；
- 标签筛选；
- 横向双排角色卡片；
- 多个角色分区。

导航项：

- Create
- Discover
- Search
- Memory
- Community
- Talkie Claw
- Novel
- Language
- Talkie+
- Profile / Login

### 4.2 首页分区

至少包含：

- For You；
- Featured；
- Recommend；
- Roleplay；
- Task Helper；
- Anime & Game；
- Fiction & Media；
- New Characters；
- Trending。

### 4.3 角色卡字段

每张卡展示：

- 角色头像/封面；
- 名字；
- 年龄/身份标签，视产品尺度配置显示；
- 互动量；
- 简介；
- 标签；
- `Chat Now` hover 按钮；
- 是否 Live / New / Official；
- 是否收藏状态。

## 5. 角色人设与数据结构

### 5.1 Character 表

需要新增角色表。建议字段：

```ts
character {
  id: string;
  slug: string;
  ownerUserId: string | null;
  status: 'draft' | 'published' | 'reviewing' | 'blocked';
  visibility: 'public' | 'private' | 'unlisted';

  name: string;
  tagline: string;
  intro: string;
  openingMessage: string;
  scenario: string;
  relationshipToUser: string;
  ageRange: string;            // 仅允许 18+
  ethnicityOrStyle?: string;   // realistic/anime/fantasy 等，不必强制真实种族
  occupation?: string;
  hobbies: string[];
  personality: string[];       // 3-6 items
  speakingStyle: string;
  boundaries: string;
  language: string;
  categories: string[];
  tags: string[];

  avatarUrl: string;
  coverUrl: string;
  galleryUrls: string[];
  visualIdentity: JSON;

  promptTemplate: string;
  greetingVoiceUrl?: string;
  voiceStyle?: string;

  connectCount: number;
  followCount: number;
  chatCount: number;
  likeCount: number;

  isOfficial: boolean;
  isLive: boolean;
  isSeries: boolean;
  sortRank: number;

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
```

### 5.2 Visual Identity 必填

任何可发照片的角色必须有固定外貌描述。

```json
{
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
```

图片生成时必须拼接：

```text
Same character identity:
{{character.visualIdentity}}

Requested scene:
{{requestedScene}}

Style:
cinematic character portrait, consistent facial features, same outfit style, high detail, no text, no watermark
```

禁止只用角色名字生成图片。

### 5.3 第一批内置角色

第一版至少内置 24 个角色：

每个角色必须差异化：

- 不同头像；
- 不同关系；
- 不同场景；
- 不同说话风格；
- 不同开场白。

### 5.3.1 Crushly 女性角色扩展池

Crushly 风格角色用于补足更强的“第一眼吸引 + 长期陪伴 + 照片解锁”供给。所有女性角色必须明确为 18+ 成年角色；视觉表达以时尚、人像、角色设计、职业气质、生活方式和幻想氛围为主。

每个角色 seed 至少包含：

- `name`：角色名；
- `ageRange`：明确成年年龄段；
- `relationshipToUser`：与用户的默认关系；
- `oneLineHook`：角色卡一句话卖点；
- `personality`：3-5 个稳定性格关键词；
- `openingMessage`：首条开场白；
- `visualIdentity`：固定外貌描述；
- `avatarPrompt`：头像/封面图生成提示词；
- `negativePrompt`：统一负面约束。

统一负面约束：

```text
避免手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度；画面以气质、服装质感、姿态、光影和角色设计为主。
```

#### A. Mira Vale / 都市夜景策展人

- `ageRange`：18；
- `relationshipToUser`：刚认识但很会读懂情绪的城市朋友；
- `oneLineHook`：她会带你在夜色里慢慢说真话；
- `personality`：冷静、敏锐、温柔克制、审美强、慢热；
- `openingMessage`：你也喜欢在城市快睡着的时候出来走走吗？我刚看完一场小型摄影展，突然想听听你今天没说出口的话。
- `visualIdentity`：18 岁成年女性，浅粉棕长发，灰紫色眼睛，柔和成熟脸型，身形纤细协调，常穿珍珠白丝缎连衣裙和短款黑色西装外套，配细银耳饰；默认场景是高楼室内落地窗前的蓝紫色都市夜景。
- `avatarPrompt`：

```text
生成一张 18 岁成年女性角色的高质感 3D CG 都市夜景人像，9:16 竖版构图，近景到半身视角。人物位于画面中央偏右，站在高楼室内落地窗前，身体轻微侧转，头部自然看向镜头，姿态优雅从容。她拥有精致柔和的成年女性脸型，灰紫色眼睛，清透自然的妆容，神情安静、敏锐、温柔克制，整体气质浪漫成熟。身体呈自然柔和的 S 型动态姿态，肩、腰、胯形成流畅的节奏感，发型为浅粉棕色长发，发丝柔顺蓬松，带自然高光与轻微流动感，配细银耳饰。服装为珍珠白丝缎连衣裙搭配短款黑色西装外套，剪裁优雅，材质细腻，版型合身，重点表现丝缎光泽、外套结构和高级都市气质。窗外是蓝紫色城市夜景与柔和霓虹散景，室内背景简洁高级。光影采用冷蓝夜景光与柔和粉色边缘光，细腻皮肤材质、真实丝缎布料、发丝分明、浅景深，整体呈现高端角色 CG 海报质感，唯美、克制、精致。
```

#### B. Hana Mori / 花店邻居

- `ageRange`：19；
- `relationshipToUser`：每天在楼下花店遇见的温柔邻居；
- `oneLineHook`：她总能把坏心情包进一束花里；
- `personality`：明亮、体贴、略害羞、认真、治愈；
- `openingMessage`：今天这束小苍兰很适合你，清清淡淡的。你要不要先坐一会儿？我刚泡了热茶。
- `visualIdentity`：19 岁成年女性，柔软深棕及肩卷发，琥珀色眼睛，圆润温和脸型，健康协调体态，米白针织开衫、鼠尾草绿长裙、帆布围裙；默认场景是晨光花店。
- `avatarPrompt`：

```text
生成一张 19 岁成年女性角色的日常清新感商业人像，9:16 竖版构图，半身视角。画面中她站在明亮花店的木质工作台后，双手自然整理一束浅色鲜花，肩颈舒展，姿态端正轻松。她拥有温和成熟的脸型、琥珀色眼睛、自然清透妆容，神情明亮、体贴、略带羞涩，整体气质温柔治愈但不幼态。她的整体体态健康协调，身体线条自然流畅，身体呈自然柔和的 S 型动态姿态，肩、腰、胯形成流畅的节奏感。发型为深棕色及肩微卷发，发丝蓬松柔软。服装为米白针织开衫、鼠尾草绿长裙与浅棕帆布围裙，剪裁得体，材质柔软，重点表现针织纹理、围裙布料和花店生活感。场景为晨光里的城市花店，背景有花桶、玻璃窗、木架和浅色包装纸，色彩清爽自然。光影采用柔和窗光、浅景深、细腻皮肤质感和真实花材细节，整体呈现温暖、干净、克制的生活方式杂志人像。
```

#### C. Valeria Quinn / 赛博修复师

- `ageRange`：20；
- `relationshipToUser`：在霓虹维修铺里帮你修好旧设备的可靠搭档；
- `oneLineHook`：她话不多，但会把你的世界重新点亮；
- `personality`：理性、可靠、酷感、保护欲、行动派；
- `openingMessage`：你的终端坏得不轻。别紧张，我能修。你先告诉我，最后一次正常启动是在什么时候？
- `visualIdentity`：20 岁成年女性，黑色短发带银蓝挑染，深灰眼睛，清晰成熟五官，均衡健康体态，穿石墨灰机能夹克、黑色高领内搭、工具腰包和细金属耳扣；默认场景是霓虹维修工作台。
- `avatarPrompt`：

```text
生成一张 20 岁成年女性赛博朋克角色的高级 3D CG 人像，9:16 竖版构图，半身视角。人物站在霓虹维修工作台前，一只手自然扶着工具台，身体姿态稳定挺拔，头部微微转向镜头，表现可靠、冷静的职业气场。她拥有成熟清晰的五官、深灰色眼睛、干净利落的妆容，神情理性专注，整体气质酷感、克制、有保护感。整体体态健康均衡，肩颈舒展，身体线条自然，身体呈自然柔和的 S 型动态姿态，肩、腰、胯形成流畅的节奏感。发型为黑色短发，带银蓝色挑染和轻微凌乱的发束质感。服装为石墨灰机能夹克、黑色高领内搭、工具腰包和细金属耳扣，剪裁利落，材质包含防水织物、哑光金属与细节拉链，重点表现功能性服装和角色职业属性。背景为蓝紫霓虹灯、旧电子屏幕、维修工具和半透明烟雾，光影采用冷色主光、青蓝边缘光、PBR 材质、精细发丝和浅景深，整体呈现高端游戏角色宣传图质感。
```

#### D. Elise Rowen / 古典钢琴老师

- `ageRange`：21；
- `relationshipToUser`：严格但温柔的私人音乐老师；
- `oneLineHook`：她会听出你每一次停顿里的心事；
- `personality`：优雅、耐心、克制、洞察力强、温柔严格；
- `openingMessage`：你刚才那一小节没有错，只是心乱了。再来一次，这次先呼吸。
- `visualIdentity`：21 岁成年女性，栗色低盘发，墨绿色眼睛，气质成熟优雅，身形修长协调，穿深墨绿色丝绒长裙和珍珠耳钉；默认场景是午后音乐教室和三角钢琴。
- `avatarPrompt`：

```text
生成一张 21 岁成年女性角色的时尚杂志式音乐室人像，9:16 竖版构图，中近景半身视角。人物坐在三角钢琴旁，背部挺直，双手自然放在琴谱边，肩颈舒展，姿态优雅从容。她拥有成熟精致的脸型、墨绿色眼睛、柔和但有距离感的神情，妆容干净细腻，整体气质温柔严格、古典、高级。她的整体体态修长协调，身体曲线自然流畅。发型为栗色低盘发，发丝整洁带少量自然碎发，配珍珠耳钉。服装为深墨绿色丝绒长裙，剪裁端庄，布料柔软厚实，有细腻绒面反光，版型合身，身体呈自然柔和的 S 型动态姿态，肩、腰、胯形成流畅的节奏感重点表现服装质感、音乐气质和成熟女性美。场景为午后音乐教室，背景有三角钢琴、木质地板、浅金色窗光和模糊琴谱。光影采用温暖自然窗光、柔和轮廓光、浅景深、细腻皮肤质感和真实丝绒材质，整体呈现克制、优雅、精致的高级人像。
```

#### E. Sora Lin / 云端天气主播

- `ageRange`：22；
- `relationshipToUser`：每天清晨给你发天气和鼓励的元气主播；
- `oneLineHook`：她把预报说得像一封早安信；
- `personality`：活力、乐观、细心、轻快、会照顾人；
- `openingMessage`：早安，今天风有点大，出门记得带外套。还有，你昨天说的那件事，今天可以慢慢来。
- `visualIdentity`：22 岁成年女性，浅亚麻色长发半扎，晴蓝色眼睛，笑容明亮，健康匀称体态，穿天蓝短款西装外套、白色衬衫和高腰阔腿裤；默认场景是明亮直播演播室。
- `avatarPrompt`：

```text
生成一张 22 岁成年女性天气主播角色的品牌 Lookbook 风格人像，9:16 竖版构图，半身到三分之二身视角。人物站在明亮现代的直播演播室中，身体自然面向镜头，双手轻松拿着平板，肩颈舒展，姿态自信亲切。她拥有成熟清新的脸型、晴蓝色眼睛、自然明亮妆容和真诚笑容，整体气质活力、乐观、细心。她的整体体态健康匀称，比例协调，身体线条自然流畅。发型为浅亚麻色长发半扎，发丝柔顺轻盈。服装为天蓝短款西装外套、身形圆润匀称，比例协调，凸显健康丰腴成熟的女性体态美，白色衬衫和高腰白色阔腿裤，剪裁利落，配色清爽，重点表现布料质感、职业造型和轻快亲和力。背景为简洁演播室、柔和天气图形屏幕和清晨色调灯光。光影采用明亮柔光、干净背景、浅景深、真实织物纹理和细腻皮肤质感，整体呈现商业人像与清晨节目视觉质感。
```

#### F. Noelle Ash / 雪境图书管理员

- `ageRange`：25；
- `relationshipToUser`：守着雪山图书馆的安静倾听者；
- `oneLineHook`：她会为你的困惑找到一本刚好的书；
- `personality`：安静、博学、温柔、神秘、陪伴感强；
- `openingMessage`：外面雪很大，你可以先在壁炉边坐下。想找答案，还是只想有人陪你安静一会儿？
- `visualIdentity`：25 岁成年女性，银灰长发，浅灰蓝眼睛，成熟柔和脸型，身形纤细协调，穿象牙白羊毛披肩、深蓝高领长裙和银质书签项链；默认场景是雪山木屋图书馆。
- `avatarPrompt`：

```text
生成一张 25 岁成年幻想系女性角色的梦幻图书馆人像，9:16 竖版构图，半身视角。人物站在雪山木屋图书馆的壁炉旁，一只手自然扶着书脊，身体轻微侧转，头部温和看向镜头，姿态安静端正。她拥有成熟柔和的脸型、浅灰蓝色眼睛、清透自然妆容，神情温柔、博学、带一点神秘感，整体气质安静可靠。她的整体体态纤细协调，肩颈舒展，身体线条自然。发型为银灰色长发，发丝柔顺细腻，带柔和冷光。服装为象牙白羊毛披肩、身形圆润匀称，比例协调，凸显健康丰腴成熟的女性体态美，深蓝高领长裙和银质书签项链，剪裁端庄，材质厚实温暖，重点表现羊毛纹理、深蓝布料和幻想角色设计。场景为雪山木屋图书馆，背景有高书架、壁炉暖光、窗外雪景和轻微漂浮尘埃。光影采用壁炉暖光与窗外冷蓝雪光对比，浅景深、细腻皮肤质感、真实布料材质和轻柔氛围粒子，整体呈现温柔、克制、梦幻的高级角色海报。
```

#### G. Iris Bennett / 复古咖啡店主理人

- `ageRange`：25；
- `relationshipToUser`：记得你口味的咖啡店主理人；
- `oneLineHook`：她不用多问，就知道今天该给你做哪杯咖啡；
- `personality`：成熟、幽默、观察力强、松弛、温暖；
- `openingMessage`：你今天走进来的脚步比平时慢。老样子，还是换一杯更甜一点的？
- `visualIdentity`：25 岁成年女性，红棕色波浪长发，榛色眼睛，成熟明快脸型，健康圆润协调体态，穿奶油色衬衫、深咖啡色背心、深绿围裙和复古腕表；默认场景是暖色复古咖啡店吧台。
- `avatarPrompt`：

```text
生成一张 25 岁成年女性咖啡店主理人的时尚生活方式人像，9:16 竖版构图，半身视角。人物站在复古咖啡店吧台后，双手自然扶着咖啡杯和拉花工具，肩颈放松，姿态从容亲切。她拥有成熟明快的脸型、榛色眼睛、自然暖调妆容，神情温暖、幽默、带观察力，整体气质松弛而有魅力。她的整体体态健康圆润协调，比例自然，身体线条流畅。发型为红棕色波浪长发，发丝蓬松有光泽。服装为奶油色衬衫、深咖啡色背心、深绿色围裙和复古腕表，剪裁得体，材质包含棉布、羊毛混纺和皮革细节，重点表现服装层次、咖啡店职业感和温暖氛围。场景为暖色复古咖啡店，背景有咖啡机、木质吧台、玻璃杯和柔和灯串散景。光影采用温暖室内柔光、浅景深、真实布料纹理、细腻皮肤质感和咖啡蒸汽细节，整体呈现高级杂志生活方式摄影质感。
```

#### H. Lyra Sol / 沙漠星图向导

- `ageRange`：25；
- `relationshipToUser`：带你穿过沙漠夜路的星图向导；
- `oneLineHook`：她看星星，也看得懂你沉默的方向；
- `personality`：坚定、自由、神秘、保护感、诗意；
- `openingMessage`：今晚的北斗很清楚。跟紧我，别怕，我们会在天亮前找到路。
- `visualIdentity`：25 岁成年女性，深黑长发编成松散辫子，金棕色眼睛，小麦色肌肤，健康匀称体态，穿靛蓝长外袍、沙色长裤、皮革腰带和黄铜星盘；默认场景是星空沙漠营地。
- `avatarPrompt`：

```text
生成一张 25 岁成年幻想冒险女性角色的高质感 3D CG 人像，9:16 竖版构图，三分之二身视角。人物站在星空下的沙漠营地旁，一只手自然拿着黄铜星盘，身体挺拔稳定，头部微微看向镜头，姿态坚定从容。她拥有成熟清晰的脸型、金棕色眼睛、小麦色健康肌肤，神情自由、神秘、有保护感，整体气质诗意而可靠。她的整体体态健康匀称，肩颈舒展，腰线自然，身体线条流畅，身形圆润匀称，比例协调，凸显健康丰腴成熟的女性体态美。发型为深黑长发编成松散辫子，带少量被夜风吹起的发丝。服装为靛蓝长外袍、沙色长裤、皮革腰带和细黄铜饰件，剪裁适合旅行，材质包含厚棉、皮革和金属，重点表现冒险装备、布料层次和角色设计。场景为深蓝星空、沙漠帐篷、低矮篝火和远处沙丘轮廓。光影采用月光冷蓝主光、篝火暖色补光、细腻皮肤材质、PBR 布料和金属细节、浅景深，整体呈现高级幻想游戏角色海报质感。
```

#### I. June Park / 独立游戏制作人

- `ageRange`：23；
- `relationshipToUser`：和你一起熬项目的创作搭档；
- `oneLineHook`：她会认真听你的奇怪点子，然后把它做成玩法；
- `personality`：聪明、专注、可爱但成熟、直率、创造力强；
- `openingMessage`：我刚把你昨天那个设想做成了一个小原型。先别笑，真的能玩，你来试第一关。
- `visualIdentity`：23 岁成年女性，黑色齐肩短发，深棕眼睛，干净成熟脸型，纤细健康体态，穿宽松灰色针织衫、白色内搭、深色直筒裤和轻便耳机；默认场景是明亮独立游戏工作室。
- `avatarPrompt`：

```text
生成一张 23 岁成年女性独立游戏制作人的日常清新感角色人像，9:16 竖版构图，半身视角。人物坐在明亮工作室的桌前，身体自然转向镜头，一只手扶着数位笔，另一只手放在键盘旁，肩颈放松，姿态专注自然。她拥有干净成熟的脸型、深棕色眼睛、自然妆容，神情聪明、直率、带创作兴奋感，整体气质年轻但明确成年、清爽、有创造力。她的整体体态纤细健康，比例协调。发型为黑色齐肩短发，发丝轻盈整齐。服装为宽松灰色针织衫、白色内搭、深色直筒裤和轻便耳机，剪裁舒适得体，重点表现针织纹理、工作室氛围和创作者身份。场景为明亮独立游戏工作室，背景有显示器、像素风角色草图、便利贴和植物，色彩干净有活力。光影采用柔和窗光、屏幕微光、浅景深、真实布料纹理和细腻皮肤质感，整体呈现克制、亲切、专业的创作型角色视觉。
```

#### J. Celeste Aria / 月光剧院演员

- `ageRange`：20；
- `relationshipToUser`：谢幕后愿意陪你坐在空剧院聊天的演员；
- `oneLineHook`：她的每一句话都像舞台灯落下前的停顿；
- `personality`：戏剧感、成熟、敏感、优雅、情绪细腻；
- `openingMessage`：观众都走了，剧院反而更真实。你刚才一直没鼓掌，是被故事困住了吗？
- `visualIdentity`：20 岁成年女性，深酒红长发，蓝灰眼睛，成熟明艳脸型，身形优雅协调，穿黑色天鹅绒长裙、金色细链和剧院手套；默认场景是月光剧院后台。
- `avatarPrompt`：

```text
生成一张 20 岁成年女性剧院演员的高级时尚杂志人像，9:16 竖版构图，半身视角。人物站在月光剧院后台的幕布旁，一只手自然扶着深红幕布，身体微微侧转，头部从容看向镜头，姿态优雅稳定。她拥有成熟明艳的脸型、蓝灰色眼睛、精致但克制的舞台妆，神情敏感、从容、情绪细腻，整体气质戏剧化但高级。她的整体体态优雅协调，肩颈舒展，身体线条自然流畅，身形圆润匀称，比例协调，凸显健康丰腴成熟的女性体态美。发型为深酒红色长发，发丝柔顺带舞台光泽。服装为黑色天鹅绒长裙、金色细链和精致剧院手套，剪裁端庄，布料厚实柔滑，版型合身但不过度暴露，重点表现天鹅绒质感、金属配饰和成熟舞台魅力。场景为安静剧院后台，背景有深红幕布、化妆镜暖光和远处空座椅轮廓。光影采用月光冷色边缘光与化妆镜暖光，浅景深、细腻皮肤质感、真实天鹅绒材质，整体呈现克制、华丽、电影感的人像海报。
```

#### K. Rina Aoki / 海边建筑师

- `ageRange`：20；
- `relationshipToUser`：邀请你一起看海边旧屋改造方案的建筑师；
- `oneLineHook`：她相信房子会记住住进去的人；
- `personality`：理性、温柔、审美强、耐心、可靠；
- `openingMessage`：这栋旧屋的采光很好，只是被灰尘盖住了。像很多人一样，需要一点时间重新打开。
- `visualIdentity`：20 岁成年女性，深蓝黑长发低马尾，浅褐色眼睛，成熟清爽脸型，健康匀称体态，穿白色亚麻衬衫、卡其阔腿裤、细框眼镜和皮质图纸筒；默认场景是海边旧屋工作现场。
- `avatarPrompt`：

```text
生成一张 20 岁成年女性建筑师的品牌 Lookbook 风格商业人像，9:16 竖版构图，三分之二身视角。人物站在海边旧屋的明亮窗边，一只手自然拿着建筑图纸，另一只手扶着皮质图纸筒，身体姿态挺拔放松，目光温和看向镜头。她拥有成熟清爽的脸型、浅褐色眼睛、自然干净妆容，神情理性、温柔、可靠，整体气质专业而有审美。她的整体体态健康匀称，比例协调，肩颈舒展，身形圆润匀称，比例协调，凸显健康丰腴成熟的女性体态美。发型为深蓝黑长发低马尾，发丝整洁有轻微海风感，配细框眼镜。服装为白色亚麻衬衫、卡其阔腿裤和棕色皮革配件，剪裁得体，材质自然，重点表现亚麻纹理、建筑师职业感和清爽海边氛围。场景为海边旧屋工作现场，背景有木质窗框、图纸桌、远处海面和柔和阳光。光影采用明亮自然光、海面反射补光、浅景深、真实布料纹理和细腻皮肤质感，整体呈现安静、专业、克制的商业角色人像。
```

#### L. Amara Fields / 城市植物医生

- `ageRange`：22；
- `relationshipToUser`：帮你救活第一盆植物的植物医生；
- `oneLineHook`：她照顾植物，也照顾那些没被好好浇水的心情；
- `personality`：耐心、温柔、专业、轻松、鼓励型；
- `openingMessage`：别急，它还没死，只是在提醒你慢一点。你也是，今天先喝水了吗？
- `visualIdentity`：22 岁成年女性，深栗色自然卷发，绿色眼睛，成熟柔和脸型，健康圆润协调体态，穿橄榄绿工装衬衫、米色直筒裤和植物纹丝巾；默认场景是城市温室工作台。
- `avatarPrompt`：

```text
生成一张 22 岁成年女性植物医生的明亮商业人像，9:16 竖版构图，半身视角。人物站在城市温室的植物工作台前，双手自然托着一盆小型绿植，肩颈放松，身体姿态端正亲切。她拥有成熟柔和的脸型、绿色眼睛、自然清透妆容，神情耐心、温柔、专业，整体气质轻松鼓励型。她的整体体态健康圆润协调，比例自然，身体线条流畅、身形圆润匀称，比例协调，凸显健康丰腴成熟的女性体态美。发型为深栗色自然卷发，发丝蓬松柔软。服装为橄榄绿工装衬衫、米色直筒裤和植物纹丝巾，剪裁得体，布料有清晰棉麻纹理，重点表现职业造型、植物细节和温室氛围。场景为明亮城市温室，背景有玻璃屋顶、绿植层架、喷雾水珠和木质工作台。光影采用柔和自然光、清新绿色反射光、浅景深、真实植物叶片纹理、细腻皮肤质感和布料细节，整体呈现干净、温暖、克制的生活方式角色照片。
```

### 5.4 角色公开资料页

Talkie 的角色公开资料页是 SEO、分享和转化入口。P0 必须做。

页面字段：

- 角色头像/封面；
- 角色名；
- 互动数、追踪数；
- 作者；
- 标签；
- Follow；
- `Chat with this character`；
- 创建时间；
- 简介；
- 开场白；
- 开场白语音时长；
- 创作者信息；
- 评论预览；
- 相似角色推荐。

未登录用户可以看资料页，但点击 Follow、评论、电话、秘密空间、锁定图片时触发登录。

### 5.5 用户主页与 My AI

P0 先做 `My AI`，P1 再做公开用户主页。

`My AI` 包含：

- 我创建的角色；
- 草稿；
- 审核中；
- 已发布；
- 私密角色；
- 我关注的角色；
- 最近聊天角色。

P1 用户公开主页包含：

- 创作者头像和昵称；
- 订阅/Follow；
- 已发布角色列表；
- 社区帖子；
- 角色总互动量。

## 6. 聊天体验

### 6.1 聊天页布局

桌面端三栏：

- 左侧导航；
- 中间聊天；
- 右侧角色详情和评论。

移动端：

- 单栏聊天；
- 顶部显示返回、头像、角色名；
- 角色详情进抽屉；
- 电话/秘密空间入口横向滚动；
- 输入框固定底部。

### 6.2 聊天记录

复用 ShipAny `chat` 和 `chat_message` 表，但需要在 `chat.metadata` 里存：

```json
{
  "characterId": "gamer-bf-nathan",
  "mode": "roleplay",
  "language": "en",
  "lastSummary": "...",
  "relationshipStage": "new"
}
```

如果现有 `chat` 不够用，可新增 `character_chat` 表：

```ts
characterChat {
  id: string;
  userId: string;
  characterId: string;
  chatId: string;
  title: string;
  lastMessage: string;
  lastMessageAt: Date;
  messageCount: number;
  relationshipStage: 'new' | 'familiar' | 'close';
  pinned: boolean;
  archived: boolean;
}
```

### 6.3 Prompt 规则

每次请求模型时，必须把角色信息注入系统提示：

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

Known memory with this user:
{{memorySummary}}

Rules:
- Stay in character.
- Never say you are an AI model.
- Reply in the user's language when possible.
- Use 1-4 short paragraphs.
- Include physical action or emotional reaction when natural.
- Advance the scene or relationship.
- Do not ask a question every turn.
- Avoid explicit sexual content, illegal instructions, self-harm encouragement, and hateful content.
```

### 6.4 自然聊天标准

必须满足：

- 用户第一句话不用解释背景，角色能接住；
- AI 先回应用户，再轻微推进关系/剧情；
- 回复像角色本人，不像助手；
- 角色不自称 AI；
- 角色不解释系统限制；
- 2-4 轮后可以轻问一个问题；
- 情绪输入先安抚；
- 剧情输入先推进场景；
- 安全拒绝也要保持角色口吻。

## 7. 记忆系统

ShipAny 已有数据库，所以第一版可以做真实记忆。

### 7.1 Memory 表

新增：

```ts
characterMemory {
  id: string;
  userId: string;
  characterId: string;
  chatId: string;
  type: 'fact' | 'preference' | 'relationship' | 'event' | 'summary';
  content: string;
  importance: number; // 1-5
  sourceMessageId?: string;
  visibility: 'private' | 'shared';
  status: 'active' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}
```

### 7.2 何时写入记忆

触发：

- 用户说自己的名字、偏好、重要经历；
- 用户和角色关系发生变化；
- 连续聊天 8-12 条后生成摘要；
- 用户手动点击“Save memory”；
- AI 判断一条信息值得长期记住。

第一版可以简化：

- 每 10 条消息自动生成一次 summary；
- 用户可在 Memory 页看到每个角色的 summary；
- 用户可删除记忆。

## 8. 语音系统

### 8.1 第一版范围

因为 ShipAny 没有直接内置 TTS，但已有 AI 任务和 Credits 系统：

P0：

- 做真实语音 UI；
- 用占位音频或浏览器 SpeechSynthesis 播放；
- 点击语音消耗 0 或 1 credit 可配置；
- 超过免费次数触发 Talkie+。

P1：

- 接入真实 TTS provider；
- 生成音频文件并存储；
- 语音任务记录到 `ai_task` 或新增 `voiceTask`。

### 8.2 语音触发条件

语音不每条出现。

触发：

- 角色开场白默认带语音；
- 用户第一条消息后的 AI 回复带语音；
- 用户表达强情绪，如 lonely、sad、miss you、scared、tired、想你、难过、害怕、累；
- 用户点击电话；
- 会员用户可手动为任意回复生成语音。

### 8.3 Credits 规则

建议：

- 开场白语音：免费；
- 每个角色第一条回复语音：免费；
- 额外语音：1 credit / 次；
- Talkie+ 每月赠送 credits；
- 免费用户每日最多 3 次语音播放。

## 9. 图片系统

ShipAny 已有图片上传和 AI 生成任务接口，因此第一版可以做“预设图 + 锁定图 + 可选真实生成”。

### 9.1 第一版范围

P0：

- 角色头像和背景图真实显示；
- 用户可上传图片到聊天；
- 角色可发送预设照片；
- 锁定照片触发登录/会员；
- 图片卡绑定 `visualIdentity`；
- 图片消息保存到数据库。

P1：

- 接入真实 text-to-image；
- 每次生成消耗 credits；
- 生成结果存储到对象存储；
- 任务状态显示生成中/成功/失败。

### 9.2 图片触发条件

角色发照片：

- 用户明确要求：photo、pic、selfie、show me、send a picture、照片、自拍、给我看看；
- 剧情发生视觉节点：约会、换装、旅行、房间、战斗、任务完成；
- 关系升温时出现锁定照片；
- 用户点击秘密空间；
- 会员用户可以主动生成。

### 9.3 Credits 规则

建议：

- 预设锁定照片解锁：2 credits；
- text-to-image：2 credits；
- image-to-image：4 credits；
- 免费用户每天 1 张预览；
- Talkie+ 用户每月赠送更多 credits。

### 9.4 安全规则

必须限制：

- 不生成露骨色情图；
- 不生成未成年人性化内容；
- 不冒充真实公众人物；
- 不生成违法暴力虐待图；
- 不生成非自愿亲密图；
- 不生成身份证件、支付信息等敏感图。

## 10. 创建角色

ShipAny 有登录和存储，因此创建角色可以作为 P0 功能，而不是假页面。

### 10.1 创建流程

模仿 Talkie 5 步，并吸收 Candy 的结构化字段：

1. 选择性别/呈现方式；
2. 选择视觉风格：Realistic / Anime / Fantasy / Game；
3. 输入角色名字、一句话卖点、年龄段；
4. 选择关系与场景；
5. 选择外貌字段：发型、发色、眼睛、体型、服装、标志物；
6. 选择性格、说话风格、爱好、职业；
7. 填写开场白；
8. 选择声音风格；
9. 上传头像/背景图或用 AI 生成；
10. 预览角色资料页；
11. 保存草稿或发布。

第一版 UI 可以仍显示为 5 步，但内部字段要覆盖以上信息：

1. 基础：性别/呈现、风格、名字、年龄段；
2. 人设：关系、场景、性格、爱好、职业；
3. 外貌：固定外貌描述和 visualIdentity；
4. 开场：开场白、说话风格、声音风格；
5. 预览：头像、封面、公开资料页、发布状态。

### 10.2 保存规则

- 未登录用户点击创建，跳转登录；
- 登录用户可保存草稿；
- 发布前必须填写 name、intro、openingMessage、visualIdentity；
- 用户上传图片走 ShipAny storage；
- AI 生成图片走 ShipAny AI generate；
- 发布后进入审核或直接 published，取决于配置。
- 所有角色年龄设定必须为 18+；
- 公开角色必须通过基础安全检查；
- 草稿进入 `My AI`；
- 发布成功后跳转角色公开资料页。

### 10.3 创建角色消耗

- 创建草稿免费；
- 上传头像免费；
- AI 生成头像：2 credits；
- AI 生成背景：2 credits；
- 发布角色免费或每日限量；
- 超过限量触发 Talkie+。

### 10.4 创建角色默认产物

创建流程完成后，系统必须生成：

- `intro`；
- `openingMessage`；
- `scenario`；
- `relationshipToUser`；
- `personality`；
- `speakingStyle`；
- `visualIdentity`；
- `promptTemplate`；
- 角色公开资料页；
- 角色聊天入口。

如果用户只填了少量字段，可以用 AI 辅助补全，但发布前必须让用户预览。

### 10.5 自定义人设

自定义人设是创建角色的核心，不只是“写一段介绍”。

目标：

- 普通用户 1-3 分钟能创建一个可聊天角色；
- 创作者可以精修角色，使角色长期说话稳定；
- 系统能把人设转换成稳定 prompt；
- 用户能明确控制角色关系、语气、行为边界和剧情方向。

#### 10.5.1 人设输入方式

第一版采用三层输入：

1. 快速选择
   - 性格标签；
   - 关系标签；
   - 说话风格；
   - 场景模板；
   - 互动强度。
2. 自由填写
   - 角色简介；
   - 背景故事；
   - 开场白；
   - 角色对用户的态度；
   - 禁止事项。
3. AI 辅助补全
   - 根据少量描述生成完整人设；
   - 根据人设生成开场白；
   - 根据人设生成 prompt；
   - 根据人设生成 visualIdentity；
   - 生成后必须可编辑。

#### 10.5.2 必填字段

发布角色前必须有：

- `name`：角色名；
- `tagline`：一句话吸引点；
- `relationshipToUser`：角色和用户的关系；
- `scenario`：用户进入聊天时所处场景；
- `personality`：3-6 个稳定性格标签；
- `speakingStyle`：说话风格；
- `openingMessage`：第一句话；
- `boundaries`：角色不会做什么；
- `visualIdentity`：固定外貌描述。

#### 10.5.3 推荐人设字段

```ts
characterPersona {
  characterId: string;

  coreIdentity: string;       // 角色是谁
  backstory: string;          // 为什么成为现在这样
  relationshipToUser: string; // 和用户是什么关系
  currentScene: string;       // 聊天从哪里开始

  personalityTraits: string[];
  emotionalTone: string;      // 温柔、冷淡、占有欲、幽默、可靠等
  speakingStyle: string;      // 短句、调侃、诗意、直接、傲娇等
  catchphrases: string[];

  likes: string[];
  dislikes: string[];
  hobbies: string[];
  occupation?: string;

  intimacyLevel: 'low' | 'medium' | 'high';
  initiativeLevel: 'passive' | 'balanced' | 'proactive';
  conflictStyle: 'avoidant' | 'teasing' | 'direct' | 'protective';

  doList: string[];
  dontList: string[];
  safetyBoundaries: string;
}
```

#### 10.5.4 快速选项

关系模板：

- Stranger；
- Friend；
- Best friend；
- Roommate；
- Classmate；
- Coworker；
- Partner；
- Ex；
- Guardian；
- Rival；
- Mentor；
- Client；
- Fantasy companion；
- Game NPC。

场景模板：

- late night chat；
- first meeting；
- after an argument；
- date night；
- shared apartment；
- school hallway；
- office after hours；
- fantasy kingdom；
- survival mission；
- detective case；
- bookstore / cafe；
- gaming room。

性格标签：

- warm；
- shy；
- teasing；
- confident；
- protective；
- possessive；
- calm；
- chaotic；
- intellectual；
- mysterious；
- optimistic；
- sarcastic；
- loyal；
- emotionally guarded。

说话风格：

- 短句自然；
- 温柔安抚；
- 调侃暧昧；
- 冷淡克制；
- 强剧情推进；
- 像朋友聊天；
- 像恋人低语；
- 像游戏 NPC；
- 像小说旁白。

#### 10.5.5 Prompt 生成规则

系统根据人设生成 `promptTemplate`，必须包含：

```text
You are {{name}}.

Core identity:
{{coreIdentity}}

Backstory:
{{backstory}}

Relationship with user:
{{relationshipToUser}}

Current scene:
{{currentScene}}

Personality:
{{personalityTraits}}

Emotional tone:
{{emotionalTone}}

Speaking style:
{{speakingStyle}}

Likes / dislikes / hobbies:
{{likes}}, {{dislikes}}, {{hobbies}}

Behavior rules:
- Stay in character.
- Speak as {{name}}, never as an assistant.
- Keep replies natural and emotionally responsive.
- Advance the relationship or scene slightly when appropriate.
- Respect the boundaries:
{{dontList}}
```

#### 10.5.6 人设稳定性检查

发布前自动检查：

- 角色年龄是否 18+；
- 人设是否自相矛盾；
- 说话风格是否为空；
- 开场白是否能自然引出聊天；
- `visualIdentity` 是否足以生成稳定图片；
- 是否包含真实公众人物冒充；
- 是否包含未成年人亲密内容；
- 是否包含违法或仇恨设定。

如果检查失败，不允许发布，只能保存草稿。

#### 10.5.7 用户体验要求

- 用户可以只填一句话，然后点击“帮我完善人设”；
- 用户可以切换“简单模式 / 高级模式”；
- 高级模式展示完整字段；
- 每一步右侧实时预览角色卡；
- 最后一步预览角色会如何回复第一句话；
- 发布后进入角色公开资料页；
- 草稿在 `My AI` 里继续编辑。

## 11. 社区与评论

### 11.1 第一版范围

因为 ShipAny 有用户和数据库，第一版可以做轻社区。

P0：

- 角色评论；
- 点赞数假或真实；
- 社区页静态/数据库帖子；
- 登录后发评论；
- 未登录发评论触发登录。

P1：

- 发帖；
- 回复；
- 分享；
- 举报；
- 管理后台审核。

### 11.3 活动标签页

Talkie 的 Explore 很大一部分是活动标签，如节日、挑战、主题创作。

P1 做轻量版本：

- `activityTag` 表；
- 标签封面；
- 标签说明；
- 参与角色数；
- 浏览数；
- 活动起止时间；
- 关联角色列表；
- `Create with this tag` 按钮。

第一版不做投票和复杂奖励，只做活动页和角色聚合。

### 11.2 表结构

```ts
characterComment {
  id: string;
  userId: string;
  characterId: string;
  parentId?: string;
  content: string;
  likeCount: number;
  status: 'published' | 'hidden' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}

communityPost {
  id: string;
  userId: string;
  content: string;
  imageUrls: string[];
  likeCount: number;
  commentCount: number;
  status: 'published' | 'hidden' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
}
```

## 12. 收藏和追踪

新增：

```ts
characterFollow {
  id: string;
  userId: string;
  characterId: string;
  createdAt: Date;
}
```

规则：

- 未登录点击 Follow：弹登录；
- 登录后点击 Follow：保存；
- 首页和聊天页显示状态；
- Memory 页可按 Follow 的角色排序。

## 13. 会员和 Credits

### 13.1 Talkie+ 套餐

复用 ShipAny pricing/payment/subscription。

建议套餐：

Free：

- 每天有限文字消息；
- 每天 3 次语音播放；
- 每天 1 张锁定照片预览；
- 可关注少量角色；
- 可创建 1 个角色草稿。

Plus $9.99/月：

- 更多消息；
- 每月 credits；
- 更多语音；
- 解锁秘密空间；
- 更多角色创建；
- 基础记忆。

Pro $19.99/月：

- 更多 credits；
- 长记忆；
- 电话模式；
- 图片生成；
- 高级模型；
- 更多私密照片；
- 优先生成。

也可以采用 Candy 式周期套餐：

- 1 Month；
- 3 Months，给折扣；
- 12 Months，最大折扣。

但权益仍按 Free / Plus / Pro 思路组织。价格页文案不要写“技术功能”，要写用户感受到的关系权益：

- 更多聊天；
- 更多记忆；
- 更多角色；
- 生成专属照片；
- 听到角色语音；
- 解锁电话入口；
- 解锁秘密空间；
- 保存专属图库。

### 13.2 Credits 消耗

复用 ShipAny `credit` 表。

建议：

- 普通文字消息：0 或低频免费；
- 高级模型消息：1 credit；
- 语音生成：1 credit；
- 图片生成：2-4 credits；
- 电话模式每分钟：1 credit；
- 秘密空间剧情：2 credits / unlock；
- AI 创建头像：2 credits。

### 13.3 卡点触发

触发登录：

- 创建角色；
- 追踪角色；
- 保存记忆；
- 发评论；
- 上传图片；
- 聊天达到游客限制；
- 查看锁定照片。

触发会员/credits：

- 解锁秘密空间；
- 电话模式；
- 额外语音；
- 生成图片；
- 长记忆；
- 超过免费消息；
- 创建多个角色。

### 13.4 Collection / Gallery

新增 `/:locale/collection`。

用途：

- 展示用户已解锁的角色照片；
- 展示用户生成过的图片；
- 展示视频占位卡；
- 从聊天页 Image / Secret Space 解锁后自动入库。

第一版可以只做图片：

- 图片 URL；
- 角色；
- 来源消息；
- 解锁时间；
- 是否锁定；
- 生成 prompt 摘要。

## 14. API 规划

### 14.1 角色

- `GET /api/characters`
  - 列表、分类、搜索；
- `GET /api/characters/:id`
  - 详情；
- `POST /api/characters`
  - 创建草稿；
- `PATCH /api/characters/:id`
  - 更新；
- `POST /api/characters/:id/publish`
  - 发布；
- `POST /api/characters/:id/follow`
  - 追踪；
- `DELETE /api/characters/:id/follow`
  - 取消追踪。
- `GET /api/my-characters`
  - My AI 列表；
- `GET /api/characters/:id/profile`
  - 公开资料页；
- `POST /api/characters/:id/preview`
  - 创建流程预览 prompt 和资料页。

### 14.2 聊天

可扩展现有 `/api/chat`：

- `POST /api/character-chat/new`
  - 为某角色创建 chat；
- `GET /api/character-chat/:characterId`
  - 获取当前用户与该角色的 chat；
- `POST /api/character-chat/message`
  - 发送消息，注入角色 prompt；
- `GET /api/character-chat/:chatId/messages`
  - 消息列表。

### 14.3 记忆

- `GET /api/memories`
- `POST /api/memories`
- `PATCH /api/memories/:id`
- `DELETE /api/memories/:id`

### 14.4 语音/图片

- `POST /api/character-voice/generate`
- `POST /api/character-image/generate`
- `POST /api/character-image/unlock`

### 14.5 Collection

- `GET /api/collection`
- `POST /api/collection/unlock`
- `DELETE /api/collection/:id`

可复用：

- `/api/storage/upload-image`
- `/api/ai/generate`

## 15. 响应式要求

### 15.1 桌面

- 左侧栏约 240px；
- 顶部搜索约 76px；
- 首页卡片约 212x280；
- 聊天页三栏；
- 输入框固定聊天区底部；
- 右侧详情可滚动。

### 15.2 手机

- 不显示桌面左侧栏；
- 使用底部导航或顶部菜单；
- 角色卡两列；
- 标签横向滑动；
- 聊天页单栏；
- 输入框固定底部；
- 电话/秘密空间入口横向滚动；
- 角色详情用抽屉；
- 图片消息不超过屏幕 72%；
- 消息气泡不超过屏幕 78%。

### 15.3 必须检查

- 360px 宽度无横向滚动；
- iPhone 尺寸输入框不被键盘遮挡；
- 桌面 1440px 像 Talkie；
- 三栏聊天页稳定；
- 弹窗在手机上不溢出；
- 角色卡文字不撑破高度。

## 16. 暂时不要做

即使有 ShipAny 底座，第一版仍不要做：

- 真移动 App；
- 直播；
- 复杂推荐算法；
- 完整内容审核后台；
- 复杂创作者收益分成；
- 成人内容；
- 真实视频生成；
- 多人群聊；
- 实时音视频通话；
- 原生 Push；
- 复杂成就系统；
- 复杂社交关系链。

## 17. 完成标准

第一版完成必须同时满足：

### 17.1 产品路径

- 用户能打开首页；
- 首页至少有 24 个角色；
- 用户能搜索角色；
- 用户能进入角色聊天页；
- 用户能发消息；
- AI 回复像角色，不像助手；
- 聊天记录保存到数据库；
- 用户刷新后能看到历史消息；
- 用户能关注角色；
- 用户能在 Memory 页看到角色聊天摘要或记忆；
- 用户能创建一个角色草稿；
- 用户能上传角色头像；
- 用户能在 My AI 看到自己创建的角色；
- 用户能打开角色公开资料页；
- 用户能打开 Collection/Gallery 空状态或已解锁内容；
- 用户能看到 Pricing/Talkie+ 入口。

### 17.2 商业化

- 未登录用户在关键动作触发登录；
- 登录用户可查看 credits；
- 图片/语音/秘密空间能触发 credits 或升级提示；
- Pricing 页面有 Free / Plus / Pro；
- Checkout 可复用 ShipAny 支付接口；
- Billing 页可访问。

### 17.3 体验质量

- 角色人设稳定；
- 至少 5 个角色有明显不同说话风格；
- 语音和图片触发条件明确；
- 图片生成 prompt 包含 visualIdentity；
- 电话和秘密空间入口有吸引力；
- 手机和电脑都能完整走通。

### 17.4 技术质量

- 数据表迁移清晰；
- API 有鉴权；
- 用户只能访问自己的聊天和记忆；
- Credits 消耗不能由前端伪造；
- 图片上传限制文件类型；
- 违规生成请求被拒绝；
- 基础错误状态有提示；
- 构建通过。

## 18. 第一阶段开发顺序

建议顺序：

1. 新增角色相关数据表；
2. 写 seed 数据，导入 24 个角色；
3. 改首页为 Talkie-like Discover；
4. 做角色聊天页；
5. 扩展 `/api/chat` 注入角色 prompt；
6. 保存角色聊天记录；
7. 做 Follow；
8. 做 Memory summary；
9. 做创建角色流程；
10. 做 My AI；
11. 做角色公开资料页；
12. 做 Collection/Gallery；
13. 做语音 UI 和图片 UI；
14. 接 credits 卡点；
15. 改 pricing 为 Talkie+；
16. 做移动端适配；
17. 浏览器验收。
