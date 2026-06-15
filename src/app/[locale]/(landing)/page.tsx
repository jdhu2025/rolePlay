import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix } from '@/config/locale';
import { RoleplayLanding } from '@/shared/components/roleplay/roleplay-landing';
import { ROLEPLAY_HOME_SEO } from '@/shared/lib/roleplay-seo-copy';
import { getMetadata } from '@/shared/lib/seo';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';
import { getRoleplayHomeInitialData } from '@/shared/lib/server/roleplay-home-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const generateMetadata = getMetadata({
  title: ROLEPLAY_HOME_SEO.title,
  description: ROLEPLAY_HOME_SEO.description,
  keywords: ROLEPLAY_HOME_SEO.keywords.join(', '),
  canonicalUrl: '/',
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const initialData = await getRoleplayHomeInitialData();
  const canonicalUrl = buildLocalizedUrl('/', locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonicalUrl}#website`,
        url: canonicalUrl,
        name: envConfigs.app_name || 'RolePlay',
        description: ROLEPLAY_HOME_SEO.description,
        inLanguage: locale,
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#roleplay-guides`,
        name: 'AI character chat guides',
        itemListElement: [
          '/free-ai-character-chat',
          '/ai-character-chat-with-memory',
          '/anime-ai-roleplay-characters',
          '/custom-ai-character-creator',
        ].map((path, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: buildLocalizedUrl(path, locale, {
            appUrl: envConfigs.app_url,
            defaultLocale,
            localePrefix,
          }),
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RoleplayLanding initialData={initialData} />
    </>
  );
}
