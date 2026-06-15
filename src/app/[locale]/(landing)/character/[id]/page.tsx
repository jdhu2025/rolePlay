import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix, locales } from '@/config/locale';
import { RoleplayCharacterDetail } from '@/shared/components/roleplay/roleplay-character-detail';
import {
  ROLEPLAY_CHARACTER_SEO_SCENES,
  ROLEPLAY_SEO_SCENES,
} from '@/data/roleplay-seo-scenes';
import { JsonLd } from '@/shared/components/seo/json-ld';
import { buildCharacterImageUrl } from '@/shared/lib/roleplay-assets';
import {
  getLocalRoleplayCharacter,
  readCharacterSettings,
} from '@/shared/lib/roleplay-client';
import { buildCharacterSeoCopy } from '@/shared/lib/roleplay-seo-copy';
import { buildLocalizedUrl } from '@/shared/lib/seo-url';
import {
  findRoleplayCharacterById,
  RoleplayStatus,
  RoleplayVisibility,
} from '@/shared/models/roleplay';

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

async function getMetadataCharacter(id: string) {
  try {
    const character = await findRoleplayCharacterById(id);
    if (
      character &&
      character.status === RoleplayStatus.PUBLISHED &&
      character.visibility === RoleplayVisibility.PUBLIC
    ) {
      return {
        name: character.name,
        age: character.age,
        intro: character.intro,
        opening: character.opening,
        tagline: character.tagline,
        scene: character.scene,
        style: character.style,
        image: buildCharacterImageUrl(
          character.coverUrl || character.avatarUrl || ''
        ),
      };
    }
  } catch (error) {
    console.log('load roleplay character metadata failed:', error);
  }

  const localCharacter = getLocalRoleplayCharacter(id);
  if (!localCharacter) return null;

  const settings = readCharacterSettings(localCharacter);
  return {
    name: localCharacter.name,
    age: localCharacter.age,
    intro: localCharacter.intro,
    opening: localCharacter.opening,
    tagline: localCharacter.tagline,
    scene: settings.location || localCharacter.scene,
    style: settings.occupation || localCharacter.style,
    image: localCharacter.cover || localCharacter.avatar,
  };
}

function buildCharacterJsonLd({
  id,
  canonical,
  character,
}: {
  id: string;
  canonical: string;
  character: NonNullable<Awaited<ReturnType<typeof getMetadataCharacter>>>;
}) {
  const image = absoluteImageUrl(character.image);
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
      mainEntity: [
        {
          '@type': 'Question',
          name: `Can I chat with ${character.name}?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Yes. ${character.name} is available as an AI character chat and roleplay profile on ${envConfigs.app_name}.`,
          },
        },
        {
          '@type': 'Question',
          name: `What kind of roleplay is ${character.name} best for?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: compactText(
              [character.style, character.scene, character.tagline]
                .filter(Boolean)
                .join('. '),
              `${character.name} is designed for AI roleplay and character chat.`
            ),
          },
        },
      ],
    },
  ];
}

function getCharacterSeoSceneLabels(id: string, locale: string) {
  return (ROLEPLAY_CHARACTER_SEO_SCENES[id] ?? []).map((slug) =>
    locale.startsWith('zh')
      ? ROLEPLAY_SEO_SCENES[slug].labelZh
      : ROLEPLAY_SEO_SCENES[slug].labelEn
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const character = await getMetadataCharacter(id);
  const canonical = buildLocalizedUrl(`/character/${id}`, locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });

  if (!character) {
    return {
      title: 'Character not found | RolePlay',
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const location = compactText(character.scene);
  const role = compactText(character.style);
  const seoCopy = buildCharacterSeoCopy({
    name: character.name,
    intro: character.intro,
    tagline: character.tagline,
    opening: character.opening,
    role,
    location,
  });
  const { title, description } = seoCopy;
  const image = absoluteImageUrl(character.image);
  const languages = Object.fromEntries(
    locales.map((loc) => [
      loc,
      buildLocalizedUrl(`/character/${id}`, loc, {
        appUrl: envConfigs.app_url,
        defaultLocale,
        localePrefix,
      }),
    ])
  );

  return {
    title,
    description,
    keywords: seoCopy.keywords.join(', '),
    alternates: {
      canonical,
      languages,
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

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const canonical = buildLocalizedUrl(`/character/${id}`, locale, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
  const character = await getMetadataCharacter(id);

  return (
    <>
      {character ? (
        <JsonLd data={buildCharacterJsonLd({ id, canonical, character })} />
      ) : null}
      <RoleplayCharacterDetail characterId={id} />
    </>
  );
}
