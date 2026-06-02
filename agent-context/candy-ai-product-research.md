# Candy.ai 产品学习笔记

> 访问时间：2026-05-17  
> 参考网址：https://candy.ai/?via=toolify50

## 1. 一句话判断

Candy.ai 更像“AI 伴侣订阅产品”，不是 Talkie 那种强 UGC 角色市场。

它的核心不是让用户探索无数角色，而是让用户快速进入一个高吸引力伴侣关系，并通过图片、语音、视频、电话、Live Action、Premium 订阅把关系变现。

## 2. 对我们有价值的核心功能

### 2.1 首页直接卖体验

Candy 首页不是传统 SaaS landing page，而是直接进入角色和付费体验：

- 顶部分类：Girls / Anime / Guys；
- 侧边栏：Home、Discover、Chat、Collection、Create Character、My AI、Premium；
- 明显的 Create Free Account / Login；
- Premium 折扣入口；
- Live Action 模块；
- AI Characters 列表；
- 标签筛选：All、Caucasian、Latina、Asian、18-21、Blonde、Brunette、Redhead 等；
- 首页中段直接出现“Create your own AI Girlfriend”。

对我们启发：

- 首页要直接展示角色，不要做产品介绍页；
- 创建角色入口要放在首页显眼位置；
- 角色分类可以从 Talkie 的内容标签，加上 Candy 的外貌/类型筛选；
- Premium 入口要常驻，不只放 pricing 页。

### 2.2 自定义角色是商业核心

Candy 的创建页入口为 `Create Character` / `Create my AI Girl`。

已观察到的第一步：

- 选择 Girls / Guys / Trans；
- 选择 Realistic / Anime；
- 下一步进入更细创建流程。

官网 FAQ 和页面文案明确提到创建字段：

- ethnicity；
- age range；
- eye color；
- hairstyle；
- hair color；
- body features；
- personality；
- voice；
- hobbies。

对我们启发：

- Talkie 的“选择性别 + 5 步创建”可以和 Candy 的“外貌细分 + 个性 + 声音 + 爱好”结合；
- 创建角色不是辅助功能，应进入 P0；
- 创建流程需要同时生成 `visualIdentity` 和 `promptTemplate`；
- 用户创建完角色后要进入 My AI 管理页。

### 2.3 角色详情页即聊天页

Candy 的角色页示例：

`https://candy.ai/ai-girlfriend/luna-moreno-2`

页面信息结构：

- 角色名；
- 开场消息；
- Image / Video 按钮；
- Call Me；
- AI Phone Call；
- AI Video；
- Upgrade to Unlock；
- 角色档案：
  - age；
  - body；
  - ethnicity；
  - language；
  - relationship；
  - occupation；
  - hobbies；
  - personality。

对我们启发：

- Talkie 风格三栏聊天页可以吸收 Candy 的媒体按钮；
- 角色资料字段要比 Talkie 公开页更结构化；
- 电话、图片、视频入口可以直接放在聊天页首屏；
- 未付费时不隐藏入口，而是显示入口并触发升级弹窗。

### 2.4 多模态权益清晰

Candy 明确把能力拆成：

- Chat；
- Image；
- Voice；
- Video；
- Phone Call；
- Live Action；
- Collection / Gallery。

对我们启发：

- P0 不一定真实做视频，但 UI 和付费入口可以预留；
- 图片、语音、电话要有统一的权益层；
- Collection/Gallery 可以作为用户已解锁图片的页面；
- Live Action 可暂时定义为 P2，不进入第一版真实实现。

### 2.5 订阅页非常直接

Candy 订阅页：

- 1 月 / 3 月 / 12 月；
- 年付折扣最强；
- 强调 “Trusted by 50 million people worldwide”；
- Premium Benefits：
  - Create your own AI Girlfriend(s)；
  - Generate videos；
  - Generate images；
  - Full Live Action Experience；
  - Unlimited text messages；
  - monthly tokens；
  - cancel anytime。

对我们启发：

- ShipAny pricing 可直接改为 Free / Plus / Pro 或 Monthly / Quarterly / Yearly；
- 权益文案要围绕关系体验，不要写技术能力；
- 订阅权益必须包括：更多消息、创建更多角色、图片、语音、电话、长记忆、更多 credits。

## 3. Candy 与 Talkie 的差异

Talkie：

- 更像 UGC 角色市场；
- 有创作者、标签活动、角色公开资料页；
- 社区、记忆、搜索、多语言、活动标签明显；
- 角色数量和探索路径更强。

Candy：

- 更像 AI 伴侣付费产品；
- 创建自己的伴侣更突出；
- Premium 漏斗更直接；
- 图片、视频、电话权益更前置；
- 角色字段更结构化。

## 4. 对我们复刻方向的合并判断

我们不应该完全转向 Candy。

更适合的方向是：

> 底层结构模仿 Talkie：角色市场、搜索、标签活动、社区、角色公开页。  
> 商业化和创建流程借鉴 Candy：自定义角色字段、多模态权益、My AI、Collection、Premium 漏斗。

## 5. 建议纳入 SPEC 的功能

P0 必须纳入：

- 创建角色；
- My AI；
- 角色公开资料页；
- 聊天页媒体按钮：Image / Voice / Call / Secret Space；
- Collection / Gallery 的入口和空状态；
- Premium 常驻入口；
- 登录卡点和会员卡点。

P1 纳入：

- 活动标签页；
- 社区发帖；
- 评论；
- 角色分享页 SEO；
- 更细外貌字段；
- 真实 TTS；
- 真实图片生成。

P2 暂不做：

- Live Action；
- 真实视频生成；
- 实时电话；
- 原生 App；
- 创作者收益分成；
- 复杂成人内容。

## 6. 关键风险

- Candy 明显偏成人向，我们第一版不要做成人内容；
- 可以学习它的付费结构和多模态权益，但内容尺度要控制；
- 角色年龄必须要求 18+；
- 图片生成和对话需要安全规则；
- 订阅权益不要承诺第一版做不到的真实视频和实时电话。
