import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type LocaleMessages = {
  home?: {
    seo_title?: string;
    seo_subtitle?: string;
    seo_intro_body?: string;
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

assert.ok(en, 'English roleplay.home messages are required');
assert.ok(zh, 'Chinese roleplay.home messages are required');

assert.match(en.seo_title || '', /remember/i);
assert.match(en.seo_subtitle || '', /free AI character chat/i);
assert.match(en.seo_subtitle || '', /anime/i);
assert.match(en.seo_subtitle || '', /roommate|classmate|comfort|fantasy/i);
assert.match(en.seo_subtitle || '', /create your own character/i);
assert.match(en.seo_intro_body || '', /favorite drink|nickname|last scene/i);
assert.match(en.primary_cta || '', /chat/i);
assert.match(en.secondary_cta || '', /create/i);
assert.match(en.pricing_cta || '', /pricing|plans/i);
assert.match(en.pricing_note || '', /before.*(purchase|checkout)/i);
assert.ok(
  en.proof_points?.some((point) => /memory|remember/i.test(point)),
  'English proof points should include memory/remembering'
);

assert.match(zh.seo_title || '', /记住/);
assert.match(zh.seo_subtitle || '', /免费 AI 角色聊天/);
assert.match(zh.seo_subtitle || '', /动漫/);
assert.match(zh.seo_subtitle || '', /室友|同学|治愈|幻想/);
assert.match(zh.seo_intro_body || '', /饮料|昵称|上次场景/);
assert.match(zh.primary_cta || '', /聊天/);
assert.match(zh.secondary_cta || '', /创建/);
assert.match(zh.pricing_cta || '', /价格|套餐/);
assert.match(zh.pricing_note || '', /购买前|付款前|下单前/);
assert.ok(
  zh.proof_points?.some((point) => /记忆|记住/.test(point)),
  'Chinese proof points should include memory/remembering'
);

console.log('Home positioning copy rules OK');
