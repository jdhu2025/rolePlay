import type { MetadataRoute } from 'next';
import { ROLEPLAY_ANIME_CHARACTERS } from '@/data/roleplay-anime-characters';
import { ROLEPLAY_OFFICIAL_CHARACTERS } from '@/data/roleplay-characters';

import { envConfigs } from '@/config';
import { defaultLocale, localePrefix, locales } from '@/config/locale';
import {
  normalizeSitemapEntries,
  type SitemapInput,
} from '@/shared/lib/seo-url';
import {
  getRoleplayCharacters,
  RoleplayStatus,
  RoleplayVisibility,
} from '@/shared/models/roleplay';

export const revalidate = 3600;

const STATIC_PUBLIC_PATHS: SitemapInput[] = [
  {
    path: '/',
    locales,
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    path: '/blog',
    locales,
    changeFrequency: 'weekly',
    priority: 0.6,
  },
  {
    path: '/pricing',
    locales,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/privacy-policy',
    locales,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/terms-of-service',
    locales,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/acceptable-use-policy',
    locales,
    changeFrequency: 'monthly',
    priority: 0.5,
  },
  {
    path: '/showcases',
    locales,
    changeFrequency: 'monthly',
    priority: 0.4,
  },
  {
    path: '/ai-companion-that-remembers-you',
    locales,
    changeFrequency: 'weekly',
    priority: 0.9,
  },
  {
    path: '/ai-roleplay-secret-memory',
    locales,
    changeFrequency: 'weekly',
    priority: 0.85,
  },
  {
    path: '/ai-roleplay-shared-memory',
    locales,
    changeFrequency: 'weekly',
    priority: 0.85,
  },
  {
    path: '/create-ai-character-with-memory',
    locales,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
  {
    path: '/character-ai-alternative-with-memory',
    locales,
    changeFrequency: 'weekly',
    priority: 0.8,
  },
];

function localCharacterIds() {
  return [
    ...ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => character.id),
    ...ROLEPLAY_ANIME_CHARACTERS.map((character) => character.id),
  ];
}

async function getPublicCharacterEntries(): Promise<SitemapInput[]> {
  const ids = new Set(localCharacterIds());
  const lastModifiedById = new Map<string, Date>();

  try {
    const dbCharacters = await getRoleplayCharacters({
      includePublic: true,
      ownerStatuses: [RoleplayStatus.PUBLISHED],
      limit: 500,
    });

    for (const character of dbCharacters) {
      if (
        character.status === RoleplayStatus.PUBLISHED &&
        character.visibility === RoleplayVisibility.PUBLIC
      ) {
        ids.add(character.id);
        if (character.updatedAt) {
          lastModifiedById.set(character.id, new Date(character.updatedAt));
        }
      }
    }
  } catch (error) {
    console.log('load roleplay sitemap characters failed:', error);
  }

  return Array.from(ids)
    .sort((a, b) => a.localeCompare(b))
    .map((id) => ({
      path: `/character/${id}`,
      locales,
      lastModified: lastModifiedById.get(id),
      changeFrequency: 'weekly',
      priority: id.startsWith('rp-anime-') ? 0.75 : 0.8,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = [
    ...STATIC_PUBLIC_PATHS,
    ...(await getPublicCharacterEntries()),
  ];

  return normalizeSitemapEntries(entries, {
    appUrl: envConfigs.app_url,
    defaultLocale,
    localePrefix,
  });
}
