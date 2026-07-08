import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix } from '@/config/locale';
import { RoleplayChatHistory } from '@/shared/components/roleplay/roleplay-chat-history';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';

export const revalidate = 0;

function buildCharacterCanonical(id: string, locale: string) {
  return buildLocalizedUrl(`/character/${id}`, locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return {
    title: 'Chat history | Keepsay',
    alternates: {
      canonical: buildCharacterCanonical(id, locale),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function RoleplayChatHistoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RoleplayChatHistory characterId={id} locale={locale} />;
}
