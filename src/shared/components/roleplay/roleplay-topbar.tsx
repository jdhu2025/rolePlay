'use client';

/**
 * Sticky topbar for the roleplay landing-area routes.
 *
 * Layout:
 * - Mobile (<md): hamburger / logo / search-icon — drawer carries the rest.
 * - Desktop (>=md): logo / search input / Create CTA / Sign in or avatar.
 *
 * Scroll-aware: the bar slides up when the user scrolls down past 80px and
 * comes back when they scroll up. Pure scroll-listener throttle via rAF; no
 * external deps. We intentionally keep the hide threshold small so the
 * header doesn't disappear right at the top of the page (where it makes
 * the layout look broken).
 *
 * Admin shortcut: when the current session has `admin.access`, an extra
 * "Moderation" button surfaces in the desktop CTA cluster. We probe via
 * `/api/user/is-admin` (returns false for anon) so the markup stays the
 * same for everyone — only the visibility flips.
 *
 * The component is responsible only for navigation chrome — the rest of
 * each landing page provides its own hero/grid/etc. and lives below this
 * topbar.
 */

import {
  Loader2,
  LogOut,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { authClient, signOut, useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { RoleplayNavDrawer } from '@/shared/components/roleplay/roleplay-nav-drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

const HIDE_THRESHOLD = 80;

type RoleplayTopbarUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

function extractSessionUser(data: any): RoleplayTopbarUser | null {
  const user = data?.user ?? data?.data?.user ?? null;
  return user && typeof user === 'object' ? user : null;
}

async function fetchCurrentUser(): Promise<RoleplayTopbarUser | null> {
  const session = await authClient.getSession();
  const sessionUser = extractSessionUser(session?.data ?? session);
  if (sessionUser?.id) return sessionUser;

  const response = await fetch('/api/user/get-user-info', {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) return null;

  const payload = await response.json();
  return payload?.code === 0 && payload?.data ? payload.data : null;
}

let cachedAdminState: {
  userId: string;
  isAdmin: boolean;
  expiresAt: number;
} | null = null;
let adminStateRequest: Promise<boolean> | null = null;

async function fetchIsAdmin(userId: string) {
  const now = Date.now();
  if (
    cachedAdminState &&
    cachedAdminState.userId === userId &&
    cachedAdminState.expiresAt > now
  ) {
    return cachedAdminState.isAdmin;
  }

  if (!adminStateRequest) {
    adminStateRequest = fetch('/api/user/is-admin', { credentials: 'include' })
      .then((res) => res.json())
      .then((payload) => Boolean(payload?.data?.isAdmin))
      .then((nextIsAdmin) => {
        cachedAdminState = {
          userId,
          isAdmin: nextIsAdmin,
          expiresAt: Date.now() + 60_000,
        };
        return nextIsAdmin;
      })
      .finally(() => {
        adminStateRequest = null;
      });
  }

  return adminStateRequest;
}

export function RoleplayTopbar() {
  const t = useTranslations('roleplay.topbar');
  const tNav = useTranslations('roleplay.nav');
  const locale = useLocale();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);
  const sessionUserId = sessionUser?.id || '';
  const sessionUserName = sessionUser?.name || null;
  const sessionUserEmail = sessionUser?.email || null;
  const sessionUserImage = sessionUser?.image || null;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [fallbackUser, setFallbackUser] = useState<RoleplayTopbarUser | null>(
    null
  );
  const [authChecked, setAuthChecked] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  const nextLocale = locale.startsWith('zh') ? 'en' : 'zh';
  const localeLabel = locale.startsWith('zh') ? 'EN' : '中';

  const onScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < HIDE_THRESHOLD) {
        setHidden(false);
      } else if (y > lastY.current + 4) {
        setHidden(true);
      } else if (y < lastY.current - 4) {
        setHidden(false);
      }
      lastY.current = y;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  useEffect(() => {
    let cancelled = false;

    if (sessionUserId) {
      setFallbackUser({
        id: sessionUserId,
        name: sessionUserName,
        email: sessionUserEmail,
        image: sessionUserImage,
      });
      setAuthChecked(true);
      return;
    }
    if (isPending) {
      setAuthChecked(false);
      return;
    }

    setAuthChecked(false);
    void fetchCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setFallbackUser(user);
          setAuthChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFallbackUser(null);
          setAuthChecked(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isPending,
    sessionUserEmail,
    sessionUserId,
    sessionUserImage,
    sessionUserName,
  ]);

  const user = sessionUser ?? fallbackUser;
  const userId = user?.id;
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    fetchIsAdmin(userId)
      .then((nextIsAdmin) => {
        if (cancelled) return;
        setIsAdmin(nextIsAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const displayName = user?.name || user?.email || tNav('account');
  const initial = displayName.slice(0, 1).toUpperCase();
  const showCreateShortcut = !pathname.startsWith('/create');

  const handleSignOut = async (next: 'home' | 'signin') => {
    if (signingOut) return;
    setSigningOut(true);
    const target = next === 'signin' ? '/sign-in?switch=1' : '/';
    setFallbackUser(null);
    setAuthChecked(true);
    try {
      await signOut();
    } finally {
      window.location.assign(target);
    }
  };

  return (
    <>
      <header
        data-hidden={hidden}
        className={cn(
          'sticky top-0 z-30 border-b border-white/5 bg-[#0d0d10]/90 text-white backdrop-blur transition-transform duration-200',
          'supports-[backdrop-filter]:bg-[#0d0d10]/70',
          'data-[hidden=true]:-translate-y-full'
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 md:gap-4 md:px-6">
          {/* Mobile: hamburger */}
          <button
            type="button"
            aria-label={tNav('close')}
            onClick={() => setDrawerOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/5 md:hidden"
          >
            <Menu className="size-5" />
          </button>

          {/* Logo / wordmark */}
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight"
          >
            <span
              aria-hidden="true"
              className="inline-block size-6 rounded-md"
              style={{ background: 'var(--roleplay-brand-gradient)' }}
            />
            <span className="hidden bg-clip-text text-transparent sm:inline" style={{ backgroundImage: 'var(--roleplay-brand-gradient)' }}>
              RolePlay
            </span>
          </Link>

          {/* Search — full-width on desktop, icon button on mobile */}
          <div className="ml-auto flex items-center gap-2 md:ml-0 md:flex-1 md:justify-center">
            <div className="hidden max-w-md flex-1 md:block">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  type="search"
                  placeholder={t('search')}
                  className="bg-black/40 pl-9 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </label>
            </div>
            <button
              type="button"
              aria-label={t('search')}
              className="inline-flex size-9 items-center justify-center rounded-full text-zinc-200 transition-colors hover:bg-white/5 md:hidden"
            >
              <Search className="size-5" />
            </button>
          </div>

          <Link
            href={pathname || '/'}
            locale={nextLocale}
            className="inline-flex min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:bg-white/10"
            aria-label={locale.startsWith('zh') ? 'Switch to English' : '切换到中文'}
          >
            {localeLabel}
          </Link>

          {/* Create CTA — desktop only; on mobile it lives in the drawer */}
          {showCreateShortcut ? (
            <Link
              href="/create"
              className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-[0_4px_18px_-4px_rgba(217,70,239,0.55)] transition-transform hover:-translate-y-0.5 md:inline-flex"
              style={{ background: 'var(--roleplay-brand-gradient)' }}
            >
              <Plus className="size-3.5" />
              {tNav('create')}
            </Link>
          ) : null}

          {isAdmin ? (
            <Link
              href="/admin/roleplay/review"
              className="hidden items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/20 md:inline-flex"
              aria-label={tNav('admin_review')}
            >
              <ShieldCheck className="size-3.5" />
              {tNav('admin_review')}
            </Link>
          ) : null}

          {/* Auth corner */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={tNav('account_menu')}
                  className="ml-1 inline-flex size-9 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xs font-semibold transition-colors hover:bg-white/15"
                >
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt={user.name || 'avatar'}
                      className="size-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-64 border-white/10 bg-[#15151b] text-zinc-100"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-sm font-semibold">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.image}
                          alt={user.name || 'avatar'}
                          className="size-full object-cover"
                        />
                      ) : (
                        initial
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {displayName}
                      </p>
                      <p className="truncate text-xs text-zinc-400">
                        {user.email || tNav('signed_in')}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link
                    href="/settings/profile"
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <UserRound className="size-4" />
                    {tNav('profile')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer gap-2"
                  disabled={signingOut}
                  onClick={() => void handleSignOut('signin')}
                >
                  {signingOut ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UsersRound className="size-4" />
                  )}
                  {tNav('switch_account')}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  className="cursor-pointer gap-2 text-rose-200 focus:text-rose-100"
                  disabled={signingOut}
                  onClick={() => void handleSignOut('home')}
                >
                  {signingOut ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  {tNav('sign_out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !authChecked || isPending ? (
            <button
              type="button"
              aria-label={tNav('account')}
              className="ml-1 hidden size-9 items-center justify-center rounded-full bg-white/10 text-zinc-300 md:inline-flex"
              disabled
            >
              <Loader2 className="size-4 animate-spin" />
            </button>
          ) : (
            <Link
              href="/sign-in?switch=1"
              className="hidden items-center rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-100 transition-colors hover:bg-white/5 md:inline-flex"
            >
              {t('sign_in')}
            </Link>
          )}
        </div>
      </header>

      <RoleplayNavDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        user={user}
        authChecked={authChecked}
        isAdmin={isAdmin}
      />
    </>
  );
}
