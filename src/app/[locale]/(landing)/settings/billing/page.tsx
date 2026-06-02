import moment from 'moment';
import { getTranslations } from 'next-intl/server';

import { Empty } from '@/shared/blocks/common';
import { PanelCard } from '@/shared/blocks/panel';
import { TableCard } from '@/shared/blocks/table';
import { Button } from '@/shared/components/ui/button';
import { Check } from 'lucide-react';
import { getRemainingCredits } from '@/shared/models/credit';
import {
  getCurrentSubscription,
  getSubscriptions,
  getSubscriptionsCount,
  Subscription,
  SubscriptionStatus,
} from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import { Button as ButtonType, Tab } from '@/shared/types/blocks/common';
import { type Table } from '@/shared/types/blocks/table';

function getPlanKey(planName?: string | null) {
  const normalized = String(planName || 'free')
    .trim()
    .toLowerCase();

  if (normalized.includes('pro')) return 'pro';
  if (normalized.includes('plus')) return 'plus';
  if (normalized.includes('lite')) return 'lite';

  return 'free';
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: number; pageSize?: number; status?: string }>;
}) {
  const { page: pageNum, pageSize, status } = await searchParams;
  const page = pageNum || 1;
  const limit = pageSize || 20;

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  const t = await getTranslations('settings.billing');

  const currentSubscription = await getCurrentSubscription(user.id);
  const remainingCredits = await getRemainingCredits(user.id);
  const planKey = getPlanKey(currentSubscription?.planName);
  const benefitItems = t.raw(`benefits.plans.${planKey}.items`) as string[];

  const total = await getSubscriptionsCount({
    userId: user.id,
    status,
  });

  const subscriptions = await getSubscriptions({
    userId: user.id,
    status,
    page,
    limit,
  });

  const table: Table = {
    title: t('list.title'),
    columns: [
      {
        name: 'subscriptionNo',
        title: t('fields.subscription_no'),
        type: 'copy',
      },
      {
        name: 'interval',
        title: t('fields.interval'),
        callback: function (item) {
          if (!item.interval || !item.intervalCount) {
            return '-';
          }
          return <div>{`${item.intervalCount}-${item.interval}`}</div>;
        },
      },
      {
        name: 'status',
        title: t('fields.status'),
        type: 'label',
        metadata: { variant: 'outline' },
      },
      {
        title: t('fields.amount'),
        callback: function (item) {
          const currency = (item.currency || 'USD').toUpperCase();

          let prefix = '';
          if (currency === 'USD') {
            prefix = `$`;
          } else if (currency === 'EUR') {
            prefix = `€`;
          } else if (currency === 'CNY') {
            prefix = `¥`;
          } else {
            prefix = `${currency} `;
          }

          return (
            <div className="text-primary">{`${prefix}${item.amount / 100}`}</div>
          );
        },
      },
      {
        name: 'createdAt',
        title: t('fields.created_at'),
        type: 'time',
      },
      {
        title: t('fields.current_period'),
        callback: function (item) {
          let period = (
            <div>
              {`${moment(item.currentPeriodStart).format('YYYY-MM-DD')}`} ~
              <br />
              {`${moment(item.currentPeriodEnd).format('YYYY-MM-DD')}`}
            </div>
          );

          return period;
        },
      },
      {
        title: t('fields.end_time'),
        callback: function (item) {
          if (item.canceledEndAt) {
            return <div>{moment(item.canceledEndAt).format('YYYY-MM-DD')}</div>;
          }
          return '-';
        },
      },
      {
        title: t('fields.action'),
        type: 'dropdown',
        callback: function (item) {
          if (
            item.status !== SubscriptionStatus.ACTIVE &&
            item.status !== SubscriptionStatus.TRIALING
          ) {
            return null;
          }

          return [
            {
              title: t('view.buttons.cancel'),
              url: `/settings/billing/cancel?subscription_no=${item.subscriptionNo}`,
              icon: 'Ban',
              size: 'sm',
              variant: 'outline',
            },
          ];
        },
      },
    ],
    data: subscriptions,
    pagination: {
      total,
      page,
      limit,
    },
  };

  const tabs: Tab[] = [
    {
      title: t('list.tabs.all'),
      name: 'all',
      url: '/settings/billing',
      is_active: !status || status === 'all',
    },
    {
      title: t('list.tabs.active'),
      name: 'active',
      url: '/settings/billing?status=active',
      is_active: status === 'active',
    },
    {
      title: t('list.tabs.trialing'),
      name: 'trialing',
      url: '/settings/billing?status=trialing',
      is_active: status === 'trialing',
    },
    {
      title: t('list.tabs.paused'),
      name: 'paused',
      url: '/settings/billing?status=paused',
      is_active: status === 'paused',
    },
    {
      title: t('list.tabs.expired'),
      name: 'expired',
      url: '/settings/billing?status=expired',
      is_active: status === 'expired',
    },
    {
      title: t('list.tabs.pending_cancel'),
      name: 'pending_cancel',
      url: '/settings/billing?status=pending_cancel',
      is_active: status === 'pending_cancel',
    },
    {
      title: t('list.tabs.canceled'),
      name: 'canceled',
      url: '/settings/billing?status=canceled',
      is_active: status === 'canceled',
    },
  ];

  let buttons: ButtonType[] = [];
  if (currentSubscription) {
    buttons = [
      {
        title: t('view.buttons.adjust'),
        url: '/pricing',
        target: '_blank',
        icon: 'Pencil',
        size: 'sm',
      },
    ];
    if (currentSubscription.paymentUserId) {
      buttons.push({
        title: t('view.buttons.manage'),
        url: `/settings/billing/retrieve?subscription_no=${currentSubscription.subscriptionNo}`,
        target: '_blank',
        icon: 'Settings',
        size: 'sm',
        variant: 'outline',
      });
    }
  } else {
    buttons = [
      {
        title: t('view.buttons.subscribe'),
        url: '/pricing',
        target: '_blank',
        icon: 'ArrowUpRight',
        size: 'sm',
      },
    ];
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <PanelCard
          label={currentSubscription?.status}
          title={t('view.title')}
          buttons={buttons}
        >
          <div className="text-primary text-3xl font-bold">
            {currentSubscription?.planName || t('view.no_subscription')}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-background/60 p-3">
              <div className="text-muted-foreground text-xs">
                {t('view.account_level')}
              </div>
              <div className="text-foreground mt-1 text-lg font-semibold">
                {t(`benefits.plans.${planKey}.title`)}
              </div>
            </div>
            <div className="rounded-md border bg-background/60 p-3">
              <div className="text-muted-foreground text-xs">
                {t('view.remaining_credits')}
              </div>
              <div className="text-foreground mt-1 text-2xl font-semibold">
                {remainingCredits}
              </div>
            </div>
            <div className="rounded-md border bg-background/60 p-3">
              <div className="text-muted-foreground text-xs">
                {t('view.period_credits')}
              </div>
              <div className="text-foreground mt-1 text-2xl font-semibold">
                {currentSubscription?.creditsAmount || 0}
              </div>
            </div>
          </div>
          {currentSubscription ? (
            <>
              {currentSubscription?.status === SubscriptionStatus.ACTIVE ||
              currentSubscription?.status === SubscriptionStatus.TRIALING ? (
                <div className="text-muted-foreground mt-4 text-sm font-normal">
                  {t('view.tip', {
                    date: moment(currentSubscription?.currentPeriodEnd).format(
                      'YYYY-MM-DD'
                    ),
                  })}
                </div>
              ) : (
                <div className="text-destructive mt-4 text-sm font-normal">
                  {t('view.end_tip', {
                    date: moment(currentSubscription?.canceledEndAt).format(
                      'YYYY-MM-DD'
                    ),
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground mt-4 text-sm font-normal">
              {t('view.free_tip')}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title={t('benefits.title')}
          description={t('benefits.description')}
          buttons={[
            {
              title: t('benefits.buttons.view_credits'),
              url: '/settings/credits',
              icon: 'Coins',
              size: 'sm',
              variant: 'outline',
            },
          ]}
        >
          <div className="space-y-4">
            <div>
              <div className="text-foreground text-xl font-semibold">
                {t(`benefits.plans.${planKey}.title`)}
              </div>
              <div className="text-muted-foreground mt-1 text-sm">
                {t(`benefits.plans.${planKey}.subtitle`)}
              </div>
            </div>
            <div className="grid gap-2">
              {benefitItems.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm">
                  <Check className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </PanelCard>
      </div>
      <TableCard title={t('list.title')} tabs={tabs} table={table} />
    </div>
  );
}
