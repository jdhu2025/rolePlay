import { setRequestLocale } from 'next-intl/server';

import { RoleplayLanding } from '@/shared/components/roleplay/roleplay-landing';
import { getRoleplayHomeInitialData } from '@/shared/lib/server/roleplay-home-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const initialData = await getRoleplayHomeInitialData();

  return <RoleplayLanding initialData={initialData} />;
}
