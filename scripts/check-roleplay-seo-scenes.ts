import fs from 'node:fs';
import path from 'node:path';
import { ROLEPLAY_ANIME_CHARACTERS } from '@/data/roleplay-anime-characters';
import { ROLEPLAY_OFFICIAL_CHARACTERS } from '@/data/roleplay-characters';
import { ROLEPLAY_QUICK_CREATE_TEMPLATES } from '@/data/roleplay-quick-create-templates';
import {
  getQuickCreateGrowthMetadata,
  QUICK_CREATE_INSPIRATIONS,
  QUICK_CREATE_INTENT_GROUPS,
  ROLEPLAY_CHARACTER_SEO_SCENES,
  ROLEPLAY_SEO_SCENES,
} from '@/data/roleplay-seo-scenes';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function main() {
  const landingSlugs = new Set(
    Object.values(ROLEPLAY_SEO_SCENES).map((scene) => scene.landingSlug)
  );
  const characterIds = new Set([
    ...ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => character.id),
    ...ROLEPLAY_ANIME_CHARACTERS.map((character) => character.id),
  ]);

  for (const scene of Object.values(ROLEPLAY_SEO_SCENES)) {
    assert(
      !scene.landingSlug.startsWith('/'),
      `scene landing slug should be a bare slug for metadata reuse: ${scene.landingSlug}`
    );
  }

  for (const [characterId, scenes] of Object.entries(
    ROLEPLAY_CHARACTER_SEO_SCENES
  )) {
    assert(
      scenes.length > 0,
      `character ${characterId} must have at least one SEO scene`
    );
    for (const slug of scenes) {
      assert(
        Boolean(ROLEPLAY_SEO_SCENES[slug]),
        `character ${characterId} references missing SEO scene ${slug}`
      );
    }
  }

  for (const template of ROLEPLAY_QUICK_CREATE_TEMPLATES) {
    const growth = getQuickCreateGrowthMetadata(template);
    assert(
      Boolean(QUICK_CREATE_INSPIRATIONS[growth.inspirationType]),
      `template ${template.id} references missing inspiration ${growth.inspirationType}`
    );
    assert(
      QUICK_CREATE_INTENT_GROUPS.some(
        (group) => group.id === growth.intentCategory
      ),
      `template ${template.id} references missing intent category ${growth.intentCategory}`
    );
    assert(
      landingSlugs.has(growth.recommendedLandingSlug),
      `template ${template.id} references unknown landing slug ${growth.recommendedLandingSlug}`
    );
  }

  for (const slug of landingSlugs) {
    const filePath = path.join(
      process.cwd(),
      'src/app/[locale]/(landing)',
      slug,
      'page.tsx'
    );
    assert(fs.existsSync(filePath), `missing SEO landing page for ${slug}`);
    const source = fs.readFileSync(filePath, 'utf8');
    const matches = Array.from(source.matchAll(/'((?:rp|rp-anime)-[^']+)'/g));
    const ids = Array.from(new Set(matches.map((match) => match[1])));
    assert(
      ids.length >= 6,
      `landing page ${slug} should expose at least 6 roleplay character cards`
    );
    for (const id of ids) {
      assert(
        characterIds.has(id),
        `landing page ${slug} references missing character ${id}`
      );
    }
  }

  console.log('Roleplay SEO scene checks OK');
}

main();
