import { closeDb } from '@/core/db';

export type RetryOptions = {
  retries?: number;
  delayMs?: number;
  timeoutMs?: number;
};

export const DEFAULT_DATABASE_RETRY_OPTIONS = {
  timeoutMs: 10_000,
  retries: 1,
  delayMs: 180,
} satisfies Required<RetryOptions>;

const TRANSIENT_DATABASE_ERROR_MARKER = '__roleplayTransientDatabaseError';

function readPositiveIntEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function getDatabaseRetryOptions({
  timeoutMs = readPositiveIntEnv(
    'ROLEPLAY_DB_TIMEOUT_MS',
    DEFAULT_DATABASE_RETRY_OPTIONS.timeoutMs
  ),
  retries = readPositiveIntEnv(
    'ROLEPLAY_DB_RETRIES',
    DEFAULT_DATABASE_RETRY_OPTIONS.retries
  ),
  delayMs = readPositiveIntEnv(
    'ROLEPLAY_DB_RETRY_DELAY_MS',
    DEFAULT_DATABASE_RETRY_OPTIONS.delayMs
  ),
}: RetryOptions = {}): RetryOptions {
  return { timeoutMs, retries, delayMs };
}

function markTransientDatabaseError(error: unknown) {
  if (error && typeof error === 'object') {
    try {
      Object.defineProperty(error, TRANSIENT_DATABASE_ERROR_MARKER, {
        configurable: true,
        enumerable: false,
        value: true,
      });
    } catch {
      (error as Record<string, unknown>)[TRANSIENT_DATABASE_ERROR_MARKER] = true;
    }
  }

  return error;
}

export function isMarkedTransientDatabaseError(error: unknown) {
  return Boolean(
    error &&
      typeof error === 'object' &&
      (error as Record<string, unknown>)[TRANSIENT_DATABASE_ERROR_MARKER]
  );
}

export function isTransientDatabaseError(error: unknown) {
  const anyError = error as any;
  const code = String(
    anyError?.code || anyError?.errno || anyError?.cause?.code || ''
  ).toUpperCase();
  const message = String(anyError?.message || anyError || '').toLowerCase();
  const causeMessage = String(anyError?.cause?.message || '').toLowerCase();
  const text = `${message}\n${causeMessage}`;

  return (
    code === 'CONNECTION_CLOSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    text.includes('connection_closed') ||
    text.includes('connection closed') ||
    text.includes('connection terminated') ||
    text.includes('connection ended') ||
    text.includes('socket hang up') ||
    text.includes('write econnreset') ||
    text.includes('write epipe') ||
    text.includes('timeout')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  if (!timeoutMs || timeoutMs <= 0) return promise;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(
        `database operation timed out after ${timeoutMs}ms`
      ) as Error & { code?: string };
      error.name = 'DatabaseOperationTimeoutError';
      error.code = 'ETIMEDOUT';
      reject(markTransientDatabaseError(error));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

async function recoverTransientDatabaseConnection() {
  await closeDb().catch(() => {});
}

export async function withTransientDatabaseRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries = 1, delayMs = 120, timeoutMs = 0 } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      lastError = error;
      const transientDatabaseError = isTransientDatabaseError(error);
      if (!transientDatabaseError) {
        throw error;
      }

      markTransientDatabaseError(error);
      await recoverTransientDatabaseConnection();

      if (attempt >= retries) {
        throw error;
      }

      if (delayMs > 0) await sleep(delayMs);
    }
  }

  throw lastError;
}
