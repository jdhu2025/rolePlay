import { ROLEPLAY_ANIME_CHARACTERS } from '@/data/roleplay-anime-characters';
import { ROLEPLAY_OFFICIAL_CHARACTERS } from '@/data/roleplay-characters';
import { getRoleplayCharacterSeoScenes } from '@/data/roleplay-seo-scenes';

import type { RoleplayCharacterClient } from '@/shared/lib/roleplay-client';

function toSiteImageUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `/roleplay/characters/${trimmed}`;
}

export function getLocalRoleplayCharacterCards(): RoleplayCharacterClient[] {
  return [
    ...ROLEPLAY_OFFICIAL_CHARACTERS.map((character) => {
      const gallery = character.images.map(toSiteImageUrl).filter(Boolean);
      return {
        id: character.id,
        name: character.name,
        age: character.age,
        author: 'Roleplay System',
        tagline: character.intro,
        intro: character.bio,
        opening: character.openingLine,
        avatar: toSiteImageUrl(character.avatar),
        cover: gallery[0] ?? toSiteImageUrl(character.avatar),
        gallery,
        tags: character.tags,
        tagSlugs: character.tagSlugs,
        seoScenes: getRoleplayCharacterSeoScenes(character.id),
        stats: '0',
        follows: 'Public',
        style: character.occupation,
        relationship: 'new companion with room for slow-burn closeness',
        scene: character.location,
        personality: character.personality,
        voice: '',
        gender: character.gender,
        settings: JSON.stringify({
          occupation: character.occupation,
          location: character.location,
          sortOrder: character.sortOrder,
        }),
        visualIdentity: {},
        model: '',
        premium: false,
        live: false,
        source: 'local',
        visibility: character.visibility,
      } satisfies RoleplayCharacterClient;
    }),
    ...ROLEPLAY_ANIME_CHARACTERS.map((character) => {
      const gallery = character.images.map(toSiteImageUrl).filter(Boolean);
      return {
        id: character.id,
        name: character.name,
        age: character.age,
        author: 'Roleplay System',
        tagline: character.tagline,
        intro: character.intro,
        opening: character.opening,
        avatar: toSiteImageUrl(character.avatar),
        cover: gallery[0] ?? toSiteImageUrl(character.avatar),
        gallery,
        tags: character.tags,
        tagSlugs: character.tagSlugs,
        seoScenes: getRoleplayCharacterSeoScenes(character.id),
        stats: '0',
        follows: 'Public',
        style: character.style,
        relationship: character.relationship,
        scene: character.scene,
        personality: character.personality,
        voice: '',
        voicePreset: character.voicePreset,
        gender: character.gender,
        settings: JSON.stringify({
          occupation: character.occupation,
          location: character.location,
          sortOrder: character.sortOrder,
        }),
        personalityCard: character.personalityCard,
        formatStyle: character.formatStyle,
        styleExamples: character.styleExamples,
        visualIdentity: character.visualIdentity,
        imageStyleSuffix: character.imageStyleSuffix,
        model: '',
        premium: false,
        live: false,
        source: 'local',
        visibility: 'public',
      } satisfies RoleplayCharacterClient;
    }),
  ];
}

export function getLocalRoleplayCharacterCardsByIds(ids: string[]) {
  const idSet = new Set(ids);
  return getLocalRoleplayCharacterCards().filter((character) =>
    idSet.has(character.id)
  );
}
