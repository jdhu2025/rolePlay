# 20 Anime RolePlay Characters Image Requirements

Purpose: plan 20 original anime RolePlay NPC portrait/standee images for MVP launch. Each character needs one primary image-generation prompt. This is a planning document only. Do not write to DB yet.

The batch should feel like polished adult anime companions for overseas RolePlay users. All characters are clearly 20+ adults. Female characters should lean toward a clear, luminous, high-end fashion magazine portrait style. Male characters should lean toward a functional fitness / modern character poster style with restrained, mature strength.

Storage model should keep the generated primary image filename reusable as avatar / cover seed data:

```json
{
  "avatarUrl": "rp-anime-001-elira.png",
  "coverUrl": "rp-anime-001-elira.png",
  "gallery": [
    "rp-anime-001-elira.png"
  ],
  "imageStyleSuffix": "fixed visual identity anchor..."
}
```

Recommended local/R2 object path:

```text
roleplay/characters/{filename}
```

## Age Plan

| ID | Character | Age | Note |
|---|---:|---:|---|
| rp-anime-001 | Elira Frost / 洛伊雪 | 24 | Quiet adult mage |
| rp-anime-002 | Serina Vale / 星乃璃 | 25 | Warm astrology host |
| rp-anime-003 | Liora Lin / 林栀雨 | 23 | Graduate mentor, adult |
| rp-anime-004 | Akane Vey / 绯音 | 26 | Guarded swordswoman |
| rp-anime-005 | Emi-09 / 艾弥09 | 22 | Adult-presenting android |
| rp-anime-006 | Yun Lan / 云澜 | 27 | Traveling apothecary |
| rp-anime-007 | Mira Bell / 米拉贝尔 | 23 | Indie idol and vocal coach |
| rp-anime-008 | Daphne Noir / 黛芙妮 | 26 | Lantern detective |
| rp-anime-009 | Nyra Kade / 奈拉 | 24 | Neon hacker |
| rp-anime-010 | Rin Shiro / 白凛 | 25 | Winter hunter |
| rp-anime-011 | Kieran Voss / 玄祈 | 27 | Rain swordsman |
| rp-anime-012 | Arin Sol / 亚凛 | 24 | Sunny graduate sports coach |
| rp-anime-013 | Noel Hart / 诺艾尔 | 25 | Soft-spoken bassist |
| rp-anime-014 | Kael Orion / 凯尔 | 26 | Mecha test pilot |
| rp-anime-015 | Ren Kisar / 莲 | 25 | Spirit archivist |
| rp-anime-016 | Toma Aster / 冬真 | 23 | Comedic demon-king intern |
| rp-anime-017 | Soren Vale / 索伦 | 28 | Refined sword poet |
| rp-anime-018 | Lucian Reed / 路西安 | 27 | Vampire museum curator |
| rp-anime-019 | Mika Rowan / 米卡 | 22 | Cozy dragon barista |
| rp-anime-020 | Caspian Tide / 卡斯帕 | 26 | Ocean archive singer |

## Common Negative Prompt

Use this for every image unless a generator requires shorter wording:

```text
No copyrighted characters, no content similar to existing intellectual property, no logos, no watermarks, no text, no signatures, no nudity, no low quality, no extra fingers, no distorted hands, no deformed faces, no duplicate characters, no blurred faces, and no cropped heads.
```

Female-specific negative prompt:

```text
avoid nudity, malformed hands/fingers, extra limbs, wrong body proportions, broken face, text, watermark, logo, low resolution; keep the image focused on refined temperament, clothing material, posture, clean lighting, and original character design
```

Male-specific negative prompt:

```text
avoid greasy skin, malformed hands/fingers, extra limbs, wrong body proportions, broken face, text, watermark, logo, low resolution; keep muscle definition healthy, mature, disciplined, and not exaggerated
```

## Gender Style Modules

Apply these modules to `imageStyleSuffix` and to all future avatar / cover / memory prompts. These modules supersede older table wording when there is a conflict.

### Female Characters: Clear High-End Magazine Style

Use for `rp-anime-001` through `rp-anime-010`.

```text
original 20+ adult anime woman, half-body to seven-tenths soft S-curve portrait, clear luminous high-end fashion magazine character visual, clean airy background, soft studio key light, delicate rim light, shallow depth of field, translucent refined color, elegant fitted clothing such as a simple long dress, fitted cloak, wrap dress, knit top with high-waist long skirt, tailored trench coat, modern urban jacket, or flowing robe-dress. Keep clothing tasteful, fully clothed, fitted but not revealing. Emphasize clean facial design, gentle story-rich eyes, natural mature proportions, relaxed hands, refined accessories, fabric texture, posture rhythm, and commercial anime character poster quality.
```

Female tone keywords:

```text
clear, luminous, airy, translucent, refined, quiet, elegant, fresh, high-end magazine, soft studio light, delicate rim light, clean premium background
```

### Male Characters: Functional Fitness Character Poster Style

Use for `rp-anime-011` through `rp-anime-020`.

```text
original 20+ adult anime man, half-body to full-body upright pose, body slightly turned, premium anime male character poster, clean background, cinematic soft key light plus hard rim light, commercial game character key art. The character has a disciplined long-term training build: broad shoulders and strong back, clear chest-to-waist ratio, strong arms, lean trained core, visible but restrained muscle structure, healthy mature athletic proportions. Clothing should use functional fitness, light tactical, modern urban, or premium casual styling: fitted training top, performance tank, compression layer, short technical jacket, tactical cargo pants, utility trousers, fitted knitwear, urban coat, or tailored robe over a training inner layer. Keep the image clean, stylish, mature, and restrained.
```

Male tone keywords:

```text
functional fitness, light tactical, modern urban, premium casual, disciplined, powerful, calm, restrained, broad shoulders, lean core, cinematic rim light, game character poster
```

## Prompt Rules

- All characters are clearly 20+ adults.
- Each character gets one primary generated portrait / standee image.
- The image should work as both profile avatar source and character card source.
- Female framing should be half-body to seven-tenths, with a soft S-curve composition.
- Male framing should be half-body to full-body, with a slightly turned upright poster pose.
- Keep generated files as filename-only values in DB when uploaded through the existing pipeline.
- Avoid famous anime silhouettes, costume structures, weapons, symbols, named attacks, and color combinations that feel too close to an existing IP.
- Female prompts must preserve the clear, luminous, airy, high-end magazine look.
- Male prompts must preserve the functional fitness / character poster look without oily skin, exaggerated bodybuilding, or explicit framing.

## Current `imageStyleSuffix` Direction

The source of truth is `shipany-template-dev/src/data/roleplay-anime-characters.ts`.

- Female suffixes: 10/10 include `20+ adult anime woman`, clear/luminous/airy/translucent magazine language, tasteful full clothing, soft studio light, and female technical negatives.
- Male suffixes: 10/10 include `20+ adult anime man`, half-body to full-body poster framing, functional fitness or modern/tactical clothing, trained shoulder/back/core cues, cinematic rim light, and male technical negatives.

## 20 Character Primary Photo Prompts

Each row below is the final prompt for generating one primary character photo / standee. The first 10 prompts are female clear high-end magazine style; the last 10 prompts are male functional fitness character poster style.

| ID | Character | Filename | Primary Image Generation Prompt |
|---|---|---|---|
| rp-anime-001 | Elira Frost / 洛伊雪 | `rp-anime-001-elira.png` | 生成一张原创二次元 24 岁成年女性角色立绘，半身到七分 S 形身构图，高级时尚杂志人像风格，干净高级背景，柔和棚拍主光、细腻边缘光、浅景深，色彩清透但不甜腻。角色是银白长发、冰蓝眼眸的图书馆魔法师，气质清新、优雅、温柔安静，眼神柔和且有故事感，神情克制从容。体态健康协调、圆润匀称，肩颈舒展，腰线自然收束，站姿呈自然柔和 S 型动态。服装为合身深海军蓝斗篷叠穿简约长裙，面料细腻，剪裁高级但不过度暴露，配珍珠书签饰物与发丝高光，身旁有漂浮书页和微弱月光魔法。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、未成年感、现有 IP 服装。 |
| rp-anime-002 | Serina Vale / 星乃璃 | `rp-anime-002-serina.png` | 生成一张原创二次元 25 岁成年女性角色立绘，半身到七分 S 形身构图，高级时尚杂志人像风格，干净优雅背景，柔和棚拍光影、细腻边缘光、浅景深，整体清透精致。角色是深靛长发、紫色眼眸的占星茶室主人，气质温柔、清新、从容，眼神柔和且有故事感。身形健康丰腴但不夸张，肩颈线条舒展，腰线自然，站姿放松优雅。服装为紫金色合身裹身长裙搭配轻薄披肩，细腻布料与星形刺绣表现剪裁质感，配金色星针、细项链和黄铜星盘，背景有屋顶茶室与柔焦城市灯。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、未成年感、现有 IP 设计。 |
| rp-anime-003 | Liora Lin / 林栀雨 | `rp-anime-003-liora.png` | 生成一张原创二次元 23 岁成年女性角色立绘，半身到七分 S 形身构图，高级清透杂志人像风格，干净雨灰色背景，柔和棚拍主光、细腻边缘光、浅景深。角色是栗色短发、柔和棕色眼眸的研究生校园导师，气质清新、温柔安静、细致可靠，五官自然精致，神情克制从容。体态健康协调、圆润匀称，肩颈舒展，腰线自然收束，手部动作自然。服装为柔绿色针织上衣搭配高腰长裙和简约托特包，面料细腻、版型贴合但得体，手持透明雨伞，背景是雨后校园与暖色图书馆灯光。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、未成年感、高中校服感。 |
| rp-anime-004 | Akane Vey / 绯音 | `rp-anime-004-akane.png` | 生成一张原创二次元 26 岁成年女性角色立绘，半身到七分 S 形身构图，高级时尚杂志与动作角色设定图结合，干净微雨背景，柔和主光、细腻硬朗边缘光、浅景深，商业视觉质感。角色是黑发红绳束发、深红眼眸的护卫剑士，气质沉稳、优雅、克制，眼神坚定但柔和有故事感。身形健康协调、成熟圆润但不夸张，肩颈舒展，腰线自然，身体微侧形成柔和 S 型动态。服装为剪裁利落的黑色长外套叠穿合身实用内搭，布料质感细腻，配红绳饰物与原创细剑，整体全覆盖且不暴露。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有 IP 武器或制服。 |
| rp-anime-005 | Emi-09 / 艾弥09 | `rp-anime-005-emi.png` | 生成一张原创二次元 22 岁成年女性外观安卓角色立绘，半身到七分 S 形身构图，高级科幻时尚杂志人像风格，干净柔和霓虹背景，柔和棚拍主光、金色边缘光、浅景深，色彩清透。角色是柔蓝短发、蓝金色温柔眼眸的情感学习型安卓，气质清新、安静、真诚，神情克制从容。体态为健康协调的成熟女性比例，肩颈舒展，腰线自然收束，站姿放松优雅。服装为现代都市机能外套叠穿细腻针织连衣裙，合身但不过度暴露，配金属发夹、腕部透明数据屏和温暖金色电路微光。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、幼态比例、现有 IP 机器人设计。 |
| rp-anime-006 | Yun Lan / 云澜 | `rp-anime-006-yunlan.png` | 生成一张原创二次元 27 岁成年女性角色立绘，半身到七分 S 形身构图，高级清透国风杂志人像风格，干净淡青瓷背景，柔和棚拍主光、细腻边缘光、浅景深。角色是长黑发、深色温柔眼眸的旅行药师，气质优雅、温柔安静、从容智慧，五官精致自然。身形健康协调、丰腴但不夸张，肩颈线条柔和，腰线自然收束，身体轮廓流畅。服装为青瓷色合身剪裁袍裙，叠穿浅色内衬，面料细腻、飘逸但端庄，配玉簪、瓷杯、草药小包，背景有雾河药庐的柔焦轮廓。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、刻板异域化、现有 IP 相似。 |
| rp-anime-007 | Mira Bell / 米拉贝尔 | `rp-anime-007-mira.png` | 生成一张原创二次元 23 岁成年女性角色立绘，半身到七分 S 形身构图，清透高级音乐杂志人像风格，干净柔金背景，柔和棚拍光影、细腻边缘光、浅景深。角色是桃粉发带、暖棕眼眸的独立偶像与声乐教练，气质清新、明亮、温柔，从容里带一点练习后的真实疲惫。体态健康协调、圆润匀称，肩颈舒展，腰线自然，站姿放松形成柔和 S 型动态。服装为短款外套叠穿合身但得体的演出连衣裙，面料有细腻光泽，配简约耳饰、手持麦克风、指尖小绷带，背景是柔焦练习室镜灯。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、未成年偶像校服感。 |
| rp-anime-008 | Daphne Noir / 黛芙妮 | `rp-anime-008-daphne.png` | 生成一张原创二次元 26 岁成年女性角色立绘，半身到七分 S 形身构图，高级黑色电影杂志人像风格，干净烟雾琥珀背景，柔和主光、灯笼边缘光、浅景深，商业视觉质感。角色是黑色短发、琥珀眼眸的超自然侦探，气质优雅、冷静、温柔克制，眼神柔和但有故事感。身形健康协调、成熟圆润但不夸张，肩颈舒展，腰线自然收束。服装为剪裁高级的风衣叠穿简约长裙或合身内搭，面料细腻，配细项链、案件笔记本和黄铜灯笼，整体端庄不暴露。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、恐怖血腥、现有侦探 IP 设计。 |
| rp-anime-009 | Nyra Kade / 奈拉 | `rp-anime-009-nyra.png` | 生成一张原创二次元 24 岁成年女性角色立绘，半身到七分 S 形身构图，清透高级赛博街头杂志人像风格，干净青蓝洋红背景，柔和棚拍主光、霓虹边缘光、浅景深。角色是短黑发带青色挑染、AR 眼镜与狐耳耳机的网络安全修复者，气质清新、机敏、优雅克制，眼神柔和但带故事感。体态健康协调、圆润匀称，肩颈舒展，腰线自然，站姿呈自然 S 型动态。服装为现代都市风短外套搭配高腰长裙或利落长裤，高性能面料细腻，版型贴合但不过度暴露，配小型科技挂饰。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有赛博 IP 相似。 |
| rp-anime-010 | Rin Shiro / 白凛 | `rp-anime-010-rin.png` | 生成一张原创二次元 25 岁成年女性角色立绘，半身到七分 S 形身构图，高级冬季时尚杂志角色海报风格，干净雪白与灰蓝背景，柔和棚拍主光、冷色细腻边缘光、浅景深。角色是白发、浅灰眼眸、羽毛耳饰的冬境猎手，气质清冷、优雅、温柔安静，眼神坚定但有故事感。体态健康协调、成熟圆润但不夸张，肩颈舒展，腰线自然收束，身体轮廓流畅。服装为合身羊毛外套叠穿实用长裙层次与皮草边披风，面料细腻，配羽毛饰物与原创短弓，整体端庄克制。负面约束：避免裸露、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有猎人设计相似。 |
| rp-anime-011 | Kieran Voss / 玄祈 | `rp-anime-011-kieran.png` | 生成一张原创二次元 27 岁成年男性角色立绘，半身到全身构图，高级机能健身角色海报风格，干净雨夜背景，电影级柔和主光与硬朗边缘光，商业游戏角色视觉质感。角色是黑发、左耳细疤、佩旧红绳长剑的雨夜剑士，气质自信、沉稳、有力量感，五官清晰立体，眼神坚定冷静。体型经过长期训练，肩背宽阔，胸肩比例优秀，手臂放松但有力量，核心线条清晰不过度夸张，整体精悍结实、比例协调。服装为轻战术短夹克叠穿合身训练上衣、工装长裤与功能腰带，剪裁利落，突出轮廓和材质。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有 IP 相似。 |
| rp-anime-012 | Arin Sol / 亚凛 | `rp-anime-012-arin.png` | 生成一张原创二次元 24 岁成年男性角色立绘，半身到全身构图，高级健身时尚杂志与角色海报风格，干净夕阳体育馆背景，柔和主光与硬朗边缘光结合。角色是棕金短发、琥珀眼眸的研究生运动教练，气质自信、阳光、沉稳有力量，神情克制温暖。体型明显长期健身训练，肩背宽阔，胸肩比例优秀，手臂结实，核心力量感强，腹部肌肉线条清晰但不夸张。服装为合身训练背心搭配敞开的运动外套、高性能慢跑裤与肩上毛巾，剪裁干净时尚，突出肩背、手臂和腰腹训练痕迹。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、高中校服感。 |
| rp-anime-013 | Noel Hart / 诺艾尔 | `rp-anime-013-noel.png` | 生成一张原创二次元 25 岁成年男性角色立绘，半身到全身构图，高级都市健身角色海报风格，干净录音棚背景，电影级柔和主光与琥珀硬朗边缘光。角色是银棕发、黑色耳饰的贝斯手，气质沉稳、冷静、自律，五官清晰立体，眼神坚定而安静。体型经过长期训练，肩背宽阔，胸肩比例好，前臂有力量，核心线条清晰但克制，整体身材精悍结实。服装为合身黑色针织上衣搭配短款都市夹克、剪裁利落的深色长裤与贝斯背带，高级休闲风但保留机能质感，突出服装材质和人物轮廓。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有乐队 IP 相似。 |
| rp-anime-014 | Kael Orion / 凯尔 | `rp-anime-014-kael.png` | 生成一张原创二次元 26 岁成年男性角色立绘，半身到全身构图，高级机能健身游戏角色海报风格，干净日出机库背景，电影级柔和主光与硬朗边缘光，可有轻微工业烟雾。角色是深金发、灰蓝眼眸的机甲测试驾驶员，气质自信、勇敢、沉稳有力量，神情克制冷静。体型长期训练，肩背宽阔，胸肩比例优秀，手臂结实，核心力量感强，腹部线条清晰但不过度夸张。服装为短款飞行夹克叠穿合身压缩训练上衣、战术工装裤、飞行手套，旁边有原创头盔和模糊机甲轮廓。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有机甲 IP 相似。 |
| rp-anime-015 | Ren Kisar / 莲 | `rp-anime-015-ren.png` | 生成一张原创二次元 25 岁成年男性角色立绘，半身到全身构图，高级角色海报与机能休闲风结合，干净幽蓝档案馆背景，电影级柔和主光与冷色边缘光。角色是蓝黑发、淡蓝眼眸的灵体档案员，气质沉稳、温柔、有内在力量，五官清晰立体，眼神坚定但忧郁克制。体型长期自律训练，肩背宽阔，手臂线条清晰，核心力量感明确但不过度夸张，比例协调精悍。服装为长款针织外套叠穿黑色高性能贴身内搭、修身长裤，袖口有半透明灵光细节，整体干净成熟。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、恐怖血腥。 |
| rp-anime-016 | Toma Aster / 冬真 | `rp-anime-016-toma.png` | 生成一张原创二次元 23 岁成年男性角色立绘，半身到全身构图，高级幻想机能健身角色海报风格，干净魔法宿舍背景，柔和主光与清晰硬朗边缘光。角色是凌乱紫发、无害红色魔眼微光的小型恶魔王实习生，气质自信、戏剧化、沉稳中带温暖，五官立体，眼神坚定克制。体型长期训练，肩背宽阔，手臂结实，核心线条清晰但不过度夸张，身材精悍协调。服装为合身无袖训练上衣搭配短款幻想夹克、锥形机能长裤和小披风，剪裁利落，表现肌肉结构与角色气场但保持干净时尚。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、幼态化。 |
| rp-anime-017 | Soren Vale / 索伦 | `rp-anime-017-soren.png` | 生成一张原创二次元 28 岁成年男性角色立绘，半身到全身构图，高级国风机能角色海报风格，干净雾河茶室背景，电影级柔和主光与硬朗边缘光。角色是半束长黑发、沉静眼眸的剑诗人与茶室主人，气质自信、沉稳、有力量感，五官清晰立体，眼神坚定克制。体型长期训练，肩背宽阔，胸肩比例优秀，核心力量感强，身体精悍结实但不过度夸张。服装为现代剪裁墨蓝袍装叠穿合身训练内层，结构腰封与流动布料结合，高级休闲与轻战术质感，配竹扇和入鞘长剑，姿态自然挺拔。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有武侠或动漫 IP 相似。 |
| rp-anime-018 | Lucian Reed / 路西安 | `rp-anime-018-lucian.png` | 生成一张原创二次元 27 岁成年男性角色立绘，半身到全身构图，高级暗色时尚健身角色海报风格，干净月光博物馆背景，电影级柔和主光与暗红硬朗边缘光。角色是黑发、暗红眼眸的吸血鬼夜间博物馆馆长，气质优雅、自信、沉稳有力量，神情克制冷静。体型长期自律训练，肩背宽阔，胸肩比例好，核心线条清晰但不夸张，成熟男性魅力克制。服装为短款剪裁大衣叠穿合身高领训练上衣、修身正式长裤、白手套和怀表，现代都市高级休闲与哥特感结合。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、血腥、掠夺感。 |
| rp-anime-019 | Mika Rowan / 米卡 | `rp-anime-019-mika.png` | 生成一张原创二次元 22 岁成年男性角色立绘，半身到全身构图，高级生活方式健身角色海报风格，干净温暖咖啡馆背景，柔和主光与琥珀硬朗边缘光。角色是柔棕发、小龙角、绿棕眼眸的幻想咖啡师，气质自信、温暖、沉稳有力量，神情克制但亲和。体型长期训练，肩背宽阔，手臂结实，腰腹线条清晰不过度夸张，整体健康自律。服装为合身 T 恤搭配短款工作夹克、绿色围裙、机能长裤，袖口自然卷起，表现手臂和肩背训练痕迹，旁边有温暖马克杯和无害小火花。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、幼态可爱化。 |
| rp-anime-020 | Caspian Tide / 卡斯帕 | `rp-anime-020-caspian.png` | 生成一张原创二次元 26 岁成年男性角色立绘，半身到全身构图，高级海洋机能角色海报风格，干净水蓝观测台背景，电影级柔和主光与冷色硬朗边缘光。角色是海蓝发、珍珠耳饰、潮汐歌者与海洋档案歌手，气质自信、沉稳、安静有力量，五官清晰立体，眼神坚定而温柔。体型长期训练，肩背宽阔，手臂线条清晰，核心力量感强，腹部肌肉线条清晰但不过度夸张，比例协调。服装为合身无袖高性能上衣搭配轻薄都市外套、技术长裤和潮汐图纹手套，突出轮廓、材质和姿态张力。负面约束：避免油腻皮肤、手指畸形、多余肢体、身体比例错误、脸部崩坏、文字、水印、logo、低清晰度、现有海洋幻想 IP 相似。 |

## Gallery Mapping Checklist

For each character:

```text
avatarUrl = primary filename
coverUrl = primary filename
gallery = [primary filename]
metadata.assetStatus = pending | generated | reviewed | uploaded
```

## Review Checklist Before Upload

- Character reads as clearly 20+ adult.
- No recognizable copyrighted character silhouette, outfit, weapon, symbol, color composition, or magic effect.
- No text, watermark, logo, or UI artifacts.
- Hands, face, body proportions, and pose are acceptable at card size.
- Avatar works as a small circular crop.
- Cover works in a 3:4 card crop.
- Female images preserve the clear, refined, high-end fashion magazine look.
- Male images preserve the functional fitness / character poster look.
- Outfit and pose are attractive but not explicit, oily, exaggerated, or minor-coded.
