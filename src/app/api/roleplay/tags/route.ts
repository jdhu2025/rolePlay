import { respData, respErr } from '@/shared/lib/resp';
import {
  getRoleplayTags,
  isMissingRoleplayTable,
} from '@/shared/models/roleplay';

export const revalidate = 3600;

/**
 * `/api/roleplay/tags` — public read of the canonical tag taxonomy.
 *
 * Used by the /create form (multi-select chips) and the homepage filter
 * row. Returns tags in `sort_order` already, so the client can render them
 * verbatim without re-sorting.
 */
export async function GET() {
  try {
    const tags = await getRoleplayTags();
    return respData({
      tags: tags.map((tag) => ({
        id: tag.id,
        slug: tag.slug,
        labelEn: tag.labelEn,
        labelZh: tag.labelZh,
        sortOrder: tag.sortOrder,
      })),
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({ tags: [], migrationRequired: true });
    }
    console.log('list roleplay tags failed:', e);
    return respErr(e.message || 'list roleplay tags failed');
  }
}
