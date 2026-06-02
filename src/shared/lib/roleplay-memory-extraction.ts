import { generateText } from 'ai';

import {
  createOpenAICompatibleChatModel,
  type TextProviderConfig,
} from '@/shared/lib/ai-provider';
import {
  createRoleplayMemory,
  getRoleplayMemories,
  RoleplayVisibility,
  serializeJson,
} from '@/shared/models/roleplay';

type RoleplayFactMessage = {
  role: 'user' | 'character';
  text: string;
};

type ExtractRoleplayFactsInput = {
  characterName: string;
  userText: string;
  characterText: string;
  history?: RoleplayFactMessage[];
  textProvider: TextProviderConfig;
  timeoutMs?: number;
};

type StoreRoleplayFactsInput = ExtractRoleplayFactsInput & {
  userId: string;
  characterId?: string | null;
  conversationId?: string | null;
};

const FACT_EXTRACTION_TIMEOUT_MS = 18_000;
const FACT_EXTRACTION_TIMEOUT_MESSAGE = 'roleplay fact extraction timed out';

function readFactExtractionTimeoutMs() {
  const raw =
    process.env.ROLEPLAY_FACT_EXTRACTION_TIMEOUT_MS ||
    process.env.roleplay_fact_extraction_timeout_ms ||
    '';
  const value = Number.parseInt(raw, 10);

  return Number.isFinite(value) && value > 0
    ? value
    : FACT_EXTRACTION_TIMEOUT_MS;
}

export function isRoleplayFactExtractionTimeout(error: unknown) {
  return (
    error instanceof Error && error.message === FACT_EXTRACTION_TIMEOUT_MESSAGE
  );
}

function parseFactList(raw: string): string[] {
  const text = raw.trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    const facts = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.facts)
        ? parsed.facts
        : [];
    return normalizeFactList(facts);
  } catch {
    return normalizeFactList(
      text.split('\n').map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
    );
  }
}

function normalizeFactList(input: unknown[]): string[] {
  const seen = new Set<string>();
  const facts: string[] = [];

  for (const item of input) {
    if (typeof item !== 'string') continue;
    const fact = item.trim().replace(/\s+/g, ' ').slice(0, 220);
    if (fact.length < 8) continue;

    const key = fact.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    facts.push(fact);
    if (facts.length >= 3) break;
  }

  return facts;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error(FACT_EXTRACTION_TIMEOUT_MESSAGE)),
        timeoutMs
      );
    }),
  ]);
}

export async function extractRoleplayFacts({
  characterName,
  userText,
  characterText,
  history = [],
  textProvider,
  timeoutMs = readFactExtractionTimeoutMs(),
}: ExtractRoleplayFactsInput): Promise<string[]> {
  if (!textProvider.apiKey) return [];

  const recent = history
    .slice(-8)
    .map((message) => `${message.role}: ${message.text}`)
    .join('\n');

  const result = await withTimeout(
    generateText({
      model: createOpenAICompatibleChatModel(textProvider),
      system: [
        'Extract durable private memory facts from a roleplay chat.',
        'Return JSON only: {"facts":["..."]}.',
        'Write 0-3 concise facts that may matter in future conversations.',
        'Prefer user preferences, relationship milestones, names, promises, boundaries, and recurring topics.',
        'Do not store transient mood, generic compliments, explicit sexual content, secrets that look unsafe, or facts about the assistant implementation.',
      ].join('\n'),
      prompt: [
        `Character: ${characterName}`,
        recent ? `Recent context:\n${recent}` : '',
        `Latest user message: ${userText}`,
        `Latest ${characterName} reply: ${characterText}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      temperature: 0.1,
      maxOutputTokens: 220,
    }),
    timeoutMs
  );

  return parseFactList(result.text);
}

export async function extractAndStoreRoleplayFacts({
  userId,
  characterId,
  conversationId,
  ...input
}: StoreRoleplayFactsInput): Promise<string[]> {
  const facts = await extractRoleplayFacts(input);
  if (!facts.length) return [];

  const existing = await getRoleplayMemories({
    userId,
    characterId,
    conversationId,
  }).catch(() => []);
  const existingSummaries = new Set(
    existing.map((memory: any) => String(memory.summary || '').toLowerCase())
  );

  const saved: string[] = [];
  for (const fact of facts) {
    if (existingSummaries.has(fact.toLowerCase())) continue;
    await createRoleplayMemory({
      userId,
      characterId,
      conversationId,
      summary: fact,
      visibility: RoleplayVisibility.PRIVATE,
      metadata: serializeJson({
        source: 'auto',
        extractor: input.textProvider.model,
      }),
    });
    saved.push(fact);
  }

  return saved;
}
