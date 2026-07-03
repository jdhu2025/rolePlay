import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ROLEPLAY_CHARACTER_SEO_SCENES,
  ROLEPLAY_SEO_SCENES,
} from '@/data/roleplay-seo-scenes';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix, locales } from '@/config/locale';
import { RoleplayCharacterDetail } from '@/shared/components/roleplay/roleplay-character-detail';
import { JsonLd } from '@/shared/components/seo/json-ld';
import {
  canShowHighRiskSeoPages,
  isHighRiskSeoPath,
} from '@/shared/lib/compliance';
import {
  buildRoleplayCharacterSeoProfile,
  type RoleplayCharacterSeoLink,
  type RoleplayCharacterSeoProfile,
} from '@/shared/lib/roleplay-character-seo-profile';
import {
  readCharacterSettings,
  type RoleplayCharacterClient,
} from '@/shared/lib/roleplay-client';
import { buildCharacterSeoCopy } from '@/shared/lib/roleplay-seo-copy';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';
import { getPublicRoleplayCharacterForPage } from '@/shared/lib/server/roleplay-character-page-data';

export const revalidate = 3600;

function compactText(value: unknown, fallback = '') {
  return String(value || fallback)
    .replace(/\s+/g, ' ')
    .trim();
}

function absoluteImageUrl(value: string) {
  if (!value) return `${envConfigs.app_url}${envConfigs.app_preview_image}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${envConfigs.app_url}${value.startsWith('/') ? '' : '/'}${value}`;
}

function buildCharacterJsonLd({
  canonical,
  character,
  seoProfile,
}: {
  canonical: string;
  character: RoleplayCharacterClient;
  seoProfile: RoleplayCharacterSeoProfile;
}) {
  const image = absoluteImageUrl(character.cover || character.avatar);
  const description = compactText(
    character.intro || character.tagline || character.opening,
    `${character.name} AI roleplay character`
  );

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: `${character.name} AI Character Chat`,
      description,
      url: canonical,
      image,
      mainEntity: {
        '@type': 'Person',
        name: character.name,
        image,
        description,
        additionalType: 'AI roleplay character',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: envConfigs.app_url,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Characters',
          item: `${envConfigs.app_url}/`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: character.name,
          item: canonical,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seoProfile.faqs.map((faq) => ({
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

function getCharacterSeoSceneLinks(
  id: string,
  locale: string
): RoleplayCharacterSeoLink[] {
  return (ROLEPLAY_CHARACTER_SEO_SCENES[id] ?? [])
    .map((slug) => {
      const scene = ROLEPLAY_SEO_SCENES[slug];
      if (!scene) return null;
      const href = `/${scene.landingSlug}`;
      if (!canShowHighRiskSeoPages() && isHighRiskSeoPath(href)) return null;
      return {
        slug,
        href,
        label: locale.startsWith('zh') ? scene.labelZh : scene.labelEn,
      };
    })
    .filter(Boolean) as RoleplayCharacterSeoLink[];
}

function buildSeoProfileForCharacter(
  character: RoleplayCharacterClient,
  locale: string,
  sceneLinks: RoleplayCharacterSeoLink[]
) {
  const settings = readCharacterSettings(character);
  return buildRoleplayCharacterSeoProfile({
    character,
    occupation: settings.occupation || character.style,
    location: settings.location || character.scene,
    sceneLinks,
    isZh: locale.startsWith('zh'),
  });
}

function buildMetadataForMissingCharacter(canonical: string): Metadata {
  return {
    title: 'Character not found | RolePlay',
    alternates: { canonical },
    robots: { index: false, follow: false },
  };
}

function buildPageCanonical(id: string, locale: string) {
  return buildLocalizedUrl(`/character/${id}`, locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
}

function buildLanguages(id: string) {
  return Object.fromEntries(
    locales.map((loc) => [
      loc,
      buildLocalizedUrl(`/character/${id}`, loc, {
        appUrl: envConfigs.app_url,
        defaultLocale,
        localePrefix,
      }),
    ])
  );
}

function getCharacterSeoRole(character: RoleplayCharacterClient) {
  const settings = readCharacterSettings(character);
  return {
    role: compactText(settings.occupation || character.style),
    location: compactText(settings.location || character.scene),
  };
}

function getCharacterSeoImage(character: RoleplayCharacterClient) {
  return absoluteImageUrl(character.cover || character.avatar);
}

function buildProfilePageMetadata({
  id,
  locale,
  character,
}: {
  id: string;
  locale: string;
  character: RoleplayCharacterClient;
}): Metadata {
  const canonical = buildPageCanonical(id, locale);
  const { role, location } = getCharacterSeoRole(character);
  const seoCopy = buildCharacterSeoCopy({
    name: character.name,
    intro: character.intro,
    tagline: character.tagline,
    opening: character.opening,
    role,
    location,
  });
  const { title, description } = seoCopy;
  const image = getCharacterSeoImage(character);

  return {
    title,
    description,
    keywords: seoCopy.keywords.join(', '),
    alternates: {
      canonical,
      languages: buildLanguages(id),
    },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      siteName: envConfigs.app_name,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const canonical = buildPageCanonical(id, locale);
  const character = await getPublicRoleplayCharacterForPage(id);
  if (!character) {
    return buildMetadataForMissingCharacter(canonical);
  }

  return buildProfilePageMetadata({ id, locale, character });
}

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const canonical = buildPageCanonical(id, locale);
  const character = await getPublicRoleplayCharacterForPage(id);

  if (!character) {
    notFound();
  }

  const sceneLinks = getCharacterSeoSceneLinks(id, locale);
  const seoProfile = buildSeoProfileForCharacter(character, locale, sceneLinks);

  return (
    <>
      <JsonLd
        data={buildCharacterJsonLd({
          canonical,
          character,
          seoProfile,
        })}
      />
      <RoleplayCharacterDetail
        characterId={id}
        initialCharacter={character}
        initialSeoProfile={seoProfile}
      />
    </>
  );
}
