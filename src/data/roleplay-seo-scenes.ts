export type RoleplaySeoSceneSlug =
  | 'free_chat'
  | 'memory_companion'
  | 'anime_roleplay'
  | 'crush_chat'
  | 'comfort_companion'
  | 'private_character_template'
  | 'custom_character'
  | 'slow_burn_romance'
  | 'cozy_roleplay'
  | 'fantasy_roleplay';

export type QuickCreateIntentCategory =
  | 'anime_roleplay'
  | 'crush_chat'
  | 'comfort_companion'
  | 'private_character';

export type QuickCreateInspirationType =
  | 'cozy_companion'
  | 'anime_mage'
  | 'crush_chat_template'
  | 'private_memory_companion';

export type QuickCreateStarterMemoryMode = 'light' | 'relationship' | 'story';

export type QuickCreateGrowthMetadata = {
  intentCategory: QuickCreateIntentCategory;
  inspirationType: QuickCreateInspirationType;
  inspirationTitleEn: string;
  inspirationTitleZh: string;
  inspirationSummaryEn: string;
  inspirationSummaryZh: string;
  defaultVisibility: 'private' | 'public';
  starterMemoryMode: QuickCreateStarterMemoryMode;
  recommendedLandingSlug: string;
};

export const ROLEPLAY_SEO_SCENES: Record<
  RoleplaySeoSceneSlug,
  {
    labelEn: string;
    labelZh: string;
    landingSlug: string;
  }
> = {
  free_chat: {
    labelEn: 'Free chat',
    labelZh: '免费聊天',
    landingSlug: 'free-ai-character-chat',
  },
  memory_companion: {
    labelEn: 'Memory companion',
    labelZh: '记忆陪伴',
    landingSlug: 'ai-character-chat-with-memory',
  },
  anime_roleplay: {
    labelEn: 'Anime roleplay',
    labelZh: '动漫角色扮演',
    landingSlug: 'anime-ai-roleplay-characters',
  },
  crush_chat: {
    labelEn: 'Crush chat',
    labelZh: '心动聊天',
    landingSlug: 'crush-ai-chat',
  },
  comfort_companion: {
    labelEn: 'Comfort companion',
    labelZh: '治愈陪伴',
    landingSlug: 'comfort-ai-companion',
  },
  private_character_template: {
    labelEn: 'Private template',
    labelZh: '私有角色模板',
    landingSlug: 'custom-ai-character-creator',
  },
  custom_character: {
    labelEn: 'Custom character',
    labelZh: '自定义角色',
    landingSlug: 'custom-ai-character-creator',
  },
  slow_burn_romance: {
    labelEn: 'Slow-burn romance',
    labelZh: '慢热暧昧',
    landingSlug: 'crush-ai-chat',
  },
  cozy_roleplay: {
    labelEn: 'Cozy roleplay',
    labelZh: '温暖日常',
    landingSlug: 'comfort-ai-companion',
  },
  fantasy_roleplay: {
    labelEn: 'Fantasy roleplay',
    labelZh: '幻想角色扮演',
    landingSlug: 'anime-ai-roleplay-characters',
  },
};

export const ROLEPLAY_CHARACTER_SEO_SCENES: Record<
  string,
  RoleplaySeoSceneSlug[]
> = {
  'rp-001': ['crush_chat', 'cozy_roleplay', 'free_chat'],
  'rp-002': ['comfort_companion', 'custom_character', 'free_chat'],
  'rp-003': ['comfort_companion', 'cozy_roleplay', 'free_chat'],
  'rp-004': ['crush_chat', 'slow_burn_romance', 'free_chat'],
  'rp-005': ['comfort_companion', 'crush_chat', 'cozy_roleplay'],
  'rp-006': ['comfort_companion', 'private_character_template'],
  'rp-007': ['crush_chat', 'cozy_roleplay'],
  'rp-008': ['private_character_template', 'comfort_companion'],
  'rp-009': ['crush_chat', 'private_character_template'],
  'rp-010': ['crush_chat', 'free_chat'],
  'rp-011': ['crush_chat', 'comfort_companion'],
  'rp-012': ['private_character_template', 'crush_chat', 'memory_companion'],
  'rp-anime-001': [
    'anime_roleplay',
    'comfort_companion',
    'memory_companion',
    'fantasy_roleplay',
  ],
  'rp-anime-002': [
    'anime_roleplay',
    'comfort_companion',
    'memory_companion',
  ],
  'rp-anime-003': [
    'anime_roleplay',
    'comfort_companion',
    'memory_companion',
  ],
  'rp-anime-004': [
    'anime_roleplay',
    'crush_chat',
    'slow_burn_romance',
    'fantasy_roleplay',
  ],
  'rp-anime-005': [
    'anime_roleplay',
    'comfort_companion',
    'memory_companion',
    'private_character_template',
  ],
  'rp-anime-006': ['comfort_companion', 'anime_roleplay', 'fantasy_roleplay'],
  'rp-anime-007': ['anime_roleplay', 'crush_chat', 'slow_burn_romance'],
  'rp-anime-008': ['anime_roleplay', 'fantasy_roleplay'],
  'rp-anime-009': ['anime_roleplay', 'crush_chat', 'fantasy_roleplay'],
  'rp-anime-010': ['anime_roleplay', 'crush_chat', 'slow_burn_romance'],
  'rp-anime-011': ['anime_roleplay', 'crush_chat', 'slow_burn_romance'],
  'rp-anime-012': ['anime_roleplay', 'comfort_companion'],
  'rp-anime-013': ['anime_roleplay', 'comfort_companion'],
  'rp-anime-014': ['anime_roleplay', 'fantasy_roleplay'],
  'rp-anime-015': [
    'anime_roleplay',
    'comfort_companion',
    'memory_companion',
  ],
  'rp-anime-016': ['anime_roleplay', 'comfort_companion', 'fantasy_roleplay'],
  'rp-anime-017': ['anime_roleplay', 'comfort_companion', 'fantasy_roleplay'],
  'rp-anime-018': [
    'anime_roleplay',
    'crush_chat',
    'private_character_template',
  ],
  'rp-anime-019': [
    'anime_roleplay',
    'comfort_companion',
    'private_character_template',
  ],
  'rp-anime-020': ['anime_roleplay', 'comfort_companion', 'crush_chat'],
};

export const QUICK_CREATE_INTENT_GROUPS: Array<{
  id: QuickCreateIntentCategory;
  labelEn: string;
  labelZh: string;
  descriptionEn: string;
  descriptionZh: string;
}> = [
  {
    id: 'anime_roleplay',
    labelEn: 'Anime Roleplay',
    labelZh: '动漫角色扮演',
    descriptionEn: 'Original anime companions for fantasy, campus, and cozy scenes.',
    descriptionZh: '为幻想、校园、治愈场景创建原创动漫角色。',
  },
  {
    id: 'crush_chat',
    labelEn: 'Crush Chat',
    labelZh: '心动聊天',
    descriptionEn: 'Slow-burn tension, almost confessions, and private rituals.',
    descriptionZh: '慢热暧昧、差点说出口的话和只属于你们的小仪式。',
  },
  {
    id: 'comfort_companion',
    labelEn: 'Comfort Companion',
    labelZh: '治愈陪伴',
    descriptionEn: 'Low-pressure companions for late-night comfort and memory.',
    descriptionZh: '低压力陪伴，适合深夜、情绪安放和记忆延续。',
  },
  {
    id: 'private_character',
    labelEn: 'Private Character',
    labelZh: '私有角色',
    descriptionEn: 'Start from a template, then keep the character private.',
    descriptionZh: '从模板开始，创建只属于你的私有角色。',
  },
];

export const QUICK_CREATE_INSPIRATIONS: Record<
  QuickCreateInspirationType,
  {
    titleEn: string;
    titleZh: string;
    summaryEn: string;
    summaryZh: string;
  }
> = {
  cozy_companion: {
    titleEn: 'Start from a cozy companion',
    titleZh: '从温暖陪伴开始',
    summaryEn: 'A soft everyday companion who remembers small details.',
    summaryZh: '一个记得细节、低压力陪伴你的日常角色。',
  },
  anime_mage: {
    titleEn: 'Start from an anime mage',
    titleZh: '从动漫魔法师开始',
    summaryEn: 'A magical anime companion with a clear scene and emotional ritual.',
    summaryZh: '带有明确场景和情绪仪式感的原创动漫魔法角色。',
  },
  crush_chat_template: {
    titleEn: 'Start from a crush chat template',
    titleZh: '从心动聊天模板开始',
    summaryEn: 'Slow-burn romantic tension built around memory and restraint.',
    summaryZh: '围绕记忆、试探和克制展开的慢热暧昧模板。',
  },
  private_memory_companion: {
    titleEn: 'Start from a private memory companion',
    titleZh: '从私有记忆陪伴开始',
    summaryEn: 'A private character designed around shared history and return visits.',
    summaryZh: '围绕共同经历和回访感设计的私有角色。',
  },
};

const QUICK_CREATE_TEMPLATE_GROWTH: Record<
  string,
  Pick<
    QuickCreateGrowthMetadata,
    | 'intentCategory'
    | 'inspirationType'
    | 'starterMemoryMode'
    | 'recommendedLandingSlug'
  >
> = {
  'life-secret-crush': {
    intentCategory: 'crush_chat',
    inspirationType: 'crush_chat_template',
    starterMemoryMode: 'relationship',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-ex-return': {
    intentCategory: 'crush_chat',
    inspirationType: 'crush_chat_template',
    starterMemoryMode: 'story',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-cold-war-lover': {
    intentCategory: 'crush_chat',
    inspirationType: 'crush_chat_template',
    starterMemoryMode: 'relationship',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-roommate': {
    intentCategory: 'comfort_companion',
    inspirationType: 'cozy_companion',
    starterMemoryMode: 'relationship',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-old-friend-spark': {
    intentCategory: 'crush_chat',
    inspirationType: 'crush_chat_template',
    starterMemoryMode: 'relationship',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-blind-date': {
    intentCategory: 'crush_chat',
    inspirationType: 'crush_chat_template',
    starterMemoryMode: 'light',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-familiar-stranger': {
    intentCategory: 'comfort_companion',
    inspirationType: 'cozy_companion',
    starterMemoryMode: 'light',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
  'life-low-point-companion': {
    intentCategory: 'comfort_companion',
    inspirationType: 'private_memory_companion',
    starterMemoryMode: 'relationship',
    recommendedLandingSlug: 'ai-character-chat-with-memory',
  },
  'fantasy-magic-senior': {
    intentCategory: 'anime_roleplay',
    inspirationType: 'anime_mage',
    starterMemoryMode: 'story',
    recommendedLandingSlug: 'anime-ai-roleplay-characters',
  },
  'fantasy-apocalypse-medic': {
    intentCategory: 'comfort_companion',
    inspirationType: 'private_memory_companion',
    starterMemoryMode: 'story',
    recommendedLandingSlug: 'ai-character-chat-with-memory',
  },
  'fantasy-court-strategist': {
    intentCategory: 'private_character',
    inspirationType: 'private_memory_companion',
    starterMemoryMode: 'story',
    recommendedLandingSlug: 'custom-ai-character-creator',
  },
};

export function getRoleplayCharacterSeoScenes(characterId: string) {
  return ROLEPLAY_CHARACTER_SEO_SCENES[characterId] ?? [];
}

export function getQuickCreateGrowthMetadata(
  template: {
    id: string;
    category: string;
  }
): QuickCreateGrowthMetadata {
  const fallback =
    template.category === 'fantasy' || template.category === 'adventure'
      ? {
          intentCategory: 'anime_roleplay' as const,
          inspirationType: 'anime_mage' as const,
          starterMemoryMode: 'story' as const,
          recommendedLandingSlug: 'anime-ai-roleplay-characters',
        }
      : template.category === 'romance'
        ? {
            intentCategory: 'crush_chat' as const,
            inspirationType: 'crush_chat_template' as const,
            starterMemoryMode: 'relationship' as const,
            recommendedLandingSlug: 'custom-ai-character-creator',
          }
        : {
            intentCategory: 'comfort_companion' as const,
            inspirationType: 'cozy_companion' as const,
            starterMemoryMode: 'light' as const,
            recommendedLandingSlug: 'ai-character-chat-with-memory',
          };
  const growth = QUICK_CREATE_TEMPLATE_GROWTH[template.id] ?? fallback;
  const inspiration = QUICK_CREATE_INSPIRATIONS[growth.inspirationType];

  return {
    ...growth,
    inspirationTitleEn: inspiration.titleEn,
    inspirationTitleZh: inspiration.titleZh,
    inspirationSummaryEn: inspiration.summaryEn,
    inspirationSummaryZh: inspiration.summaryZh,
    defaultVisibility: 'private',
  };
}
