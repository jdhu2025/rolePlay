import assert from 'node:assert/strict';

const relationshipStateModule =
  '../src/shared/lib/roleplay-relationship-state' + '.ts';

const {
  EMPTY_RELATIONSHIP_STATE,
  parseRelationshipState,
  renderRelationshipStateSystemMessage,
  serializeRelationshipState,
  updateRelationshipState,
} = await import(relationshipStateModule);

const empty = parseRelationshipState('');
assert.deepEqual(empty, EMPTY_RELATIONSHIP_STATE);

const warm = updateRelationshipState({
  previous: empty,
  input: '谢谢你，今天有点累，但我很喜欢这个只有我们知道的“蓝色钥匙”梗。',
  reply: '*softens her voice* Then we keep the blue key on the table, just for us.',
});

assert.equal(warm.turnCount, 1);
assert.ok(warm.intimacy > empty.intimacy, 'intimacy should increase');
assert.ok(warm.trust > empty.trust, 'trust should increase');
assert.equal(warm.currentMood, 'tender');
assert.ok(warm.lastTopic.includes('谢谢你'));
assert.ok(
  warm.insideJokes.some((item: string) => item.includes('蓝色钥匙')),
  'inside joke should be captured'
);

const serialized = serializeRelationshipState({
  ...warm,
  intimacy: 999,
  trust: -30,
  insideJokes: [...warm.insideJokes, 'a', 'b', 'c', 'd', 'e', 'f'],
});
const normalized = parseRelationshipState(serialized);
assert.equal(normalized.intimacy, 100);
assert.equal(normalized.trust, 0);
assert.ok(normalized.insideJokes.length <= 6);

const systemMessage = renderRelationshipStateSystemMessage(warm);
assert.match(systemMessage, /\[relationship_state\]/);
assert.match(systemMessage, /Intimacy:/);
assert.match(systemMessage, /Trust:/);
assert.match(systemMessage, /Do not quote the numbers/);

console.log(
  JSON.stringify(
    {
      ok: true,
      turnCount: warm.turnCount,
      mood: warm.currentMood,
      insideJokes: warm.insideJokes.length,
    },
    null,
    2
  )
);
