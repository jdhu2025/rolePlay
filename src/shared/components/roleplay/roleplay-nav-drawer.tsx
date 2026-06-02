'use client';

/**
 * Mobile hamburger drawer for the roleplay landing-area routes.
 *
 * Slides in from the left, lists the primary destinations (Discover /
 * Create / My AI / Memory / Community) plus user actions (sign in / sign
 * out). Reuses the shared `Sheet` primitive so we get the focus trap +
 * backdrop click-to-close behaviour for free.
 *
 * Why a separate component instead of hooking into `ui/sidebar.tsx`: the
 * dashboard sidebar drags in too much chrome (workspace switcher, footer,
 * etc.) for what we need here. Roleplay just needs a flat nav list.
 *
 * Admin-only entries (the moderation queue) are gated behind a probe
 * against `/api/user/is-admin`. The probe returns `false` for anonymous
 * users so the drawer can call it unconditionally.
 */

import {
  Loader2,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { signOut } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';

type Item = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: RoleplayDrawerUser | null;
  authChecked: boolean;
  isAdmin: boolean;
};

type RoleplayDrawerUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function RoleplayNavDrawer({
  open,
  onOpenChange,
  user,
  authChecked,
  isAdmin,
}: Props) {
  const t = useTranslations('roleplay.nav');
  const pathname = usePathname();
  const [signingOut, setSigningOut] = useState(false);

  const items: Item[] = [
    { href: '/', label: t('discover') },
    { href: '/create', label: t('my_talkies') },
    { href: '/create/edit', label: t('create') },
    { href: '/admin/roleplay/review', label: t('admin_review'), adminOnly: true },
  ];

  const visibleItems = items.filter(
    (item) =>
      (!item.adminOnly || isAdmin) &&
      !(pathname.startsWith('/create') && item.href === '/create')
  );

  const handleSignOut = async (next: 'home' | 'signin' = 'signin') => {
    setSigningOut(true);
    const target = next === 'signin' ? '/sign-in?switch=1' : '/';
    try {
      await signOut();
    } finally {
      onOpenChange(false);
      window.location.assign(target);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[min(320px,85vw)] border-white/10 bg-[#15151b] p-0 text-white"
      >
        <SheetHeader className="border-b border-white/5">
          <SheetTitle className="text-white">RolePlay</SheetTitle>
          <SheetDescription className="text-zinc-400">
            {t('tagline')}
          </SheetDescription>
        </SheetHeader>

        <nav
          aria-label="Primary"
          className="flex flex-col gap-1 px-2 py-3 text-sm"
        >
          {visibleItems.map((item) => (
            <SheetClose key={item.href} asChild>
              <Link
                href={item.href}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-zinc-100 transition-colors hover:bg-white/5"
              >
                {item.adminOnly ? (
                  <ShieldCheck className="size-4 text-amber-300" />
                ) : null}
                {item.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/5 px-4 py-4">
          {!authChecked ? (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="size-4 animate-spin" />
              {t('signin_ready')}
            </div>
          ) : user ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name || 'avatar'}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-9 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
                    {(user.name || user.email || '?').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{user.name || '—'}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {user.email || ''}
                  </p>
                </div>
              </div>
              <SheetClose asChild>
                <Link
                  href="/settings/profile"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/5"
                >
                  <UserRound className="size-3.5" />
                  {t('profile')}
                </Link>
              </SheetClose>
              <button
                type="button"
                onClick={() => void handleSignOut('signin')}
                disabled={signingOut}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/5 disabled:opacity-60"
              >
                {signingOut ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <UsersRound className="size-3.5" />
                )}
                {t('switch_account')}
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut('home')}
                disabled={signingOut}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-rose-200 transition-colors hover:bg-white/5 disabled:opacity-60"
              >
                {signingOut ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <LogOut className="size-3.5" />
                )}
                {t('sign_out')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <SheetClose asChild>
                <Link
                  href="/sign-in?switch=1"
                  className="inline-flex items-center justify-center rounded-full bg-white px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-zinc-200"
                >
                  {t('sign_in')}
                </Link>
              </SheetClose>
              <SheetClose asChild>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/5"
                >
                  {t('sign_up')}
                </Link>
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
