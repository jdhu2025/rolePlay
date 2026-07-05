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
import { ArrowRight, BadgeDollarSign, MessageCircle, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import { RoleplayCharacterCard } from '@/shared/components/roleplay/roleplay-character-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
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
import { canShowPublicGallery } from '@/shared/lib/compliance';
import { getSupportMailto } from '@/shared/lib/support-email';
import { TrackedRoleplayLink } from '@/shared/components/roleplay/tracked-roleplay-link';

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
      <ForYouSection
        characters={recommendedCharacters}
        loading={recommendationsLoading}
      />
      <FirstExperienceDirector
        onSelected={refreshRecommendationsForExperience}
      />
      <SeoSceneRail />
      <FirstMomentPreference />
      <HomeSeoSignals />
      <HomeFaqSection />

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

function SeoSceneRail() {
  const locale = useLocale();
  const isZh = locale.startsWith('zh');
  const scenes = [
    {
      href: '/ai-character-chat-with-memory',
      labelEn: 'AI character chat with memory',
      labelZh: '带记忆的 AI 角色聊天',
      descriptionEn: 'Chat with characters who remember your story and details.',
      descriptionZh: '和会记住故事与细节的角色聊天。',
    },
    {
      href: '/create-ai-character-with-memory',
      labelEn: 'Create AI character with memory',
      labelZh: '创建带记忆的 AI 角色',
      descriptionEn: 'Use a scene, personality, and memory seeds to start fast.',
      descriptionZh: '用场景、性格和记忆种子快速开始。',
    },
    {
      href: '/ai-character-collections',
      labelEn: 'Browse character collections',
      labelZh: '浏览角色集合',
      descriptionEn: 'Find memory, anime, comfort, free chat, and creator paths.',
      descriptionZh: '找到记忆、动漫、治愈、免费聊天和创建路径。',
    },
    {
      href: '/free-ai-character-chat',
      labelEn: 'AI character chat free',
      labelZh: '免费 AI 角色聊天',
      descriptionEn: 'Try without login for first guest replies.',
      descriptionZh: '先体验动漫、治愈、室友和幻想场景。',
    },
    {
      href: '/anime-ai-roleplay-characters',
      labelEn: 'Anime school and fantasy',
      labelZh: '动漫校园和幻想故事',
      descriptionEn: 'Original adult campus mentors, mages, and adventure arcs.',
      descriptionZh: '原创成人校园导师、魔法师和冒险线。',
    },
    {
      href: '/comfort-ai-companion',
      labelEn: 'Comfort companion',
      labelZh: '治愈陪伴',
      descriptionEn: 'Low-pressure comfort chat that can continue tomorrow.',
      descriptionZh: '低压力治愈聊天，明天也能接上。',
    },
    {
      href: '/talkie-ai-alternative',
      labelEn: 'Talkie alternative with memory',
      labelZh: '带记忆的 Talkie 替代品',
      descriptionEn: 'Compare character chat through memory and private continuity.',
      descriptionZh: '用记忆和私有连续性来比较角色聊天应用。',
    },
  ];

  return (
    <section className="border-b border-white/6 bg-[#0f1012]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 md:px-6 md:py-5 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-56">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {isZh ? '快速入口' : 'Quick starts'}
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight text-white">
            {isZh ? '创建、聊天和角色集合' : 'Create, chat, and explore'}
          </h2>
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:-mx-6 md:px-6 lg:mx-0 lg:flex-1 lg:px-0">
          {scenes.map((scene) => (
            <TrackedRoleplayLink
              key={scene.href}
              href={scene.href}
              eventType="seo_scene_link_clicked"
              eventMetadata={{
                surface: 'home_scene_rail',
                label: isZh ? scene.labelZh : scene.labelEn,
              }}
              className="group flex min-w-[220px] flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] sm:min-w-[240px] lg:min-w-0 lg:flex-1"
            >
              <span className="flex items-center justify-between gap-3 text-sm font-semibold text-white">
                <span>{isZh ? scene.labelZh : scene.labelEn}</span>
                <ArrowRight className="size-4 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-zinc-200" />
              </span>
              <span className="mt-1 block text-xs leading-snug text-zinc-500">
                {isZh ? scene.descriptionZh : scene.descriptionEn}
              </span>
            </TrackedRoleplayLink>
          ))}
        </div>
      </div>
    </section>
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
  const locale = useLocale();
  const isZh = locale.startsWith('zh');
  const proofPoints = t.raw('proof_points') as string[];

  return (
    <section className="relative border-b border-white/5 bg-[linear-gradient(132deg,#111113_0%,#151016_48%,#0d1714_100%)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 pb-5 pt-6 md:px-6 md:pb-8 md:pt-8">
        <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {isZh ? '免费试聊 · 记住故事' : 'AI character chat free'}
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-none tracking-tight md:text-5xl lg:text-6xl">
              {t('seo_title')}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              {t('seo_subtitle')}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold text-zinc-200">
              {proofPoints.map((point) => (
                <span
                  key={point}
                  className="inline-flex items-center gap-2 before:size-1.5 before:rounded-full before:bg-fuchsia-300/80"
                >
                  {point}
                </span>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <TrackedRoleplayLink
                href="#for-you-characters"
                eventType="seo_scene_link_clicked"
                eventMetadata={{
                  surface: 'home_hero_primary_cta',
                  label: t('primary_cta'),
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-zinc-950 transition hover:bg-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <MessageCircle size={17} aria-hidden="true" />
                {t('primary_cta')}
              </TrackedRoleplayLink>
              <TrackedRoleplayLink
                href="/create/quick"
                eventType="seo_scene_link_clicked"
                eventMetadata={{
                  surface: 'home_hero_secondary_cta',
                  label: t('secondary_cta'),
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-bold text-zinc-100 transition hover:border-white/30 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Sparkles size={17} aria-hidden="true" />
                {t('secondary_cta')}
              </TrackedRoleplayLink>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-relaxed text-zinc-500">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 font-semibold text-emerald-100 underline decoration-emerald-200/25 underline-offset-4 transition hover:text-emerald-50 hover:decoration-emerald-100/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100/70"
              >
                <BadgeDollarSign size={15} aria-hidden="true" />
                {t('pricing_cta')}
              </Link>
              <span className="max-w-[24rem]">{t('pricing_note')}</span>
            </div>
          </div>
          <QuickCreatePreview isZh={isZh} />
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

function QuickCreatePreview({ isZh }: { isZh: boolean }) {
  const fields = isZh
    ? [
        ['场景', '雨夜书店重逢'],
        ['性格', '温柔、会反问、记细节'],
        ['记忆', '昵称、上次约定、喜欢的饮料'],
      ]
    : [
        ['Scene', 'Rainy bookstore reunion'],
        ['Personality', 'Warm, curious, detail-aware'],
        ['Memory', 'Nickname, last promise, favorite drink'],
      ];
  const userLine = isZh
    ? '还记得我们上次说好的那杯咖啡吗？'
    : 'Do you remember the coffee we promised last time?';
  const characterLine = isZh
    ? '记得。还是靠窗那张桌子，我会把你的拿铁也点好。'
    : 'I do. Same window table, and I already know your latte order.';

  return (
    <aside className="relative overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.045] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.28)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/80">
            {isZh ? '先试聊 · 再创建' : 'Free chat first'}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-white">
            {isZh
              ? '免登录先聊几轮，再创建你的角色'
              : 'Try free AI character chat without login, then create your character'}
          </h2>
        </div>
        <div className="flex shrink-0 -space-x-2" aria-hidden="true">
          {[
            '/roleplay/characters/rp-anime-001-elira.png',
            '/roleplay/characters/chloe-4.png',
          ].map((src) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-full border-2 border-[#181218] object-cover"
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {fields.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2.5"
          >
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
              {label}
            </span>
            <span className="truncate text-sm font-medium text-zinc-100">
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200/15 bg-emerald-200/[0.055] p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100/80">
          {isZh ? '记忆聊天' : 'Memory chat'}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <p className="ml-auto max-w-[86%] rounded-2xl rounded-br-sm bg-white px-3 py-2 text-sm font-medium leading-snug text-zinc-950">
            {userLine}
          </p>
          <p className="max-w-[88%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/[0.07] px-3 py-2 text-sm font-medium leading-snug text-zinc-100">
            {characterLine}
          </p>
        </div>
      </div>

      <TrackedRoleplayLink
        href="/free-ai-character-chat"
        eventType="seo_scene_link_clicked"
        eventMetadata={{
          surface: 'home_quick_create_preview',
          label: isZh ? '开始免费角色聊天' : 'AI character chat free',
        }}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-100 px-4 text-sm font-bold text-emerald-950 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100/70"
      >
        <MessageCircle size={16} aria-hidden="true" />
        {isZh ? '开始免费角色聊天' : 'Start AI character chat free'}
      </TrackedRoleplayLink>
    </aside>
  );
}

function HomeSeoSignals() {
  const t = useTranslations('roleplay.home');
  const seoIntroPoints = t.raw('seo_intro_points') as string[];
  const seoLinks = t.raw('seo_links') as Array<{ label: string; href: string }>;

  return (
    <section className="border-b border-white/6 bg-[#0f1012]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Keepsay overview
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t('seo_intro_title')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
              {t('seo_intro_body')}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {seoIntroPoints.map((point) => (
                <div
                  key={point}
                  className="border-b border-white/10 pb-2 text-sm leading-6 text-zinc-300"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {t('seo_related_label')}
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-white">
              {t('seo_related_title')}
            </h3>
            <div className="mt-3 flex flex-col">
              {seoLinks.map((link, idx) => (
                <TrackedRoleplayLink
                  key={link.href}
                  href={link.href}
                  eventType="seo_scene_link_clicked"
                  eventMetadata={{
                    surface: 'home_related_links',
                    label: link.label,
                  }}
                  className={`flex items-center justify-between gap-3 border-white/10 py-3 text-sm text-zinc-200 transition hover:text-white ${
                    idx === 0 ? 'border-t' : ''
                  } border-b`}
                >
                  <span>{link.label}</span>
                  <ArrowRight className="size-4 shrink-0 text-zinc-500" />
                </TrackedRoleplayLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeFaqSection() {
  const t = useTranslations('roleplay.home');
  const faqs = t.raw('seo_faqs') as Array<{
    question: string;
    answer: string;
  }>;

  return (
    <section className="border-b border-white/6 bg-[#101114]">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {t('seo_faq_label')}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {t('seo_faq_title')}
            </h2>
          </div>

          <Accordion
            type="single"
            collapsible
            className="border-t border-white/10"
          >
            {faqs.map((faq, index) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${index}`}
                className="border-white/10"
              >
                <AccordionTrigger className="py-4 text-left text-base font-semibold text-white hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-4 pr-8 text-sm leading-7 text-zinc-400">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function RoleplayHomeFooter() {
  const t = useTranslations('roleplay.footer');
  const locale = useLocale();
  const isZh = locale.startsWith('zh');
  const { configs } = useAppContext();
  const supportMailto = getSupportMailto(configs);
  const discoveryItems = isZh
    ? [
        ['AI 角色集合', '/ai-character-collections'],
        ['带记忆 AI 聊天', '/ai-character-chat-with-memory'],
        ['免费 AI 角色聊天', '/free-ai-character-chat'],
        ['动漫 AI 角色扮演', '/anime-ai-roleplay-characters'],
        ['创建带记忆角色', '/create-ai-character-with-memory'],
        ['Character.AI 替代品', '/character-ai-alternative-with-memory'],
        ['Talkie 替代品', '/talkie-ai-alternative'],
      ]
    : [
        ['AI Character Collections', '/ai-character-collections'],
        ['AI Character Chat With Memory', '/ai-character-chat-with-memory'],
        ['Free AI Character Chat', '/free-ai-character-chat'],
        ['AI Anime Chat', '/anime-ai-roleplay-characters'],
        ['Create AI Character With Memory', '/create-ai-character-with-memory'],
        ['Character AI Alternative', '/character-ai-alternative-with-memory'],
        ['Talkie AI Alternative', '/talkie-ai-alternative'],
      ];
  const exploreItems = [
    [t('items.activities'), '/activity'],
    ...(canShowPublicGallery(configs)
      ? ([[t('items.more_characters'), '/']] as string[][])
      : []),
    [t('items.blog'), '/blog'],
    [t('items.updates'), '/updates'],
  ];
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
      items: [...discoveryItems, ...exploreItems],
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
