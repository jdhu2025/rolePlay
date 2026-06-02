import { setRequestLocale } from 'next-intl/server';

import { RoleplayCharacterEditForm } from '@/shared/components/roleplay/roleplay-character-edit-form';

/**
 * Create a brand-new Talkie. The form lives at the same component as edit;
 * passing no `characterId` puts it into create mode and POSTs on first save.
 */
export default async function CreateNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoleplayCharacterEditForm />;
}
