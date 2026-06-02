import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
  buildCharacterImageUrl,
  buildCharacterImageUrls,
} from '@/shared/lib/roleplay-assets';
import {
  getCharacterTagSlugs,
  getRoleplayCharactersForReview,
  isMissingRoleplayTable,
  RoleplayStatus,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

/**
 * Admin moderation queue feed.
 *
 * `?status=under_review|rejected|published` lets the review console flip
 * between the active queue and a recent-decisions audit view; default is
 * the queue. Returns rich enough rows for the moderator to make a call
 * without opening a per-character drawer (avatar + cover + intro + tags).
 */
export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) return respErr('forbidden');

    const url = new URL(request.url);
    const filter = url.searchParams.get('status') || 'under_review';
    const status =
      filter === 'rejected'
        ? RoleplayStatus.REJECTED
        : filter === 'published'
          ? RoleplayStatus.PUBLISHED
          : RoleplayStatus.UNDER_REVIEW;

    const characters = await getRoleplayCharactersForReview({
      status,
      limit: 100,
    });

    const items = await Promise.all(
      characters.map(async (character) => {
        const galleryFilenames = safeJsonParse<string[]>(
          (character as any).gallery ?? '[]',
          []
        );
        const tagSlugs = await getCharacterTagSlugs(character.id).catch(
          () => [] as string[]
        );
        return {
          id: character.id,
          name: character.name,
          authorName: character.authorName,
          status: character.status,
          visibility: character.visibility,
          tagline: character.tagline,
          intro: character.intro,
          settings: character.settings,
          opening: character.opening,
          rejectionReason: (character as any).rejectionReason ?? '',
          avatar: buildCharacterImageUrl(character.avatarUrl),
          cover: buildCharacterImageUrl(character.coverUrl),
          gallery: buildCharacterImageUrls(galleryFilenames),
          tagSlugs,
          updatedAt: character.updatedAt,
        };
      })
    );

    return respData({ characters: items, status });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({ characters: [], migrationRequired: true });
    }
    console.log('list roleplay review queue failed:', e);
    return respErr(e.message || 'list roleplay review queue failed');
  }
}
