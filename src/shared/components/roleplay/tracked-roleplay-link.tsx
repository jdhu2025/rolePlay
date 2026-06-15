'use client';

import type { ComponentProps, ReactNode } from 'react';

import { Link } from '@/core/i18n/navigation';
import {
  recordRoleplayMomentEvent,
  type RoleplayMomentEventType,
} from '@/shared/lib/roleplay-moment-events';

type Props = ComponentProps<typeof Link> & {
  children: ReactNode;
  eventType: RoleplayMomentEventType;
  eventMetadata?: Record<string, unknown>;
};

export function TrackedRoleplayLink({
  children,
  eventType,
  eventMetadata,
  href,
  onClick,
  ...props
}: Props) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        recordRoleplayMomentEvent({
          eventType,
          metadata: {
            href: String(href),
            ...(eventMetadata || {}),
          },
        });
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </Link>
  );
}
