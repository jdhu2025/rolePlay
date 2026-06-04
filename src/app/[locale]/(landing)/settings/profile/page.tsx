import { getTranslations } from 'next-intl/server';

import { Empty } from '@/shared/blocks/common';
import { FormCard } from '@/shared/blocks/form';
import {
  parseUserPersona,
  serializeUserPersona,
} from '@/shared/lib/roleplay-user-persona';
import {
  findUserById,
  getUserInfo,
  UpdateUser,
  updateUser,
} from '@/shared/models/user';
import { Form as FormType } from '@/shared/types/blocks/form';

export default async function ProfilePage() {
  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.profile');
  const dbUser = await findUserById(user.id);
  const profileUser = dbUser || user;
  const persona = parseUserPersona((profileUser as any).persona);

  const form: FormType = {
    fields: [
      {
        name: 'email',
        title: t('fields.email'),
        type: 'email',
        attributes: { disabled: true },
      },
      { name: 'name', title: t('fields.name'), type: 'text' },
      {
        name: 'image',
        title: t('fields.avatar'),
        type: 'upload_image',
        metadata: {
          max: 1,
        },
      },
      {
        name: 'personaPreferredName',
        title: t('fields.persona_preferred_name'),
        type: 'text',
        placeholder: t('fields.persona_preferred_name_placeholder'),
        tip: t('fields.persona_preferred_name_tip'),
        validation: { max: 80 },
      },
      {
        name: 'personaDefaultRelationship',
        title: t('fields.persona_default_relationship'),
        type: 'text',
        placeholder: t('fields.persona_default_relationship_placeholder'),
        tip: t('fields.persona_default_relationship_tip'),
        validation: { max: 160 },
      },
      {
        name: 'personaTonePreference',
        title: t('fields.persona_tone_preference'),
        type: 'textarea',
        placeholder: t('fields.persona_tone_preference_placeholder'),
        tip: t('fields.persona_tone_preference_tip'),
        validation: { max: 400 },
      },
    ],
    data: {
      ...profileUser,
      personaPreferredName: persona.preferredName || '',
      personaDefaultRelationship: persona.defaultRelationship || '',
      personaTonePreference: persona.tonePreference || '',
    },
    passby: {
      user: profileUser,
    },
    submit: {
      handler: async (data: FormData, passby: any) => {
        'use server';

        const { user } = passby;
        if (!user) {
          throw new Error('no auth');
        }

        const name = data.get('name') as string;
        if (!name?.trim()) {
          throw new Error('name is required');
        }

        const image = data.get('image');
        console.log('image', image, typeof image);

        const updatedUser: UpdateUser = {
          name: name.trim(),
          image: image as string,
          persona: serializeUserPersona({
            preferredName: data.get('personaPreferredName') as string,
            defaultRelationship: data.get(
              'personaDefaultRelationship'
            ) as string,
            tonePreference: data.get('personaTonePreference') as string,
            firstImpression: persona.firstImpression,
          }),
        };

        await updateUser(user.id, updatedUser);

        return {
          status: 'success',
          message: 'Profile updated',
          redirect_url: '/settings/profile',
        };
      },
      button: {
        title: t('edit.buttons.submit'),
      },
    },
  };

  return (
    <div className="space-y-8">
      <FormCard
        title={t('edit.title')}
        description={t('edit.description')}
        form={form}
      />
    </div>
  );
}
