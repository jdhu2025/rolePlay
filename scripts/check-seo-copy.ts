import assert from 'node:assert/strict';

import {
  buildCharacterSeoCopy,
  ROLEPLAY_HOME_SEO,
} from '../src/shared/lib/roleplay-seo-copy';

assert.match(ROLEPLAY_HOME_SEO.title, /AI Character Chat Free/i);
assert.match(ROLEPLAY_HOME_SEO.title, /Without Login/i);
assert.ok(
  ROLEPLAY_HOME_SEO.title.startsWith('AI Character Chat Free'),
  'homepage meta title should start with the primary KGR phrase'
);
assert.match(ROLEPLAY_HOME_SEO.description, /AI character chat/i);
assert.match(ROLEPLAY_HOME_SEO.description, /free/i);
assert.match(ROLEPLAY_HOME_SEO.description, /memory/i);
assert.match(ROLEPLAY_HOME_SEO.description, /private characters/i);
assert.ok(
  ROLEPLAY_HOME_SEO.description.length <= 155,
  'homepage meta description should fit predictable snippets'
);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /AI character chat free/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /first guest replies/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /remember/i);
assert.ok(
  ROLEPLAY_HOME_SEO.keywords.join(', ').length <= 260,
  'homepage meta keywords should stay shorter than the old AITDK-flagged list'
);
assert.ok(ROLEPLAY_HOME_SEO.keywords.includes('AI character chat free'));
assert.ok(ROLEPLAY_HOME_SEO.keywords.includes('AI character chat without login'));
assert.ok(ROLEPLAY_HOME_SEO.keywords.includes('AI character chat with memory'));
assert.ok(
  ROLEPLAY_HOME_SEO.keywords.includes('Talkie AI alternative with memory')
);

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
