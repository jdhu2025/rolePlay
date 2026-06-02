import { setRequestLocale } from 'next-intl/server';

import { RoleplayQuickCreateWizard } from '@/shared/components/roleplay/roleplay-quick-create-wizard';

export default async function QuickCreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoleplayQuickCreateWizard />;
}
