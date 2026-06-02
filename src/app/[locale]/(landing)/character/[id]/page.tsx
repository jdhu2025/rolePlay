import { setRequestLocale } from 'next-intl/server';

import { RoleplayCharacterDetail } from '@/shared/components/roleplay/roleplay-character-detail';

export const revalidate = 3600;

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RoleplayCharacterDetail characterId={id} />;
}
