import fs from 'node:fs';
import path from 'node:path';
import { ROLEPLAY_SEO_SCENES } from '@/data/roleplay-seo-scenes';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function main() {
  const slugs = Array.from(
    new Set(
      Object.values(ROLEPLAY_SEO_SCENES).map((scene) => scene.landingSlug)
    )
  );

  for (const slug of slugs) {
    const filePath = path.join(
      process.cwd(),
      'src/app/[locale]/(landing)',
      slug,
      'page.tsx'
    );
    assert(fs.existsSync(filePath), `missing landing page: ${slug}`);

    const source = fs.readFileSync(filePath, 'utf8');
    assert(
      source.includes('generateMetadata = getMetadata'),
      `${slug} must export localized metadata`
    );
    assert(
      source.includes(`canonicalUrl: '/${slug}'`),
      `${slug} must set canonicalUrl to /${slug}`
    );
    assert(
      source.includes(`canonicalPath: '/${slug}'`),
      `${slug} must pass canonicalPath /${slug}`
    );
    assert(source.includes('localized:'), `${slug} must include zh metadata`);
    assert(source.includes("locale: 'en'"), `${slug} must include en config`);
    assert(source.includes("locale: 'zh'"), `${slug} must include zh config`);
    assert(
      source.includes('RoleplaySeoLandingPage'),
      `${slug} must render RoleplaySeoLandingPage`
    );
  }

  const landingComponent = fs.readFileSync(
    path.join(
      process.cwd(),
      'src/shared/components/roleplay/roleplay-seo-landing-page.tsx'
    ),
    'utf8'
  );
  for (const schemaType of [
    'WebPage',
    'BreadcrumbList',
    'ItemList',
    'FAQPage',
  ]) {
    assert(
      landingComponent.includes(`'@type': '${schemaType}'`),
      `landing component must emit ${schemaType} JSON-LD`
    );
  }
  assert(
    landingComponent.includes('TrackedRoleplayLink'),
    'landing component must track CTA and related-link clicks'
  );

  console.log('Roleplay SEO landing page checks OK');
}

main();
