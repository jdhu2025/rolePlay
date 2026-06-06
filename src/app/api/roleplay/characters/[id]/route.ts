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
  findRoleplayCharacterById,
  getCharacterTagSlugs,
  isMissingRoleplayTable,
  RoleplayCharacter,
  RoleplayStatus,
  RoleplayVisibility,
  safeJsonParse,
  serializeJson,
  setCharacterTagSlugs,
  updateRoleplayCharacter,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

type UpdatePayload = {
  name?: string;
  age?: number;
  gender?: string;
  tagline?: string;
  intro?: string;
  opening?: string;
  avatar?: string;
  cover?: string;
  gallery?: string[];
  tags?: string[];
  tagSlugs?: string[];
  skills?: string[];
  style?: string;
  relationship?: string;
  scene?: string;
  personality?: string[];
  voice?: string;
  settings?: string;
  /** Structured personality card (P0). Server-side normalized before persist. */
  personalityCard?: Record<string, unknown>;
  visualIdentity?: Record<string, unknown>;
  /**
   * P2-2: fixed visual-style anchor appended to every portrait/scene
   * render so a character's images stay consistent across regenerations.
   */
  imageStyleSuffix?: string;
  /**
   * P2-3: AI-Writer-recommended TTS voice preset id (whitelisted in
   * `roleplay-personality.ts`). Empty/missing falls back to the gender-
   * based default in the TTS route.
   */
  voicePreset?: string;
  /** P1-2: few-shot examples as [{ user, character }]. */
  styleExamples?: unknown[];
  /** P2-4: reply formatting preferences. */
  formatStyle?: Record<string, unknown>;
  model?: string;
  visibility?: string;
};

function normalizeVoiceProfileId(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().slice(0, 100) : '';
}

async function toClientCharacter(character: RoleplayCharacter) {
  const galleryFilenames = safeJsonParse<string[]>(
    (character as any).gallery ?? '[]',
    []
  );
  const taxonomySlugs = await getCharacterTagSlugs(character.id).catch(
    () => [] as string[]
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
    tagSlugs: taxonomySlugs,
    skills: safeJsonParse<string[]>((character as any).skills ?? '[]', []),
    chatCount: (character as any).chatCount ?? 0,
    likeCount: (character as any).likeCount ?? 0,
    stats: String((character as any).chatCount ?? 0),
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
    visibility: character.visibility,
    rejectionReason: (character as any).rejectionReason ?? '',
    premium: false,
    live: false,
    source: 'database',
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const character = await findRoleplayCharacterById(id);
    if (!character) return respErr('character not found');

    // Owners can read their own row regardless of status; everyone else is
    // limited to PUBLISHED + PUBLIC. This matches the listing endpoint.
    const isPublic =
      character.status === RoleplayStatus.PUBLISHED &&
      character.visibility === RoleplayVisibility.PUBLIC;
    if (isPublic) {
      return respData({ character: await toClientCharacter(character) });
    }

    const user = await getUserInfo();
    const isOwner = Boolean(user && character.userId === user.id);
    if (!isOwner && !isPublic) return respErr('character not found');

    return respData({ character: await toClientCharacter(character) });
  } catch (e: any) {
    if (isMissingRoleplayTable(e))
      return respErr('roleplay tables not migrated');
    console.log('get roleplay character failed:', e);
    return respErr(e.message || 'get roleplay character failed');
  }
}

/**
 * PATCH updates a draft / rejected character. Owner-only. After Save the row
 * stays in (or returns to) DRAFT — Publish goes through the dedicated
 * `/publish` endpoint to make the moderation transition explicit.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const character = await findRoleplayCharacterById(id);
    if (!character || character.userId !== user.id) {
      return respErr('character not found');
    }
    if (character.status === RoleplayStatus.UNDER_REVIEW) {
      return respErr('character is under review and cannot be edited');
    }

    const payload = (await request.json()) as UpdatePayload;
    const update: Record<string, any> = {};
    if (payload.name !== undefined) update.name = payload.name.trim();
    if (payload.age !== undefined) update.age = payload.age;
    if (payload.gender !== undefined) update.gender = payload.gender;
    if (payload.tagline !== undefined) update.tagline = payload.tagline;
    if (payload.intro !== undefined) update.intro = payload.intro;
    if (payload.opening !== undefined) update.opening = payload.opening;
    if (payload.avatar !== undefined) update.avatarUrl = payload.avatar;
    if (payload.cover !== undefined) update.coverUrl = payload.cover;
    if (payload.gallery !== undefined)
      update.gallery = serializeJson(payload.gallery);
    if (payload.tags !== undefined) update.tags = serializeJson(payload.tags);
    if (payload.skills !== undefined)
      update.skills = serializeJson(payload.skills);
    if (payload.style !== undefined) update.style = payload.style;
    if (payload.relationship !== undefined)
      update.relationship = payload.relationship;
    if (payload.scene !== undefined) update.scene = payload.scene;
    if (payload.personality !== undefined)
      update.personality = serializeJson(payload.personality);
    if (payload.voice !== undefined) update.voice = payload.voice;
    if (payload.settings !== undefined) update.settings = payload.settings;
    if (payload.personalityCard !== undefined) {
      // Always normalize before persisting so a misbehaving client can't
      // poison the chat pipeline with overlong / wrong-shape fields.
      const nextName =
        update.name !== undefined ? update.name : character.name;
      update.personalityCard = serializePersonalityCard(
        ensureHumanMomentPersonalityCard(payload.personalityCard, {
          name: nextName,
          tagline:
            payload.tagline !== undefined ? payload.tagline : character.tagline,
          intro: payload.intro !== undefined ? payload.intro : character.intro,
          settings:
            payload.settings !== undefined ? payload.settings : character.settings,
          style: payload.style !== undefined ? payload.style : character.style,
          relationship:
            payload.relationship !== undefined
              ? payload.relationship
              : character.relationship,
          scene: payload.scene !== undefined ? payload.scene : character.scene,
          personality:
            payload.personality ||
            safeJsonParse<string[]>(character.personality, []),
          tags: payload.tags || safeJsonParse<string[]>(character.tags, []),
        })
      );
    }
    if (payload.visualIdentity !== undefined)
      update.visualIdentity = serializeJson(payload.visualIdentity);
    if (payload.imageStyleSuffix !== undefined) {
      update.imageStyleSuffix = payload.imageStyleSuffix.trim().slice(0, 600);
    }
    if (payload.voicePreset !== undefined) {
      update.voicePreset = normalizeVoiceProfileId(payload.voicePreset);
    }
    if (payload.styleExamples !== undefined) {
      update.styleExamples = serializeStyleExamples(
        normalizeStyleExamples(payload.styleExamples)
      );
    }
    if (payload.formatStyle !== undefined) {
      update.formatStyle = serializeFormatStyle(
        normalizeFormatStyle(payload.formatStyle)
      );
    }
    if (payload.model !== undefined) update.model = payload.model;
    if (payload.visibility !== undefined) {
      update.visibility =
        payload.visibility === RoleplayVisibility.PUBLIC
          ? RoleplayVisibility.PUBLIC
          : RoleplayVisibility.PRIVATE;
    }

    // Save flips REJECTED back to DRAFT so the user can iterate. Other states
    // stay where they are (DRAFT stays DRAFT; PUBLISHED stays PUBLISHED until
    // they explicitly publish/unpublish).
    if (character.status === RoleplayStatus.REJECTED) {
      update.status = RoleplayStatus.DRAFT;
      update.rejectionReason = '';
    }

    const updated = await updateRoleplayCharacter(id, update);

    if (payload.tagSlugs !== undefined) {
      await setCharacterTagSlugs(id, payload.tagSlugs);
    }

    return respData({ character: await toClientCharacter(updated) });
  } catch (e: any) {
    if (isMissingRoleplayTable(e))
      return respErr('roleplay tables not migrated');
    console.log('update roleplay character failed:', e);
    return respErr(e.message || 'update roleplay character failed');
  }
}

/** Soft-delete: flip status to DELETED. Owner-only. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const character = await findRoleplayCharacterById(id);
    if (!character || character.userId !== user.id) {
      return respErr('character not found');
    }

    await updateRoleplayCharacter(id, {
      status: RoleplayStatus.DELETED,
      deletedAt: new Date(),
    });
    return respData({ ok: true });
  } catch (e: any) {
    if (isMissingRoleplayTable(e))
      return respErr('roleplay tables not migrated');
    console.log('delete roleplay character failed:', e);
    return respErr(e.message || 'delete roleplay character failed');
  }
}
