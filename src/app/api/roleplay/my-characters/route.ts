import { respData, respErr } from '@/shared/lib/resp';
import {
  buildCharacterImageUrl,
  buildCharacterImageUrls,
} from '@/shared/lib/roleplay-assets';
import {
  getCharacterTagSlugsMap,
  getRoleplayCharacters,
  isMissingRoleplayTable,
  RoleplayCharacter,
  RoleplayStatus,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

/**
 * `/api/roleplay/my-characters` — owner-only listing for the /create page.
 *
 * Backs the All / Draft / Under Review tabs. Optional `?status=draft` filter
 * narrows the working set; default returns the full editable surface
 * (DRAFT + UNDER_REVIEW + PUBLISHED + REJECTED, excludes DELETED).
 */
async function toItem(character: RoleplayCharacter, preloadedTagSlugs: string[] = []) {
  const galleryFilenames = safeJsonParse<string[]>(
    (character as any).gallery ?? '[]',
    []
  );
  return {
    id: character.id,
    name: character.name,
    avatar: buildCharacterImageUrl(character.avatarUrl),
    cover: buildCharacterImageUrl(character.coverUrl),
    gallery: buildCharacterImageUrls(galleryFilenames),
    status: character.status,
    visibility: character.visibility,
    tagline: character.tagline,
    intro: character.intro,
    rejectionReason: (character as any).rejectionReason ?? '',
    chatCount: (character as any).chatCount ?? 0,
    likeCount: (character as any).likeCount ?? 0,
    tagSlugs: preloadedTagSlugs,
    updatedAt: character.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const url = new URL(request.url);
    const filter = url.searchParams.get('status');

    // Default: every editable status (i.e. anything that isn't soft-deleted).
    const statuses: RoleplayStatus[] =
      filter === 'draft'
        ? [RoleplayStatus.DRAFT, RoleplayStatus.REJECTED]
        : filter === 'under_review'
          ? [RoleplayStatus.UNDER_REVIEW]
          : filter === 'published'
            ? [RoleplayStatus.PUBLISHED]
            : [
                RoleplayStatus.DRAFT,
                RoleplayStatus.UNDER_REVIEW,
                RoleplayStatus.PUBLISHED,
                RoleplayStatus.REJECTED,
              ];

    const characters = await getRoleplayCharacters({
      userId: user.id,
      includePublic: false,
      ownerStatuses: statuses,
    });

    const tagSlugsByCharacter = await getCharacterTagSlugsMap(
      characters.map((character: RoleplayCharacter) => character.id)
    ).catch(() => new Map<string, string[]>());
    const items = await Promise.all(
      characters.map((character: RoleplayCharacter) =>
        toItem(character, tagSlugsByCharacter.get(character.id) ?? [])
      )
    );
    return respData({ characters: items });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) return respErr('roleplay tables not migrated');
    console.log('get my roleplay characters failed:', e);
    return respErr(e.message || 'get my roleplay characters failed');
  }
}
