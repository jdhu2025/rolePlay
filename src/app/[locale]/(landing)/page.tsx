import { setRequestLocale } from 'next-intl/server';

import { RoleplayLanding } from '@/shared/components/roleplay/roleplay-landing';
import { ROLEPLAY_HOME_SEO } from '@/shared/lib/roleplay-seo-copy';
import { getMetadata } from '@/shared/lib/seo';
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

  return <RoleplayLanding initialData={initialData} />;
}
