import type { RoleplayTagItem } from '@/shared/components/roleplay/tag-chips';
import {
  buildCharacterImageUrl,
  buildCharacterImageUrls,
} from '@/shared/lib/roleplay-assets';
import type { RoleplayCharacterClient } from '@/shared/lib/roleplay-client';
import { parseFormatStyle } from '@/shared/lib/roleplay-format-style';
import { parsePersonalityCard } from '@/shared/lib/roleplay-personality';
import { parseStyleExamples } from '@/shared/lib/roleplay-style-examples';
import {
  getCharacterTagSlugsMap,
  getRoleplayCharacters,
  getRoleplayConversations,
  getRoleplayTags,
  isMissingRoleplayTable,
  RoleplayCharacter,
  RoleplayStatus,
  RoleplayVisibility,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { findUserById, getUserInfo } from '@/shared/models/user';

export const ROLEPLAY_HOME_RECOMMENDATION_LIMIT = 12;
export const ROLEPLAY_HOME_EXPLORE_LIMIT = 24;

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

export type RoleplayHomeInitialData = {
  authenticated: boolean;
  characters: RoleplayCharacterClient[];
  recommendedCharacters: RoleplayCharacterClient[];
  tags: RoleplayTagItem[];
  buckets: Record<BucketKey, string[]>;
  migrationRequired?: boolean;
};

function emptyBuckets(): Record<BucketKey, string[]> {
  return {
    recent: [],
    private: [],
    oppositeGender: [],
    popular: [],
    female: [],
    male: [],
    other: [],
  };
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

function toClientCharacter(
  character: RoleplayCharacter,
  preloadedTagSlugs: string[] = []
): RoleplayCharacterClient {
  const galleryFilenames = safeJsonParse<string[]>(
    (character as any).gallery ?? '[]',
    []
  );
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
    gallery: buildCharacterImageUrls(galleryFilenames),
    tags: safeJsonParse<string[]>(character.tags, []),
    tagSlugs: preloadedTagSlugs,
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
    voicePreset: (character as any).voicePreset ?? '',
    gender: character.gender,
    settings: character.settings,
    personalityCard,
    formatStyle: parseFormatStyle((character as any).formatStyle),
    styleExamples: parseStyleExamples((character as any).styleExamples ?? '[]'),
    visualIdentity: safeJsonParse<Record<string, unknown>>(
      character.visualIdentity,
      {}
    ),
    imageStyleSuffix: (character as any).imageStyleSuffix ?? '',
    model: character.model,
    status: character.status as RoleplayCharacterClient['status'],
    premium: false,
    live: false,
    source: 'database',
    visibility:
      character.visibility === RoleplayVisibility.PUBLIC ? 'public' : 'private',
  };
}

async function toClientCharacters(characters: RoleplayCharacter[]) {
  const tagSlugsByCharacter = await getCharacterTagSlugsMap(
    characters.map((character) => character.id)
  ).catch(() => new Map<string, string[]>());

  return characters.map((character) =>
    toClientCharacter(character, tagSlugsByCharacter.get(character.id) ?? [])
  );
}

async function buildRecommendations({
  user,
  allVisible,
  limit,
}: {
  user: Awaited<ReturnType<typeof getUserInfo>>;
  allVisible: RoleplayCharacter[];
  limit: number;
}) {
  const bucketIds = emptyBuckets();
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

    return {
      characters: result,
      buckets: bucketIds,
    };
  }

  const [dbUser, conversations] = await Promise.all([
    findUserById(user.id).catch(() => null),
    getRoleplayConversations({
      userId: user.id,
      limit: RECENT_CONVERSATION_LIMIT,
    }).catch(() => [] as Awaited<ReturnType<typeof getRoleplayConversations>>),
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
    userGender === 'male' ? 'female' : userGender === 'female' ? 'male' : '';
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

  return {
    characters: result,
    buckets: bucketIds,
  };
}

export async function getRoleplayHomeInitialData(): Promise<RoleplayHomeInitialData> {
  let authenticated = false;
  try {
    const user = await getUserInfo();
    authenticated = Boolean(user);
    const candidateLimit = Math.max(
      ROLEPLAY_HOME_EXPLORE_LIMIT,
      ROLEPLAY_HOME_RECOMMENDATION_LIMIT * RECOMMENDATION_CANDIDATE_MULTIPLIER,
      MIN_RECOMMENDATION_CANDIDATES
    );
    const [allVisible, tags] = await Promise.all([
      getRoleplayCharacters({
        userId: user?.id,
        includePublic: true,
        ownerStatuses: [RoleplayStatus.PUBLISHED],
        limit: candidateLimit,
      }),
      getRoleplayTags().catch(() => []),
    ]);
    const exploreCharacters = allVisible.slice(0, ROLEPLAY_HOME_EXPLORE_LIMIT);
    const recommendationPlan = await buildRecommendations({
      user,
      allVisible,
      limit: ROLEPLAY_HOME_RECOMMENDATION_LIMIT,
    });
    const [characters, recommendedCharacters] = await Promise.all([
      toClientCharacters(exploreCharacters),
      toClientCharacters(recommendationPlan.characters),
    ]);

    return {
      authenticated,
      characters,
      recommendedCharacters,
      tags: tags.map((tag) => ({
        slug: tag.slug,
        labelEn: tag.labelEn,
        labelZh: tag.labelZh,
      })),
      buckets: recommendationPlan.buckets,
    };
  } catch (error) {
    if (isMissingRoleplayTable(error)) {
      return {
        authenticated,
        characters: [],
        recommendedCharacters: [],
        tags: [],
        buckets: emptyBuckets(),
        migrationRequired: true,
      };
    }
    console.log('load roleplay home initial data failed:', error);
    return {
      authenticated: false,
      characters: [],
      recommendedCharacters: [],
      tags: [],
      buckets: emptyBuckets(),
    };
  }
}
