import { and, asc, desc, eq, gte, inArray, or, sql } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  roleplayAsset,
  roleplayCharacter,
  roleplayCharacterComment,
  roleplayCharacterFollow,
  roleplayCharacterTag,
  roleplayConversation,
  roleplayMemory,
  roleplayMessage,
  roleplayQualityEvaluation,
  roleplayQualityEvent,
  roleplayTag,
} from '@/config/db/schema';
import { withTransientDatabaseRetry } from '@/shared/lib/db-resilience';
import { getUuid } from '@/shared/lib/hash';
import { getConfiguredDatabaseRetryOptions } from '@/shared/lib/server/db-retry-config';

/**
 * Lifecycle for `roleplay_character.status`.
 *
 * - DRAFT: user is editing, only owner can see.
 * - UNDER_REVIEW: user pressed Publish; awaits admin moderation.
 * - PUBLISHED: visible in the public picker.
 * - REJECTED: admin denied; owner can edit and resubmit (becomes DRAFT again).
 * - DELETED: soft-delete tombstone.
 *
 * Reused for sibling tables (conversation/message/follow/comment/asset/memory)
 * to keep the soft-delete idiom consistent — those only ever use
 * `CREATED`-style values which we map onto PUBLISHED here. New code should
 * prefer the explicit lifecycle values.
 */
export enum RoleplayStatus {
  DRAFT = 'draft',
  UNDER_REVIEW = 'under_review',
  PUBLISHED = 'published',
  REJECTED = 'rejected',
  DELETED = 'deleted',
  /**
   * Legacy alias kept for non-character tables (conversation/message/follow/...)
   * whose row-level "is the row alive" status was originally `'created'`.
   * Migration 0004 backfills any character rows still on this value to
   * PUBLISHED, so for `roleplay_character` callers should never write CREATED
   * going forward.
   */
  CREATED = 'created',
}

/** Statuses used as the "alive" marker for non-character tables. */
const ALIVE_STATUSES = [RoleplayStatus.CREATED, RoleplayStatus.PUBLISHED];

export const ROLEPLAY_CHARACTER_VISIBLE_STATUSES = [RoleplayStatus.PUBLISHED];

export enum RoleplayVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export type RoleplayCharacter = typeof roleplayCharacter.$inferSelect;
export type NewRoleplayCharacter = typeof roleplayCharacter.$inferInsert;
export type UpdateRoleplayCharacter = Partial<
  Omit<NewRoleplayCharacter, 'id' | 'userId' | 'createdAt'>
>;

export type RoleplayConversation = typeof roleplayConversation.$inferSelect;
export type NewRoleplayConversation = typeof roleplayConversation.$inferInsert;
export type UpdateRoleplayConversation = Partial<
  Omit<NewRoleplayConversation, 'id' | 'userId' | 'createdAt'>
>;

export type RoleplayMessage = typeof roleplayMessage.$inferSelect;
export type NewRoleplayMessage = typeof roleplayMessage.$inferInsert;

export type RoleplayAsset = typeof roleplayAsset.$inferSelect;
export type NewRoleplayAsset = typeof roleplayAsset.$inferInsert;

export type RoleplayMemory = typeof roleplayMemory.$inferSelect;
export type NewRoleplayMemory = typeof roleplayMemory.$inferInsert;

export type RoleplayTag = typeof roleplayTag.$inferSelect;

export type RoleplayCharacterComment =
  typeof roleplayCharacterComment.$inferSelect;
export type RoleplayQualityEvent = typeof roleplayQualityEvent.$inferSelect;
export type NewRoleplayQualityEvent = typeof roleplayQualityEvent.$inferInsert;
export type RoleplayQualityEvaluation =
  typeof roleplayQualityEvaluation.$inferSelect;
export type NewRoleplayQualityEvaluation =
  typeof roleplayQualityEvaluation.$inferInsert;

export function safeJsonParse<T>(
  value: string | null | undefined,
  fallback: T
): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function serializeJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export function isMissingRoleplayTable(error: any) {
  const message = String(error?.message || '');
  return (
    error?.cause?.code === '42P01' ||
    error?.code === '42P01' ||
    message.includes('roleplay_character') ||
    message.includes('roleplay_conversation') ||
    message.includes('roleplay_message') ||
    message.includes('roleplay_memory') ||
    message.includes('roleplay_asset') ||
    message.includes('roleplay_character_follow') ||
    message.includes('roleplay_character_comment') ||
    message.includes('roleplay_quality_event') ||
    message.includes('roleplay_quality_evaluation') ||
    message.includes('roleplay_character_tag') ||
    message.includes('roleplay_tag')
  );
}

export async function createRoleplayCharacter(
  character: Omit<NewRoleplayCharacter, 'id'> & { id?: string }
) {
  const [result] = await db()
    .insert(roleplayCharacter)
    .values({
      ...character,
      id: character.id || getUuid(),
    })
    .returning();

  return result as RoleplayCharacter;
}

export async function getRoleplayCharacters({
  userId,
  includePublic = true,
  tagSlug,
  ownerStatuses,
  limit,
}: {
  userId?: string;
  includePublic?: boolean;
  /** Optional taxonomy filter; matches via roleplay_character_tag join. */
  tagSlug?: string;
  /**
   * Which statuses are included for the *current owner*. Public listing
   * always uses PUBLISHED only. Defaults to PUBLISHED — pass DRAFT/UNDER_REVIEW
   * etc when listing the user's own working set (e.g. /create page).
   */
  ownerStatuses?: RoleplayStatus[];
  limit?: number;
}) {
  const visibleOwnerStatuses = ownerStatuses?.length
    ? ownerStatuses
    : [RoleplayStatus.PUBLISHED];
  const rowLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : undefined;

  const baseQuery = db().select().from(roleplayCharacter);

  // Owner sees their own rows in any of the requested statuses, public sees
  // only published+public. Owners always see their own published private rows
  // too, so we include the owner clause regardless of includePublic.
  const ownerClause = userId
    ? and(
        eq(roleplayCharacter.userId, userId),
        inArray(roleplayCharacter.status, visibleOwnerStatuses)
      )
    : undefined;
  const publicClause = includePublic
    ? and(
        eq(roleplayCharacter.status, RoleplayStatus.PUBLISHED),
        eq(roleplayCharacter.visibility, RoleplayVisibility.PUBLIC)
      )
    : undefined;

  const visibility =
    ownerClause && publicClause
      ? or(ownerClause, publicClause)
      : (ownerClause ?? publicClause);

  if (!visibility) return [] as RoleplayCharacter[];

  if (tagSlug) {
    // Filter via the tag junction. Inner-join keeps only characters bound
    // to the given tag slug.
    const result = await db()
      .select({ character: roleplayCharacter })
      .from(roleplayCharacter)
      .innerJoin(
        roleplayCharacterTag,
        eq(roleplayCharacterTag.characterId, roleplayCharacter.id)
      )
      .innerJoin(roleplayTag, eq(roleplayTag.id, roleplayCharacterTag.tagId))
      .where(and(visibility, eq(roleplayTag.slug, tagSlug)))
      .orderBy(desc(roleplayCharacter.updatedAt))
      .limit(rowLimit ?? 1000);
    return result.map((row: { character: RoleplayCharacter }) => row.character);
  }

  const result = await baseQuery
    .where(visibility)
    .orderBy(desc(roleplayCharacter.updatedAt))
    .limit(rowLimit ?? 1000);

  return result as RoleplayCharacter[];
}

export async function findRoleplayCharacterById(id: string) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayCharacter[]>(
    () =>
      db()
        .select()
        .from(roleplayCharacter)
        .where(eq(roleplayCharacter.id, id))
        .limit(1),
    retryOptions
  );

  return result as RoleplayCharacter | undefined;
}

/**
 * Cross-user listing for the admin moderation queue. Filters by status,
 * defaults to UNDER_REVIEW, sorted oldest-first so reviewers work through
 * a FIFO queue instead of stacking on the latest submission.
 */
export async function getRoleplayCharactersForReview({
  status = RoleplayStatus.UNDER_REVIEW,
  limit = 100,
}: {
  status?: RoleplayStatus;
  limit?: number;
} = {}) {
  const result = await db()
    .select()
    .from(roleplayCharacter)
    .where(eq(roleplayCharacter.status, status))
    .orderBy(asc(roleplayCharacter.updatedAt))
    .limit(limit);
  return result as RoleplayCharacter[];
}

export async function updateRoleplayCharacter(
  id: string,
  update: UpdateRoleplayCharacter
) {
  const [result] = await db()
    .update(roleplayCharacter)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(roleplayCharacter.id, id))
    .returning();

  return result as RoleplayCharacter;
}

export async function createRoleplayConversation(
  conversation: Omit<NewRoleplayConversation, 'id'> & { id?: string }
) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayConversation[]>(
    () =>
      db()
        .insert(roleplayConversation)
        .values({
          ...conversation,
          id: conversation.id || getUuid(),
        })
        .returning(),
    retryOptions
  );

  return result as RoleplayConversation;
}

export async function getRoleplayConversations({
  userId,
  limit,
}: {
  userId: string;
  limit?: number;
}) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const rowLimit =
    typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : undefined;
  const result = await withTransientDatabaseRetry<RoleplayConversation[]>(
    () =>
      db()
        .select()
        .from(roleplayConversation)
        .where(
          and(
            eq(roleplayConversation.userId, userId),
            eq(roleplayConversation.status, RoleplayStatus.CREATED)
          )
        )
        .orderBy(desc(roleplayConversation.updatedAt))
        .limit(rowLimit ?? 1000),
    retryOptions
  );

  return result as RoleplayConversation[];
}

export async function findLatestRoleplayConversationForCharacter({
  userId,
  characterId,
  scanLimit = 40,
}: {
  userId: string;
  characterId: string;
  scanLimit?: number;
}) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const trimmedCharacterId = characterId.trim();
  if (!trimmedCharacterId) return undefined;

  const [directMatch] = await withTransientDatabaseRetry<
    RoleplayConversation[]
  >(
    () =>
      db()
        .select()
        .from(roleplayConversation)
        .where(
          and(
            eq(roleplayConversation.userId, userId),
            eq(roleplayConversation.status, RoleplayStatus.CREATED),
            eq(roleplayConversation.characterId, trimmedCharacterId)
          )
        )
        .orderBy(desc(roleplayConversation.updatedAt))
        .limit(1),
    retryOptions
  );
  if (directMatch) return directMatch as RoleplayConversation;

  const recentConversations = await withTransientDatabaseRetry<
    RoleplayConversation[]
  >(
    () =>
      db()
        .select()
        .from(roleplayConversation)
        .where(
          and(
            eq(roleplayConversation.userId, userId),
            eq(roleplayConversation.status, RoleplayStatus.CREATED)
          )
        )
        .orderBy(desc(roleplayConversation.updatedAt))
        .limit(scanLimit),
    retryOptions
  );

  return recentConversations.find((conversation) => {
    const snapshot = safeJsonParse<{ id?: string }>(
      conversation.characterSnapshot,
      {}
    );
    return snapshot.id === trimmedCharacterId;
  }) as RoleplayConversation | undefined;
}

export async function findRoleplayConversationById(id: string) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayConversation[]>(
    () =>
      db()
        .select()
        .from(roleplayConversation)
        .where(eq(roleplayConversation.id, id))
        .limit(1),
    retryOptions
  );

  return result as RoleplayConversation | undefined;
}

export async function updateRoleplayConversation(
  id: string,
  update: UpdateRoleplayConversation
) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayConversation[]>(
    () =>
      db()
        .update(roleplayConversation)
        .set({ ...update, updatedAt: new Date() })
        .where(eq(roleplayConversation.id, id))
        .returning(),
    retryOptions
  );

  return result as RoleplayConversation;
}

export async function upsertRoleplayConversationMemory({
  id,
  memorySummary,
}: {
  id: string;
  memorySummary: string;
}) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayConversation[]>(
    () =>
      db()
        .update(roleplayConversation)
        .set({ memorySummary, updatedAt: new Date() })
        .where(eq(roleplayConversation.id, id))
        .returning(),
    retryOptions
  );

  return result as RoleplayConversation;
}

export async function createRoleplayMessage(
  message: Omit<NewRoleplayMessage, 'id'> & { id?: string }
) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayMessage[]>(
    () =>
      db()
        .insert(roleplayMessage)
        .values({
          ...message,
          id: message.id || getUuid(),
        })
        .returning(),
    retryOptions
  );

  return result as RoleplayMessage;
}

export async function getRoleplayMessages({
  conversationId,
  limit = 50,
  latest = false,
}: {
  conversationId: string;
  limit?: number;
  latest?: boolean;
}) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const result = await withTransientDatabaseRetry<RoleplayMessage[]>(
    () =>
      db()
        .select()
        .from(roleplayMessage)
        .where(
          and(
            eq(roleplayMessage.conversationId, conversationId),
            eq(roleplayMessage.status, RoleplayStatus.CREATED)
          )
        )
        .orderBy(
          latest
            ? desc(roleplayMessage.createdAt)
            : asc(roleplayMessage.createdAt)
        )
        .limit(limit),
    retryOptions
  );

  return (latest ? result.reverse() : result) as RoleplayMessage[];
}

export async function getRoleplayMemories({
  userId,
  characterId,
  conversationId,
}: {
  userId: string;
  characterId?: string | null;
  conversationId?: string | null;
}) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const result = await withTransientDatabaseRetry<RoleplayMemory[]>(
    () =>
      db()
        .select()
        .from(roleplayMemory)
        .where(
          and(
            eq(roleplayMemory.userId, userId),
            eq(roleplayMemory.status, RoleplayStatus.CREATED),
            characterId
              ? eq(roleplayMemory.characterId, characterId)
              : undefined,
            conversationId
              ? eq(roleplayMemory.conversationId, conversationId)
              : undefined
          )
        )
        .orderBy(desc(roleplayMemory.updatedAt))
        .limit(12),
    retryOptions
  );

  return result;
}

export async function createRoleplayAsset(
  asset: Omit<NewRoleplayAsset, 'id'> & { id?: string }
) {
  const [result] = await db()
    .insert(roleplayAsset)
    .values({
      ...asset,
      id: asset.id || getUuid(),
    })
    .returning();

  return result as RoleplayAsset;
}

export async function getRoleplayAssets({
  userId,
  type,
  characterId,
  conversationId,
}: {
  userId: string;
  type?: string;
  characterId?: string | null;
  conversationId?: string | null;
}) {
  const result = await db()
    .select()
    .from(roleplayAsset)
    .where(
      and(
        eq(roleplayAsset.userId, userId),
        eq(roleplayAsset.status, RoleplayStatus.CREATED),
        type ? eq(roleplayAsset.type, type) : undefined,
        characterId ? eq(roleplayAsset.characterId, characterId) : undefined,
        conversationId
          ? eq(roleplayAsset.conversationId, conversationId)
          : undefined
      )
    )
    .orderBy(desc(roleplayAsset.createdAt))
    .limit(100);

  return result as RoleplayAsset[];
}

export async function createRoleplayMemory({
  userId,
  characterId,
  conversationId,
  summary,
  visibility = RoleplayVisibility.PRIVATE,
  metadata,
}: {
  userId: string;
  characterId?: string | null;
  conversationId?: string | null;
  summary: string;
  visibility?: RoleplayVisibility;
  metadata?: string;
}) {
  const [result] = await db()
    .insert(roleplayMemory)
    .values({
      id: getUuid(),
      userId,
      characterId,
      conversationId,
      summary,
      visibility,
      metadata,
      status: RoleplayStatus.CREATED,
    })
    .returning();

  return result;
}

export async function getRoleplayCharacterSocialState({
  userId,
  characterId,
}: {
  userId?: string | null;
  characterId: string;
}) {
  const follows = await db()
    .select()
    .from(roleplayCharacterFollow)
    .where(
      and(
        eq(roleplayCharacterFollow.characterId, characterId),
        inArray(roleplayCharacterFollow.status, ALIVE_STATUSES)
      )
    );

  const comments = await db()
    .select()
    .from(roleplayCharacterComment)
    .where(
      and(
        eq(roleplayCharacterComment.characterId, characterId),
        inArray(roleplayCharacterComment.status, ALIVE_STATUSES)
      )
    )
    .orderBy(desc(roleplayCharacterComment.createdAt))
    .limit(60);

  const viewerFollowed = Boolean(
    userId && follows.some((follow: any) => follow.userId === userId)
  );

  return {
    followCount: follows.length,
    commentCount: comments.length,
    viewerFollowed,
    comments,
  };
}

export async function followRoleplayCharacter({
  userId,
  characterId,
}: {
  userId: string;
  characterId: string;
}) {
  const [existing] = await db()
    .select()
    .from(roleplayCharacterFollow)
    .where(
      and(
        eq(roleplayCharacterFollow.userId, userId),
        eq(roleplayCharacterFollow.characterId, characterId)
      )
    )
    .limit(1);

  if (existing) {
    const [result] = await db()
      .update(roleplayCharacterFollow)
      .set({ status: RoleplayStatus.CREATED, updatedAt: new Date() })
      .where(eq(roleplayCharacterFollow.id, existing.id))
      .returning();
    return result;
  }

  const [result] = await db()
    .insert(roleplayCharacterFollow)
    .values({
      id: getUuid(),
      userId,
      characterId,
      status: RoleplayStatus.CREATED,
    })
    .returning();

  return result;
}

export async function unfollowRoleplayCharacter({
  userId,
  characterId,
}: {
  userId: string;
  characterId: string;
}) {
  const [result] = await db()
    .update(roleplayCharacterFollow)
    .set({ status: RoleplayStatus.DELETED, updatedAt: new Date() })
    .where(
      and(
        eq(roleplayCharacterFollow.userId, userId),
        eq(roleplayCharacterFollow.characterId, characterId)
      )
    )
    .returning();

  return result;
}

export async function createRoleplayCharacterComment({
  userId,
  characterId,
  body,
  authorName,
  parentId,
}: {
  userId: string;
  characterId: string;
  body: string;
  authorName: string;
  parentId?: string | null;
}) {
  const [result] = await db()
    .insert(roleplayCharacterComment)
    .values({
      id: getUuid(),
      userId,
      characterId,
      parentId: parentId ?? null,
      status: RoleplayStatus.CREATED,
      body,
      authorName,
    })
    .returning();

  return result;
}

// ---------------------------------------------------------------------------
// Tag taxonomy helpers (Phase A6)
// ---------------------------------------------------------------------------

/** Returns the canonical tags ordered by `sort_order`. */
export async function getRoleplayTags() {
  const result = await db()
    .select()
    .from(roleplayTag)
    .where(inArray(roleplayTag.status, ALIVE_STATUSES))
    .orderBy(asc(roleplayTag.sortOrder));
  return result as RoleplayTag[];
}

/** Resolve tag slugs -> ids in one query. Slugs that don't exist are ignored. */
export async function resolveTagIdsBySlug(slugs: string[]) {
  if (!slugs.length) return [] as RoleplayTag[];
  const result = await db()
    .select()
    .from(roleplayTag)
    .where(inArray(roleplayTag.slug, slugs));
  return result as RoleplayTag[];
}

/** Read the slugs currently bound to a character. */
export async function getCharacterTagSlugs(characterId: string) {
  const rows = await db()
    .select({ slug: roleplayTag.slug })
    .from(roleplayCharacterTag)
    .innerJoin(roleplayTag, eq(roleplayTag.id, roleplayCharacterTag.tagId))
    .where(eq(roleplayCharacterTag.characterId, characterId));
  return rows.map((row: { slug: string }) => row.slug);
}

/** Read tag slugs for many characters in one query to avoid list-page N+1s. */
export async function getCharacterTagSlugsMap(characterIds: string[]) {
  const ids = [...new Set(characterIds.filter(Boolean))];
  if (!ids.length) return new Map<string, string[]>();

  const rows = await db()
    .select({
      characterId: roleplayCharacterTag.characterId,
      slug: roleplayTag.slug,
    })
    .from(roleplayCharacterTag)
    .innerJoin(roleplayTag, eq(roleplayTag.id, roleplayCharacterTag.tagId))
    .where(inArray(roleplayCharacterTag.characterId, ids));

  const map = new Map<string, string[]>();
  rows.forEach((row: { characterId: string; slug: string }) => {
    const current = map.get(row.characterId) ?? [];
    current.push(row.slug);
    map.set(row.characterId, current);
  });
  return map;
}

/**
 * Replace the tag set for a character. Drops missing rows, inserts new ones,
 * leaves existing rows untouched. No-op if the slug list resolves to nothing.
 */
export async function setCharacterTagSlugs(
  characterId: string,
  slugs: string[]
) {
  const tags = await resolveTagIdsBySlug(slugs);
  const desiredIds: Set<string> = new Set(tags.map((tag) => tag.id));

  const existing = await db()
    .select({ tagId: roleplayCharacterTag.tagId })
    .from(roleplayCharacterTag)
    .where(eq(roleplayCharacterTag.characterId, characterId));
  const existingIds: Set<string> = new Set(
    existing.map((row: { tagId: string }) => row.tagId)
  );

  const toInsert = [...desiredIds].filter((id: string) => !existingIds.has(id));
  const toDelete = [...existingIds].filter((id: string) => !desiredIds.has(id));

  if (toInsert.length) {
    await db()
      .insert(roleplayCharacterTag)
      .values(toInsert.map((tagId) => ({ characterId, tagId })));
  }
  if (toDelete.length) {
    await db()
      .delete(roleplayCharacterTag)
      .where(
        and(
          eq(roleplayCharacterTag.characterId, characterId),
          inArray(roleplayCharacterTag.tagId, toDelete)
        )
      );
  }
}

/**
 * Atomic-ish counter helper for `chat_count` / `like_count`. Uses Postgres
 * `column = column + delta` so concurrent writers compose correctly.
 */
export async function incrementCharacterCounter(
  id: string,
  field: 'chatCount' | 'likeCount',
  delta: number
) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const column =
    field === 'chatCount'
      ? roleplayCharacter.chatCount
      : roleplayCharacter.likeCount;
  await withTransientDatabaseRetry(
    () =>
      db()
        .update(roleplayCharacter)
        .set({ [field]: sql`${column} + ${delta}` })
        .where(eq(roleplayCharacter.id, id)),
    retryOptions
  );
}

export async function createRoleplayQualityEvent(
  event: Omit<NewRoleplayQualityEvent, 'id'> & { id?: string }
) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<RoleplayQualityEvent[]>(
    () =>
      db()
        .insert(roleplayQualityEvent)
        .values({
          ...event,
          id: event.id || getUuid(),
          status: event.status || RoleplayStatus.CREATED,
        })
        .returning(),
    retryOptions
  );

  return result as RoleplayQualityEvent;
}

export async function createRoleplayQualityEvaluation(
  evaluation: Omit<NewRoleplayQualityEvaluation, 'id'> & { id?: string }
) {
  const [result] = await db()
    .insert(roleplayQualityEvaluation)
    .values({
      ...evaluation,
      id: evaluation.id || getUuid(),
      status: evaluation.status || RoleplayStatus.CREATED,
    })
    .returning();

  return result as RoleplayQualityEvaluation;
}

export type RoleplayQualitySample = {
  character: RoleplayCharacter;
  conversation: RoleplayConversation;
  message: RoleplayMessage;
};

export async function getRecentRoleplayQualitySamples({
  characterId,
  limit = 12,
}: {
  characterId?: string;
  limit?: number;
} = {}) {
  const rows = await db()
    .select({
      character: roleplayCharacter,
      conversation: roleplayConversation,
      message: roleplayMessage,
    })
    .from(roleplayMessage)
    .innerJoin(
      roleplayConversation,
      eq(roleplayConversation.id, roleplayMessage.conversationId)
    )
    .innerJoin(
      roleplayCharacter,
      eq(roleplayCharacter.id, roleplayConversation.characterId)
    )
    .where(
      and(
        eq(roleplayMessage.status, RoleplayStatus.CREATED),
        eq(roleplayMessage.role, 'character'),
        eq(roleplayConversation.status, RoleplayStatus.CREATED),
        characterId ? eq(roleplayCharacter.id, characterId) : undefined
      )
    )
    .orderBy(desc(roleplayMessage.createdAt))
    .limit(limit);

  return rows as RoleplayQualitySample[];
}

function avg(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return 0;
  return (
    Math.round(
      (valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10
    ) / 10
  );
}

function rate(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function topByCount(values: string[], limit = 3) {
  const counts = new Map<string, number>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export async function getRoleplayQualityReport({
  days = 14,
}: {
  days?: number;
} = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [
    characterRows,
    eventRows,
    evaluationRows,
    conversationRows,
    messageRows,
  ] = await Promise.all([
    db()
      .select()
      .from(roleplayCharacter)
      .where(eq(roleplayCharacter.status, RoleplayStatus.PUBLISHED))
      .orderBy(desc(roleplayCharacter.updatedAt))
      .limit(200),
    db()
      .select()
      .from(roleplayQualityEvent)
      .where(
        and(
          eq(roleplayQualityEvent.status, RoleplayStatus.CREATED),
          gte(roleplayQualityEvent.createdAt, since)
        )
      )
      .orderBy(desc(roleplayQualityEvent.createdAt))
      .limit(5000),
    db()
      .select()
      .from(roleplayQualityEvaluation)
      .where(
        and(
          eq(roleplayQualityEvaluation.status, RoleplayStatus.CREATED),
          gte(roleplayQualityEvaluation.createdAt, since)
        )
      )
      .orderBy(desc(roleplayQualityEvaluation.createdAt))
      .limit(1000),
    db()
      .select()
      .from(roleplayConversation)
      .where(
        and(
          eq(roleplayConversation.status, RoleplayStatus.CREATED),
          gte(roleplayConversation.createdAt, since)
        )
      )
      .orderBy(desc(roleplayConversation.createdAt))
      .limit(5000),
    db()
      .select()
      .from(roleplayMessage)
      .where(
        and(
          eq(roleplayMessage.status, RoleplayStatus.CREATED),
          gte(roleplayMessage.createdAt, since)
        )
      )
      .orderBy(desc(roleplayMessage.createdAt))
      .limit(10000),
  ]);
  const characters = characterRows as RoleplayCharacter[];
  const events = eventRows as RoleplayQualityEvent[];
  const evaluations = evaluationRows as RoleplayQualityEvaluation[];
  const conversations = conversationRows as RoleplayConversation[];
  const messages = messageRows as RoleplayMessage[];

  const conversationsByCharacter = new Map<string, RoleplayConversation[]>();
  conversations.forEach((conversation) => {
    if (!conversation.characterId) return;
    const current =
      conversationsByCharacter.get(conversation.characterId) ?? [];
    current.push(conversation);
    conversationsByCharacter.set(conversation.characterId, current);
  });

  const messagesByConversation = new Map<string, RoleplayMessage[]>();
  messages.forEach((message) => {
    const current = messagesByConversation.get(message.conversationId) ?? [];
    current.push(message);
    messagesByConversation.set(message.conversationId, current);
  });

  const items = characters.map((character) => {
    const characterConversations =
      conversationsByCharacter.get(character.id) ?? [];
    const conversationIds = new Set(
      characterConversations.map((item) => item.id)
    );
    const characterMessages = messages.filter((message) =>
      conversationIds.has(message.conversationId)
    );
    const userMessages = characterMessages.filter(
      (message) => message.role === 'user'
    );
    const characterEvents = events.filter(
      (event) => event.characterId === character.id
    );
    const characterEvaluations = evaluations.filter(
      (evaluation) => evaluation.characterId === character.id
    );
    const regenerateCount = characterEvents.filter(
      (event) =>
        event.eventType === 'regenerate_requested' ||
        event.eventType === 'ooc_regenerate_requested'
    ).length;
    const explicitOocCount = characterEvents.filter(
      (event) => event.eventType === 'ooc_flagged'
    ).length;
    const turnCounts = characterConversations.map((conversation) => {
      const count = messagesByConversation.get(conversation.id)?.length ?? 0;
      return Math.ceil(count / 2);
    });
    const avgTurns = avg(turnCounts);
    const avgUserChars = avg(
      userMessages.map((message) => message.text.length)
    );
    const issueLabels = characterEvaluations.flatMap((evaluation) =>
      safeJsonParse<string[]>(evaluation.issues, [])
    );
    const recommendationLabels = characterEvaluations.flatMap((evaluation) =>
      safeJsonParse<string[]>(evaluation.recommendations, [])
    );
    const rubric = {
      voice: avg(characterEvaluations.map((item) => item.voiceScore)),
      values: avg(characterEvaluations.map((item) => item.valuesScore)),
      relationship: avg(
        characterEvaluations.map((item) => item.relationshipScore)
      ),
      immersion: avg(characterEvaluations.map((item) => item.immersionScore)),
      ooc: avg(characterEvaluations.map((item) => item.oocScore)),
    };
    const lowestRubric = Object.entries(rubric)
      .filter(([, value]) => value > 0)
      .sort((a, b) => a[1] - b[1])[0]?.[0];

    const flags = [
      rate(regenerateCount, Math.max(1, userMessages.length)) >= 12
        ? '重发/不像反馈偏高，优先检查口吻锚点和负面约束'
        : '',
      avgTurns > 0 && avgTurns < 4
        ? '会话轮数偏短，开场和前 3 轮推进可能不够抓人'
        : '',
      avgUserChars > 0 && avgUserChars < 18
        ? '用户回复偏短，角色可能缺少可接话的具体细节'
        : '',
      lowestRubric
        ? `rubric 最弱维度是 ${lowestRubric}，下一轮 prompt 调整应先围绕它`
        : '',
    ].filter(Boolean);

    return {
      character: {
        id: character.id,
        name: character.name,
        avatarUrl: character.avatarUrl,
        tagline: character.tagline,
      },
      metrics: {
        conversations: characterConversations.length,
        userMessages: userMessages.length,
        avgTurns,
        avgUserChars,
        regenerateCount,
        explicitOocCount,
        regenerateRate: rate(regenerateCount, Math.max(1, userMessages.length)),
        evaluationCount: characterEvaluations.length,
      },
      rubric,
      topIssues: topByCount(issueLabels),
      topRecommendations: topByCount(recommendationLabels),
      flags,
      latestSummary: characterEvaluations[0]?.summary ?? '',
    };
  });

  const totals = {
    characters: items.length,
    conversations: conversations.length,
    userMessages: messages.filter((message) => message.role === 'user').length,
    qualityEvents: events.length,
    evaluations: evaluations.length,
  };

  return {
    days,
    since: since.toISOString(),
    totals,
    items: items.sort((a, b) => {
      const aRisk =
        a.metrics.regenerateRate +
        a.metrics.explicitOocCount * 10 +
        (a.rubric.ooc ? Math.max(0, 5 - a.rubric.ooc) * 8 : 0);
      const bRisk =
        b.metrics.regenerateRate +
        b.metrics.explicitOocCount * 10 +
        (b.rubric.ooc ? Math.max(0, 5 - b.rubric.ooc) * 8 : 0);
      return bRisk - aRisk;
    }),
  };
}
