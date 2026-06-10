import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type LocaleMessages = {
  home?: {
    seo_title?: string;
    seo_subtitle?: string;
    primary_cta?: string;
    secondary_cta?: string;
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
assert.match(en.seo_subtitle || '', /crush|anime|story/i);
assert.match(en.seo_subtitle || '', /continue|keeps?/i);
assert.match(en.primary_cta || '', /chat/i);
assert.match(en.secondary_cta || '', /create/i);
assert.ok(
  en.proof_points?.some((point) => /memory|remember/i.test(point)),
  'English proof points should include memory/remembering'
);

assert.match(zh.seo_title || '', /记住/);
assert.match(zh.seo_subtitle || '', /心动|动漫|故事/);
assert.match(zh.seo_subtitle || '', /接上|继续|聊下去/);
assert.match(zh.primary_cta || '', /聊天/);
assert.match(zh.secondary_cta || '', /创建/);
assert.ok(
  zh.proof_points?.some((point) => /记忆|记住/.test(point)),
  'Chinese proof points should include memory/remembering'
);

console.log('Home positioning copy rules OK');
