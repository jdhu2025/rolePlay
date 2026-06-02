import { generateText } from 'ai';

import { PERMISSIONS } from '@/core/rbac';
import {
  createOpenAICompatibleChatModel,
  getMissingTextProviderMessage,
  resolveTextProviderConfig,
} from '@/shared/lib/ai-provider';
import { respData, respErr } from '@/shared/lib/resp';
import {
  createRoleplayQualityEvaluation,
  getRecentRoleplayQualitySamples,
  isMissingRoleplayTable,
  safeJsonParse,
  serializeJson,
} from '@/shared/models/roleplay';
import { getRoleplayAIConfigs } from '@/shared/lib/server/roleplay-ai-config';
import { getUserInfo } from '@/shared/models/user';
import { hasPermission } from '@/shared/services/rbac';

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const AI_TIMEOUT_MS = 90_000;

export const maxDuration = 120;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error('roleplay quality evaluation timed out')),
        timeoutMs
      );
    }),
  ]);
}

function clampScore(value: unknown) {
  return Math.max(1, Math.min(5, Math.round(Number(value) || 1)));
}

function parseEvaluation(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = match ? safeJsonParse<Record<string, any>>(match[0], {}) : {};
  const rawAudit =
    parsed.cardAudit && typeof parsed.cardAudit === 'object'
      ? parsed.cardAudit
      : {};
  const conflicts = Array.isArray(rawAudit.conflicts)
    ? rawAudit.conflicts
        .map((conflict: any) => ({
          severity: ['low', 'medium', 'high'].includes(conflict?.severity)
            ? conflict.severity
            : 'medium',
          type: String(conflict?.type || 'character_consistency_conflict')
            .slice(0, 80),
          fields: Array.isArray(conflict?.fields)
            ? conflict.fields.map(String).slice(0, 6)
            : [],
          evidence: String(conflict?.evidence || '').slice(0, 700),
          recommendation: String(conflict?.recommendation || '').slice(0, 700),
        }))
        .filter((conflict: any) => conflict.evidence || conflict.recommendation)
        .slice(0, 8)
    : [];
  const auditSuggestions = Array.isArray(rawAudit.promptFixSuggestions)
    ? rawAudit.promptFixSuggestions.map(String).slice(0, 8)
    : [];
  return {
    voiceScore: clampScore(parsed.voiceScore),
    valuesScore: clampScore(parsed.valuesScore),
    relationshipScore: clampScore(parsed.relationshipScore),
    immersionScore: clampScore(parsed.immersionScore),
    oocScore: clampScore(parsed.oocScore),
    summary: String(parsed.summary || '').slice(0, 800),
    issues: Array.isArray(parsed.issues)
      ? parsed.issues.map(String).slice(0, 6)
      : [],
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations.map(String).slice(0, 6)
      : [],
    cardAudit: {
      identityConsistency: clampScore(rawAudit.identityConsistency),
      visualConsistency: clampScore(rawAudit.visualConsistency),
      voicePresetConsistency: clampScore(rawAudit.voicePresetConsistency),
      relationshipConsistency: clampScore(rawAudit.relationshipConsistency),
      personaConsistency: clampScore(rawAudit.personaConsistency),
      replyConsistency: clampScore(rawAudit.replyConsistency),
      overallRisk: ['low', 'medium', 'high'].includes(rawAudit.overallRisk)
        ? rawAudit.overallRisk
        : conflicts.some((conflict: any) => conflict.severity === 'high')
          ? 'high'
          : conflicts.length
            ? 'medium'
            : 'low',
      conflicts,
      promptFixSuggestions: auditSuggestions,
      summary: String(rawAudit.summary || '').slice(0, 900),
    },
  };
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const isAdmin = await hasPermission(user.id, PERMISSIONS.ADMIN_ACCESS);
    if (!isAdmin) return respErr('forbidden');

    const body = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(20, Number(body.limit) || 8));
    const characterId =
      typeof body.characterId === 'string' && body.characterId.trim()
        ? body.characterId.trim()
        : undefined;

    const [configs, samples] = await Promise.all([
      getRoleplayAIConfigs(),
      getRecentRoleplayQualitySamples({ characterId, limit }),
    ]);
    const textProvider = resolveTextProviderConfig(configs as any, {
      defaultModel: DEFAULT_MODEL,
    });
    if (!textProvider.apiKey) {
      throw new Error(getMissingTextProviderMessage());
    }

    const evaluated = [];
    for (const sample of samples) {
      const prompt = [
        'You are evaluating roleplay character quality and internal character-card consistency. Score each dimension from 1 to 5 where 5 is excellent.',
        'Return JSON only with: voiceScore, valuesScore, relationshipScore, immersionScore, oocScore, summary, issues[], recommendations[], cardAudit{}.',
        'oocScore means "stays in character"; 5 is no OOC risk, 1 is severe OOC.',
        [
          'cardAudit shape:',
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
          'Character-card consistency checklist:',
          '- gender vs imageStyleSuffix / visualIdentity / personalityCard.appearance / intro / settings.',
          '- age vs visual words such as teen, school, student, mature, older, etc. Flag only when the age/role is actually inconsistent.',
          '- relationship vs opening intimacy and current reply intimacy.',
          '- coreTraits vs opening / styleExamples / current reply.',
          '- negativeAnchors vs opening / styleExamples / current reply.',
          '- voicePreset / voice direction vs gender, age, temperament, and speaking style.',
          '- scene vs image prompt / visual identity / current reply setting.',
          '- current reply vs personalityCard and relationship state.',
          '- Content intensity must fit the character style, adult relationship type, relationship stage, and user context. Adult boyfriend/girlfriend or companion roles may be flirtatious, sensual, or sexually suggestive when that matches the role. Do not flag NSFW or sexy wording by itself; flag it only when it conflicts with the character positioning, pushes intimacy too fast, breaks immersion, or violates platform boundaries.',
        ].join('\n'),
        `Character:\n${JSON.stringify({
          id: sample.character.id,
          name: sample.character.name,
          age: sample.character.age,
          gender: sample.character.gender,
          tagline: sample.character.tagline,
          intro: sample.character.intro,
          opening: sample.character.opening,
          relationship: sample.character.relationship,
          scene: sample.character.scene,
          style: sample.character.style,
          voice: sample.character.voice,
          voicePreset: (sample.character as any).voicePreset,
          personality: sample.character.personality,
          personalityCard: sample.character.personalityCard,
          visualIdentity: (sample.character as any).visualIdentity,
          imageStyleSuffix: (sample.character as any).imageStyleSuffix,
          styleExamples: (sample.character as any).styleExamples,
          formatStyle: (sample.character as any).formatStyle,
          settings: sample.character.settings,
        }).slice(0, 7000)}`,
        `Conversation memory:\n${sample.conversation.memorySummary.slice(0, 1800)}`,
        `Character reply to judge:\n${sample.message.text}`,
      ].join('\n\n');

      const result = await withTimeout(
        generateText({
          model: createOpenAICompatibleChatModel(textProvider),
          prompt,
          temperature: 0.1,
          maxOutputTokens: 700,
        }),
        AI_TIMEOUT_MS
      );
      const evaluation = parseEvaluation(result.text);
      const stored = await createRoleplayQualityEvaluation({
        characterId: sample.character.id,
        conversationId: sample.conversation.id,
        sampleMessageId: sample.message.id,
        judgeModel: textProvider.model,
        voiceScore: evaluation.voiceScore,
        valuesScore: evaluation.valuesScore,
        relationshipScore: evaluation.relationshipScore,
        immersionScore: evaluation.immersionScore,
        oocScore: evaluation.oocScore,
        summary: evaluation.summary,
        issues: serializeJson(evaluation.issues),
        recommendations: serializeJson(evaluation.recommendations),
        metadata: serializeJson({
          source: 'admin_manual_evaluate',
          cardAudit: evaluation.cardAudit,
        }),
      });
      evaluated.push(stored.id);
    }

    return respData({ evaluated: evaluated.length, ids: evaluated });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay quality tables not migrated');
    }
    console.log('run roleplay quality evaluation failed:', e);
    return respErr(e.message || 'run roleplay quality evaluation failed');
  }
}
