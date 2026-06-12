import {
  DEFAULT_DATABASE_RETRY_OPTIONS,
  getDatabaseRetryOptions,
  RetryOptions,
} from '@/shared/lib/db-resilience';
import { getAllConfigs } from '@/shared/models/config';

function readPositiveInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export async function getConfiguredDatabaseRetryOptions(): Promise<RetryOptions> {
  const envOptions = getDatabaseRetryOptions();

  try {
    const configs = await getAllConfigs();
    return {
      timeoutMs: readPositiveInt(
        configs.roleplay_db_timeout_ms,
        envOptions.timeoutMs ?? DEFAULT_DATABASE_RETRY_OPTIONS.timeoutMs
      ),
      retries: readPositiveInt(
        configs.roleplay_db_retries,
        envOptions.retries ?? DEFAULT_DATABASE_RETRY_OPTIONS.retries
      ),
      delayMs: readPositiveInt(
        configs.roleplay_db_retry_delay_ms,
        envOptions.delayMs ?? DEFAULT_DATABASE_RETRY_OPTIONS.delayMs
      ),
    };
  } catch (error) {
    console.warn('load roleplay database retry settings failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return envOptions;
  }
}
