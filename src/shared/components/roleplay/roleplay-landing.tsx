'use client';

/**
 * First-screen roleplay picker.
 *
 * Replaces the old TalkieMvp landing experience. Renders the 12 official
 * characters as a Crushly-style photo-first grid. The first viewport is the
 * picker itself, no marketing hero.
 *
 * Performance posture:
 * - Cards are mounted screen-by-screen via an IntersectionObserver sentinel
 *   ("infinite scroll" style). The first batch covers the initial viewport;
 *   subsequent batches mount only when the user scrolls toward the end of the
 *   list. Combined with the carousel's on-demand slide mounting this keeps
 *   the picker at ~6 fetched images on first paint instead of 12 cards × 3
 *   slides = 36 image GETs.
 *
 * v2 Phase C: a sticky tag-chip rail above the grid filters by the canonical
 * roleplay taxonomy. Switching chips refetches a fresh slice from the API
 * (server is the source of truth) instead of filtering the cached list.
 */

import { useLocale, useTranslations } from 'next-intl';
import { BadgeDollarSign, MessageCircle, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { RoleplayCharacterCard } from '@/shared/components/roleplay/roleplay-character-card';
import {
  TagChips,
  type RoleplayTagItem,
} from '@/shared/components/roleplay/tag-chips';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  OFFICIAL_ROLEPLAY_CHARACTERS,
  fetchRoleplayCharacters,
  fetchRoleplayRecommendations,
  type RoleplayCharacterClient,
} from '@/shared/lib/roleplay-client';
import {
  FIRST_EXPERIENCE_ACTIVE_KEY,
  FIRST_EXPERIENCE_SELECTED_AT_KEY,
  FIRST_EXPERIENCE_STORAGE_KEY,
  FIRST_EXPERIENCE_CHOICES,
  buildFirstExperiencePersona,
  createFirstExperienceState,
  getFirstExperienceChoice,
  parseFirstExperienceState,
  type FirstExperienceChoiceId,
} from '@/shared/lib/roleplay-first-experience';
import { recordRoleplayMomentEvent } from '@/shared/lib/roleplay-moment-events';
import { useAppContext } from '@/shared/contexts/app';
import { getSupportMailto } from '@/shared/lib/support-email';

import type { RoleplayHomeInitialData } from '@/shared/lib/server/roleplay-home-data';

const SKELETON_COUNT = 6;
const DEFAULT_ROLEPLAY_TAG_SLUG: string | null = null;
const RECOMMENDATION_LIMIT = 12;
const EXPLORE_FETCH_LIMIT = 24;
// One "screen" of cards. The grid is up to 3 columns desktop / 2 columns
// tablet / 1 column mobile, so 6 covers two rows on desktop and 3 rows on
// tablet — roughly one viewport on each. Tune in tandem with the grid
// breakpoints below.
const PAGE_SIZE = 6;

type Props = {
  initialData?: RoleplayHomeInitialData;
};

export function RoleplayLanding({ initialData }: Props) {
  const t = useTranslations('roleplay.picker');
  const tHome = useTranslations('roleplay.home');
  const locale = useLocale();
  const localDefaultCharacters = useMemo(
    () =>
      DEFAULT_ROLEPLAY_TAG_SLUG
        ? OFFICIAL_ROLEPLAY_CHARACTERS.filter((character) =>
            character.tagSlugs.includes(DEFAULT_ROLEPLAY_TAG_SLUG)
          )
        : OFFICIAL_ROLEPLAY_CHARACTERS,
    []
  );
  const initialCharacters = initialData?.characters.length
    ? initialData.characters
    : localDefaultCharacters;
  const initialRecommendations = initialData?.recommendedCharacters.length
    ? initialData.recommendedCharacters
    : initialCharacters.slice(0, RECOMMENDATION_LIMIT);
  const [characters, setCharacters] = useState<RoleplayCharacterClient[]>(
    initialCharacters
  );
  const [recommendedCharacters, setRecommendedCharacters] = useState<
    RoleplayCharacterClient[]
  >(initialRecommendations);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(
    DEFAULT_ROLEPLAY_TAG_SLUG
  );
  // How many characters we've mounted so far. Starts at one page; the
  // sentinel below grows it as the user scrolls.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const refreshRecommendationsForExperience = (
    firstImpression: FirstExperienceChoiceId
  ) => {
    const controller = new AbortController();
    setRecommendationsLoading(true);
    fetchRoleplayRecommendations({
      signal: controller.signal,
      limit: RECOMMENDATION_LIMIT,
      firstImpression,
    })
      .then((data) => {
        if (data.characters.length > 0) {
          setRecommendedCharacters(data.characters);
        }
      })
      .finally(() => {
        setRecommendationsLoading(false);
      });
    return () => controller.abort();
  };

  useEffect(() => {
    if (initialData?.recommendedCharacters.length) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setRecommendationsLoading(true);

      fetchRoleplayRecommendations({
        signal: controller.signal,
        limit: RECOMMENDATION_LIMIT,
      })
        .then((data) => {
          if (data.characters.length > 0) {
            setRecommendedCharacters(data.characters);
          }
        })
        .finally(() => {
          setRecommendationsLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initialData?.recommendedCharacters.length]);

  useEffect(() => {
    if (activeTag === DEFAULT_ROLEPLAY_TAG_SLUG && initialData?.characters.length) {
      setCharacters(initialData.characters);
      setLoading(false);
      setVisibleCount(PAGE_SIZE);
      return;
    }

    const controller = new AbortController();
    const hasLocalDefault = activeTag === null;
    const localCharacters = activeTag
      ? OFFICIAL_ROLEPLAY_CHARACTERS.filter((character) =>
          character.tagSlugs.includes(activeTag)
        )
      : OFFICIAL_ROLEPLAY_CHARACTERS;
    if (localCharacters.length > 0) {
      setCharacters(localCharacters);
      setLoading(false);
      setVisibleCount(PAGE_SIZE);
    } else {
      setLoading(true);
      setVisibleCount(PAGE_SIZE);
    }

    const timer = window.setTimeout(
      () => {
        fetchRoleplayCharacters({
          signal: controller.signal,
          tagSlug: activeTag,
          limit: EXPLORE_FETCH_LIMIT,
        })
          .then((data) => {
            if (data.characters.length > 0 || !hasLocalDefault) {
              setCharacters(data.characters);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      },
      localCharacters.length > 0 ? 250 : 0
    );
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [activeTag, initialData?.characters]);

  // Reveal more cards as the bottom sentinel enters the viewport. Browsers
  // without IntersectionObserver fall back to mounting everything once the
  // first batch lands; the all-up surface is only 12 cards so it's a safe
  // graceful degradation.
  useEffect(() => {
    if (loading) return;
    if (visibleCount >= characters.length) return;
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(characters.length);
      return;
    }
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCount((prev) =>
              Math.min(prev + PAGE_SIZE, characters.length)
            );
          }
        }
      },
      {
        // Start fetching the next batch a screen-and-a-half before it would
        // actually scroll into view, so on a fast scroll there's no visible
        // gap between batches.
        rootMargin: '0px 0px 1200px 0px',
      }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loading, visibleCount, characters.length]);

  const visibleCharacters = useMemo(
    () => characters.slice(0, visibleCount),
    [characters, visibleCount]
  );
  const hasMore = visibleCount < characters.length;

  // Localised label resolver for chips. Always trusts the API-stored label
  // so the landing chips render with the exact same wording the create form
  // shows in its Categories picker — zero drift between picker rail and
  // tagging UI even if a translator changes the i18n catalogue.
  const resolveLabel = useMemo(() => {
    return (tag: RoleplayTagItem) => {
      const key = tag.slug as string;
      if (locale.startsWith('zh')) return tag.labelZh || tag.labelEn || key;
      return tag.labelEn || tag.labelZh || key;
    };
  }, [locale]);

  return (
    <main className="min-h-dvh overflow-hidden bg-[#0d0d10] text-white">
      <FirstExperienceDirector
        onSelected={refreshRecommendationsForExperience}
      />
      <ForYouSection
        characters={recommendedCharacters}
        loading={recommendationsLoading}
      />
      <FirstMomentPreference />

      <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6 md:pt-10">
        <div className="flex flex-col gap-1 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {tHome('explore_label')}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {t('title')}
          </h2>
        </div>
      </section>

      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 mx-auto max-w-6xl bg-[#0d0d10]/85 pb-2 pt-2 backdrop-blur supports-[backdrop-filter]:bg-[#0d0d10]/70">
        <TagChips
          active={activeTag}
          onChange={setActiveTag}
          tags={initialData?.tags}
          allLabel={locale.startsWith('zh') ? '全部' : 'ALL'}
          resolveLabel={resolveLabel}
        />
      </div>

      <section
        aria-label={t('title')}
        className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 pb-4 pt-3 sm:grid-cols-2 md:grid-cols-3 md:px-6"
      >
        {loading
          ? Array.from({ length: SKELETON_COUNT }).map((_, idx) => (
              <CardSkeleton key={idx} />
            ))
          : visibleCharacters.length === 0
            ? (
                <p className="col-span-full py-16 text-center text-sm text-zinc-400">
                  {t('empty')}
                </p>
              )
            : visibleCharacters.map((character) => (
                <RoleplayCharacterCard
                  key={character.id}
                  character={character}
                  // For You owns the real first viewport. Keep Explore images
                  // lazy so below-the-fold cards do not compete with LCP.
                  priority={false}
                />
              ))}
      </section>

      {/* Sentinel + skeleton stand-in for the next batch. The skeleton
          gives the grid measurable height so the observer fires, and acts
          as a loading indicator while images stream in. */}
      {!loading && hasMore && (
        <section
          aria-hidden="true"
          className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 md:px-6"
        >
          {Array.from({
            length: Math.min(PAGE_SIZE, characters.length - visibleCount),
          }).map((_, idx) => (
            <CardSkeleton key={idx} />
          ))}
        </section>
      )}

      <div ref={sentinelRef} aria-hidden="true" className="h-1 w-full" />
      <RoleplayHomeFooter />
    </main>
  );
}

function FirstExperienceDirector({
  onSelected,
}: {
  onSelected: (choice: FirstExperienceChoiceId) => void;
}) {
  const locale = useLocale();
  const [hidden, setHidden] = useState(true);
  const [selectedChoice, setSelectedChoice] =
    useState<FirstExperienceChoiceId | null>(null);
  const isZh = locale.startsWith('zh');
  const activeChoice = getFirstExperienceChoice(selectedChoice);

  useEffect(() => {
    const existingState = parseFirstExperienceState(
      window.localStorage.getItem(FIRST_EXPERIENCE_STORAGE_KEY)
    );
    if (existingState) return;

    const existingChoice = window.localStorage
      .getItem('roleplay:first-impression')
      ?.trim();
    if (getFirstExperienceChoice(existingChoice)) return;

    setHidden(false);
    window.sessionStorage.setItem(FIRST_EXPERIENCE_ACTIVE_KEY, 'true');
    recordRoleplayMomentEvent({
      eventType: 'first_experience_exposed',
      metadata: { variant: 'director_v1' },
    });
  }, []);

  const handleSelect = (choiceId: FirstExperienceChoiceId) => {
    const state = createFirstExperienceState(choiceId);
    const choice = getFirstExperienceChoice(choiceId);
    setSelectedChoice(choiceId);
    window.localStorage.setItem(
      FIRST_EXPERIENCE_STORAGE_KEY,
      JSON.stringify({ ...state, revealShown: true })
    );
    window.localStorage.setItem(
      FIRST_EXPERIENCE_SELECTED_AT_KEY,
      state.selectedAt
    );
    window.localStorage.setItem('roleplay:first-impression', choiceId);
    recordRoleplayMomentEvent({
      eventType: 'first_experience_selected',
      metadata: { choice: choiceId, variant: 'director_v1' },
    });
    recordRoleplayMomentEvent({
      eventType: 'first_experience_reveal_shown',
      metadata: { choice: choiceId, variant: 'director_v1' },
    });
    if (choice) {
      fetch('/api/roleplay/user-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstImpression: buildFirstExperiencePersona(choiceId),
        }),
      }).catch(() => {});
    }
    onSelected(choiceId);
    window.setTimeout(() => setHidden(true), 2400);
  };

  if (hidden) return null;

  return (
    <section className="border-b border-white/6 bg-[#101114]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {isZh
            ? FIRST_EXPERIENCE_CHOICES[0].promptZh
            : FIRST_EXPERIENCE_CHOICES[0].promptEn}
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          {FIRST_EXPERIENCE_CHOICES.map((choice) => (
            <button
              key={choice.id}
              type="button"
              onClick={() => handleSelect(choice.id)}
              disabled={Boolean(selectedChoice)}
              className="group min-h-20 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-70"
            >
              <span className="block text-sm font-semibold text-zinc-100">
                {isZh ? choice.labelZh : choice.labelEn}
              </span>
              <span className="mt-1 block text-xs leading-snug text-zinc-500 group-hover:text-zinc-400">
                {isZh ? choice.descriptionZh : choice.descriptionEn}
              </span>
            </button>
          ))}
        </div>
        {activeChoice && (
          <p className="text-sm leading-relaxed text-zinc-300">
            {isZh ? activeChoice.revealZh : activeChoice.revealEn}
          </p>
        )}
      </div>
    </section>
  );
}

function FirstMomentPreference() {
  const t = useTranslations('roleplay.home.preference');
  const [hidden, setHidden] = useState(true);
  const [savingChoice, setSavingChoice] = useState('');

  const options = [
    {
      id: 'quiet',
      label: t('options.quiet'),
      description: t('descriptions.quiet'),
    },
    {
      id: 'playful',
      label: t('options.playful'),
      description: t('descriptions.playful'),
    },
    {
      id: 'guarded',
      label: t('options.guarded'),
      description: t('descriptions.guarded'),
    },
  ];

  useEffect(() => {
    const localChoice = window.localStorage.getItem(
      'roleplay:first-impression'
    );
    if (localChoice) return;
    if (window.sessionStorage.getItem(FIRST_EXPERIENCE_ACTIVE_KEY) === 'true') {
      return;
    }

    const controller = new AbortController();
    fetch('/api/roleplay/user-persona', {
      method: 'GET',
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((payload) => {
        const firstImpression =
          payload?.data?.persona?.firstImpression ||
          payload?.persona?.firstImpression;
        if (!firstImpression) setHidden(false);
      })
      .catch(() => {
        setHidden(false);
      });

    return () => controller.abort();
  }, []);

  const saveChoice = (choice: string) => {
    setSavingChoice(choice);
    window.localStorage.setItem('roleplay:first-impression', choice);
    window.setTimeout(() => setHidden(true), 220);
    recordRoleplayMomentEvent({
      eventType: 'first_impression_selected',
      metadata: { choice },
    });

    fetch('/api/roleplay/user-persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstImpression: choice }),
    }).catch(() => {
      // Anonymous users still get the local first-session benefit. Logged-in
      // users can save the preference once auth is available.
    });
  };

  if (hidden) return null;

  return (
    <section className="border-b border-white/6 bg-[#0f1012]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {t('eyebrow')}
          </p>
          <h2 className="text-base font-semibold leading-tight text-zinc-100 md:text-lg">
            {t('title')}
          </h2>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:min-w-[560px]">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => saveChoice(option.id)}
              disabled={Boolean(savingChoice)}
              className="group min-h-16 rounded-[14px] border border-white/10 bg-white/[0.035] px-3 py-2 text-left transition hover:border-white/25 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-default disabled:opacity-70"
            >
              <span className="block text-sm font-semibold text-zinc-100">
                {savingChoice === option.id ? t('saved') : option.label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-zinc-500 group-hover:text-zinc-400">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForYouSection({
  characters,
  loading,
}: {
  characters: RoleplayCharacterClient[];
  loading: boolean;
}) {
  const t = useTranslations('roleplay.home');
  const proofPoints = t.raw('proof_points') as string[];

  return (
    <section className="relative border-b border-white/5 bg-[radial-gradient(circle_at_20%_0%,rgba(244,114,182,0.14),transparent_34%),linear-gradient(115deg,#111113_0%,#101113_58%,#0b1415_100%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-6 pt-8 md:gap-6 md:px-6 md:pb-10 md:pt-14">
        <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
              {t('for_you')}
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-[0.95] tracking-tight md:text-6xl">
              {t('seo_title')}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
              {t('seo_subtitle')}
            </p>
            <div className="flex flex-wrap gap-2">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-semibold text-zinc-200"
                >
                  {point}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href="#for-you-characters"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <MessageCircle size={17} aria-hidden="true" />
                {t('primary_cta')}
              </a>
              <Link
                href="/create"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-bold text-zinc-100 transition hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Sparkles size={17} aria-hidden="true" />
                {t('secondary_cta')}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-5 text-sm font-bold text-emerald-100 transition hover:border-emerald-200/50 hover:bg-emerald-300/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100/70"
              >
                <BadgeDollarSign size={17} aria-hidden="true" />
                {t('pricing_cta')}
              </Link>
            </div>
            <p className="max-w-sm text-left text-xs leading-relaxed text-zinc-400 lg:text-right">
              {t('pricing_note')}
            </p>
          </div>
        </header>

        <div
          id="for-you-characters"
          className="-mx-4 scroll-mt-24 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-6 md:px-6"
        >
          <div className="flex gap-4 pb-1">
            {loading && characters.length === 0
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="w-[76vw] max-w-[296px] shrink-0 sm:w-[44vw] sm:max-w-none md:w-[calc((100%_-_2rem)/3)]"
                  >
                    <CardSkeleton />
                  </div>
                ))
              : characters.length === 0
                ? (
                    <p className="w-full py-10 text-center text-sm text-zinc-400">
                      No recommendations yet.
                    </p>
                  )
                : characters.map((character, idx) => (
                    <div
                      key={character.id}
                      className="w-[76vw] max-w-[296px] shrink-0 sm:w-[44vw] sm:max-w-none md:w-[calc((100%_-_2rem)/3)]"
                    >
                      <RoleplayCharacterCard
                        character={character}
                        priority={idx < 3}
                        imageAspectClassName="aspect-[4/5] sm:aspect-[3/4]"
                        contentClassName="max-sm:px-3 max-sm:pb-3 max-sm:pt-2.5"
                        introClassName="max-sm:line-clamp-1"
                      />
                    </div>
                  ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RoleplayHomeFooter() {
  const t = useTranslations('roleplay.footer');
  const { configs } = useAppContext();
  const supportMailto = getSupportMailto(configs);
  const groups = [
    {
      title: t('features'),
      items: [
        [t('items.pricing'), '/pricing'],
        [t('items.chat'), '/chat'],
        [t('items.create_talkie'), '/create'],
        [t('items.billing'), '/settings/billing'],
        [t('items.payments'), '/settings/payments'],
      ],
    },
    {
      title: t('explore'),
      items: [
        [t('items.activities'), '/activity'],
        [t('items.more_characters'), '/'],
        [t('items.blog'), '/blog'],
        [t('items.updates'), '/updates'],
      ],
    },
    {
      title: t('overview'),
      items: [
        [t('items.support'), supportMailto],
        [t('items.terms'), '/terms-of-service'],
        [t('items.privacy'), '/privacy-policy'],
        [t('items.guidelines'), '/acceptable-use-policy'],
      ],
    },
  ];

  return (
    <footer className="mt-12 border-t border-white/6 bg-[linear-gradient(110deg,#101012_0%,#0d0f10_62%,#0b1516_100%)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.15fr_2fr] md:px-6 md:py-16">
        <div className="flex flex-col gap-8">
          <Link href="/" className="text-4xl font-black tracking-tight">
            Keepsay
          </Link>
          <div className="flex flex-wrap gap-3">
            {['GitHub', 'Email'].map((item) => (
              <a
                key={item}
                href={
                  item === 'Email'
                    ? supportMailto
                    : 'https://github.com/jdhu2025/rolePlay'
                }
                className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/[0.03] text-sm font-bold text-zinc-200 transition-colors hover:border-white/35 hover:bg-white/10"
                aria-label={item}
              >
                {item === 'Email' ? 'Mail' : 'Git'}
              </a>
            ))}
          </div>
          <p className="text-sm text-zinc-400">{t('copyright')}</p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {groups.map((group) => (
            <nav key={group.title} className="flex flex-col gap-5">
              <h2 className="text-base font-semibold text-zinc-200">
                {group.title}
              </h2>
              <ul className="flex flex-col gap-4">
                {group.items.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-200"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 overflow-hidden rounded-[18px] bg-[#15151b] p-0">
      <Skeleton className="aspect-[3/4] w-full rounded-none rounded-t-[18px] bg-white/5" />
      <div className="flex flex-col gap-2 px-4 pb-4">
        <Skeleton className="h-5 w-32 bg-white/5" />
        <Skeleton className="h-3 w-24 bg-white/5" />
        <Skeleton className="h-3 w-full bg-white/5" />
      </div>
    </div>
  );
}
