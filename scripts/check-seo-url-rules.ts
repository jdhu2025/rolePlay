import assert from 'node:assert/strict';

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

async function main() {
  process.env.NEXT_PUBLIC_APP_URL = appUrl;

  const { default: sitemap } = await import('../src/app/sitemap');
  const urls = (await sitemap()).map((entry) => entry.url);

  for (const path of [
    '/ai-companion-that-remembers-you',
    '/ai-roleplay-secret-memory',
    '/ai-roleplay-shared-memory',
    '/create-ai-character-with-memory',
    '/character-ai-alternative-with-memory',
  ]) {
    assert.ok(urls.includes(`${appUrl}/en${path}`), `${path} missing for en`);
    assert.ok(urls.includes(`${appUrl}/zh${path}`), `${path} missing for zh`);
  }

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
