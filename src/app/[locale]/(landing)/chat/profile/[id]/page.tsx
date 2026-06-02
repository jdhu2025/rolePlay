import { setRequestLocale } from 'next-intl/server';

import { RoleplayChat } from '@/shared/components/roleplay/roleplay-chat';

export const revalidate = 3600;

export default async function ChatProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RoleplayChat characterId={id} />;
}
