export const ROLEPLAY_RETURN_STORAGE_KEY = 'roleplay:return-to';

type ReturnTargetOptions = {
  fallback?: string;
  path?: string;
};

function canUseLocation() {
  return typeof window !== 'undefined' && Boolean(window.location);
}

function normalizeInternalPath(raw?: string | null, fallback = '/') {
  if (!raw || !raw.startsWith('/')) return fallback;
  if (raw.startsWith('//')) return fallback;
  return raw;
}

export function getCurrentRoleplayReturnPath({
  fallback = '/',
  path,
}: ReturnTargetOptions = {}) {
  if (path) return normalizeInternalPath(path, fallback);
  if (!canUseLocation()) return fallback;

  return normalizeInternalPath(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    fallback
  );
}

export function rememberRoleplayReturnPath(path?: string) {
  if (typeof window === 'undefined') return;

  const next = getCurrentRoleplayReturnPath({ path });
  try {
    window.sessionStorage.setItem(ROLEPLAY_RETURN_STORAGE_KEY, next);
  } catch {
    // Returning to the current page is best-effort; URL callback still works.
  }
}

export function readRememberedRoleplayReturnPath(fallback = '/') {
  if (typeof window === 'undefined') return fallback;

  try {
    return normalizeInternalPath(
      window.sessionStorage.getItem(ROLEPLAY_RETURN_STORAGE_KEY),
      fallback
    );
  } catch {
    return fallback;
  }
}

export function withRoleplayCallbackUrl(basePath: string, returnPath?: string) {
  const target = normalizeInternalPath(
    returnPath || getCurrentRoleplayReturnPath(),
    '/'
  );
  const separator = basePath.includes('?') ? '&' : '?';

  return `${basePath}${separator}callbackUrl=${encodeURIComponent(target)}`;
}
