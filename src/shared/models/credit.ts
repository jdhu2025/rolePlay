import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  inArray,
  isNull,
  or,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { credit } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';

import { getAllConfigs } from './config';
import { appendUserToResult, User } from './user';

export type Credit = typeof credit.$inferSelect & {
  user?: User;
};
export type NewCredit = typeof credit.$inferInsert;
export type UpdateCredit = Partial<
  Omit<NewCredit, 'id' | 'transactionNo' | 'createdAt'>
>;

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant', // grant credit
  CONSUME = 'consume', // consume credit
}

export enum CreditTransactionScene {
  PAYMENT = 'payment', // payment
  SUBSCRIPTION = 'subscription', // subscription
  RENEWAL = 'renewal', // renewal
  GIFT = 'gift', // gift
  REWARD = 'reward', // reward
  ROLEPLAY_FREE_PLAY = 'roleplay_free_play', // admin-granted roleplay test pass
}

export const ROLEPLAY_FREE_PLAY_DESCRIPTION = 'roleplay_free_play';
export const ROLEPLAY_STARTER_CREDITS_DEFAULTS = {
  enabled: true,
  amount: 120,
  validDays: 10,
  description: 'RolePlay starter credits',
} as const;

const INITIAL_CREDIT_DESCRIPTIONS = [
  'initial credits',
  'RolePlay starter credits',
];

// Calculate credit expiration time based on order and subscription info
export function calculateCreditExpirationTime({
  creditsValidDays,
  currentPeriodEnd,
}: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const now = new Date();

  // Check if credits should never expire
  if (!creditsValidDays || creditsValidDays <= 0) {
    // never expires
    return null;
  }

  const expiresAt = new Date();

  if (currentPeriodEnd) {
    // For subscription: credits expire at the end of current period
    expiresAt.setTime(currentPeriodEnd.getTime());
  } else {
    // For one-time payment: use configured validity days
    expiresAt.setDate(now.getDate() + creditsValidDays);
  }

  return expiresAt;
}

// Helper function to create expiration condition for queries
export function createExpirationCondition() {
  const currentTime = new Date();
  // Credit is valid if: expires_at IS NULL OR expires_at > current_time
  return or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime));
}

// create credit
export async function createCredit(newCredit: NewCredit) {
  const [result] = await db().insert(credit).values(newCredit).returning();
  return result;
}

// get credits
export async function getCredits({
  userId,
  status,
  transactionType,
  getUser = false,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  getUser?: boolean;
  page?: number;
  limit?: number;
}): Promise<Credit[]> {
  const result = await db()
    .select()
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

// get credits count
export async function getCreditsCount({
  userId,
  status,
  transactionType,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    );

  return result?.count || 0;
}

// consume credits
export async function consumeCredits({
  userId,
  credits,
  scene,
  description,
  metadata,
  tx,
}: {
  userId: string;
  credits: number; // credits to consume
  scene?: string;
  description?: string;
  metadata?: string;
  tx?: any;
}) {
  const currentTime = new Date();

  // consume credits
  const execute = async (tx: any) => {
    // 1. check credits balance
    const [creditsBalance] = await tx
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      );

    // balance is not enough
    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseInt(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    // 2. get available credits, FIFO queue with expiresAt, batch query
    let remainingToConsume = credits; // remaining credits to consume

    // only deal with 10000 credit grant records
    let batchNo = 1; // batch no
    const maxBatchNo = 10; // max batch no
    const batchSize = 1000; // batch size
    const consumedItems: any[] = [];

    while (remainingToConsume > 0) {
      // get batch credits
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(
              isNull(credit.expiresAt), // Never expires
              gt(credit.expiresAt, currentTime) // Not yet expired
            )
          )
        )
        .orderBy(
          // FIFO queue: expired credits first, then by expiration date
          // NULL values (never expires) will be ordered last
          asc(credit.expiresAt)
        )
        .limit(batchSize) // batch size
        .offset((batchNo - 1) * batchSize) // offset
        .for('update'); // lock for update

      // no more credits
      if (batchCredits?.length === 0) {
        break;
      }

      // consume credits for each item
      for (const item of batchCredits) {
        // no need to consume more
        if (remainingToConsume <= 0) {
          break;
        }
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        // update remaining credits
        await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(eq(credit.id, item.id));

        // update consumed items
        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
          batchSize: batchSize,
          batchNo: batchNo,
        });

        batchNo += 1;
        remainingToConsume -= toConsume;

        // if too many batches, throw error
        if (batchNo > maxBatchNo) {
          throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
        }
      }
    }

    // 3. create consumed credit
    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: description,
      credits: -credits,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: metadata,
    };
    await tx.insert(credit).values(consumedCredit);

    return consumedCredit;
  };

  // use provided transaction
  if (tx) {
    return await execute(tx);
  }

  // use default transaction
  return await db().transaction(execute);
}

// get remaining credits
export async function getRemainingCredits(userId: string): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    );

  return parseInt(result?.total || '0');
}

export async function hasActiveRoleplayFreePlay(userId: string): Promise<boolean> {
  const [result] = await db()
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.ROLEPLAY_FREE_PLAY),
        eq(credit.description, ROLEPLAY_FREE_PLAY_DESCRIPTION),
        eq(credit.status, CreditStatus.ACTIVE),
        createExpirationCondition()
      )
    )
    .limit(1);

  return Boolean(result?.id);
}

export async function grantRoleplayFreePlayForUser({
  user,
  validDays,
}: {
  user: User;
  validDays?: number;
}) {
  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: validDays && validDays > 0 ? validDays : 0,
  });

  const [existing] = await db()
    .select({ id: credit.id })
    .from(credit)
    .where(
      and(
        eq(credit.userId, user.id),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.ROLEPLAY_FREE_PLAY),
        eq(credit.description, ROLEPLAY_FREE_PLAY_DESCRIPTION),
        eq(credit.status, CreditStatus.ACTIVE)
      )
    )
    .limit(1);

  if (existing?.id) {
    await db()
      .update(credit)
      .set({
        expiresAt,
        metadata: JSON.stringify({
          type: 'roleplay-free-play',
          grantedBy: 'admin',
          updatedAt: new Date().toISOString(),
        }),
      })
      .where(eq(credit.id, existing.id));
    return;
  }

  const freePlayGrant: NewCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.ROLEPLAY_FREE_PLAY,
    credits: 0,
    remainingCredits: 0,
    description: ROLEPLAY_FREE_PLAY_DESCRIPTION,
    expiresAt,
    status: CreditStatus.ACTIVE,
    metadata: JSON.stringify({
      type: 'roleplay-free-play',
      grantedBy: 'admin',
    }),
  };

  await createCredit(freePlayGrant);

  return freePlayGrant;
}

export async function revokeRoleplayFreePlayForUser(userId: string) {
  await db()
    .update(credit)
    .set({ status: CreditStatus.DELETED })
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.ROLEPLAY_FREE_PLAY),
        eq(credit.description, ROLEPLAY_FREE_PLAY_DESCRIPTION),
        eq(credit.status, CreditStatus.ACTIVE)
      )
    );
}

export async function hasInitialCreditsGrant({
  userId,
  description,
}: {
  userId: string;
  description: string;
}) {
  const descriptions = Array.from(
    new Set([...INITIAL_CREDIT_DESCRIPTIONS, description].filter(Boolean))
  );

  const existingGrants = await db()
    .select({
      id: credit.id,
      description: credit.description,
      metadata: credit.metadata,
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        inArray(credit.status, [CreditStatus.ACTIVE, CreditStatus.EXPIRED]),
        or(
          inArray(credit.description, descriptions),
          eq(credit.transactionScene, CreditTransactionScene.GIFT)
        )
      )
    )
    .limit(200);

  return existingGrants.some(
    (item: { description: string | null; metadata: string | null }) => {
      if (descriptions.includes(item.description || '')) return true;
      try {
        const metadata = JSON.parse(item.metadata || '{}');
        return metadata?.type === 'initial-credits';
      } catch {
        return false;
      }
    }
  );
}

function isEnabledConfigValue(value: unknown, defaultValue: boolean) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;

  return defaultValue;
}

function parsePositiveIntegerConfig(value: unknown, defaultValue: number) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  const parsed = parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return defaultValue;

  return parsed;
}

export function resolveStarterCreditsConfig(configs: Record<string, string>) {
  const enabled = isEnabledConfigValue(
    configs.initial_credits_enabled,
    ROLEPLAY_STARTER_CREDITS_DEFAULTS.enabled
  );
  const amount = parsePositiveIntegerConfig(
    configs.initial_credits_amount,
    ROLEPLAY_STARTER_CREDITS_DEFAULTS.amount
  );
  const validDays = parsePositiveIntegerConfig(
    configs.initial_credits_valid_days,
    ROLEPLAY_STARTER_CREDITS_DEFAULTS.validDays
  );
  const description =
    configs.initial_credits_description?.trim() ||
    ROLEPLAY_STARTER_CREDITS_DEFAULTS.description;

  return {
    enabled,
    amount,
    validDays,
    description,
  };
}

// grant credits for new user
export async function grantCreditsForNewUser(
  user: User,
  options: { logSkipped?: boolean } = {}
) {
  const logSkipped = options.logSkipped ?? true;

  // get configs from db
  const configs = await getAllConfigs();
  const starterCredits = resolveStarterCreditsConfig(configs);

  // if initial credits enabled
  if (!starterCredits.enabled) {
    if (logSkipped) {
      console.info('roleplay starter credits skipped: disabled', {
        userId: user.id,
      });
    }
    return;
  }

  // get initial credits amount and valid days
  const credits = starterCredits.amount;
  if (credits <= 0) {
    if (logSkipped) {
      console.info('roleplay starter credits skipped: non-positive amount', {
        userId: user.id,
        credits,
      });
    }
    return;
  }

  if (
    await hasInitialCreditsGrant({
      userId: user.id,
      description: starterCredits.description,
    })
  ) {
    if (logSkipped) {
      console.info('roleplay starter credits skipped: existing grant', {
        userId: user.id,
      });
    }
    return;
  }

  const newCredit = await grantCreditsForUser({
    user: user,
    credits: credits,
    validDays: starterCredits.validDays,
    description: starterCredits.description,
    metadata: JSON.stringify({
      type: 'initial-credits',
      source: 'new-user',
      amount: credits,
      validDays: starterCredits.validDays,
    }),
  });

  console.info('roleplay starter credits granted', {
    userId: user.id,
    creditId: newCredit?.id,
    credits,
    validDays: starterCredits.validDays,
  });

  return newCredit;
}

// grant credits for user
export async function grantCreditsForUser({
  user,
  credits,
  validDays,
  description,
  metadata,
}: {
  user: User;
  credits: number;
  validDays?: number;
  description?: string;
  metadata?: string;
}) {
  if (credits <= 0) {
    return;
  }

  const creditsValidDays = validDays && validDays > 0 ? validDays : 0;

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: creditsValidDays,
  });

  const creditDescription = description || 'grant credits';

  const newCredit: NewCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: credits,
    remainingCredits: credits,
    description: creditDescription,
    expiresAt: expiresAt,
    status: CreditStatus.ACTIVE,
    metadata,
  };

  await createCredit(newCredit);

  return newCredit;
}
