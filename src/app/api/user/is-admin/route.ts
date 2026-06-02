import { PERMISSIONS } from '@/core/rbac';
import { respData } from '@/shared/lib/resp';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

/**
 * Lightweight client-side admin probe.
 *
 * The roleplay nav drawer needs to know whether to render the admin
 * shortcuts (e.g. /admin/roleplay/review). Hitting `/api/user/get-user-info`
 * works but pulls in credits + the full user object on every drawer mount.
 * This endpoint is auth-only and returns a single boolean so the drawer can
 * stay snappy without leaking permission details to anonymous users.
 *
 * Always returns 200 with `{ isAdmin: false }` for unauthenticated callers
 * so the client can call this on every page without needing to special-case
 * the not-signed-in state.
 */
export async function GET() {
  const user = await getUserInfo().catch(() => null);
  if (!user) return respData({ isAdmin: false });
  const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS).catch(
    () => false
  );
  return respData({ isAdmin });
}
