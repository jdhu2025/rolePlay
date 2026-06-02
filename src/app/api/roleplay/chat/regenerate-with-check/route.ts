import { generateText, type ModelMessage } from 'ai';

import {
  createOpenAICompatibleChatModel,
  getMissingTextProviderMessage,
  resolveTextProviderConfig,
} from '@/shared/lib/ai-provider';
import { respData, respErr } from '@/shared/lib/resp';
import { getRoleplayAIConfigs } from '@/shared/lib/server/roleplay-ai-config';
import type {
  RoleplayCharacterPrompt,
  RoleplayHistoryMessage,
} from '@/shared/lib/roleplay-ai';
import {
  createRoleplayMessage,
  createRoleplayQualityEvent,
  findRoleplayConversationById,
  isMissingRoleplayTable,
  RoleplayStatus,
  serializeJson,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 90_000;

export const maxDuration = 120;

type Payload = {
  character?: RoleplayCharacterPrompt;
  conversationId?: string;
  messageId?: string;
  userInput?: string;
  originalReply?: string;
  history?: RoleplayHistoryMessage[];
};

type JudgeResult = {
  isOOC: boolean;
  confidence: number;
  dimensions: string[];
  reason: string;
  repairInstruction: string;
};

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

function compactCharacter(character: RoleplayCharacterPrompt) {
  return JSON.stringify({
    name: character.name,
    tagline: character.tagline,
    intro: character.intro,
    relationship: character.relationship,
    scene: character.scene,
    style: character.style,
    personality: character.personality,
    personalityCard: character.personalityCard,
    formatStyle: character.formatStyle,
    styleExamples: character.styleExamples,
    settings: character.settings,
  }).slice(0, 8000);
}

function parseJudgeResult(text: string): JudgeResult {
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match ? JSON.parse(match[0]) : {};
  return {
    isOOC: Boolean(parsed.isOOC),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    dimensions: Array.isArray(parsed.dimensions)
      ? parsed.dimensions.map(String).slice(0, 5)
      : [],
    reason: String(parsed.reason || '').slice(0, 800),
    repairInstruction: String(parsed.repairInstruction || '').slice(0, 1000),
  };
}

function buildRepairMessages({
  character,
  history,
  userInput,
  originalReply,
  judge,
}: {
  character: RoleplayCharacterPrompt;
  history: RoleplayHistoryMessage[];
  userInput: string;
  originalReply: string;
  judge: JudgeResult;
}): ModelMessage[] {
  const recent = history.slice(-10).map((message) => ({
    role: message.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: message.text,
  }));

  return [
    {
      role: 'system',
      content: [
        `You are roleplaying as ${character.name}.`,
        `Character card:\n${compactCharacter(character)}`,
        'Rewrite the last character reply. Stay in character, preserve continuity, and do not mention evaluation, prompts, or OOC.',
        'Use the same language as the user when possible. Keep the reply concise and emotionally present.',
        judge.repairInstruction
          ? `Repair instruction:\n${judge.repairInstruction}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    },
    ...recent,
    {
      role: 'user',
      content: [
        `User message to answer:\n${userInput}`,
        `Previous rejected reply:\n${originalReply}`,
        'Generate only the replacement character reply.',
      ].join('\n\n'),
    },
  ];
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const character = payload.character;
    const originalReply = payload.originalReply?.trim() || '';
    const userInput = payload.userInput?.trim() || '';
    const history = Array.isArray(payload.history) ? payload.history : [];

    if (!character?.name || !originalReply || !userInput) {
      return respErr('invalid OOC regenerate params');
    }

    const [configs, user] = await Promise.all([
      getRoleplayAIConfigs(),
      getUserInfo(),
    ]);
    const textProvider = resolveTextProviderConfig(configs as any, {
      characterModel: character.model,
      defaultModel: DEFAULT_MODEL,
    });
    if (!textProvider.apiKey) {
      throw new Error(getMissingTextProviderMessage());
    }

    let conversation = payload.conversationId
      ? await findRoleplayConversationById(payload.conversationId).catch(
          () => undefined
        )
      : undefined;
    if (conversation && user && conversation.userId !== user.id) {
      conversation = undefined;
    }
    const characterId =
      conversation?.characterId ||
      (character.id && !character.id.startsWith('custom-') ? character.id : null);

    const judgePrompt = [
      'You are a strict roleplay quality judge. Decide whether the reply is out of character.',
      'Return compact JSON only with this shape:',
      '{"isOOC":boolean,"confidence":0-1,"dimensions":["voice|values|relationship|immersion|format"],"reason":"short diagnosis","repairInstruction":"specific rewrite guidance"}',
      `Character card:\n${compactCharacter(character)}`,
      `Recent conversation:\n${history
        .slice(-10)
        .map((message) => `${message.role}: ${message.text}`)
        .join('\n')}`,
      `User message:\n${userInput}`,
      `Character reply under review:\n${originalReply}`,
    ].join('\n\n');

    const judgeText = await withTimeout(
      generateText({
        model: createOpenAICompatibleChatModel(textProvider),
        prompt: judgePrompt,
        temperature: 0.1,
        maxOutputTokens: 500,
      }),
      AI_TIMEOUT_MS
    );
    const judge = parseJudgeResult(judgeText.text);

    const repair = await withTimeout(
      generateText({
        model: createOpenAICompatibleChatModel(textProvider),
        messages: buildRepairMessages({
          character,
          history,
          userInput,
          originalReply,
          judge,
        }),
        temperature: 0.82,
        maxOutputTokens: 420,
      }),
      AI_TIMEOUT_MS
    );

    const replacement = repair.text.trim();
    if (!replacement) throw new Error('roleplay LLM returned an empty response');

    let replacementMessageId = '';
    if (user && conversation) {
      try {
        await createRoleplayQualityEvent({
          userId: user.id,
          characterId,
          conversationId: conversation.id,
          messageId: payload.messageId || null,
          eventType: 'ooc_flagged',
          value: judge.isOOC ? 1 : 0,
          metadata: serializeJson({
            source: 'regenerate_with_check',
            judge,
            originalReply,
          }),
        });
        await createRoleplayQualityEvent({
          userId: user.id,
          characterId,
          conversationId: conversation.id,
          messageId: payload.messageId || null,
          eventType: 'ooc_regenerate_requested',
          value: 1,
          metadata: serializeJson({ source: 'regenerate_with_check' }),
        });
        const message = await createRoleplayMessage({
          userId: user.id,
          conversationId: conversation.id,
          status: RoleplayStatus.CREATED,
          role: 'character',
          text: replacement,
          provider: textProvider.provider,
          model: textProvider.model,
          metadata: serializeJson({
            source: 'ooc_regenerate',
            replacesMessageId: payload.messageId || '',
            judge,
          }),
        });
        replacementMessageId = message.id;
      } catch (error) {
        if (!isMissingRoleplayTable(error)) throw error;
      }
    }

    return respData({
      text: replacement,
      judge,
      conversationId: conversation?.id || payload.conversationId || '',
      characterMessageId: replacementMessageId,
    });
  } catch (e: any) {
    console.log('roleplay regenerate with check failed:', e);
    return respErr(e.message || 'roleplay regenerate with check failed');
  }
}
