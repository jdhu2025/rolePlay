import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix } from '@/config/locale';
import { RoleplayChat } from '@/shared/components/roleplay/roleplay-chat';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';

export const revalidate = 3600;

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
    title: 'Chat with this character | Keepsay',
    alternates: {
      canonical: buildCharacterCanonical(id, locale),
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function ChatProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RoleplayChat characterId={id} />;
}
