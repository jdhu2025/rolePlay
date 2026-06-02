import { setRequestLocale } from 'next-intl/server';

import { RoleplayCreateList } from '@/shared/components/roleplay/roleplay-create-list';

/**
 * Owner-only listing of My Talkies. Drives the `/create` route.
 *
 * The list component performs the auth-gated data fetch client-side. Keeping
 * this route free of a server session lookup lets the shell render quickly;
 * anonymous users are redirected once the owner-only API reports no auth.
 */
export default async function CreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoleplayCreateList />;
}
