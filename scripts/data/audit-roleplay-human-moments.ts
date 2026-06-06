/**
 * Read-only audit for platform-owned RolePlay human moment fields.
 *
 * Run:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/audit-roleplay-human-moments.ts
 */

import { and, eq, ne } from 'drizzle-orm';

import { db } from '@/core/db';
import { roleplayCharacter } from '@/config/db/schema';
import { ROLEPLAY_SYSTEM_USER } from '@/data/roleplay-characters';
import { parsePersonalityCard } from '@/shared/lib/roleplay-personality';
import { RoleplayStatus } from '@/shared/models/roleplay';

type AuditRow = {
  id: string;
  name: string;
  personalityCard: string;
  metadata: string | null;
};

async function main() {
  const rows = (await db()
    .select({
      id: roleplayCharacter.id,
      name: roleplayCharacter.name,
      personalityCard: roleplayCharacter.personalityCard,
      metadata: roleplayCharacter.metadata,
    })
    .from(roleplayCharacter)
    .where(
      and(
        eq(roleplayCharacter.userId, ROLEPLAY_SYSTEM_USER.id),
        ne(roleplayCharacter.status, RoleplayStatus.DELETED)
      )
    )) as AuditRow[];

  const missing = rows.filter((row) => {
    const card = parsePersonalityCard(row.personalityCard);
    return (
      !card.interactionPlay ||
      !card.continuationSeed ||
      !card.goodbyeRitualStyle ||
      !card.peakMomentStyle
    );
  });

  const sampleIds = new Set(['rp-001', 'rp-008', 'rp-anime-001']);
  const samples = rows
    .filter((row) => sampleIds.has(row.id))
    .map((row) => {
      const card = parsePersonalityCard(row.personalityCard);
      return {
        id: row.id,
        name: row.name,
        interactionPlay: card.interactionPlay,
        continuationSeed: card.continuationSeed,
        goodbyeRitualStyle: card.goodbyeRitualStyle,
        peakMomentStyle: card.peakMomentStyle,
        metadata: row.metadata,
      };
    });

  console.log(
    JSON.stringify(
      {
        total: rows.length,
        missing: missing.map((row) => row.id),
        samples,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
