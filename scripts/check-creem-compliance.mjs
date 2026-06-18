import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const highRiskPaths = [
  '/crush-ai-chat',
  '/comfort-ai-companion',
  '/ai-companion-that-remembers-you',
  '/ai-roleplay-secret-memory',
  '/ai-roleplay-shared-memory',
  '/character-ai-alternative-with-memory',
  '/anime-character-ai-chat',
  '/talkie-ai-alternative',
  '/anime-ai-roleplay-characters',
];

const publicCopyFiles = [
  'src/config/locale/messages/en/common.json',
  'src/config/locale/messages/en/landing.json',
  'src/config/locale/messages/en/pages/pricing.json',
  'src/config/locale/messages/en/roleplay.json',
  'src/config/locale/messages/zh/common.json',
  'src/config/locale/messages/zh/landing.json',
  'src/config/locale/messages/zh/pages/pricing.json',
  'src/config/locale/messages/zh/roleplay.json',
];

const publicBrandFiles = [
  '.env.example',
  'src/config/index.ts',
  'src/config/locale/messages/en/common.json',
  'src/config/locale/messages/en/landing.json',
  'src/config/locale/messages/en/pages/pricing.json',
  'src/config/locale/messages/en/roleplay.json',
  'src/config/locale/messages/zh/common.json',
  'src/config/locale/messages/zh/landing.json',
  'src/config/locale/messages/zh/pages/pricing.json',
  'src/config/locale/messages/zh/roleplay.json',
  'src/shared/services/settings.ts',
];

const publicPolicyFiles = [
  'content/pages/acceptable-use-policy.mdx',
  'content/pages/acceptable-use-policy.zh.mdx',
  'content/pages/privacy-policy.mdx',
  'content/pages/privacy-policy.zh.mdx',
  'content/pages/terms-of-service.mdx',
  'content/pages/terms-of-service.zh.mdx',
  'content/pages/safety.mdx',
  'content/pages/safety.zh.mdx',
];

const reviewEvidenceFiles = [
  'agent-context/creem-dashboard-review-checklist.md',
];

const sourceFiles = [
  'src/app/sitemap.ts',
  'src/shared/lib/compliance.ts',
  'src/shared/lib/payment-product-name.ts',
  'src/shared/lib/roleplay-review-safe-characters.ts',
  'src/shared/components/roleplay/roleplay-quick-create-wizard.tsx',
  'src/shared/components/roleplay/roleplay-landing.tsx',
  'src/shared/components/roleplay/roleplay-topbar.tsx',
  'src/shared/components/roleplay/roleplay-nav-drawer.tsx',
  'src/shared/components/roleplay/roleplay-character-card.tsx',
  'src/shared/components/roleplay/roleplay-character-detail.tsx',
  'src/shared/lib/roleplay-client.ts',
  'src/shared/lib/server/roleplay-home-data.ts',
  'src/app/api/roleplay/characters/route.ts',
  'src/app/api/roleplay/characters/[id]/route.ts',
  'src/app/api/roleplay/recommendations/route.ts',
  'src/app/api/roleplay/tts/voice-profiles/route.ts',
  'src/app/api/roleplay/image/route.ts',
  'src/app/api/ai/generate/route.ts',
  'src/app/[locale]/(landing)/settings/payments/page.tsx',
];

const envExample = read('.env.example');
assert.match(
  envExample,
  /^NEXT_PUBLIC_APP_NAME=Keepsay$/m,
  '.env.example must use Keepsay as the public app name'
);
for (const [key, value] of [
  ['PUBLIC_COMPLIANCE_MODE', 'true'],
  ['SHOW_HIGH_RISK_SEO_PAGES', 'false'],
  ['BLOCK_HIGH_RISK_SEO_PAGES', 'true'],
  ['SHOW_ROMANCE_TEMPLATES', 'false'],
  ['SHOW_COMPANION_COPY', 'false'],
  ['SHOW_SENSITIVE_VOICE_STYLES', 'false'],
  ['SHOW_PUBLIC_GALLERY', 'false'],
  ['SHOW_CUSTOM_IMAGE_PROMPTS', 'false'],
  ['REQUIRE_CREEM_MODERATION', 'true'],
  ['CREEM_MODERATION_FAIL_CLOSED', 'true'],
]) {
  assert.match(
    envExample,
    new RegExp(`^${key}=${value}$`, 'm'),
    `.env.example must document ${key}=${value}`
  );
}

const riskyTerms = [
  /\bTalkie\b/i,
  /\bRolePlay\b/i,
  /\bNSFW\b/i,
  /\buncensored\b/i,
  /\bunfiltered\b/i,
  /\bgirlfriend\b/i,
  /\bboyfriend\b/i,
  /\bflirty\b/i,
  /\bintimacy\b/i,
  /\bdating\b/i,
  /\bAI companion\b/i,
  /\bcrush\b/i,
  /\bromance\b/i,
  /心动/,
  /暧昧/,
  /约会/,
  /伴侣/,
  /女友/,
  /男友/,
  /成人陪伴/,
];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function flattenStrings(value, path = []) {
  const rows = [];
  if (typeof value === 'string') {
    rows.push({ path: path.join('.'), value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      rows.push(...flattenStrings(item, [...path, String(index)]));
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      rows.push(...flattenStrings(item, [...path, key]));
    });
  }
  return rows;
}

function isAllowedString(path, value) {
  if (path.endsWith('.href')) return true;
  if (path.endsWith('.product_id')) return true;
  if (path.includes('acceptable_use')) return true;
  if (value.includes('/')) return true;
  return false;
}

const sitemapSource = read('src/app/sitemap.ts');
assert.match(
  sitemapSource,
  /canShowHighRiskSeoPages/,
  'sitemap must use compliance visibility'
);
assert.match(
  sitemapSource,
  /isHighRiskSeoPath/,
  'sitemap must filter high-risk paths'
);

const complianceSource = read('src/shared/lib/compliance.ts');
assert.match(
  complianceSource,
  /public_compliance_mode', true/,
  'compliance mode must default to review-safe enabled'
);
assert.match(
  complianceSource,
  /block_high_risk_seo_pages/,
  'compliance helper must support strict high-risk SEO route blocking'
);
for (const highRiskPath of highRiskPaths) {
  assert.match(
    complianceSource,
    new RegExp(highRiskPath.replaceAll('/', '\\/')),
    `compliance helper must list ${highRiskPath}`
  );
}

const proxySource = read('src/proxy.ts');
assert.match(
  proxySource,
  /shouldBlockHighRiskSeoPages/,
  'proxy must enforce strict high-risk SEO route blocking'
);
assert.match(
  proxySource,
  /isHighRiskSeoPath/,
  'proxy must identify high-risk SEO paths before routing'
);

assert.match(
  read('src/shared/components/roleplay/roleplay-quick-create-wizard.tsx'),
  /canUseCustomImagePrompts/,
  'Quick Create image prompt input must be gated by compliance visibility'
);
assert.doesNotMatch(
  read('src/shared/components/roleplay/roleplay-topbar.tsx'),
  />\s*RolePlay\s*</,
  'topbar must not render the old RolePlay brand'
);
assert.doesNotMatch(
  read('src/shared/components/roleplay/roleplay-nav-drawer.tsx'),
  />\s*RolePlay\s*</,
  'mobile nav drawer must not render the old RolePlay brand'
);
assert.doesNotMatch(
  read('src/shared/components/roleplay/roleplay-landing.tsx'),
  /For companions that can return|Anime roleplay|Original anime companions|crush, or private memory/,
  'home scene rail must use review-safe story/character wording'
);
assert.match(
  read('src/app/[locale]/(landing)/settings/payments/page.tsx'),
  /getReviewSafeProductName/,
  'payments table must normalize legacy RolePlay product names at display time'
);
assert.match(
  read('src/shared/lib/payment-product-name.ts'),
  /RolePlay First Spark[\s\S]*Keepsay First Spark/,
  'payment product name helper must map old RolePlay order names to Keepsay'
);

const reviewSafeCharactersSource = read(
  'src/shared/lib/roleplay-review-safe-characters.ts'
);
assert.match(
  reviewSafeCharactersSource,
  /REVIEW_SAFE_ROLEPLAY_CHARACTERS/,
  'review-safe public character fallback list must exist'
);
assert.match(
  reviewSafeCharactersSource,
  /filterReviewSafeCharacters/,
  'review-safe public character filter must exist'
);
assert.doesNotMatch(
  reviewSafeCharactersSource.match(
    /export const REVIEW_SAFE_ROLEPLAY_CHARACTERS[\s\S]*?;\n\nexport function/
  )?.[0] || '',
  /chloe-\d|sienna-\d|Date|romantic|companion with|AI companion/i,
  'review-safe fallback characters must not expose dating/companion seed framing'
);

for (const file of sourceFiles) {
  assert.doesNotThrow(() => read(file), `${file} must exist`);
}

for (const file of publicPolicyFiles) {
  assert.doesNotThrow(() => read(file), `${file} must exist`);
}

for (const file of reviewEvidenceFiles) {
  assert.doesNotThrow(() => read(file), `${file} must exist`);
}

for (const file of publicBrandFiles) {
  const source = read(file);
  assert.doesNotMatch(
    source,
    /RolePlay starter credits|RolePlay First Spark|RolePlay Spark Credits|RolePlay Glow Credits|RolePlay Lite Monthly|RolePlay Plus Monthly|RolePlay Pro Monthly/,
    `${file} must not expose old RolePlay payment or credit naming`
  );
}

const creditSource = read('src/shared/models/credit.ts');
assert.match(
  creditSource,
  /Keepsay starter credits/,
  'starter credit defaults must use Keepsay branding'
);
assert.match(
  creditSource,
  /RolePlay starter credits/,
  'starter credit duplicate detection must keep the legacy RolePlay description for existing grants'
);

assert.match(
  read('src/config/index.ts'),
  /support@keepsay\.dpdns\.org/,
  'default support email must use Keepsay branding'
);
assert.match(
  read('src/shared/services/settings.ts'),
  /'support_email'/,
  'support_email must be available as a public setting'
);
for (const file of ['src/config/locale/messages/en/landing.json', 'src/config/locale/messages/zh/landing.json']) {
  assert.match(
    read(file),
    /mailto:support@keepsay\.dpdns\.org/,
    `${file} must expose branded support mailto links`
  );
}

for (const file of ['src/config/locale/messages/en/landing.json', 'src/config/locale/messages/zh/landing.json']) {
  assert.match(read(file), /"url": "\/safety"/, `${file} must link to /safety`);
}

for (const file of ['content/pages/safety.mdx', 'content/pages/safety.zh.mdx']) {
  const source = read(file);
  assert.match(source, /not a dating service|不是约会服务/, `${file} must state Keepsay is not dating`);
  assert.match(source, /NSFW chatbot|NSFW 聊天机器人/, `${file} must state Keepsay is not NSFW chatbot`);
  assert.match(source, /moderation|审核/, `${file} must explain moderation`);
  assert.match(source, /SupportEmail/, `${file} must expose support contact`);
}

const creemChecklist = read('agent-context/creem-dashboard-review-checklist.md');
for (const productName of [
  'Keepsay First Spark',
  'Keepsay Spark Credits',
  'Keepsay Glow Credits',
  'Keepsay Lite Monthly',
  'Keepsay Plus Monthly',
  'Keepsay Pro Monthly',
  'Keepsay Lite Yearly',
  'Keepsay Plus Yearly',
  'Keepsay Pro Yearly',
]) {
  assert.match(
    creemChecklist,
    new RegExp(productName.replaceAll(' ', '\\s+')),
    `Creem dashboard checklist must include ${productName}`
  );
}

for (const file of [
  'src/shared/lib/roleplay-client.ts',
  'src/shared/lib/server/roleplay-home-data.ts',
  'src/app/api/roleplay/characters/route.ts',
  'src/app/api/roleplay/characters/[id]/route.ts',
  'src/app/api/roleplay/recommendations/route.ts',
]) {
  assert.match(
    read(file),
    /getVisiblePublicGallery/,
    `${file} must apply public gallery visibility`
  );
}

for (const file of [
  'src/shared/lib/server/roleplay-home-data.ts',
  'src/app/api/roleplay/characters/route.ts',
  'src/app/api/roleplay/characters/[id]/route.ts',
  'src/app/api/roleplay/recommendations/route.ts',
]) {
  assert.match(
    read(file),
    /filterReviewSafeCharacters|isReviewSafeCharacterLike|getReviewSafeCharacterById/,
    `${file} must filter risky public characters in review-safe mode`
  );
}

const findings = [];
for (const file of publicCopyFiles) {
  const json = JSON.parse(read(file));
  for (const row of flattenStrings(json)) {
    if (isAllowedString(row.path, row.value)) continue;
    for (const term of riskyTerms) {
      if (term.test(row.value)) {
        findings.push(`${file}:${row.path}: ${row.value}`);
        break;
      }
    }
  }
}

assert.deepEqual(
  findings,
  [],
  `high-risk public copy remains:\n${findings.join('\n')}`
);

console.log('Creem compliance review-mode checks OK');
