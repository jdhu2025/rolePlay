import { setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';
import { ManualCryptoTopupForm } from '@/shared/components/billing/manual-crypto-topup-form';
import {
  getManualCryptoTopupPlans,
  getManualCryptoWalletOptions,
} from '@/shared/lib/manual-crypto-topup';
import { getAllConfigs } from '@/shared/models/config';

export const revalidate = 0;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.pricing.metadata',
  canonicalUrl: '/pricing',
});

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const configs = await getAllConfigs();
  const cryptoPlans = getManualCryptoTopupPlans(configs);
  const walletOptions = getManualCryptoWalletOptions(configs);

  return (
    <main className="bg-muted/30 min-h-screen py-8 md:py-12">
      <section className="mx-auto w-full max-w-6xl px-4">
        <div className="bg-background rounded-xl border p-6 shadow-sm md:p-8">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Crypto top-up
          </h1>
          <div className="mt-8">
            <ManualCryptoTopupForm
              plans={cryptoPlans}
              walletOptions={walletOptions}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
