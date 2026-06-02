import { ReactNode } from 'react';

import { RoleplayTopbar } from '@/shared/components/roleplay/roleplay-topbar';

/**
 * Landing-area layout. Mounts the roleplay topbar (sticky + scroll-aware
 * auto-hide on mobile) and lets each route render its own main content
 * below it. The topbar is a client component; this layout stays a server
 * component to keep static-rendering eligibility for routes that opt in.
 */
export default async function LandingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <RoleplayTopbar />
      {children}
    </>
  );
}
