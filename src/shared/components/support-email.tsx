'use client';

import type { ReactNode } from 'react';

import { useAppContext } from '@/shared/contexts/app';
import {
  getSupportEmail,
  getSupportMailto,
} from '@/shared/lib/support-email';

export function SupportEmail() {
  const { configs } = useAppContext();
  const email = getSupportEmail(configs);

  return <a href={getSupportMailto(configs)}>{email}</a>;
}

export function SupportLink({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  const { configs } = useAppContext();

  return (
    <a href={getSupportMailto(configs)} className={className}>
      {children || getSupportEmail(configs)}
    </a>
  );
}
