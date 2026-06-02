import { closeDb } from '@/core/db';

type RetryOptions = {
  retries?: number;
  delayMs?: number;
  timeoutMs?: number;
};

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

  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(`database operation timed out after ${timeoutMs}ms`)
          ),
        timeoutMs
      );
    }),
  ]);
}

export async function withTransientDatabaseRetry<T>(
  fn: () => Promise<T>,
  { retries = 1, delayMs = 120, timeoutMs = 0 }: RetryOptions = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await withTimeout(fn(), timeoutMs);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !isTransientDatabaseError(error)) {
        throw error;
      }

      await closeDb().catch(() => {});
      if (delayMs > 0) await sleep(delayMs);
    }
  }

  throw lastError;
}
