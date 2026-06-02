/**
 * Backfill personality-plan fields for the 12 official RolePlay characters.
 *
 * Unlike seed-roleplay-characters.ts, this script never wipes roleplay tables.
 * It only UPDATEs the official system-owned rows (rp-001 .. rp-012) so it is
 * safe to run after users have conversations, memories, comments, or follows.
 *
 * Run via:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-official-characters.ts
 *
 * Optional:
 *   --dry-run  Print planned updates and write a snapshot, but do not update.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import {
  ROLEPLAY_OFFICIAL_CHARACTERS,
  ROLEPLAY_SYSTEM_USER,
  type RoleplayOfficialCharacter,
} from '@/data/roleplay-characters';
import { serializePersonalityCard } from '@/shared/lib/roleplay-personality';
import { serializeStyleExamples } from '@/shared/lib/roleplay-style-examples';

async function loadSchemaTables(): Promise<any> {
  if (envConfigs.database_provider === 'mysql') {
    return (await import('@/config/db/schema.mysql')) as any;
  }
  if (['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    return (await import('@/config/db/schema.sqlite')) as any;
  }
  return (await import('@/config/db/schema')) as any;
}

function buildPersonalityCard(character: RoleplayOfficialCharacter) {
  return {
    identity: `${character.name}, ${character.age}, is a ${character.occupation} based in ${character.location}. ${character.intro}`,
    appearance:
      'Keep visual continuity with the official portrait set: polished lifestyle photography, expressive eye contact, natural gestures, location-specific styling, and a warm editorial finish.',
    coreTraits: character.personality,
    tension: `${character.name} is easy to approach, but does not reveal everything at once.`,
    speakingStyle:
      'Concise, emotionally present, and scene-aware. Use small physical actions in single asterisks, then grounded dialogue that invites the user deeper without over-explaining.',
    catchphrases: [
      'Tell me one real thing.',
      'Stay a little longer.',
      'I noticed that.',
    ],
    metaphorDomain: character.tags.slice(0, 2).join(' / '),
    values: [
      'Notice concrete details before making big declarations.',
      'Protect the mood of the scene and the user’s emotional safety.',
      'Let intimacy build through memory, attention, and restraint.',
    ],
    relationshipHook: `The user has just stepped into ${character.name}'s world in ${character.location}; the relationship starts curious, lightly personal, and open to becoming warmer over time.`,
    negativeAnchors: [
      'Do not break character or describe yourself as an AI assistant.',
      'Do not become generic, corporate, or advice-column-like.',
      'Do not rush into extreme intimacy before the user earns that tone through the conversation.',
    ],
  };
}

function buildStyleExamples(character: RoleplayOfficialCharacter) {
  return [
    {
      user: 'I had a long day.',
      character: `*softens, giving you her full attention* Then we make the next ten minutes smaller. Tell me the part you keep replaying, and I will hold it with you.`,
    },
    {
      user: 'What should we do tonight?',
      character: `${character.openingLine} After that, we can decide whether the night wants quiet or trouble.`,
    },
    {
      user: 'Do you remember what I told you?',
      character: `*smiles like she has been saving the detail* I remember the feeling of it first. Remind me of one word, and I will find the rest.`,
    },
  ];
}

function buildImageStyleSuffix(character: RoleplayOfficialCharacter) {
  return [
    `${character.name} official character continuity`,
    `adult ${character.age}-year-old ${character.occupation}`,
    character.location,
    character.tags.join(', '),
    'same face identity, polished lifestyle portrait, natural skin texture, expressive eyes, tasteful modern styling, cinematic but realistic lighting',
  ].join('; ');
}

function chooseVoicePreset(character: RoleplayOfficialCharacter) {
  const traits = character.personality.join(' ').toLowerCase();
  if (/\b(bold|vibrant|playful|fun|spirited|witty)\b/.test(traits)) {
    return 'playful-female';
  }
  if (/\b(calm|composed|refined|poised|subtle|precise)\b/.test(traits)) {
    return 'cool-female';
  }
  return 'warm-female';
}

function buildPatch(character: RoleplayOfficialCharacter) {
  return {
    style: `${character.occupation}; ${character.tags.join(', ')}`,
    relationship: 'new companion with room for slow-burn closeness',
    personalityCard: serializePersonalityCard(buildPersonalityCard(character)),
    imageStyleSuffix: buildImageStyleSuffix(character),
    voicePreset: chooseVoicePreset(character),
    styleExamples: serializeStyleExamples(buildStyleExamples(character)),
    metadata: JSON.stringify({
      source: 'official-backfill',
      sortOrder: character.sortOrder,
      backfilledAt: new Date().toISOString(),
    }),
  };
}

async function writeSnapshot(rows: unknown[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(
    process.cwd(),
    'scripts',
    'data',
    `backfill-snapshot-${stamp}.json`
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return path;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const ids = ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => character.id);
  const tables = await loadSchemaTables();
  const { roleplayCharacter } = tables;

  console.log(`Backfilling official characters (${ids.length}) ...`);
  console.log(`DB provider: ${envConfigs.database_provider}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'update'}`);

  try {
    await db().execute(sql`select 1`);
  } catch (error) {
    console.error('DB connection failed before backfill:', error);
    process.exit(1);
  }

  const snapshotRows = await db()
    .select()
    .from(roleplayCharacter)
    .where(
      and(
        eq(roleplayCharacter.userId, ROLEPLAY_SYSTEM_USER.id),
        inArray(roleplayCharacter.id, ids)
      )
    );
  const snapshotPath = await writeSnapshot(snapshotRows);
  console.log(`Snapshot written: ${snapshotPath}`);

  if (snapshotRows.length !== ids.length) {
    const present = new Set(snapshotRows.map((row: any) => row.id));
    const missing = ids.filter((id) => !present.has(id));
    console.warn(`Warning: missing official rows: ${missing.join(', ')}`);
  }

  for (const character of ROLEPLAY_OFFICIAL_CHARACTERS) {
    const patch = buildPatch(character);
    if (dryRun) {
      console.log(
        `[dry-run] ${character.id} ${character.name}: ${patch.voicePreset}, ${buildStyleExamples(character).length} style examples`
      );
      continue;
    }

    await db()
      .update(roleplayCharacter)
      .set(patch)
      .where(
        and(
          eq(roleplayCharacter.id, character.id),
          eq(roleplayCharacter.userId, ROLEPLAY_SYSTEM_USER.id)
        )
      );
    console.log(`Backfilled ${character.id} ${character.name}`);
  }

  console.log('Backfill complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
