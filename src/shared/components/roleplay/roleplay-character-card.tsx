'use client';

/**
 * Single character card for the picker grid.
 *
 * Layout follows the Crushly-style direction:
 * - Image dominates the card (carousel inside aspect-[3/4]).
 * - No nested card; the bottom info strip lives below the image area, not on
 *   top of it. A short bottom gradient is on the carousel itself if needed,
 *   but text never covers the face.
 * - Name + age + location single-line truncate.
 * - Intro line-clamp-2.
 * - Up to 3 tag chips, line-clamp-1 row.
 * - Whole card is clickable -> /character/[id].
 */

import { MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useRouter } from '@/core/i18n/navigation';
import { PhotoCarousel } from '@/shared/components/roleplay/photo-carousel';
import {
  type RoleplayCharacterClient,
  readCharacterSettings,
} from '@/shared/lib/roleplay-client';
import { cn } from '@/shared/lib/utils';

type Props = {
  character: RoleplayCharacterClient;
  /** Whether this card is in the first viewport (priority image hint). */
  priority?: boolean;
  className?: string;
  imageAspectClassName?: string;
  contentClassName?: string;
  introClassName?: string;
};

export function RoleplayCharacterCard({
  character,
  priority = false,
  className,
  imageAspectClassName = 'aspect-[3/4]',
  contentClassName,
  introClassName,
}: Props) {
  const settings = readCharacterSettings(character);
  const location = settings.location || character.scene || '';
  const tagSlice = character.tags.slice(0, 3);
  const router = useRouter();
  const tHome = useTranslations('roleplay.home');
  const [previewing, setPreviewing] = useState(false);
  const [typedGreeting, setTypedGreeting] = useState('');
  const prefetchedRef = useRef(false);

  const detailHref = `/character/${character.id}`;
  const chatHref = `/chat/profile/${character.id}`;
  const greeting = useMemo(() => {
    const text = character.opening || character.intro || character.tagline || '';
    return text.replace(/\s+/g, ' ').trim().slice(0, 220);
  }, [character.intro, character.opening, character.tagline]);

  useEffect(() => {
    if (!previewing || !greeting) {
      setTypedGreeting('');
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTypedGreeting(greeting);
      return;
    }

    let index = 0;
    setTypedGreeting('');
    const timer = window.setInterval(() => {
      index += 1;
      setTypedGreeting(greeting.slice(0, index));
      if (index >= greeting.length) window.clearInterval(timer);
    }, 18);

    return () => window.clearInterval(timer);
  }, [greeting, previewing]);

  const prefetchRoutes = useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    router.prefetch(chatHref);
    router.prefetch(detailHref);
  }, [chatHref, detailHref, router]);

  return (
    <article
      onMouseEnter={() => {
        setPreviewing(true);
        prefetchRoutes();
      }}
      onMouseLeave={() => setPreviewing(false)}
      onFocus={() => {
        setPreviewing(true);
        prefetchRoutes();
      }}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget as Node | null;
        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setPreviewing(false);
        }
      }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[20px] bg-[#15151b] text-white shadow-[0_2px_18px_rgba(0,0,0,0.35)] transition-all duration-200',
        'hover:-translate-y-1 hover:shadow-[0_18px_38px_-12px_rgba(217,70,239,0.45)]',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[20px] before:opacity-0 before:transition-opacity before:duration-200',
        'group-hover:before:opacity-100 hover:before:opacity-100',
        '[--card-glow:linear-gradient(135deg,rgba(217,70,239,0.18),rgba(244,114,182,0.08))]',
        'before:bg-[image:var(--card-glow)]',
        className
      )}
    >
      <div className="relative">
        <PhotoCarousel
          images={character.gallery}
          alt={character.name}
          priority={priority}
          aspectClassName={imageAspectClassName}
          className="cursor-pointer rounded-none rounded-t-[20px]"
          onImageClick={() => router.push(detailHref)}
        />

        {greeting && (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex min-h-[38%] flex-col justify-end px-4 pb-16 pt-16',
              'bg-gradient-to-t from-black/78 via-black/35 to-transparent opacity-0 transition-opacity duration-200',
              'md:group-hover:opacity-100 md:group-focus-within:opacity-100'
            )}
          >
            <p className="line-clamp-5 text-[15px] font-semibold leading-snug text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
              {typedGreeting}
              {previewing && (
                <span className="ml-0.5 inline-block animate-pulse">|</span>
              )}
            </p>
          </div>
        )}

        <Link
          href={chatHref}
          className={cn(
            'absolute inset-x-4 bottom-3 z-[3] inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/92 px-4 text-sm font-semibold text-zinc-950 shadow-[0_12px_28px_rgba(0,0,0,0.35)] backdrop-blur transition-all duration-200',
            'hover:-translate-y-0.5 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
            'md:opacity-0 md:translate-y-2 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100'
          )}
          aria-label={`Chat with ${character.name}`}
        >
          <MessageCircle size={17} aria-hidden="true" />
          {tHome('chat_now')}
        </Link>
      </div>

      <Link
        href={detailHref}
        prefetch={false}
        className={cn(
          'relative z-[1] flex flex-col gap-2 px-4 pb-4 pt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
          contentClassName
        )}
        aria-label={`${character.name}, ${character.age}`}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate text-lg font-semibold leading-tight">
            {character.name}
          </h3>
          <span className="shrink-0 text-sm font-medium text-zinc-400">
            {character.age}
          </span>
        </div>

        {location && (
          <div className="flex min-w-0 items-center gap-2 text-xs text-zinc-400">
            <span className="truncate">{location}</span>
          </div>
        )}

        <p
          className={cn(
            'line-clamp-2 text-sm leading-snug text-zinc-300',
            introClassName
          )}
        >
          {character.intro || character.tagline}
        </p>

        {tagSlice.length > 0 && (
          <ul className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden">
            {tagSlice.map((tag) => (
              <li
                key={tag}
                className="inline-flex max-w-full items-center truncate rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-zinc-200"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </Link>
    </article>
  );
}
