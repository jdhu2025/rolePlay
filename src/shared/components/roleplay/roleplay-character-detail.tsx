'use client';

/**
 * Character detail page.
 *
 * Layout:
 * - Mobile: vertical scroll, big carousel on top, info below.
 * - Desktop (md+): two columns, carousel pinned left, info on the right.
 *
 * Data source: `/api/roleplay/characters/[id]` via the shared client helper.
 * If the character cannot be found we render a notFound CTA pointing back to
 * the picker rather than throwing.
 */

import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { CommentBoard } from '@/shared/components/roleplay/comment-board';
import { PhotoCarousel } from '@/shared/components/roleplay/photo-carousel';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  fetchRoleplayCharacter,
  getLocalRoleplayCharacter,
  readCharacterSettings,
  type RoleplayCharacterClient,
} from '@/shared/lib/roleplay-client';

type Props = {
  characterId: string;
};

export function RoleplayCharacterDetail({ characterId }: Props) {
  const t = useTranslations('roleplay.detail');
  const tPicker = useTranslations('roleplay.picker');
  const localCharacter = getLocalRoleplayCharacter(characterId);
  const [character, setCharacter] = useState<RoleplayCharacterClient | null>(
    localCharacter
  );
  const [loading, setLoading] = useState(!localCharacter);

  useEffect(() => {
    const controller = new AbortController();
    fetchRoleplayCharacter(characterId, { signal: controller.signal })
      .then((data) => {
        setCharacter(data.character ?? localCharacter);
      })
      .finally(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, [characterId, localCharacter]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!character) {
    return (
      <main className="min-h-dvh bg-[#0d0d10] text-white">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 pb-16 pt-10 md:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t('back')}
          </Link>
          <p className="text-zinc-300">{tPicker('empty')}</p>
        </div>
      </main>
    );
  }

  const settings = readCharacterSettings(character);
  const occupation = settings.occupation || character.style;
  const location = settings.location || character.scene;
  const chatHref = `/chat/profile/${character.id}`;

  return (
    <main className="min-h-dvh bg-[#0d0d10] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-20 pt-6 md:px-6 md:pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 self-start text-sm text-zinc-300 hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('back')}
        </Link>

        <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:items-start md:gap-8">
          <PhotoCarousel
            images={character.gallery}
            alt={character.name}
            priority
            aspectClassName="aspect-[3/4]"
            className="w-full md:max-w-[420px]"
            sizes="(min-width: 768px) 420px, 100vw"
          />

          <div className="flex flex-col gap-5">
            <header className="flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  {character.name}
                </h1>
                <span className="text-lg font-medium text-zinc-400">
                  {character.age}
                </span>
              </div>
              {(occupation || location) && (
                <p className="text-sm text-zinc-400">
                  {[occupation, location].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="max-w-xl text-sm leading-relaxed text-zinc-300">
                {t('seo_line', { name: character.name })}
              </p>
            </header>

            {character.intro && (
              <Section title={t('bio')}>
                <p className="text-sm leading-relaxed text-zinc-200">
                  {character.intro}
                </p>
              </Section>
            )}

            {character.tags.length > 0 && (
              <Section title={t('tags')}>
                <ChipRow items={character.tags} tone="bright" />
              </Section>
            )}

            {character.personality.length > 0 && (
              <Section title={t('personality')}>
                <ChipRow items={character.personality} tone="muted" />
              </Section>
            )}

            <div className="pt-2">
              <Link
                href={chatHref}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_-8px_rgba(217,70,239,0.6)] transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--roleplay-brand-gradient)' }}
              >
                <MessageCircle size={16} aria-hidden="true" />
                {t('start_chat')}
              </Link>
            </div>
          </div>
        </div>

        {/* Comments live below the carousel + info on every breakpoint.
            Talkie's three-layer pattern is: chat (separate route) → profile
            (this page top half) → comments (this section). Keeping comments
            on the detail page means the chat composer stays focused. */}
        <CommentBoard characterId={character.id} />
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChipRow({
  items,
  tone,
}: {
  items: string[];
  tone: 'bright' | 'muted';
}) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li
          key={item}
          className={
            tone === 'bright'
              ? 'inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-zinc-100'
              : 'inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300'
          }
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-dvh bg-[#0d0d10] text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-20 pt-6 md:px-6 md:pt-10">
        <Skeleton className="h-4 w-24 bg-white/5" />
        <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_1fr] md:items-start md:gap-8">
          <Skeleton className="aspect-[3/4] w-full rounded-[14px] bg-white/5 md:max-w-[420px]" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-48 bg-white/5" />
            <Skeleton className="h-4 w-40 bg-white/5" />
            <Skeleton className="h-3 w-full bg-white/5" />
            <Skeleton className="h-3 w-5/6 bg-white/5" />
            <Skeleton className="h-8 w-32 rounded-full bg-white/5" />
          </div>
        </div>
      </div>
    </main>
  );
}
