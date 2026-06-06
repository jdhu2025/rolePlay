import { and, desc, eq, gte } from 'drizzle-orm';

import {
  roleplayCharacter,
  roleplayConversation,
  roleplayMessage,
  roleplayQualityEvaluation,
  roleplayQualityEvent,
} from '@/config/db/schema';
import { db } from '@/core/db';

import {
  RoleplayStatus,
  safeJsonParse,
  type RoleplayCharacter,
  type RoleplayConversation,
  type RoleplayMessage,
  type RoleplayQualityEvaluation,
  type RoleplayQualityEvent,
} from './roleplay';

function avg(values: number[]) {
  const valid = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!valid.length) return 0;
  return (
    Math.round(
      (valid.reduce((sum, value) => sum + value, 0) / valid.length) * 10
    ) / 10
  );
}

function rate(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function topByCount(values: string[], limit = 3) {
  const counts = new Map<string, number>();
  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

const HUMAN_MOMENT_EVENT_TYPES = [
  'first_impression_selected',
  'continuation_hint_shown',
  'wrap_up_clicked',
  'local_fallback_shown',
  'keepsake_voice_clicked',
] as const;

type HumanMomentEventType = (typeof HUMAN_MOMENT_EVENT_TYPES)[number];

const HUMAN_MOMENT_EVENT_LABELS: Record<HumanMomentEventType, string> = {
  first_impression_selected: '首次偏好',
  continuation_hint_shown: '续接提示',
  wrap_up_clicked: '稍后告别',
  local_fallback_shown: '慢首响兜底',
  keepsake_voice_clicked: '纪念语音',
};

function countHumanMomentEvents(events: RoleplayQualityEvent[]) {
  const counts = Object.fromEntries(
    HUMAN_MOMENT_EVENT_TYPES.map((type) => [type, 0])
  ) as Record<HumanMomentEventType, number>;

  events.forEach((event) => {
    if (HUMAN_MOMENT_EVENT_TYPES.includes(event.eventType as HumanMomentEventType)) {
      counts[event.eventType as HumanMomentEventType] += 1;
    }
  });

  return counts;
}

function sumHumanMomentEvents(counts: Record<HumanMomentEventType, number>) {
  return HUMAN_MOMENT_EVENT_TYPES.reduce((sum, type) => sum + counts[type], 0);
}

type CardAuditConflict = {
  severity: 'low' | 'medium' | 'high';
  type: string;
  fields: string[];
  evidence: string;
  recommendation: string;
};

type CardAudit = {
  identityConsistency?: number;
  visualConsistency?: number;
  voicePresetConsistency?: number;
  relationshipConsistency?: number;
  personaConsistency?: number;
  replyConsistency?: number;
  overallRisk?: 'low' | 'medium' | 'high';
  conflicts?: CardAuditConflict[];
  promptFixSuggestions?: string[];
  summary?: string;
};

function parseCardAudit(evaluation: RoleplayQualityEvaluation): CardAudit {
  const metadata = safeJsonParse<Record<string, unknown>>(
    evaluation.metadata,
    {}
  );
  const audit =
    metadata.cardAudit && typeof metadata.cardAudit === 'object'
      ? (metadata.cardAudit as CardAudit)
      : {};
  return {
    ...audit,
    conflicts: Array.isArray(audit.conflicts) ? audit.conflicts : [],
    promptFixSuggestions: Array.isArray(audit.promptFixSuggestions)
      ? audit.promptFixSuggestions
      : [],
  };
}

const RISK_WEIGHT: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function highestRisk(audits: CardAudit[]) {
  const risk = audits
    .map((audit) => audit.overallRisk || 'low')
    .sort((a, b) => (RISK_WEIGHT[b] ?? 0) - (RISK_WEIGHT[a] ?? 0))[0];
  return (risk || 'low') as 'low' | 'medium' | 'high';
}

export async function getRoleplayQualityReport({
  days = 14,
}: {
  days?: number;
} = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [
    characterRows,
    eventRows,
    evaluationRows,
    conversationRows,
    messageRows,
  ] = await Promise.all([
    db()
      .select()
      .from(roleplayCharacter)
      .where(eq(roleplayCharacter.status, RoleplayStatus.PUBLISHED))
      .orderBy(desc(roleplayCharacter.updatedAt))
      .limit(200),
    db()
      .select()
      .from(roleplayQualityEvent)
      .where(
        and(
          eq(roleplayQualityEvent.status, RoleplayStatus.CREATED),
          gte(roleplayQualityEvent.createdAt, since)
        )
      )
      .orderBy(desc(roleplayQualityEvent.createdAt))
      .limit(5000),
    db()
      .select()
      .from(roleplayQualityEvaluation)
      .where(
        and(
          eq(roleplayQualityEvaluation.status, RoleplayStatus.CREATED),
          gte(roleplayQualityEvaluation.createdAt, since)
        )
      )
      .orderBy(desc(roleplayQualityEvaluation.createdAt))
      .limit(1000),
    db()
      .select()
      .from(roleplayConversation)
      .where(
        and(
          eq(roleplayConversation.status, RoleplayStatus.CREATED),
          gte(roleplayConversation.createdAt, since)
        )
      )
      .orderBy(desc(roleplayConversation.createdAt))
      .limit(5000),
    db()
      .select()
      .from(roleplayMessage)
      .where(
        and(
          eq(roleplayMessage.status, RoleplayStatus.CREATED),
          gte(roleplayMessage.createdAt, since)
        )
      )
      .orderBy(desc(roleplayMessage.createdAt))
      .limit(10000),
  ]);
  const characters = characterRows as RoleplayCharacter[];
  const events = eventRows as RoleplayQualityEvent[];
  const evaluations = evaluationRows as RoleplayQualityEvaluation[];
  const conversations = conversationRows as RoleplayConversation[];
  const messages = messageRows as RoleplayMessage[];

  const conversationsByCharacter = new Map<string, RoleplayConversation[]>();
  conversations.forEach((conversation) => {
    if (!conversation.characterId) return;
    const current = conversationsByCharacter.get(conversation.characterId) ?? [];
    current.push(conversation);
    conversationsByCharacter.set(conversation.characterId, current);
  });

  const messagesByConversation = new Map<string, RoleplayMessage[]>();
  messages.forEach((message) => {
    const current = messagesByConversation.get(message.conversationId) ?? [];
    current.push(message);
    messagesByConversation.set(message.conversationId, current);
  });

  const items = characters.map((character) => {
    const characterConversations =
      conversationsByCharacter.get(character.id) ?? [];
    const conversationIds = new Set(
      characterConversations.map((item) => item.id)
    );
    const characterMessages = messages.filter((message) =>
      conversationIds.has(message.conversationId)
    );
    const userMessages = characterMessages.filter(
      (message) => message.role === 'user'
    );
    const characterEvents = events.filter(
      (event) => event.characterId === character.id
    );
    const characterEvaluations = evaluations.filter(
      (evaluation) => evaluation.characterId === character.id
    );
    const regenerateCount = characterEvents.filter(
      (event) =>
        event.eventType === 'regenerate_requested' ||
        event.eventType === 'ooc_regenerate_requested'
    ).length;
    const humanMomentCounts = countHumanMomentEvents(characterEvents);
    const humanMomentTotal = sumHumanMomentEvents(humanMomentCounts);
    const explicitOocCount = characterEvents.filter(
      (event) => event.eventType === 'ooc_flagged'
    ).length;
    const turnCounts = characterConversations.map((conversation) => {
      const count = messagesByConversation.get(conversation.id)?.length ?? 0;
      return Math.ceil(count / 2);
    });
    const avgTurns = avg(turnCounts);
    const avgUserChars = avg(
      userMessages.map((message) => message.text.length)
    );
    const issueLabels = characterEvaluations.flatMap((evaluation) =>
      safeJsonParse<string[]>(evaluation.issues, [])
    );
    const recommendationLabels = characterEvaluations.flatMap((evaluation) =>
      safeJsonParse<string[]>(evaluation.recommendations, [])
    );
    const cardAudits = characterEvaluations.map(parseCardAudit);
    const auditConflicts = cardAudits
      .flatMap((audit) => audit.conflicts ?? [])
      .sort(
        (a, b) =>
          (RISK_WEIGHT[b.severity] ?? 0) - (RISK_WEIGHT[a.severity] ?? 0)
      )
      .slice(0, 8);
    const auditSuggestions = cardAudits
      .flatMap((audit) => audit.promptFixSuggestions ?? [])
      .filter(Boolean)
      .slice(0, 8);
    const auditScores = {
      identity: avg(
        cardAudits.map((audit) => Number(audit.identityConsistency) || 0)
      ),
      visual: avg(
        cardAudits.map((audit) => Number(audit.visualConsistency) || 0)
      ),
      voicePreset: avg(
        cardAudits.map((audit) => Number(audit.voicePresetConsistency) || 0)
      ),
      relationship: avg(
        cardAudits.map((audit) => Number(audit.relationshipConsistency) || 0)
      ),
      persona: avg(
        cardAudits.map((audit) => Number(audit.personaConsistency) || 0)
      ),
      reply: avg(
        cardAudits.map((audit) => Number(audit.replyConsistency) || 0)
      ),
    };
    const rubric = {
      voice: avg(characterEvaluations.map((item) => item.voiceScore)),
      values: avg(characterEvaluations.map((item) => item.valuesScore)),
      relationship: avg(
        characterEvaluations.map((item) => item.relationshipScore)
      ),
      immersion: avg(characterEvaluations.map((item) => item.immersionScore)),
      ooc: avg(characterEvaluations.map((item) => item.oocScore)),
    };
    const lowestRubric = Object.entries(rubric)
      .filter(([, value]) => value > 0)
      .sort((a, b) => a[1] - b[1])[0]?.[0];

    const flags = [
      rate(regenerateCount, Math.max(1, userMessages.length)) >= 12
        ? '重发/不像反馈偏高，优先检查口吻锚点和负面约束'
        : '',
      avgTurns > 0 && avgTurns < 4
        ? '会话轮数偏短，开场和前 3 轮推进可能不够抓人'
        : '',
      avgUserChars > 0 && avgUserChars < 18
        ? '用户回复偏短，角色可能缺少可接话的具体细节'
        : '',
      lowestRubric
        ? `rubric 最弱维度是 ${lowestRubric}，下一轮 prompt 调整应先围绕它`
        : '',
      auditConflicts.some((conflict) => conflict.severity === 'high')
        ? '角色卡存在高风险字段冲突，优先修正人设/视觉/音色/关系设定'
        : '',
      rate(humanMomentCounts.local_fallback_shown, Math.max(1, userMessages.length)) >= 20
        ? '慢首响兜底出现偏多，优先检查首 token、模型路由或供应商延迟'
        : '',
      humanMomentCounts.wrap_up_clicked > 0 && avgTurns < 4
        ? '用户会点“稍后”但平均轮数仍短，告别仪式可能还没形成回访钩子'
        : '',
    ].filter(Boolean);

    return {
      character: {
        id: character.id,
        name: character.name,
        avatarUrl: character.avatarUrl,
        tagline: character.tagline,
      },
      metrics: {
        conversations: characterConversations.length,
        userMessages: userMessages.length,
        avgTurns,
        avgUserChars,
        regenerateCount,
        explicitOocCount,
        regenerateRate: rate(regenerateCount, Math.max(1, userMessages.length)),
        evaluationCount: characterEvaluations.length,
      },
      humanMoments: {
        total: humanMomentTotal,
        firstImpression: humanMomentCounts.first_impression_selected,
        continuationHint: humanMomentCounts.continuation_hint_shown,
        wrapUp: humanMomentCounts.wrap_up_clicked,
        localFallback: humanMomentCounts.local_fallback_shown,
        keepsakeVoice: humanMomentCounts.keepsake_voice_clicked,
        localFallbackRate: rate(
          humanMomentCounts.local_fallback_shown,
          Math.max(1, userMessages.length)
        ),
      },
      rubric,
      topIssues: topByCount(issueLabels),
      topRecommendations: topByCount(recommendationLabels),
      cardAudit: {
        overallRisk: highestRisk(cardAudits),
        scores: auditScores,
        conflicts: auditConflicts,
        promptFixSuggestions: auditSuggestions,
        latestSummary:
          [...cardAudits].find((audit) => audit.summary)?.summary ?? '',
      },
      flags,
      latestSummary: characterEvaluations[0]?.summary ?? '',
    };
  });

  const humanMomentCounts = countHumanMomentEvents(events);
  const totals = {
    characters: items.length,
    conversations: conversations.length,
    userMessages: messages.filter((message) => message.role === 'user').length,
    qualityEvents: events.length,
    evaluations: evaluations.length,
    humanMomentEvents: sumHumanMomentEvents(humanMomentCounts),
  };

  return {
    days,
    since: since.toISOString(),
    totals,
    humanMomentFunnel: HUMAN_MOMENT_EVENT_TYPES.map((type) => ({
      type,
      label: HUMAN_MOMENT_EVENT_LABELS[type],
      count: humanMomentCounts[type],
    })),
    items: items.sort((a, b) => {
      const aRisk =
        a.metrics.regenerateRate +
        a.metrics.explicitOocCount * 10 +
        (a.rubric.ooc ? Math.max(0, 5 - a.rubric.ooc) * 8 : 0);
      const bRisk =
        b.metrics.regenerateRate +
        b.metrics.explicitOocCount * 10 +
        (b.rubric.ooc ? Math.max(0, 5 - b.rubric.ooc) * 8 : 0);
      return bRisk - aRisk;
    }),
  };
}
