/**
 * Backfill canonical roleplay category tags for the current character set.
 *
 * This is intentionally non-destructive: it only replaces rows in
 * roleplay_character_tag for characters that match the known official
 * characters, plus user-published Chloe variants. It does not delete or
 * rewrite roleplay_character rows.
 *
 * Run:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-roleplay-category-tags.ts --dry-run
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-roleplay-category-tags.ts
 */

import { asc } from 'drizzle-orm';

import { db } from '@/core/db';
import { roleplayCharacter } from '@/config/db/schema';
import { ROLEPLAY_OFFICIAL_CHARACTERS } from '@/data/roleplay-characters';
import {
  getCharacterTagSlugs,
  getRoleplayTags,
  RoleplayStatus,
  setCharacterTagSlugs,
} from '@/shared/models/roleplay';

type CharacterRow = typeof roleplayCharacter.$inferSelect;

const dryRun = process.argv.includes('--dry-run');

const officialById = new Map(
  ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => [
    character.id,
    character.tagSlugs,
  ])
);

function categorySlugsFor(character: CharacterRow) {
  const byId = officialById.get(character.id);
  if (byId) return byId;

  const normalizedName = character.name.trim().toLowerCase();
  if (normalizedName === 'chloe') {
    return ['muses', 'original', 'recommend'];
  }

  return null;
}

async function main() {
  const canonicalTags = await getRoleplayTags();
  const canonicalSlugs = new Set(canonicalTags.map((tag) => tag.slug));
  const rows = (await db()
    .select()
    .from(roleplayCharacter)
    .orderBy(asc(roleplayCharacter.createdAt))) as CharacterRow[];

  const publicRows = rows.filter(
    (character: CharacterRow) =>
      character.status === RoleplayStatus.PUBLISHED &&
      character.visibility === 'public'
  );
  const matched = publicRows
    .map((character: CharacterRow) => ({
      character,
      slugs: categorySlugsFor(character),
    }))
    .filter(
      (
        item: { character: CharacterRow; slugs: string[] | null }
      ): item is { character: CharacterRow; slugs: string[] } =>
        Boolean(item.slugs)
    );

  console.log(
    `Found ${publicRows.length} published public characters, ${matched.length} matched for category backfill.`
  );

  for (const { character, slugs } of matched) {
    const validSlugs = slugs.filter((slug: string) => canonicalSlugs.has(slug));
    const before = await getCharacterTagSlugs(character.id).catch(
      () => [] as string[]
    );
    console.log(
      `${dryRun ? '[dry-run] ' : ''}${character.id} ${character.name} (${character.status}/${character.visibility}): ${before.join(', ') || 'none'} -> ${validSlugs.join(', ')}`
    );
    if (!dryRun) {
      await setCharacterTagSlugs(character.id, validSlugs);
    }
  }

  const unmatched = publicRows.filter(
    (character: CharacterRow) => !categorySlugsFor(character)
  );
  if (unmatched.length) {
    console.log(
      `Skipped ${unmatched.length} unmatched characters: ${unmatched
        .map((character: CharacterRow) => `${character.id} ${character.name}`)
        .join('; ')}`
    );
  }
}

main()
  .then(() => {
    console.log(dryRun ? 'Dry run complete.' : 'Backfill complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exit(1);
  });
