import { ArrowRight, Compass, Layers3, Sparkles } from 'lucide-react';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix } from '@/config/locale';
import { RoleplayCharacterCard } from '@/shared/components/roleplay/roleplay-character-card';
import { TrackedRoleplayLink } from '@/shared/components/roleplay/tracked-roleplay-link';
import { JsonLd } from '@/shared/components/seo/json-ld';
import {
  canShowHighRiskSeoPages,
  isHighRiskSeoPath,
} from '@/shared/lib/compliance';
import type { RoleplayCharacterClient } from '@/shared/lib/roleplay-client';
import { getLocalRoleplayCharacterCardsByIds } from '@/shared/lib/roleplay-local-character-cards';
import { getMetadata } from '@/shared/lib/seo';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';

export const revalidate = 3600;

const CANONICAL_PATH = '/ai-character-collections';

export const generateMetadata = getMetadata({
  title: 'AI Character Collections | Keepsay RolePlay',
  description:
    'Browse Keepsay AI character collections for memory chat, anime roleplay, comfort companions, free chat, and private character creation.',
  keywords:
    'AI character collections, AI character categories, AI character chat, anime AI roleplay, AI companion with memory',
  localized: {
    zh: {
      title: 'AI 角色集合 | Keepsay RolePlay',
      description:
        '浏览 Keepsay AI 角色集合：带记忆聊天、动漫角色扮演、治愈陪伴、免费聊天和私有角色创建。',
      keywords:
        'AI 角色集合, AI 角色分类, AI 角色聊天, 动漫 AI 角色扮演, 带记忆 AI 陪伴',
    },
  },
  canonicalUrl: CANONICAL_PATH,
});

type LocaleKey = 'en' | 'zh';

type CollectionSeed = {
  id: string;
  href: string;
  characterIds: string[];
  en: CollectionCopy;
  zh: CollectionCopy;
};

type CollectionCopy = {
  eyebrow: string;
  title: string;
  description: string;
  intent: string;
  cta: string;
};

type VisibleCollection = CollectionSeed &
  CollectionCopy & {
    characters: RoleplayCharacterClient[];
  };

const COLLECTIONS: CollectionSeed[] = [
  {
    id: 'memory',
    href: '/ai-character-chat-with-memory',
    characterIds: [
      'rp-012',
      'rp-anime-001',
      'rp-anime-002',
      'rp-anime-003',
      'rp-anime-015',
    ],
    en: {
      eyebrow: 'Memory',
      title: 'AI characters who remember your story',
      description:
        'Start here when the main job is continuity: a favorite drink, a nickname, a quiet promise, or the last scene that should still matter tomorrow.',
      intent: 'Best for memory companion and returning-story searches.',
      cta: 'Open memory collection',
    },
    zh: {
      eyebrow: '记忆',
      title: '会记住你故事的 AI 角色',
      description:
        '如果重点是连续性，从这里开始：喜欢的饮料、昵称、一个小承诺，或明天还应该接得上的上一幕。',
      intent: '适合记忆陪伴和连续故事搜索意图。',
      cta: '打开记忆集合',
    },
  },
  {
    id: 'anime',
    href: '/anime-ai-roleplay-characters',
    characterIds: [
      'rp-anime-001',
      'rp-anime-002',
      'rp-anime-004',
      'rp-anime-008',
      'rp-anime-009',
      'rp-anime-018',
    ],
    en: {
      eyebrow: 'Anime',
      title: 'Original anime roleplay characters',
      description:
        'Browse original mages, campus mentors, detectives, hackers, and fantasy companions without leaning on copied franchise names or unsafe IP shortcuts.',
      intent: 'Best for anime AI chat, school-style stories, and fantasy arcs.',
      cta: 'Open anime collection',
    },
    zh: {
      eyebrow: '动漫',
      title: '原创动漫角色扮演角色',
      description:
        '浏览原创魔法师、校园前辈、侦探、黑客和幻想伙伴，不依赖搬运 IP 或不安全的角色捷径。',
      intent: '适合动漫 AI 聊天、校园风故事和幻想冒险。',
      cta: '打开动漫集合',
    },
  },
  {
    id: 'comfort',
    href: '/comfort-ai-companion',
    characterIds: [
      'rp-002',
      'rp-003',
      'rp-005',
      'rp-006',
      'rp-anime-001',
      'rp-anime-019',
    ],
    en: {
      eyebrow: 'Comfort',
      title: 'Low-pressure comfort companions',
      description:
        'Choose softer characters for late-night check-ins, cozy daily routines, roommate-style scenes, and a gentle return path instead of noisy engagement.',
      intent: 'Best for comfort companion, cozy chat, and quiet return visits.',
      cta: 'Open comfort collection',
    },
    zh: {
      eyebrow: '治愈',
      title: '低压力的治愈陪伴角色',
      description:
        '选择更柔和的角色，用在深夜 check-in、温暖日常、室友式场景和安静回访，而不是制造噪音式互动。',
      intent: '适合治愈陪伴、温暖聊天和安静回访。',
      cta: '打开治愈集合',
    },
  },
  {
    id: 'free-chat',
    href: '/free-ai-character-chat',
    characterIds: [
      'rp-001',
      'rp-004',
      'rp-010',
      'rp-anime-002',
      'rp-anime-008',
      'rp-anime-016',
    ],
    en: {
      eyebrow: 'Free chat',
      title: 'Free AI character chat starters',
      description:
        'Use this collection when the user wants to sample different personalities first: everyday friends, fantasy scenes, slow trust, and quick first messages.',
      intent: 'Best for broad free AI character chat discovery.',
      cta: 'Open free chat collection',
    },
    zh: {
      eyebrow: '免费聊天',
      title: '免费 AI 角色聊天起点',
      description:
        '如果用户想先尝试不同性格，从这里开始：日常朋友、幻想场景、慢慢建立信任，以及快速第一句对话。',
      intent: '适合宽泛的免费 AI 角色聊天发现意图。',
      cta: '打开免费聊天集合',
    },
  },
  {
    id: 'private-creator',
    href: '/custom-ai-character-creator',
    characterIds: [
      'rp-006',
      'rp-008',
      'rp-012',
      'rp-anime-005',
      'rp-anime-018',
      'rp-anime-019',
    ],
    en: {
      eyebrow: 'Creator',
      title: 'Private character templates',
      description:
        'Start from characters that demonstrate useful creation patterns: a scene, relationship boundary, memory hook, opening line, and private-first setup.',
      intent: 'Best for create AI character with memory and private templates.',
      cta: 'Open creator collection',
    },
    zh: {
      eyebrow: '创建',
      title: '私有角色模板',
      description:
        '从能展示创建模式的角色开始：场景、关系边界、记忆钩子、开场白，以及默认私有的设置。',
      intent: '适合带记忆角色创建和私有模板意图。',
      cta: '打开创建集合',
    },
  },
  {
    id: 'alternative',
    href: '/talkie-ai-alternative',
    characterIds: [
      'rp-004',
      'rp-012',
      'rp-anime-004',
      'rp-anime-005',
      'rp-anime-018',
      'rp-anime-020',
    ],
    en: {
      eyebrow: 'Alternatives',
      title: 'Character chat alternatives with memory',
      description:
        'Compare Keepsay through the concrete things users notice after switching: cleaner cards, memory-led scenes, private continuity, and original characters.',
      intent: 'Best for Talkie or Character.AI alternative comparison paths.',
      cta: 'Open alternative guide',
    },
    zh: {
      eyebrow: '替代品',
      title: '带记忆的角色聊天替代选择',
      description:
        '从用户切换后真正会感受到的点来比较 Keepsay：更清晰的卡片、记忆场景、私有连续性和原创角色。',
      intent: '适合 Talkie 或 Character.AI 替代品比较路径。',
      cta: '打开替代品指南',
    },
  },
];

const PAGE_COPY: Record<
  LocaleKey,
  {
    eyebrow: string;
    title: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    mapTitle: string;
    mapHeading: string;
    mapDescription: string;
    characterLabel: string;
    faqTitle: string;
    faqs: Array<{ question: string; answer: string }>;
  }
> = {
  en: {
    eyebrow: 'AI Character Collections',
    title: 'Browse AI characters by the story you want to continue.',
    description:
      'Use this index as the clean collection layer for Keepsay: memory chat, anime roleplay, comfort companions, free chat, private creation, and comparison paths all point to real character cards.',
    primaryCta: 'Start from characters',
    secondaryCta: 'Create a private character',
    mapTitle: 'Collection map',
    mapHeading: 'Choose the right starting path.',
    mapDescription:
      'Each collection links a search intent to specific characters, the best-fit guide page, and a next action. That gives crawlers and users a clearer path than a single undifferentiated gallery.',
    characterLabel: 'Featured characters',
    faqTitle: 'How to use the collection map',
    faqs: [
      {
        question: 'How is this different from the homepage?',
        answer:
          'The homepage is a browse-first picker. This page is an indexable category map that explains why each character group exists and links those groups to the most relevant SEO guide.',
      },
      {
        question: 'Which collection should I start with?',
        answer:
          'Choose memory if continuity matters, anime for story-world energy, comfort for low-pressure return visits, free chat for sampling, and creator templates when you want a private character.',
      },
      {
        question: 'Are these collection pages only for SEO?',
        answer:
          'No. They are also a practical navigation layer: users can move from a search intent to real character cards, then into chat or Quick Create without hunting through the whole gallery.',
      },
    ],
  },
  zh: {
    eyebrow: 'AI 角色集合',
    title: '按你想继续的故事类型浏览 AI 角色。',
    description:
      '这是 Keepsay 的清晰集合层：带记忆聊天、动漫角色扮演、治愈陪伴、免费聊天、私有创建和竞品比较都会连到真实角色卡。',
    primaryCta: '从角色开始',
    secondaryCta: '创建私有角色',
    mapTitle: '集合地图',
    mapHeading: '选择最合适的开始路径。',
    mapDescription:
      '每个集合都会把一个搜索意图连接到具体角色、最适合的指南页和下一步动作。比单一图库更容易被用户和搜索引擎理解。',
    characterLabel: '精选角色',
    faqTitle: '如何使用集合地图',
    faqs: [
      {
        question: '它和首页有什么区别？',
        answer:
          '首页是浏览优先的角色选择器。这个页面是可索引的分类地图，会解释每组角色存在的原因，并连接到最相关的 SEO 指南页。',
      },
      {
        question: '应该先看哪个集合？',
        answer:
          '如果重视连续性，先看记忆集合；想要故事世界感，看动漫集合；想低压力回访，看治愈集合；想先试用，看免费聊天；想创建自己的角色，看私有模板。',
      },
      {
        question: '这些集合只是为了 SEO 吗？',
        answer:
          '不是。它也是实用导航层：用户可以从搜索意图进入真实角色卡，再进入聊天或快速创建，不必在整个图库里找。',
      },
    ],
  },
};

function localizedUrl(path: string, locale: string) {
  return buildLocalizedUrl(path, locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
}

function getVisibleCollections(locale: LocaleKey): VisibleCollection[] {
  return COLLECTIONS.filter(
    (collection) =>
      canShowHighRiskSeoPages() || !isHighRiskSeoPath(collection.href)
  ).map((collection) => ({
    ...collection,
    ...collection[locale],
    characters: getLocalRoleplayCharacterCardsByIds(collection.characterIds),
  }));
}

function buildJsonLd({
  locale,
  collections,
  faqs,
}: {
  locale: LocaleKey;
  collections: VisibleCollection[];
  faqs: Array<{ question: string; answer: string }>;
}) {
  const pageUrl = localizedUrl(CANONICAL_PATH, locale);
  const copy = PAGE_COPY[locale];

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: copy.title,
      description: copy.description,
      url: pageUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: envConfigs.app_name,
        url: envConfigs.app_url,
      },
      hasPart: collections.map((collection) => ({
        '@type': 'CollectionPage',
        name: collection.title,
        description: collection.description,
        url: localizedUrl(collection.href, locale),
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: locale === 'zh' ? '首页' : 'Home',
          item: localizedUrl('/', locale),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: copy.eyebrow,
          item: pageUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: copy.eyebrow,
      itemListElement: collections.map((collection, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: localizedUrl(collection.href, locale),
        name: collection.title,
        description: collection.intent,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    },
  ];
}

export default async function AiCharacterCollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const localeKey: LocaleKey = locale === 'zh' ? 'zh' : 'en';
  setRequestLocale(locale);

  const copy = PAGE_COPY[localeKey];
  const collections = getVisibleCollections(localeKey);
  const uniqueCharacterCount = new Set(
    collections.flatMap((collection) => collection.characterIds)
  ).size;

  return (
    <main className="min-h-dvh bg-[#0d0d10] text-white">
      <JsonLd
        data={buildJsonLd({
          locale: localeKey,
          collections,
          faqs: copy.faqs,
        })}
      />

      <section className="border-b border-white/6 bg-[linear-gradient(118deg,#101012_0%,#111819_58%,#17110f_100%)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.08fr_0.92fr] md:px-6 md:py-14">
          <div className="flex flex-col justify-center">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold tracking-[0.16em] text-zinc-300 uppercase">
              <Compass className="size-3.5" aria-hidden="true" />
              {copy.eyebrow}
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl leading-[1.04] font-semibold tracking-tight md:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
              {copy.description}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <TrackedRoleplayLink
                href="/"
                eventType="seo_landing_cta_clicked"
                eventMetadata={{
                  surface: 'collections_hero_primary',
                  landing: CANONICAL_PATH,
                  label: copy.primaryCta,
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5"
              >
                {copy.primaryCta}
                <ArrowRight className="size-4" aria-hidden="true" />
              </TrackedRoleplayLink>
              <TrackedRoleplayLink
                href="/create/quick"
                eventType="seo_landing_cta_clicked"
                eventMetadata={{
                  surface: 'collections_hero_secondary',
                  landing: CANONICAL_PATH,
                  label: copy.secondaryCta,
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/12 px-5 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.07]"
              >
                <Sparkles className="size-4" aria-hidden="true" />
                {copy.secondaryCta}
              </TrackedRoleplayLink>
            </div>
          </div>

          <div className="grid content-end gap-3 sm:grid-cols-3 md:grid-cols-1">
            {[
              `${collections.length} ${localeKey === 'zh' ? '个集合' : 'collections'}`,
              `${uniqueCharacterCount} ${
                localeKey === 'zh' ? '个本地种子角色' : 'local seed characters'
              }`,
              localeKey === 'zh'
                ? '记忆、动漫、治愈、创建和替代品路径'
                : 'Memory, anime, comfort, creator, and alternative paths',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4"
              >
                <Layers3 className="size-5 text-zinc-300" aria-hidden="true" />
                <p className="mt-3 text-sm leading-6 font-semibold text-zinc-100">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
            {copy.mapTitle}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            {copy.mapHeading}
          </h2>
          <p className="mt-3 text-sm leading-7 text-zinc-400 md:text-base">
            {copy.mapDescription}
          </p>
        </div>

        <div className="mt-8 grid gap-12">
          {collections.map((collection, collectionIndex) => (
            <section
              key={collection.id}
              className="border-t border-white/10 pt-8"
            >
              <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    {collection.eyebrow}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    {collection.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-zinc-400">
                    {collection.description}
                  </p>
                  <p className="mt-3 text-sm leading-6 font-medium text-zinc-300">
                    {collection.intent}
                  </p>
                  <TrackedRoleplayLink
                    href={collection.href}
                    eventType="seo_scene_link_clicked"
                    eventMetadata={{
                      surface: 'collections_map',
                      landing: CANONICAL_PATH,
                      collection: collection.id,
                      label: collection.cta,
                    }}
                    className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.08]"
                  >
                    {collection.cta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </TrackedRoleplayLink>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-zinc-500 uppercase">
                    {copy.characterLabel}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {collection.characters
                      .slice(0, 3)
                      .map((character, index) => (
                        <RoleplayCharacterCard
                          key={character.id}
                          character={character}
                          priority={collectionIndex === 0 && index === 0}
                          imageAspectClassName="aspect-[4/5]"
                          contentClassName="px-3 pb-3 pt-2"
                          introClassName="text-xs"
                        />
                      ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-white/6 bg-[#111216]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[0.75fr_1.25fr] md:px-6 md:py-16">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-zinc-500 uppercase">
              FAQ
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              {copy.faqTitle}
            </h2>
          </div>
          <div className="grid gap-3">
            {copy.faqs.map((faq) => (
              <section
                key={faq.question}
                className="rounded-[18px] border border-white/10 bg-white/[0.035] p-4"
              >
                <h3 className="text-base font-semibold text-white">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {faq.answer}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
