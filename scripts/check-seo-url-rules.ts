import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ROLEPLAY_ANIME_CHARACTERS } from '../src/data/roleplay-anime-characters';
import { ROLEPLAY_OFFICIAL_CHARACTERS } from '../src/data/roleplay-characters';
import { getLocalRoleplayCharacter } from '../src/shared/lib/roleplay-client';
import {
  buildLocalizedPath,
  buildLocalizedUrl,
  normalizeSitemapEntries,
} from '../src/shared/lib/seo-url';

const appUrl = 'https://keepsay.dpdns.org';

assert.equal(
  buildLocalizedPath('/', 'en', {
    defaultLocale: 'en',
    localePrefix: 'always',
  }),
  '/en'
);

assert.equal(
  buildLocalizedPath('/character/rp-anime-001', 'en', {
    defaultLocale: 'en',
    localePrefix: 'always',
  }),
  '/en/character/rp-anime-001'
);

assert.equal(
  buildLocalizedUrl('/blog', 'zh', {
    appUrl,
    defaultLocale: 'en',
    localePrefix: 'always',
  }),
  'https://keepsay.dpdns.org/zh/blog'
);

assert.deepEqual(
  normalizeSitemapEntries(
    [
      { path: '/', locales: ['en', 'zh'] },
      { path: '/character/rp-001', locales: ['en'] },
    ],
    {
      appUrl,
      defaultLocale: 'en',
      localePrefix: 'always',
    }
  ).map((entry) => entry.url),
  [
    'https://keepsay.dpdns.org/en',
    'https://keepsay.dpdns.org/zh',
    'https://keepsay.dpdns.org/en/character/rp-001',
  ]
);

for (const file of [
  'content/pages/privacy-policy.mdx',
  'content/pages/privacy-policy.zh.mdx',
  'content/pages/terms-of-service.mdx',
  'content/pages/terms-of-service.zh.mdx',
  'content/pages/acceptable-use-policy.mdx',
  'content/pages/acceptable-use-policy.zh.mdx',
  'src/config/locale/messages/en/landing.json',
  'src/config/locale/messages/zh/landing.json',
  'src/config/locale/messages/en/ai/chat.json',
  'src/config/locale/messages/zh/ai/chat.json',
  'src/config/locale/messages/en/admin/sidebar.json',
  'src/config/locale/messages/zh/admin/sidebar.json',
]) {
  const content = readFileSync(file, 'utf8');
  assert.ok(
    !content.includes('your-domain.com'),
    `${file} has your-domain.com`
  );
  assert.ok(
    !content.includes('support@your-domain.com'),
    `${file} has placeholder support email`
  );
}

const dynamicLandingPage = readFileSync(
  'src/app/[locale]/(landing)/[...slug]/page.tsx',
  'utf8'
);

assert.match(dynamicLandingPage, /openGraph:\s*{/);
assert.match(dynamicLandingPage, /url:\s*canonicalUrl/);

for (const id of [
  ...ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => character.id),
  ...ROLEPLAY_ANIME_CHARACTERS.map((character) => character.id),
]) {
  assert.ok(
    getLocalRoleplayCharacter(id),
    `local sitemap character ${id} must resolve on character detail pages`
  );
}

async function main() {
  process.env.NEXT_PUBLIC_APP_URL = appUrl;

  const { default: sitemap } = await import('../src/app/sitemap');
  const urls = (await sitemap()).map((entry) => entry.url);

  assert.ok(
    !urls.includes(`${appUrl}/en/blog`),
    '/en/blog is temporarily noindex'
  );
  assert.ok(
    !urls.includes(`${appUrl}/zh/blog`),
    '/zh/blog is temporarily noindex'
  );

  for (const path of [
    '/privacy-policy',
    '/terms-of-service',
    '/acceptable-use-policy',
    '/ai-character-collections',
    '/ai-companion-that-remembers-you',
    '/ai-roleplay-secret-memory',
    '/ai-roleplay-shared-memory',
    '/create-ai-character-with-memory',
    '/character-ai-alternative-with-memory',
    '/anime-character-ai-chat',
    '/talkie-ai-alternative',
    '/comfort-ai-companion',
  ]) {
    assert.ok(urls.includes(`${appUrl}/en${path}`), `${path} missing for en`);
    assert.ok(urls.includes(`${appUrl}/zh${path}`), `${path} missing for zh`);
  }

  assert.ok(
    !urls.includes(`${appUrl}/en/updates`),
    '/en/updates is noindex until it has SEO depth/schema'
  );
  assert.ok(
    !urls.includes(`${appUrl}/zh/updates`),
    '/zh/updates is noindex until it has SEO depth/schema'
  );

  assert.ok(
    urls.every(
      (url) =>
        !url.startsWith('https://ai-companion-that-remembers-you.dpdns.org')
    ),
    'unavailable SEO domain must not appear in sitemap'
  );

  console.log('SEO URL rules OK');
}

main();
