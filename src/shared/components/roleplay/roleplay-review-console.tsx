'use client';

/**
 * Admin review console for roleplay characters.
 *
 * Lists `under_review` rows with the artwork + intro + settings inline so
 * the moderator can decide without leaving the page. Tabs flip between
 * the active queue and recent decisions (rejected / published) for an
 * audit-style view. Approve fires a one-click POST; reject opens a small
 * inline composer for the rejection reason.
 *
 * Mobile posture: the page is admin-only and most moderators work on
 * desktop, but the list collapses to a single column on small screens
 * with the action bar sticky at the bottom of each card.
 */

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Skeleton } from '@/shared/components/ui/skeleton';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

type ReviewItem = {
  id: string;
  name: string;
  authorName: string;
  status: string;
  visibility: string;
  tagline: string;
  intro: string;
  settings: string;
  opening: string;
  rejectionReason: string;
  avatar: string;
  cover: string;
  gallery: string[];
  tagSlugs: string[];
  updatedAt: string | Date;
};

type Filter = 'under_review' | 'rejected' | 'published';

const FILTERS: Filter[] = ['under_review', 'rejected', 'published'];

const FILTER_LABEL: Record<Filter, string> = {
  under_review: 'Pending review',
  rejected: 'Rejected',
  published: 'Published',
};

export function RoleplayReviewConsole() {
  const [filter, setFilter] = useState<Filter>('under_review');
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (next: Filter, signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/roleplay?status=${next}`, {
        credentials: 'include',
        signal,
      });
      const payload = await res.json().catch(() => ({}));
      if (signal?.aborted) return;
      if (payload?.code && payload.code !== 0) {
        toast.error(payload?.message || 'load failed');
        setItems([]);
        return;
      }
      const data = payload?.data ?? {};
      setItems((data.characters ?? []) as ReviewItem[]);
      setMigrationRequired(Boolean(data.migrationRequired));
    } catch (e: any) {
      if (signal?.aborted) return;
      toast.error(e?.message || 'load failed');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(filter, controller.signal);
    return () => controller.abort();
  }, [filter, load]);

  const handleApprove = useCallback(async (id: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/roleplay/${id}/moderate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || (payload?.code && payload.code !== 0)) {
        toast.error(payload?.message || 'approve failed');
        return;
      }
      // Optimistic remove from queue; the published tab will pick it up
      // on next switch.
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success('Approved');
    } catch (e: any) {
      toast.error(e?.message || 'approve failed');
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleReject = useCallback(
    async (id: string) => {
      const reason = rejectReason.trim();
      if (!reason) {
        toast.error('Please provide a reason');
        return;
      }
      setBusyId(id);
      try {
        const res = await fetch(`/api/admin/roleplay/${id}/moderate`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'reject', reason }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || (payload?.code && payload.code !== 0)) {
          toast.error(payload?.message || 'reject failed');
          return;
        }
        setItems((prev) => prev.filter((item) => item.id !== id));
        setRejectingId(null);
        setRejectReason('');
        toast.success('Rejected');
      } catch (e: any) {
        toast.error(e?.message || 'reject failed');
      } finally {
        setBusyId(null);
      }
    },
    [rejectReason]
  );

  return (
    <main className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Roleplay moderation
          </h1>
          <p className="text-sm text-muted-foreground">
            Approve characters into the public catalogue or send them back
            with a rejection reason.
          </p>
        </header>

        <nav
          aria-label="Review filter"
          className="flex gap-1 border-b border-border"
        >
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              data-active={filter === f}
              className={cn(
                'rounded-t-lg border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                'data-[active=true]:border-foreground data-[active=true]:text-foreground'
              )}
            >
              {FILTER_LABEL[f]}
            </button>
          ))}
        </nav>

        {migrationRequired ? (
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-200">
            roleplay tables are not migrated — run the database migrations.
          </p>
        ) : loading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
            Nothing in this queue.
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.id}>
                <ReviewCard
                  item={item}
                  busy={busyId === item.id}
                  filter={filter}
                  rejecting={rejectingId === item.id}
                  rejectReason={rejectReason}
                  onApprove={() => handleApprove(item.id)}
                  onStartReject={() => {
                    setRejectingId(item.id);
                    setRejectReason('');
                  }}
                  onCancelReject={() => {
                    setRejectingId(null);
                    setRejectReason('');
                  }}
                  onChangeReason={setRejectReason}
                  onConfirmReject={() => handleReject(item.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

type ReviewCardProps = {
  item: ReviewItem;
  busy: boolean;
  filter: Filter;
  rejecting: boolean;
  rejectReason: string;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onChangeReason: (next: string) => void;
  onConfirmReject: () => void;
};

function ReviewCard({
  item,
  busy,
  filter,
  rejecting,
  rejectReason,
  onApprove,
  onStartReject,
  onCancelReject,
  onChangeReason,
  onConfirmReject,
}: ReviewCardProps) {
  const cover = item.cover || item.avatar || item.gallery[0] || '';
  const isQueue = filter === 'under_review';

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={item.name}
            className="size-32 shrink-0 rounded-xl object-cover md:size-36"
          />
        ) : (
          <div className="size-32 shrink-0 rounded-xl bg-muted md:size-36" />
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold leading-tight">{item.name}</h2>
            <span className="text-xs text-muted-foreground">
              by {item.authorName}
            </span>
            {item.tagSlugs.length > 0 ? (
              <span className="text-xs text-muted-foreground">
                · {item.tagSlugs.join(', ')}
              </span>
            ) : null}
          </div>
          {item.tagline ? (
            <p className="text-sm text-muted-foreground">{item.tagline}</p>
          ) : null}
          {item.intro ? (
            <details className="text-sm">
              <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Intro
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.intro}</p>
            </details>
          ) : null}
          {item.settings ? (
            <details className="text-sm">
              <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Settings (system prompt)
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.settings}</p>
            </details>
          ) : null}
          {item.opening ? (
            <details className="text-sm">
              <summary className="cursor-pointer select-none text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Opening
              </summary>
              <p className="mt-1 whitespace-pre-wrap text-sm">{item.opening}</p>
            </details>
          ) : null}
          {filter === 'rejected' && item.rejectionReason ? (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-200">
              <span className="font-medium">Reason:</span>{' '}
              {item.rejectionReason}
            </p>
          ) : null}
        </div>
      </div>

      {isQueue ? (
        rejecting ? (
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3">
            <Textarea
              value={rejectReason}
              onChange={(event) => onChangeReason(event.target.value)}
              placeholder="Why is this character being rejected? The author sees this verbatim."
              className="min-h-[88px] bg-background"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancelReject}
                disabled={busy}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmReject}
                disabled={busy || !rejectReason.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm reject
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onStartReject}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 disabled:opacity-60 dark:text-rose-300"
            >
              <XCircle className="size-4" />
              Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Approve
            </button>
          </div>
        )
      ) : null}
    </article>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <li key={idx}>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 md:flex-row">
            <Skeleton className="size-32 shrink-0 rounded-xl bg-muted md:size-36" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-1/3 bg-muted" />
              <Skeleton className="h-3 w-1/4 bg-muted" />
              <Skeleton className="h-3 w-full bg-muted" />
              <Skeleton className="h-3 w-3/4 bg-muted" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
