'use client';

import type { ComponentProps } from 'react';

import { Link } from '@/core/i18n/navigation';
import { useAppContext } from '@/shared/contexts/app';
import { getSupportMailto } from '@/shared/lib/support-email';

function isSupportMailto(href?: string) {
  return /^mailto:support@keepsay\.dpdns\.org$/i.test(String(href || ''));
}

export function SupportAwareLink({
  href,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const { configs } = useAppContext();
  const resolvedHref = isSupportMailto(String(href || ''))
    ? getSupportMailto(configs)
    : href;

  return (
    <Link href={resolvedHref || ''} {...props}>
      {children}
    </Link>
  );
}
