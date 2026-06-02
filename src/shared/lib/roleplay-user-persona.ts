export type RoleplayUserPersona = {
  preferredName?: string;
  defaultRelationship?: string;
  tonePreference?: string;
};

export type RoleplayAddressHistoryMessage = {
  role: 'user' | 'character';
  text: string;
};

export const EMPTY_USER_PERSONA: RoleplayUserPersona = {};

export function normalizeUserPersona(
  input: Record<string, unknown>
): RoleplayUserPersona {
  const persona: RoleplayUserPersona = {};

  const str = (key: string, max: number) => {
    const value = input[key];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, max) : undefined;
  };

  const preferredName = str('preferredName', 80);
  if (preferredName) persona.preferredName = preferredName;

  const defaultRelationship = str('defaultRelationship', 160);
  if (defaultRelationship) persona.defaultRelationship = defaultRelationship;

  const tonePreference = str('tonePreference', 400);
  if (tonePreference) persona.tonePreference = tonePreference;

  return persona;
}

export function parseUserPersona(raw: string | null | undefined): RoleplayUserPersona {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return normalizeUserPersona(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function serializeUserPersona(persona: RoleplayUserPersona): string {
  const compact: Record<string, string> = {};
  if (persona.preferredName?.trim()) {
    compact.preferredName = persona.preferredName.trim().slice(0, 80);
  }
  if (persona.defaultRelationship?.trim()) {
    compact.defaultRelationship = persona.defaultRelationship.trim().slice(0, 160);
  }
  if (persona.tonePreference?.trim()) {
    compact.tonePreference = persona.tonePreference.trim().slice(0, 400);
  }
  return JSON.stringify(compact);
}

export function isUserPersonaEmpty(persona: RoleplayUserPersona): boolean {
  return Object.keys(persona).length === 0;
}

export function renderUserPersonaSystemMessage(
  persona: RoleplayUserPersona
): string {
  const lines = [
    persona.preferredName
      ? `Preferred user name / address: ${persona.preferredName}`
      : '',
    persona.defaultRelationship
      ? `Default relationship stance: ${persona.defaultRelationship}`
      : '',
    persona.tonePreference
      ? `User tone preference: ${persona.tonePreference}`
      : '',
  ].filter(Boolean);

  if (!lines.length) return '';

  return [
    '[user_persona]',
    'Use this private user context to adapt address, intimacy, and tone. Do not quote it back unless the user asks.',
    ...lines,
  ].join('\n');
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => {
    const matches = text.match(pattern);
    return total + (matches?.length ?? 0);
  }, 0);
}

export function renderDynamicAddressSystemMessage({
  persona,
  history,
  input,
}: {
  persona: RoleplayUserPersona;
  history: RoleplayAddressHistoryMessage[];
  input: string;
}): string {
  const preferredName = persona.preferredName?.trim();
  const relationship = persona.defaultRelationship?.trim();
  const userTurns =
    history.filter((message) => message.role === 'user').length + 1;
  const recentUserText = [
    ...history
      .filter((message) => message.role === 'user')
      .slice(-6)
      .map((message) => message.text),
    input,
  ]
    .join('\n')
    .toLowerCase();

  const warmSignals = countMatches(recentUserText, [
    /\b(thanks?|miss|love|like|cute|sweet|sorry|lonely|tired|sad|happy|trust)\b/g,
    /谢谢|想你|喜欢|爱你|可爱|温柔|抱歉|孤单|累|难过|开心|信任/g,
  ]);
  const vulnerableSignals = countMatches(recentUserText, [
    /\b(afraid|scared|anxious|worried|hurt|bad day|need you|help me)\b/g,
    /害怕|焦虑|担心|受伤|糟糕|需要你|帮帮我/g,
  ]);

  const intimacyLevel =
    userTurns >= 16 || warmSignals + vulnerableSignals >= 5
      ? 'close'
      : userTurns >= 6 || warmSignals + vulnerableSignals >= 2
        ? 'warm'
        : 'early';

  const addressGuidance =
    intimacyLevel === 'close'
      ? 'Use a familiar, emotionally warm form of address when it feels natural. You may use a gentle nickname, but avoid sounding possessive or over-intimate unless the user has clearly invited it.'
      : intimacyLevel === 'warm'
        ? 'Use the preferred name or a soft friendly address occasionally. Keep the warmth noticeable but not clingy.'
        : 'Use the preferred name sparingly and keep the address respectful, curious, and not overly familiar.';

  const vulnerabilityGuidance = vulnerableSignals
    ? 'The user sounds emotionally vulnerable in recent turns; prioritize reassurance and steadiness over teasing.'
    : 'Match the user signal: playful if they are playful, steady if they are serious.';

  const lines = [
    '[dynamic_address_rule]',
    `Current user turn: ${userTurns}. Address intimacy level: ${intimacyLevel}.`,
    preferredName ? `Preferred address/name: ${preferredName}.` : '',
    relationship ? `Relationship baseline: ${relationship}.` : '',
    addressGuidance,
    vulnerabilityGuidance,
    'Do not explain this rule. Let it subtly shape word choice, address, and emotional distance.',
  ].filter(Boolean);

  return lines.join('\n');
}
