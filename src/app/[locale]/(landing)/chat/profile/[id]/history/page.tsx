import { setRequestLocale } from 'next-intl/server';

import { RoleplayChatHistory } from '@/shared/components/roleplay/roleplay-chat-history';

export const revalidate = 0;

export default async function RoleplayChatHistoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RoleplayChatHistory characterId={id} locale={locale} />;
}
