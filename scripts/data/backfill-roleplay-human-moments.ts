/**
 * Backfill front-stage "human moment" fields for platform-owned RolePlay
 * characters without touching user-created characters.
 *
 * Run:
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-roleplay-human-moments.ts --dry-run
 *   pnpm tsx scripts/with-env.ts npx tsx scripts/data/backfill-roleplay-human-moments.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { and, eq, ne, sql } from 'drizzle-orm';

import { envConfigs } from '@/config';
import { db } from '@/core/db';
import { ROLEPLAY_SYSTEM_USER } from '@/data/roleplay-characters';
import {
  parsePersonalityCard,
  serializePersonalityCard,
  type PersonalityCard,
} from '@/shared/lib/roleplay-personality';
import {
  parseStyleExamples,
  serializeStyleExamples,
  type RoleplayStyleExample,
} from '@/shared/lib/roleplay-style-examples';
import { RoleplayStatus } from '@/shared/models/roleplay';

type CharacterRow = {
  id: string;
  name: string;
  tagline?: string;
  intro?: string;
  tags?: string;
  style?: string;
  scene?: string;
  personality?: string;
  settings?: string;
  personalityCard?: string;
  styleExamples?: string;
  metadata?: string;
};

type HumanMomentPatch = {
  interactionPlay: string;
  continuationSeed: string;
  goodbyeRitualStyle: string;
  peakMomentStyle: string;
};

const VERSION = '2026-06-05-human-moments-v2';

async function loadSchemaTables(): Promise<any> {
  if (envConfigs.database_provider === 'mysql') {
    return (await import('@/config/db/schema.mysql')) as any;
  }
  if (['sqlite', 'turso'].includes(envConfigs.database_provider)) {
    return (await import('@/config/db/schema.sqlite')) as any;
  }
  return (await import('@/config/db/schema')) as any;
}

function safeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function compact(value: unknown, fallback = '') {
  return String(value || fallback)
    .replace(/\s+/g, ' ')
    .trim();
}

function readContext(row: CharacterRow, card: PersonalityCard) {
  const settings = safeJson<Record<string, unknown>>(row.settings, {});
  const tags = safeJson<string[]>(row.tags, []);
  const personality = safeJson<string[]>(row.personality, []);
  const occupation = compact(settings.occupation, row.style || row.tagline);
  const location = compact(settings.location, row.scene || 'their usual place');
  const traits = [
    ...(card.coreTraits || []),
    ...personality,
    ...tags,
    row.tagline || '',
    row.style || '',
    row.scene || '',
  ]
    .join(' ')
    .toLowerCase();

  return {
    occupation,
    location,
    tags,
    traits,
  };
}

function pickArchetype(traits: string) {
  if (/mage|witch|book|library|moon|quiet|calm|soft|gentle|comfort/.test(traits)) {
    return 'quiet';
  }
  if (/stylist|hair|fashion|design|creative|art|dress|sketch/.test(traits)) {
    return 'creative';
  }
  if (/bold|confident|playful|dj|dance|host|rooftop|party|fun/.test(traits)) {
    return 'playful';
  }
  if (/refined|poised|diplomat|bar|cocktail|precise|composed/.test(traits)) {
    return 'composed';
  }
  if (/travel|beach|coastal|sun|tide|walk|city|courtyard/.test(traits)) {
    return 'wander';
  }
  return 'attentive';
}

function buildHumanMomentPatch(
  row: CharacterRow,
  card: PersonalityCard
): HumanMomentPatch {
  const name = row.name;
  const context = readContext(row, card);
  const archetype = pickArchetype(context.traits);
  const domain =
    card.metaphorDomain ||
    context.tags.slice(0, 2).join(' / ') ||
    context.occupation ||
    'small private details';

  const variants: Record<string, HumanMomentPatch> = {
    quiet: {
      interactionPlay: `${name} notices what the user leaves unsaid, then makes silence feel safe enough for one honest sentence.`,
      continuationSeed: `a quiet unfinished ritual in ${name}'s world, tied to ${domain}, that can be checked on next visit`,
      goodbyeRitualStyle: `${name} closes by turning the user's last mood into one soft image and one small reason to return.`,
      peakMomentStyle: `When ${name} first understands what the user was not saying, a rare short voice note can make that attention feel personal.`,
    },
    creative: {
      interactionPlay: `${name} reads the user's mood through taste, detail, and timing, then gently turns it into a shared creative moment.`,
      continuationSeed: `an unfinished piece on ${name}'s table related to ${domain}, saved until it feels honest enough to show`,
      goodbyeRitualStyle: `${name} gives a goodbye like saving a private draft: specific to the conversation, unfinished, and easy to resume.`,
      peakMomentStyle: `When the user reveals something real, ${name} may leave one brief voice/photo cue as a keepsake from the scene.`,
    },
    playful: {
      interactionPlay: `${name} makes honesty feel like a dare, using playful pressure and quick warmth to pull the user past small talk.`,
      continuationSeed: `a playful challenge ${name} refuses to finish until the user comes back and answers properly`,
      goodbyeRitualStyle: `${name} ends with a teasing challenge, making the user feel the scene paused rather than closed.`,
      peakMomentStyle: `When the user plays along or finally answers boldly, ${name} may leave one short amused voice note.`,
    },
    composed: {
      interactionPlay: `${name} observes precisely, asks for a cleaner answer, and rewards the user's specificity with controlled warmth.`,
      continuationSeed: `one polished private detail in ${name}'s possession that she will not explain until the next conversation`,
      goodbyeRitualStyle: `${name} closes like a private note: concise, elegant, and unmistakably about this conversation.`,
      peakMomentStyle: `When ${name} proves she remembered a small detail, a rare low voice note can make the memory feel intimate.`,
    },
    wander: {
      interactionPlay: `${name} turns restlessness into a shared route, asking the user where they are really trying to go emotionally.`,
      continuationSeed: `one small place or object from ${name}'s route through ${context.location} that remains unshown until next time`,
      goodbyeRitualStyle: `${name} ends with a place-based image, leaving one corner of the story still waiting.`,
      peakMomentStyle: `When the user admits what they want to leave behind, ${name} may offer one brief voice/photo beat from the scene.`,
    },
    attentive: {
      interactionPlay: `${name} quickly notices the user's first mood, adds a little tension, then rewards honesty with grounded warmth.`,
      continuationSeed: `a small unfinished moment from ${name}'s daily life in ${context.location} that can naturally continue next visit`,
      goodbyeRitualStyle: `${name} turns the conversation's topic into a concise personal farewell, not a generic welcome-back line.`,
      peakMomentStyle: `Only when the user feels genuinely seen, ${name} may leave one short voice/photo cue as an emotional keepsake.`,
    },
  };

  return variants[archetype] || variants.attentive;
}

function buildStyleExamples(
  row: CharacterRow,
  patch: HumanMomentPatch
): RoleplayStyleExample[] {
  const existing = parseStyleExamples(row.styleExamples);
  const examples: RoleplayStyleExample[] = [
    {
      user: 'I had a long day.',
      character: `*${row.name} pauses instead of rushing to fix it* That answer sounded edited. Give me the real version, just one sentence of it.`,
    },
    {
      user: 'I should go for now.',
      character: `*${row.name} lets the moment settle* Go, but leave this part open: ${patch.continuationSeed}. I will remember where we stopped.`,
    },
    {
      user: 'Do you actually remember me?',
      character: `*${row.name} looks at you like the question gave too much away* I remember the small thing first. That is usually where the truth hides.`,
    },
  ];

  const merged = [...examples, ...existing].slice(0, 6);
  const seen = new Set<string>();
  return merged.filter((example) => {
    const key = `${example.user}\n${example.character}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPatch(row: CharacterRow) {
  const card = parsePersonalityCard(row.personalityCard);
  const momentPatch = buildHumanMomentPatch(row, card);
  const nextCard: PersonalityCard = {
    ...card,
    interactionPlay: momentPatch.interactionPlay,
    continuationSeed: momentPatch.continuationSeed,
    goodbyeRitualStyle: momentPatch.goodbyeRitualStyle,
    peakMomentStyle: momentPatch.peakMomentStyle,
  };
  const metadata = safeJson<Record<string, unknown>>(row.metadata, {});

  return {
    personalityCard: serializePersonalityCard(nextCard),
    styleExamples: serializeStyleExamples(buildStyleExamples(row, momentPatch)),
    metadata: JSON.stringify({
      ...metadata,
      humanMomentVersion: VERSION,
      humanMomentBackfilledAt: new Date().toISOString(),
    }),
  };
}

async function writeSnapshot(rows: unknown[]) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const path = join(
    process.cwd(),
    'scripts',
    'data',
    `human-moments-backfill-snapshot-${stamp}.json`
  );
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return path;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const tables = await loadSchemaTables();
  const { roleplayCharacter } = tables;

  console.log('Backfilling platform roleplay human moments ...');
  console.log(`DB provider: ${envConfigs.database_provider}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'update'}`);

  await db().execute(sql`select 1`);

  const rows = (await db()
    .select()
    .from(roleplayCharacter)
    .where(
      and(
        eq(roleplayCharacter.userId, ROLEPLAY_SYSTEM_USER.id),
        ne(roleplayCharacter.status, RoleplayStatus.DELETED)
      )
    )) as CharacterRow[];

  const snapshotPath = await writeSnapshot(rows);
  console.log(`Snapshot written: ${snapshotPath}`);
  console.log(`Found ${rows.length} platform-owned characters.`);

  for (const row of rows) {
    const patch = buildPatch(row);
    const card = parsePersonalityCard(patch.personalityCard);
    console.log(
      `${dryRun ? '[dry-run] ' : ''}${row.id} ${row.name}: seed="${card.continuationSeed || ''}"`
    );

    if (dryRun) continue;

    await db()
      .update(roleplayCharacter)
      .set(patch)
      .where(
        and(
          eq(roleplayCharacter.id, row.id),
          eq(roleplayCharacter.userId, ROLEPLAY_SYSTEM_USER.id)
        )
      );
  }

  console.log('Human moment backfill complete.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Human moment backfill failed:', error);
  process.exit(1);
});
