#!/usr/bin/env node
/**
 * AI Writer smoke automation.
 *
 * Default mode is offline and cost-free: it validates the expected response
 * shape against a representative fixture. Use --live to call a running app:
 *
 *   node scripts/smoke-ai-writer.mjs
 *   node scripts/smoke-ai-writer.mjs --live --url http://localhost:3000 --hint "quiet cyberpunk librarian" --language en
 *
 * Live mode exercises `/api/roleplay/ai-writer` only. It does not save a
 * character, so it is safe for DB data. It can call paid/remote model and
 * image providers depending on env/config, so keep it explicit.
 */

const args = new Map();
for (let idx = 2; idx < process.argv.length; idx += 1) {
  const arg = process.argv[idx];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = process.argv[idx + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
    } else {
      args.set(key, next);
      idx += 1;
    }
  }
}

const live = args.has('live');
const baseUrl = String(args.get('url') || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);
const hint = String(
  args.get('hint') || 'quiet cyberpunk librarian with a dry sense of humor'
);
const language = String(args.get('language') || 'en');

const fixture = {
  draft: {
    name: 'Mira',
    gender: 'female',
    tagline:
      'A night-shift archivist who remembers what everyone else forgets.',
    settings: 'Mira works in a neon-lit archive under the old city.',
    intro:
      'Mira is calm, watchful, and quietly funny. She treats forgotten details like living things.',
    opening:
      '*slides a marked page across the desk* You came back for the part of the story everyone skips.',
    personalityCard: {
      identity: 'Mira, 24, night-shift archivist.',
      appearance: 'Dark coat, silver hair clip, tired eyes that miss nothing.',
      coreTraits: ['observant', 'dry', 'protective'],
      speakingStyle: 'Short, precise, with dry warmth.',
      catchphrases: ['That detail matters.', 'Try again, slower.'],
      metaphorDomain: 'archives and marginalia',
      values: ['Protect memory.', 'Do not waste trust.'],
      relationshipHook: 'The user has returned to the archive after hours.',
      negativeAnchors: ['Do not become bubbly.', 'Do not explain the prompt.'],
    },
    imageStyleSuffix:
      'consistent neon archive portrait, realistic editorial lighting',
    voicePreset: 'romance_female_mature_marin',
    styleExamples: [
      {
        user: 'I had a long day.',
        character:
          '*marks her place with one finger* Then we lower the lights and start with the true part.',
      },
    ],
  },
  image: { generated: false, reason: 'offline fixture' },
};

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function assertString(value, path) {
  if (typeof value !== 'string' || !value.trim()) {
    fail(`${path} must be a non-empty string`);
  }
}

function validatePayload(payload) {
  const draft = payload?.data?.draft ?? payload?.draft;
  if (!draft || typeof draft !== 'object') fail('missing draft object');

  assertString(draft.name, 'draft.name');
  assertString(draft.gender, 'draft.gender');
  assertString(draft.settings, 'draft.settings');
  assertString(draft.intro, 'draft.intro');
  assertString(draft.opening, 'draft.opening');

  const card = draft.personalityCard;
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    fail('draft.personalityCard must be an object');
  }
  assertString(card.identity, 'draft.personalityCard.identity');
  assertString(card.speakingStyle, 'draft.personalityCard.speakingStyle');
  if (!Array.isArray(card.coreTraits) || card.coreTraits.length < 2) {
    fail('draft.personalityCard.coreTraits must contain at least 2 traits');
  }
  if (!Array.isArray(card.negativeAnchors) || card.negativeAnchors.length < 2) {
    fail(
      'draft.personalityCard.negativeAnchors must contain at least 2 anchors'
    );
  }

  if (draft.styleExamples !== undefined) {
    if (!Array.isArray(draft.styleExamples)) {
      fail('draft.styleExamples must be an array when present');
    }
    for (const [idx, example] of draft.styleExamples.entries()) {
      assertString(example?.user, `draft.styleExamples[${idx}].user`);
      assertString(example?.character, `draft.styleExamples[${idx}].character`);
    }
  }

  if (draft.avatar && !/^https?:\/\//.test(draft.avatar)) {
    fail('draft.avatar must be an absolute URL when present');
  }

  return {
    name: draft.name,
    hasAvatar: Boolean(draft.avatar),
    styleExampleCount: draft.styleExamples?.length ?? 0,
    voicePreset: draft.voicePreset || '',
  };
}

async function runLive() {
  const response = await fetch(`${baseUrl}/api/roleplay/ai-writer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hint, language }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || (payload?.code && payload.code !== 0)) {
    fail(payload?.message || `HTTP ${response.status}`);
  }
  return validatePayload(payload);
}

const result = live ? await runLive() : validatePayload(fixture);
console.log(
  JSON.stringify(
    {
      ok: true,
      mode: live ? 'live' : 'fixture',
      ...result,
    },
    null,
    2
  )
);
