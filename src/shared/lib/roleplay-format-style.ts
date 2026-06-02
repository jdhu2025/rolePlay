export const EMOJI_FREQUENCIES = ['none', 'rare', 'moderate', 'expressive'] as const;
export const ACTION_BEAT_LENGTHS = ['short', 'balanced', 'cinematic'] as const;
export const ENGLISH_MIX_LEVELS = ['none', 'light', 'bilingual'] as const;

export type RoleplayEmojiFrequency = (typeof EMOJI_FREQUENCIES)[number];
export type RoleplayActionBeatLength = (typeof ACTION_BEAT_LENGTHS)[number];
export type RoleplayEnglishMixLevel = (typeof ENGLISH_MIX_LEVELS)[number];

export type RoleplayFormatStyle = {
  emojiFrequency: RoleplayEmojiFrequency;
  actionBeatLength: RoleplayActionBeatLength;
  englishMix: RoleplayEnglishMixLevel;
};

export const EMPTY_FORMAT_STYLE: RoleplayFormatStyle = {
  emojiFrequency: 'rare',
  actionBeatLength: 'balanced',
  englishMix: 'none',
};

function pick<T extends readonly string[]>(
  values: T,
  raw: unknown,
  fallback: T[number]
): T[number] {
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return values.includes(trimmed) ? trimmed : fallback;
}

export function normalizeFormatStyle(raw: unknown): RoleplayFormatStyle {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return EMPTY_FORMAT_STYLE;
  }
  const input = raw as Record<string, unknown>;
  return {
    emojiFrequency: pick(
      EMOJI_FREQUENCIES,
      input.emojiFrequency,
      EMPTY_FORMAT_STYLE.emojiFrequency
    ) as RoleplayEmojiFrequency,
    actionBeatLength: pick(
      ACTION_BEAT_LENGTHS,
      input.actionBeatLength,
      EMPTY_FORMAT_STYLE.actionBeatLength
    ) as RoleplayActionBeatLength,
    englishMix: pick(
      ENGLISH_MIX_LEVELS,
      input.englishMix,
      EMPTY_FORMAT_STYLE.englishMix
    ) as RoleplayEnglishMixLevel,
  };
}

export function parseFormatStyle(
  raw: string | null | undefined
): RoleplayFormatStyle {
  if (!raw) return EMPTY_FORMAT_STYLE;
  try {
    return normalizeFormatStyle(JSON.parse(raw));
  } catch {
    return EMPTY_FORMAT_STYLE;
  }
}

export function serializeFormatStyle(style: RoleplayFormatStyle): string {
  return JSON.stringify(normalizeFormatStyle(style));
}

export function renderFormatStyleSystemMessage(
  raw: RoleplayFormatStyle | string | null | undefined
): string {
  const style = typeof raw === 'string' ? parseFormatStyle(raw) : normalizeFormatStyle(raw);
  const emoji =
    style.emojiFrequency === 'none'
      ? 'Use no emoji.'
      : style.emojiFrequency === 'rare'
        ? 'Use emoji rarely, at most one when it genuinely fits the mood.'
        : style.emojiFrequency === 'moderate'
          ? 'Use emoji occasionally, no more than one or two in a reply.'
          : 'Emoji may be expressive, but keep them character-specific and avoid clutter.';
  const action =
    style.actionBeatLength === 'short'
      ? 'Keep italic action beats brief: one compact gesture or environmental detail.'
      : style.actionBeatLength === 'balanced'
        ? 'Use balanced italic action beats: enough physical texture to ground the scene, not a screenplay.'
        : 'Use richer cinematic italic action beats when emotion or atmosphere matters.';
  const english =
    style.englishMix === 'none'
      ? 'Do not mix English into non-English replies unless the user does first.'
      : style.englishMix === 'light'
        ? 'Light English code-switching is allowed for signature words, teasing, or technical terms.'
        : 'Bilingual code-switching is part of the voice; blend English naturally with the user language.';

  return [
    '[format_style]',
    emoji,
    action,
    english,
    'Treat these as formatting preferences, not lore. If the user asks for a different format, adapt for that turn.',
  ].join('\n');
}
