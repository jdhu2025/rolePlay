import { respData, respErr } from '@/shared/lib/resp';
import {
  approveManualCryptoTopupOrder,
  rejectManualCryptoTopupOrder,
} from '@/shared/lib/manual-crypto-topup';
import { getUserInfo } from '@/shared/models/user';
import { hasRole, ROLES } from '@/shared/services/rbac';

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth');

    const isSuperAdmin = await hasRole(user.id, ROLES.SUPER_ADMIN);
    if (!isSuperAdmin) return respErr('super admin permission required');

    const payload = await request.json();
    const orderNo = String(payload.orderNo || '').trim();
    const action = String(payload.action || '').trim();
    const reason = String(payload.reason || '').trim();
    const confirmedOnChain = payload.confirmedOnChain === true;

    if (!orderNo) return respErr('orderNo is required');

    if (action === 'approve') {
      if (!confirmedOnChain) {
        return respErr('Confirm the on-chain payment before approving credits');
      }

      await approveManualCryptoTopupOrder({
        orderNo,
        reviewerId: user.id,
      });
      return respData({ status: 'approved' });
    }

    if (action === 'reject') {
      await rejectManualCryptoTopupOrder({
        orderNo,
        reviewerId: user.id,
        reason,
      });
      return respData({ status: 'rejected' });
    }

    return respErr('invalid action');
  } catch (error: any) {
    console.log('manual crypto top-up review failed:', error);
    return respErr(error.message || 'manual crypto top-up review failed');
  }
}
