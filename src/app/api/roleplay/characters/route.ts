import { respData, respErr } from '@/shared/lib/resp';
import {
  buildCharacterImageUrl,
  buildCharacterImageUrls,
} from '@/shared/lib/roleplay-assets';
import {
  normalizeFormatStyle,
  parseFormatStyle,
  serializeFormatStyle,
} from '@/shared/lib/roleplay-format-style';
import {
  normalizePersonalityCard,
  parsePersonalityCard,
  serializePersonalityCard,
} from '@/shared/lib/roleplay-personality';
import { ensureHumanMomentPersonalityCard } from '@/shared/lib/roleplay-human-moments';
import {
  normalizeStyleExamples,
  parseStyleExamples,
  serializeStyleExamples,
} from '@/shared/lib/roleplay-style-examples';
import {
  createRoleplayCharacter,
  getCharacterTagSlugs,
  getCharacterTagSlugsMap,
  getRoleplayCharacters,
  isMissingRoleplayTable,
  RoleplayCharacter,
  RoleplayStatus,
  RoleplayVisibility,
  safeJsonParse,
  serializeJson,
  setCharacterTagSlugs,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

type CharacterPayload = {
  name?: string;
  age?: number;
  gender?: string;
  tagline?: string;
  intro?: string;
  opening?: string;
  firstMessage?: string;
  avatar?: string;
  cover?: string;
  gallery?: string[];
  tags?: string[];
  /** Tag slugs from the canonical roleplay categories. */
  tagSlugs?: string[];
  skills?: string[];
  style?: string;
  relationship?: string;
  scene?: string;
  personality?: string[];
  voice?: string;
  settings?: string;
  /**
   * Structured personality card (P0). Optional — old clients keep sending
   * just `settings` and we degrade gracefully. Server normalizes via
   * `normalizePersonalityCard` before persisting so junk fields/lengths
   * can't blow up the chat pipeline later.
   */
  personalityCard?: Record<string, unknown>;
  visualIdentity?: Record<string, unknown>;
  /**
   * P2-2: fixed visual-style anchor appended to every portrait/scene
   * render. Optional; empty/missing leaves the legacy "no suffix"
   * behavior untouched.
   */
  imageStyleSuffix?: string;
  /**
   * P2-3: AI-Writer-recommended TTS voice preset id (whitelisted in
   * `roleplay-personality.ts`). Optional; empty/missing falls back to
   * the gender-based default in the TTS route.
   */
  voicePreset?: string;
  /** P1-2: few-shot examples as [{ user, character }]. */
  styleExamples?: unknown[];
  /** P2-4: reply formatting preferences. */
  formatStyle?: Record<string, unknown>;
  model?: string;
  visibility?: string;
  /**
   * v2 create flow: 'draft' lands the row as a draft (private), 'under_review'
   * pushes it into the moderation queue. Legacy seed callers omit this and
   * we keep writing PUBLISHED for them.
   */
  status?: 'draft' | 'under_review';
};

const DEFAULT_LIST_LIMIT = 24;
const MAX_LIST_LIMIT = 60;

function clampListLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIST_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIST_LIMIT);
}

function normalizeVoiceProfileId(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().slice(0, 100) : '';
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
  // Tag slugs live in the junction table; fall back to the legacy free-form
  // `tags` JSON array if the character has no taxonomy bindings yet.
  const taxonomySlugs =
    preloadedTagSlugs ??
    (await getCharacterTagSlugs(character.id).catch(() => [] as string[]));
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
    status: character.status,
    rejectionReason: (character as any).rejectionReason ?? '',
    premium: false,
    live: false,
    source: 'database',
    visibility: character.visibility,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    const url = new URL(request.url);
    const tagSlug = url.searchParams.get('tag') || undefined;
    const limit = clampListLimit(url.searchParams.get('limit'));
    const characters: RoleplayCharacter[] = await getRoleplayCharacters({
      userId: user?.id,
      includePublic: true,
      tagSlug,
      limit,
    });

    const tagSlugsByCharacter = await getCharacterTagSlugsMap(
      characters.map((character) => character.id)
    ).catch(() => new Map<string, string[]>());
    const items = await Promise.all(
      characters.map((character) =>
        toClientCharacter(
          character,
          tagSlugsByCharacter.get(character.id) ?? []
        )
      )
    );
    return respData({
      authenticated: Boolean(user),
      characters: items,
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: false,
        characters: [],
        migrationRequired: true,
      });
    }
    console.log('get roleplay characters failed:', e);
    return respErr(e.message || 'get roleplay characters failed');
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const payload = (await request.json()) as CharacterPayload;
    const name = payload.name?.trim();
    if (!name) {
      return respErr('character name is required');
    }

    // v2 create flow always lands as DRAFT. Publishing must go through the
    // dedicated audit-gated endpoint. Legacy seed callers omit `status` and
    // keep writing PUBLISHED so old talkie-mvp scripts still produce visible
    // characters.
    const initialStatus =
      payload.status === 'draft' || payload.status === 'under_review'
        ? RoleplayStatus.DRAFT
        : RoleplayStatus.PUBLISHED;

    const opening = payload.opening || payload.firstMessage || '';
    const personalityCard = ensureHumanMomentPersonalityCard(
      payload.personalityCard,
      {
        name,
        tagline: payload.tagline,
        intro: payload.intro,
        settings: payload.settings,
        style: payload.style,
        relationship: payload.relationship,
        scene: payload.scene,
        personality: payload.personality,
        tags: payload.tags,
      }
    );
    const character = await createRoleplayCharacter({
      userId: user.id,
      status: initialStatus,
      visibility:
        payload.visibility === RoleplayVisibility.PUBLIC
          ? RoleplayVisibility.PUBLIC
          : RoleplayVisibility.PRIVATE,
      name,
      age: payload.age || 25,
      gender: payload.gender || 'non-binary',
      authorName: user.name || 'you',
      tagline: payload.tagline || '',
      intro: payload.intro || '',
      opening,
      avatarUrl: payload.avatar || '',
      coverUrl: payload.cover || '',
      gallery: serializeJson(payload.gallery || []),
      tags: serializeJson(payload.tags || []),
      skills: serializeJson(payload.skills || []),
      style: payload.style || '',
      relationship: payload.relationship || '',
      scene: payload.scene || '',
      personality: serializeJson(payload.personality || []),
      voice: payload.voice || '',
      settings: payload.settings || '',
      personalityCard: serializePersonalityCard(personalityCard),
      visualIdentity: serializeJson(payload.visualIdentity || {}),
      imageStyleSuffix:
        typeof payload.imageStyleSuffix === 'string'
          ? payload.imageStyleSuffix.trim().slice(0, 600)
          : '',
      voicePreset: normalizeVoiceProfileId(payload.voicePreset),
      styleExamples: serializeStyleExamples(
        normalizeStyleExamples(payload.styleExamples)
      ),
      formatStyle: serializeFormatStyle(
        normalizeFormatStyle(payload.formatStyle)
      ),
      model: payload.model || '',
      metadata: serializeJson({
        source: payload.status ? 'v2-create' : 'talkie-mvp',
        humanMomentVersion: 'auto-create-v1',
      }),
    });

    if (payload.tagSlugs?.length) {
      await setCharacterTagSlugs(character.id, payload.tagSlugs);
    }

    return respData({ character: await toClientCharacter(character) });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('create roleplay character failed:', e);
    return respErr(e.message || 'create roleplay character failed');
  }
}
