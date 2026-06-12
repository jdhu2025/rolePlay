export type FirstExperienceChoiceId = 'quiet' | 'playful' | 'guarded';

export type FirstExperienceChoice = {
  id: FirstExperienceChoiceId;
  promptZh: string;
  promptEn: string;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  revealZh: string;
  revealEn: string;
  persona: string;
  tagHints: string[];
  textHints: string[];
};

export type FirstExperienceState = {
  choice: FirstExperienceChoiceId;
  selectedAt: string;
  revealShown: boolean;
  seedShownByConversation: Record<string, true>;
  goodbyeStampedByConversation: Record<string, true>;
};

export type FirstExperienceConversationFlagKey =
  | 'seedShownByConversation'
  | 'goodbyeStampedByConversation';

export type FirstExperienceRankableCharacter = {
  id: string;
  tagline?: string | null;
  intro?: string | null;
  tags?: string | null;
  tagSlugs?: string[] | null;
  style?: string | null;
  relationship?: string | null;
  scene?: string | null;
  settings?: string | null;
  gender?: string | null;
  chatCount?: number | null;
};

export const FIRST_EXPERIENCE_STORAGE_KEY = 'roleplay:first-experience';
export const FIRST_EXPERIENCE_ACTIVE_KEY = 'roleplay:first-experience-active';
export const FIRST_EXPERIENCE_SELECTED_AT_KEY =
  'roleplay:first-experience-selected-at';

export const FIRST_EXPERIENCE_CHOICES: FirstExperienceChoice[] = [
  {
    id: 'quiet',
    promptZh: '先选一个今晚的开场。',
    promptEn: 'Choose the way in.',
    labelZh: '不想解释太多',
    labelEn: 'No need to explain much',
    descriptionZh: '少一点噪音，留一点空白。',
    descriptionEn: 'Less noise, more room to pause.',
    revealZh: '那今晚就不用把话说完整。',
    revealEn: 'Then you do not have to make the whole thing tidy.',
    persona:
      'The user chose quiet, attentive companionship for the first meeting.',
    tagHints: ['recommend', 'helper', 'original'],
    textHints: [
      'quiet',
      'soft',
      'warm',
      'healing',
      'memory',
      'companion',
      'gentle',
      'calm',
      '安静',
      '温柔',
      '疗愈',
      '陪伴',
    ],
  },
  {
    id: 'playful',
    promptZh: '先选一个今晚的开场。',
    promptEn: 'Choose the way in.',
    labelZh: '想轻松一点',
    labelEn: 'Keep it light',
    descriptionZh: '先把沉重的东西放门口。',
    descriptionEn: 'Leave the heavy parts at the door.',
    revealZh: '好，先把沉重的东西放门口。',
    revealEn: 'Good. Leave the heavy parts at the door for a minute.',
    persona:
      'The user chose playful teasing and lightness for the first meeting.',
    tagHints: ['play_fun', 'recommend'],
    textHints: [
      'playful',
      'teasing',
      'fun',
      'dating',
      'flirt',
      'light',
      'smile',
      'joke',
      '轻松',
      '调侃',
      '逗',
      '娱乐',
    ],
  },
  {
    id: 'guarded',
    promptZh: '先选一个今晚的开场。',
    promptEn: 'Choose the way in.',
    labelZh: '想遇到一点阻力',
    labelEn: 'Make it less easy',
    descriptionZh: '不急着给你标准答案。',
    descriptionEn: 'No easy answers right away.',
    revealZh: '明白。今晚不给你太容易的答案。',
    revealEn: 'Understood. No easy answers tonight.',
    persona:
      'The user chose someone a little hard to approach, with tension before warmth.',
    tagHints: ['recommend', 'muses', 'fiction_media'],
    textHints: [
      'guarded',
      'cool',
      'mysterious',
      'tension',
      'sharp',
      'private',
      'high standard',
      'slow burn',
      '张力',
      '冷',
      '神秘',
      '难靠近',
    ],
  },
];

export const FIRST_EXPERIENCE_EVENT_TYPES = [
  'first_experience_exposed',
  'first_experience_selected',
  'first_experience_reveal_shown',
  'first_experience_recommendation_clicked',
  'first_chat_started',
  'first_chat_turn_1_completed',
  'first_chat_turn_3_completed',
  'seed_revealed',
  'goodbye_stamp_shown',
  'save_relationship_prompt_shown',
  'save_relationship_clicked',
  'returning_seed_resumed',
] as const;

const FIRST_EXPERIENCE_CHOICE_IDS = new Set(
  FIRST_EXPERIENCE_CHOICES.map((choice) => choice.id)
);

export function normalizeFirstExperienceChoice(
  value: unknown
): FirstExperienceChoiceId | null {
  const text = String(value || '').trim();
  if (FIRST_EXPERIENCE_CHOICE_IDS.has(text as FirstExperienceChoiceId)) {
    return text as FirstExperienceChoiceId;
  }
  return null;
}

export function getFirstExperienceChoice(value: unknown) {
  const id = normalizeFirstExperienceChoice(value);
  if (!id) return null;
  return FIRST_EXPERIENCE_CHOICES.find((choice) => choice.id === id) ?? null;
}

export function buildFirstExperiencePersona(value: unknown) {
  return getFirstExperienceChoice(value)?.persona ?? '';
}

export function buildFirstExperienceRecommendationQuery(value: unknown) {
  const firstImpression = normalizeFirstExperienceChoice(value);
  return firstImpression ? { firstImpression } : {};
}

export function createFirstExperienceState(
  value: unknown,
  selectedAt: Date = new Date()
): FirstExperienceState {
  const choice = normalizeFirstExperienceChoice(value) ?? 'quiet';
  return {
    choice,
    selectedAt: selectedAt.toISOString(),
    revealShown: false,
    seedShownByConversation: {},
    goodbyeStampedByConversation: {},
  };
}

export function parseFirstExperienceState(
  raw: string | null | undefined
): FirstExperienceState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const input = parsed as Record<string, unknown>;
    const choice = normalizeFirstExperienceChoice(input.choice);
    if (!choice) return null;
    return {
      choice,
      selectedAt:
        typeof input.selectedAt === 'string' && input.selectedAt
          ? input.selectedAt
          : new Date(0).toISOString(),
      revealShown: Boolean(input.revealShown),
      seedShownByConversation: normalizeFlagMap(input.seedShownByConversation),
      goodbyeStampedByConversation: normalizeFlagMap(
        input.goodbyeStampedByConversation
      ),
    };
  } catch {
    return null;
  }
}

export function markFirstExperienceConversationFlag(
  state: FirstExperienceState,
  key: FirstExperienceConversationFlagKey,
  conversationId: string
): FirstExperienceState {
  const trimmedId = conversationId.trim();
  if (!trimmedId) return state;
  return {
    ...state,
    [key]: {
      ...state[key],
      [trimmedId]: true,
    },
  };
}

export function rankFirstExperienceCharacters<
  T extends FirstExperienceRankableCharacter,
>(value: unknown, characters: T[]): T[] {
  const choice = getFirstExperienceChoice(value);
  if (!choice) return characters;
  const indexed = characters.map((character, index) => ({
    character,
    index,
    score: scoreFirstExperienceCharacter(choice, character),
  }));
  indexed.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const popularityDelta =
      Number(b.character.chatCount || 0) - Number(a.character.chatCount || 0);
    if (popularityDelta !== 0) return popularityDelta;
    return a.index - b.index;
  });
  return indexed.map((item) => item.character);
}

function normalizeFlagMap(value: unknown): Record<string, true> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const output: Record<string, true> = {};
  for (const key of Object.keys(value as Record<string, unknown>).slice(0, 80)) {
    const trimmed = key.trim().slice(0, 160);
    if (trimmed) output[trimmed] = true;
  }
  return output;
}

function scoreFirstExperienceCharacter(
  choice: FirstExperienceChoice,
  character: FirstExperienceRankableCharacter
) {
  const tagText = [
    ...(Array.isArray(character.tagSlugs) ? character.tagSlugs : []),
    safeString(character.tags),
  ]
    .join(' ')
    .toLowerCase();
  const bodyText = [
    character.tagline,
    character.intro,
    character.style,
    character.relationship,
    character.scene,
    character.settings,
    character.gender,
  ]
    .map(safeString)
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const hint of choice.tagHints) {
    if (tagText.includes(hint.toLowerCase())) score += 8;
  }
  for (const hint of choice.textHints) {
    if (bodyText.includes(hint.toLowerCase())) score += 3;
  }
  return score;
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}
