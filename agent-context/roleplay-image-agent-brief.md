# RolePlay 角色图片生成 — 给图片生成 Agent 的交接说明

本文件给负责"生成角色图片"的另一个 agent 阅读。目标：把 12 个角色每人补到 3-5 张图，并把成品按规定命名、放到规定目录。

## 1. 当前已有的素材

每个角色已经有 1 张成品作为"主图"，位置：

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/public/roleplay/characters/
  chloe-1.jpeg
  sienna-1.jpeg
  amara-1.jpeg
  valeria-1.jpeg
  leila-1.jpeg
  priya-1.jpeg
  elena-1.jpeg
  maya-1.jpeg
  freya-1.jpeg
  zuri-1.jpeg
  camila-1.jpeg
  noor-1.jpeg
```

主图就是"identity anchor"。后面所有新图都必须保持同一张脸、同一肤色、同一发色发质、同一年龄段（18-25），不能换人。

每个角色还有更早的参考底图（A 图）和 face-clean crop（用于触发安全审查时的备用 reference），位置：

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/output/imagegen/roleplay-identity-pilot/
```

文件名前缀和角色对应关系：

| ID     | Name    | 主图 (B*)                              | 参考底图 (A*)                |
| ------ | ------- | -------------------------------------- | --------------------------- |
| rp-001 | Chloe   | B1Chloe-night-date.jpeg                | ` A1Chloe.png` (前导空格)    |
| rp-002 | Sienna  | B2Sienna-styling-suite.jpeg            | A2Sienna.png                 |
| rp-003 | Amara   | B3Amara-beach-club-brunch.jpeg         | A3Amara-reference-face-clean.png (用 clean crop) |
| rp-004 | Valeria | B4Valeria-pool-club.jpeg               | A4Valeria.png                |
| rp-005 | Leila   | B5Leila-sunset-lounge.jpeg             | A5Leila.png                  |
| rp-006 | Priya   | B6Priya-rooftop-dinner.jpeg            | ` A6Priya.png` (前导空格)    |
| rp-007 | Elena   | B7Elena-old-town-walk.jpeg             | A7Elena.png                  |
| rp-008 | Maya    | B8Maya-creative-studio.jpeg            | A8Maya.png                   |
| rp-009 | Freya   | B9Freya-cocktail-lounge-v2.jpeg        | A9Freya-reference-face-clean.png (v2, 用 clean crop) |
| rp-010 | Zuri    | B10Zuri-poolside-afterparty-v2.jpeg    | A10Zuri-reference-face-clean.png (v2, 用 clean crop) |
| rp-011 | Camila  | B11Camila-coastal-sunset-v2.jpeg       | A11Camila-reference-face-clean.png (v2, 用 clean crop) |
| rp-012 | Noor    | B12Noor-hotel-lobby.jpeg               | A12Noor-reference-face-clean.png (用 clean crop, 原图含 UI 文字) |

不要使用以下旧版本（除非用户明确要求）：

```text
B9Freya-winter-lounge.jpeg
B10Zuri-night-gallery.jpeg
B11Camila-tennis-club.jpeg
```

## 2. 任务

每个角色再补 2-4 张图，使每人最终有 3-5 张。已经存在的 `*-1.jpeg` 算第 1 张，新图从 `-2` 起编号。

### 场景搭配建议（每个角色挑 2-4 个不同场景，避免重复）

- 海滩 / 度假
- 日常约会 / 咖啡馆
- 夜生活 / 高端场所
- 职场 / 生活方式（工作室、办公室、艺术馆等）
- 自然光自拍 / 居家放松

整套 12 个人不要全都是泳池 + 海滩，要有差异。

### 硬性要求

- 保持同一张脸：脸型、肤色、年龄区间（18-25）、发色发质、招牌特征（Camila 的雀斑和红卷发、Zuri 的短卷发、Freya 的浅金直发等）必须保留。
- 改变服装、姿态、场景、灯光、构图。
- 不要露骨内容；不要泳衣特写；优先 dating-profile / lifestyle editorial 风格。
- 不要嵌入文字、水印、UI 元素。
- 不要让 12 个角色看起来都像中国人或都像同一类人 —— 保留各自的种族特征。

## 3. 怎么生成

项目里已有可复用脚本：

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/scripts/generate-roleplay-identity-pilot.mjs
```

它做的事：上传 reference 到 R2 → 调 Doubao image-to-image → 落地保存。

环境变量已经配好在：

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/.env.development
```

包含 `VOLCENGINE_API_KEY`、`VOLCENGINE_BASE_URL`、`VOLCENGINE_GENERAL_IMAGE_MODEL=doubao-seedream-5-0-260128`、`R2_*`。

运行示例（在 `shipany-template-dev/` 目录）：

```bash
node --env-file=.env.development scripts/generate-roleplay-identity-pilot.mjs B9 B10 B11
```

注意：

- 脚本目前用的 prompt 是固定 12 个，要补新场景需要在脚本里加新的 character record（id 用 `B1-cafe-morning`、`B3-selfie-natural-light` 这种形式区分，或者直接在脚本里多加 entry）。也可以另写一个变种脚本，但请保持 R2 上传 + Doubao 调用 + 本地保存的同一套流程。
- 必须有外网（R2 + Doubao）。沙箱 / 离线环境里会 `fetch failed`。
- Amara、Freya、Zuri、Camila、Noor 触发审查或 UI 干扰时，**用 face-clean crop** 作为 reference，不要用原 A 图。
- Freya / Zuri / Camila **必须用 v2 版本**作为身份锚点，不要回到旧版。

## 4. 成品落地位置 — 重要

最终用于产品的图必须落到：

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/public/roleplay/characters/
```

文件名规则：`{name}-{n}.jpeg`，全小写，扩展名固定 `.jpeg`，不要有空格、不要有大写、不要有中文：

```text
chloe-2.jpeg, chloe-3.jpeg, chloe-4.jpeg
sienna-2.jpeg, sienna-3.jpeg
...
noor-2.jpeg, noor-3.jpeg, noor-4.jpeg, noor-5.jpeg
```

`-1.jpeg` 已经占用，从 `-2` 开始编号。如果某个角色场景特别多，最多到 `-5.jpeg`。

**不要改 `-1.jpeg`**，那是已经入库的主图。

`scripts/generate-roleplay-identity-pilot.mjs` 默认把生成结果写到 `output/imagegen/roleplay-identity-pilot/`（不是最终位置）。生成完成后请把成品 **复制并重命名** 到 `public/roleplay/characters/`。`output/imagegen/...` 只是暂存。

## 5. 数据契约（图片名 ↔ 角色 ID）

后端表 `roleplay_character` 里 `images` 字段只存**文件名**（如 `["chloe-1.jpeg", "chloe-2.jpeg"]`），不存绝对 URL。最终 URL 在 API 层用 `src/shared/lib/roleplay-assets.ts` 的 `buildCharacterImageUrl()` 拼接（`R2_DOMAIN + R2_UPLOAD_PATH + roleplay/characters/ + filename`）。

所以你只需要保证：

- 文件名严格遵守 `{name}-{n}.jpeg` 小写规则。
- 文件最终落到 `public/roleplay/characters/` 这个目录。

后续 R2 上传脚本会从这个目录把它们 PUT 到 R2 的 `R2_UPLOAD_PATH/roleplay/characters/{filename}`。两边文件名保持一致即可，DB 不需要任何改动。

## 6. 完成标准

- 12 个角色每人 3-5 张。
- 主图 `*-1.jpeg` 不动。
- 新增图都在 `public/roleplay/characters/`，命名合规。
- Freya / Zuri / Camila 仍然用 v2 身份。
- 没有露骨、没有水印、没有文字。
- 12 个人之间脸不混淆，种族特征保留。

完成后把每人最终的图片清单整理一下（例如 `chloe: [chloe-1, chloe-2, chloe-3]`），交回给主 agent，主 agent 会更新 `src/data/roleplay-characters.ts` 里的 `images` 数组并跑 seed 脚本。
