import { setRequestLocale } from 'next-intl/server';

import { RoleplayCharacterEditForm } from '@/shared/components/roleplay/roleplay-character-edit-form';

/**
 * Edit an existing draft / rejected / published character. The id is
 * passed through to the client form, which loads it via
 * `GET /api/roleplay/characters/[id]` on mount. Owner check happens at the
 * API layer; this page just gates anonymous users.
 */
export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  return <RoleplayCharacterEditForm characterId={id} />;
}
