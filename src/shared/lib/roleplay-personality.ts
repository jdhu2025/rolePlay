/**
 * Structured personality card — the P0 wave of the character-personality
 * plan (see `roleplay-character-personality-plan.md`).
 *
 * Why this lives in its own file: the shape is consumed by the AI Writer
 * route (`/api/roleplay/ai-writer`), the chat pipeline
 * (`/api/roleplay/chat`), the edit form, and a few model helpers. Sharing
 * the type and parser keeps them in lock-step.
 *
 * Storage: persisted as JSON-encoded text in `roleplay_character.personality_card`
 * (migration 0007). An empty `{}` is the "legacy / unset" sentinel — the
 * chat pipeline degrades to the old single-blob `settings` path when the
 * card is empty.
 *
 * Note: `voicePreset` (P2-3) lives in its OWN column
 * (`roleplay_character.voice_preset`, migration 0009) rather than inside
 * the personality card JSON. Reasons:
 *   - It is a TTS-render-only signal and never enters the LLM prompt, so
 *     `buildLayeredSystemMessages` shouldn't have to filter it out.
 *   - It is a short whitelisted id, so a flat column makes future indexes
 *     / filters trivial without reaching into JSON.
 *   - Its new primary meaning is: a global admin-configured TTS voice
 *     profile id. Legacy preset ids are still accepted only as a short-term
 *     compatibility fallback for old rows.
 * The compatibility helpers still live here so the AI Writer migration,
 * edit form, characters API, and TTS route share one source of truth.
 */

export type PersonalityCard = {
  /** [身份] Name, age, occupation, time/place. Concrete > vague. */
  identity?: string;
  /** [外貌] 3-5 specific visual anchors. */
  appearance?: string;
  /**
   * [性格内核] 3 traits + 1 tension/contradiction.
   * Stored as a list so few-shot prompting can format them deterministically.
   */
  coreTraits?: string[];
  /** Optional one-line tension/contradiction (the "矛盾点" that adds depth). */
  tension?: string;
  /**
   * [说话方式] Notes on cadence, punctuation, length, signature transitions.
   * Free text; catchphrases / metaphor go in their own fields.
   */
  speakingStyle?: string;
  /**
   * 3-5 signature phrases / catchwords that anchor voice.
   * Pulled into a dedicated system message so the model treats them as
   * vocabulary rather than examples.
   */
  catchphrases?: string[];
  /**
   * Single-domain imagery the character reaches for ("memory leaks",
   * "火候 / 调味"). One word/phrase is enough — the model fills in.
   */
  metaphorDomain?: string;
  /**
   * How the character brings up remembered user details without sounding
   * like a profile card. Example: "傲娇地绕半圈才问出口".
   */
  memoryCallbackStyle?: string;
  /**
   * Hidden relationship unlock beats driven by trust. These are not public
   * progress labels; the chat prompt uses them as emotional story moments.
   */
  trustMilestones?: string[];
  /**
   * The front-stage interaction promise: what makes this character fun to
   * talk to in the first few turns (e.g. "温柔拆穿用户的逞强").
   */
  interactionPlay?: string;
  /**
   * A small unfinished life hook the character can leave behind so the next
   * visit feels like a continuation, not a reset.
   */
  continuationSeed?: string;
  /** How this character gives a personalized goodbye when the user leaves. */
  goodbyeRitualStyle?: string;
  /** How voice/photo should appear at rare emotional peak moments. */
  peakMomentStyle?: string;
  /** [价值观] 2-3 non-negotiable lines + what truly matters. */
  values?: string[];
  /** [关系起点] How {{user}} and {{char}} know each other; current stage. */
  relationshipHook?: string;
  /**
   * [她不会做的事] Negative anchors — reverse constraints. Models obey
   * these harder than positive descriptions. Keep each line one sentence.
   */
  negativeAnchors?: string[];
};

export const EMPTY_PERSONALITY_CARD: PersonalityCard = {};

/**
 * Parse the JSON-encoded card defensively. Returns {} on bad input so
 * callers can branch on `Object.keys(card).length === 0` without try/catch.
 */
export function parsePersonalityCard(raw: string | null | undefined): PersonalityCard {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return normalizePersonalityCard(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

/**
 * Defensive coerce: trim strings, drop empties, cap list lengths so a
 * misbehaving model can't blow up the chat-side prompt budget.
 */
export function normalizePersonalityCard(input: Record<string, unknown>): PersonalityCard {
  const card: PersonalityCard = {};

  const str = (key: string) => {
    const value = input[key];
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  const list = (key: string, max: number) => {
    const value = input[key];
    if (!Array.isArray(value)) return undefined;
    const cleaned = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter((item) => item.length > 0)
      .slice(0, max);
    return cleaned.length > 0 ? cleaned : undefined;
  };

  const identity = str('identity');
  if (identity) card.identity = identity.slice(0, 600);

  const appearance = str('appearance');
  if (appearance) card.appearance = appearance.slice(0, 600);

  const coreTraits = list('coreTraits', 6);
  if (coreTraits) card.coreTraits = coreTraits.map((t) => t.slice(0, 80));

  const tension = str('tension');
  if (tension) card.tension = tension.slice(0, 240);

  const speakingStyle = str('speakingStyle');
  if (speakingStyle) card.speakingStyle = speakingStyle.slice(0, 600);

  const catchphrases = list('catchphrases', 5);
  if (catchphrases) card.catchphrases = catchphrases.map((c) => c.slice(0, 80));

  const metaphorDomain = str('metaphorDomain');
  if (metaphorDomain) card.metaphorDomain = metaphorDomain.slice(0, 120);

  const memoryCallbackStyle = str('memoryCallbackStyle');
  if (memoryCallbackStyle) {
    card.memoryCallbackStyle = memoryCallbackStyle.slice(0, 240);
  }

  const trustMilestones = list('trustMilestones', 5);
  if (trustMilestones) {
    card.trustMilestones = trustMilestones.map((m) => m.slice(0, 180));
  }

  const interactionPlay = str('interactionPlay');
  if (interactionPlay) card.interactionPlay = interactionPlay.slice(0, 240);

  const continuationSeed = str('continuationSeed');
  if (continuationSeed) card.continuationSeed = continuationSeed.slice(0, 240);

  const goodbyeRitualStyle = str('goodbyeRitualStyle');
  if (goodbyeRitualStyle) {
    card.goodbyeRitualStyle = goodbyeRitualStyle.slice(0, 240);
  }

  const peakMomentStyle = str('peakMomentStyle');
  if (peakMomentStyle) card.peakMomentStyle = peakMomentStyle.slice(0, 240);

  const values = list('values', 5);
  if (values) card.values = values.map((v) => v.slice(0, 200));

  const relationshipHook = str('relationshipHook');
  if (relationshipHook) card.relationshipHook = relationshipHook.slice(0, 400);

  const negativeAnchors = list('negativeAnchors', 8);
  if (negativeAnchors) card.negativeAnchors = negativeAnchors.map((n) => n.slice(0, 160));

  return card;
}

export function serializePersonalityCard(card: PersonalityCard): string {
  // Filter undefineds so the persisted JSON stays compact.
  const compact: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(card)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === 'string' && value.trim().length === 0) continue;
    compact[key] = value;
  }
  return JSON.stringify(compact);
}

export function isPersonalityCardEmpty(card: PersonalityCard): boolean {
  return Object.keys(card).length === 0;
}

/* ---------------- voicePreset compatibility ---------------------------
 *
 * New semantics:
 *   - `roleplay_character.voice_preset` should store a global TTS voice
 *     profile id configured by the admin.
 *
 * Compatibility semantics:
 *   - The old preset enum below (`warm-female`, `cool-male`, etc.) remains
 *     only so existing rows can still resolve to a working Volcengine
 *     `voice_type` during the migration window.
 *   - New writes should prefer profile ids, not these legacy enum values.
 *
 * Why these helpers still exist:
 *   - The TTS route needs a deterministic fallback when it receives an old
 *     stored value.
 *   - Seed / backfill scripts may still encounter historical data.
 *   - Keeping the compatibility mapping centralized avoids scattering the
 *     legacy preset table across API routes.
 */


export const VOICE_PRESET_IDS = [
  'warm-female',
  'cool-female',
  'playful-female',
  'warm-male',
  'cool-male',
  'playful-male',
  'neutral',
] as const;

/**
 * Legacy-only compatibility type. New code should treat `voicePreset` as a
 * string profile id first, and use this union only when checking old rows.
 */
export type VoicePresetId = (typeof VOICE_PRESET_IDS)[number] | '';

/**
 * Legacy preset -> Volcengine `voice_type` fallback.
 *
 * This is only for stored historical preset values. Global admin-configured
 * voice profiles should be resolved before calling this helper.
 */
export function resolveVoicePresetVoiceType(
  preset: VoicePresetId
): string | undefined {
  switch (preset) {
    case 'warm-female':
      return 'zh_female_kailangjiejie_moon_bigtts';
    case 'cool-female':
      return 'zh_female_wanwanxiaohe_moon_bigtts';
    case 'playful-female':
      return 'zh_female_tianmeixiaoyuan_moon_bigtts';
    case 'warm-male':
      return 'zh_male_M392_conversation_wvae_bigtts';
    case 'cool-male':
      return 'zh_male_shaonianzixin_moon_bigtts';
    case 'playful-male':
      return 'zh_male_jingqiangkanye_moon_bigtts';
    case 'neutral':
      return 'zh_female_kailangjiejie_moon_bigtts';
    default:
      return undefined;
  }
}

/**
 * Accept only legacy preset ids. Returns '' for profile ids so callers can
 * distinguish "old preset fallback" from the new global profile-id path.
 */
export function normalizeVoicePreset(raw: unknown): VoicePresetId {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return (VOICE_PRESET_IDS as readonly string[]).includes(trimmed)
    ? (trimmed as VoicePresetId)
    : '';
}

/* -------- end voicePreset --------------------------------------------- */

/**
 * Render the card as a plain-text settings blob. Used as a fallback when
 * the chat pipeline would otherwise have nothing to send and as the
 * "legacy" form we surface in the edit form's settings textarea so the
 * old single-blob workflow still works.
 *
 * Format mirrors what AI Writer used to produce so existing model fine-
 * tuning / prompt-engineering muscles still apply:
 *
 *   [身份] ...
 *   [外貌] ...
 *   [性格内核] - trait1 (with optional tension)
 *   [说话方式] notes; 口头禅: a / b / c; 比喻: 火候
 *   [价值观] - line1
 *   [关系起点] ...
 *   [她不会做的事] - l1
 */
export function renderPersonalityCardAsSettings(card: PersonalityCard): string {
  if (isPersonalityCardEmpty(card)) return '';

  const lines: string[] = [];

  if (card.identity) lines.push(`[身份]\n${card.identity}`);
  if (card.appearance) lines.push(`[外貌]\n${card.appearance}`);

  if (card.coreTraits?.length || card.tension) {
    const block = ['[性格内核]'];
    if (card.coreTraits) {
      for (const trait of card.coreTraits) block.push(`- ${trait}`);
    }
    if (card.tension) block.push(`矛盾点：${card.tension}`);
    lines.push(block.join('\n'));
  }

  if (
    card.speakingStyle ||
    card.catchphrases?.length ||
    card.metaphorDomain ||
    card.memoryCallbackStyle
  ) {
    const block = ['[说话方式]'];
    if (card.speakingStyle) block.push(card.speakingStyle);
    if (card.catchphrases?.length) {
      block.push(`口头禅：${card.catchphrases.join(' / ')}`);
    }
    if (card.metaphorDomain) {
      block.push(`常用比喻：${card.metaphorDomain}`);
    }
    if (card.memoryCallbackStyle) {
      block.push(`记忆回钩方式：${card.memoryCallbackStyle}`);
    }
    lines.push(block.join('\n'));
  }

  if (card.trustMilestones?.length) {
    lines.push(
      ['[信任里程碑]', ...card.trustMilestones.map((m) => `- ${m}`)].join('\n')
    );
  }

  if (
    card.interactionPlay ||
    card.continuationSeed ||
    card.goodbyeRitualStyle ||
    card.peakMomentStyle
  ) {
    const block = ['[人性瞬间]'];
    if (card.interactionPlay) block.push(`互动玩法：${card.interactionPlay}`);
    if (card.continuationSeed) block.push(`未完成种子：${card.continuationSeed}`);
    if (card.goodbyeRitualStyle) {
      block.push(`告别仪式：${card.goodbyeRitualStyle}`);
    }
    if (card.peakMomentStyle) block.push(`高峰时刻：${card.peakMomentStyle}`);
    lines.push(block.join('\n'));
  }

  if (card.values?.length) {
    lines.push(['[价值观]', ...card.values.map((v) => `- ${v}`)].join('\n'));
  }
  if (card.relationshipHook) {
    lines.push(`[关系起点]\n${card.relationshipHook}`);
  }
  if (card.negativeAnchors?.length) {
    lines.push(
      ['[她不会做的事]', ...card.negativeAnchors.map((n) => `- ${n}`)].join('\n')
    );
  }

  return lines.join('\n\n');
}
