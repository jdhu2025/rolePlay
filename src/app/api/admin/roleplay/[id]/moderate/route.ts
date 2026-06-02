import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import {
  findRoleplayCharacterById,
  isMissingRoleplayTable,
  RoleplayStatus,
  RoleplayVisibility,
  updateRoleplayCharacter,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

/**
 * Admin moderation endpoint for roleplay characters.
 *
 * Body: `{ action: 'approve' | 'reject', reason?: string }`.
 *
 * Approve  → status = PUBLISHED, rejectionReason cleared.
 * Reject   → status = REJECTED, rejectionReason persisted (surfaces in
 *            /create list under the rejected card).
 *
 * The transition is only allowed from UNDER_REVIEW. We return 4xx (via
 * respErr's envelope) for any other source state so a stale review page
 * can't overwrite a freshly re-edited DRAFT.
 */
type ModeratePayload = {
  action?: 'approve' | 'reject';
  reason?: string;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) return respErr('forbidden');

    const payload = (await request.json().catch(() => ({}))) as ModeratePayload;
    const action = payload.action;
    if (action !== 'approve' && action !== 'reject') {
      return respErr('action must be approve or reject');
    }

    const character = await findRoleplayCharacterById(id);
    if (!character) return respErr('character not found');
    if (character.status !== RoleplayStatus.UNDER_REVIEW) {
      return respErr('only under-review characters can be moderated');
    }

    if (action === 'reject') {
      const reason = (payload.reason || '').trim();
      if (!reason) return respErr('rejection reason is required');
      const updated = await updateRoleplayCharacter(id, {
        status: RoleplayStatus.REJECTED,
        rejectionReason: reason.slice(0, 500),
      });
      return respData({
        character: { id: updated.id, status: updated.status },
      });
    }

    const updated = await updateRoleplayCharacter(id, {
      status: RoleplayStatus.PUBLISHED,
      visibility: RoleplayVisibility.PUBLIC,
      rejectionReason: '',
    });
    return respData({
      character: { id: updated.id, status: updated.status },
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) return respErr('roleplay tables not migrated');
    console.log('moderate roleplay character failed:', e);
    return respErr(e.message || 'moderate roleplay character failed');
  }
}
