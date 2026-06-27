import { PaymentType } from '@/extensions/payment/types';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import {
  calculateCreditExpirationTime,
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  NewCredit,
} from '@/shared/models/credit';
import {
  createOrder,
  findOrderByOrderNo,
  findOrderByTransactionId,
  OrderStatus,
  updateOrderByOrderNo,
  updateOrderInTransaction,
} from '@/shared/models/order';

export const MANUAL_CRYPTO_PROVIDER = 'manual_crypto';

type CryptoTopupUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type ManualCryptoTopupPlan = {
  id: string;
  title: string;
  amountUsd: number;
  credits: number;
  bonusCredits?: number;
  validDays: number;
};

export type ManualCryptoWalletOption = {
  id: string;
  label: string;
  network: string;
  asset: string;
  walletAddress: string;
  qrImageUrl?: string;
  chainId?: string;
  explorerTxUrl?: string;
};

export const DEFAULT_MANUAL_CRYPTO_TOPUP_PLANS: ManualCryptoTopupPlan[] = [
  {
    id: 'crypto-spark',
    title: 'Spark Top-up',
    amountUsd: 9,
    credits: 100,
    validDays: 0,
  },
  {
    id: 'crypto-glow',
    title: 'Glow Top-up',
    amountUsd: 19,
    credits: 300,
    bonusCredits: 30,
    validDays: 0,
  },
  {
    id: 'crypto-pro',
    title: 'Pro Top-up',
    amountUsd: 49,
    credits: 800,
    bonusCredits: 120,
    validDays: 0,
  },
];

export const DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS: ManualCryptoWalletOption[] = [
  {
    id: 'base-usdc',
    label: 'Base USDC',
    network: 'Base',
    asset: 'USDC',
    walletAddress: '0xA98FCC8d0c311AFE94148004Fba79F0e0bF5B4e8',
    qrImageUrl: '/crypto/base-usdc-qr.png',
    chainId: '8453',
  },
];

export function parseManualCryptoTopupPlans(raw?: string | null) {
  if (!raw?.trim()) return DEFAULT_MANUAL_CRYPTO_TOPUP_PLANS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_MANUAL_CRYPTO_TOPUP_PLANS;

    const plans = parsed
      .map((item) => ({
        id: String(item.id || '').trim(),
        title: String(item.title || item.name || '').trim(),
        amountUsd: Number(item.amountUsd ?? item.amount_usd),
        credits: Number(item.credits),
        bonusCredits: Number(item.bonusCredits ?? item.bonus_credits ?? 0),
        validDays: Number(item.validDays ?? item.valid_days ?? 0),
      }))
      .filter(
        (item) =>
          item.id &&
          item.title &&
          Number.isFinite(item.amountUsd) &&
          item.amountUsd > 0 &&
          Number.isFinite(item.credits) &&
          item.credits > 0
      );

    return plans.length ? plans : DEFAULT_MANUAL_CRYPTO_TOPUP_PLANS;
  } catch {
    return DEFAULT_MANUAL_CRYPTO_TOPUP_PLANS;
  }
}

export function getManualCryptoWalletAddress(configs: Record<string, string>) {
  return (
    configs.manual_crypto_wallet_address?.trim() ||
    configs.crypto_wallet_address?.trim() ||
    DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS[0].walletAddress
  );
}

export function getManualCryptoNetwork(configs: Record<string, string>) {
  return (
    configs.manual_crypto_network?.trim() ||
    configs.crypto_payment_network?.trim() ||
    DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS[0].network
  );
}

export function getManualCryptoAsset(configs: Record<string, string>) {
  return (
    configs.manual_crypto_asset?.trim() ||
    DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS[0].asset
  );
}

export function getManualCryptoQrImageUrl(configs: Record<string, string>) {
  return (
    configs.manual_crypto_qr_image?.trim() ||
    configs.manual_crypto_qr_url?.trim() ||
    DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS[0].qrImageUrl ||
    ''
  );
}

export function parseManualCryptoWalletOptions(
  raw?: string | null,
  fallback?: ManualCryptoWalletOption
) {
  if (!raw?.trim()) return fallback ? [fallback] : DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return fallback ? [fallback] : DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS;
    }

    const options = parsed
      .map((item) => ({
        id: String(item.id || '').trim(),
        label: String(item.label || item.name || '').trim(),
        network: String(item.network || '').trim(),
        asset: String(item.asset || '').trim(),
        walletAddress: String(
          item.walletAddress || item.wallet_address || item.address || ''
        ).trim(),
        qrImageUrl:
          String(item.qrImageUrl || item.qr_image_url || item.qr || '').trim() ||
          undefined,
        chainId: String(item.chainId || item.chain_id || '').trim() || undefined,
        explorerTxUrl:
          String(item.explorerTxUrl || item.explorer_tx_url || '').trim() ||
          undefined,
      }))
      .filter(
        (item) =>
          item.id &&
          item.label &&
          item.network &&
          item.asset &&
          item.walletAddress
      );

    return options.length
      ? options
      : fallback
        ? [fallback]
        : DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS;
  } catch {
    return fallback ? [fallback] : DEFAULT_MANUAL_CRYPTO_WALLET_OPTIONS;
  }
}

export function getManualCryptoTopupPlans(configs: Record<string, string>) {
  return parseManualCryptoTopupPlans(configs.manual_crypto_topup_plans);
}

export function getManualCryptoWalletOptions(configs: Record<string, string>) {
  const fallback: ManualCryptoWalletOption = {
    id: 'default',
    label: getManualCryptoNetwork(configs),
    network: getManualCryptoNetwork(configs),
    asset: getManualCryptoAsset(configs),
    walletAddress: getManualCryptoWalletAddress(configs),
    qrImageUrl: getManualCryptoQrImageUrl(configs),
  };

  return parseManualCryptoWalletOptions(
    configs.manual_crypto_wallet_options,
    fallback
  );
}

export function getManualCryptoWalletOption(
  configs: Record<string, string>,
  walletOptionId: string
) {
  const options = getManualCryptoWalletOptions(configs);
  return (
    options.find((option) => option.id === walletOptionId) ??
    options[0] ??
    null
  );
}

export function getManualCryptoTopupPlan(
  configs: Record<string, string>,
  planId: string
) {
  return getManualCryptoTopupPlans(configs).find((plan) => plan.id === planId);
}

export function getManualCryptoPlanCredits(plan: ManualCryptoTopupPlan) {
  return plan.credits + (plan.bonusCredits || 0);
}

function normalizeTxHash(raw: string) {
  return raw.trim().replace(/\s+/g, '').slice(0, 180);
}

export async function createManualCryptoTopupOrder({
  user,
  plan,
  walletOption,
  txHash,
  payerNote,
}: {
  user: CryptoTopupUser;
  plan: ManualCryptoTopupPlan;
  walletOption: ManualCryptoWalletOption;
  txHash: string;
  payerNote?: string;
}) {
  const normalizedTxHash = normalizeTxHash(txHash);
  if (!normalizedTxHash) {
    throw new Error('Transaction hash is required');
  }

  const existingOrder = await findOrderByTransactionId({
    transactionId: normalizedTxHash,
    paymentProvider: MANUAL_CRYPTO_PROVIDER,
  });
  if (existingOrder) {
    throw new Error('This transaction hash has already been submitted');
  }

  const orderNo = getSnowId();
  const now = new Date();
  const creditsAmount = getManualCryptoPlanCredits(plan);

  return createOrder({
    id: getUuid(),
    orderNo,
    userId: user.id,
    userEmail: user.email,
    status: OrderStatus.PENDING,
    amount: Math.round(plan.amountUsd * 100),
    currency: 'USD',
    productId: plan.id,
    paymentType: PaymentType.ONE_TIME,
    paymentInterval: 'one-time',
    paymentProvider: MANUAL_CRYPTO_PROVIDER,
    checkoutInfo: JSON.stringify({
      provider: MANUAL_CRYPTO_PROVIDER,
      walletOptionId: walletOption.id,
      network: walletOption.network,
      asset: walletOption.asset,
      walletAddress: walletOption.walletAddress,
      chainId: walletOption.chainId || '',
      explorerTxUrl: walletOption.explorerTxUrl || '',
      txHash: normalizedTxHash,
      payerNote: payerNote?.trim() || '',
    }),
    createdAt: now,
    updatedAt: now,
    productName: plan.title,
    description: `${plan.title} via ${walletOption.label}; expected ${plan.amountUsd} USD; tx ${normalizedTxHash}`,
    creditsAmount,
    creditsValidDays: plan.validDays,
    paymentAmount: Math.round(plan.amountUsd * 100),
    paymentCurrency: 'USD',
    transactionId: normalizedTxHash,
    paymentResult: JSON.stringify({
      provider: MANUAL_CRYPTO_PROVIDER,
      walletOptionId: walletOption.id,
      network: walletOption.network,
      asset: walletOption.asset,
      walletAddress: walletOption.walletAddress,
      chainId: walletOption.chainId || '',
      explorerTxUrl: walletOption.explorerTxUrl || '',
      txHash: normalizedTxHash,
      payerNote: payerNote?.trim() || '',
      submittedAt: now.toISOString(),
    }),
  });
}

export async function approveManualCryptoTopupOrder({
  orderNo,
  reviewerId,
}: {
  orderNo: string;
  reviewerId: string;
}) {
  const order = await findOrderByOrderNo(orderNo);
  if (!order) throw new Error('Order not found');
  if (order.paymentProvider !== MANUAL_CRYPTO_PROVIDER) {
    throw new Error('Order is not a manual crypto top-up');
  }
  if (![OrderStatus.PENDING, OrderStatus.CREATED].includes(order.status as any)) {
    throw new Error(`Order is not pending: ${order.status}`);
  }
  if (!order.creditsAmount || order.creditsAmount <= 0) {
    throw new Error('Order has no credits to grant');
  }

  const now = new Date();
  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: order.creditsValidDays || 0,
  });
  const newCredit: NewCredit = {
    id: getUuid(),
    userId: order.userId,
    userEmail: order.userEmail,
    orderNo: order.orderNo,
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.PAYMENT,
    credits: order.creditsAmount,
    remainingCredits: order.creditsAmount,
    description: `${order.productName || 'Crypto top-up'} approved`,
    expiresAt,
    status: CreditStatus.ACTIVE,
    metadata: JSON.stringify({
      type: 'manual-crypto-topup',
      provider: MANUAL_CRYPTO_PROVIDER,
      reviewedBy: reviewerId,
      reviewedAt: now.toISOString(),
      transactionId: order.transactionId,
    }),
  };

  return updateOrderInTransaction({
    orderNo: order.orderNo,
    updateOrder: {
      status: OrderStatus.PAID,
      paidAt: now,
      paymentResult: JSON.stringify({
        provider: MANUAL_CRYPTO_PROVIDER,
        transactionId: order.transactionId,
        reviewedBy: reviewerId,
        reviewedAt: now.toISOString(),
      }),
    },
    newCredit,
  });
}

export async function rejectManualCryptoTopupOrder({
  orderNo,
  reviewerId,
  reason,
}: {
  orderNo: string;
  reviewerId: string;
  reason?: string;
}) {
  const order = await findOrderByOrderNo(orderNo);
  if (!order) throw new Error('Order not found');
  if (order.paymentProvider !== MANUAL_CRYPTO_PROVIDER) {
    throw new Error('Order is not a manual crypto top-up');
  }
  if (![OrderStatus.PENDING, OrderStatus.CREATED].includes(order.status as any)) {
    throw new Error(`Order is not pending: ${order.status}`);
  }

  return updateOrderByOrderNo(order.orderNo, {
    status: OrderStatus.FAILED,
    paymentResult: JSON.stringify({
      provider: MANUAL_CRYPTO_PROVIDER,
      transactionId: order.transactionId,
      reviewedBy: reviewerId,
      reviewedAt: new Date().toISOString(),
      reason: reason?.trim() || 'Rejected by admin',
    }),
  });
}
