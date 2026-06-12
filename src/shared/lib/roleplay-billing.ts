import { withTransientDatabaseRetry } from '@/shared/lib/db-resilience';
import { getConfiguredDatabaseRetryOptions } from '@/shared/lib/server/db-retry-config';
import {
  consumeCredits,
  CreditStatus,
  CreditTransactionType,
  getCredits,
  getRemainingCredits,
  grantCreditsForNewUser,
  hasActiveRoleplayFreePlay,
} from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

const ADMIN_ACCESS_PERMISSION = 'admin.access';

export type RoleplayBillingAction =
  | 'roleplay_text'
  | 'roleplay_image'
  | 'roleplay_voice'
  | 'roleplay_ai_writer_text'
  | 'roleplay_ai_writer_image'
  | 'roleplay_publish_public'
  | 'roleplay_publish_private';

export const ROLEPLAY_CREDIT_COSTS: Record<RoleplayBillingAction, number> = {
  roleplay_text: 1,
  roleplay_image: 40,
  roleplay_voice: 3,
  roleplay_ai_writer_text: 5,
  roleplay_ai_writer_image: 20,
  roleplay_publish_public: 10,
  roleplay_publish_private: 0,
};

export class RoleplayInsufficientCreditsError extends Error {
  data: {
    reason: 'insufficient_credits';
    action: RoleplayBillingAction;
    requiredCredits: number;
    remainingCredits: number;
  };

  constructor({
    action,
    requiredCredits,
    remainingCredits,
  }: {
    action: RoleplayBillingAction;
    requiredCredits: number;
    remainingCredits: number;
  }) {
    super('insufficient credits');
    this.name = 'RoleplayInsufficientCreditsError';
    this.data = {
      reason: 'insufficient_credits',
      action,
      requiredCredits,
      remainingCredits,
    };
  }
}

export function isRoleplayInsufficientCreditsError(
  error: unknown
): error is RoleplayInsufficientCreditsError {
  return error instanceof RoleplayInsufficientCreditsError;
}

export function getRoleplayRequestIdempotencyKey(
  request: Request,
  bodyRequestId?: unknown
) {
  const raw =
    request.headers.get('x-idempotency-key') ||
    request.headers.get('idempotency-key') ||
    (typeof bodyRequestId === 'string' ? bodyRequestId : '');

  return raw.trim().slice(0, 200);
}

async function findExistingRoleplayConsumption({
  userId,
  action,
  idempotencyKey,
}: {
  userId: string;
  action: RoleplayBillingAction;
  idempotencyKey?: string;
}) {
  if (!idempotencyKey) return null;

  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const recentConsumedCredits = await withTransientDatabaseRetry(
    () =>
      getCredits({
        userId,
        status: CreditStatus.ACTIVE,
        transactionType: CreditTransactionType.CONSUME,
        limit: 100,
      }),
    retryOptions
  );

  return (
    recentConsumedCredits.find((item) => {
      if (item.transactionScene !== action) return false;
      try {
        const metadata = JSON.parse(item.metadata || '{}');
        return metadata?.idempotencyKey === idempotencyKey;
      } catch {
        return false;
      }
    }) || null
  );
}

async function ensureStarterCreditsBeforePaidRoleplayCheck(userId: string) {
  try {
    const retryOptions = await getConfiguredDatabaseRetryOptions();
    const user = await withTransientDatabaseRetry(
      () => findUserById(userId),
      retryOptions
    );
    if (!user) return;

    const grant = await withTransientDatabaseRetry(
      () => grantCreditsForNewUser(user, { logSkipped: false }),
      retryOptions
    );
    if (!grant) return;

    console.info('roleplay starter credits lazy-granted before billing check', {
      userId,
      creditId: grant.id,
      credits: grant.credits,
      expiresAt: grant.expiresAt,
    });
  } catch (error) {
    console.warn('roleplay starter credits lazy grant failed', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getRoleplayBillingEntitlement(userId?: string | null) {
  if (!userId) {
    return {
      freePlay: false,
      freePlayReason: '',
    };
  }

  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [adminAccess, grantedFreePlay] = await Promise.all([
    withTransientDatabaseRetry(
      () => hasPermission(userId, ADMIN_ACCESS_PERMISSION),
      retryOptions
    ).catch(() => false),
    withTransientDatabaseRetry(
      () => hasActiveRoleplayFreePlay(userId),
      retryOptions
    ),
  ]);

  return {
    freePlay: adminAccess || grantedFreePlay,
    freePlayReason: adminAccess
      ? 'admin'
      : grantedFreePlay
        ? 'admin_grant'
        : '',
  };
}

export async function assertRoleplayCreditsAvailable({
  userId,
  action,
  cost,
  idempotencyKey,
}: {
  userId?: string | null;
  action: RoleplayBillingAction;
  cost?: number;
  idempotencyKey?: string;
}) {
  if (!userId) {
    throw new Error('no auth, please sign in');
  }

  const existingConsumption = await findExistingRoleplayConsumption({
    userId,
    action,
    idempotencyKey,
  });
  if (existingConsumption) {
    return {
      costCredits: 0,
      freePlay: false,
      idempotent: true,
      consumedCreditId: existingConsumption.id,
    };
  }

  const entitlement = await getRoleplayBillingEntitlement(userId);
  const costCredits = entitlement.freePlay
    ? 0
    : (cost ?? ROLEPLAY_CREDIT_COSTS[action] ?? 0);

  if (costCredits <= 0) {
    return { costCredits, freePlay: entitlement.freePlay };
  }

  await ensureStarterCreditsBeforePaidRoleplayCheck(userId);

  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const remainingCredits = await withTransientDatabaseRetry(
    () => getRemainingCredits(userId),
    retryOptions
  );
  if (remainingCredits < costCredits) {
    throw new RoleplayInsufficientCreditsError({
      action,
      requiredCredits: costCredits,
      remainingCredits,
    });
  }

  return { costCredits, freePlay: false, idempotent: false };
}

export async function consumeRoleplayCredits({
  userId,
  action,
  cost,
  description,
  metadata,
  idempotencyKey,
}: {
  userId: string;
  action: RoleplayBillingAction;
  cost?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
}) {
  const existingConsumption = await findExistingRoleplayConsumption({
    userId,
    action,
    idempotencyKey,
  });
  if (existingConsumption) {
    return existingConsumption;
  }

  const billing = await assertRoleplayCreditsAvailable({
    userId,
    action,
    cost,
    idempotencyKey,
  });

  if (billing.costCredits <= 0) {
    return null;
  }

  const retryOptions = await getConfiguredDatabaseRetryOptions();
  return withTransientDatabaseRetry(
    () =>
      consumeCredits({
        userId,
        credits: billing.costCredits,
        scene: action,
        description: description || action,
        metadata:
          metadata || idempotencyKey
            ? JSON.stringify({
                ...(metadata || {}),
                idempotencyKey: idempotencyKey || undefined,
              })
            : undefined,
      }),
    retryOptions
  );
}
