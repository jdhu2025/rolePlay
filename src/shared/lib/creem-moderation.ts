import type { Configs } from '@/shared/models/config';

type CreemModerationDecision = 'allow' | 'flag' | 'deny';

type CreemModerationResult = {
  allowed: boolean;
  decision?: CreemModerationDecision;
  reason?: 'prompt_rejected' | 'moderation_unavailable';
  message?: string;
  moderationId?: string;
};

type CreemModerationOptions = {
  prompt: string;
  configs: Partial<Configs>;
  externalId: string;
  timeoutMs?: number;
  fetcher?: typeof fetch;
};

function readBooleanConfig(
  configs: Partial<Configs>,
  key: keyof Configs | string,
  fallback = false
) {
  const envKey = String(key).toUpperCase();
  const raw =
    String((configs as Record<string, unknown>)[key] || '').trim() ||
    String(process.env[envKey] || '').trim();
  if (!raw) return fallback;

  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export function shouldFailOpenCreemModeration({
  configs,
  reason,
}: {
  configs: Partial<Configs>;
  reason?: CreemModerationResult['reason'];
}) {
  if (reason !== 'moderation_unavailable') return false;

  return readBooleanConfig(configs, 'creem_moderation_fail_closed', false)
    ? false
    : readBooleanConfig(configs, 'creem_moderation_fail_open', true);
}

export function shouldModerateAIGeneration({
  mediaType,
  scene,
}: {
  mediaType?: string;
  scene?: string;
}) {
  const normalizedMediaType = String(mediaType || '').toLowerCase();
  const normalizedScene = String(scene || '').toLowerCase();

  if (normalizedMediaType === 'image') {
    return ['text-to-image', 'image-to-image'].includes(normalizedScene);
  }

  if (normalizedMediaType === 'video') {
    return ['text-to-video', 'image-to-video', 'video-to-video'].includes(
      normalizedScene
    );
  }

  return false;
}

export async function moderatePromptForCreem({
  prompt,
  configs,
  externalId,
  timeoutMs = 5000,
  fetcher = fetch,
}: CreemModerationOptions): Promise<CreemModerationResult> {
  const safePrompt = String(prompt || '').trim();
  const apiKey = String(
    configs.creem_api_key || process.env.CREEM_API_KEY || ''
  ).trim();
  const configuredBaseUrl = String(configs.creem_api_base_url || '').trim();
  const environment = String(configs.creem_environment || '').trim();
  const baseUrl =
    configuredBaseUrl ||
    (environment === 'sandbox'
      ? 'https://test-api.creem.io'
      : 'https://api.creem.io');

  if (!safePrompt || !apiKey) {
    const reason = 'moderation_unavailable';
    return {
      allowed: shouldFailOpenCreemModeration({ configs, reason }),
      reason,
      message: 'Content moderation is not configured. Please try again later.',
    };
  }

  try {
    const response = await fetcher(`${baseUrl}/v1/moderation/prompt`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        prompt: safePrompt,
        external_id: externalId,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`creem_moderation_http_${response.status}`);
    }

    const result = await response.json();
    const decision = String(result?.decision || '') as CreemModerationDecision;

    if (decision === 'allow') {
      return {
        allowed: true,
        decision,
        moderationId: String(result?.id || ''),
      };
    }

    if (decision === 'flag' || decision === 'deny') {
      return {
        allowed: false,
        decision,
        reason: 'prompt_rejected',
        message:
          'Your prompt could not be processed because it violates our content policy. Please revise and try again.',
        moderationId: String(result?.id || ''),
      };
    }

    throw new Error('creem_moderation_unknown_decision');
  } catch (error) {
    console.log('[creem:moderation] unavailable', error);
    const reason = 'moderation_unavailable';
    return {
      allowed: shouldFailOpenCreemModeration({ configs, reason }),
      reason,
      message:
        'Content moderation is temporarily unavailable. Please try again later.',
    };
  }
}
