'use client';

/**
 * Owner-side listing for `/create`.
 *
 * Renders the My Talkies dashboard with All / Draft / Under Review / Published
 * tabs plus a "Create a Talkie" CTA. Mirrors Talkie's web flow:
 * - Tabs are query-driven; switching tabs refetches the matching slice instead
 *   of filtering the all-up cache. Keeps the source of truth on the server,
 *   so external moderation transitions show up on the next tab switch.
 * - Empty state varies per tab (different copy for "no drafts" vs "no
 *   published characters yet").
 * - Cards expose Edit (-> /create/edit/[id]) and Delete (with confirm).
 *   Publish is reachable from the edit page, not from the card row, to keep
 *   the row tap target predictable.
 */

import { Home, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useRouter } from '@/core/i18n/navigation';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  fetchMyTalkies,
  type MyTalkieFilter,
  type MyTalkieItem,
} from '@/shared/lib/roleplay-client';
import { cn } from '@/shared/lib/utils';

const TABS: MyTalkieFilter[] = ['all', 'draft', 'under_review', 'published'];

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-zinc-700/60 text-zinc-200',
  under_review: 'bg-amber-500/20 text-amber-200',
  published: 'bg-emerald-500/20 text-emerald-200',
  rejected: 'bg-rose-500/20 text-rose-200',
  created: 'bg-emerald-500/20 text-emerald-200', // legacy alias
};

type TabCache = Partial<
  Record<
    MyTalkieFilter,
    {
      characters: MyTalkieItem[];
      migrationRequired?: boolean;
    }
  >
>;

export function RoleplayCreateList() {
  const t = useTranslations('roleplay.create');
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = useMemo<MyTalkieFilter>(() => {
    const raw = searchParams.get('tab');
    return (TABS as string[]).includes(raw || '')
      ? (raw as MyTalkieFilter)
      : 'all';
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<MyTalkieFilter>(initialTab);
  const [items, setItems] = useState<MyTalkieItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [cache, setCache] = useState<TabCache>({});
  const cacheRef = useRef<TabCache>({});

  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Re-sync the tab when the URL query changes (e.g. router.push from the
  // edit page after Publish: `/create?tab=under_review`).
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const load = useCallback(
    (filter: MyTalkieFilter, signal?: AbortSignal) => {
      const cached = cacheRef.current[filter];
      if (cached) {
        setItems(cached.characters);
        setMigrationRequired(Boolean(cached.migrationRequired));
        setLoading(false);
      } else {
        setLoading(true);
      }
      return fetchMyTalkies(filter, { signal })
        .then((data) => {
          if (signal?.aborted) return;
          setCache((prev) => ({
            ...prev,
            [filter]: data,
          }));
          if (data.unauthenticated) {
            router.push('/sign-in');
            return;
          }
          setItems(data.characters);
          setMigrationRequired(Boolean(data.migrationRequired));
        })
        .finally(() => {
          if (signal?.aborted) return;
          setLoading(false);
        });
    },
    [router]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(activeTab, controller.signal);
    return () => controller.abort();
  }, [activeTab, load]);

  useEffect(() => {
    const controller = new AbortController();
    const missingTabs = TABS.filter((tab) => tab !== activeTab && !cache[tab]);
    if (!missingTabs.length) return () => controller.abort();

    void Promise.all(
      missingTabs.map((tab) =>
        fetchMyTalkies(tab, { signal: controller.signal })
          .then((data) => ({ tab, data }))
          .catch(() => null)
      )
    ).then((results) => {
      if (controller.signal.aborted) return;
      setCache((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          if (result) next[result.tab] = result.data;
        });
        return next;
      });
    });

    return () => controller.abort();
  }, [activeTab, cache]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm(t('confirm_delete'))) return;
      setDeletingId(id);
      try {
        const res = await fetch(`/api/roleplay/characters/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || (payload?.code && payload.code !== 0)) {
          toast.error(payload?.message || 'delete failed');
          return;
        }
        // Optimistic local removal — avoids a refetch round-trip on the
        // common case. The next tab switch will re-sync if anything drifted.
        setItems((prev) => prev.filter((item) => item.id !== id));
        setCache((prev) => {
          const next: TabCache = {};
          for (const [tab, value] of Object.entries(prev) as [
            MyTalkieFilter,
            NonNullable<TabCache[MyTalkieFilter]>,
          ][]) {
            next[tab] = {
              ...value,
              characters: value.characters.filter((item) => item.id !== id),
            };
          }
          return next;
        });
      } catch (e: any) {
        toast.error(e?.message || 'delete failed');
      } finally {
        setDeletingId(null);
      }
    },
    [t]
  );

  const handleTabChange = useCallback(
    (tab: MyTalkieFilter) => {
      setActiveTab(tab);
      const url = new URL(window.location.href);
      if (tab === 'all') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState(null, '', `${url.pathname}${url.search}`);
    },
    []
  );

  const emptyCopy = useMemo(() => {
    const key =
      activeTab === 'draft'
        ? 'list_empty.draft'
        : activeTab === 'under_review'
          ? 'list_empty.under_review'
          : activeTab === 'published'
            ? 'list_empty.published'
            : 'list_empty.subtitle';
    return t(key);
  }, [activeTab, t]);

  return (
    <main className="min-h-dvh bg-[#0d0d10] pb-[calc(env(safe-area-inset-bottom)+24px)] text-white">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0d0d10]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0d0d10]/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-3 pt-6 md:flex-row md:items-center md:justify-between md:px-6 md:pt-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-zinc-300 transition-colors hover:bg-white/5"
                aria-label={t('home_label')}
              >
                <Home className="size-4" />
                {t('home_label')}
              </button>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {t('list_title')}
            </h1>
            <p className="text-sm text-zinc-400">{t('list_subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => router.push('/create/quick')}
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(217,70,239,0.6)] transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--roleplay-brand-gradient)' }}
            >
              <Sparkles className="size-4" />
              {t('quick_create.entry_cta')}
            </button>
            <button
              type="button"
              onClick={() => router.push('/create/edit')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Plus className="size-4" />
              {t('create_cta')}
            </button>
          </div>
        </div>

        <nav
          aria-label="My Talkies tabs"
          className="mx-auto -mb-px flex max-w-6xl gap-1 overflow-x-auto px-4 md:px-6"
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              data-active={activeTab === tab}
              className={cn(
                'shrink-0 rounded-t-lg border-b-2 border-transparent px-3 py-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white',
                'data-[active=true]:border-white data-[active=true]:text-white'
              )}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-5 md:px-6 md:pt-7">
        {migrationRequired ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            roleplay tables not migrated — please run the database migrations.
          </p>
        ) : loading ? (
          <CardListSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            title={t('list_empty.title')}
            subtitle={emptyCopy}
            cta={t('create_cta')}
            quickCta={t('quick_create.entry_cta')}
            onQuickCta={() => router.push('/create/quick')}
            onCta={() => router.push('/create/edit')}
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <CardRow
                  item={item}
                  busy={deletingId === item.id}
                  statusLabel={t(`status_labels.${normaliseStatus(item.status)}`)}
                  rejectionLabel={t('rejection_label')}
                  editLabel={t('edit')}
                  deleteLabel={t('delete')}
                  onEdit={() => router.push(`/create/edit/${item.id}`)}
                  onDelete={() => handleDelete(item.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function normaliseStatus(status: MyTalkieItem['status']) {
  return status === 'created' ? 'published' : status;
}

type CardRowProps = {
  item: MyTalkieItem;
  busy: boolean;
  statusLabel: string;
  rejectionLabel: string;
  editLabel: string;
  deleteLabel: string;
  onEdit: () => void;
  onDelete: () => void;
};

function CardRow({
  item,
  busy,
  statusLabel,
  rejectionLabel,
  editLabel,
  deleteLabel,
  onEdit,
  onDelete,
}: CardRowProps) {
  const status = normaliseStatus(item.status);
  const tone = STATUS_TONE[status] ?? STATUS_TONE.draft;
  const cover = item.cover || item.avatar || item.gallery[0] || '';
  // Only public rows in moderation/published state are locked. Private
  // published rows should still expose Edit so creators can adjust them.
  const isLocked =
    status === 'under_review' ||
    (status === 'published' && item.visibility === 'public');

  return (
    <article className="flex h-full flex-col gap-3 overflow-hidden rounded-[18px] bg-[#15151b] text-white">
      <div className="flex gap-3 p-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-white/5 sm:size-24">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              alt={item.name}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-start gap-2">
            <h2 className="min-w-0 flex-1 truncate text-base font-semibold leading-tight">
              {item.name || '—'}
            </h2>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                tone
              )}
            >
              {statusLabel}
            </span>
          </div>
          {item.tagline ? (
            <p className="line-clamp-2 text-sm text-zinc-300">{item.tagline}</p>
          ) : item.intro ? (
            <p className="line-clamp-2 text-sm text-zinc-300">{item.intro}</p>
          ) : null}
          {status === 'rejected' && item.rejectionReason ? (
            <p className="mt-1 rounded-lg bg-rose-500/10 px-2 py-1 text-xs text-rose-200">
              <span className="font-medium">{rejectionLabel}:</span>{' '}
              {item.rejectionReason}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-white/5 px-3 py-2">
        {isLocked ? null : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
          >
            {editLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Trash2 className="size-3.5" />
          )}
          {deleteLabel}
        </button>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  subtitle,
  cta,
  quickCta,
  onQuickCta,
  onCta,
}: {
  title: string;
  subtitle: string;
  cta: string;
  quickCta: string;
  onQuickCta: () => void;
  onCta: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-white/5 bg-[#15151b] px-6 py-16 text-center">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-zinc-400">{subtitle}</p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onQuickCta}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(217,70,239,0.6)] transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--roleplay-brand-gradient)' }}
        >
          <Sparkles className="size-4" />
          {quickCta}
        </button>
        <button
          type="button"
          onClick={onCta}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          <Plus className="size-4" />
          {cta}
        </button>
      </div>
    </div>
  );
}

function CardListSkeleton() {
  return (
    <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, idx) => (
        <li key={idx}>
          <div className="flex h-full flex-col gap-3 overflow-hidden rounded-[18px] bg-[#15151b] p-3">
            <div className="flex gap-3">
              <Skeleton className="size-20 shrink-0 rounded-2xl bg-white/5 sm:size-24" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-2/3 bg-white/5" />
                <Skeleton className="h-3 w-full bg-white/5" />
                <Skeleton className="h-3 w-5/6 bg-white/5" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Skeleton className="h-7 w-14 bg-white/5" />
              <Skeleton className="h-7 w-16 bg-white/5" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
