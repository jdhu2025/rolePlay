/**
 * Apply romance-oriented TTS voice profiles and assign existing characters
 * a scene-aware `voice_preset`.
 *
 * Run:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-roleplay-romance-voices.ts --dry-run
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-roleplay-romance-voices.ts
 *
 * Options:
 *   --dry-run      Write a snapshot and print planned updates without DB writes.
 *   --skip-config  Do not update roleplay_tts_voice_profiles/default profile.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { ne, sql } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';

type CharacterRow = {
  id: string;
  name: string;
  gender: string;
  status: string;
  visibility: string;
  tagline?: string;
  intro?: string;
  style?: string;
  relationship?: string;
  scene?: string;
  personality?: string;
  settings?: string;
  voicePreset?: string;
};

const PROFILE_JSON_PATH = join(
  process.cwd(),
  'roleplay-tts-voice-profiles-romance-openai.json'
);

const FEMALE_POOLS = {
  soft: ['romance_female_soft_coral', 'romance_female_clear_nova'],
  whisper: ['romance_female_whisper_shimmer', 'romance_female_soft_coral'],
  playful: ['romance_female_playful_verse', 'romance_female_clear_nova'],
  mature: ['romance_female_mature_marin', 'romance_female_soft_coral'],
};

const MALE_POOLS = {
  warm: ['romance_male_warm_ballad', 'romance_male_modern_ash'],
  deep: ['romance_male_deep_onyx', 'romance_male_smooth_cedar'],
  playful: ['romance_male_playful_fable', 'romance_male_modern_ash'],
  smooth: ['romance_male_smooth_cedar', 'romance_male_warm_ballad'],
};

const NEUTRAL_POOL = ['romance_neutral_sage', 'romance_neutral_alloy'];

async function loadSchemaTables(): Promise<any> {
  if (envConfigs.database_provider === 'mysql') {
    return (await import('@/config/db/schema.mysql')) as any;
  }
  if (['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    return (await import('@/config/db/schema.sqlite')) as any;
  }
  return (await import('@/config/db/schema')) as any;
}

function normalizeGender(value: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized.includes('female') || normalized === 'woman') return 'female';
  if (normalized.includes('male') || normalized === 'man') return 'male';
  return 'non-binary';
}

function safeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ');
}

function characterText(row: CharacterRow) {
  return [
    row.name,
    row.tagline,
    row.intro,
    row.style,
    row.relationship,
    row.scene,
    row.personality,
    row.settings,
  ]
    .map(safeText)
    .join(' ');
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickFromPool(pool: string[], seed: string) {
  return pool[hashString(seed) % pool.length];
}

function chooseFemalePool(text: string) {
  if (
    /whisper|softly|quiet|late night|midnight|bedroom|hotel|private|close|低声|轻声|夜|酒店|私密|靠近/.test(
      text
    )
  ) {
    return FEMALE_POOLS.whisper;
  }
  if (
    /playful|teas|flirt|fun|bright|cheer|laugh|party|俏皮|调皮|玩笑|派对|笑|撩/.test(
      text
    )
  ) {
    return FEMALE_POOLS.playful;
  }
  if (
    /mature|elegant|luxury|refined|boss|teacher|mentor|gallery|lounge|成熟|优雅|高级|画廊|酒廊|导师/.test(
      text
    )
  ) {
    return FEMALE_POOLS.mature;
  }
  return FEMALE_POOLS.soft;
}

function chooseMalePool(text: string) {
  if (
    /deep|protect|guard|serious|command|danger|warrior|冷|保护|危险|严肃|强势/.test(
      text
    )
  ) {
    return MALE_POOLS.deep;
  }
  if (
    /playful|teas|flirt|fun|bright|laugh|party|俏皮|玩笑|派对|笑|撩/.test(
      text
    )
  ) {
    return MALE_POOLS.playful;
  }
  if (
    /smooth|elegant|mature|refined|mentor|gallery|lounge|成熟|优雅|高级|导师/.test(
      text
    )
  ) {
    return MALE_POOLS.smooth;
  }
  return MALE_POOLS.warm;
}

function chooseVoicePreset(row: CharacterRow) {
  const gender = normalizeGender(row.gender);
  const text = characterText(row);
  const seed = `${row.id}:${row.name}:${text}`;

  if (gender === 'female') return pickFromPool(chooseFemalePool(text), seed);
  if (gender === 'male') return pickFromPool(chooseMalePool(text), seed);
  return pickFromPool(NEUTRAL_POOL, seed);
}

async function writeSnapshot(rows: unknown[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(
    process.cwd(),
    'scripts',
    'data',
    `voice-backfill-snapshot-${stamp}.json`
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return path;
}

async function upsertVoiceProfileConfig(tables: any, profilesJson: string) {
  const { config } = tables;
  await db()
    .insert(config)
    .values({
      name: 'roleplay_tts_voice_profiles',
      value: profilesJson,
    })
    .onConflictDoUpdate({
      target: config.name,
      set: { value: profilesJson },
    });

  await db()
    .insert(config)
    .values({
      name: 'roleplay_tts_default_voice_profile_id',
      value: 'romance_female_soft_coral',
    })
    .onConflictDoUpdate({
      target: config.name,
      set: { value: 'romance_female_soft_coral' },
    });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skipConfig = process.argv.includes('--skip-config');
  const tables = await loadSchemaTables();
  const { roleplayCharacter } = tables;
  const profilesJson = await readFile(PROFILE_JSON_PATH, 'utf8');
  const parsedProfiles = JSON.parse(profilesJson);

  console.log('RolePlay romance voice backfill');
  console.log(`DB provider: ${envConfigs.database_provider}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'update'}`);
  console.log(`Profiles: ${parsedProfiles.length}`);
  console.log(`Apply config: ${skipConfig ? 'no' : 'yes'}`);

  await db().execute(sql`select 1`);

  const rows = (await db()
    .select()
    .from(roleplayCharacter)
    .where(ne(roleplayCharacter.status, 'deleted'))) as CharacterRow[];

  const planned = rows.map((row) => ({
    id: row.id,
    name: row.name,
    gender: row.gender,
    status: row.status,
    visibility: row.visibility,
    oldVoicePreset: row.voicePreset || '',
    newVoicePreset: chooseVoicePreset(row),
  }));

  const snapshotPath = await writeSnapshot(planned);
  console.log(`Snapshot written: ${snapshotPath}`);

  const changed = planned.filter(
    (item) => item.oldVoicePreset !== item.newVoicePreset
  );
  console.log(`Characters: ${rows.length}; changes: ${changed.length}`);
  planned.forEach((item) => {
    console.log(
      `${dryRun ? '[dry-run]' : '[plan]'} ${item.id} ${item.name}: ${item.oldVoicePreset || '(empty)'} -> ${item.newVoicePreset}`
    );
  });

  if (dryRun) {
    console.log('Dry run complete. No database rows were updated.');
    process.exit(0);
  }

  if (!skipConfig) {
    await upsertVoiceProfileConfig(tables, profilesJson);
    console.log('Updated roleplay_tts_voice_profiles config.');
  }

  for (const item of changed) {
    await db()
      .update(roleplayCharacter)
      .set({ voicePreset: item.newVoicePreset })
      .where(sql`${roleplayCharacter.id} = ${item.id}`);
    console.log(`Updated ${item.id} ${item.name}`);
  }

  console.log('Romance voice backfill complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Romance voice backfill failed:', error);
  process.exit(1);
});
