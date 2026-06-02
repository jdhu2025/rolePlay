import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RolePlay character asset URL helpers.
 *
 * Storage contract:
 * - The DB stores image filenames only (e.g. "chloe-1.jpeg"), never absolute URLs.
 * - The R2 domain (`R2_DOMAIN`) and the upload folder (`R2_UPLOAD_PATH`) live
 *   in env, so they can change without touching the DB.
 * - The character image sub-prefix is fixed as `roleplay/characters/`.
 *
 * Final URL shape:
 *   {R2_DOMAIN}/{R2_UPLOAD_PATH}/roleplay/characters/{filename}
 *
 * Backwards-compatibility:
 * - If `value` already looks like an absolute http(s):// URL, it is returned as-is.
 *   This lets us migrate legacy rows incrementally.
 * - If `value` already starts with "/", it is returned as-is (treated as a
 *   site-relative path served from `public/`).
 */

const CHARACTER_IMAGE_SUBPREFIX = 'roleplay/characters';

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '');
}

function readEnv(name: string, fallback = ''): string {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw.trim().replace(/^"|"$/g, '');
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isSiteRelative(value: string): boolean {
  return value.startsWith('/');
}

function publicCharacterImageExists(filename: string): boolean {
  return existsSync(
    join(
      process.cwd(),
      'public',
      CHARACTER_IMAGE_SUBPREFIX,
      trimSlashes(filename)
    )
  );
}

/**
 * Compose the final public URL for a character image filename.
 *
 * @param filename - bare filename like "chloe-1.jpeg" (no path).
 *                   Empty / nullish input returns "".
 * @returns full URL, or the original value if it was already absolute /
 *          site-relative, or "" if nothing usable was provided.
 */
export function buildCharacterImageUrl(
  filename: string | null | undefined
): string {
  if (!filename) return '';
  const value = filename.trim();
  if (!value) return '';

  if (isAbsoluteUrl(value) || isSiteRelative(value)) {
    return value;
  }

  if (publicCharacterImageExists(value)) {
    return `/${CHARACTER_IMAGE_SUBPREFIX}/${trimSlashes(value)}`;
  }

  const domain = trimSlashes(readEnv('R2_DOMAIN'));
  const uploadPath = trimSlashes(readEnv('R2_UPLOAD_PATH', 'uploads'));

  // If R2_DOMAIN is not configured (local dev without R2), fall back to the
  // public/ folder served by Next.js, so the same filename still resolves.
  if (!domain) {
    return `/${CHARACTER_IMAGE_SUBPREFIX}/${trimSlashes(value)}`;
  }

  return `${domain}/${uploadPath}/${CHARACTER_IMAGE_SUBPREFIX}/${trimSlashes(
    value
  )}`;
}

/**
 * Map an array of filenames through `buildCharacterImageUrl`. Filters empty
 * results so the response stays clean.
 */
export function buildCharacterImageUrls(
  filenames: Array<string | null | undefined>
): string[] {
  return filenames
    .map((name) => buildCharacterImageUrl(name))
    .filter((url) => url.length > 0);
}

/**
 * The R2 object key the upload script must use for a given filename.
 * Centralising this so the seed script, upload script, and runtime helper
 * all agree on the same storage layout.
 */
export function characterImageObjectKey(filename: string): string {
  return `${CHARACTER_IMAGE_SUBPREFIX}/${trimSlashes(filename)}`;
}

export const CHARACTER_IMAGE_PREFIX = CHARACTER_IMAGE_SUBPREFIX;
