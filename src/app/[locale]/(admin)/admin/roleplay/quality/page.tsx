import { setRequestLocale } from 'next-intl/server';

import { RoleplayQualityConsole } from '@/shared/components/roleplay/roleplay-quality-console';

export default async function RoleplayQualityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoleplayQualityConsole />;
}
