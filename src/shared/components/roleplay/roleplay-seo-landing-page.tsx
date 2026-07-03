import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

import {
  ROLEPLAY_SEO_SCENES,
  type RoleplaySeoSceneSlug,
} from '@/data/roleplay-seo-scenes';
import { envConfigs } from '@/config';
import { RoleplayCharacterCard } from '@/shared/components/roleplay/roleplay-character-card';
import { TrackedRoleplayLink } from '@/shared/components/roleplay/tracked-roleplay-link';
import { JsonLd } from '@/shared/components/seo/json-ld';
import { getLocalRoleplayCharacterCardsByIds } from '@/shared/lib/roleplay-local-character-cards';
import type { RoleplayCharacterClient } from '@/shared/lib/roleplay-client';

type SeoLandingPageConfig = {
  locale?: string;
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  sceneSlugs: RoleplaySeoSceneSlug[];
  characterIds: string[];
  proofPoints: string[];
  sections: Array<{
    title: string;
    body: string;
  }>;
  inspirations?: Array<{
    title: string;
    body: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  related: Array<{
    label: string;
    href: string;
  }>;
  canonicalPath: string;
  ui?: {
    bestFor: string;
    charactersEyebrow: string;
    charactersTitle: string;
    faqTitle: string;
    relatedTitle: string;
    homeBreadcrumb: string;
  };
};

type Props = {
  config: SeoLandingPageConfig;
};

function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${envConfigs.app_url}${path.startsWith('/') ? '' : '/'}${path}`;
}

function buildLandingJsonLd({
  config,
  characters,
}: {
  config: SeoLandingPageConfig;
  characters: RoleplayCharacterClient[];
}) {
  const url = absoluteUrl(config.canonicalPath);
  const isZh = config.locale === 'zh';
  const homeBreadcrumb = config.ui?.homeBreadcrumb ?? (isZh ? '首页' : 'Home');

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: config.title,
      description: config.description,
      url,
      isPartOf: {
        '@type': 'WebSite',
        name: envConfigs.app_name,
        url: envConfigs.app_url,
      },
      about: config.sceneSlugs.map((slug) =>
        isZh ? ROLEPLAY_SEO_SCENES[slug].labelZh : ROLEPLAY_SEO_SCENES[slug].labelEn
      ),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: homeBreadcrumb,
          item: envConfigs.app_url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: config.eyebrow,
          item: url,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `${config.eyebrow} characters`,
      itemListElement: characters.map((character, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: absoluteUrl(`/character/${character.id}`),
        name: character.name,
        description: character.intro || character.tagline,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: config.faqs.map((faq) => ({
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

export function RoleplaySeoLandingPage({ config }: Props) {
  const characters = getLocalRoleplayCharacterCardsByIds(config.characterIds);
  const isZh = config.locale === 'zh';
  const ui = {
    bestFor: isZh ? '适合场景' : 'Best for',
    charactersEyebrow: isZh ? '角色' : 'Characters',
    charactersTitle: isZh
      ? '从已经适配场景的角色开始'
      : 'Start with a character that already fits the scene',
    faqTitle: isZh ? '开始前的快速回答' : 'Quick answers before you start',
    relatedTitle: isZh ? '继续探索场景地图' : 'Keep exploring the scene map',
    homeBreadcrumb: isZh ? '首页' : 'Home',
    ...config.ui,
  };

  return (
    <main className="min-h-dvh bg-[#0d0d10] text-white">
      <JsonLd data={buildLandingJsonLd({ config, characters })} />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-12 pt-10 md:grid-cols-[1.05fr_0.95fr] md:px-6 md:pb-16 md:pt-14">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {config.eyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-tight md:text-6xl">
            {config.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300 md:text-lg">
            {config.description}
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedRoleplayLink
              href={config.primaryCta.href}
              eventType="seo_landing_cta_clicked"
              eventMetadata={{
                surface: 'landing_hero_primary',
                landing: config.canonicalPath,
                label: config.primaryCta.label,
              }}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:-translate-y-0.5"
            >
              {config.primaryCta.label}
              <ArrowRight className="size-4" />
            </TrackedRoleplayLink>
            {config.secondaryCta ? (
              <TrackedRoleplayLink
                href={config.secondaryCta.href}
                eventType="seo_landing_cta_clicked"
                eventMetadata={{
                  surface: 'landing_hero_secondary',
                  landing: config.canonicalPath,
                  label: config.secondaryCta.label,
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/12 px-5 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.07]"
              >
                {config.secondaryCta.label}
              </TrackedRoleplayLink>
            ) : null}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {config.sceneSlugs.map((slug) => (
              <span
                key={slug}
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-zinc-300"
              >
                {isZh
                  ? ROLEPLAY_SEO_SCENES[slug].labelZh
                  : ROLEPLAY_SEO_SCENES[slug].labelEn}
              </span>
            ))}
          </div>
          <div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {ui.bestFor}
            </p>
            <p className="mt-2 text-sm leading-7 text-zinc-300">
              {config.sceneSlugs
                .map((slug) =>
                  isZh
                    ? ROLEPLAY_SEO_SCENES[slug].labelZh
                    : ROLEPLAY_SEO_SCENES[slug].labelEn
                )
                .join(' · ')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 self-end">
          {characters.slice(0, 4).map((character, index) => (
            <RoleplayCharacterCard
              key={character.id}
              character={character}
              priority={index === 0}
              imageAspectClassName="aspect-[4/5]"
              contentClassName="px-3 pb-3 pt-2"
              introClassName="text-xs"
            />
          ))}
        </div>
      </section>

      <section className="border-y border-white/6 bg-white/[0.025]">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 py-5 md:grid-cols-3 md:px-6">
          {config.proofPoints.map((item) => (
            <div key={item} className="flex items-start gap-2 text-sm text-zinc-300">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-16">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {ui.charactersEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              {ui.charactersTitle}
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {characters.map((character, index) => (
            <RoleplayCharacterCard
              key={character.id}
              character={character}
              priority={index < 2}
            />
          ))}
        </div>
      </section>

      {config.inspirations?.length ? (
        <section className="mx-auto max-w-6xl px-4 pb-12 md:px-6 md:pb-16">
          <div className="grid gap-3 md:grid-cols-4">
            {config.inspirations.map((item) => (
              <div
                key={item.title}
                className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4"
              >
                <Sparkles className="size-5 text-zinc-300" />
                <h3 className="mt-4 text-base font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-3 md:px-6 md:pb-16">
        {config.sections.map((section) => (
          <section key={section.title} className="border-t border-white/10 pt-5">
            <h2 className="text-xl font-semibold text-white">{section.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              {section.body}
            </p>
          </section>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 pb-14 md:grid-cols-[0.75fr_1.25fr] md:px-6 md:pb-20">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            FAQ
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {ui.faqTitle}
          </h2>
        </div>
        <div className="grid gap-3">
          {config.faqs.map((faq) => (
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
      </section>

      <section className="border-t border-white/6 bg-[#111216]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <p className="text-sm font-semibold text-white">
              {ui.relatedTitle}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {config.related.map((item) => (
                <TrackedRoleplayLink
                  key={item.href}
                  href={item.href}
                  eventType="seo_scene_link_clicked"
                  eventMetadata={{
                    surface: 'landing_related',
                    landing: config.canonicalPath,
                    label: item.label,
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.07]"
                >
                  {item.label}
                </TrackedRoleplayLink>
              ))}
            </div>
          </div>
          <TrackedRoleplayLink
            href={config.primaryCta.href}
            eventType="seo_landing_cta_clicked"
            eventMetadata={{
              surface: 'landing_footer_primary',
              landing: config.canonicalPath,
              label: config.primaryCta.label,
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-zinc-950"
          >
            {config.primaryCta.label}
            <ArrowRight className="size-4" />
          </TrackedRoleplayLink>
        </div>
      </section>
    </main>
  );
}

export type { SeoLandingPageConfig };
