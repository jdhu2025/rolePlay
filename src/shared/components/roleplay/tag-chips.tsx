'use client';

/**
 * Horizontal tag chip rail for the homepage.
 *
 * Drives the `?tag=` filter on the picker grid. Mounts the canonical tags
 * fetched from `/api/roleplay/tags` plus a leading "All" chip that maps to
 * `null`. Mobile gets edge-to-edge horizontal scrolling without a visible
 * scrollbar; desktop keeps it inline.
 *
 * The component is controlled (parent owns the active slug) so the same
 * value can drive both this rail and the grid query in lockstep.
 */

import { useEffect, useState } from 'react';

import { Skeleton } from '@/shared/components/ui/skeleton';
import { cn } from '@/shared/lib/utils';

export type RoleplayTagItem = {
  slug: string;
  labelEn: string;
  labelZh: string;
};

type Props = {
  active: string | null;
  onChange: (slug: string | null) => void;
  /** Optional pre-fetched tag list (lets callers seed from RSC). */
  tags?: RoleplayTagItem[];
  /** "All" chip label, e.g. localized "All" / "全部". */
  allLabel: string;
  /** Tag slug → display label resolver (so the parent picks the locale). */
  resolveLabel?: (tag: RoleplayTagItem) => string;
};

export function TagChips({
  active,
  onChange,
  tags: provided,
  allLabel,
  resolveLabel,
}: Props) {
  const [tags, setTags] = useState<RoleplayTagItem[]>(provided ?? []);
  const [loading, setLoading] = useState(!provided);

  useEffect(() => {
    if (provided) return;
    let cancelled = false;
    fetch('/api/roleplay/tags', { credentials: 'include' })
      .then((res) => res.json())
      .then((payload) => {
        if (cancelled) return;
        const list = (payload?.data?.tags || []) as RoleplayTagItem[];
        setTags(list);
      })
      .catch(() => {
        // Tag fetch failure is non-fatal — the grid still loads, the user
        // just doesn't get a filter rail. The home page above this is the
        // primary surface, so don't block it.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [provided]);

  if (loading) {
    return (
      <div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:px-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <Skeleton key={idx} className="h-8 w-20 shrink-0 rounded-full bg-white/5" />
        ))}
      </div>
    );
  }

  return (
    <nav
      aria-label="Tag filters"
      className="flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:px-6"
    >
      <Chip
        label={allLabel}
        active={active === null}
        onClick={() => onChange(null)}
      />
      {tags.map((tag) => (
        <Chip
          key={tag.slug}
          label={resolveLabel ? resolveLabel(tag) : tag.labelEn}
          active={active === tag.slug}
          onClick={() => onChange(tag.slug)}
        />
      ))}
    </nav>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={active}
      className={cn(
        'max-w-[72vw] shrink-0 truncate whitespace-nowrap rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors md:max-w-none',
        'hover:bg-white/5',
        'data-[active=true]:border-white data-[active=true]:bg-white data-[active=true]:text-black'
      )}
    >
      {label}
    </button>
  );
}
