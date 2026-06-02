'use client';

/**
 * Threaded comment board for the character detail page.
 *
 * Renders the Talkie-style "View N Replies" pattern: a flat list of root
 * comments, each with the first 10 replies fetched alongside the root in
 * a single GET (the API does the join). Tap "View N Replies" to expand
 * the inline reply list, "Reply" to drop a child comment.
 *
 * Networking is intentionally simple: GET on mount, POST + refetch on
 * every reply or new top-level comment. We don't try to merge the
 * server's tree response into the local state because the server is the
 * canonical sort/ordering authority and an extra round-trip is cheap on
 * what is naturally a low-frequency action.
 */

import { Loader2, MessageSquare, Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Skeleton } from '@/shared/components/ui/skeleton';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

type Comment = {
  id: string;
  parentId?: string | null;
  body: string;
  authorName: string;
  userId: string;
  createdAt?: string;
  likeCount?: number;
};

type ThreadedComment = Comment & {
  replies: Comment[];
  replyCount: number;
};

type Props = {
  characterId: string;
};

export function CommentBoard({ characterId }: Props) {
  const t = useTranslations('roleplay.detail');

  const [threads, setThreads] = useState<ThreadedComment[]>([]);
  const [count, setCount] = useState(0);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [expandedRoots, setExpandedRoots] = useState<Set<string>>(
    () => new Set()
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const res = await fetch(
          `/api/roleplay/characters/${characterId}/comments`,
          { credentials: 'include', signal }
        );
        const payload = await res.json().catch(() => ({}));
        if (signal?.aborted) return;
        if (payload?.code && payload.code !== 0) {
          // Non-fatal: surface as empty.
          setThreads([]);
          setCount(0);
          return;
        }
        const data = payload?.data ?? {};
        setThreads((data.comments ?? []) as ThreadedComment[]);
        setCount(Number(data.commentCount ?? 0));
        setAuthenticated(Boolean(data.authenticated));
        setMigrationRequired(Boolean(data.migrationRequired));
      } catch {
        // Ignore — empty state covers it.
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [characterId]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleSubmit = useCallback(
    async (parentId: string | null) => {
      const text = draft.trim();
      if (!text || posting) return;
      if (!authenticated) {
        toast.error(t('comments_signin' as any));
        return;
      }
      setPosting(true);
      try {
        const res = await fetch(
          `/api/roleplay/characters/${characterId}/comments`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ body: text, parentId }),
          }
        );
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || (payload?.code && payload.code !== 0)) {
          toast.error(payload?.message || 'comment failed');
          return;
        }
        setDraft('');
        setReplyTo(null);
        if (parentId) {
          // Make sure the user can see their just-posted reply.
          setExpandedRoots((prev) => new Set(prev).add(parentId));
        }
        await load();
      } catch (e: any) {
        toast.error(e?.message || 'comment failed');
      } finally {
        setPosting(false);
      }
    },
    [authenticated, characterId, draft, load, posting, t]
  );

  const toggleExpanded = useCallback((rootId: string) => {
    setExpandedRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }, []);

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-2">
        <MessageSquare className="size-4 text-zinc-400" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-400">
          {t('comments' as any)} · {count}
        </h2>
      </header>

      {/* Top-level composer. Reply composer renders inline next to the
          target root below. */}
      {replyTo === null ? (
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => handleSubmit(null)}
          posting={posting}
          authenticated={authenticated}
          placeholder={t('comments_placeholder' as any)}
          submitLabel={t('comments_submit' as any)}
          signinLabel={t('comments_signin' as any)}
        />
      ) : null}

      {migrationRequired ? (
        <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          comments not migrated — please run the database migrations.
        </p>
      ) : loading ? (
        <ThreadSkeleton />
      ) : threads.length === 0 ? (
        <p className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-6 text-center text-sm text-zinc-400">
          {t('comments_empty' as any)}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((thread) => {
            const isExpanded = expandedRoots.has(thread.id);
            const isReplying = replyTo === thread.id;
            return (
              <li
                key={thread.id}
                className="flex flex-col gap-2 rounded-2xl bg-white/[0.04] p-3"
              >
                <CommentRow comment={thread} />
                <div className="flex items-center gap-3 pl-9 text-xs text-zinc-400">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyTo(isReplying ? null : thread.id);
                      setDraft('');
                    }}
                    className="text-zinc-300 hover:text-white"
                  >
                    {isReplying
                      ? t('comments_cancel' as any)
                      : t('comments_reply' as any)}
                  </button>
                  {thread.replyCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(thread.id)}
                      className="text-zinc-300 hover:text-white"
                    >
                      {isExpanded
                        ? t('comments_hide_replies' as any, {
                            count: thread.replyCount,
                          })
                        : t('comments_view_replies' as any, {
                            count: thread.replyCount,
                          })}
                    </button>
                  ) : null}
                </div>

                {isExpanded && thread.replies.length > 0 ? (
                  <ul className="ml-9 flex flex-col gap-2 border-l border-white/5 pl-3">
                    {thread.replies.map((reply) => (
                    <li key={reply.id}>
                        <CommentRow comment={reply} compact />
                      </li>
                    ))}
                  </ul>
                ) : null}

                {isReplying ? (
                  <div className="ml-9">
                    <Composer
                      value={draft}
                      onChange={setDraft}
                      onSubmit={() => handleSubmit(thread.id)}
                      posting={posting}
                      authenticated={authenticated}
                      placeholder={t('comments_reply_placeholder' as any, {
                        name: thread.authorName,
                      })}
                      submitLabel={t('comments_submit' as any)}
                      signinLabel={t('comments_signin' as any)}
                      compact
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CommentRow({
  comment,
  compact,
}: {
  comment: Comment;
  compact?: boolean;
}) {
  const initial = (comment.authorName || '?').slice(0, 1).toUpperCase();
  return (
    <div className={cn('flex items-start gap-2.5', compact && 'text-sm')}>
      <div
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-white/10 text-[11px] font-semibold text-zinc-200',
          compact ? 'size-7' : 'size-8'
        )}
        aria-hidden="true"
      >
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-300">
          {comment.authorName}
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100">
          {comment.body}
        </p>
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSubmit,
  posting,
  authenticated,
  placeholder,
  submitLabel,
  signinLabel,
  compact,
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  posting: boolean;
  authenticated: boolean;
  placeholder: string;
  submitLabel: string;
  signinLabel: string;
  compact?: boolean;
}) {
  if (!authenticated) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400">
        {signinLabel}
      </p>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          'flex-1 bg-black/40 text-zinc-100 caret-white placeholder:text-zinc-500',
          compact ? 'min-h-[64px]' : 'min-h-[88px]'
        )}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={posting || !value.trim()}
        aria-label={submitLabel}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        {posting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
      </button>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <ul className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, idx) => (
        <li
          key={idx}
          className="flex flex-col gap-2 rounded-2xl bg-white/[0.04] p-3"
        >
          <div className="flex gap-2.5">
            <Skeleton className="size-8 shrink-0 rounded-full bg-white/5" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24 bg-white/5" />
              <Skeleton className="h-3 w-full bg-white/5" />
              <Skeleton className="h-3 w-3/4 bg-white/5" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
