import { setRequestLocale } from 'next-intl/server';

import { RoleplayReviewConsole } from '@/shared/components/roleplay/roleplay-review-console';

/**
 * Admin moderation queue for roleplay characters.
 *
 * The parent `(admin)/layout.tsx` already gates with `requireAdminAccess`,
 * so this page just sets the locale and renders the client console. The
 * console fetches the queue from `/api/admin/roleplay` and posts decisions
 * to `/api/admin/roleplay/[id]/moderate`.
 */
export default async function RoleplayReviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoleplayReviewConsole />;
}
