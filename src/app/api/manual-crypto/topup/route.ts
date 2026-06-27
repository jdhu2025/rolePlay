import { respData, respErr } from '@/shared/lib/resp';
import {
  createManualCryptoTopupOrder,
  getManualCryptoTopupPlan,
  getManualCryptoWalletOption,
} from '@/shared/lib/manual-crypto-topup';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('Please sign in before submitting a top-up');

    const payload = await request.json();
    const planId = String(payload.planId || '').trim();
    const walletOptionId = String(payload.walletOptionId || '').trim();
    const txHash = String(payload.txHash || '').trim();
    const payerNote = String(payload.payerNote || '').trim();

    const configs = await getAllConfigs();
    const plan = getManualCryptoTopupPlan(configs, planId);
    if (!plan) return respErr('Invalid top-up plan');
    const walletOption = getManualCryptoWalletOption(configs, walletOptionId);
    if (!walletOption) return respErr('Invalid wallet option');

    const order = await createManualCryptoTopupOrder({
      user,
      plan,
      walletOption,
      txHash,
      payerNote,
    });

    return respData({
      orderNo: order.orderNo,
      status: order.status,
    });
  } catch (error: any) {
    console.log('manual crypto top-up submit failed:', error);
    return respErr(error.message || 'manual crypto top-up submit failed');
  }
}
