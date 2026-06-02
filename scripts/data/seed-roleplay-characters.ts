/**
 * Seed the 12 official RolePlay characters into the database.
 *
 * Behavior:
 * - Truncates dependent roleplay tables (no real users yet, see redesign doc).
 * - Ensures a system user row exists (ROLEPLAY_SYSTEM_USER from src/data/roleplay-characters).
 * - Inserts the 12 records from src/data/roleplay-characters.ts.
 * - `images` and `avatar` are stored as **filenames only** (e.g. "chloe-1.jpeg").
 *   The API converts them to absolute URLs via buildCharacterImageUrl() at read time.
 *
 * Run via:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/seed-roleplay-characters.ts
 *
 * Idempotent: re-running will wipe and re-seed only the roleplay tables.
 *
 * Safe-by-design:
 * - Only deletes from roleplay_* tables, never user/account/payment tables.
 * - Uses delete() not raw TRUNCATE so the FK cascades stay deterministic.
 */

import { eq, sql } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import {
  ROLEPLAY_OFFICIAL_CHARACTERS,
  ROLEPLAY_SYSTEM_USER,
} from '@/data/roleplay-characters';
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

  if (existing.length) {
    console.log(`System user already present: ${ROLEPLAY_SYSTEM_USER.id}`);
    return;
  }

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
  console.log(`Created system user: ${ROLEPLAY_SYSTEM_USER.id}`);
}

async function wipeRoleplayTables(tables: any) {
  // Order matters: child tables first, then parents. roleplay_character.id is
  // referenced by everything else.
  const wipeOrder = [
    'roleplayCharacterComment',
    'roleplayCharacterFollow',
    'roleplayAsset',
    'roleplayMemory',
    'roleplayMessage',
    'roleplayConversation',
    'roleplayCharacter',
  ] as const;

  for (const tableName of wipeOrder) {
    const table = tables[tableName];
    if (!table) {
      console.warn(`Skipping ${tableName}: not present in schema`);
      continue;
    }
    // db().delete(table) without a where clause deletes all rows for the table
    // it was given, never anything else.
    await db().delete(table);
    console.log(`Cleared ${tableName}`);
  }
}

async function seedCharacters(tables: any) {
  const { roleplayCharacter } = tables;

  for (const character of ROLEPLAY_OFFICIAL_CHARACTERS) {
    await db()
      .insert(roleplayCharacter)
      .values({
        id: character.id,
        userId: ROLEPLAY_SYSTEM_USER.id,
        status: 'created',
        visibility: character.visibility,
        name: character.name,
        age: character.age,
        gender: character.gender,
        authorName: ROLEPLAY_SYSTEM_USER.name,
        tagline: character.intro,
        intro: character.bio,
        opening: character.openingLine,
        avatarUrl: character.avatar,
        coverUrl: character.images[0] ?? character.avatar,
        gallery: JSON.stringify(character.images),
        tags: JSON.stringify(character.tags),
        style: '',
        relationship: '',
        scene: character.location,
        personality: JSON.stringify(character.personality),
        voice: '',
        settings: JSON.stringify({
          occupation: character.occupation,
          location: character.location,
          sortOrder: character.sortOrder,
        }),
        visualIdentity: JSON.stringify({}),
        model: '',
        metadata: JSON.stringify({
          source: 'official-seed',
          sortOrder: character.sortOrder,
        }),
    });
    await setCharacterTagSlugs(character.id, character.tagSlugs);
    console.log(`Seeded ${character.id} ${character.name}`);
  }
}

async function main() {
  console.log(
    `Seeding roleplay characters (${ROLEPLAY_OFFICIAL_CHARACTERS.length}) ...`
  );
  console.log(`DB provider: ${envConfigs.database_provider}`);

  const tables = await loadSchemaTables();

  // Sanity ping so we fail fast if DB is unreachable.
  try {
    await db().execute(sql`select 1`);
  } catch (error) {
    console.error('DB connection failed before seed:', error);
    process.exit(1);
  }

  await wipeRoleplayTables(tables);
  await ensureSystemUser(tables);
  await seedCharacters(tables);

  console.log('Seed complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
