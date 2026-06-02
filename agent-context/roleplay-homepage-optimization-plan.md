# RolePlay 首页优化计划

## 目标

将当前首页从「分类筛选 + 角色网格」升级为三段式首页：

1. **For You 推荐区**：首屏主推荐，保留角色卡片左右滑动能力，并按登录状态使用不同排序策略。
2. **Explore / 分类角色区**：承接当前首页截图 2 的内容，保留分类 chips、角色大图卡、左右切图、筛选体验。
3. **Footer / 站点信息区**：恢复接近第 1 版首页和截图 3 的底部信息区，包含品牌、社交入口、功能/探索/站点链接、版权和客服入口。

整体体验要偏「照片优先、沉浸式浏览、低遮挡 CTA」。用户鼠标移到角色卡片时，角色用逐字输出的动态方式展示打招呼内容，卡片下端露出 Chat 入口，但不能大面积遮挡角色照片。

## 执行状态

| 阶段 | 状态 | 说明 |
| --- | --- | --- |
| P0：文档与接口设计 | 进行中 | 已落首页优化计划，正在补执行状态与实现日志。 |
| P1：后端推荐能力 | 已完成，待验证 | 已新增推荐接口与聊天次数增量维护。 |
| P2：首页三段式重构 | 已完成，待验证 | 已拆分 For You、Explore、Footer 三段。 |
| P3：卡片 hover 与 Chat 入口 | 已完成，待验证 | 已增强角色卡片 hover opening 与 Chat CTA。 |
| P4：验证与调优 | 未开始 | 待运行检查并记录结果。 |

## 操作日志

- 2026-05-27：创建首页优化计划，明确 For You、Explore、Footer 三段结构与推荐策略。
- 2026-05-27：开始执行实现；检查当前首页、角色卡片、角色接口、角色模型、聊天创建逻辑和用户 persona 结构。
- 2026-05-27：新增 `GET /api/roleplay/recommendations`，For You 推荐顺序由服务端返回，避免被 Explore 的客户端排序重排。
- 2026-05-27：在聊天创建新 `roleplay_conversation` 时对真实数据库角色执行 `chat_count + 1`，不实时聚合会话表。
- 2026-05-27：重构首页为 For You 推荐区、Explore 分类区、Footer 站点信息区。
- 2026-05-27：增强角色卡片 hover 逐字打招呼效果，新增底部轻遮挡 Chat 入口并保留图片轮播。

## 当前现状

- 首页入口：`shipany-template-dev/src/app/[locale]/(landing)/page.tsx`
- 首页主体：`shipany-template-dev/src/shared/components/roleplay/roleplay-landing.tsx`
- 角色卡片：`shipany-template-dev/src/shared/components/roleplay/roleplay-character-card.tsx`
- 图片轮播：`shipany-template-dev/src/shared/components/roleplay/photo-carousel.tsx`
- 角色列表接口：`shipany-template-dev/src/app/api/roleplay/characters/route.ts`
- 角色模型：`shipany-template-dev/src/shared/models/roleplay.ts`

当前首页只展示一组角色网格；接口排序以 `updatedAt desc` 为主，客户端又通过 `sortCharacters` 按 `settings.sortOrder/name` 重排。后续 For You 必须避免客户端把服务端推荐顺序重新打乱。

## 首页结构

### 1. For You 推荐区

位置：首页最上方，第一屏核心内容。

展示：

- 标题使用 `For You`，可带小星光图形点缀，但不要做过重的营销 hero。
- 横向角色 rail 或三列大卡片布局，保留角色图片左右滑动能力。
- 推荐卡片优先展示 6-12 个角色，桌面首屏露出 3 个左右，移动端单列横滑。
- 未登录时可提示「登录后获得更贴近你的推荐」，但提示必须轻，不要压过角色内容。

未登录推荐顺序：

1. 公共角色中 `chat_count` 高的排在前面。
2. 不实时聚合每个角色的会话数，不扫描 `roleplay_conversation` 或消息表来算热度。
3. `chat_count` 由聊天行为增量维护：用户进入角色聊天并创建/恢复有效聊天时，对该角色加 1。需要避免刷新页面重复加。
4. 热门角色后补一定数量的女性角色和男性角色，避免推荐区全是单一性别。
5. 最后补其它公开角色，保证推荐数量足够。

已登录推荐顺序：

1. 该用户最近一次聊天的角色。
2. 该用户私有角色。
3. 与该用户性别相反的角色：用户为男性时优先女性角色，用户为女性时优先男性角色，非二元或未知时不强行按反性别过滤。
4. 其它可见角色。

去重规则：

- 同一角色只出现一次。
- 排序分桶按优先级合并，前面桶已经出现的角色从后面桶移除。
- 私有角色只对 owner 展示。

### 2. Explore / 分类角色区

位置：For You 下方。

内容：复用截图 2 和当前首页已有部分。

展示：

- 保留分类 chips：ALL、Muses、Anime、Featured、Recommend、Play & Fun、Helper、Original、Fiction & Media、Icon。
- 保留当前角色卡片网格和 `PhotoCarousel` 左右滑动。
- 当前 `RoleplayLanding` 的分类加载逻辑可以迁移到独立组件，例如 `RoleplayExploreSection`。
- For You 与 Explore 应共享卡片组件，但数据源和排序不完全相同。

### 3. Footer / 站点信息区

位置：首页底部。

内容参考截图 3 和第 1 版首页：

- 左侧品牌 logo / Talkie 风格品牌名，可替换为当前 RolePlay 品牌。
- 社交入口图标：Discord、Reddit、TikTok、X、Instagram 等。
- 版权：`Copyright © 2026 ... All rights reserved`
- 链接分组：
  - Features、FAQ、Get App、Create a Talkie、Your Privacy Choices、Delete Account、Export Data
  - Explore、Events & Tags、Multilingual、More AI Characters、Feeling Curious
  - Overview、About Us、Blog、Contact & Support、Terms、Privacy、Community Guidelines
- 可保留右下客服入口，但不要遮挡底部链接。

## 角色卡片交互

保留：

- 当前 `PhotoCarousel` 的左右箭头、触摸滑动、圆点指示器。
- 点击图片进入角色详情。

新增 hover 动效：

- 鼠标移入角色卡片时，在图片下半部分浮现一层轻量渐变遮罩。
- 展示角色打招呼内容，优先使用 `opening`，没有则回退到 `intro/tagline`。
- 文案逐字输出，类似 typewriter：每个字/字符依次出现。
- 长文案使用最多 3-5 行展示，超出时做柔和截断；不要一次性铺满整张照片。
- 可在逐字输出完成后做轻微横向流动或循环闪烁光标，形成「跑马灯」感，但主体仍应是逐字出现。
- 移出卡片后重置动画，下次 hover 重新播放。

Chat 入口：

- 卡片底部增加 `Chat Now` / `Chat` 胶囊按钮。
- 按钮放在图片底部安全区或信息区上沿，使用半透明深色背景 + 模糊，不超过卡片高度的 12%-16%。
- 不遮挡人物面部，优先贴底展示。
- 按钮点击直接进入该角色聊天入口；卡片其它区域仍可进入详情。
- 移动端没有 hover，应默认展示较轻的 Chat 入口，并可在点击/长按时展示 opening 摘要。

无障碍：

- Chat 入口必须是可聚焦按钮/链接。
- hover 文案不能成为唯一信息来源，详情页仍能看到 opening/intro。
- `prefers-reduced-motion` 下关闭逐字动画，直接显示静态短句。

## 数据与接口改造

### 推荐接口

建议新增独立接口：

- `GET /api/roleplay/recommendations`

参数：

- `limit`：默认 12。
- `section=for-you`：预留未来多推荐位。
- 可选 `tag`：如果后续 For You 也要按标签过滤。

返回：

- `authenticated`
- `characters`
- `buckets` 或 `reason` 可选，用于调试每个角色来自哪个推荐桶。

为什么不复用 `/api/roleplay/characters`：

- 当前接口承担分类列表职责。
- For You 需要保留服务端排序，不能被客户端通用排序覆盖。
- 推荐策略会使用用户最近会话、私有角色、用户性别、chat_count 等上下文，适合独立维护。

### 聊天次数维护

现有表已有 `roleplay_character.chat_count`，模型里已有 `incrementCharacterCounter(id, 'chatCount', delta)`。

建议策略：

- 在用户开始一个有效角色聊天时增量，而不是首页实时统计。
- 优先在创建新 `roleplay_conversation` 时加 1。
- 如果业务定义为「点进角色聊天页就加」，需要增加一个轻量进入事件，并用 `conversationId` 或短期幂等 key 防止刷新重复加。
- 匿名用户如果能聊天，可以只对真实数据库角色加 `chat_count`；本地 fallback 角色不写库。

### 最近聊天角色

已登录推荐需要读取：

- `roleplay_conversation` 中当前用户 `updated_at desc` 的最近会话。
- 取 `character_id` 能关联到角色表的会话；如果只有 `characterSnapshot`，可作为降级展示，但推荐排序最好优先真实角色 ID。

### 用户性别

已登录推荐需要用户性别来源：

- 优先读取用户资料里的 persona/profile 性别字段。
- 如果当前用户表没有明确字段，需要先确认现有 profile 数据结构；没有时可先按 unknown 处理，不做反性别桶。

### 客户端排序

需要调整 `fetchRoleplayCharacters` 或新增 `fetchRoleplayRecommendations`：

- Explore 继续可以使用 `sortCharacters`。
- For You 必须使用服务端返回顺序，不能再按 `sortOrder/name` 重排。

## 组件拆分建议

- `RoleplayLanding`
  - 负责页面组合和背景。
- `RoleplayForYouSection`
  - 调用推荐接口。
  - 展示推荐 rail / 大卡片。
  - 处理 loading / empty。
- `RoleplayExploreSection`
  - 从当前 `RoleplayLanding` 拆出分类 chips + 网格。
- `RoleplayHomeFooter`
  - 首页专用 footer。
- `RoleplayCharacterCard`
  - 增加 hover opening + Chat CTA。
  - 继续复用 `PhotoCarousel`。
- `roleplay-client.ts`
  - 新增 `fetchRoleplayRecommendations`。

## 实施阶段

### P0：文档与接口设计

- 完成本文档。
- 明确推荐接口返回结构。
- 明确聊天次数增量触发点。
- 确认用户性别字段来源。

### P1：后端推荐能力

- 新增 `getRoleplayRecommendations` 模型方法或服务方法。
- 新增 `/api/roleplay/recommendations`。
- 未登录按 `chat_count desc` + 性别补齐 + 其它公开角色排序。
- 已登录按最近聊天、私有角色、反性别角色、其它角色排序。
- 调整聊天创建逻辑，维护 `chat_count` 增量。

### P2：首页三段式重构

- 将当前首页拆为 For You、Explore、Footer 三块。
- For You 接入新推荐接口。
- Explore 保留当前分类筛选。
- Footer 恢复站点信息区。

### P3：卡片 hover 与 Chat 入口

- 在 `RoleplayCharacterCard` 增加 opening overlay。
- 增加逐字输出动画和 reduced-motion 降级。
- 增加底部 Chat CTA，确保不遮挡脸部。
- 保持图片左右滑动不变。

### P4：验证与调优

- 桌面宽屏、笔记本、移动端验证。
- 未登录、已登录、无会话、有会话、有私有角色分别验证。
- 检查推荐顺序是否被客户端重排。
- 检查 hover 动画、轮播箭头、Chat 点击互不冲突。
- 检查 loading skeleton 和空态。

## 验收标准

- 未登录首页第一块显示 For You，排序优先使用公开角色 `chat_count`。
- 已登录首页第一块按「最近聊天角色 → 私有角色 → 反性别角色 → 其它角色」展示。
- Explore 区保留当前分类 chips 和角色卡片浏览能力。
- Footer 区展示接近截图 3 的品牌、链接、社交和版权信息。
- 角色卡片 hover 时逐字展示 opening，移出后重置。
- Chat 入口可见、可点击，但不明显遮挡角色照片。
- 角色图片左右滑动、点击详情、点击 Chat 三种交互互不打架。
- `chat_count` 不通过实时聚合计算，而是在聊天行为中增量更新。
