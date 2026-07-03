import { getTranslations, setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix } from '@/config/locale';
import { RoleplayLanding } from '@/shared/components/roleplay/roleplay-landing';
import { ROLEPLAY_HOME_SEO } from '@/shared/lib/roleplay-seo-copy';
import { getMetadata } from '@/shared/lib/seo';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';
import { getPublicRoleplayHomeInitialData } from '@/shared/lib/server/roleplay-home-data';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  title: ROLEPLAY_HOME_SEO.title,
  description: ROLEPLAY_HOME_SEO.description,
  keywords: ROLEPLAY_HOME_SEO.keywords.join(', '),
  canonicalUrl: '/',
  imageUrl: '/roleplay/characters/rp-anime-001-elira.png',
  appName: ROLEPLAY_HOME_SEO.brandName,
});

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tHome = await getTranslations({ locale, namespace: 'roleplay.home' });
  const initialData = await getPublicRoleplayHomeInitialData();
  const canonicalUrl = buildLocalizedUrl('/', locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
  const faqs = tHome.raw('seo_faqs') as Array<{
    question: string;
    answer: string;
  }>;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${canonicalUrl}#website`,
        url: canonicalUrl,
        name: ROLEPLAY_HOME_SEO.brandName,
        description: ROLEPLAY_HOME_SEO.description,
        inLanguage: locale,
      },
      {
        '@type': 'ItemList',
        '@id': `${canonicalUrl}#roleplay-guides`,
        name: 'AI character chat with memory guides',
        itemListElement: [
          '/ai-character-chat-with-memory',
          '/create-ai-character-with-memory',
          '/ai-companion-that-remembers-you',
          '/free-ai-character-chat',
          '/character-ai-alternative-with-memory',
          '/custom-ai-character-creator',
          '/anime-ai-roleplay-characters',
          '/talkie-ai-alternative',
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
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
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
