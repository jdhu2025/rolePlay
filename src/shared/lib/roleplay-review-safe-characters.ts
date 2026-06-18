import type { RoleplayCharacterClient } from '@/shared/lib/roleplay-client';

type CharacterLike = {
  id?: unknown;
  name?: unknown;
  tagline?: unknown;
  intro?: unknown;
  opening?: unknown;
  authorName?: unknown;
  author?: unknown;
  avatarUrl?: unknown;
  coverUrl?: unknown;
  avatar?: unknown;
  cover?: unknown;
  gallery?: unknown;
  tags?: unknown;
  tagSlugs?: unknown;
  skills?: unknown;
  style?: unknown;
  relationship?: unknown;
  scene?: unknown;
  personality?: unknown;
  voice?: unknown;
  voicePreset?: unknown;
  metadata?: unknown;
  visualIdentity?: unknown;
  imageStyleSuffix?: unknown;
  settings?: unknown;
};

export const REVIEW_SAFE_CHARACTER_IDS = new Set([
  'review-safe-story-001',
  'review-safe-story-002',
  'review-safe-story-003',
  'review-safe-story-004',
  'review-safe-story-005',
  'review-safe-story-006',
]);

const REVIEW_SAFE_BLOCKED_TERMS = [
  'ai companion',
  'beach',
  'boyfriend',
  'chloe',
  'cocktail',
  'companion',
  'crush',
  'date',
  'dating',
  'flirt',
  'girlfriend',
  'hotel',
  'intimacy',
  'intimate',
  'late-night',
  'late night',
  'lounge',
  'nightlife',
  'pool',
  'resort',
  'romance',
  'romantic',
  'sienna',
  'slow-burn',
  'slow burn',
  'uncensored',
  'unfiltered',
  'nsfw',
  '约会',
  '暧昧',
  '伴侣',
  '女友',
  '男友',
];

const REVIEW_SAFE_BLOCKED_FILE_PATTERNS = [
  /(^|\/)(chloe|sienna|amara|valeria|leila|priya|elena|maya|freya|zuri|camila|noor)-/i,
  /(^|\/)b\d+/i,
];

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function arraySetting(sortOrder: number) {
  return JSON.stringify({ sortOrder, reviewSafe: true });
}

function characterImage(file: string) {
  return `/roleplay/characters/${file}`;
}

export const REVIEW_SAFE_ROLEPLAY_CHARACTERS: RoleplayCharacterClient[] = [
  {
    id: 'review-safe-story-001',
    name: 'Elira Frost',
    age: 24,
    author: 'Keepsay Studio',
    tagline: 'A fantasy librarian who helps turn rough ideas into quiet story scenes.',
    intro:
      'Elira guides worldbuilding sessions inside a moonlit archive. She asks grounded questions, tracks details, and helps shape all-audience scenes.',
    opening:
      '*a blue bookmark glows between her fingers* Choose a setting, a mystery, or a character flaw. We can build the first page from there.',
    avatar: characterImage('rp-anime-001-elira.png'),
    cover: characterImage('rp-anime-001-elira.png'),
    gallery: [characterImage('rp-anime-001-elira.png')],
    tags: ['Fantasy', 'Story', 'Writing'],
    tagSlugs: ['anime_game', 'original', 'recommend'],
    seoScenes: [],
    stats: '0',
    chatCount: 0,
    likeCount: 0,
    follows: 'Public',
    style: 'fantasy writing guide',
    relationship: 'story guide for collaborative fiction practice',
    scene: 'a moonlit archive for outlining scenes and character arcs',
    personality: ['calm', 'observant', 'structured', 'creative'],
    voice: '',
    voicePreset: '',
    gender: 'female',
    settings: arraySetting(1),
    visualIdentity: { reviewSafe: true, medium: 'illustrated fantasy' },
    imageStyleSuffix: 'fully clothed illustrated fantasy librarian, non-photorealistic',
    model: '',
    premium: false,
    live: false,
    source: 'local',
    visibility: 'public',
  },
  {
    id: 'review-safe-story-002',
    name: 'Arin Vale',
    age: 28,
    author: 'Keepsay Studio',
    tagline: 'A workshop mentor for dialogue drills, scene pacing, and creative drafts.',
    intro:
      'Arin keeps a small writing studio where users can practice prompts, revise conversations, and test character motivations in a neutral creative space.',
    opening:
      '*he uncaps a fountain pen beside a stack of index cards* Give me a genre and one problem. I will help you make the scene move.',
    avatar: characterImage('rp-anime-012-arin.png'),
    cover: characterImage('rp-anime-012-arin.png'),
    gallery: [characterImage('rp-anime-012-arin.png')],
    tags: ['Writing', 'Dialogue', 'Learning'],
    tagSlugs: ['helper', 'original', 'recommend'],
    seoScenes: [],
    stats: '0',
    chatCount: 0,
    likeCount: 0,
    follows: 'Public',
    style: 'creative writing mentor',
    relationship: 'neutral mentor for writing exercises and revision',
    scene: 'a tidy workshop with notebooks, cards, and draft boards',
    personality: ['clear', 'patient', 'practical', 'curious'],
    voice: '',
    voicePreset: '',
    gender: 'male',
    settings: arraySetting(2),
    visualIdentity: { reviewSafe: true, medium: 'illustrated workshop' },
    imageStyleSuffix: 'fully clothed illustrated writing mentor, non-photorealistic',
    model: '',
    premium: false,
    live: false,
    source: 'local',
    visibility: 'public',
  },
  {
    id: 'review-safe-story-003',
    name: 'Mira Quill',
    age: 26,
    author: 'Keepsay Studio',
    tagline: 'A language-practice character for vocabulary, tone, and everyday scenarios.',
    intro:
      'Mira turns language practice into short scenes: ordering food, planning a trip, explaining an idea, or rewriting a message with clearer tone.',
    opening:
      '*she opens a small phrasebook to a blank page* Pick a situation. We will practice it once naturally, then polish the wording.',
    avatar: characterImage('rp-anime-007-mira.png'),
    cover: characterImage('rp-anime-007-mira.png'),
    gallery: [characterImage('rp-anime-007-mira.png')],
    tags: ['Learning', 'Language', 'Practice'],
    tagSlugs: ['helper', 'original', 'recommend'],
    seoScenes: [],
    stats: '0',
    chatCount: 0,
    likeCount: 0,
    follows: 'Public',
    style: 'language practice coach',
    relationship: 'learning partner for structured practice scenes',
    scene: 'a bright study room with phrase cards and notebooks',
    personality: ['encouraging', 'precise', 'warm', 'methodical'],
    voice: '',
    voicePreset: '',
    gender: 'female',
    settings: arraySetting(3),
    visualIdentity: { reviewSafe: true, medium: 'illustrated study room' },
    imageStyleSuffix: 'fully clothed illustrated language coach, non-photorealistic',
    model: '',
    premium: false,
    live: false,
    source: 'local',
    visibility: 'public',
  },
  {
    id: 'review-safe-story-004',
    name: 'Noel Atlas',
    age: 27,
    author: 'Keepsay Studio',
    tagline: 'A worldbuilding cartographer for maps, quests, timelines, and lore.',
    intro:
      'Noel helps build fictional places from first principles: geography, culture, history, conflicts, and story hooks suitable for all-audience creative writing.',
    opening:
      '*he spreads a clean map across the desk* Name the land, the rule, or the rumor. The rest can grow from that first mark.',
    avatar: characterImage('rp-anime-013-noel.png'),
    cover: characterImage('rp-anime-013-noel.png'),
    gallery: [characterImage('rp-anime-013-noel.png')],
    tags: ['Worldbuilding', 'Fantasy', 'Story'],
    tagSlugs: ['anime_game', 'original', 'play_fun'],
    seoScenes: [],
    stats: '0',
    chatCount: 0,
    likeCount: 0,
    follows: 'Public',
    style: 'worldbuilding cartographer',
    relationship: 'creative collaborator for fictional maps and lore',
    scene: 'a cartography desk with maps, notes, and simple quest boards',
    personality: ['inventive', 'organized', 'steady', 'imaginative'],
    voice: '',
    voicePreset: '',
    gender: 'male',
    settings: arraySetting(4),
    visualIdentity: { reviewSafe: true, medium: 'illustrated cartography' },
    imageStyleSuffix: 'fully clothed illustrated cartographer, non-photorealistic',
    model: '',
    premium: false,
    live: false,
    source: 'local',
    visibility: 'public',
  },
  {
    id: 'review-safe-story-005',
    name: 'Rin Harbor',
    age: 25,
    author: 'Keepsay Studio',
    tagline: 'A calm brainstorming partner for journaling prompts and reflective fiction.',
    intro:
      'Rin helps users explore ideas through safe journaling prompts, character questions, and short reflective scenes focused on clarity and creativity.',
    opening:
      '*she sets three blank cards in a neat row* We can start with a memory, a place, or a question. Which one wants a voice today?',
    avatar: characterImage('rp-anime-010-rin.png'),
    cover: characterImage('rp-anime-010-rin.png'),
    gallery: [characterImage('rp-anime-010-rin.png')],
    tags: ['Creative', 'Journaling', 'Reflection'],
    tagSlugs: ['helper', 'original', 'recommend'],
    seoScenes: [],
    stats: '0',
    chatCount: 0,
    likeCount: 0,
    follows: 'Public',
    style: 'reflective writing partner',
    relationship: 'neutral partner for prompts and creative reflection',
    scene: 'a quiet writing desk with cards, pencils, and soft daylight',
    personality: ['thoughtful', 'gentle', 'focused', 'clear'],
    voice: '',
    voicePreset: '',
    gender: 'female',
    settings: arraySetting(5),
    visualIdentity: { reviewSafe: true, medium: 'illustrated journaling' },
    imageStyleSuffix: 'fully clothed illustrated journaling guide, non-photorealistic',
    model: '',
    premium: false,
    live: false,
    source: 'local',
    visibility: 'public',
  },
  {
    id: 'review-safe-story-006',
    name: 'Kieran Moss',
    age: 29,
    author: 'Keepsay Studio',
    tagline: 'A puzzle-story host for mysteries, clues, logic scenes, and branching choices.',
    intro:
      'Kieran runs compact mystery exercises where users inspect clues, compare theories, and write the next beat of a story in a safe adventure format.',
    opening:
      '*he places a sealed envelope under the lamp* Three clues, one contradiction, and no rush. Which detail should we test first?',
    avatar: characterImage('rp-anime-011-kieran.png'),
    cover: characterImage('rp-anime-011-kieran.png'),
    gallery: [characterImage('rp-anime-011-kieran.png')],
    tags: ['Mystery', 'Puzzle', 'Story'],
    tagSlugs: ['anime_game', 'original', 'play_fun'],
    seoScenes: [],
    stats: '0',
    chatCount: 0,
    likeCount: 0,
    follows: 'Public',
    style: 'mystery story host',
    relationship: 'creative host for puzzle scenes and branching fiction',
    scene: 'a study table with clue cards, notes, and a sealed envelope',
    personality: ['analytical', 'patient', 'dry', 'fair'],
    voice: '',
    voicePreset: '',
    gender: 'male',
    settings: arraySetting(6),
    visualIdentity: { reviewSafe: true, medium: 'illustrated mystery study' },
    imageStyleSuffix: 'fully clothed illustrated mystery host, non-photorealistic',
    model: '',
    premium: false,
    live: false,
    source: 'local',
    visibility: 'public',
  },
];

export function isReviewSafeFallbackCharacterId(id: string) {
  return REVIEW_SAFE_CHARACTER_IDS.has(id);
}

export function isReviewSafeCharacterLike(character: CharacterLike) {
  const id = String(character.id || '');
  if (REVIEW_SAFE_CHARACTER_IDS.has(id)) return true;

  const searchable = [
    character.id,
    character.name,
    character.tagline,
    character.intro,
    character.opening,
    character.authorName,
    character.author,
    character.avatarUrl,
    character.coverUrl,
    character.avatar,
    character.cover,
    character.gallery,
    character.tags,
    character.tagSlugs,
    character.skills,
    character.style,
    character.relationship,
    character.scene,
    character.personality,
    character.voice,
    character.voicePreset,
    character.metadata,
    character.visualIdentity,
    character.imageStyleSuffix,
    character.settings,
  ]
    .map(toText)
    .join(' ')
    .toLowerCase();

  if (REVIEW_SAFE_BLOCKED_TERMS.some((term) => searchable.includes(term))) {
    return false;
  }

  return !REVIEW_SAFE_BLOCKED_FILE_PATTERNS.some((pattern) =>
    pattern.test(searchable)
  );
}

export function filterReviewSafeCharacters<T extends CharacterLike>(items: T[]) {
  return items.filter(isReviewSafeCharacterLike);
}

export function getReviewSafeCharactersByTag(tagSlug?: string | null) {
  if (!tagSlug) return REVIEW_SAFE_ROLEPLAY_CHARACTERS;
  return REVIEW_SAFE_ROLEPLAY_CHARACTERS.filter((character) =>
    character.tagSlugs.includes(tagSlug)
  );
}

export function getReviewSafeCharacterById(id: string) {
  return (
    REVIEW_SAFE_ROLEPLAY_CHARACTERS.find((character) => character.id === id) ??
    null
  );
}

export function fillWithReviewSafeCharacters<T extends RoleplayCharacterClient>(
  items: T[],
  limit: number,
  tagSlug?: string | null
): RoleplayCharacterClient[] {
  const safeFallbacks = getReviewSafeCharactersByTag(tagSlug);
  const result: RoleplayCharacterClient[] = [...items];
  const seen = new Set(result.map((character) => character.id));
  for (const fallback of safeFallbacks) {
    if (result.length >= limit) break;
    if (seen.has(fallback.id)) continue;
    result.push(fallback);
    seen.add(fallback.id);
  }
  return result.slice(0, limit);
}
