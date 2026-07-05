import assert from 'node:assert/strict';
import {
  ROLEPLAY_CHARACTER_SEO_SCENES,
  ROLEPLAY_SEO_SCENES,
} from '@/data/roleplay-seo-scenes';

import { buildRoleplayCharacterSeoProfile } from '@/shared/lib/roleplay-character-seo-profile';
import {
  OFFICIAL_ROLEPLAY_CHARACTERS,
  readCharacterSettings,
} from '@/shared/lib/roleplay-client';

function countCjkCharacters(value: string) {
  return value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
}

for (const character of OFFICIAL_ROLEPLAY_CHARACTERS) {
  const settings = readCharacterSettings(character);
  const sceneLinks = (ROLEPLAY_CHARACTER_SEO_SCENES[character.id] ?? []).map(
    (slug) => ({
      slug,
      href: `/${ROLEPLAY_SEO_SCENES[slug].landingSlug}`,
      label: ROLEPLAY_SEO_SCENES[slug].labelEn,
    })
  );
  const profile = buildRoleplayCharacterSeoProfile({
    character,
    occupation: settings.occupation || character.style,
    location: settings.location || character.scene,
    sceneLinks,
    isZh: false,
  });

  assert.ok(
    profile.wordCount >= 300,
    `${character.id} SEO profile should have at least 300 English words`
  );
  assert.ok(
    profile.wordCount <= 520,
    `${character.id} SEO profile should stay concise enough for a profile page`
  );
  assert.ok(
    profile.relatedLinks.length >= 3,
    `${character.id} SEO profile should expose related internal links`
  );
  assert.ok(
    profile.relatedLinks.some(
      (link) => link.href === '/ai-character-chat-with-memory'
    ),
    `${character.id} SEO profile should link to the memory landing page`
  );
  assert.equal(
    profile.faqs.length,
    3,
    `${character.id} SEO profile should expose three profile FAQs`
  );

  const zhProfile = buildRoleplayCharacterSeoProfile({
    character,
    occupation: settings.occupation || character.style,
    location: settings.location || character.scene,
    sceneLinks: sceneLinks.map((link) => ({
      ...link,
      label: ROLEPLAY_SEO_SCENES[link.slug!].labelZh,
    })),
    isZh: true,
  });

  const zhBody = [
    zhProfile.title,
    ...zhProfile.paragraphs,
    ...zhProfile.bullets,
    ...zhProfile.faqs.map((faq) => `${faq.question} ${faq.answer}`),
  ].join(' ');

  assert.ok(
    countCjkCharacters(zhBody) >= 520,
    `${character.id} Chinese SEO profile should have localized depth`
  );
  assert.ok(
    zhProfile.relatedLinks.some(
      (link) => link.href === '/ai-character-chat-with-memory'
    ),
    `${character.id} Chinese SEO profile should link to the memory landing page`
  );
}

console.log('Roleplay character SEO profile checks OK');
