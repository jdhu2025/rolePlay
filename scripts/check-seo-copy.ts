import assert from 'node:assert/strict';

import {
  buildCharacterSeoCopy,
  ROLEPLAY_HOME_SEO,
} from '../src/shared/lib/roleplay-seo-copy';

assert.match(ROLEPLAY_HOME_SEO.title, /Free/i);
assert.match(ROLEPLAY_HOME_SEO.title, /sign up/i);
assert.match(ROLEPLAY_HOME_SEO.title, /Keepsay/i);
assert.match(ROLEPLAY_HOME_SEO.description, /free AI character chat/i);
assert.match(ROLEPLAY_HOME_SEO.description, /no sign up/i);
assert.match(ROLEPLAY_HOME_SEO.description, /original characters/i);
assert.match(ROLEPLAY_HOME_SEO.description, /memory/i);
assert.match(ROLEPLAY_HOME_SEO.description, /templates/i);
assert.match(ROLEPLAY_HOME_SEO.description, /image upload/i);
assert.ok(
  ROLEPLAY_HOME_SEO.description.length <= 155,
  'homepage meta description should fit predictable snippets'
);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /original characters/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /memory/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /templates/i);
assert.ok(
  ROLEPLAY_HOME_SEO.keywords.join(', ').length <= 260,
  'homepage meta keywords should stay shorter than the old AITDK-flagged list'
);
const homepageKeywords = [...ROLEPLAY_HOME_SEO.keywords] as string[];

assert.ok(homepageKeywords.includes('free AI character chat'));
assert.ok(homepageKeywords.includes('AI character chat no sign up'));
assert.ok(homepageKeywords.includes('AI character chat no login'));
assert.ok(homepageKeywords.includes('original characters'));
assert.ok(homepageKeywords.includes('quick AI character creator'));

const characterSeo = buildCharacterSeoCopy({
  name: 'Elira Frost',
  intro:
    'A quiet silver-haired mage who turns late-night worries into soft pages.',
  role: 'wandering librarian-mage',
  location: 'Moonlit Arcana Library',
});

assert.match(characterSeo.title, /Elira Frost/i);
assert.match(characterSeo.title, /AI Character Chat/i);
assert.match(characterSeo.title, /AI Roleplay/i);
assert.match(characterSeo.description, /memory/i);
assert.match(characterSeo.description, /scene continuity/i);
assert.ok(
  characterSeo.description.length <= 155,
  'character meta description should fit predictable snippets'
);
assert.ok(characterSeo.keywords.includes('AI character chat with memory'));

console.log('SEO copy rules OK');
