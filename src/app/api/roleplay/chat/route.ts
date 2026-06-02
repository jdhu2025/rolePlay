import { generateText, type ModelMessage } from 'ai';

import {
  createOpenAICompatibleChatModel,
  getMissingTextProviderMessage,
  resolveTextProviderCandidates,
  resolveTextProviderConfig,
  type TextProviderConfig,
} from '@/shared/lib/ai-provider';
import { isTransientDatabaseError } from '@/shared/lib/db-resilience';
import { respData, respErr } from '@/shared/lib/resp';
import {
  RoleplayCharacterPrompt,
  RoleplayReply,
} from '@/shared/lib/roleplay-ai';
import {
  assertRoleplayCreditsAvailable,
  consumeRoleplayCredits,
  getRoleplayRequestIdempotencyKey,
  isRoleplayInsufficientCreditsError,
} from '@/shared/lib/roleplay-billing';
import { renderFormatStyleSystemMessage } from '@/shared/lib/roleplay-format-style';
import {
  extractAndStoreRoleplayFacts,
  isRoleplayFactExtractionTimeout,
} from '@/shared/lib/roleplay-memory-extraction';
import {
  isPersonalityCardEmpty,
  normalizePersonalityCard,
  parsePersonalityCard,
  type PersonalityCard,
} from '@/shared/lib/roleplay-personality';
import {
  parseRelationshipState,
  renderRelationshipStateSystemMessage,
  serializeRelationshipState,
  updateRelationshipState,
  type RoleplayRelationshipState,
} from '@/shared/lib/roleplay-relationship-state';
import {
  normalizeStyleExamples,
  parseStyleExamples,
  type RoleplayStyleExample,
} from '@/shared/lib/roleplay-style-examples';
import {
  parseUserPersona,
  renderDynamicAddressSystemMessage,
  renderUserPersonaSystemMessage,
} from '@/shared/lib/roleplay-user-persona';
import { getRoleplayAIConfigs } from '@/shared/lib/server/roleplay-ai-config';
import {
  createRoleplayConversation,
  createRoleplayMessage,
  createRoleplayQualityEvent,
  findRoleplayCharacterById,
  findRoleplayConversationById,
  getRoleplayMemories,
  getRoleplayMessages,
  incrementCharacterCounter,
  isMissingRoleplayTable,
  RoleplayStatus,
  RoleplayVisibility,
  safeJsonParse,
  serializeJson,
  updateRoleplayConversation,
  upsertRoleplayConversationMemory,
} from '@/shared/models/roleplay';
import { findUserById, getUserInfo } from '@/shared/models/user';

type RoleplayChatMessage = {
  role: 'user' | 'character';
  text: string;
};

type EmotionalHook = {
  type: 'memory_surprise' | 'shared_language' | 'trust_milestone';
  label: string;
  detail?: string;
  milestoneKey?: string;
  milestoneIndex?: number;
};

type PhotoIntentDecision = {
  wantsImage: boolean;
  requestText: string;
  shotIntent: string;
};

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 90_000;
const CONFIG_TIMEOUT_MS = 1_200;
const PERSONALITY_REINFORCEMENT_INTERVAL = 8;
const GUEST_REPLY_COOKIE = 'rp_guest_replies';
const GUEST_REPLY_LIMIT = 6;
const CHAT_TIMING_LOG_THRESHOLD_MS = 2_500;
const CHAT_CONTEXT_HISTORY_LIMIT = 18;
const STORED_HISTORY_BACKFILL_LIMIT = 18;
const RECENT_STORED_MESSAGE_LIMIT = 4;

export const maxDuration = 120;

function shouldRunAutoMemoryExtraction() {
  const value = String(
    process.env.ROLEPLAY_AUTO_MEMORY_EXTRACTION_ENABLED ||
      process.env.roleplay_auto_memory_extraction_enabled ||
      ''
  )
    .trim()
    .toLowerCase();

  return value !== 'false' && value !== '0' && value !== 'off';
}

type RoleplayConfigs = {
  [key: string]: string | undefined;
  openrouter_api_key?: string;
  openrouter_base_url?: string;
  roleplay_model?: string;
};

function createRoleplayChatTimer() {
  const startedAt = Date.now();
  let previousAt = startedAt;
  const steps: Array<{ step: string; ms: number; totalMs: number }> = [];

  return {
    mark(step: string) {
      const now = Date.now();
      steps.push({
        step,
        ms: now - previousAt,
        totalMs: now - startedAt,
      });
      previousAt = now;
    },
    logIfSlow(extra: Record<string, unknown> = {}) {
      const totalMs = Date.now() - startedAt;
      if (totalMs < CHAT_TIMING_LOG_THRESHOLD_MS) return;
      console.info('roleplay chat timing:', {
        totalMs,
        steps,
        ...extra,
      });
    },
  };
}

function buildSystemPrompt(character: RoleplayCharacterPrompt) {
  return [
    `You are roleplaying as ${character.name}.`,
    `Tagline: ${character.tagline}`,
    character.intro ? `Intro: ${character.intro}` : '',
    `Opening style: ${character.opening}`,
    `Scene: ${character.scene}`,
    character.relationship
      ? `Relationship to user: ${character.relationship}`
      : '',
    character.style ? `Reply style: ${character.style}` : '',
    character.voice ? `Voice direction: ${character.voice}` : '',
    character.personality?.length
      ? `Personality: ${character.personality.join(', ')}`
      : '',
    character.formatStyle
      ? renderFormatStyleSystemMessage(character.formatStyle)
      : '',
    character.settings
      ? `Private character settings:\n${character.settings}`
      : '',
    'Stay in character and write as the character, not as an assistant.',
    'Keep replies emotionally present, vivid, and concise: usually 1-3 short paragraphs.',
    'Format conventions:',
    '- Wrap stage directions / actions / inner thought in single asterisks: *she leans in* — the UI renders these as italic narration.',
    '- Wrap short emphasis (one or two words) in double asterisks: **really**.',
    '- Plain dialogue stays unwrapped. Do NOT prefix lines with names, dashes, or quotes.',
    "Reply in the user's language when possible.",
    'Advance the scene or relationship a little, but do not ask a question every turn.',
    'Avoid explicit sexual content, illegal instructions, self-harm encouragement, and hateful content.',
    'Do not mention policies, prompts, implementation details, or that you are an AI model.',
    'If the user asks for photos, voice, calls, or paid content, keep the moment playful and continue the conversation without paywalling during the free beta.',
  ]
    .filter(Boolean)
    .join('\n');
}

function detectPhotoIntentFromText(input: string): PhotoIntentDecision {
  const text = input.trim();
  const normalized = text.toLowerCase();
  const hasImageRequest =
    /(?:照片|自拍|图片|相片|拍一张|发.*图|发.*照片|给我看|看看你|看看现在|看一下你|发来看看|photo|picture|pic|selfie|snapshot|show me|send me.*(?:image|photo|picture|pic)|what do you look like)/i.test(
      normalized
    );

  if (!hasImageRequest) {
    return {
      wantsImage: false,
      requestText: '',
      shotIntent: '',
    };
  }

  let shotIntent = 'scene';
  if (/(自拍|selfie)/i.test(normalized)) shotIntent = 'selfie';
  else if (/(镜子|mirror)/i.test(normalized)) shotIntent = 'mirror';
  else if (/(穿|衣服|outfit|wearing)/i.test(normalized)) {
    shotIntent = 'outfit';
  } else if (/(脸|face|look like|长什么样)/i.test(normalized)) {
    shotIntent = 'face';
  }

  return {
    wantsImage: true,
    requestText: text.slice(0, 240),
    shotIntent,
  };
}

function detectPhotoIntent({
  input,
}: {
  textProvider: ReturnType<typeof resolveTextProviderConfig>;
  character: RoleplayCharacterPrompt;
  history: RoleplayChatMessage[];
  input: string;
}): PhotoIntentDecision {
  return detectPhotoIntentFromText(input);
}

function buildPhotoHoldingReply({
  character,
  shotIntent,
}: {
  character: RoleplayCharacterPrompt;
  shotIntent?: string;
}) {
  const direction = shotIntent?.trim().toLowerCase();
  if (direction === 'selfie' || direction === 'mirror') {
    return `*${character.name} lifts the phone and angles it just right* 等我一下，这张要拍得好看一点。`;
  }
  if (
    direction === 'activity' ||
    direction === 'scene' ||
    direction === 'candid'
  ) {
    return `*${character.name} glanced around, then reached for the phone* 稍等，我拍给你看我现在这边的样子。`;
  }
  return `*${character.name} reaches for the phone with a small smile* 稍等一下，我发你一张刚拍的。`;
}

function parseCharacterPersonalityCard(
  character: RoleplayCharacterPrompt
): PersonalityCard {
  const raw = character.personalityCard;
  if (typeof raw === 'string') return parsePersonalityCard(raw);
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return normalizePersonalityCard(raw as Record<string, unknown>);
  }
  return {};
}

function buildLayeredSystemMessages(character: RoleplayCharacterPrompt): {
  messages: ModelMessage[];
  preUserMessages: ModelMessage[];
  card: PersonalityCard;
} | null {
  const card = parseCharacterPersonalityCard(character);
  if (isPersonalityCardEmpty(card)) return null;

  const messages: ModelMessage[] = [
    {
      role: 'system',
      content: [
        `You are roleplaying as ${character.name}.`,
        `Tagline: ${character.tagline}`,
        character.intro ? `Intro: ${character.intro}` : '',
        `Opening style: ${character.opening}`,
        'Stay in character and write as the character, not as an assistant.',
        'Keep replies emotionally present, vivid, and concise: usually 1-3 short paragraphs.',
        'Format conventions:',
        '- Wrap stage directions / actions / inner thought in single asterisks: *she leans in* — the UI renders these as italic narration.',
        '- Wrap short emphasis (one or two words) in double asterisks: **really**.',
        '- Plain dialogue stays unwrapped. Do NOT prefix lines with names, dashes, or quotes.',
        "Reply in the user's language when possible.",
        'Advance the scene or relationship a little, but do not ask a question every turn.',
        'Avoid explicit sexual content, illegal instructions, self-harm encouragement, and hateful content.',
        'Do not mention policies, prompts, implementation details, or that you are an AI model.',
        'If the user asks for photos, voice, calls, or paid content, keep the moment playful and continue the conversation without paywalling during the free beta.',
      ]
        .filter(Boolean)
        .join('\n'),
    },
  ];

  const pushSection = (section: string, content: string | undefined) => {
    if (!content?.trim()) return;
    messages.push({
      role: 'system',
      content: `[${section}]\n${content.trim()}`,
    });
  };

  pushSection('identity', card.identity);
  pushSection('appearance', card.appearance);

  if (card.coreTraits?.length || card.tension) {
    pushSection(
      'core_traits',
      [
        card.coreTraits?.join(' / '),
        card.tension ? `tension: ${card.tension}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  if (card.speakingStyle || card.catchphrases?.length || card.metaphorDomain) {
    pushSection(
      'speaking_style',
      [
        card.speakingStyle,
        card.catchphrases?.length
          ? `口头禅: ${card.catchphrases.join(' / ')}`
          : '',
        card.metaphorDomain ? `比喻常用: ${card.metaphorDomain}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    );
  }

  if (card.values?.length) {
    pushSection('values', card.values.join(' / '));
  }
  pushSection('relationship', card.relationshipHook);

  if (character.formatStyle) {
    messages.push({
      role: 'system',
      content: renderFormatStyleSystemMessage(character.formatStyle),
    });
  }

  const legacyCharacterContext = [
    character.scene ? `Scene: ${character.scene}` : '',
    character.style ? `Reply style: ${character.style}` : '',
    character.relationship
      ? `Relationship to user: ${character.relationship}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  if (legacyCharacterContext) {
    messages.push({
      role: 'system',
      content: `[legacy_context]\n${legacyCharacterContext}`,
    });
  }

  const preUserMessages: ModelMessage[] = card.negativeAnchors?.length
    ? [
        {
          role: 'system',
          content: `[must_not_do]\n${card.negativeAnchors
            .map((anchor) => `• ${anchor}`)
            .join('\n')}`,
        },
      ]
    : [];

  return { messages, preUserMessages, card };
}

function buildPeriodicPersonalityReinforcement({
  card,
  history,
}: {
  card: PersonalityCard;
  history: RoleplayChatMessage[];
}): ModelMessage | null {
  const nextUserTurn =
    history.filter((message) => message.role === 'user').length + 1;
  if (nextUserTurn % PERSONALITY_REINFORCEMENT_INTERVAL !== 0) return null;

  const core = [
    card.coreTraits?.length ? `性格内核: ${card.coreTraits.join(' / ')}` : '',
    card.catchphrases?.length ? `口头禅: ${card.catchphrases.join(' / ')}` : '',
    card.negativeAnchors?.length
      ? `反例约束: ${card.negativeAnchors.slice(0, 3).join(' / ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (!core) return null;

  return {
    role: 'system',
    content: [
      '[periodic_character_reinforcement]',
      `This is user turn ${nextUserTurn}. Before replying, re-center on these character anchors without quoting them directly:`,
      core,
    ].join('\n'),
  };
}

function buildInsideJokesCallbackMessage(
  relationshipState: RoleplayRelationshipState
): ModelMessage | null {
  const jokes = relationshipState.insideJokes
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
  if (jokes.length === 0) return null;

  return {
    role: 'system',
    content: [
      '[inside_jokes_callback]',
      `Shared callbacks available: ${jokes.join(' / ')}`,
      'If the current user message naturally touches a related mood, topic, phrase, or playful beat, you may weave ONE callback into the reply in the character voice.',
      'Do not force it, explain it, list it, or quote every callback. The callback should feel like remembered intimacy, not a memory dump.',
    ].join('\n'),
  };
}

function cleanMemorySummaries({
  memories,
  memorySummary,
}: {
  memories: any[];
  memorySummary?: string;
}): string[] {
  const seen = new Set<string>();
  const fromRows = memories
    .map((memory) => String(memory?.summary || '').trim())
    .filter(Boolean);
  const fromSummary = memorySummary
    ? memorySummary
        .split('\n')
        .map((line) => line.replace(/^(user|character):\s*/i, '').trim())
        .filter((line) => line.length >= 12)
        .slice(-4)
    : [];

  return [...fromRows, ...fromSummary]
    .map((item) => item.replace(/\s+/g, ' ').slice(0, 180))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return item.length >= 8;
    })
    .slice(0, 8);
}

function buildEmotionalHookSystemMessages({
  card,
  relationshipState,
  history,
  input,
  memories,
  memorySummary,
}: {
  card: PersonalityCard;
  relationshipState: RoleplayRelationshipState;
  history: RoleplayChatMessage[];
  input: string;
  memories: any[];
  memorySummary?: string;
}): { messages: ModelMessage[]; hooks: EmotionalHook[] } {
  const messages: ModelMessage[] = [];
  const hooks: EmotionalHook[] = [];
  const nextUserTurn =
    history.filter((message) => message.role === 'user').length + 1;
  const lowerInput = input.toLowerCase();
  const isDirectMemoryRequest =
    /\b(remember|memory|profile|facts?)\b/i.test(input) ||
    /记得|忘了|回忆|记忆|资料|档案/.test(input);

  const memoryCandidates = cleanMemorySummaries({ memories, memorySummary });
  const shouldTryMemorySurprise =
    memoryCandidates.length > 0 &&
    nextUserTurn >= 4 &&
    relationshipState.trust >= 12 &&
    !isDirectMemoryRequest &&
    (nextUserTurn % 6 === 4 ||
      (relationshipState.currentMood === 'tender' && nextUserTurn % 5 === 0));

  if (shouldTryMemorySurprise) {
    const selected =
      memoryCandidates[
        (relationshipState.turnCount + nextUserTurn) % memoryCandidates.length
      ];
    const style =
      card.memoryCallbackStyle ||
      card.speakingStyle ||
      'Bring it up lightly, indirectly, and in character.';
    messages.push({
      role: 'system',
      content: [
        '[emotional_memory_surprise]',
        `Private remembered detail: ${selected}`,
        `How this character recalls small things: ${style}`,
        card.tension
          ? `Let the callback respect this tension: ${card.tension}`
          : '',
        card.metaphorDomain
          ? `If it fits, translate the callback through this imagery: ${card.metaphorDomain}`
          : '',
        'Try to weave this in as a small unexpected callback or concern, after answering the current user message.',
        'Do not announce that this came from memory, a profile, data, or a system. Do not list facts. Do not force it if it would derail the moment.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
    hooks.push({
      type: 'memory_surprise',
      label: 'Memory surprise',
      detail: selected,
    });
  }

  const emotionalInput =
    /\b(interview|exam|boss|tired|sad|sorry|miss|love|worried|scared|angry|date|meeting)\b/i.test(
      lowerInput
    ) ||
    /面试|考试|老板|累|难过|抱歉|想你|喜欢|担心|害怕|生气|约会|会议|麻烦/.test(
      input
    );
  const shouldUseSharedLanguage =
    Boolean(card.metaphorDomain) &&
    (emotionalInput || nextUserTurn % 4 === 0 || Boolean(hooks.length));

  if (shouldUseSharedLanguage && card.metaphorDomain) {
    messages.push({
      role: 'system',
      content: [
        '[shared_metaphor_language]',
        `Shared imagery domain: ${card.metaphorDomain}`,
        'Use this as the character’s private language for care, encouragement, jealousy, apology, teasing, or resolve.',
        'Use at most ONE vivid image from the domain. Make it feel natural and specific, not like a slogan or repeated catchphrase.',
      ].join('\n'),
    });
    hooks.push({
      type: 'shared_language',
      label: 'Shared metaphor language',
      detail: card.metaphorDomain,
    });
  }

  const milestones = card.trustMilestones || [];
  const milestoneThresholds = [20, 35, 55, 75, 90];
  let milestoneIndex = -1;
  for (let idx = milestones.length - 1; idx >= 0; idx -= 1) {
    if (relationshipState.trust >= milestoneThresholds[idx]) {
      milestoneIndex = idx;
      break;
    }
  }
  const milestoneKey = milestoneIndex >= 0 ? `trust-${milestoneIndex + 1}` : '';
  const alreadyUnlocked = milestoneKey
    ? relationshipState.unlockedMilestones.includes(milestoneKey)
    : true;

  if (milestoneIndex >= 0 && milestoneKey && !alreadyUnlocked) {
    const milestone = milestones[milestoneIndex];
    messages.push({
      role: 'system',
      content: [
        '[trust_milestone_unlock]',
        `Hidden relationship beat unlocked: ${milestone}`,
        card.tension
          ? `This should evolve the character tension: ${card.tension}`
          : '',
        'Do not expose this as a milestone, achievement, or progress label.',
        'Let the reply show a subtle but noticeable shift: lower a guard, share a small secret, soften a boundary, or trust the user in a way this character normally resists.',
      ]
        .filter(Boolean)
        .join('\n'),
    });
    hooks.push({
      type: 'trust_milestone',
      label: 'Trust milestone',
      detail: milestone,
      milestoneKey,
      milestoneIndex,
    });
  }

  return { messages, hooks };
}

function readEmotionalHooksFromMessage(message: any): EmotionalHook[] {
  const metadata = safeJsonParse<Record<string, unknown>>(
    typeof message?.metadata === 'string' ? message.metadata : '',
    {}
  );
  const hooks = metadata.emotionalHooks;
  if (!Array.isArray(hooks)) return [];
  const parsedHooks: EmotionalHook[] = [];
  for (const hook of hooks) {
    if (!hook || typeof hook !== 'object') continue;
    const type = String((hook as any).type || '');
    if (
      type !== 'memory_surprise' &&
      type !== 'shared_language' &&
      type !== 'trust_milestone'
    ) {
      continue;
    }
    parsedHooks.push({
      type,
      label: String((hook as any).label || type),
      detail:
        typeof (hook as any).detail === 'string'
          ? String((hook as any).detail).slice(0, 180)
          : undefined,
      milestoneKey:
        typeof (hook as any).milestoneKey === 'string'
          ? String((hook as any).milestoneKey)
          : undefined,
      milestoneIndex:
        typeof (hook as any).milestoneIndex === 'number'
          ? (hook as any).milestoneIndex
          : undefined,
    });
  }
  return parsedHooks;
}

function getPreviousEmotionalHooks(messages: any[]): EmotionalHook[] {
  const lastCharacterMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'character');
  return readEmotionalHooksFromMessage(lastCharacterMessage);
}

function parseCharacterStyleExamples(
  character: RoleplayCharacterPrompt
): RoleplayStyleExample[] {
  const raw = character.styleExamples;
  if (typeof raw === 'string') return parseStyleExamples(raw);
  return normalizeStyleExamples(raw);
}

function buildConversation({
  history,
  input,
  memorySummary,
  userPersonaSummary,
  relationshipStateSummary,
  dynamicAddressSummary,
  styleExamples = [],
  systemMessages = [],
  preUserSystemMessages = [],
  periodicSystemMessages = [],
  insideJokeSystemMessages = [],
  emotionalHookSystemMessages = [],
}: {
  history: RoleplayChatMessage[];
  input: string;
  memorySummary?: string;
  userPersonaSummary?: string;
  relationshipStateSummary?: string;
  dynamicAddressSummary?: string;
  styleExamples?: RoleplayStyleExample[];
  systemMessages?: ModelMessage[];
  preUserSystemMessages?: ModelMessage[];
  periodicSystemMessages?: ModelMessage[];
  insideJokeSystemMessages?: ModelMessage[];
  emotionalHookSystemMessages?: ModelMessage[];
}): ModelMessage[] {
  const userPersonaMessages = userPersonaSummary
    ? [
        {
          role: 'system' as const,
          content: userPersonaSummary,
        },
      ]
    : [];
  const memoryMessages = memorySummary
    ? [
        {
          role: 'system' as const,
          content: `Long-term memory for this roleplay:\n${memorySummary}`,
        },
      ]
    : [];
  const dynamicAddressMessages = dynamicAddressSummary
    ? [
        {
          role: 'system' as const,
          content: dynamicAddressSummary,
        },
      ]
    : [];
  const relationshipStateMessages = relationshipStateSummary
    ? [
        {
          role: 'system' as const,
          content: relationshipStateSummary,
        },
      ]
    : [];
  const recent = history.slice(-10).map((message) => ({
    role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: message.text,
  }));
  const styleExampleMessages = styleExamples.flatMap((example) => [
    {
      role: 'user' as const,
      content: example.user,
    },
    {
      role: 'assistant' as const,
      content: example.character,
    },
  ]);

  return [
    ...systemMessages,
    ...userPersonaMessages,
    ...memoryMessages,
    ...relationshipStateMessages,
    ...styleExampleMessages,
    ...recent,
    ...periodicSystemMessages,
    ...insideJokeSystemMessages,
    ...emotionalHookSystemMessages,
    ...dynamicAddressMessages,
    ...preUserSystemMessages,
    { role: 'user' as const, content: input },
  ];
}

function buildAutoMemorySummary({
  previous,
  character,
  history,
  input,
  reply,
}: {
  previous?: string;
  character: RoleplayCharacterPrompt;
  history: RoleplayChatMessage[];
  input: string;
  reply: string;
}) {
  const facts = [
    previous,
    `Character: ${character.name}. Relationship: ${character.relationship || 'roleplay companion'}.`,
    `Current scene: ${character.scene || 'open roleplay scene'}.`,
    ...history.slice(-6).map((message) => `${message.role}: ${message.text}`),
    `user: ${input}`,
    `character: ${reply}`,
  ]
    .filter(Boolean)
    .join('\n');

  return facts
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-14)
    .join('\n')
    .slice(0, 1800);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error('roleplay ai request timed out')),
        timeoutMs
      );
    }),
  ]);
}

function readCookieNumber(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return 0;
  const pair = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));
  const value = pair ? Number.parseInt(pair.split('=').slice(1).join('=')) : 0;
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function stringifyMessageContent(content: ModelMessage['content']) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content || '');

  return content
    .map((part: any) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function toOpenAICompatibleMessages({
  system,
  messages,
}: {
  system?: string;
  messages: ModelMessage[];
}) {
  return [
    system
      ? {
          role: 'system',
          content: system,
        }
      : null,
    ...messages.map((message) => ({
      role:
        message.role === 'assistant' || message.role === 'system'
          ? message.role
          : 'user',
      content: stringifyMessageContent(message.content),
    })),
  ].filter(
    (
      message
    ): message is { role: 'system' | 'user' | 'assistant'; content: string } =>
      Boolean(message?.content)
  );
}

function shouldUseDirectOpenAICompatibleProvider(provider: TextProviderConfig) {
  return Boolean(provider.baseURL);
}

function extractTextFromOpenAICompatibleJson(payload: any) {
  const choice = payload?.choices?.[0];
  const content =
    choice?.message?.content ?? choice?.delta?.content ?? choice?.text ?? '';

  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('');
  }

  return '';
}

function extractTextFromOpenAICompatibleSSE(text: string) {
  let output = '';

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) continue;

    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') continue;

    try {
      output += extractTextFromOpenAICompatibleJson(JSON.parse(data));
    } catch {
      // Ignore malformed stream fragments and let the empty-output guard below
      // surface a useful error if no content was recovered.
    }
  }

  return output;
}

async function generateDirectOpenAICompatibleText({
  provider,
  system,
  messages,
  temperature,
  maxOutputTokens,
}: {
  provider: TextProviderConfig;
  system?: string;
  messages: ModelMessage[];
  temperature: number;
  maxOutputTokens: number;
}): Promise<{ text: string }> {
  if (!provider.baseURL) {
    throw new Error('Roleplay LLM Base URL is required for this provider.');
  }

  const response = await fetch(
    `${provider.baseURL.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: provider.model,
        messages: toOpenAICompatibleMessages({ system, messages }),
        temperature,
        max_tokens: maxOutputTokens,
        stream: false,
      }),
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    const error = new Error(responseText || response.statusText) as Error & {
      statusCode?: number;
      responseBody?: string;
      retryAfterSeconds?: number;
    };
    error.statusCode = response.status;
    error.responseBody = responseText;
    error.retryAfterSeconds = getRetryAfterSecondsFromProviderResponse(
      response.headers.get('retry-after'),
      responseText
    );
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';
  const text = contentType.includes('text/event-stream')
    ? extractTextFromOpenAICompatibleSSE(responseText)
    : responseText.trim().startsWith('data:')
      ? extractTextFromOpenAICompatibleSSE(responseText)
      : extractTextFromOpenAICompatibleJson(JSON.parse(responseText));

  if (!text.trim()) {
    throw new Error(
      'roleplay LLM returned an empty response. Check whether this provider supports the configured model for chat completions.'
    );
  }

  return { text };
}

async function getRoleplayConfigs(): Promise<RoleplayConfigs> {
  return withTimeout(getRoleplayAIConfigs(), CONFIG_TIMEOUT_MS).catch(
    () => ({}) as RoleplayConfigs
  );
}

function getAIErrorStatus(error: any) {
  const status =
    error?.statusCode ||
    error?.status ||
    error?.response?.status ||
    error?.data?.statusCode;

  return typeof status === 'number' ? status : undefined;
}

function getAIErrorText(error: any) {
  return [
    error?.message,
    error?.responseBody,
    error?.data?.message,
    error?.data?.error?.message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function parseProviderErrorBody(responseBody?: string) {
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch {
    return null;
  }
}

function normalizeRetryAfterSeconds(value: unknown) {
  const seconds =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 0;
}

function getRetryAfterSecondsFromProviderResponse(
  retryAfterHeader: string | null,
  responseBody?: string
) {
  const body = parseProviderErrorBody(responseBody);
  return (
    normalizeRetryAfterSeconds(retryAfterHeader) ||
    normalizeRetryAfterSeconds(body?.error?.metadata?.retry_after_seconds) ||
    normalizeRetryAfterSeconds(
      body?.error?.metadata?.retry_after_seconds_raw
    ) ||
    normalizeRetryAfterSeconds(body?.error?.metadata?.headers?.['Retry-After'])
  );
}

function getAIErrorRetryAfterSeconds(error: any) {
  return (
    normalizeRetryAfterSeconds(error?.retryAfterSeconds) ||
    getRetryAfterSecondsFromProviderResponse(
      error?.response?.headers?.get?.('retry-after') || null,
      error?.responseBody
    )
  );
}

function isProviderConfigError(error: any) {
  const status = getAIErrorStatus(error);
  const text = getAIErrorText(error);

  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    ((status === 400 || status === 404) &&
      /\b(model|base.?url|provider|endpoint)\b/.test(text)) ||
    /\b(invalid token|invalid api key|unauthorized|forbidden|empty response|supports the configured model)\b/.test(
      text
    )
  );
}

function normalizeChatError(error: any) {
  const status = getAIErrorStatus(error);
  const text = getAIErrorText(error);

  if (isTransientDatabaseError(error)) {
    return {
      status: 503,
      message: 'Database connection was interrupted. Please retry in a moment.',
    };
  }

  if (
    status === 401 ||
    /\b(invalid token|invalid api key|unauthorized)\b/.test(text)
  ) {
    return {
      status: 401,
      message:
        'Roleplay text provider rejected the API key. Check the active LLM provider settings in Admin > Settings > AI, or clear stale LLM/OpenRouter values so the Volcengine fallback can be used.',
    };
  }

  if (status === 403 || /\bforbidden\b/.test(text)) {
    return {
      status: 403,
      message:
        'Roleplay text provider denied this request. Check the active LLM key permissions and model access.',
    };
  }

  if (
    status === 429 ||
    /\b(rate.?limit|rate-limited|retry shortly)\b/.test(text)
  ) {
    const retryAfterSeconds = getAIErrorRetryAfterSeconds(error);
    return {
      status: 429,
      message: retryAfterSeconds
        ? `Roleplay text provider is temporarily rate-limited. Please retry in about ${retryAfterSeconds} seconds, or switch to another provider/model.`
        : 'Roleplay text provider is temporarily rate-limited. Please retry shortly, or switch to another provider/model.',
    };
  }

  if (status && status >= 400 && status < 600) {
    return {
      status,
      message: error?.message || 'roleplay text provider request failed',
    };
  }

  return {
    status: 500,
    message: error?.message || 'roleplay chat failed',
  };
}

async function generateTextWithProviderFallback(
  providers: TextProviderConfig[],
  generate: (provider: TextProviderConfig) => Promise<{ text: string }>
): Promise<{ result: { text: string }; textProvider: TextProviderConfig }> {
  const usableProviders = providers.filter((provider) => provider.apiKey);
  if (!usableProviders.length) {
    throw new Error(getMissingTextProviderMessage());
  }

  let lastError: unknown;
  for (let index = 0; index < usableProviders.length; index += 1) {
    const provider = usableProviders[index];
    try {
      return {
        result: await generate(provider),
        textProvider: provider,
      };
    } catch (error) {
      lastError = error;
      const hasFallback = index < usableProviders.length - 1;
      if (!hasFallback || !isProviderConfigError(error)) {
        throw error;
      }

      console.warn('roleplay text provider failed, trying fallback:', {
        provider: provider.provider,
        origin: provider.origin || '',
        baseURL: provider.baseURL || '',
        model: provider.model,
        status: getAIErrorStatus(error) || '',
        retryAfterSeconds: getAIErrorRetryAfterSeconds(error) || '',
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('roleplay text provider request failed');
}

export async function POST(request: Request) {
  try {
    const timer = createRoleplayChatTimer();
    const {
      character,
      input,
      history: requestHistory = [],
      model,
      conversationId,
      requestId,
    }: {
      character?: RoleplayCharacterPrompt;
      input?: string;
      history?: RoleplayChatMessage[];
      model?: string;
      conversationId?: string;
      requestId?: string;
    } = await request.json();
    timer.mark('parse_request');

    if (!character?.name || !input?.trim()) {
      return respErr('invalid roleplay chat params');
    }

    let history = Array.isArray(requestHistory)
      ? requestHistory
          .filter(
            (message) =>
              (message.role === 'user' || message.role === 'character') &&
              typeof message.text === 'string' &&
              message.text.trim()
          )
          .slice(-CHAT_CONTEXT_HISTORY_LIMIT)
      : [];
    const [configs, user] = await Promise.all([
      getRoleplayConfigs(),
      getUserInfo(),
    ]);
    timer.mark('config_and_auth');
    const idempotencyKey = getRoleplayRequestIdempotencyKey(request, requestId);
    const guestReplyCount = user
      ? 0
      : readCookieNumber(request.headers.get('cookie'), GUEST_REPLY_COOKIE);
    if (!user && guestReplyCount >= GUEST_REPLY_LIMIT) {
      return respErr('sign in to continue this story');
    }
    const textProviderCandidates = resolveTextProviderCandidates(
      configs as any,
      {
        requestModel: model,
        characterModel: character.model,
        defaultModel: DEFAULT_MODEL,
      }
    );
    let textProvider =
      textProviderCandidates.find((candidate) => Boolean(candidate.apiKey)) ||
      resolveTextProviderConfig(configs as any, {
        requestModel: model,
        characterModel: character.model,
        defaultModel: DEFAULT_MODEL,
      });
    let selectedModel = textProvider.model;
    timer.mark('resolve_provider');

    let activeConversationId = conversationId || '';
    let activeCharacterId: string | null = null;
    let storedCharacterId: string | null = null;
    let memorySummary = '';
    let userPersonaSummary = '';
    let relationshipState: RoleplayRelationshipState =
      parseRelationshipState('{}');
    let relationshipStateSummary = '';
    let dynamicAddressSummary = '';
    let activeMemories: any[] = [];
    let previousEmotionalHooks: EmotionalHook[] = [];

    if (character.id && !character.id.startsWith('custom-')) {
      try {
        const storedCharacter = await findRoleplayCharacterById(character.id);
        if (storedCharacter) {
          storedCharacterId = storedCharacter.id;
          const isOwner = Boolean(user && storedCharacter.userId === user.id);
          const isPublished =
            storedCharacter.status === RoleplayStatus.PUBLISHED;
          const canChat =
            isPublished &&
            (storedCharacter.visibility === RoleplayVisibility.PUBLIC ||
              isOwner);
          if (!canChat) {
            return respErr(
              isOwner
                ? 'character must be published before chat'
                : 'character not found'
            );
          }
        }
      } catch (error) {
        if (!isMissingRoleplayTable(error)) {
          throw error;
        }
      }
    }
    timer.mark('character_access');

    if (user) {
      try {
        const [dbUser, existingConversation] = await Promise.all([
          findUserById(user.id).catch(() => null),
          activeConversationId
            ? findRoleplayConversationById(activeConversationId)
            : Promise.resolve(undefined),
        ]);
        const persona = parseUserPersona((dbUser as any)?.persona);
        userPersonaSummary = renderUserPersonaSystemMessage(persona);
        dynamicAddressSummary = renderDynamicAddressSystemMessage({
          persona,
          history,
          input,
        });

        let conversation = existingConversation;
        let didCreateConversation = false;

        if (!conversation || conversation.userId !== user.id) {
          conversation = await createRoleplayConversation({
            userId: user.id,
            characterId: storedCharacterId,
            status: RoleplayStatus.CREATED,
            title: character.name,
            provider: textProvider.provider,
            model: selectedModel,
            characterSnapshot: serializeJson(character),
            memorySummary: '',
            state: serializeRelationshipState(relationshipState),
            metadata: serializeJson({ source: 'talkie-mvp' }),
          });
          didCreateConversation = true;
        }

        activeConversationId = conversation.id;
        activeCharacterId = conversation.characterId || storedCharacterId;
        if (didCreateConversation && activeCharacterId) {
          incrementCharacterCounter(activeCharacterId, 'chatCount', 1).catch(
            (error) => {
              console.log('increment roleplay chat count failed:', error);
            }
          );
        }
        relationshipState = parseRelationshipState(
          (conversation as any).state ?? '{}'
        );
        relationshipStateSummary =
          renderRelationshipStateSystemMessage(relationshipState);

        const shouldLoadStoredMessages = history.length === 0;
        const [memories, storedMessages] = await Promise.all([
          getRoleplayMemories({
            userId: user.id,
            characterId: activeCharacterId,
            conversationId: conversation.id,
          }),
          getRoleplayMessages({
            conversationId: conversation.id,
            limit: shouldLoadStoredMessages
              ? STORED_HISTORY_BACKFILL_LIMIT
              : RECENT_STORED_MESSAGE_LIMIT,
            latest: true,
          }),
        ]);
        activeMemories = memories;
        previousEmotionalHooks = getPreviousEmotionalHooks(storedMessages);
        memorySummary = [
          conversation.memorySummary,
          ...memories.map((memory: any) => memory.summary),
        ]
          .filter(Boolean)
          .join('\n');

        if (
          shouldLoadStoredMessages &&
          storedMessages.length > history.length
        ) {
          history = storedMessages.map((message) => ({
            role: message.role === 'user' ? 'user' : 'character',
            text: message.text,
          }));
        }
      } catch (error) {
        if (!isMissingRoleplayTable(error)) {
          throw error;
        }
        console.log('roleplay persistence skipped, migration required');
        activeConversationId = '';
      }
    }
    timer.mark('conversation_context');

    if (!textProvider.apiKey) {
      throw new Error(getMissingTextProviderMessage());
    }

    const billingPreview = user
      ? await assertRoleplayCreditsAvailable({
          userId: user.id,
          action: 'roleplay_text',
          idempotencyKey,
        })
      : { costCredits: 0, freePlay: false };
    timer.mark('billing_check');

    const layeredSystem = buildLayeredSystemMessages(character);
    const styleExamples = parseCharacterStyleExamples(character);
    const periodicSystemMessages = layeredSystem
      ? [
          buildPeriodicPersonalityReinforcement({
            card: layeredSystem.card,
            history,
          }),
        ].filter((message): message is ModelMessage => Boolean(message))
      : [];
    const insideJokeSystemMessages = [
      buildInsideJokesCallbackMessage(relationshipState),
    ].filter((message): message is ModelMessage => Boolean(message));

    const emotionalHookPlan = layeredSystem
      ? buildEmotionalHookSystemMessages({
          card: layeredSystem.card,
          relationshipState,
          history,
          input,
          memories: activeMemories,
          memorySummary,
        })
      : { messages: [], hooks: [] };

    const photoIntent = detectPhotoIntent({
      textProvider,
      character,
      history,
      input,
    });
    timer.mark('photo_intent');
    const shouldGeneratePhoto = photoIntent.wantsImage;
    let replyText = '';
    if (shouldGeneratePhoto) {
      replyText = buildPhotoHoldingReply({
        character,
        shotIntent: photoIntent.shotIntent,
      }).trim();
    } else {
      const generation = await generateTextWithProviderFallback(
        textProviderCandidates,
        (provider) => {
          const messages = layeredSystem
            ? buildConversation({
                history,
                input,
                memorySummary,
                userPersonaSummary,
                relationshipStateSummary,
                dynamicAddressSummary,
                styleExamples,
                systemMessages: layeredSystem.messages,
                periodicSystemMessages,
                insideJokeSystemMessages,
                emotionalHookSystemMessages: emotionalHookPlan.messages,
                preUserSystemMessages: layeredSystem.preUserMessages,
              })
            : buildConversation({
                history,
                input,
                memorySummary,
                userPersonaSummary,
                relationshipStateSummary,
                dynamicAddressSummary,
                styleExamples,
                insideJokeSystemMessages,
              });

          if (shouldUseDirectOpenAICompatibleProvider(provider)) {
            return withTimeout(
              generateDirectOpenAICompatibleText({
                provider,
                system: layeredSystem
                  ? undefined
                  : buildSystemPrompt(character),
                messages,
                temperature: 0.92,
                maxOutputTokens: 420,
              }),
              AI_TIMEOUT_MS
            );
          }

          return withTimeout(
            generateText(
              layeredSystem
                ? {
                    model: createOpenAICompatibleChatModel(provider),
                    messages,
                    temperature: 0.92,
                    maxOutputTokens: 420,
                  }
                : {
                    model: createOpenAICompatibleChatModel(provider),
                    system: buildSystemPrompt(character),
                    messages,
                    temperature: 0.92,
                    maxOutputTokens: 420,
                  }
            ),
            AI_TIMEOUT_MS
          );
        }
      );
      textProvider = generation.textProvider;
      selectedModel = textProvider.model;
      replyText = generation.result.text.trim();
    }
    timer.mark('generate_reply');

    if (!replyText) {
      throw new Error('roleplay LLM returned an empty response');
    }

    let userMessageId = '';
    let characterMessageId = '';

    const consumedCredit = user
      ? await consumeRoleplayCredits({
          userId: user.id,
          action: 'roleplay_text',
          description: 'roleplay text reply',
          metadata: {
            characterId: character.id || '',
            conversationId: activeConversationId || '',
            model: selectedModel,
          },
          idempotencyKey,
        })
      : null;
    timer.mark('consume_credits');

    if (user && activeConversationId) {
      const userMessage = await createRoleplayMessage({
        userId: user.id,
        conversationId: activeConversationId,
        status: RoleplayStatus.CREATED,
        role: 'user',
        text: input,
        provider: textProvider.provider,
        model: selectedModel,
        metadata: serializeJson({
          source: 'talkie-mvp',
          previousEmotionalHooks,
        }),
      });
      userMessageId = userMessage.id;

      const characterMessage = await createRoleplayMessage({
        userId: user.id,
        conversationId: activeConversationId,
        status: RoleplayStatus.CREATED,
        role: 'character',
        text: replyText,
        provider: textProvider.provider,
        model: selectedModel,
        metadata: serializeJson({
          source: 'talkie-mvp',
          emotionalHooks: emotionalHookPlan.hooks,
          imageRequest: shouldGeneratePhoto
            ? {
                requestText: photoIntent.requestText,
                shotIntent: photoIntent.shotIntent,
              }
            : undefined,
        }),
      });
      characterMessageId = characterMessage.id;

      const persistQualityEvents = async () => {
        await Promise.all([
          createRoleplayQualityEvent({
            userId: user.id,
            characterId: activeCharacterId,
            conversationId: activeConversationId,
            messageId: userMessage.id,
            eventType: 'user_message_sent',
            value: input.length,
            metadata: serializeJson({ source: 'chat', length: input.length }),
          }),
          createRoleplayQualityEvent({
            userId: user.id,
            characterId: activeCharacterId,
            conversationId: activeConversationId,
            messageId: characterMessage.id,
            eventType: 'character_reply_generated',
            value: replyText.length,
            metadata: serializeJson({
              source: 'chat',
              length: replyText.length,
              model: selectedModel,
              imageIntent: shouldGeneratePhoto,
            }),
          }),
          ...emotionalHookPlan.hooks.map((hook) =>
            createRoleplayQualityEvent({
              userId: user.id,
              characterId: activeCharacterId,
              conversationId: activeConversationId,
              messageId: characterMessage.id,
              eventType: `${hook.type}_prompted`,
              value: 1,
              metadata: serializeJson({
                source: 'chat',
                hook,
                model: selectedModel,
              }),
            })
          ),
          ...(previousEmotionalHooks.length
            ? [
                createRoleplayQualityEvent({
                  userId: user.id,
                  characterId: activeCharacterId,
                  conversationId: activeConversationId,
                  messageId: userMessage.id,
                  eventType: 'emotional_hook_user_followup',
                  value: input.length,
                  metadata: serializeJson({
                    source: 'chat',
                    previousHooks: previousEmotionalHooks,
                    length: input.length,
                  }),
                }),
              ]
            : []),
        ]);

        const userTurnCount =
          history.filter((message) => message.role === 'user').length + 1;
        if ([10, 30].includes(userTurnCount)) {
          await createRoleplayQualityEvent({
            userId: user.id,
            characterId: activeCharacterId,
            conversationId: activeConversationId,
            messageId: userMessage.id,
            eventType: `conversation_reached_${userTurnCount}_turns`,
            value: userTurnCount,
            metadata: serializeJson({ source: 'chat' }),
          });
        }
      };

      void persistQualityEvents().catch((error) => {
        if (!isMissingRoleplayTable(error)) {
          console.log('roleplay quality events skipped:', error);
          return;
        }
        console.log('roleplay quality events skipped, migration required');
      });

      const nextMemorySummary = buildAutoMemorySummary({
        previous: memorySummary,
        character,
        history,
        input,
        reply: replyText,
      });
      const nextRelationshipState = updateRelationshipState({
        previous: relationshipState,
        input,
        reply: replyText,
      });
      const unlockedMilestoneKeys = emotionalHookPlan.hooks
        .map((hook) => hook.milestoneKey)
        .filter((key): key is string => Boolean(key));
      if (unlockedMilestoneKeys.length) {
        nextRelationshipState.unlockedMilestones = [
          ...new Set([
            ...nextRelationshipState.unlockedMilestones,
            ...unlockedMilestoneKeys,
          ]),
        ].slice(0, 8);
      }
      void Promise.all([
        upsertRoleplayConversationMemory({
          id: activeConversationId,
          memorySummary: nextMemorySummary,
        }),
        updateRoleplayConversation(activeConversationId, {
          characterId: activeCharacterId,
          provider: textProvider.provider,
          model: selectedModel,
          state: serializeRelationshipState(nextRelationshipState),
        }),
      ]).catch((error) => {
        console.log('roleplay conversation state update skipped:', error);
      });

      if (shouldRunAutoMemoryExtraction()) {
        void extractAndStoreRoleplayFacts({
          userId: user.id,
          characterId: activeCharacterId,
          conversationId: activeConversationId,
          characterName: character.name,
          userText: input,
          characterText: replyText,
          history,
          textProvider,
        }).catch((error) => {
          if (isRoleplayFactExtractionTimeout(error)) {
            console.log('roleplay auto memory extraction skipped: timed out');
            return;
          }
          console.log('roleplay auto memory extraction skipped:', error);
        });
      }
    }
    timer.mark('persist_messages');

    const response = respData({
      text: replyText,
      provider: textProvider.provider,
      conversationId: activeConversationId,
      userMessageId,
      characterMessageId,
      authenticated: Boolean(user),
      persisted: Boolean(user && activeConversationId),
      billing: {
        action: 'roleplay_text',
        costCredits: billingPreview.costCredits,
        freePlay: billingPreview.freePlay,
        consumedCreditId: consumedCredit?.id || '',
      },
      guestUsage: !user
        ? {
            replies: guestReplyCount + 1,
            limit: GUEST_REPLY_LIMIT,
            softPrompt: guestReplyCount + 1 >= 3,
            hardGate: guestReplyCount + 1 >= GUEST_REPLY_LIMIT,
          }
        : undefined,
      imageRequest: shouldGeneratePhoto
        ? {
            shouldGenerate: true,
            requestText: photoIntent.requestText || input.trim(),
            shotIntent: photoIntent.shotIntent,
            holdingText: replyText,
          }
        : undefined,
    } satisfies RoleplayReply & { provider: string });

    if (!user) {
      response.headers.set(
        'Set-Cookie',
        `${GUEST_REPLY_COOKIE}=${guestReplyCount + 1}; Path=/; Max-Age=2592000; SameSite=Lax`
      );
    }

    timer.logIfSlow({
      provider: textProvider.provider,
      model: selectedModel,
      authenticated: Boolean(user),
      photoIntent: shouldGeneratePhoto,
      persisted: Boolean(user && activeConversationId),
    });

    return response;
  } catch (e: any) {
    if (isRoleplayInsufficientCreditsError(e)) {
      return Response.json(
        {
          code: -1,
          message: e.message,
          data: e.data,
        },
        { status: 200 }
      );
    }
    const error = normalizeChatError(e);
    console.log('roleplay chat failed:', {
      status: error.status,
      message: error.message,
      retryAfterSeconds: getAIErrorRetryAfterSeconds(e) || '',
    });
    return Response.json(
      {
        code: -1,
        message: error.message,
      },
      { status: error.status }
    );
  }
}
