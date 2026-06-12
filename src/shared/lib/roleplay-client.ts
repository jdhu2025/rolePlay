import { ROLEPLAY_OFFICIAL_CHARACTERS } from '@/data/roleplay-characters';

import type { RoleplayFormatStyle } from '@/shared/lib/roleplay-format-style';
import {
  buildFirstExperienceRecommendationQuery,
  type FirstExperienceChoiceId,
} from '@/shared/lib/roleplay-first-experience';
import type { PersonalityCard } from '@/shared/lib/roleplay-personality';
import type { RoleplayStyleExample } from '@/shared/lib/roleplay-style-examples';

/**
 * Shared client-side types and fetch helpers for roleplay characters.
 *
 * These types describe what `/api/roleplay/characters` returns. The API runs
 * stored filenames through buildCharacterImageUrl() before responding, so
 * `avatar` / `cover` / `gallery` here are always full URLs ready for <img>.
 *
 * The new picker and detail page should consume these helpers instead of
 * declaring their own ad-hoc Character interfaces.
 */

export type RoleplayCharacterClient = {
  id: string;
  name: string;
  age: number;
  author: string;
  tagline: string;
  intro: string;
  opening: string;
  avatar: string;
  cover: string;
  /** Already-resolved image URLs, in display order. Length 1-5. */
  gallery: string[];
  tags: string[];
  tagSlugs: string[];
  stats: string;
  chatCount?: number;
  likeCount?: number;
  follows: string;
  style: string;
  relationship: string;
  scene: string;
  personality: string[];
  voice: string;
  voicePreset?: string;
  gender: string;
  settings: string;
  personalityCard?: PersonalityCard;
  formatStyle?: RoleplayFormatStyle;
  styleExamples?: RoleplayStyleExample[];
  visualIdentity: Record<string, unknown>;
  imageStyleSuffix?: string;
  model: string;
  status?: 'draft' | 'under_review' | 'published' | 'rejected' | 'created';
  premium: boolean;
  live: boolean;
  source: 'database' | 'local';
  visibility: 'public' | 'private';
};

export type CharactersResponse = {
  authenticated: boolean;
  characters: RoleplayCharacterClient[];
  migrationRequired?: boolean;
};

export type RecommendationsResponse = CharactersResponse & {
  buckets?: Record<string, string[]>;
};

export type CharacterResponse = {
  character: RoleplayCharacterClient | null;
  migrationRequired?: boolean;
};

type ApiEnvelope<T> = {
  code?: number;
  message?: string;
  data?: T;
};

const ROLEPLAY_CLIENT_CACHE_TTL_MS = 60_000;

const clientCache = new Map<
  string,
  { expiresAt: number; value: unknown; promise?: Promise<unknown> }
>();

export function invalidateRoleplayClientCache(prefix?: string) {
  if (!prefix) {
    clientCache.clear();
    return;
  }

  for (const key of Array.from(clientCache.keys())) {
    if (key.startsWith(prefix)) {
      clientCache.delete(key);
    }
  }
}

async function readClientCache<T>(
  key: string,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const cached = clientCache.get(key);
  if (cached && cached.expiresAt > now) {
    if (cached.promise) return cached.promise as Promise<T>;
    return cached.value as T;
  }

  const promise = loader()
    .then((value) => {
      clientCache.set(key, {
        value,
        expiresAt: Date.now() + ROLEPLAY_CLIENT_CACHE_TTL_MS,
      });
      return value;
    })
    .catch((error) => {
      clientCache.delete(key);
      throw error;
    });

  clientCache.set(key, {
    value: cached?.value,
    expiresAt: now + 10_000,
    promise,
  });

  return promise;
}

function toSiteImageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/roleplay/characters/${trimmed}`;
}

export const OFFICIAL_ROLEPLAY_CHARACTERS: RoleplayCharacterClient[] =
  ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => {
    const gallery = character.images.map(toSiteImageUrl).filter(Boolean);
    return {
      id: character.id,
      name: character.name,
      age: character.age,
      author: 'Roleplay System',
      tagline: character.intro,
      intro: character.bio,
      opening: character.openingLine,
      avatar: toSiteImageUrl(character.avatar),
      cover: gallery[0] ?? toSiteImageUrl(character.avatar),
      gallery,
      tags: character.tags,
      tagSlugs: character.tagSlugs,
      stats: '0',
      follows: 'Public',
      style: character.occupation,
      relationship: 'new companion with room for slow-burn closeness',
      scene: character.location,
      personality: character.personality,
      voice: '',
      gender: character.gender,
      settings: JSON.stringify({
        occupation: character.occupation,
        location: character.location,
        sortOrder: character.sortOrder,
      }),
      visualIdentity: {},
      model: '',
      premium: false,
      live: false,
      source: 'local',
      visibility: character.visibility,
    };
  });

export function getLocalRoleplayCharacter(id: string) {
  return (
    OFFICIAL_ROLEPLAY_CHARACTERS.find((character) => character.id === id) ??
    null
  );
}

/**
 * Read the optional `settings` JSON blob from a character. The seed script
 * stores `{ occupation, location, sortOrder }` there. Anything that isn't
 * valid JSON is treated as absent.
 */
export function readCharacterSettings(
  character: Pick<RoleplayCharacterClient, 'settings'>
): { occupation?: string; location?: string; sortOrder?: number } {
  if (!character.settings) return {};
  try {
    const parsed = JSON.parse(character.settings);
    if (parsed && typeof parsed === 'object') {
      return parsed as ReturnType<typeof readCharacterSettings>;
    }
  } catch {
    // ignore
  }
  return {};
}

/** Display-order sort: by `settings.sortOrder` if present, else by name. */
export function sortCharacters<T extends RoleplayCharacterClient>(
  list: T[]
): T[] {
  return [...list].sort((a, b) => {
    const ao = readCharacterSettings(a).sortOrder;
    const bo = readCharacterSettings(b).sortOrder;
    if (typeof ao === 'number' && typeof bo === 'number') return ao - bo;
    if (typeof ao === 'number') return -1;
    if (typeof bo === 'number') return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Fetch the public character list from the API.
 *
 * - On non-2xx, returns an empty list rather than throwing, so a UI mount
 *   does not crash on a slow / failing server. Callers that need to surface
 *   errors should pass `{ throwOnError: true }`.
 */
export async function fetchRoleplayCharacters(options?: {
  signal?: AbortSignal;
  throwOnError?: boolean;
  /** Optional tag slug filter — narrows the grid to one of the 8 categories. */
  tagSlug?: string | null;
  limit?: number;
}): Promise<CharactersResponse> {
  const cacheKey = `characters:${options?.tagSlug || 'all'}:${options?.limit || 'default'}`;
  if (!options?.throwOnError) {
    return readClientCache(cacheKey, () =>
      fetchRoleplayCharacters({ ...options, throwOnError: true })
    ).catch(() => ({
      authenticated: false,
      characters: [],
    }));
  }

  const empty: CharactersResponse = {
    authenticated: false,
    characters: [],
  };

  let response: Response;
  try {
    const params = new URLSearchParams();
    if (options?.tagSlug) params.set('tag', options.tagSlug);
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    response = await fetch(`/api/roleplay/characters${qs}`, {
      signal: options?.signal,
      credentials: 'include',
    });
  } catch (error) {
    if (options?.throwOnError) throw error;
    return empty;
  }

  if (!response.ok) {
    if (options?.throwOnError) {
      throw new Error(
        `roleplay characters fetch failed: ${response.status} ${response.statusText}`
      );
    }
    return empty;
  }

  let payload: ApiEnvelope<CharactersResponse>;
  try {
    payload = (await response.json()) as ApiEnvelope<CharactersResponse>;
  } catch (error) {
    if (options?.throwOnError) throw error;
    return empty;
  }

  const data = payload.data;
  if (!data || !Array.isArray(data.characters)) return empty;

  return {
    authenticated: Boolean(data.authenticated),
    characters: sortCharacters(data.characters),
    migrationRequired: data.migrationRequired,
  };
}

/**
 * Fetch the For You recommendations. The API response order is meaningful:
 * it is already bucketed by recent chats, private characters, gender affinity,
 * popularity, and fallbacks depending on auth state. Do not call
 * `sortCharacters` here.
 */
export async function fetchRoleplayRecommendations(options?: {
  signal?: AbortSignal;
  throwOnError?: boolean;
  limit?: number;
  firstImpression?: FirstExperienceChoiceId | string | null;
}): Promise<RecommendationsResponse> {
  const cacheKey = `recommendations:${options?.limit || 'default'}:${options?.firstImpression || 'default'}`;
  if (!options?.throwOnError) {
    return readClientCache(cacheKey, () =>
      fetchRoleplayRecommendations({ ...options, throwOnError: true })
    ).catch(() => ({
      authenticated: false,
      characters: [],
    }));
  }

  const empty: RecommendationsResponse = {
    authenticated: false,
    characters: [],
  };

  let response: Response;
  try {
    const params = new URLSearchParams();
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    const recommendationQuery = buildFirstExperienceRecommendationQuery(
      options?.firstImpression
    );
    if (recommendationQuery.firstImpression) {
      params.set('firstImpression', recommendationQuery.firstImpression);
    }
    const qs = params.toString() ? `?${params.toString()}` : '';
    response = await fetch(`/api/roleplay/recommendations${qs}`, {
      signal: options?.signal,
      credentials: 'include',
    });
  } catch (error) {
    if (options?.throwOnError) throw error;
    return empty;
  }

  if (!response.ok) {
    if (options?.throwOnError) {
      throw new Error(
        `roleplay recommendations fetch failed: ${response.status} ${response.statusText}`
      );
    }
    return empty;
  }

  let payload: ApiEnvelope<RecommendationsResponse>;
  try {
    payload = (await response.json()) as ApiEnvelope<RecommendationsResponse>;
  } catch (error) {
    if (options?.throwOnError) throw error;
    return empty;
  }

  const data = payload.data;
  if (!data || !Array.isArray(data.characters)) return empty;

  return {
    authenticated: Boolean(data.authenticated),
    characters: data.characters,
    buckets: data.buckets,
    migrationRequired: data.migrationRequired,
  };
}

/**
 * Fetch a single public or owner-visible character by id.
 *
 * The server applies the same owner/public visibility rules as the list
 * endpoint. Missing / non-visible rows resolve to `null` by default so detail
 * and chat pages can render their not-found state without crashing.
 */
export async function fetchRoleplayCharacter(
  id: string,
  options?: {
    signal?: AbortSignal;
    throwOnError?: boolean;
  }
): Promise<CharacterResponse> {
  const cacheKey = `character:${id.trim()}`;
  if (!options?.throwOnError) {
    return readClientCache(cacheKey, () =>
      fetchRoleplayCharacter(id, { ...options, throwOnError: true })
    ).catch(() => ({ character: null }));
  }

  const empty: CharacterResponse = { character: null };
  const trimmedId = id.trim();
  if (!trimmedId) return empty;

  let response: Response;
  try {
    response = await fetch(
      `/api/roleplay/characters/${encodeURIComponent(trimmedId)}`,
      {
        signal: options?.signal,
        credentials: 'include',
      }
    );
  } catch (error) {
    if (options?.throwOnError) throw error;
    return empty;
  }

  if (!response.ok) {
    if (options?.throwOnError) {
      throw new Error(
        `roleplay character fetch failed: ${response.status} ${response.statusText}`
      );
    }
    return empty;
  }

  let payload: ApiEnvelope<CharacterResponse>;
  try {
    payload = (await response.json()) as ApiEnvelope<CharacterResponse>;
  } catch (error) {
    if (options?.throwOnError) throw error;
    return empty;
  }

  if (payload.code && payload.code !== 0) {
    if (
      typeof payload.message === 'string' &&
      /not migrated|tables not migrated/i.test(payload.message)
    ) {
      return { ...empty, migrationRequired: true };
    }
    if (options?.throwOnError) {
      throw new Error(payload.message || 'roleplay character fetch failed');
    }
    return empty;
  }

  return {
    character: payload.data?.character ?? null,
    migrationRequired: payload.data?.migrationRequired,
  };
}

/**
 * Owner-side character item, returned by `/api/roleplay/my-characters`.
 *
 * Shape mirrors the API: `avatar` / `cover` / `gallery` are already-resolved
 * URLs, status carries the v2 lifecycle, and `tagSlugs` is the canonical
 * taxonomy binding (not the freeform `tags` JSON the public route returns).
 */
export type MyTalkieItem = {
  id: string;
  name: string;
  avatar: string;
  cover: string;
  gallery: string[];
  status: 'draft' | 'under_review' | 'published' | 'rejected' | 'created';
  visibility: 'public' | 'private';
  tagline: string;
  intro: string;
  rejectionReason: string;
  chatCount: number;
  likeCount: number;
  tagSlugs: string[];
  updatedAt: string | Date;
};

export type MyTalkieFilter = 'all' | 'draft' | 'under_review' | 'published';

/** Fetch the owner-only listing for /create. Returns empty list on failure. */
export async function fetchMyTalkies(
  filter: MyTalkieFilter,
  options?: { signal?: AbortSignal }
): Promise<{
  characters: MyTalkieItem[];
  migrationRequired?: boolean;
  unauthenticated?: boolean;
}> {
  const empty = { characters: [] as MyTalkieItem[] };
  const qs = filter === 'all' ? '' : `?status=${filter}`;

  let response: Response;
  try {
    response = await fetch(`/api/roleplay/my-characters${qs}`, {
      signal: options?.signal,
      credentials: 'include',
    });
  } catch {
    return empty;
  }
  if (!response.ok) return empty;

  let payload: ApiEnvelope<{
    characters: MyTalkieItem[];
    migrationRequired?: boolean;
  }>;
  try {
    payload = await response.json();
  } catch {
    return empty;
  }

  if (payload.code && payload.code !== 0) {
    if (
      typeof payload.message === 'string' &&
      /no auth/i.test(payload.message)
    ) {
      return { ...empty, unauthenticated: true };
    }
    if (
      typeof payload.message === 'string' &&
      /not migrated/i.test(payload.message)
    ) {
      return { ...empty, migrationRequired: true };
    }
    return empty;
  }

  const data = payload.data;
  if (!data || !Array.isArray(data.characters)) return empty;
  return data;
}
