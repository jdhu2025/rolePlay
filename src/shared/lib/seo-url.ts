type LocalePrefix = 'always' | 'as-needed' | 'never' | string;

type LocalizedUrlOptions = {
  appUrl: string;
  defaultLocale: string;
  localePrefix: LocalePrefix;
};

type LocalizedPathOptions = Omit<LocalizedUrlOptions, 'appUrl'>;

export type SitemapInput = {
  path: string;
  locales: string[];
  lastModified?: Date | string;
  changeFrequency?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
};

export type SitemapOutput = {
  url: string;
  lastModified?: Date | string;
  changeFrequency?: SitemapInput['changeFrequency'];
  priority?: number;
};

export function cleanPath(path: string) {
  const rawPath = path.trim() || '/';
  const withoutQuery = rawPath.split('?')[0].split('#')[0] || '/';
  const withSlash = withoutQuery.startsWith('/')
    ? withoutQuery
    : `/${withoutQuery}`;
  return withSlash === '/' ? '/' : withSlash.replace(/\/+$/, '');
}

export function buildLocalizedPath(
  path: string,
  locale: string,
  options: LocalizedPathOptions
) {
  const normalizedPath = cleanPath(path);
  const normalizedLocale = locale || options.defaultLocale;
  const shouldPrefix =
    options.localePrefix === 'always' ||
    (options.localePrefix === 'as-needed' &&
      normalizedLocale !== options.defaultLocale);

  if (!shouldPrefix || !normalizedLocale) return normalizedPath;

  const localeBase = `/${normalizedLocale}`;
  if (normalizedPath === '/') return localeBase;
  if (
    normalizedPath === localeBase ||
    normalizedPath.startsWith(`${localeBase}/`)
  ) {
    return normalizedPath;
  }
  return `${localeBase}${normalizedPath}`;
}

export function buildLocalizedUrl(
  path: string,
  locale: string,
  options: LocalizedUrlOptions
) {
  if (/^https?:\/\//i.test(path)) {
    return path.replace(/\/$/, '');
  }

  const appUrl = options.appUrl.replace(/\/$/, '');
  return `${appUrl}${buildLocalizedPath(path, locale, options)}`;
}

export function normalizeSitemapEntries(
  entries: SitemapInput[],
  options: LocalizedUrlOptions
): SitemapOutput[] {
  return entries.flatMap((entry) =>
    entry.locales.map((locale) => ({
      url: buildLocalizedUrl(entry.path, locale, options),
      lastModified: entry.lastModified,
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }))
  );
}
