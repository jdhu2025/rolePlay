import { PERMISSIONS } from '@/core/rbac';
import { respData, respErr } from '@/shared/lib/resp';
import { getRoleplayQualityReport } from '@/shared/models/roleplay-quality';
import { isMissingRoleplayTable } from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) return respErr('forbidden');

    const url = new URL(request.url);
    const days = Math.max(
      1,
      Math.min(90, Number(url.searchParams.get('days')) || 14)
    );
    const report = await getRoleplayQualityReport({ days });
    return respData(report);
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({ migrationRequired: true, items: [] });
    }
    console.log('load roleplay quality report failed:', e);
    return respErr(e.message || 'load roleplay quality report failed');
  }
}
