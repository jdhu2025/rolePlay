import assert from 'node:assert/strict';

import {
  buildCharacterSeoCopy,
  ROLEPLAY_HOME_SEO,
} from '../src/shared/lib/roleplay-seo-copy';

assert.match(ROLEPLAY_HOME_SEO.title, /AI Character Chat/i);
assert.match(ROLEPLAY_HOME_SEO.title, /AI Roleplay/i);
assert.match(ROLEPLAY_HOME_SEO.description, /Character\.AI alternative/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /crush-style/i);
assert.ok(
  ROLEPLAY_HOME_SEO.keywords.includes('Best Character AI alternatives')
);
assert.ok(ROLEPLAY_HOME_SEO.keywords.includes('Talkie AI alternative'));
assert.ok(ROLEPLAY_HOME_SEO.keywords.includes('PolyBuzz alternative'));

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
assert.match(characterSeo.description, /Character\.AI alternative/i);
assert.ok(characterSeo.keywords.includes('Best Character AI alternatives'));
assert.ok(characterSeo.keywords.includes('lonely AI companion'));

console.log('SEO copy rules OK');
