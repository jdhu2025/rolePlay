/**
 * Upsert the platform-owned original anime RolePlay characters.
 *
 * This script is intentionally non-destructive:
 * - It creates the system user if missing.
 * - It inserts or updates only rows whose ids are in
 *   ROLEPLAY_ANIME_CHARACTERS (rp-anime-001 .. rp-anime-020).
 * - It replaces tag bindings only for those rows.
 *
 * Run:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/upsert-roleplay-anime-characters.ts --dry-run
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/upsert-roleplay-anime-characters.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { ROLEPLAY_ANIME_CHARACTERS } from '@/data/roleplay-anime-characters';
import { ROLEPLAY_SYSTEM_USER } from '@/data/roleplay-characters';
import { serializeFormatStyle } from '@/shared/lib/roleplay-format-style';
import { serializePersonalityCard } from '@/shared/lib/roleplay-personality';
import { serializeStyleExamples } from '@/shared/lib/roleplay-style-examples';
import { setCharacterTagSlugs } from '@/shared/models/roleplay';

async function loadSchemaTables(): Promise<any> {
  if (envConfigs.database_provider === 'mysql') {
    return (await import('@/config/db/schema.mysql')) as any;
  }
  if (['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    return (await import('@/config/db/schema.sqlite')) as any;
  }
  return (await import('@/config/db/schema')) as any;
}

async function ensureSystemUser(tables: any) {
  const { user } = tables;
  const existing = await db()
    .select()
    .from(user)
    .where(eq(user.id, ROLEPLAY_SYSTEM_USER.id))
    .limit(1);

  if (existing.length) return;

  await db()
    .insert(user)
    .values({
      id: ROLEPLAY_SYSTEM_USER.id,
      name: ROLEPLAY_SYSTEM_USER.name,
      email: ROLEPLAY_SYSTEM_USER.email,
      emailVerified: ROLEPLAY_SYSTEM_USER.emailVerified,
      utmSource: ROLEPLAY_SYSTEM_USER.utmSource,
      ip: ROLEPLAY_SYSTEM_USER.ip,
      locale: ROLEPLAY_SYSTEM_USER.locale,
    });
}

function buildRow(character: (typeof ROLEPLAY_ANIME_CHARACTERS)[number]) {
  const metadata = {
    source: 'anime-original-batch',
    batch: 'anime-companions-001',
    sortOrder: character.sortOrder,
    cnName: character.cnName,
    faction: character.faction,
    codename: character.codename,
    nickname: character.nickname,
    assetStatus: 'generated',
    updatedAt: new Date().toISOString(),
  };

  return {
    id: character.id,
    userId: ROLEPLAY_SYSTEM_USER.id,
    status: 'published',
    visibility: 'public',
    name: character.name,
    age: character.age,
    gender: character.gender,
    authorName: ROLEPLAY_SYSTEM_USER.name,
    tagline: character.tagline,
    intro: character.intro,
    opening: character.opening,
    avatarUrl: character.avatar,
    coverUrl: character.images[0] ?? character.avatar,
    gallery: JSON.stringify(character.images),
    tags: JSON.stringify(character.tags),
    skills: JSON.stringify([]),
    style: character.style,
    relationship: character.relationship,
    scene: character.scene,
    personality: JSON.stringify(character.personality),
    voice: '',
    settings: JSON.stringify({
      occupation: character.occupation,
      location: character.location,
      sortOrder: character.sortOrder,
      cnName: character.cnName,
      faction: character.faction,
      codename: character.codename,
      nickname: character.nickname,
    }),
    personalityCard: serializePersonalityCard(character.personalityCard),
    visualIdentity: JSON.stringify(character.visualIdentity),
    imageStyleSuffix: character.imageStyleSuffix,
    voicePreset: character.voicePreset,
    styleExamples: serializeStyleExamples(character.styleExamples),
    formatStyle: serializeFormatStyle(character.formatStyle),
    model: '',
    rejectionReason: '',
    metadata: JSON.stringify(metadata),
  };
}

async function writeSnapshot(rows: unknown[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(
    process.cwd(),
    'scripts',
    'data',
    `anime-upsert-snapshot-${stamp}.json`
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return path;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tables = await loadSchemaTables();
  const { roleplayCharacter } = tables;
  const ids = ROLEPLAY_ANIME_CHARACTERS.map((character) => character.id);

  console.log(`Upserting anime characters (${ids.length}) ...`);
  console.log(`DB provider: ${envConfigs.database_provider}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'update'}`);

  await db().execute(sql`select 1`);
  await ensureSystemUser(tables);

  const existingRows = await db()
    .select()
    .from(roleplayCharacter)
    .where(inArray(roleplayCharacter.id, ids));
  const snapshotPath = await writeSnapshot(existingRows);
  console.log(`Snapshot written: ${snapshotPath}`);

  const existingIds = new Set(existingRows.map((row: any) => row.id));

  for (const character of ROLEPLAY_ANIME_CHARACTERS) {
    const row = buildRow(character);
    const action = existingIds.has(character.id) ? 'update' : 'insert';
    console.log(
      `${dryRun ? '[dry-run] ' : ''}${action} ${character.id} ${character.name} (${character.gender}, ${character.faction})`
    );

    if (dryRun) continue;

    if (action === 'update') {
      const { id: _id, userId: _userId, ...patch } = row;
      await db()
        .update(roleplayCharacter)
        .set(patch)
        .where(
          and(
            eq(roleplayCharacter.id, character.id),
            eq(roleplayCharacter.userId, ROLEPLAY_SYSTEM_USER.id)
          )
        );
    } else {
      await db().insert(roleplayCharacter).values(row);
    }

    await setCharacterTagSlugs(character.id, character.tagSlugs);
  }

  console.log('Anime character upsert complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Anime character upsert failed:', error);
  process.exit(1);
});
