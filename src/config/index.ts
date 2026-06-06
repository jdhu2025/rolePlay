import packageJson from '../../package.json';

// Note: Environment variables are loaded via dotenv-cli in package.json scripts.
// Next.js automatically loads .env files in the runtime, so no manual loading is needed here.

export type ConfigMap = Record<string, string>;

export function normalizeAbsoluteUrl(value: unknown, fallback = '') {
  const raw = String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  if (!raw) return fallback;
  if (['undefined', 'null'].includes(raw.toLowerCase())) return fallback;

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function readVercelUrl() {
  return (
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_BRANCH_URL ||
    process.env.VERCEL_URL ||
    ''
  );
}

export function getConfiguredAppUrl(fallback = 'http://localhost:3000') {
  return (
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeAbsoluteUrl(readVercelUrl()) ||
    fallback
  );
}

export function getConfiguredAuthUrl(fallback = '') {
  return (
    normalizeAbsoluteUrl(process.env.AUTH_URL) ||
    normalizeAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    normalizeAbsoluteUrl(readVercelUrl()) ||
    fallback
  );
}

export const envConfigs: ConfigMap = {
  app_url: getConfiguredAppUrl(),
  app_name: process.env.NEXT_PUBLIC_APP_NAME ?? 'RolePlay',
  app_description: process.env.NEXT_PUBLIC_APP_DESCRIPTION ?? '',
  app_logo: process.env.NEXT_PUBLIC_APP_LOGO ?? '/logo.png',
  app_favicon: process.env.NEXT_PUBLIC_APP_FAVICON ?? '/favicon.ico',
  app_preview_image:
    process.env.NEXT_PUBLIC_APP_PREVIEW_IMAGE ?? '/preview.png',
  theme: process.env.NEXT_PUBLIC_THEME ?? 'default',
  appearance: process.env.NEXT_PUBLIC_APPEARANCE ?? 'system',
  locale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE ?? 'en',
  database_url: process.env.DATABASE_URL ?? '',
  database_auth_token: process.env.DATABASE_AUTH_TOKEN ?? '',
  database_provider: process.env.DATABASE_PROVIDER ?? 'postgresql',
  db_schema_file: process.env.DB_SCHEMA_FILE ?? './src/config/db/schema.ts',
  // PostgreSQL schema name (e.g. 'web'). Default: 'public'
  db_schema: process.env.DB_SCHEMA ?? 'public',
  // Drizzle migrations journal table name (avoid conflicts across projects)
  db_migrations_table:
    process.env.DB_MIGRATIONS_TABLE ?? '__drizzle_migrations',
  // Drizzle migrations journal schema (default in drizzle-kit is 'drizzle')
  // We keep 'public' as template default for stability on fresh Supabase DBs.
  db_migrations_schema: process.env.DB_MIGRATIONS_SCHEMA ?? 'drizzle',
  // Output folder for drizzle-kit generated migrations
  db_migrations_out:
    process.env.DB_MIGRATIONS_OUT ?? './src/config/db/migrations',
  db_singleton_enabled: process.env.DB_SINGLETON_ENABLED || 'false',
  db_max_connections: process.env.DB_MAX_CONNECTIONS || '1',
  r2_account_id: process.env.R2_ACCOUNT_ID ?? '',
  r2_access_key: process.env.R2_ACCESS_KEY ?? '',
  r2_secret_key: process.env.R2_SECRET_KEY ?? '',
  r2_bucket_name: process.env.R2_BUCKET_NAME ?? '',
  r2_upload_path: process.env.R2_UPLOAD_PATH ?? '',
  r2_endpoint: process.env.R2_ENDPOINT ?? '',
  r2_domain: process.env.R2_DOMAIN ?? '',
  s3_endpoint: process.env.S3_ENDPOINT ?? '',
  s3_region: process.env.S3_REGION ?? '',
  s3_access_key: process.env.S3_ACCESS_KEY ?? '',
  s3_secret_key: process.env.S3_SECRET_KEY ?? '',
  s3_bucket: process.env.S3_BUCKET ?? '',
  s3_domain: process.env.S3_DOMAIN ?? '',
  auth_url: getConfiguredAuthUrl(),
  auth_secret: process.env.AUTH_SECRET ?? '', // openssl rand -base64 32
  version: packageJson.version,
  locale_detect_enabled:
    process.env.NEXT_PUBLIC_LOCALE_DETECT_ENABLED ?? 'false',
};
