import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import {
  grantCreditsForUser,
  grantRoleplayFreePlayForUser,
  hasActiveRoleplayFreePlay,
  revokeRoleplayFreePlayForUser,
} from '@/shared/models/credit';
import { findUserById } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function UserGrantCreditsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Check if user has permission to edit posts
  await requirePermission({
    code: PERMISSIONS.USERS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const user = await findUserById(id);
  if (!user) {
    return <Empty message="User not found" />;
  }

  const t = await getTranslations('admin.users');
  const roleplayFreePlayEnabled = await hasActiveRoleplayFreePlay(user.id);

  const crumbs: Crumb[] = [
    { title: t('grant_credits.crumbs.admin'), url: '/admin' },
    { title: t('grant_credits.crumbs.users'), url: '/admin/users' },
    { title: t('grant_credits.crumbs.grant_credits'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'name',
        type: 'text',
        title: t('fields.name'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'email',
        type: 'text',
        title: t('fields.email'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'credits',
        type: 'number',
        title: t('grant_credits.fields.credits'),
        placeholder: '0',
      },
      {
        name: 'valid_days',
        type: 'number',
        placeholder: '0',
        title: t('grant_credits.fields.valid_days'),
        tip: t('grant_credits.fields.valid_days_tip'),
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('grant_credits.fields.description'),
        placeholder: t('grant_credits.fields.description_placeholder'),
      },
      {
        name: 'roleplay_free_play_enabled',
        type: 'switch',
        title: t('grant_credits.fields.roleplay_free_play_enabled'),
        tip: t('grant_credits.fields.roleplay_free_play_tip'),
      },
    ],
    passby: {
      user: user,
      roleplayFreePlayEnabled,
    },
    data: {
      ...user,
      roleplay_free_play_enabled: roleplayFreePlayEnabled,
    },
    submit: {
      button: {
        title: t('grant_credits.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const { user, roleplayFreePlayEnabled } = passby;

        if (!user) {
          throw new Error('no auth');
        }

        const credits = parseInt(data.get('credits') as string) || 0;
        const validDays = parseInt(data.get('valid_days') as string) || 0;
        const description = data.get('description') as string;
        const nextRoleplayFreePlayEnabled =
          data.get('roleplay_free_play_enabled') === 'true';

        if (credits > 0) {
          await grantCreditsForUser({
            user: user,
            credits: credits,
            validDays: validDays > 0 ? validDays : 0,
            description: description,
          });
        }

        if (
          nextRoleplayFreePlayEnabled &&
          roleplayFreePlayEnabled !== nextRoleplayFreePlayEnabled
        ) {
          await grantRoleplayFreePlayForUser({
            user,
            validDays: validDays > 0 ? validDays : 0,
          });
        } else if (
          !nextRoleplayFreePlayEnabled &&
          roleplayFreePlayEnabled !== nextRoleplayFreePlayEnabled
        ) {
          await revokeRoleplayFreePlayForUser(user.id);
        }

        return {
          status: 'success',
          message: 'user billing settings updated successfully',
          redirect_url: `/admin/users?email=${user.email}`,
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('grant_credits.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
