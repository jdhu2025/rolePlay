import {
  getVisiblePublicGallery,
  isComplianceMode,
} from '@/shared/lib/compliance';
import {
  buildCharacterImageUrl,
  buildCharacterImageUrls,
} from '@/shared/lib/roleplay-assets';
import {
  getLocalRoleplayCharacter,
  type RoleplayCharacterClient,
} from '@/shared/lib/roleplay-client';
import { parseFormatStyle } from '@/shared/lib/roleplay-format-style';
import { parsePersonalityCard } from '@/shared/lib/roleplay-personality';
import {
  getReviewSafeCharacterById,
  isReviewSafeCharacterLike,
} from '@/shared/lib/roleplay-review-safe-characters';
import { parseStyleExamples } from '@/shared/lib/roleplay-style-examples';
import {
  findRoleplayCharacterById,
  getCharacterTagSlugs,
  isMissingRoleplayTable,
  RoleplayStatus,
  RoleplayVisibility,
  safeJsonParse,
  type RoleplayCharacter,
} from '@/shared/models/roleplay';

async function toClientCharacter(
  character: RoleplayCharacter
): Promise<RoleplayCharacterClient> {
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
  const metadata = safeJsonParse<Record<string, unknown>>(
    (character as any).metadata ?? '{}',
    {}
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
    gallery: getVisiblePublicGallery(buildCharacterImageUrls(galleryFilenames)),
    tags: safeJsonParse<string[]>(character.tags, []),
    tagSlugs: taxonomySlugs,
    skills: safeJsonParse<string[]>((character as any).skills ?? '[]', []),
    seoScenes: Array.isArray(metadata.seoScenes) ? metadata.seoScenes : [],
    metadata,
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
    rejectionReason: (character as any).rejectionReason ?? '',
    premium: false,
    live: false,
    source: 'database',
    visibility:
      character.visibility === RoleplayVisibility.PUBLIC ? 'public' : 'private',
  };
}

export async function getPublicRoleplayCharacterForPage(id: string) {
  const reviewSafeFallback = getReviewSafeCharacterById(id);
  if (isComplianceMode() && reviewSafeFallback) {
    return reviewSafeFallback;
  }

  try {
    const character = await findRoleplayCharacterById(id);
    const isPublic =
      character?.status === RoleplayStatus.PUBLISHED &&
      character.visibility === RoleplayVisibility.PUBLIC;

    if (character && isPublic) {
      if (isComplianceMode() && !isReviewSafeCharacterLike(character)) {
        return null;
      }
      return await toClientCharacter(character);
    }
  } catch (error) {
    if (!isMissingRoleplayTable(error)) {
      console.log('load roleplay character page data failed:', error);
    }
  }

  return getLocalRoleplayCharacter(id);
}
