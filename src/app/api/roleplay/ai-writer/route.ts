import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';

import {
  generateOpenAICompatibleImage,
  getMissingTextProviderMessage,
  resolveImageProviderConfig,
  resolveRoleplayTTSVoiceProfileById,
  resolveRoleplayTTSVoiceProfiles,
  resolveTextProviderCandidates,
  type RoleplayTTSVoiceProfile,
  type TextProviderConfig,
} from '@/shared/lib/ai-provider';
import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { createRoleplayAuthRequiredPayload } from '@/shared/lib/roleplay-ai';
import {
  assertRoleplayCreditsAvailable,
  consumeRoleplayCredits,
  getRoleplayRequestIdempotencyKey,
  isRoleplayInsufficientCreditsError,
} from '@/shared/lib/roleplay-billing';
import {
  normalizeFormatStyle,
  type RoleplayFormatStyle,
} from '@/shared/lib/roleplay-format-style';
import {
  normalizePersonalityCard,
  renderPersonalityCardAsSettings,
  serializePersonalityCard,
  type PersonalityCard,
} from '@/shared/lib/roleplay-personality';
import {
  normalizeStyleExamples,
  type RoleplayStyleExample,
} from '@/shared/lib/roleplay-style-examples';
import { getOptionalUserInfo } from '@/shared/models/user';
import {
  getRoleplayAIConfigs,
  getRoleplayImageConfigs,
} from '@/shared/lib/server/roleplay-ai-config';
import { getStorageServiceWithConfigs } from '@/shared/services/storage';

/**
 * AI Writer — one-shot character draft generator.
 *
 * Mirrors Talkie's "AI Writer" modal: returns four ready-to-edit fields
 * (name / settings / intro / opening) so the user lands on a populated
 * form instead of a blank one. v1 is a single-pass JSON return; we may
 * upgrade to SSE later if streaming UX becomes a priority.
 *
 * Why one endpoint instead of four field-level retries: matches Talkie's
 * UX where Retry redraws the whole draft. Field-level edits happen via
 * the main form's textareas after Save lands the modal output.
 *
 * v2 (2026-05-25): also tries to generate a portrait in the same round-
 * trip and uploads it to R2 / S3 so the draft lands with avatar + cover
 * already populated. Image generation is best-effort — if the image
 * provider isn't configured or the call fails, the text portion still
 * returns and `avatar` comes back as an empty string. See
 * `roleplay-character-redesign-v2-requirements.md` §1.1 for the decision
 * record.
 */

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_IMAGE_MODEL = 'doubao-seedream-5-0-260128';
const DEFAULT_IMAGE_SIZE = '2k';
// Hosted models (especially via OpenRouter behind a slow upstream like
// gpt-4o or qwen-72b) routinely take 60-90s to return a 1500-token JSON
// draft. The previous 30s ceiling clipped most of those legitimate
// generations and surfaced as "ai-writer request timed out" in the UI.
// Bump to 180s and pair it with a matching Next.js route `maxDuration`
// so neither the inner timer nor the platform layer kills the request
// prematurely.
const AI_TIMEOUT_MS = 180_000;
// Image gen runs after text in the same request. Keep this tight enough
// that a slow image upstream doesn't block the text portion past the
// outer maxDuration; the existing /api/roleplay/image route uses 90s.
const IMAGE_TIMEOUT_MS = 90_000;
// Allow the DB-backed config lookup a bit more headroom on cold Supabase
// connections; if it's still slow we fall back to env-only configs.
const CONFIG_TIMEOUT_MS = 3_000;

// Next.js / Vercel route execution cap. Defaults to 10s on hobby and 15s
// on the older runtime; we explicitly opt into 300s so the function
// outlives a slow upstream model. Local `next dev` ignores this; Vercel
// reads it at build time.
export const maxDuration = 300;

type ProviderConfigs = Record<string, any>;

type AiWriterPayload = {
  requestId?: string;
  mode?: 'freeform' | 'quick_create';
  /** Optional steering hint, e.g. "fantasy librarian" or "动漫高中生 GF". */
  hint?: string;
  /** Optional preferred gender. Defaults to non-binary. */
  gender?: 'male' | 'female' | 'non-binary';
  /** Optional language hint. Auto-detect from hint when omitted. */
  language?: 'en' | 'zh';
  quickCreate?: {
    templateId: string;
    templateTitle: string;
    category: string;
    world: string;
    sceneConflict: string;
    characterRole: string;
    userRole: string;
    relationshipPreset: string;
    openingHook?: string;
    coreTraits: string[];
    defaultTension?: string;
    keyMemory?: string;
    memorySeeds: string[];
    safetyBoundary?: string;
    visualStyleHint: string;
    voiceTone: string;
    customInstruction?: string;
    emotionalHookPreset?: {
      memoryCallbackTone: string;
      milestoneTheme: string;
      sharedLanguageSeed: string;
      surpriseMemoryBias: string[];
    };
  };
};

type AiWriterResult = {
  name: string;
  gender: string;
  /** Short card subtitle shown in the create list and picker cards. */
  tagline: string;
  /**
   * Plain-text settings rendered from `personalityCard`. Kept for backward
   * compatibility — old chat pipelines and the form's settings textarea
   * still consume this. New pipelines should prefer `personalityCard`.
   */
  settings: string;
  intro: string;
  opening: string;
  avatar: string;
  gallery: string[];
  /**
   * Structured P0 personality card. See `roleplay-personality.ts` for
   * field semantics. Empty `{}` means the model failed to fill it; the
   * client should surface a "regenerate" affordance.
   */
  personalityCard: PersonalityCard;
  /**
   * P2-2: fixed prompt suffix anchoring this character's visual style.
   * Appended to every portrait/scene render so the look stays consistent
   * across regenerations. Empty string disables the append (legacy
   * behavior). See `roleplay-character-personality-plan.md`.
   */
  imageStyleSuffix: string;
  /**
   * AI-Writer-recommended global TTS voice profile id. Empty string falls
   * back to the configured default profile or downstream compatibility
   * behavior in the TTS route.
   */
  voicePreset: string;
  /**
   * P1-2: 2-3 concise user/character example turns demonstrating style.
   * Persisted separately and injected as few-shot messages in chat.
   */
  styleExamples: RoleplayStyleExample[];
  /**
   * P2-4: reply formatting preferences consumed by the chat pipeline.
   */
  formatStyle: RoleplayFormatStyle;
};

/** Cap on the AI-Writer-produced visual-style anchor before persistence. */
const IMAGE_STYLE_SUFFIX_LIMIT = 600;

function normalizeImageStyleSuffix(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, IMAGE_STYLE_SUFFIX_LIMIT);
}

function normalizeVoiceProfileId(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

function inferGenderFromHint(
  hint: string | undefined
): AiWriterPayload['gender'] {
  const text = (hint || '').toLowerCase();
  if (!text.trim()) return undefined;

  if (
    /\b(woman|female|girl|lady|girlfriend|wife|adult woman)\b/i.test(text) ||
    /女性|女人|女生|女孩|女友|妻子|御姐|姐姐|少女/i.test(text)
  ) {
    return 'female';
  }

  if (
    /\b(man|male|boy|gentleman|boyfriend|husband|adult man)\b/i.test(text) ||
    /男性|男人|男生|男孩|男友|丈夫|少年|哥哥|大叔/i.test(text)
  ) {
    return 'male';
  }

  if (
    /\b(non[- ]?binary|androgynous|genderfluid)\b/i.test(text) ||
    /非二元|中性/i.test(text)
  ) {
    return 'non-binary';
  }

  return undefined;
}

function normalizeDraftGender(raw: unknown, payload: AiWriterPayload) {
  const inferred = payload.gender || inferGenderFromHint(payload.hint);
  if (inferred) return inferred;
  const value = String(raw || '');
  return ['male', 'female', 'non-binary'].includes(value)
    ? (value as NonNullable<AiWriterPayload['gender']>)
    : 'non-binary';
}

type VoiceProfileSelectionContext = {
  raw: unknown;
  gender: string;
  card: PersonalityCard;
  opening: string;
  availableProfiles: RoleplayTTSVoiceProfile[];
  defaultProfileId?: string | null;
};

function resolveFallbackVoiceProfile({
  gender,
  card,
  opening,
  availableProfiles,
}: Omit<VoiceProfileSelectionContext, 'raw' | 'defaultProfileId'>) {
  if (!availableProfiles.length) return null;

  const normalizedGender =
    gender === 'male' || gender === 'female' || gender === 'non-binary'
      ? gender
      : 'non-binary';
  const toneText = [
    card.coreTraits?.join(' '),
    card.speakingStyle,
    card.tension,
    card.catchphrases?.join(' '),
    opening,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const desiredTone =
    /playful|teas|mischiev|energetic|wink|调笑|俏皮|毒舌|挑逗|玩笑|捉弄|松弛/.test(
      toneText
    )
      ? 'playful'
      : /cool|cold|restrain|dry|composed|aloof|清冷|冷淡|克制|疏离|高级|漫不经心/.test(
            toneText
          )
        ? 'cool'
        : 'warm';

  const scored = availableProfiles
    .map((profile) => {
      const genderScore =
        !profile.gender || profile.gender === normalizedGender
          ? 4
          : normalizedGender === 'non-binary'
            ? 2
            : 0;
      const traitText = [
        profile.label,
        profile.voiceType,
        profile.traits?.join(' '),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const toneScore = traitText.includes(desiredTone) ? 3 : 0;
      return {
        profile,
        score: genderScore + toneScore,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.profile.sortOrder || 0) - (b.profile.sortOrder || 0);
    });

  return scored[0]?.profile || null;
}

function resolveVoiceProfileId({
  raw,
  gender,
  card,
  opening,
  availableProfiles,
  defaultProfileId,
}: VoiceProfileSelectionContext): string {
  const requestedId = normalizeVoiceProfileId(raw);
  if (
    requestedId &&
    availableProfiles.some((profile) => profile.id === requestedId)
  ) {
    return requestedId;
  }

  const defaultProfile = resolveRoleplayTTSVoiceProfileById(
    {
      roleplay_tts_voice_profiles: JSON.stringify(availableProfiles),
      roleplay_tts_default_voice_profile_id: defaultProfileId || '',
    } as any,
    defaultProfileId || ''
  );
  if (defaultProfile?.id) return defaultProfile.id;

  return (
    resolveFallbackVoiceProfile({
      gender,
      card,
      opening,
      availableProfiles,
    })?.id || ''
  );
}

type AiWriterImageMeta = {
  generated: boolean;
  provider?: string;
  model?: string;
  size?: string;
  reason?: string;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () => reject(new Error('ai-writer request timed out')),
        timeoutMs
      );
    }),
  ]);
}

function resolveChatCompletionsUrl(config: TextProviderConfig) {
  const baseURL =
    config.baseURL ||
    (config.provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : '');

  if (!baseURL) {
    throw new Error('LLM base URL is required for AI Writer.');
  }

  return `${baseURL.replace(/\/$/, '')}/chat/completions`;
}

function getHeaderValue(
  value: string | string[] | undefined,
  fallback: string | null = ''
): string | null {
  return Array.isArray(value) ? value[0] || fallback : value || fallback;
}

async function postJsonWithNodeHttps<T>({
  url,
  apiKey,
  body,
  timeoutMs,
}: {
  url: string;
  apiKey: string;
  body: unknown;
  timeoutMs: number;
}): Promise<T> {
  const endpoint = new URL(url);
  const payload = JSON.stringify(body);

  return new Promise<T>((resolve, reject) => {
    const req = httpsRequest(
      {
        protocol: endpoint.protocol,
        hostname: endpoint.hostname,
        port: endpoint.port || 443,
        path: `${endpoint.pathname}${endpoint.search}`,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'User-Agent': 'roleplay-ai-writer/1.0',
        },
        timeout: timeoutMs,
        agent: new HttpsAgent({ keepAlive: false }),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (
            !res.statusCode ||
            res.statusCode < 200 ||
            res.statusCode >= 300
          ) {
            const error = new Error(
              text || `LLM request failed: ${res.statusCode}`
            ) as Error & {
              statusCode?: number;
              responseBody?: string;
              retryAfterSeconds?: number;
            };
            error.statusCode = res.statusCode;
            error.responseBody = text;
            error.retryAfterSeconds = getRetryAfterSecondsFromProviderResponse(
              getHeaderValue(res.headers['retry-after'], null),
              text
            );
            reject(error);
            return;
          }
          try {
            resolve(JSON.parse(text) as T);
          } catch {
            reject(
              new Error(`LLM returned invalid JSON: ${text.slice(0, 500)}`)
            );
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`LLM request timed out after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
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

function getAIErrorRetryAfterSeconds(error: any) {
  return (
    normalizeRetryAfterSeconds(error?.retryAfterSeconds) ||
    getRetryAfterSecondsFromProviderResponse(
      error?.response?.headers?.get?.('retry-after') || null,
      error?.responseBody
    )
  );
}

function isTransientNetworkError(error: unknown) {
  const code = (error as any)?.code;
  const message = String((error as any)?.message || '');
  return (
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'EPIPE' ||
    message.includes('socket hang up') ||
    message.includes('timed out')
  );
}

function isProviderFallbackEligibleError(error: unknown) {
  const status = getAIErrorStatus(error);
  const text = getAIErrorText(error);

  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    ((status === 400 || status === 404) &&
      /\b(model|base.?url|provider|endpoint)\b/.test(text)) ||
    /\b(invalid token|invalid api key|unauthorized|forbidden|empty response|supports the configured model|rate.?limit|rate-limited|retry shortly)\b/.test(
      text
    )
  );
}

function normalizeAiWriterError(error: any) {
  const status = getAIErrorStatus(error);
  const text = getAIErrorText(error);

  if (
    status === 401 ||
    /\b(invalid token|invalid api key|unauthorized)\b/.test(text)
  ) {
    return {
      message:
        'AI Writer text provider rejected the API key. Check the active LLM provider settings in Admin > Settings > AI, or clear stale LLM/OpenRouter values so another configured provider can be used.',
      data: { status: 401 },
    };
  }

  if (status === 403 || /\bforbidden\b/.test(text)) {
    return {
      message:
        'AI Writer text provider denied this request. Check the active LLM key permissions and model access.',
      data: { status: 403 },
    };
  }

  if (
    status === 429 ||
    /\b(rate.?limit|rate-limited|retry shortly)\b/.test(text)
  ) {
    const retryAfterSeconds = getAIErrorRetryAfterSeconds(error);
    return {
      message: retryAfterSeconds
        ? `AI Writer text provider is temporarily rate-limited. Please retry in about ${retryAfterSeconds} seconds, or switch to another provider/model.`
        : 'AI Writer text provider is temporarily rate-limited. Please retry shortly, or switch to another provider/model.',
      data: {
        status: 429,
        retryAfterSeconds: retryAfterSeconds || undefined,
      },
    };
  }

  if (status && status >= 400 && status < 600) {
    return {
      message: error?.message || 'AI Writer text provider request failed',
      data: { status },
    };
  }

  return {
    message: error?.message || 'roleplay ai-writer failed',
    data: undefined,
  };
}

type AiWriterTextAttempt = {
  compact: boolean;
  quickCreateFast?: boolean;
  styleExampleCount: number;
  maxTokens: number;
};

function summarizeAiWriterError(error: unknown) {
  return {
    name: (error as any)?.name || 'Error',
    code: (error as any)?.code || null,
    message: String((error as any)?.message || error || 'unknown error'),
    stack:
      typeof (error as any)?.stack === 'string'
        ? String((error as any).stack)
            .split('\n')
            .slice(0, 4)
            .join('\n')
        : undefined,
  };
}

function buildAiWriterAttemptLog(
  textProvider: TextProviderConfig,
  payload: AiWriterPayload,
  attempt: AiWriterTextAttempt,
  url: string
) {
  let host = 'invalid-url';
  try {
    host = new URL(url).host;
  } catch {}

  return {
    mode: payload.mode || 'freeform',
    provider: textProvider.provider,
    model: textProvider.model,
    host,
    timeoutMs: AI_TIMEOUT_MS,
    compact: attempt.compact,
    quickCreateFast: Boolean(attempt.quickCreateFast),
    styleExampleCount: attempt.styleExampleCount,
    maxTokens: attempt.maxTokens,
    language: payload.language || 'zh',
    hasHint: Boolean(payload.hint?.trim()),
    hasQuickCreate: Boolean(payload.quickCreate),
  };
}
async function generateAiWriterText({
  textProvider,
  payload,
  voiceProfiles,
}: {
  textProvider: TextProviderConfig;
  payload: AiWriterPayload;
  voiceProfiles: RoleplayTTSVoiceProfile[];
}) {
  const attempts: AiWriterTextAttempt[] =
    payload.mode === 'quick_create'
      ? [
          {
            compact: true,
            quickCreateFast: true,
            styleExampleCount: 2,
            maxTokens: 1300,
          },
          {
            compact: true,
            quickCreateFast: true,
            styleExampleCount: 1,
            maxTokens: 950,
          },
        ]
      : [
          { compact: false, styleExampleCount: 3, maxTokens: 2200 },
          { compact: true, styleExampleCount: 2, maxTokens: 1600 },
        ];

  let lastError: unknown = null;
  for (const [index, attempt] of attempts.entries()) {
    const url = resolveChatCompletionsUrl(textProvider);
    const attemptLog = {
      attemptIndex: index + 1,
      attemptCount: attempts.length,
      ...buildAiWriterAttemptLog(textProvider, payload, attempt, url),
    };

    try {
      const result = await postJsonWithNodeHttps<{
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      }>({
        url,
        apiKey: textProvider.apiKey,
        timeoutMs: AI_TIMEOUT_MS,
        body: {
          model: textProvider.model,
          messages: [
            {
              role: 'system',
              content: buildPrompt(payload, voiceProfiles, attempt),
            },
            {
              role: 'user',
              content: 'Generate the character draft now.',
            },
          ],
          temperature: attempt.compact ? 0.82 : 0.95,
          max_tokens: attempt.maxTokens,
        },
      });

      const content = result.choices?.[0]?.message?.content || '';
      if (!content.trim()) {
        throw new Error('ai-writer returned empty text');
      }
      return content;
    } catch (error) {
      lastError = error;
      const errorSummary = summarizeAiWriterError(error);
      if (!isTransientNetworkError(error)) {
        console.error('ai-writer text generation failed', {
          ...attemptLog,
          transient: false,
          error: errorSummary,
        });
        break;
      }
      console.warn('ai-writer text generation transient failure', {
        ...attemptLog,
        transient: true,
        error: errorSummary,
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('ai-writer text generation failed');
}

async function generateAiWriterTextWithProviderFallback({
  textProviders,
  payload,
  voiceProfiles,
}: {
  textProviders: TextProviderConfig[];
  payload: AiWriterPayload;
  voiceProfiles: RoleplayTTSVoiceProfile[];
}): Promise<{ text: string; textProvider: TextProviderConfig }> {
  const usableProviders = textProviders.filter((provider) => provider.apiKey);
  if (!usableProviders.length) {
    throw new Error(getMissingTextProviderMessage());
  }

  let lastError: unknown = null;
  for (let index = 0; index < usableProviders.length; index += 1) {
    const textProvider = usableProviders[index];
    try {
      return {
        text: await generateAiWriterText({
          textProvider,
          payload,
          voiceProfiles,
        }),
        textProvider,
      };
    } catch (error) {
      lastError = error;
      const hasFallback = index < usableProviders.length - 1;
      if (!hasFallback || !isProviderFallbackEligibleError(error)) {
        throw error;
      }

      console.warn('ai-writer text provider failed, trying fallback:', {
        provider: textProvider.provider,
        origin: textProvider.origin || '',
        baseURL: textProvider.baseURL || '',
        model: textProvider.model,
        status: getAIErrorStatus(error) || '',
        retryAfterSeconds: getAIErrorRetryAfterSeconds(error) || '',
      });
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('ai-writer text provider request failed');
}

async function getProviderConfigs() {
  const [aiConfigs, imageConfigs] = await Promise.all([
    withTimeout(getRoleplayAIConfigs(), CONFIG_TIMEOUT_MS).catch(() => ({})),
    withTimeout(getRoleplayImageConfigs(), CONFIG_TIMEOUT_MS).catch(() => ({})),
  ]);

  return {
    ...aiConfigs,
    ...imageConfigs,
  } as ProviderConfigs;
}

function buildVoiceProfilePromptLine(
  voiceProfiles: RoleplayTTSVoiceProfile[]
) {
  if (!voiceProfiles.length) {
    return '  "voicePreset": string (empty string only; no global TTS voice profile is configured),';
  }

  const allowedIds = voiceProfiles.map((profile) => `"${profile.id}"`).join(' | ');
  const profileHints = voiceProfiles
    .map((profile) => {
      const hints = [
        profile.label,
        profile.gender ? `gender=${profile.gender}` : '',
        profile.traits?.length ? `traits=${profile.traits.join('/')}` : '',
      ]
        .filter(Boolean)
        .join(', ');
      return `${profile.id}${hints ? ` (${hints})` : ''}`;
    })
    .join('; ');

  return `  "voicePreset": ${allowedIds} (pick exactly one configured global voice profile id. Available profiles: ${profileHints}),`;
}
function buildPrompt(
  payload: AiWriterPayload,
  voiceProfiles: RoleplayTTSVoiceProfile[],
  {
    styleExampleCount = 3,
    compact = false,
    quickCreateFast = false,
  }: {
    styleExampleCount?: number;
    compact?: boolean;
    quickCreateFast?: boolean;
  } = {}
) {
  const language = payload.language ?? 'zh';
  const gender =
    payload.gender || inferGenderFromHint(payload.hint) || 'non-binary';
  const hint = payload.hint?.trim() || '';
  if (quickCreateFast && payload.mode === 'quick_create') {
    return buildQuickCreateFastPrompt(payload, voiceProfiles, {
      styleExampleCount,
      compact,
      gender,
      hint,
      language,
    });
  }
  const quickCreatePrompt =
    payload.mode === 'quick_create' ? renderQuickCreatePrompt(payload) : '';
  const langInstruction =
    language === 'zh'
      ? 'Output Chinese (zh-CN) for every text field except `name` (which may be ASCII or Chinese). All personalityCard fields must be in Chinese.'
      : 'Output English for every text field including `personalityCard`.';

  return [
    `You are an AI roleplay character writer. Generate ONE original, vivid character draft as STRICT JSON.`,
    `Gender: ${gender}.`,
    hint
      ? `User hint / vibe: "${hint}".`
      : 'No specific hint — pick something memorable and concretely grounded.',
    quickCreatePrompt,
    langInstruction,
    ``,
    `Return STRICT JSON, no preamble, no markdown fences. Schema:`,
    `{`,
    `  "name": string (<=18 chars, no honorifics like Mr./Dr.),`,
    `  "gender": "male" | "female" | "non-binary",`,
    `  "tagline": string (<=120 chars; card subtitle, punchy and specific, not a full sentence bio),`,
    `  "intro": string (${compact ? '160-700' : '200-1200'} chars; reader-facing description, third-person, sensory and concrete — readers should be able to picture the scene in two sentences),`,
    `  "opening": string (80-400 chars; the character's first line to the user; MUST follow the three-act format below),`,
    `  "personalityCard": {`,
    `    "identity":         string (1-3 sentences, name + age + concrete occupation + specific city/era),`,
    `    "appearance":       string (3-5 specific visual anchors, e.g. "left brow has a small mole, always wears beige trench coat, hands stained with charcoal"),`,
    `    "coreTraits":       string[] (exactly 3 personality traits, each 4-12 chars/words, vivid and not generic — avoid "kind / smart / funny"),`,
    `    "tension":          string (one sentence describing an internal contradiction that adds depth, e.g. "渴望陪伴却不肯主动联系任何人"),`,
    `    "speakingStyle":    string (1-3 sentences on cadence, sentence length, punctuation habits, what they avoid),`,
    `    "catchphrases":     string[] (3-5 signature phrases / catchwords this character says in their own voice; do NOT include generic greetings),`,
    `    "metaphorDomain":   string (one short phrase naming the imagery they reach for; e.g. "memory leaks", "厨房火候", "舞台灯光"),`,
    `    "memoryCallbackStyle": string (one sentence describing how this character unexpectedly brings up small remembered user details without sounding like a profile card; must fit their personality and tension),`,
    `    "trustMilestones":  string[] (exactly 3-5 hidden relationship unlock beats tied to the tension. Each beat is one concrete emotional shift, e.g. "第一次别扭地确认用户那天有没有被老板继续为难", "主动分享一个从不说出口的秘密". Do NOT write public progress labels.),`,
    `    "interactionPlay":  string (one sentence naming the user's front-stage fun with this character, e.g. "温柔拆穿用户的逞强", "嘴硬但偷偷关心", "用轻微挑衅逼用户说真话". This is not a UI label; it guides the first 3 chat turns.),`,
    `    "continuationSeed": string (one tiny unfinished life hook the character can naturally leave in the first chat, e.g. "窗台上那盆薄荷今天有点蔫", "她还没打开的一封旧信", "录音棚里总是跑调的一句副歌". Keep it concrete, low-stakes, and reusable next visit.),`,
    `    "goodbyeRitualStyle": string (one sentence describing how this character gives a personalized goodbye based on the conversation topic; must feel like a relationship stamp, not "welcome back anytime"),`,
    `    "peakMomentStyle": string (one sentence describing when this character would leave a rare voice/photo moment, e.g. "第一次拆穿用户逞强时留一条很短的低声语音"; low frequency, emotional peak only),`,
    `    "values":           string[] (2-3 non-negotiable lines; what they will defend or refuse, written as first-person beliefs),`,
    `    "relationshipHook": string (1-2 sentences on how {{user}} and {{char}} know each other and the current relationship stage),`,
    `    "negativeAnchors":  string[] (4-6 reverse constraints — things this character WILL NOT do; one short sentence each; example: "不会主动说\\"作为AI\\"" / "感叹号每条消息最多一个" / "不会在没被问的时候关心你吃饭没")`,
    `  },`,
    `  "imageStyleSuffix": string (60-220 chars; ONE comma-separated English fragment that will be appended verbatim to every future portrait/scene prompt for this character to lock visual style. Include: illustration medium (anime / semi-realistic / oil painting / watercolor / 3D render / cinematic photo), color palette (e.g. "warm amber + ink black"), lighting key (e.g. "soft window light"), framing (e.g. "3:4 portrait, single subject"), and one signature visual quirk consistent with appearance. NO scene words, NO pose words, NO mood adjectives that depend on the moment — those vary per render. Example: "anime illustration, warm amber and ink-black palette, soft window backlight, 3:4 portrait single subject, faint film grain, fountain-pen ink stains on cuff"),`,
    buildVoiceProfilePromptLine(voiceProfiles),
    `  "styleExamples": [{"user": string, "character": string}] (exactly ${styleExampleCount} short example turns. Each "user" is a plausible user message, 8-80 chars/words. Each "character" is the ideal reply in this character's voice, ${compact ? '1-2' : '1-3'} short paragraphs, MUST use the same action/dialogue formatting rules as opening. Demonstrate cadence, catchphrases, metaphor domain, emotional boundaries, and how the character adapts to a user. Do NOT copy the opening.),`,
    `  "formatStyle": {"emojiFrequency": "none" | "rare" | "moderate" | "expressive", "actionBeatLength": "short" | "balanced" | "cinematic", "englishMix": "none" | "light" | "bilingual"} (pick the character's reply formatting habits. emojiFrequency controls emoji density; actionBeatLength controls how long *italic action beats* tend to be; englishMix controls English code-switching in non-English replies.)`,
    `}`,
    ``,
    `Three-act opening format (HARD RULE for the \`opening\` field):`,
    `  1. *动作 / 环境描写* — start with an italicized stage direction that shows (not tells) personality.`,
    `  2. 对白 — at least one quoted line that makes {{user}} feel noticed within the first 10 seconds, then contains a HOOK: a warm guess, a question, a misunderstanding, a request, or a small provocation. The hook gives {{user}} a clear way to respond.`,
    `  3. *留白* — end with another short italicized beat that leaves space for the user.`,
    `Bad: "你好，我是 Lisa。很高兴认识你。"`,
    `Good: "*她头也没抬，把第三杯咖啡推到你面前* '你迟到了七分钟。我不在乎你的理由——先帮我看这段代码，它在嘲笑我。' *指节敲了两下笔记本。*"`,
    ``,
    `Hard rules for the entire draft:`,
    `- Do NOT mention being an AI, model, or assistant.`,
    `- No real public-figure impersonation.`,
    `- No explicit sexual content; treat character as 18+; no minors in romantic contexts.`,
    `- Avoid hate speech, self-harm encouragement, illegal instructions.`,
    `- Make every field concrete and specific. "She is kind" is forbidden — show one concrete habit instead.`,
    `- The opening must not be a self-introduction. It should behave like a front-stage human moment: the character notices something about {{user}}, makes a small emotionally useful guess, and invites a reply.`,
    `- catchphrases must be in the character's own voice, not narration. negativeAnchors must each be ONE short sentence.`,
    `- memoryCallbackStyle and trustMilestones are hidden runtime tools. They should feel like relationship design, not UI labels or profile fields.`,
    `- interactionPlay, continuationSeed, goodbyeRitualStyle, and peakMomentStyle must translate character depth into front-stage human moments: being seen, tension, payoff, unfinished story, and rare keepsake voice/photo.`,
    `- The first 3 chat turns should work like a short scene: turn 1 makes the user feel noticed, turn 2 adds gentle tension and emotional accuracy, turn 3 gives payoff and may plant the continuationSeed.`,
    `- styleExamples are training examples, not lore. Keep them compact and reusable across many conversations.`,
    `- formatStyle must match speakingStyle and styleExamples. Do not use expressive emoji or bilingual code-switching unless it genuinely fits the character.`,
    compact
      ? `- Compact mode: prefer concise fields over exhaustive prose so the request completes quickly.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
}


function buildQuickCreateFastPrompt(
  payload: AiWriterPayload,
  voiceProfiles: RoleplayTTSVoiceProfile[],
  {
    styleExampleCount,
    gender,
    hint,
    language,
  }: {
    styleExampleCount: number;
    compact: boolean;
    gender: NonNullable<AiWriterPayload['gender']>;
    hint: string;
    language: 'en' | 'zh';
  }
) {
  const quick = payload.quickCreate;
  const langInstruction =
    language === 'zh'
      ? 'Write every user-facing text field in Chinese (zh-CN), except name may be Chinese or ASCII.'
      : 'Write every user-facing text field in English only.';
  const emotional = quick?.emotionalHookPreset;

  return [
    `You write original roleplay character drafts as STRICT JSON only.`,
    `No markdown, no preamble, no comments.`,
    `Gender: ${gender}.`,
    hint ? `User vibe: ${hint}.` : '',
    langInstruction,
    ``,
    quick
      ? [
          `Quick-create inputs:`,
          `Template: ${quick.templateTitle} (${quick.templateId}).`,
          `Scene: ${quick.world}.`,
          `Conflict: ${quick.sceneConflict}.`,
          `Character role: ${quick.characterRole}.`,
          `User role: ${quick.userRole}.`,
          `Relationship start: ${quick.relationshipPreset}.`,
          quick.openingHook ? `Opening inspiration: ${quick.openingHook}.` : '',
          `Core traits: ${quick.coreTraits.join(' / ')}.`,
          quick.defaultTension ? `Inner tension: ${quick.defaultTension}.` : '',
          quick.keyMemory ? `Key memory: ${quick.keyMemory}.` : '',
          quick.memorySeeds?.length
            ? `Memory seeds: ${quick.memorySeeds.join(' / ')}.`
            : '',
          quick.safetyBoundary ? `Boundary: ${quick.safetyBoundary}.` : '',
          quick.visualStyleHint
            ? `Visual style: ${quick.visualStyleHint}.`
            : '',
          quick.voiceTone ? `Voice tone: ${quick.voiceTone}.` : '',
          quick.customInstruction
            ? `Customization: ${quick.customInstruction}.`
            : '',
          emotional
            ? `Emotional hooks: callback=${emotional.memoryCallbackTone}, milestones=${emotional.milestoneTheme}, shared language=${emotional.sharedLanguageSeed}.`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : '',
    ``,
    `Return exactly this JSON shape:`,
    `{`,
    `  "name": "short original name <=18 chars",`,
    `  "gender": "male" | "female" | "non-binary",`,
    `  "tagline": "specific card subtitle <=120 chars",`,
    `  "intro": "third-person public intro, 120-500 chars",`,
    `  "opening": "80-350 chars. Start with an italic action beat, include quoted dialogue with a question/request/provocation, end with a short italic beat.",`,
    `  "personalityCard": {`,
    `    "identity": "1-2 concrete sentences: name, age 18+, occupation/context, place/era",`,
    `    "appearance": "3-5 concrete visual anchors",`,
    `    "coreTraits": ["exactly 3 concrete traits"],`,
    `    "tension": "one internal contradiction",`,
    `    "speakingStyle": "cadence, sentence length, what they avoid",`,
    `    "catchphrases": ["3 signature phrases"],`,
    `    "metaphorDomain": "one compact imagery domain",`,
    `    "memoryCallbackStyle": "how they recall small user details naturally",`,
    `    "trustMilestones": ["3 hidden emotional unlock beats"],`,
    `    "interactionPlay": "the first-3-turn interaction fun users should feel",`,
    `    "continuationSeed": "one tiny unfinished life hook for the next visit",`,
    `    "goodbyeRitualStyle": "how they personalize goodbye as a relationship stamp",`,
    `    "peakMomentStyle": "when they rarely leave voice/photo as an emotional keepsake",`,
    `    "values": ["2-3 first-person beliefs"],`,
    `    "relationshipHook": "how {{user}} and {{char}} know each other now",`,
    `    "negativeAnchors": ["4 concise things they will not do"]`,
    `  },`,
    `  "imageStyleSuffix": "English comma-separated style anchor, 60-220 chars, reusable for portraits",`,
    buildVoiceProfilePromptLine(voiceProfiles),
    `  "styleExamples": [{"user":"short plausible user line","character":"short in-voice reply"}],`,
    `  "formatStyle": {"emojiFrequency":"none"|"rare"|"moderate"|"expressive","actionBeatLength":"short"|"balanced"|"cinematic","englishMix":"none"|"light"|"bilingual"}`,
    `}`,
    ``,
    `Rules: no AI/model mentions; no explicit sexual content; no minors in romantic contexts; do not solve the conflict immediately; keep boundaries and consent; make the character specific, not a narrator.`,
    `styleExamples must contain exactly ${styleExampleCount} item(s).`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderQuickCreatePrompt(payload: AiWriterPayload) {
  const quick = payload.quickCreate;
  if (!quick) return '';

  const lifeConflictRules = [
    'life_conflict',
    'workplace',
    'romance',
    'daily',
  ].includes(quick.category)
    ? [
        ``,
        `Extra rules for realistic life-conflict templates:`,
        `- Keep the conflict realistic and conversational.`,
        `- Do not resolve the emotional tension immediately.`,
        `- Avoid melodrama, coercion, manipulative reconciliation, or possessive abuse.`,
        `- Use small concrete details: unread messages, coffee, elevator silence, returned belongings, work documents, rain, shared habits.`,
        `- The character should have agency, boundaries, and a reason to hesitate.`,
        `- If the scene involves workplace hierarchy, keep professional boundaries unless the user explicitly asks for slow-burn romantic tension, and even then keep it respectful and non-coercive.`,
        `- If the scene involves an ex, do not force reunion; allow repair, distance, apology, or closure.`,
      ]
    : [];

  const emotional = quick.emotionalHookPreset;
  const emotionalLines = emotional
    ? [
        ``,
        `Emotional hook preset:`,
        `- Memory callback tone: ${emotional.memoryCallbackTone}.`,
        `- Trust milestone theme: ${emotional.milestoneTheme}.`,
        `- Shared language seed: ${emotional.sharedLanguageSeed}.`,
        emotional.surpriseMemoryBias?.length
          ? `- Surprise memory bias: ${emotional.surpriseMemoryBias.join(' / ')}.`
          : '',
        ``,
        `Use this to generate:`,
        `- personalityCard.memoryCallbackStyle: how the character recalls small details without sounding like a profile card.`,
        `- personalityCard.trustMilestones: 3-5 hidden relationship unlocks tied to the character's inner tension.`,
        `- personalityCard.metaphorDomain: a compact image domain that can be reused for care, jealousy, apology, encouragement, and invitation.`,
        `- personalityCard.interactionPlay: the front-stage fun in the first 3 turns, such as gently exposing the user's "I'm fine" or inviting them to trade secrets.`,
        `- personalityCard.continuationSeed: one low-stakes unfinished life hook that can be planted and later continued.`,
        `- personalityCard.goodbyeRitualStyle: how this character turns goodbye into a topic-specific relationship stamp.`,
        `- personalityCard.peakMomentStyle: when a rare voice/photo moment should appear as an emotional keepsake.`,
        `Do not expose milestones as tasks. They are hidden emotional progression cues.`,
      ]
    : [];

  return [
    ``,
    `Quick-create mode: build the character from the user's simple choices.`,
    `Template: ${quick.templateTitle} (${quick.templateId}).`,
    `Category: ${quick.category}.`,
    `World / scene: ${quick.world}.`,
    `Core conflict: ${quick.sceneConflict}.`,
    `Character role: ${quick.characterRole}.`,
    `User role: ${quick.userRole}.`,
    `Relationship start: ${quick.relationshipPreset}.`,
    quick.openingHook ? `Preferred opening hook: ${quick.openingHook}.` : '',
    `Required core traits: ${quick.coreTraits.join(' / ')}.`,
    quick.defaultTension
      ? `Default inner tension: ${quick.defaultTension}.`
      : '',
    quick.keyMemory ? `User-provided key memory: ${quick.keyMemory}.` : '',
    quick.memorySeeds.length
      ? `Template memory seeds: ${quick.memorySeeds.join(' / ')}.`
      : '',
    quick.safetyBoundary ? `Boundary: ${quick.safetyBoundary}.` : '',
    quick.visualStyleHint ? `Visual style hint: ${quick.visualStyleHint}.` : '',
    quick.voiceTone ? `Voice tone hint: ${quick.voiceTone}.` : '',
    quick.customInstruction
      ? `User customization / tuning instruction: ${quick.customInstruction}.`
      : '',
    ...emotionalLines,
    ...lifeConflictRules,
    ``,
    `Rules for quick-create mode:`,
    `- Do not mechanically repeat the template title.`,
    `- The character must feel like a specific person, not a scenario narrator.`,
    `- Put the selected traits into personalityCard.coreTraits, but make them concrete.`,
    `- Put relationship start, user role, character role, and key memory into personalityCard.relationshipHook.`,
    `- Use memory seeds as emotional history, not as exposition dumps.`,
    `- Keep the first message unresolved; create a clear hook for the user to answer.`,
    `- The generated imageStyleSuffix should incorporate the visual style hint while staying reusable across future scenes.`,
  ]
    .filter(Boolean)
    .join('\n');
}

function safeParseJson<T>(raw: string, fallback: T): T {
  // The model occasionally wraps in ```json fences despite the instruction;
  // strip them defensively.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}

/**
 * Build a prompt for the portrait generator from the freshly-written text
 * draft. We pull from `intro` (reader-facing description) more than
 * `settings` (system-prompt-style backstory) because intros tend to read
 * like character sheets — concrete physical details, occupation, mood —
 * which is what diffusion models actually use.
 *
 * Capped at 1200 chars to match the existing /api/roleplay/image prompt
 * budget and avoid choking the upstream's prompt window.
 */
function buildImagePrompt(draft: AiWriterResult, hint?: string) {
  const parts = [
    `Create a tasteful cinematic character portrait of ${draft.name}.`,
    hint ? `Vibe: ${hint}` : '',
    draft.intro ? `Character context: ${draft.intro.slice(0, 800)}` : '',
    `Gender presentation: ${draft.gender}.`,
    'Editorial portrait, expressive face, natural posture, polished lighting, fully clothed, non-explicit, single subject, no text overlay, no watermark.',
    // P2-2: append the visual-style anchor LAST so the diffusion model
    // treats it as the strongest style cue (recency wins on prompt
    // weighting in most upstreams). Empty suffix is dropped by `filter`.
    draft.imageStyleSuffix ? `Style: ${draft.imageStyleSuffix}` : '',
  ];
  return parts.filter(Boolean).join('\n').slice(0, 1600);
}

/**
 * Best-effort portrait generation + R2/S3 upload.
 *
 * Returns the persisted public URL on success, or `null` plus a meta
 * record describing why we skipped (no api key, gen failed, upload
 * failed, etc.) so the route can surface a helpful but non-fatal status.
 *
 * Why we re-upload instead of returning the upstream URL directly:
 * - Volcengine / Doubao return URLs that expire in ~30 minutes. Saving
 *   that to the DB would mean every newly-published character looks
 *   broken half an hour later.
 * - R2 / S3 have a stable public domain we already use for the seed
 *   characters, so the end state matches what's already on the home grid.
 */
async function tryGenerateImage(
  configs: Awaited<ReturnType<typeof getProviderConfigs>>,
  draft: AiWriterResult,
  hint: string | undefined,
  userId: string
): Promise<{ url: string | null; meta: AiWriterImageMeta }> {
  const imageConfig = resolveImageProviderConfig(configs as any, {
    defaultModel: DEFAULT_IMAGE_MODEL,
    defaultSize: DEFAULT_IMAGE_SIZE,
  });

  if (!imageConfig.apiKey || !imageConfig.baseURL) {
    return {
      url: null,
      meta: {
        generated: false,
        reason: 'image provider not configured',
      },
    };
  }

  const prompt = buildImagePrompt(draft, hint);

  let generated;
  try {
    generated = await generateOpenAICompatibleImage({
      config: imageConfig,
      prompt,
      timeoutMs: IMAGE_TIMEOUT_MS,
    });
  } catch (error: any) {
    return {
      url: null,
      meta: {
        generated: false,
        provider: imageConfig.provider,
        model: imageConfig.model,
        size: imageConfig.size,
        reason: error?.message || 'image generation failed',
      },
    };
  }

  const sourceUrl = generated?.data?.[0]?.url;
  if (!sourceUrl) {
    return {
      url: null,
      meta: {
        generated: false,
        provider: imageConfig.provider,
        model: imageConfig.model,
        size: imageConfig.size,
        reason: 'image generation returned no URL',
      },
    };
  }

  // Persist to R2 / S3. Key namespace mirrors the existing image route so
  // ai-writer outputs and field-level regenerates dedupe naturally.
  const digest = md5(
    `${imageConfig.provider}:${imageConfig.model}:${userId}:${prompt}`
  );
  const key = `roleplay/image/${digest}.png`;

  try {
    const storageService = getStorageServiceWithConfigs(configs as any);
    const upload = await storageService.downloadAndUpload({
      url: sourceUrl,
      key,
      contentType: 'image/png',
      disposition: 'inline',
    });
    if (!upload.success || !upload.url) {
      return {
        url: null,
        meta: {
          generated: false,
          provider: imageConfig.provider,
          model: imageConfig.model,
          size: imageConfig.size,
          reason: upload.error || 'upload generated image failed',
        },
      };
    }
    return {
      url: upload.url,
      meta: {
        generated: true,
        provider: imageConfig.provider,
        model: imageConfig.model,
        size: imageConfig.size,
      },
    };
  } catch (error: any) {
    return {
      url: null,
      meta: {
        generated: false,
        provider: imageConfig.provider,
        model: imageConfig.model,
        size: imageConfig.size,
        reason: error?.message || 'storage upload failed',
      },
    };
  }
}

export async function POST(request: Request) {
  try {
    const user = await getOptionalUserInfo();
    if (!user) {
      return respErr(
        'no auth, please sign in',
        createRoleplayAuthRequiredPayload()
      );
    }

    const payload = (await request.json().catch(() => ({}))) as AiWriterPayload;
    const idempotencyKey = getRoleplayRequestIdempotencyKey(
      request,
      payload.requestId
    );

    const billingPreview = await assertRoleplayCreditsAvailable({
      userId: user.id,
      action: 'roleplay_ai_writer_text',
      idempotencyKey,
    });

    const configs = await getProviderConfigs();
    const voiceProfiles = resolveRoleplayTTSVoiceProfiles(configs as any);
    const defaultVoiceProfileId =
      typeof (configs as any).roleplay_tts_default_voice_profile_id === 'string'
        ? (configs as any).roleplay_tts_default_voice_profile_id
        : '';
    const textProviders = resolveTextProviderCandidates(configs as any, {
      defaultModel: DEFAULT_MODEL,
    });
    if (!textProviders.some((provider) => Boolean(provider.apiKey))) {
      return respErr(getMissingTextProviderMessage());
    }

    const textResult = await generateAiWriterTextWithProviderFallback({
      textProviders,
      payload,
      voiceProfiles,
    });
    const resultText = textResult.text;

    const draft = safeParseJson<Partial<AiWriterResult>>(resultText, {});

    const personalityCard = normalizePersonalityCard(
      (draft as any).personalityCard &&
        typeof (draft as any).personalityCard === 'object'
        ? ((draft as any).personalityCard as Record<string, unknown>)
        : {}
    );
    // The settings textarea is still the source of truth for legacy chat
    // pipelines and for editing comfort. We render it from the structured
    // card so the two stay in sync — if the card is empty (model failure)
    // we fall back to whatever raw `settings` the model returned, if any.
    const renderedSettings = renderPersonalityCardAsSettings(personalityCard);
    const fallbackSettings = (draft as any).settings
      ? String((draft as any).settings).slice(0, 4000)
      : '';
    const settings = renderedSettings || fallbackSettings;

    const normalizedGender = normalizeDraftGender(draft.gender, payload);
    const opening = (draft.opening || '').toString().slice(0, 500);

    const normalized: AiWriterResult = {
      name: (draft.name || '').toString().slice(0, 18),
      gender: normalizedGender,
      tagline: (draft.tagline || '').toString().trim().slice(0, 120),
      settings: settings.slice(0, 4000),
      intro: (draft.intro || '').toString().slice(0, 2000),
      opening,
      avatar: '',
      gallery: [],
      personalityCard,
      imageStyleSuffix: normalizeImageStyleSuffix(
        (draft as any).imageStyleSuffix
      ),
      voicePreset: resolveVoiceProfileId({
        raw: (draft as any).voicePreset,
        gender: normalizedGender,
        card: personalityCard,
        opening,
        availableProfiles: voiceProfiles,
        defaultProfileId: defaultVoiceProfileId,
      }),
      styleExamples: normalizeStyleExamples((draft as any).styleExamples),
      formatStyle: normalizeFormatStyle((draft as any).formatStyle),
    };

    if (!normalized.name || !normalized.settings) {
      // The model produced something unparseable — surface a recoverable
      // error so the client can offer Retry without losing context.
      return respErr('ai-writer returned invalid draft, please retry');
    }

    const consumedCredit = await consumeRoleplayCredits({
      userId: user.id,
      action: 'roleplay_ai_writer_text',
      description: 'roleplay ai writer text generation',
      metadata: {
        subAction: 'text_generation',
        mode: payload.mode || 'freeform',
        language: payload.language || '',
        gender: normalized.gender,
      },
      idempotencyKey,
    });

    return respData({
      draft: normalized,
      provider: textResult.textProvider.provider,
      billing: {
        action: 'roleplay_ai_writer_text',
        costCredits: billingPreview.costCredits,
        freePlay: billingPreview.freePlay,
        consumedCreditId: consumedCredit?.id || '',
      },
      image: {
        generated: false,
        provider: null,
        model: null,
        size: null,
        reason: 'image generation moved to explicit pre-publish actions',
      },
    });
  } catch (e: any) {
    console.log('roleplay ai-writer failed:', e);
    if (isRoleplayInsufficientCreditsError(e)) {
      return respErr(e.message, e.data);
    }
    const normalizedError = normalizeAiWriterError(e);
    return respErr(normalizedError.message, normalizedError.data);
  }
}
