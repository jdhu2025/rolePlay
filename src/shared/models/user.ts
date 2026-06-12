import { headers } from 'next/headers';
import { count, desc, eq, inArray } from 'drizzle-orm';

import { getAuth } from '@/core/auth';
import { db } from '@/core/db';
import { user } from '@/config/db/schema';
import { withTransientDatabaseRetry } from '@/shared/lib/db-resilience';
import { getConfiguredDatabaseRetryOptions } from '@/shared/lib/server/db-retry-config';

import { Permission, Role } from '../services/rbac';
import { getRemainingCredits } from './credit';

export interface UserCredits {
  remainingCredits: number;
  expiresAt: Date | null;
}

export type User = typeof user.$inferSelect & {
  isAdmin?: boolean;
  credits?: UserCredits;
  roles?: Role[];
  permissions?: Permission[];
};
export type NewUser = typeof user.$inferInsert;
export type UpdateUser = Partial<Omit<NewUser, 'id' | 'createdAt' | 'email'>>;

export async function updateUser(userId: string, updatedUser: UpdateUser) {
  const [result] = await db()
    .update(user)
    .set(updatedUser)
    .where(eq(user.id, userId))
    .returning();

  return result;
}

export async function findUserById(userId: string) {
  const retryOptions = await getConfiguredDatabaseRetryOptions();
  const [result] = await withTransientDatabaseRetry<User[]>(
    () => db().select().from(user).where(eq(user.id, userId)),
    retryOptions
  );

  return result;
}

export async function getUsers({
  page = 1,
  limit = 30,
  email,
}: {
  email?: string;
  page?: number;
  limit?: number;
} = {}): Promise<User[]> {
  const result = await db()
    .select()
    .from(user)
    .where(email ? eq(user.email, email) : undefined)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUsersCount({ email }: { email?: string }) {
  const [result] = await db()
    .select({ count: count() })
    .from(user)
    .where(email ? eq(user.email, email) : undefined);
  return result?.count || 0;
}

export async function getUserByUserIds(userIds: string[]) {
  const result = await db()
    .select()
    .from(user)
    .where(inArray(user.id, userIds));

  return result;
}

export async function getUserInfo() {
  const signUser = await getSignUser();

  return signUser;
}

function isFailedToGetSessionError(error: unknown) {
  const anyError = error as any;
  const message = String(anyError?.message || '');
  const status = String(anyError?.status || anyError?.statusCode || '');
  const bodyMessage = String(anyError?.body?.message || '');

  return (
    message === 'Failed to get session' ||
    bodyMessage === 'Failed to get session' ||
    (status === 'INTERNAL_SERVER_ERROR' &&
      (message.includes('Failed to get session') ||
        bodyMessage.includes('Failed to get session')))
  );
}

export async function getOptionalUserInfo() {
  try {
    return await getUserInfo();
  } catch (error) {
    if (isFailedToGetSessionError(error)) {
      return null;
    }
    throw error;
  }
}

export async function getUserCredits(userId: string) {
  const remainingCredits = await getRemainingCredits(userId);

  return { remainingCredits };
}

export async function getSignUser() {
  const requestHeaders = await headers();
  const session = await withTransientDatabaseRetry(async () => {
    const auth = await getAuth();
    return auth.api.getSession({
      headers: requestHeaders,
    });
  });

  return session?.user;
}

export async function isEmailVerified(email: string): Promise<boolean> {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  if (!normalized) return false;

  const [row] = await db()
    .select({ emailVerified: user.emailVerified })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  return !!row?.emailVerified;
}

export async function appendUserToResult(result: any) {
  if (!result || !result.length) {
    return result;
  }

  const userIds = result.map((item: any) => item.userId);
  const users = await getUserByUserIds(userIds);
  result = result.map((item: any) => {
    const user = users.find((user: any) => user.id === item.userId);
    return { ...item, user };
  });

  return result;
}
