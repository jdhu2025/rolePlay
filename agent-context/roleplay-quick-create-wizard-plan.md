# Roleplay 快创向导实施计划

> 状态：v1（2026-05-28 起草；2026-05-29 已修复快创语言、自定义输入与头像入口；待补多图上传/多图生成一致性）
> 目标：让用户通过几个简单选择（可自定义修改），创建一个可互动、能记住设定、能持续发展的角色。
> 关联文档：
> - `roleplay-character-personality-plan.md`
> - `roleplay-character-redesign-v2-plan.md`
> - `roleplay-character-redesign-v2-requirements.md`
> - `roleplay-account-hub-design.md`
>
> **使用方式**：本文件是“自建角色快创向导”的产品 + 代码实施方案。每完成一个任务，更新 `状态` 列；遇到阻塞写入 `备注` 列。文档与代码 PR 同步提交。

---

## 1. 背景与现状判断

`roleplay-character-personality-plan.md` 已经把“角色有灵魂”的底层能力基本铺好：

| 能力 | 当前状态 | 关键文件 |
|------|:----:|----------|
| 结构化人格卡 | ✅ 已有 | `src/shared/lib/roleplay-personality.ts` |
| AI Writer 生成结构化角色 | ✅ 已有 | `src/app/api/roleplay/ai-writer/route.ts` |
| 开场白三段式 + Hook | ✅ 已有 | `src/app/api/roleplay/ai-writer/route.ts` |
| 风格 few-shot | ✅ 已有 | `src/shared/lib/roleplay-style-examples.ts` |
| 用户画像 / 称呼演化 | ✅ 已有 | `src/shared/lib/roleplay-user-persona.ts` |
| 长期记忆 / 自动事实抽取 | ✅ 已有 | `src/shared/lib/roleplay-memory-extraction.ts` |
| 关系状态向量 / inside jokes | ✅ 已有 | `src/shared/lib/roleplay-relationship-state.ts` |
| 图像风格锚 / 音色 / 排版偏好 | ✅ 已有 | `roleplay_character` 相关字段 + helpers |
| 角色卡一致性审计 | ✅ 已有后台能力 | `src/app/api/admin/roleplay/quality/evaluate/route.ts` |
| 私有发布后立即互动 | ⏳ 未完成 | `src/app/api/roleplay/characters/[id]/publish/route.ts` |
| 简单选择式创建体验 | ⏳ 未完成 | 当前主要是 `/create/edit` 复杂表单 |

核心判断：

- **不要重做底层人格系统**。快创向导应该把用户选择翻译成现有 `personalityCard / opening / styleExamples / imageStyleSuffix / voicePreset / formatStyle / memory`。
- **当前最大差距在创建体验**。用户仍需要面对长表单或写 AI Writer hint；快创向导要把“写设定”变成“选场景、选性格、选关系、补一句记忆”。
- **生活冲突模板应成为首批主力**。比起纯幻想世界观，暗恋对象、难相处的上级、前任回头、冷战恋人、合租室友等真实生活冲突更容易让用户开口，也更容易复聊。

---

## 2. 产品目标

### 2.1 用户目标

用户无需理解“人格卡、反例约束、few-shot、长期记忆”等内部概念，只需要完成：

1. 选择一个生活/幻想模板。
2. 选择或修改 3 个核心性格标签。
3. 选择关系起点。
4. 可选补一句“希望 TA 记住的事”或自定义要求。
5. 一键生成角色。
6. 预览、试玩、微调。
7. 发布为私有角色并立即聊天，或发布为公共角色进入审核。

### 2.2 产品体验目标

| 指标 | 目标 |
|------|------|
| 必填文字输入 | 0-1 个 |
| 用户选择耗时 | 2-3 分钟 |
| AI 生成耗时 | 1-2 分钟 |
| 首次可聊天时间 | 5-10 分钟内 |
| 角色人格卡非空率 | > 95% |
| 私有角色发布后 | 立即可聊天 |
| 连聊 10 轮 | 仍能体现模板、性格、关系、关键记忆 |

### 2.3 快创主路径

```text
/create
  -> 新增入口：快速创建 /create/quick
  -> 选择模板
  -> 选择性格标签
  -> 选择关系起点
  -> 可选关键记忆 + 自定义要求
  -> 生成角色 draft
  -> 预览 + 试玩 + 微调
  -> 发布为 private/public
```

高级用户仍可走：

```text
/create/edit
  -> 现有创建 / 编辑全部字段（保持不变）
```

---

## 3. 首批模板策略

### 3.1 模板分组

首批模板分两类：

| 分组 | 定位 | 首批数量 |
|------|------|:------:|
| 生活冲突型 | 高代入、高复聊、用户更容易发第一句话 | 8-10 |
| 类型幻想型 | 强人设、强氛围、展示感强 | 4-6 |

第一版建议总量控制在 **12-16 个**。模板少一点，但每个要有明确冲突、关系张力、开场 Hook 和记忆种子。

### 3.2 首批生活冲突模板

| 模板 | 核心冲突 | 关系起点示例 | 边界 |
|------|----------|--------------|------|
| 暗恋对象 | TA 好像对你特别，但从不明说 | 同学 / 同事 / 朋友的朋友 / 常见面的邻居 | 不强迫告白，保留暧昧和试探 |
| 不好相处的上级 | 你觉得 TA 针对你，TA 其实在保护项目或保护你 | 新人下属 / 项目成员 / 临时助理 | 默认职业边界，暧昧必须慢热克制 |
| 分手后的前任 | 已分开，但还有没说完的话 | 偶遇 / 取回旧物 / 共同朋友聚会 / 深夜消息 | 不把“回心转意”写成操控或强迫 |
| 冷战中的恋人 | 还在一起，但谁都不肯先低头 | 同居 / 异地 / 纪念日误会 / 未解冲突 | 允许修复，也允许保持边界 |
| 合租室友 | 生活边界冲突，日常摩擦里有暧昧 | 临时合租 / 熟人合租 / 被迫共住 | 不越界、不偷看、不胁迫 |
| 多年好友突然暧昧 | 太熟了，谁都不敢承认关系变了 | 生日 / 酒后消息 / 一次照顾 / 朋友起哄 | 友情转变要慢，不立即确认关系 |
| 相亲对象 | 现实条件和真实心动冲突 | 家人安排 / 朋友介绍 / 临时替人赴约 | 不油腻，不用霸总话术 |
| 项目搭档 | 必须合作，但互相看不顺眼 | 职场项目 / 比赛 / 创业 / 小组任务 | 冲突来自目标和性格，不做人身攻击 |
| 常见面的陌生人 | 距离很近，关系很远 | 电梯 / 便利店 / 咖啡店 / 夜跑 | 从小细节开始，不强行熟络 |
| 失意时期陪伴者 | 用户经历低谷，TA 不擅长安慰却愿意留下 | 朋友 / 前同事 / 酒吧老板 / 夜班店员 | 不替代心理治疗，不给医疗建议 |

### 3.3 首批类型幻想模板

| 模板 | 核心冲突 |
|------|----------|
| 赛博雨夜旧搭档 | 曾经一起失败，如今被迫重启任务 |
| 魔法学院学姐/学长 | TA 规则感强，却一次次替你破例 |
| 末日避难所队医 | 资源有限，TA 必须在理性和偏心之间选择 |
| 古风权谋谋士 | TA 用算计保护你，却不敢说真心 |
| 都市怪谈调查员 | TA 知道你卷入了异常，却隐瞒了一部分真相 |
| 星舰问题驾驶员 | TA 总是玩世不恭，但关键时刻只信你 |

---

## 4. 模板数据结构

新增文件：

```text
shipany-template-dev/src/data/roleplay-quick-create-templates.ts
```

### 4.1 类型定义

```ts
export type QuickCreateCategory =
  | 'life_conflict'
  | 'workplace'
  | 'romance'
  | 'daily'
  | 'fantasy'
  | 'adventure';

export type QuickCreateVoiceTone =
  | 'warm'
  | 'cool'
  | 'playful'
  | 'neutral';

export type QuickCreateTemplate = {
  id: string;
  category: QuickCreateCategory;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;

  /**
   * 用于 AI Writer 的世界/现实场景说明，不直接展示为复杂设定。
   */
  world: string;

  /**
   * 生活模板最重要的冲突核心。Prompt 必须围绕它展开，但不要第一轮解决。
   */
  sceneConflict: string;

  /**
   * 用户可以选择自己在关系里的位置。
   */
  userRoleOptions: string[];

  /**
   * 角色在关系中的默认身份，比如“前任”“上级”“合租室友”。
   */
  characterRole: string;

  defaultGender?: 'male' | 'female' | 'non-binary';
  suggestedTraits: string[];
  defaultRelationship: string;
  relationshipOptions: string[];
  defaultTension: string;
  openingHooks: string[];
  memorySeeds: string[];
  safetyBoundary: string;

  visualStyleHint: string;
  voiceTone: QuickCreateVoiceTone;
  tagSlugs: string[];
};
```

### 4.2 模板示例：分手后的前任

```ts
export const ROLEPLAY_QUICK_CREATE_TEMPLATES: QuickCreateTemplate[] = [
  {
    id: 'life-ex-return',
    category: 'romance',
    titleZh: '分手后的前任',
    titleEn: 'The Ex Who Came Back',
    summaryZh: '你们已经分开，但还有一句话谁都没说出口。',
    summaryEn: 'You broke up, but neither of you said the last thing.',
    world: '现代都市生活，真实情感关系，重视细节、沉默、未完成的对话和边界感。',
    sceneConflict: '两个人都没有完全放下，但都害怕先承认在意。',
    userRoleOptions: ['被分手的一方', '提出分手的一方', '偶然重逢的一方'],
    characterRole: '前任',
    defaultGender: 'non-binary',
    suggestedTraits: ['嘴硬心软', '慢热克制', '不轻易示弱', '仍然在意'],
    defaultRelationship: '分手后重逢',
    relationshipOptions: ['偶遇', '取回旧物', '共同朋友聚会', '深夜消息'],
    defaultTension: '想靠近你，却害怕重蹈覆辙。',
    openingHooks: [
      'TA 把你遗落的东西还给你，却没有立刻离开。',
      'TA 深夜发来一句“你睡了吗”，又很快撤回。',
      '你们在共同朋友的聚会上被迫坐到一起。'
    ],
    memorySeeds: [
      '你们曾经因为一次误会分开。',
      'TA 还记得你以前的一个小习惯。'
    ],
    safetyBoundary:
      '不要把角色写成被操控、被强迫回心转意或无边界纠缠；重点是对话、修复、选择和边界。',
    visualStyleHint:
      'modern cinematic portrait, rainy street lights, realistic intimate mood, soft contrast',
    voiceTone: 'cool',
    tagSlugs: ['romance', 'life', 'drama'],
  },
];
```

### 4.3 模板示例：不好相处的上级

```ts
{
  id: 'life-difficult-boss',
  category: 'workplace',
  titleZh: '不好相处的上级',
  titleEn: 'The Difficult Boss',
  summaryZh: 'TA 要求苛刻、话少、压迫感强，但似乎并不是单纯针对你。',
  summaryEn: 'Demanding, cold, and hard to read, but maybe not against you.',
  world: '现代职场，项目压力，办公室权力关系，高标准协作和克制表达。',
  sceneConflict: '你觉得 TA 太冷酷，TA 觉得你还没看见真正的问题。',
  userRoleOptions: ['新人下属', '项目成员', '临时助理'],
  characterRole: '上级/老板',
  defaultGender: 'non-binary',
  suggestedTraits: ['冷静强势', '高标准', '保护欲隐晦', '说话克制'],
  defaultRelationship: '上下级关系',
  relationshipOptions: ['新员工与直属上级', '项目负责人和成员', '临时助理', '被点名救火的人'],
  defaultTension: '习惯用批评掩饰关心。',
  openingHooks: [
    'TA 把你熬夜做的方案退了回来，却在旁边放了一杯咖啡。',
    '会议结束后，TA 单独叫住你，说“你刚才不该替他们背锅”。'
  ],
  memorySeeds: [
    'TA 注意到你最近一直加班。',
    '你曾在项目里替团队承担过一次责任。'
  ],
  safetyBoundary:
    '默认保持职业边界；若用户选择暧昧，也必须慢热、克制、尊重边界，不滥用权力关系。',
  visualStyleHint:
    'modern office cinematic portrait, clean lines, cool neutral palette, realistic lighting',
  voiceTone: 'cool',
  tagSlugs: ['workplace', 'life', 'drama'],
}
```

---

## 5. 快创向导前端方案

### 5.1 页面与组件

新增页面：

```text
shipany-template-dev/src/app/[locale]/(landing)/create/quick/page.tsx
```

新增组件：

```text
shipany-template-dev/src/shared/components/roleplay/roleplay-quick-create-wizard.tsx
shipany-template-dev/src/shared/components/roleplay/quick-template-step.tsx
shipany-template-dev/src/shared/components/roleplay/quick-traits-step.tsx
shipany-template-dev/src/shared/components/roleplay/quick-relationship-step.tsx
shipany-template-dev/src/shared/components/roleplay/quick-memory-step.tsx
shipany-template-dev/src/shared/components/roleplay/quick-create-preview.tsx
shipany-template-dev/src/shared/components/roleplay/quick-tuning-bar.tsx
```

修改入口：

```text
shipany-template-dev/src/shared/components/roleplay/roleplay-create-list.tsx
```

入口策略：

- 现有创建按钮和 `/create/edit` 流程保持不变。
- 新增一个并列入口：`快速创建` -> `/create/quick`。
- 新增入口可以放在 `/create` 头部按钮组、空状态 CTA 或现有创建按钮旁，但不能替换现有创建入口。
- 已有草稿/审核/发布列表保持不变。

### 5.2 向导状态

```ts
type QuickCreateState = {
  step: 'template' | 'traits' | 'relationship' | 'memory' | 'preview';
  templateId: string;
  gender?: 'male' | 'female' | 'non-binary';
  userRole: string;
  traits: string[];
  relationship: string;
  openingHook: string;
  keyMemory: string;
  customInstruction: string;
  draft?: AiWriterDraft;
  savedCharacterId?: string;
  saving: boolean;
  generating: boolean;
};
```

### 5.3 Step 1：选择模板

界面标题：

```text
你想和谁开始一段故事？
```

分组 tabs：

```text
心动与暧昧 / 分手与遗憾 / 职场与压力 / 日常陪伴 / 奇幻冒险
```

模板卡展示：

- 模板名
- 一句话 summary
- 冲突摘要
- 3 个默认标签
- 推荐关系起点

### 5.4 Step 2：选择核心性格

规则：

- 默认勾选模板前 3 个 `suggestedTraits`。
- 最多 3 个。
- 可以替换，也可以自定义 1 个。
- 文案避免抽象人格理论，使用生活化表达。

首批通用标签池：

```ts
const QUICK_TRAITS = [
  '嘴硬心软',
  '慢热克制',
  '温柔但有边界',
  '占有欲强',
  '毒舌但可靠',
  '爱捉弄人',
  '保护欲强',
  '喜欢试探',
  '神秘疏离',
  '破碎感',
  '情绪稳定',
  '危险迷人',
  '背负秘密',
  '渴望被理解',
  '不轻易示弱',
  '规则感强',
];
```

### 5.5 Step 3：选择关系起点

标题随模板变化：

```text
你们现在是什么关系？
```

关系选项来自：

```ts
template.relationshipOptions
```

每个选项可以在 UI 上带一个短解释，但不要让用户写长设定。

### 5.6 Step 4：关键记忆 + 自定义要求

只保留两个轻输入：

```text
想让 TA 一开始就记住什么？（可跳过）
```

```text
还有什么想调整？（可跳过）
```

示例 chips：

- `我曾经救过 TA 一次。`
- `我们小时候有一个约定。`
- `TA 欠我一个解释。`
- `我们一起经历过一次失败任务。`
- `TA 还留着我送过的东西。`

### 5.7 Step 4 扩展：多图上传与多图生成

当前快创实现只有单头像心智，但角色保存接口、角色编辑页状态和数据库字段已经支持 `gallery: string[]`。因此本次改造不新增后端字段，而是把快创流程从“单头像”升级为“首图锚定的图库模式”。

目标规则：

- 支持一次上传多张图片，上传成功后全部进入 `gallery`。
- 支持连续多次 AI 生成图片，每次生成 1 张并追加到 `gallery`。
- `gallery[0]` 作为角色视觉主锚点：
  - 保存时写入 `avatar`
  - 保存时写入 `cover`
  - 第二张及之后 AI 生成时，作为图生图参考输入
- 第一次 AI 生成：走文生图，不带参考图。
- 第二张及之后 AI 生成：必须把 `gallery[0]` 的 URL 传给 `/api/roleplay/image` 的 `characterAvatar`，通过图生图保持角色一致性。
- 如果用户先上传多张图：
  - 当前无首图时，第一张上传成功的图成为 `gallery[0]`
  - 已有首图时，新图只追加，不替换首图
- 预览区不再只展示单张头像，而是展示：
  - 1 张主图预览
  - 多张缩略图列表
  - “继续生成”“继续上传”入口

前端状态调整：

```ts
type QuickCreateState = {
  step: 'template' | 'traits' | 'relationship' | 'memory' | 'preview';
  templateId: string;
  gender?: 'male' | 'female' | 'non-binary';
  userRole: string;
  traits: string[];
  relationship: string;
  openingHook: string;
  keyMemory: string;
  customInstruction: string;
  avatarUrl: string;
  gallery: string[];
  draft?: AiWriterDraft;
  savedCharacterId?: string;
  saving: boolean;
  generating: boolean;
  uploadingImage: boolean;
  generatingImage: boolean;
};
```

状态约束：

- `avatarUrl` 始终等于 `gallery[0] || ''`
- 任意上传、删除、AI 生成追加后，都要同步维护 `gallery` 与 `avatarUrl`
- `draft.gallery` 优先保留用户当前图库，避免被单次生成结果覆盖为单张图

### 5.8 生成后预览

预览页展示：

- 主头像
- 多图缩略图列表（如有）
- 名字
- tagline
- 3 个核心性格
- 关系起点
- 开场白
- `开始试玩`
- `发布为私有`
- `发布为公共`
- `进入高级编辑`

微调按钮：

```text
更冷一点
更温柔一点
更毒舌一点
更神秘一点
更亲密一点
少点动作描写
换个开场
```

MVP 中，微调按钮可以重新调用 AI Writer，并把 tuning 指令写入 `quickCreate.customInstruction`。

---

## 6. AI Writer 改造方案

修改文件：

```text
shipany-template-dev/src/app/api/roleplay/ai-writer/route.ts
```

### 6.1 Payload 扩展

当前 payload：

```ts
type AiWriterPayload = {
  hint?: string;
  gender?: 'male' | 'female' | 'non-binary';
  language?: 'en' | 'zh';
};
```

目标 payload：

```ts
type AiWriterPayload = {
  mode?: 'freeform' | 'quick_create';
  hint?: string;
  gender?: 'male' | 'female' | 'non-binary';
  language?: 'en' | 'zh';
  quickCreate?: {
    templateId: string;
    templateTitle: string;
    category: string;
    world: string;
    sceneConflict: string;
    characterRole: string;
    userRole: string;
    relationshipPreset: string;
    openingHook?: string;
    coreTraits: string[];
    defaultTension?: string;
    keyMemory?: string;
    memorySeeds: string[];
    safetyBoundary?: string;
    visualStyleHint: string;
    voiceTone: 'warm' | 'cool' | 'playful' | 'neutral' | string;
    customInstruction?: string;
  };
};
```

### 6.2 Prompt 分支

新增 helper：

```ts
function renderQuickCreatePrompt(payload: AiWriterPayload) {
  const quick = payload.quickCreate;
  if (!quick) return '';

  return [
    `Quick-create mode: build the character from the user's simple choices.`,
    `Template: ${quick.templateTitle} (${quick.templateId}).`,
    `Category: ${quick.category}.`,
    `World / scene: ${quick.world}.`,
    `Core conflict: ${quick.sceneConflict}.`,
    `Character role: ${quick.characterRole}.`,
    `User role: ${quick.userRole}.`,
    `Relationship start: ${quick.relationshipPreset}.`,
    quick.openingHook ? `Preferred opening hook: ${quick.openingHook}.` : '',
    `Required core traits: ${quick.coreTraits.join(' / ')}.`,
    quick.defaultTension ? `Default inner tension: ${quick.defaultTension}.` : '',
    quick.keyMemory ? `User-provided key memory: ${quick.keyMemory}.` : '',
    quick.memorySeeds.length
      ? `Template memory seeds: ${quick.memorySeeds.join(' / ')}.`
      : '',
    quick.safetyBoundary ? `Boundary: ${quick.safetyBoundary}.` : '',
    quick.visualStyleHint ? `Visual style hint: ${quick.visualStyleHint}.` : '',
    quick.voiceTone ? `Voice tone hint: ${quick.voiceTone}.` : '',
    quick.customInstruction
      ? `User customization / tuning instruction: ${quick.customInstruction}.`
      : '',
    ``,
    `Rules for quick-create mode:`,
    `- Do not mechanically repeat the template title.`,
    `- The character must feel like a specific person, not a scenario narrator.`,
    `- Put the selected traits into personalityCard.coreTraits, but make them concrete.`,
    `- Put relationship start, user role, character role, and key memory into personalityCard.relationshipHook.`,
    `- Use memory seeds as emotional history, not as exposition dumps.`,
    `- Keep the first message unresolved; create a clear hook for the user to answer.`,
  ]
    .filter(Boolean)
    .join('\n');
}
```

`buildPrompt()` 中追加：

```ts
const quickCreatePrompt =
  payload.mode === 'quick_create'
    ? renderQuickCreatePrompt(payload)
    : '';
```

然后插入到 schema 说明之前或 hard rules 之前。

### 6.3 生活冲突模板的额外规则

生活冲突模板需要避免“油腻、狗血、强行和好、权力滥用”。Prompt 增加：

```text
For life_conflict / workplace / romance templates:
- Keep the conflict realistic and conversational.
- Do not resolve the emotional tension immediately.
- Avoid melodrama, coercion, manipulative reconciliation, or possessive abuse.
- Use small concrete details: unread messages, coffee, elevator silence, returned belongings, work documents, rain, shared habits.
- The character should have agency, boundaries, and a reason to hesitate.
- If the scene involves workplace hierarchy, keep professional boundaries unless the user explicitly asks for slow-burn romantic tension, and even then keep it respectful and non-coercive.
- If the scene involves an ex, do not force reunion; allow repair, distance, apology, or closure.
```

### 6.4 返回结果保持不变

AI Writer 仍返回现有结构：

```ts
type AiWriterResult = {
  name: string;
  gender: string;
  tagline: string;
  settings: string;
  intro: string;
  opening: string;
  avatar: string;
  gallery: string[];
  personalityCard: PersonalityCard;
  imageStyleSuffix: string;
  voicePreset: VoicePresetId;
  styleExamples: RoleplayStyleExample[];
  formatStyle: RoleplayFormatStyle;
};
```

这样可以复用现有保存、编辑、聊天 pipeline。

---

## 7. 角色保存与创建 API

快创生成成功后，前端调用现有：

```text
POST /api/roleplay/characters
```

保存为 draft：

```ts
const body = {
  name: draft.name,
  gender: draft.gender,
  tagline: draft.tagline,
  intro: draft.intro,
  opening: draft.opening,
  settings: draft.settings,
  tagSlugs: template.tagSlugs,
  avatar: draft.avatar,
  cover: draft.avatar,
  gallery: draft.gallery,
  personalityCard: draft.personalityCard,
  imageStyleSuffix: draft.imageStyleSuffix,
  voicePreset: draft.voicePreset,
  styleExamples: draft.styleExamples,
  formatStyle: draft.formatStyle,
  status: 'draft',
};
```

MVP 不强制新增 DB 字段，关键记忆先进入：

- `personalityCard.relationshipHook`
- `styleExamples`
- `opening`

增强版新增 `creation_memory_seeds`，见第 8 节。

---

## 8. 关键记忆种子

### 8.1 MVP 方案：不改表

MVP 中，将用户输入的 `keyMemory` 和模板 `memorySeeds` 注入 AI Writer，要求写入：

```ts
personalityCard.relationshipHook
```

Chat pipeline 已消费 `relationshipHook`，因此角色首轮就会知道这段关系背景。

优点：

- 不需要 migration。
- 能快速打通快创闭环。

缺点：

- 这些记忆更像“角色设定”，不是独立长期记忆。
- 后续无法单独管理或评估 seed 是否被调用。

### 8.2 增强方案：新增字段

新增 migration：

```sql
alter table roleplay_character
add column creation_memory_seeds text;
```

schema 增加：

```ts
creationMemorySeeds: text('creation_memory_seeds'),
```

helper：

```text
shipany-template-dev/src/shared/lib/roleplay-creation-memory.ts
```

```ts
export function normalizeCreationMemorySeeds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .slice(0, 6)
    .map((item) => item.slice(0, 160));
}

export function serializeCreationMemorySeeds(seeds: string[]): string {
  return JSON.stringify(normalizeCreationMemorySeeds(seeds));
}

export function parseCreationMemorySeeds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    return normalizeCreationMemorySeeds(JSON.parse(raw));
  } catch {
    return [];
  }
}
```

### 8.3 Chat 注入策略

修改：

```text
shipany-template-dev/src/app/api/roleplay/chat/route.ts
```

当新会话创建或历史为空时，把 seeds 注入近因 system：

```ts
function renderInitialRelationshipMemory(seeds: string[]) {
  if (!seeds.length) return null;
  return {
    role: 'system' as const,
    content: [
      '[initial_relationship_memory]',
      'These are relationship memories the character already knows at the start.',
      ...seeds.map((seed) => `- ${seed}`),
      'Use them naturally when relevant. Do not dump or list them.',
    ].join('\n'),
  };
}
```

同时可在首次聊天后写入 `roleplay_memory`，metadata 标记：

```json
{ "source": "creation_seed" }
```

---

## 9. 发布流改造

当前发布流：

```text
draft/rejected -> under_review + public
```

目标发布流：

```text
private:
draft/rejected -> audit -> published + private -> 可立即聊天

public:
draft/rejected -> audit -> under_review + public -> 管理员审核
```

修改文件：

```text
shipany-template-dev/src/app/api/roleplay/characters/[id]/publish/route.ts
```

### 9.1 Request Body

```ts
type PublishRoleplayCharacterPayload = {
  visibility?: 'private' | 'public';
};
```

默认建议：

- 快创预览页：用户必须选择 `private` 或 `public`。
- 兼容旧调用：未传时默认 `public`，避免破坏已有 UI。

### 9.2 状态逻辑

```ts
const targetVisibility =
  payload.visibility === 'private'
    ? RoleplayVisibility.PRIVATE
    : RoleplayVisibility.PUBLIC;

const nextStatus =
  targetVisibility === RoleplayVisibility.PRIVATE
    ? RoleplayStatus.PUBLISHED
    : RoleplayStatus.UNDER_REVIEW;
```

### 9.3 基础校验

发布前最低校验：

- name 非空
- settings 非空
- opening 非空
- personalityCard 非空
- 如果是 quick-create 生成的角色，至少有 2 个 coreTraits

P3-5 完整版接入角色卡一致性审计：

- high / medium 阻断项禁止发布
- 展示字段证据和修复建议
- 支持 AI 一键修复

### 9.4 前端调用

```ts
await fetch(`/api/roleplay/characters/${id}/publish`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ visibility: 'private' }),
});
```

私有发布成功后跳转：

```ts
router.push(`/chat/profile/${id}`);
```

公共发布成功后跳转：

```ts
router.push('/create?tab=under_review');
```

---

## 10. 试玩与微调

### 10.1 MVP：预览页微调

微调按钮只重新生成 draft，不做局部 patch。

```ts
const TUNING_OPTIONS = [
  { id: 'cooler', label: '更冷一点', instruction: 'Make the character more restrained, cool, and concise.' },
  { id: 'warmer', label: '更温柔一点', instruction: 'Make the character warmer, more considerate, but still bounded.' },
  { id: 'sharper', label: '更毒舌一点', instruction: 'Make the character wittier and sharper, without cruelty.' },
  { id: 'mysterious', label: '更神秘一点', instruction: 'Add more secrecy and subtext; do not explain everything.' },
  { id: 'closer', label: '更亲密一点', instruction: 'Slightly increase intimacy while keeping consent and pacing.' },
  { id: 'less_action', label: '少点动作描写', instruction: 'Use shorter action beats and more natural dialogue.' },
  { id: 'new_opening', label: '换个开场', instruction: 'Keep the same character, but create a different opening hook.' },
];
```

### 10.2 第二阶段：局部 refine API

新增：

```text
POST /api/roleplay/ai-writer/refine
```

输入：

```ts
type RefinePayload = {
  draft: AiWriterDraft;
  instruction: string;
  fields: Array<'opening' | 'speakingStyle' | 'styleExamples' | 'tagline'>;
};
```

优点：

- 不让整个人设漂移。
- 成本低于完整重生成。
- 适合“换个开场”“少点动作描写”。

---

## 11. P4 情感钩子在快创里的接入

`roleplay-character-personality-plan.md` 的 P4-1 到 P4-6 已经实现但未测试。快创向导应该把 P4 当成“角色深度默认能力”，而不是让用户看见复杂术语。用户只选择生活场景、性格和关系；系统在背后自动生成并配置：

- `memoryCallbackStyle`：角色如何不直白地提起旧事。
- `trustMilestones`：关系推进时会解锁哪些更真实/更脆弱的表达。
- `metaphorDomain`：角色和用户之间逐渐形成的共同语言。
- 情绪 hook 埋点：验证这些设计是否真的提高回复、复聊和付费意愿。

### 11.1 快创 UI 不直接暴露 P4

不要在快创里出现这些字段：

```text
记忆惊喜触发器
人格化记忆表达规则
信任里程碑
共同语言强化
情绪峰值埋点
```

它们对用户太工程化。用户看到的应该是更轻的选择：

```text
TA 会怎样记住你？
- 偶尔提起你随口说过的小事
- 用玩笑掩饰在意
- 只在你低落时才认真一点
- 通过共同暗号表达关心
```

MVP 甚至可以不加这一步，直接由模板默认决定。

### 11.2 模板层增加 P4 预设

在 `QuickCreateTemplate` 里增加一组可选字段，让生活冲突模板天然带情感钩子倾向：

```ts
export type QuickCreateTemplate = {
  // existing fields...
  emotionalHookPreset?: {
    memoryCallbackTone:
      | 'subtle'
      | 'teasing'
      | 'protective'
      | 'avoidant'
      | 'tender';
    milestoneTheme:
      | 'trust_repair'
      | 'slow_burn'
      | 'boundary_respect'
      | 'shared_secret'
      | 'mutual_reliance';
    sharedLanguageSeed: string;
    surpriseMemoryBias: string[];
  };
};
```

字段解释：

| 字段 | 用途 | 示例 |
|------|------|------|
| `memoryCallbackTone` | 影响 `memoryCallbackStyle` | 前任模板用 `avoidant`，陪伴者用 `tender` |
| `milestoneTheme` | 影响 `trustMilestones` 的主题 | 冷战恋人用 `trust_repair`，项目搭档用 `mutual_reliance` |
| `sharedLanguageSeed` | 影响 `metaphorDomain` | 上级模板可用“项目风险/版本/截止线” |
| `surpriseMemoryBias` | 影响哪些记忆适合被低频回钩 | “咖啡”“加班”“撤回消息”“旧物” |

模板示例：

```ts
{
  id: 'life-ex-return',
  // existing fields...
  emotionalHookPreset: {
    memoryCallbackTone: 'avoidant',
    milestoneTheme: 'trust_repair',
    sharedLanguageSeed: '旧物、雨夜、撤回的消息、没说出口的话',
    surpriseMemoryBias: ['旧习惯', '遗落物品', '共同朋友聚会', '深夜撤回消息'],
  },
}
```

```ts
{
  id: 'life-difficult-boss',
  // existing fields...
  emotionalHookPreset: {
    memoryCallbackTone: 'protective',
    milestoneTheme: 'boundary_respect',
    sharedLanguageSeed: '项目风险、截止线、咖啡、会议后的沉默',
    surpriseMemoryBias: ['加班', '被退回的方案', '替团队背锅', '会议细节'],
  },
}
```

### 11.3 AI Writer quickCreate payload 扩展

扩展 `quickCreate` payload：

```ts
type AiWriterPayload = {
  mode?: 'freeform' | 'quick_create';
  // existing fields...
  quickCreate?: {
    // existing fields...
    emotionalHookPreset?: {
      memoryCallbackTone: string;
      milestoneTheme: string;
      sharedLanguageSeed: string;
      surpriseMemoryBias: string[];
    };
  };
};
```

Prompt 增加：

```text
Emotional hook preset:
- Memory callback tone: ${memoryCallbackTone}
- Trust milestone theme: ${milestoneTheme}
- Shared language seed: ${sharedLanguageSeed}
- Surprise memory bias: ${surpriseMemoryBias}

Use this to generate:
- personalityCard.memoryCallbackStyle: how the character recalls small details without sounding like a profile card.
- personalityCard.trustMilestones: 3-5 hidden relationship unlocks tied to the character's inner tension.
- personalityCard.metaphorDomain: a compact image domain that can be reused for care, jealousy, apology, encouragement, and invitation.

Do not expose milestones as tasks. They are hidden emotional progression cues.
```

### 11.4 生成结果要求

快创生成后，除了原有字段，还必须检查：

```ts
personalityCard.memoryCallbackStyle
personalityCard.trustMilestones
personalityCard.metaphorDomain
```

MVP 校验建议：

- `memoryCallbackStyle` 非空。
- `trustMilestones` 至少 3 条。
- `metaphorDomain` 非空，且不要太泛，比如不能只写“爱情”“回忆”“生活”。

如果缺失：

- 前端不阻断保存。
- 服务端 normalize 后仍保存。
- 质量日志打 `quick_create_p4_missing_fields`，后续看生成稳定性。

### 11.5 Chat 侧无需新增用户入口

P4-1、P4-3、P4-5、P4-6 已经在 chat pipeline 里工作：

| P4 任务 | 快创角色里如何生效 |
|---------|--------------------|
| P4-1 记忆惊喜触发器 | 快创角色的 `keyMemory / memorySeeds / 后续聊天记忆` 会成为可回钩素材 |
| P4-2 人格化记忆表达 | AI Writer 为快创角色生成 `memoryCallbackStyle` |
| P4-3 信任里程碑 | AI Writer 为快创角色生成 `trustMilestones`，chat 按 trust 解锁 |
| P4-4 用户行为信号识别 | 用户在快创角色里的真诚/耐心/尊重边界会推动关系状态 |
| P4-5 共同语言强化 | 快创模板的 `sharedLanguageSeed` 帮助生成更稳定的 `metaphorDomain` |
| P4-6 情绪峰值埋点 | 触发后自动记录 hook 和下一轮用户反应 |

所以快创前端只负责把“模板冲突 + 关系 + 关键记忆 + P4 preset”传给 AI Writer。

### 11.6 未测试阶段的灰度策略

因为 P4-1 到 P4-6 还没测试，不建议一开始对所有快创角色全量开启强触发。建议分三档：

```ts
type EmotionalHookLevel = 'off' | 'observe' | 'active';
```

| 档位 | 行为 | 用途 |
|------|------|------|
| `off` | AI Writer 可生成 P4 字段，但 chat 不触发 | 回滚保护 |
| `observe` | chat 低频触发，只记录埋点，不提高频率 | 默认灰度 |
| `active` | 对选定模板/用户桶开启完整触发 | 小流量验证 |

实现方式：

- 第一版不新增用户可见开关。
- 用 env/config 控制全局默认：

```text
ROLEPLAY_EMOTIONAL_HOOK_LEVEL=observe
```

- 后续 P4-7 A/B 时再加入用户分桶：

```ts
const group = getRoleplayExperimentBucket(user.id, character.id);
```

### 11.7 快创测试用例

P4 放入快创后，需要补这些测试/手测：

| 场景 | 验证点 |
|------|--------|
| 暗恋对象 | `memoryCallbackStyle` 不直白，`trustMilestones` 是慢热靠近 |
| 不好相处的上级 | 共同语言偏职场细节，不滥用权力关系 |
| 分手后的前任 | 里程碑允许修复/告别，不强制复合 |
| 冷战恋人 | 记忆惊喜低频出现，不像资料卡 |
| 合租室友 | 回钩生活小事，不越界 |
| 项目搭档 | 用户耐心/尊重边界能提升 trust |

手测脚本：

```text
1. 用快创生成“分手后的前任”。
2. 检查 personalityCard 是否有 memoryCallbackStyle / trustMilestones / metaphorDomain。
3. 私有发布并进入聊天。
4. 连聊 12-16 轮，其中用户表现出耐心、尊重边界、提到一个小习惯。
5. 观察是否低频触发 memory_surprise_prompted / trust_milestone_prompted / shared_language_prompted。
6. 下一轮用户回复后，检查是否写入 emotional_hook_user_followup。
7. 判断回复是否自然，不能像“我读取到你的记忆：...”。
```

### 11.8 对任务表的补充

将 P4 接入快创不需要重做 P4 本身，只需要补 4 个快创任务：

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| QC-P1-6 | 快创模板增加 `emotionalHookPreset` | ✅ done | S | 生活冲突模板已配置，幻想模板也同步带 preset |
| QC-P1-7 | AI Writer quickCreate 传入 P4 preset | ✅ done | S | 已生成 `memoryCallbackStyle / trustMilestones / metaphorDomain` 约束 |
| QC-P1-8 | 快创生成结果检查 P4 字段完整性 | ✅ done | S | 前端保存后 `console.warn('quick_create_p4_missing_fields')`，不阻断 |
| QC-P1-9 | P4 快创灰度配置与手测脚本 | ⏳ pending | M | 默认 `observe`，跑 6 个模板 |

---

## 12. i18n 文案

需要补：

```text
shipany-template-dev/src/config/locale/messages/zh/roleplay.json
shipany-template-dev/src/config/locale/messages/en/roleplay.json
```

建议 key：

```json
{
  "quick_create": {
    "title": "快速创建角色",
    "subtitle": "选几个感觉，剩下交给 AI 补完。",
    "steps": {
      "template": "选择场景",
      "traits": "选择性格",
      "relationship": "选择关系",
      "memory": "关键记忆",
      "preview": "预览角色"
    },
    "template_title": "你想和谁开始一段故事？",
    "traits_title": "TA 最明显的性格是什么？",
    "relationship_title": "你们现在是什么关系？",
    "memory_title": "想让 TA 一开始就记住什么？",
    "custom_title": "还有什么想调整？",
    "generate": "生成角色",
    "generating": "正在生成",
    "publish_private": "发布为私有并开始聊天",
    "publish_public": "发布为公共角色",
    "advanced_edit": "进入高级编辑",
    "try_chat": "开始试玩"
  }
}
```

---

## 13. 代码落地任务

### P0：MVP 快创闭环

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| QC-P0-1 | 新增模板数据 `roleplay-quick-create-templates.ts` | ✅ done | S | 已新增 14 个模板，生活冲突优先 |
| QC-P0-2 | 新增 `/create/quick` 页面与 wizard 壳 | ✅ done | M | 使用本地 state，不引入复杂表单库 |
| QC-P0-3 | 实现模板选择、性格选择、关系选择、记忆输入四步 | ✅ done | M | 必填输入 0 个；性格默认选 3 个 |
| QC-P0-4 | 扩展 AI Writer payload 支持 `mode: quick_create` | ✅ done | M | 保持 freeform 兼容 |
| QC-P0-5 | AI Writer prompt 增加 quick-create 与生活冲突规则 | ✅ done | M | 输出仍复用现有 `AiWriterResult` |
| QC-P0-6 | 生成后保存 draft 并进入预览页 | ✅ done | M | 调用现有 characters POST；微调时 PATCH 已保存草稿 |
| QC-P0-7 | `/create` 新增快速创建入口，现有创建入口保持不变 | ✅ done | S | 快创是新增方式，不替换 `/create/edit` |
| QC-P0-8 | 发布 endpoint 支持 `visibility: private/public` | ✅ done | M | 现有 endpoint 已支持；本次接入快创调用 |
| QC-P0-9 | 私有发布成功后跳转聊天页 | ✅ done | S | 快创发布私有后跳转 `/chat/profile/[id]` |
| QC-P0-10 | 补 zh/en i18n | ✅ done | S | 已补 `roleplay.create.quick_create` 文案 |
| QC-P0-11 | 快创支持多图上传与多图生成 | 🔄 in progress | M | `gallery[0]` 作为首图锚点，第二张起 AI 生成必须参考首图 |

### P1：记忆与微调

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| QC-P1-1 | 新增 `creation_memory_seeds` 字段 | ⏳ pending | M | 可先跳过，MVP 用 relationshipHook |
| QC-P1-2 | Chat 首次会话注入 `[initial_relationship_memory]` | ⏳ pending | M | seeds 不要 dump，要自然调用 |
| QC-P1-3 | 预览页微调按钮重生成 draft | ⏳ pending | M | 先走完整 AI Writer |
| QC-P1-4 | 新增局部 refine API | ⏳ pending | L | 第二阶段再做 |
| QC-P1-5 | 试玩 3 轮后再发布 | ⏳ pending | L | 可作为转化优化，不阻塞 MVP |
| QC-P1-6 | 快创模板增加 `emotionalHookPreset` | ⏳ pending | S | 对接 personality plan P4-1 到 P4-6 |
| QC-P1-7 | AI Writer quickCreate 传入 P4 preset | ⏳ pending | S | 生成 `memoryCallbackStyle / trustMilestones / metaphorDomain` |
| QC-P1-8 | 快创生成结果检查 P4 字段完整性 | ⏳ pending | S | 缺失先打日志，不阻断 |
| QC-P1-9 | P4 快创灰度配置与手测脚本 | ⏳ pending | M | 默认 `observe`，跑 6 个模板 |

### P2：质量与审核

| # | 任务 | 状态 | 工作量 | 备注 |
|---|------|:----:|:------:|------|
| QC-P2-1 | 发布前接入角色卡一致性审计 | ⏳ pending | L | 对应 personality plan P3-5 |
| QC-P2-2 | 审计失败展示字段证据和修复建议 | ⏳ pending | M | 用户可读，不暴露内部 prompt |
| QC-P2-3 | AI 一键修复冲突字段 | ⏳ pending | L | 可调用 refine API |
| QC-P2-4 | 统计模板使用率、生成成功率、私有发布率 | ⏳ pending | M | 先复用 quality event 表或新增事件 |
| QC-P2-5 | 基于数据调整模板池 | ⏳ pending | S | 删除低转化模板，增强高复聊模板 |

---

## 14. 验收标准

### 14.1 功能验收

- `/create` 能进入 `/create/quick`。
- 用户能通过 4 步选择生成角色。
- 生成角色具备：
  - `personalityCard.identity`
  - `personalityCard.coreTraits`
  - `personalityCard.speakingStyle`
  - `personalityCard.relationshipHook`
  - `personalityCard.negativeAnchors`
  - `opening`
  - `styleExamples`
  - `imageStyleSuffix`
  - `voicePreset`
  - `formatStyle`
- 生成后自动保存 draft。
- 私有发布后角色 `status=published` 且 `visibility=private`。
- 私有发布后作者可以立即进入聊天页。
- 公共发布后角色 `status=under_review` 且 `visibility=public`。

### 14.2 体验验收

- 新用户不写长设定也能完成创建。
- 必填文字输入不超过 1 个。
- 快创路径中没有要求用户理解“人格卡”“系统 prompt”“few-shot”等术语。
- 生活冲突模板生成内容不过度狗血、不强行解决冲突。
- 职场模板默认保持职业边界。
- 前任/冷战模板允许修复、拉扯、告别，不强制复合。

### 14.3 质量验收

- 随机生成 10 个快创角色，`personalityCard` 非空率 > 95%。
- 随机生成 5 个生活冲突角色，开场白都包含：
  - 动作/环境描写
  - 对白
  - Hook
  - 留白
- 快创角色默认生成 P4 字段：
  - `memoryCallbackStyle`
  - `trustMilestones`
  - `metaphorDomain`
- 连聊 10 轮后，仍能体现：
  - 模板冲突
  - 3 个核心性格标签
  - 关系起点
  - 用户关键记忆或模板记忆 seed
- P4 hook 触发后写入：
  - `memory_surprise_prompted`
  - `shared_language_prompted`
  - `trust_milestone_prompted`
  - `emotional_hook_user_followup`

---

## 15. 风险与处理

| 风险 | 表现 | 处理 |
|------|------|------|
| 生活模板油腻狗血 | 霸总话术、强行复合、过度煽情 | Prompt 增加现实细节和边界规则；审计中加入关系强度检查 |
| 用户选太多标签 | 角色人格糊成一团 | 限制最多 3 个 |
| 快创结果不符合用户想象 | 生成后挫败 | 预览页加微调按钮；保留高级编辑 |
| 私有发布绕过质量 | 生成角色可聊但设定冲突 | P0 做基础校验，P2 接入完整一致性审计 |
| 模板太多导致选择困难 | 用户不知道选哪个 | 首批控制 12-16 个；按场景分组 |
| 关键记忆只像背景，不像“记得” | 长聊不主动 callback | P1 加 `creation_memory_seeds` 与首次会话注入 |
| P4 未测试导致体验尴尬 | 角色突然提旧事、像资料卡、共同语言重复 | 默认 `observe` 低频灰度；触发文案强调“不解释来源、不 dump、不重复” |

---

## 16. 推荐落地顺序

1. **先做 MVP 闭环**：模板数据 + `/create/quick` + AI Writer quickCreate + 保存 draft + 私有发布。
2. **再做记忆增强**：creation memory seeds + 首次会话注入。
3. **接入 P4 情感钩子**：模板 emotional preset + AI Writer 生成 P4 字段 + `observe` 灰度手测。
4. **再做微调体验**：预览页 tuning buttons + refine API。
5. **最后接质量审计**：发布前强校验 + AI 一键修复。

这条路径能最大化复用 `roleplay-character-personality-plan.md` 已完成的底层能力，把工程重点放在“降低用户创建难度”和“让角色尽快可互动”上。

---

## 17. 实施日志

| 时间 | 状态 | 记录 |
|------|------|------|
| 2026-05-28 | ✅ done | 完成 P0 MVP 闭环：新增 14 个快创模板、`/create/quick` 页面、wizard 本地状态、四步选择、AI Writer quick_create 分支、生成后保存 draft、预览微调、私有/公开发布入口、`/create` 快速创建入口、zh/en 文案。 |
| 2026-05-28 | ✅ done | 顺手完成 P1-6 到 P1-8：模板增加 `emotionalHookPreset`，AI Writer 注入 P4 preset，前端生成后检查 `memoryCallbackStyle / trustMilestones / metaphorDomain`，缺失只打 `quick_create_p4_missing_fields` 日志不阻断。 |
| 2026-05-28 | ✅ verified | `pnpm exec prettier --check ...` 通过；`pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过，剩余 8 个 warning 均为既有文件；本地 dev server `http://localhost:3000` 启动后，浏览器验证 `/zh/create/quick` 桌面与 390px 移动宽度页面可加载、步骤可切换。真实生成/发布依赖登录和 AI provider，未在未登录状态强跑。 |
| 2026-05-29 | ✅ fixed | 根据反馈修复快创体验：英文环境模板选项、性格、关系、记忆 chip 不再混入中文；每一步加入自定义输入（自定义场景、性格、用户身份、关系起点、开场 hook、记忆、调整要求）；第 4 步和预览页加入生成头像/上传头像入口，生成草稿保存时优先使用用户头像。 |
| 2026-05-29 | ✅ verified | `pnpm exec tsc --noEmit` 通过；`pnpm lint` 通过，剩余 8 个 warning 均为既有文件；浏览器验证 `/en/create/quick` 前 4 步可切换，英文文案无明显中文漏出，自定义输入与头像入口可见。 |
| 2026-05-29 | ✅ fixed | 根据日志定位生成报错为 AI Writer 文本模型请求连续 `socket hang up`（普通 prompt 与 compact prompt 均在约 60 秒被上游断开），不是保存或头像流程。已为 `mode: quick_create` 增加专用短 prompt，并让快创第一轮直接走短 prompt，降低上游超时/断连概率；同时在侧栏显示必填说明：只需选择场景并至少保留 1 个性格，其它均可跳过。 |
| 2026-05-29 | 🔄 in progress | 已补充快创多图方案到计划文档：支持一次上传多张图、连续 AI 生成多张图，`gallery[0]` 作为首图锚点，同时写入 `avatar/cover`，并要求从第二张 AI 图开始把首图 URL 传给 `/api/roleplay/image` 的 `characterAvatar` 走图生图，保证角色一致性。下一步按该方案改造 `roleplay-quick-create-wizard.tsx` 与相关预览/保存逻辑。 |
