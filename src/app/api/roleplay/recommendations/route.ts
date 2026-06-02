import { respData, respErr } from '@/shared/lib/resp';
import {
  buildCharacterImageUrl,
  buildCharacterImageUrls,
} from '@/shared/lib/roleplay-assets';
import { parseFormatStyle } from '@/shared/lib/roleplay-format-style';
import { parsePersonalityCard } from '@/shared/lib/roleplay-personality';
import { parseStyleExamples } from '@/shared/lib/roleplay-style-examples';
import {
  getCharacterTagSlugsMap,
  getRoleplayCharacters,
  getRoleplayConversations,
  isMissingRoleplayTable,
  RoleplayCharacter,
  RoleplayStatus,
  RoleplayVisibility,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { findUserById, getUserInfo } from '@/shared/models/user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 24;
const RECOMMENDATION_CANDIDATE_MULTIPLIER = 4;
const MIN_RECOMMENDATION_CANDIDATES = 32;
const RECENT_CONVERSATION_LIMIT = 24;

type BucketKey =
  | 'recent'
  | 'private'
  | 'oppositeGender'
  | 'popular'
  | 'female'
  | 'male'
  | 'other';

function clampLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.floor(parsed), 1), MAX_LIMIT);
}

function normalizeGender(value: unknown): 'male' | 'female' | 'unknown' {
  const text = String(value || '')
    .trim()
    .toLowerCase();
  if (!text) return 'unknown';
  if (['male', 'man', 'men', 'm', '男', '男性'].includes(text)) return 'male';
  if (['female', 'woman', 'women', 'f', '女', '女性'].includes(text)) {
    return 'female';
  }
  return 'unknown';
}

function inferUserGenderFromPersona(raw: string | null | undefined) {
  if (!raw) return 'unknown' as const;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return 'unknown' as const;
    return normalizeGender(
      parsed.gender ?? parsed.userGender ?? parsed.sex ?? parsed.genderIdentity
    );
  } catch {
    return 'unknown' as const;
  }
}

function sortByPopularity<T extends RoleplayCharacter>(items: T[]) {
  return [...items].sort((a, b) => {
    const chatDelta = ((b as any).chatCount ?? 0) - ((a as any).chatCount ?? 0);
    if (chatDelta !== 0) return chatDelta;
    return Number(b.updatedAt) - Number(a.updatedAt);
  });
}

function pushBucket({
  result,
  seen,
  bucketIds,
  key,
  items,
  limit,
}: {
  result: RoleplayCharacter[];
  seen: Set<string>;
  bucketIds: Record<BucketKey, string[]>;
  key: BucketKey;
  items: RoleplayCharacter[];
  limit: number;
}) {
  for (const item of items) {
    if (result.length >= limit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
    bucketIds[key].push(item.id);
  }
}

async function toClientCharacter(
  character: RoleplayCharacter,
  preloadedTagSlugs?: string[]
) {
  const galleryFilenames = safeJsonParse<string[]>(
    (character as any).gallery ?? '[]',
    []
  );
  const gallery = buildCharacterImageUrls(galleryFilenames);
  const taxonomySlugs = preloadedTagSlugs ?? [];
  const personalityCard = parsePersonalityCard(
    (character as any).personalityCard ?? '{}'
  );

  return {
    id: character.id,
    name: character.name,
    age: character.age,
    author: character.authorName,
    tagline: character.tagline,
    intro: character.intro,
    opening: character.opening,
    avatar: buildCharacterImageUrl(character.avatarUrl),
    cover: buildCharacterImageUrl(character.coverUrl),
    gallery,
    tags: safeJsonParse<string[]>(character.tags, []),
    tagSlugs: taxonomySlugs,
    skills: safeJsonParse<string[]>((character as any).skills ?? '[]', []),
    stats: String((character as any).chatCount ?? 0),
    chatCount: (character as any).chatCount ?? 0,
    likeCount: (character as any).likeCount ?? 0,
    follows:
      character.visibility === RoleplayVisibility.PUBLIC ? 'Public' : 'Private',
    style: character.style,
    relationship: character.relationship,
    scene: character.scene,
    personality: safeJsonParse<string[]>(character.personality, []),
    voice: character.voice,
    gender: character.gender,
    settings: character.settings,
    personalityCard,
    visualIdentity: safeJsonParse<Record<string, unknown>>(
      character.visualIdentity,
      {}
    ),
    imageStyleSuffix: (character as any).imageStyleSuffix ?? '',
    voicePreset: (character as any).voicePreset ?? '',
    styleExamples: parseStyleExamples((character as any).styleExamples ?? '[]'),
    formatStyle: parseFormatStyle((character as any).formatStyle),
    model: character.model,
    premium: false,
    live: false,
    source: 'database',
    visibility: character.visibility,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get('limit'));
    const user = await getUserInfo();
    const bucketIds: Record<BucketKey, string[]> = {
      recent: [],
      private: [],
      oppositeGender: [],
      popular: [],
      female: [],
      male: [],
      other: [],
    };

    const allVisible: RoleplayCharacter[] = await getRoleplayCharacters({
      userId: user?.id,
      includePublic: true,
      ownerStatuses: [RoleplayStatus.PUBLISHED],
      limit: Math.max(
        limit * RECOMMENDATION_CANDIDATE_MULTIPLIER,
        MIN_RECOMMENDATION_CANDIDATES
      ),
    });
    const publicCharacters = allVisible.filter(
      (character) =>
        character.status === RoleplayStatus.PUBLISHED &&
        character.visibility === RoleplayVisibility.PUBLIC
    );
    const result: RoleplayCharacter[] = [];
    const seen = new Set<string>();

    if (!user) {
      const popular = sortByPopularity(publicCharacters);
      const females = popular.filter(
        (character) => normalizeGender(character.gender) === 'female'
      );
      const males = popular.filter(
        (character) => normalizeGender(character.gender) === 'male'
      );

      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'popular',
        items: popular.slice(0, Math.ceil(limit / 2)),
        limit,
      });
      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'female',
        items: females,
        limit,
      });
      pushBucket({ result, seen, bucketIds, key: 'male', items: males, limit });
      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'other',
        items: popular,
        limit,
      });
    } else {
      const [dbUser, conversations] = await Promise.all([
        findUserById(user.id).catch(() => null),
        getRoleplayConversations({
          userId: user.id,
          limit: RECENT_CONVERSATION_LIMIT,
        }).catch(
          () => [] as Awaited<ReturnType<typeof getRoleplayConversations>>
        ),
      ]);
      const byId = new Map(
        allVisible.map((character) => [character.id, character])
      );
      const recentCharacters = conversations
        .map((conversation) =>
          conversation.characterId ? byId.get(conversation.characterId) : null
        )
        .filter(Boolean) as RoleplayCharacter[];
      const privateCharacters = allVisible.filter(
        (character) =>
          character.userId === user.id &&
          character.visibility === RoleplayVisibility.PRIVATE
      );
      const userGender = inferUserGenderFromPersona((dbUser as any)?.persona);
      const oppositeGender =
        userGender === 'male'
          ? 'female'
          : userGender === 'female'
            ? 'male'
            : '';
      const oppositeCharacters = oppositeGender
        ? publicCharacters.filter(
            (character) => normalizeGender(character.gender) === oppositeGender
          )
        : [];
      const otherCharacters = sortByPopularity(allVisible);

      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'recent',
        items: recentCharacters,
        limit,
      });
      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'private',
        items: privateCharacters,
        limit,
      });
      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'oppositeGender',
        items: sortByPopularity(oppositeCharacters),
        limit,
      });
      pushBucket({
        result,
        seen,
        bucketIds,
        key: 'other',
        items: otherCharacters,
        limit,
      });
    }

    const tagSlugsByCharacter = await getCharacterTagSlugsMap(
      result.map((character) => character.id)
    ).catch(() => new Map<string, string[]>());
    const characters = await Promise.all(
      result.map((character) =>
        toClientCharacter(
          character,
          tagSlugsByCharacter.get(character.id) ?? []
        )
      )
    );

    return respData({
      authenticated: Boolean(user),
      characters,
      buckets: bucketIds,
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: false,
        characters: [],
        buckets: {},
        migrationRequired: true,
      });
    }
    console.log('get roleplay recommendations failed:', e);
    return respErr(e.message || 'get roleplay recommendations failed');
  }
}
