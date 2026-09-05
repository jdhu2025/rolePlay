import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type LocaleMessages = {
  home?: {
    seo_title?: string;
    seo_subtitle?: string;
    seo_intro_title?: string;
    seo_intro_body?: string;
    seo_faqs?: Array<{
      question: string;
      answer: string;
    }>;
    primary_cta?: string;
    secondary_cta?: string;
    pricing_cta?: string;
    pricing_note?: string;
    proof_points?: string[];
  };
};

function readRoleplayMessages(locale: 'en' | 'zh') {
  const file = join(
    process.cwd(),
    'src/config/locale/messages',
    locale,
    'roleplay.json'
  );
  return JSON.parse(readFileSync(file, 'utf8')) as LocaleMessages;
}

const en = readRoleplayMessages('en').home;
const zh = readRoleplayMessages('zh').home;
const landingSource = readFileSync(
  join(process.cwd(), 'src/shared/components/roleplay/roleplay-landing.tsx'),
  'utf8'
);

assert.ok(en, 'English roleplay.home messages are required');
assert.ok(zh, 'Chinese roleplay.home messages are required');

assert.match(en.seo_title || '', /Free AI character chat/i);
assert.match(en.seo_title || '', /sign up/i);
assert.match(en.seo_subtitle || '', /original characters/i);
assert.match(en.seo_subtitle || '', /memory/i);
assert.match(en.seo_subtitle || '', /templates|image upload/i);
assert.match(en.seo_intro_title || '', /scene|prompt/i);
assert.match(en.seo_intro_body || '', /favorite drink|nickname|last scene/i);
assert.match(en.seo_intro_body || '', /templates|image upload/i);
assert.match(en.primary_cta || '', /Try free chat/i);
assert.match(en.secondary_cta || '', /create/i);
assert.match(en.pricing_cta || '', /pricing|plans/i);
assert.match(en.pricing_note || '', /before.*(purchase|checkout)/i);
assert.ok(
  en.proof_points?.some((point) => /signing up|free/i.test(point)),
  'English proof points should include the free entry path'
);

assert.match(zh.seo_title || '', /免费/);
assert.match(zh.seo_title || '', /无需注册/);
assert.match(zh.seo_subtitle || '', /原创角色/);
assert.match(zh.seo_subtitle || '', /记忆/);
assert.match(zh.seo_subtitle || '', /模板|上传图片/);
assert.match(zh.seo_intro_body || '', /饮料|昵称|上次场景/);
assert.match(zh.seo_intro_body || '', /模板|上传图片/);
assert.match(zh.primary_cta || '', /先免费试聊/);
assert.match(zh.secondary_cta || '', /创建/);
assert.match(zh.pricing_cta || '', /价格|套餐/);
assert.match(zh.pricing_note || '', /购买前|付款前|下单前/);
assert.ok(
  zh.proof_points?.some((point) => /免费|注册/.test(point)),
  'Chinese proof points should include the free entry path'
);

[
  '/ai-character-chat-with-memory',
  '/create-ai-character-with-memory',
  '/ai-character-collections',
  '/free-ai-character-chat',
  '/anime-ai-roleplay-characters',
  '/comfort-ai-companion',
  '/talkie-ai-alternative',
].forEach((href) => {
  assert.match(
    landingSource,
    new RegExp(href.replaceAll('/', '\\/')),
    `Homepage should keep the SEO guide rail link to ${href}`
  );
});

assert.match(landingSource, /AI character chat with memory/);
assert.match(landingSource, /Create AI character with memory/);

console.log('Home positioning copy rules OK');
