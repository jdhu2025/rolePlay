import assert from 'node:assert/strict';

import {
  FIRST_EXPERIENCE_CHOICES,
  FIRST_EXPERIENCE_EVENT_TYPES,
  FIRST_EXPERIENCE_STORAGE_KEY,
  buildFirstExperiencePersona,
  buildFirstExperienceRecommendationQuery,
  createFirstExperienceState,
  markFirstExperienceConversationFlag,
  normalizeFirstExperienceChoice,
  rankFirstExperienceCharacters,
} from '../src/shared/lib/roleplay-first-experience';

const directCopyPattern =
  /被谁看见|想被谁|被重视|被注意|be noticed|who do you want/i;

assert.deepEqual(
  FIRST_EXPERIENCE_CHOICES.map((choice) => choice.id),
  ['quiet', 'playful', 'guarded']
);

for (const choice of FIRST_EXPERIENCE_CHOICES) {
  const visibleCopy = [
    choice.promptZh,
    choice.labelZh,
    choice.descriptionZh,
    choice.revealZh,
    choice.promptEn,
    choice.labelEn,
    choice.descriptionEn,
    choice.revealEn,
  ].join('\n');
  assert.doesNotMatch(
    visibleCopy,
    directCopyPattern,
    `${choice.id} visible copy should imply attention without saying it`
  );
}

assert.equal(FIRST_EXPERIENCE_STORAGE_KEY, 'roleplay:first-experience');
assert.equal(normalizeFirstExperienceChoice('quiet'), 'quiet');
assert.equal(normalizeFirstExperienceChoice('unknown'), null);
assert.equal(normalizeFirstExperienceChoice(undefined), null);

const state = createFirstExperienceState(
  'quiet',
  new Date('2026-06-12T00:00:00.000Z')
);
assert.equal(state.choice, 'quiet');
assert.equal(state.revealShown, false);
assert.deepEqual(state.seedShownByConversation, {});

const withSeed = markFirstExperienceConversationFlag(
  state,
  'seedShownByConversation',
  'conv-1'
);
assert.equal(withSeed.seedShownByConversation['conv-1'], true);
assert.equal(state.seedShownByConversation['conv-1'], undefined);

assert.deepEqual(buildFirstExperienceRecommendationQuery('guarded'), {
  firstImpression: 'guarded',
});
assert.deepEqual(buildFirstExperienceRecommendationQuery('bad-value'), {});

assert.match(
  buildFirstExperiencePersona('playful'),
  /playful teasing and lightness/i
);
assert.doesNotMatch(
  buildFirstExperiencePersona('playful'),
  /tease me|service-bot|be noticed/i
);

assert.ok(FIRST_EXPERIENCE_EVENT_TYPES.includes('first_experience_exposed'));
assert.ok(FIRST_EXPERIENCE_EVENT_TYPES.includes('seed_revealed'));
assert.ok(FIRST_EXPERIENCE_EVENT_TYPES.includes('goodbye_stamp_shown'));

const ranked = rankFirstExperienceCharacters('guarded', [
  {
    id: 'soft',
    tagline: 'A soft warm companion',
    intro: 'quiet healing memory',
    tags: '["helper"]',
    style: '',
    relationship: '',
    scene: '',
    settings: '',
    gender: '',
    chatCount: 100,
  },
  {
    id: 'sharp',
    tagline: 'Cool mysterious tension',
    intro: 'high standard slow burn',
    tags: '["recommend"]',
    style: '',
    relationship: '',
    scene: '',
    settings: '',
    gender: '',
    chatCount: 1,
  },
]);
assert.equal(ranked[0].id, 'sharp');
assert.equal(
  rankFirstExperienceCharacters('unknown', ranked)[0].id,
  'sharp',
  'unknown choices should preserve incoming order'
);

console.log('First experience helper rules OK');
