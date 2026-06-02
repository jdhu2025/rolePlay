export type RoleplayRelationshipState = {
  intimacy: number;
  trust: number;
  currentMood: string;
  lastTopic: string;
  insideJokes: string[];
  unlockedMilestones: string[];
  turnCount: number;
};

export const EMPTY_RELATIONSHIP_STATE: RoleplayRelationshipState = {
  intimacy: 10,
  trust: 10,
  currentMood: 'curious',
  lastTopic: '',
  insideJokes: [],
  unlockedMilestones: [],
  turnCount: 0,
};

function clampScore(value: unknown, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function normalizeRelationshipState(
  input: Record<string, unknown>
): RoleplayRelationshipState {
  const insideJokes = Array.isArray(input.insideJokes)
    ? input.insideJokes
        .map((item) => cleanText(item, 120))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const unlockedMilestones = Array.isArray(input.unlockedMilestones)
    ? input.unlockedMilestones
        .map((item) => cleanText(item, 80))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    intimacy: clampScore(input.intimacy, EMPTY_RELATIONSHIP_STATE.intimacy),
    trust: clampScore(input.trust, EMPTY_RELATIONSHIP_STATE.trust),
    currentMood:
      cleanText(input.currentMood, 80) || EMPTY_RELATIONSHIP_STATE.currentMood,
    lastTopic: cleanText(input.lastTopic, 180),
    insideJokes,
    unlockedMilestones,
    turnCount: Math.max(0, Math.floor(Number(input.turnCount) || 0)),
  };
}

export function parseRelationshipState(
  raw: string | null | undefined
): RoleplayRelationshipState {
  if (!raw) return EMPTY_RELATIONSHIP_STATE;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return EMPTY_RELATIONSHIP_STATE;
    }
    return normalizeRelationshipState(parsed as Record<string, unknown>);
  } catch {
    return EMPTY_RELATIONSHIP_STATE;
  }
}

export function serializeRelationshipState(
  state: RoleplayRelationshipState
): string {
  return JSON.stringify(normalizeRelationshipState(state as any));
}

function countSignals(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length ?? 0), 0);
}

function detectMood(text: string): string {
  const lower = text.toLowerCase();
  const vulnerable = countSignals(lower, [
    /\b(sad|tired|lonely|hurt|scared|afraid|anxious|worried|bad day)\b/g,
    /难过|累|孤单|受伤|害怕|焦虑|担心|糟糕/g,
  ]);
  if (vulnerable > 0) return 'tender';

  const playful = countSignals(lower, [
    /\b(lol|haha|tease|dance|fun|joke|cute|play)\b/g,
    /哈哈|好玩|玩笑|可爱|逗|跳舞/g,
  ]);
  if (playful > 0) return 'playful';

  const warm = countSignals(lower, [
    /\b(thanks?|miss|love|like|trust|sorry|happy)\b/g,
    /谢谢|想你|喜欢|爱你|信任|抱歉|开心/g,
  ]);
  if (warm > 0) return 'warm';

  return 'curious';
}

function inferTopic(input: string): string {
  const trimmed = input.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

function extractInsideJoke(input: string): string {
  const quoted = input.match(/["“](.{4,80})["”]/)?.[1]?.trim();
  if (quoted) return quoted;

  const lower = input.toLowerCase();
  if (/\b(inside joke|our thing|remember when|code word)\b/.test(lower)) {
    return inferTopic(input).slice(0, 100);
  }
  if (/暗号|梗|记得我们|只有我们/.test(input)) {
    return inferTopic(input).slice(0, 100);
  }
  return '';
}

export function updateRelationshipState({
  previous,
  input,
  reply,
}: {
  previous: RoleplayRelationshipState;
  input: string;
  reply: string;
}): RoleplayRelationshipState {
  const combined = `${input}\n${reply}`;
  const lower = combined.toLowerCase();
  const warmSignals = countSignals(lower, [
    /\b(thanks?|miss|love|like|cute|sweet|trust|sorry|happy)\b/g,
    /谢谢|想你|喜欢|爱你|可爱|温柔|信任|抱歉|开心/g,
  ]);
  const sinceritySignals = countSignals(lower, [
    /\b(honest|honestly|truth|patient|gentle|i mean it|take your time|no rush)\b/g,
    /认真|真心|说真的|耐心|慢慢来|不急|尊重|边界/g,
  ]);
  const vulnerableSignals = countSignals(lower, [
    /\b(sad|tired|lonely|hurt|scared|afraid|anxious|worried|need you)\b/g,
    /难过|累|孤单|受伤|害怕|焦虑|担心|需要你/g,
  ]);
  const boundarySignals = countSignals(lower, [
    /\b(stop|too much|uncomfortable|don't|do not)\b/g,
    /别|不要|不舒服|过了|停止/g,
  ]);

  const insideJoke = extractInsideJoke(input);
  const insideJokes = insideJoke
    ? [insideJoke, ...previous.insideJokes.filter((item) => item !== insideJoke)].slice(0, 6)
    : previous.insideJokes;

  return normalizeRelationshipState({
    ...previous,
    intimacy:
      previous.intimacy +
      1 +
      warmSignals * 2 +
      sinceritySignals +
      vulnerableSignals -
      boundarySignals * 3,
    trust:
      previous.trust +
      1 +
      warmSignals +
      sinceritySignals * 2 +
      vulnerableSignals * 2 -
      boundarySignals * 2,
    currentMood: detectMood(combined),
    lastTopic: inferTopic(input) || previous.lastTopic,
    insideJokes,
    unlockedMilestones: previous.unlockedMilestones,
    turnCount: previous.turnCount + 1,
  });
}

export function renderRelationshipStateSystemMessage(
  state: RoleplayRelationshipState
): string {
  const normalized = normalizeRelationshipState(state as any);
  const lines = [
    '[relationship_state]',
    `Intimacy: ${normalized.intimacy}/100. Trust: ${normalized.trust}/100. Mood: ${normalized.currentMood}. Turns: ${normalized.turnCount}.`,
    normalized.lastTopic ? `Last user topic: ${normalized.lastTopic}` : '',
    normalized.insideJokes.length
      ? `Inside jokes / shared callbacks: ${normalized.insideJokes.join(' / ')}`
      : '',
    normalized.unlockedMilestones.length
      ? `Hidden relationship beats already crossed: ${normalized.unlockedMilestones.join(' / ')}`
      : '',
    'Use this as private continuity. Let intimacy and trust affect warmth, address, callbacks, and emotional distance. Do not quote the numbers.',
  ].filter(Boolean);

  return lines.join('\n');
}
