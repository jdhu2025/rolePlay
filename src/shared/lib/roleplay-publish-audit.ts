import { generateText } from 'ai';

import {
  createOpenAICompatibleChatModel,
  getMissingTextProviderMessage,
  resolveTextProviderConfig,
  type TextProviderConfig,
} from '@/shared/lib/ai-provider';
import { normalizeFormatStyle } from '@/shared/lib/roleplay-format-style';
import {
  normalizePersonalityCard,
  normalizeVoicePreset,
  parsePersonalityCard,
} from '@/shared/lib/roleplay-personality';
import { normalizeStyleExamples } from '@/shared/lib/roleplay-style-examples';
import { getRoleplayAIConfigs } from '@/shared/lib/server/roleplay-ai-config';
import {
  createRoleplayQualityEvaluation,
  safeJsonParse,
  serializeJson,
  type RoleplayCharacter,
} from '@/shared/models/roleplay';


const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 90_000;

export type CharacterAuditRisk = 'low' | 'medium' | 'high';

export type CharacterAuditConflict = {
  severity: CharacterAuditRisk;
  type: string;
  fields: string[];
  evidence: string;
  recommendation: string;
};

export type CharacterPublishAudit = {
  passed: boolean;
  overallRisk: CharacterAuditRisk;
  summary: string;
  conflicts: CharacterAuditConflict[];
  promptFixSuggestions: string[];
  scores: {
    identityConsistency: number;
    visualConsistency: number;
    voicePresetConsistency: number;
    relationshipConsistency: number;
    personaConsistency: number;
    replyConsistency: number;
  };
  judgeModel: string;
};

export type CharacterAuditRepair = {
  summary: string;
  patch: {
    age?: number;
    tagline?: string;
    intro?: string;
    opening?: string;
    settings?: string;
    personalityCard?: Record<string, unknown>;
    imageStyleSuffix?: string;
    voicePreset?: string;
    styleExamples?: unknown[];
    formatStyle?: Record<string, unknown>;
  };
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error('roleplay publish audit timed out')),
        timeoutMs
      );
    }),
  ]);
}

function clampScore(value: unknown) {
  return Math.max(1, Math.min(5, Math.round(Number(value) || 1)));
}

function normalizeRisk(value: unknown): CharacterAuditRisk {
  return value === 'high' || value === 'medium' || value === 'low'
    ? value
    : 'medium';
}

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? safeJsonParse<Record<string, any>>(match[0], {}) : {};
}

function parseAudit(text: string, judgeModel: string): CharacterPublishAudit {
  const parsed = extractJson(text);
  const conflicts: CharacterAuditConflict[] = Array.isArray(parsed.conflicts)
    ? parsed.conflicts
        .map((conflict: any) => ({
          severity: normalizeRisk(conflict?.severity),
          type: String(
            conflict?.type || 'character_consistency_conflict'
          ).slice(0, 80),
          fields: Array.isArray(conflict?.fields)
            ? conflict.fields.map(String).slice(0, 6)
            : [],
          evidence: String(conflict?.evidence || '').slice(0, 700),
          recommendation: String(conflict?.recommendation || '').slice(0, 700),
        }))
        .filter((conflict: CharacterAuditConflict) =>
          Boolean(conflict.evidence || conflict.recommendation)
        )
        .slice(0, 8)
    : [];
  const promptFixSuggestions = Array.isArray(parsed.promptFixSuggestions)
    ? parsed.promptFixSuggestions.map(String).slice(0, 8)
    : [];
  const inferredRisk = conflicts.some(
    (conflict) => conflict.severity === 'high'
  )
    ? 'high'
    : conflicts.some((conflict) => conflict.severity === 'medium')
      ? 'medium'
      : 'low';
  const overallRisk = parsed.overallRisk
    ? normalizeRisk(parsed.overallRisk)
    : inferredRisk;
  const passed =
    overallRisk === 'low' &&
    !conflicts.some(
      (conflict) =>
        conflict.severity === 'high' || conflict.severity === 'medium'
    );

  return {
    passed,
    overallRisk,
    summary: String(parsed.summary || '').slice(0, 900),
    conflicts,
    promptFixSuggestions,
    scores: {
      identityConsistency: clampScore(parsed.identityConsistency),
      visualConsistency: clampScore(parsed.visualConsistency),
      voicePresetConsistency: clampScore(parsed.voicePresetConsistency),
      relationshipConsistency: clampScore(parsed.relationshipConsistency),
      personaConsistency: clampScore(parsed.personaConsistency),
      replyConsistency: clampScore(parsed.replyConsistency),
    },
    judgeModel,
  };
}

function compactCharacter(character: RoleplayCharacter) {
  return {
    id: character.id,
    name: character.name,
    age: character.age,
    gender: character.gender,
    tagline: character.tagline,
    intro: character.intro,
    opening: character.opening,
    relationship: character.relationship,
    scene: character.scene,
    style: character.style,
    voice: character.voice,
    voicePreset: (character as any).voicePreset,
    personality: safeJsonParse<string[]>(character.personality, []),
    personalityCard: parsePersonalityCard(
      (character as any).personalityCard ?? '{}'
    ),
    visualIdentity: safeJsonParse<Record<string, unknown>>(
      character.visualIdentity,
      {}
    ),
    imageStyleSuffix: (character as any).imageStyleSuffix ?? '',
    styleExamples: safeJsonParse<unknown[]>(
      (character as any).styleExamples ?? '[]',
      []
    ),
    formatStyle: safeJsonParse<Record<string, unknown>>(
      (character as any).formatStyle ?? '{}',
      {}
    ),
    settings: character.settings,
  };
}

async function resolvePublishAuditTextProvider() {
  const configs = await getRoleplayAIConfigs();
  const textProvider = resolveTextProviderConfig(configs as any, {
    defaultModel: DEFAULT_MODEL,
  });
  if (!textProvider.apiKey) {
    throw new Error(getMissingTextProviderMessage());
  }
  return textProvider;
}

function buildAuditPrompt(character: RoleplayCharacter) {
  return [
    'You are a strict pre-publish QA judge for a roleplay character.',
    'The character cannot be published if there are high or medium internal-consistency problems. Drafts are not chat-ready; this audit protects both private and public publishing.',
    'Return JSON only with:',
    [
      '{',
      '"identityConsistency":1-5,',
      '"visualConsistency":1-5,',
      '"voicePresetConsistency":1-5,',
      '"relationshipConsistency":1-5,',
      '"personaConsistency":1-5,',
      '"replyConsistency":1-5,',
      '"overallRisk":"low|medium|high",',
      '"conflicts":[{"severity":"low|medium|high","type":"short_key","fields":["fieldA","fieldB"],"evidence":"specific evidence","recommendation":"specific fix"}],',
      '"promptFixSuggestions":["specific field or prompt edits"],',
      '"summary":"short audit summary"',
      '}',
    ].join('\n'),
    [
      'Blocking rules:',
      '- Mark high/medium when identity, age, gender, visual prompt, voice preset, relationship stage, opening line, speaking style, values, or negative anchors visibly conflict.',
      '- Mark high/medium when the opening starts too intimate for the relationship, contradicts a negative anchor, or breaks the character voice.',
      '- Mark high/medium when the character has too little usable personality detail to sustain chat.',
      '- Do not mark low-severity style polish as blocking.',
      '- Adult companion/boyfriend/girlfriend roles may be flirtatious or sensual when that matches the role and relationship stage. Do not flag sexy wording by itself; flag only when it conflicts with positioning, pushes intimacy too fast, breaks immersion, or violates platform boundaries.',
      '- Mention exact fields in conflicts.fields so the creator can fix manually.',
    ].join('\n'),
    `Character draft:\n${JSON.stringify(compactCharacter(character)).slice(
      0,
      9000
    )}`,
  ].join('\n\n');
}

export async function runRoleplayCharacterPublishAudit(
  character: RoleplayCharacter,
  options?: { persist?: boolean; textProvider?: TextProviderConfig }
): Promise<CharacterPublishAudit> {
  const textProvider =
    options?.textProvider ?? (await resolvePublishAuditTextProvider());
  const result = await withTimeout(
    generateText({
      model: createOpenAICompatibleChatModel(textProvider),
      prompt: buildAuditPrompt(character),
      temperature: 0.1,
      maxOutputTokens: 900,
    }),
    AI_TIMEOUT_MS
  );

  const audit = parseAudit(result.text, textProvider.model);

  if (options?.persist !== false) {
    await createRoleplayQualityEvaluation({
      characterId: character.id,
      conversationId: null,
      sampleMessageId: null,
      judgeModel: textProvider.model,
      voiceScore: audit.scores.voicePresetConsistency,
      valuesScore: audit.scores.personaConsistency,
      relationshipScore: audit.scores.relationshipConsistency,
      immersionScore: audit.scores.identityConsistency,
      oocScore: audit.passed ? 5 : audit.overallRisk === 'high' ? 1 : 3,
      summary: audit.summary,
      issues: serializeJson(
        audit.conflicts.map((conflict) => conflict.evidence)
      ),
      recommendations: serializeJson(
        audit.conflicts.map((conflict) => conflict.recommendation)
      ),
      metadata: serializeJson({
        source: 'publish_gate',
        cardAudit: {
          ...audit.scores,
          overallRisk: audit.overallRisk,
          conflicts: audit.conflicts,
          promptFixSuggestions: audit.promptFixSuggestions,
          summary: audit.summary,
        },
      }),
    });
  }

  return audit;
}

function applyAuditRepairPatch(
  character: RoleplayCharacter,
  patch: CharacterAuditRepair['patch']
): RoleplayCharacter {
  const nextCard =
    patch.personalityCard && typeof patch.personalityCard === 'object'
      ? normalizePersonalityCard(patch.personalityCard)
      : parsePersonalityCard((character as any).personalityCard ?? '{}');

  return {
    ...character,
    age:
      typeof patch.age === 'number' && Number.isFinite(patch.age)
        ? Math.max(18, Math.min(99, Math.round(patch.age)))
        : character.age,
    tagline:
      typeof patch.tagline === 'string' ? patch.tagline : character.tagline,
    intro: typeof patch.intro === 'string' ? patch.intro : character.intro,
    opening:
      typeof patch.opening === 'string' ? patch.opening : character.opening,
    settings:
      typeof patch.settings === 'string' ? patch.settings : character.settings,
    personalityCard: JSON.stringify(nextCard) as any,
    imageStyleSuffix:
      typeof patch.imageStyleSuffix === 'string'
        ? patch.imageStyleSuffix.trim().slice(0, 600)
        : (character as any).imageStyleSuffix,
    voicePreset:
      typeof patch.voicePreset === 'string'
        ? normalizeVoicePreset(patch.voicePreset)
        : (character as any).voicePreset,
    styleExamples:
      patch.styleExamples !== undefined
        ? serializeJson(normalizeStyleExamples(patch.styleExamples))
        : (character as any).styleExamples,
    formatStyle:
      patch.formatStyle && typeof patch.formatStyle === 'object'
        ? serializeJson(normalizeFormatStyle(patch.formatStyle))
        : (character as any).formatStyle,
  } as RoleplayCharacter;
}

function parseRepair(text: string): CharacterAuditRepair {
  const parsed = extractJson(text);
  const patch =
    parsed.patch && typeof parsed.patch === 'object' ? parsed.patch : {};
  return {
    summary: String(parsed.summary || '').slice(0, 700),
    patch: {
      age:
        typeof patch.age === 'number' && Number.isFinite(patch.age)
          ? Math.max(18, Math.min(99, Math.round(patch.age)))
          : undefined,
      tagline:
        typeof patch.tagline === 'string'
          ? patch.tagline.slice(0, 160)
          : undefined,
      intro:
        typeof patch.intro === 'string'
          ? patch.intro.slice(0, 1200)
          : undefined,
      opening:
        typeof patch.opening === 'string'
          ? patch.opening.slice(0, 1200)
          : undefined,
      settings:
        typeof patch.settings === 'string'
          ? patch.settings.slice(0, 5000)
          : undefined,
      personalityCard:
        patch.personalityCard && typeof patch.personalityCard === 'object'
          ? normalizePersonalityCard(patch.personalityCard)
          : undefined,
      imageStyleSuffix:
        typeof patch.imageStyleSuffix === 'string'
          ? patch.imageStyleSuffix.trim().slice(0, 600)
          : undefined,
      voicePreset:
        typeof patch.voicePreset === 'string'
          ? normalizeVoicePreset(patch.voicePreset)
          : undefined,
      styleExamples: Array.isArray(patch.styleExamples)
        ? normalizeStyleExamples(patch.styleExamples)
        : undefined,
      formatStyle:
        patch.formatStyle && typeof patch.formatStyle === 'object'
          ? normalizeFormatStyle(patch.formatStyle)
          : undefined,
    },
  };
}

export async function generateRoleplayCharacterAuditRepair({
  character,
  audit,
}: {
  character: RoleplayCharacter;
  audit: CharacterPublishAudit;
}): Promise<CharacterAuditRepair> {
  const textProvider = await resolvePublishAuditTextProvider();
  const result = await withTimeout(
    generateText({
      model: createOpenAICompatibleChatModel(textProvider),
      prompt: [
        'You repair roleplay character drafts that failed pre-publish QA.',
        'Return JSON only with { "summary": "...", "patch": { ... } }.',
        'Patch may include: age, tagline, intro, opening, settings, personalityCard, imageStyleSuffix, voicePreset, styleExamples, formatStyle.',
        'If the audit shows an identity mismatch such as age or name disagreement across top-level fields, settings, and personalityCard, include the canonical corrected top-level field in patch as well as any dependent text fields that must be rewritten.',
        'Only rewrite fields needed to resolve the conflicts. Keep the creator intent, character language, and existing names. Do not add explicit sexual content.',
        'The opening must use three-part roleplay shape: *action* + dialogue + *a small open-ended beat*.',
        `Audit conflicts:\n${JSON.stringify({
          overallRisk: audit.overallRisk,
          conflicts: audit.conflicts,
          suggestions: audit.promptFixSuggestions,
        })}`,
        `Character draft:\n${JSON.stringify(compactCharacter(character)).slice(
          0,
          9000
        )}`,
      ].join('\n\n'),
      temperature: 0.35,
      maxOutputTokens: 1400,
    }),
    AI_TIMEOUT_MS
  );

  return parseRepair(result.text);
}

export async function simulateRoleplayCharacterAuditRepair({
  character,
  repair,
}: {
  character: RoleplayCharacter;
  repair: CharacterAuditRepair;
}) {
  const patched = applyAuditRepairPatch(character, repair.patch);
  const audit = await runRoleplayCharacterPublishAudit(patched, { persist: false });
  return { patched, audit };
}
