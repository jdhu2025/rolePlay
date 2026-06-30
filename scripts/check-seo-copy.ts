import assert from 'node:assert/strict';

import {
  buildCharacterSeoCopy,
  ROLEPLAY_HOME_SEO,
} from '../src/shared/lib/roleplay-seo-copy';

assert.match(ROLEPLAY_HOME_SEO.title, /AI Character Chat/i);
assert.match(ROLEPLAY_HOME_SEO.title, /memory/i);
assert.match(ROLEPLAY_HOME_SEO.description, /Character\.AI alternative/i);
assert.match(ROLEPLAY_HOME_SEO.description, /create an AI character/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /free AI character chat/i);
assert.match(ROLEPLAY_HOME_SEO.subtitle, /remember/i);
assert.ok(
  ROLEPLAY_HOME_SEO.keywords.join(', ').length <= 260,
  'homepage meta keywords should stay shorter than the old AITDK-flagged list'
);
assert.ok(
  ROLEPLAY_HOME_SEO.keywords.includes('AI character chat with memory')
);
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
assert.match(characterSeo.description, /Character\.AI alternative/i);
assert.ok(characterSeo.description.includes('story continuity'));
assert.ok(characterSeo.keywords.includes('AI character chat with memory'));

console.log('SEO copy rules OK');
