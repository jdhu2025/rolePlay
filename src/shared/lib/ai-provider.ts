import { createOpenRouter } from '@openrouter/ai-sdk-provider';

import type { Configs } from '@/shared/models/config';

export type TextProviderConfig = {
  provider: string;
  apiKey: string;
  baseURL?: string;
  model: string;
  origin?: 'admin' | 'env' | 'legacy';
};

export type TextProviderCandidate = TextProviderConfig & {
  source: 'generic' | 'volcengine' | 'openrouter';
  origin?: 'admin' | 'env' | 'legacy';
};

export type ImageProviderConfig = {
  provider: string;
  apiKey: string;
  baseURL: string;
  model: string;
  size?: string;
};

export type TTSProviderConfig = {
  provider: string;
  endpoint: string;
  appId: string;
  accessToken: string;
  cluster: string;
  voiceType: string;
  instructions?: string;
  model?: string;
  fallbackModel?: string;
  fallbackVoiceType?: string;
  responseFormat?: 'mp3' | 'pcm';
  storageFormat?: 'mp3' | 'wav' | 'pcm';
  contentType?: string;
  pcmSampleRate?: number;
  pcmChannels?: number;
  pcmBitDepth?: number;
  fallbackEndpoint?: string;
  fallbackAccessToken?: string;
};

export type RoleplayTTSVoiceProfile = {
  id: string;
  label: string;
  provider: string;
  voiceType: string;
  voiceTypeByLocale?: Record<string, string>;
  fallbackVoiceType?: string;
  instructions?: string;
  gender?: 'male' | 'female' | 'non-binary';
  traits?: string[];
  locale?: string;
  enabled: boolean;
  sortOrder?: number;
};

type ResolveTextProviderOptions = {
  requestModel?: string;
  characterModel?: string;
  defaultModel: string;
};

type ResolveImageProviderOptions = {
  requestModel?: string;
  defaultModel: string;
  defaultSize?: string;
};

type ResolveTTSProviderOptions = {
  provider?: string;
  voiceType?: string;
  fallbackVoiceType?: string;
  instructions?: string;
  gender?: 'male' | 'female' | 'non-binary';
};

function readConfig(configs: Configs, ...keys: string[]) {
  const disableEnvFallback = configs.__disable_env_fallback === 'true';

  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    const value = String(
      configs[lowerKey] ||
        configs[key] ||
        (!disableEnvFallback ? process.env[key] : '') ||
        (!disableEnvFallback ? process.env[lowerKey] : '') ||
        ''
    ).trim();

    if (value) return value;
  }

  return '';
}

export function normalizeProviderBaseURL(value: unknown) {
  const raw = String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  if (!raw) return '';
  if (['undefined', 'null'].includes(raw.toLowerCase())) return '';

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export function hasUsableTextProviderConnection({
  source,
  provider,
  apiKey,
  baseURL,
}: {
  source: TextProviderCandidate['source'];
  provider?: unknown;
  apiKey?: unknown;
  baseURL?: unknown;
}) {
  if (!String(apiKey || '').trim()) return false;

  const normalizedProvider = String(provider || '')
    .trim()
    .toLowerCase();
  if (
    source === 'openrouter' ||
    normalizedProvider === 'openrouter' ||
    normalizedProvider === 'open-router'
  ) {
    return true;
  }

  return Boolean(normalizeProviderBaseURL(baseURL));
}

function hasConfig(configs: Configs, ...keys: string[]) {
  return keys.some((key) => Boolean(readConfig(configs, key)));
}

function matchesProviderAlias(
  provider: string,
  source: TextProviderCandidate['source']
) {
  const normalized = provider.trim().toLowerCase();
  if (!normalized) return false;
  if (source === 'generic') {
    return [
      'generic',
      'llm',
      'ai',
      'openai-compatible',
      'openai_compatible',
      'compatible',
    ].includes(normalized);
  }

  return normalized === source;
}

function readTextProviderCandidatesFromConfig(
  configs: Configs,
  options: ResolveTextProviderOptions
): TextProviderCandidate[] {
  const raw = configs.__text_provider_candidates;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((candidate): TextProviderCandidate | null => {
        const source = String(candidate?.source || '').trim();
        if (
          source !== 'generic' &&
          source !== 'volcengine' &&
          source !== 'openrouter'
        ) {
          return null;
        }

        const apiKey = String(candidate?.apiKey || '').trim();
        const baseURL =
          normalizeProviderBaseURL(candidate?.baseURL) || undefined;
        const provider =
          String(candidate?.provider || '').trim() ||
          (source === 'generic' ? 'openai-compatible' : source);
        if (
          !hasUsableTextProviderConnection({
            source,
            provider,
            apiKey,
            baseURL,
          })
        ) {
          return null;
        }

        return {
          source,
          origin:
            candidate?.origin === 'admin' || candidate?.origin === 'env'
              ? candidate.origin
              : 'legacy',
          provider,
          apiKey,
          baseURL,
          model:
            options.requestModel ||
            String(candidate?.model || '').trim() ||
            options.characterModel ||
            options.defaultModel,
        };
      })
      .filter((candidate): candidate is TextProviderCandidate =>
        Boolean(candidate)
      );
  } catch {
    return [];
  }
}

export function resolveTextProviderCandidates(
  configs: Configs,
  options: ResolveTextProviderOptions
): TextProviderCandidate[] {
  const orderedCandidates = readTextProviderCandidatesFromConfig(
    configs,
    options
  );
  if (orderedCandidates.length) return orderedCandidates;

  const explicitProvider = readConfig(configs, 'LLM_PROVIDER', 'AI_PROVIDER');
  const candidates: TextProviderCandidate[] = [];

  const genericApiKey = readConfig(
    configs,
    'LLM_API_KEY',
    'AI_API_KEY',
    'OPENAI_COMPATIBLE_API_KEY'
  );
  const genericBaseURL = readConfig(
    configs,
    'LLM_BASE_URL',
    'AI_BASE_URL',
    'OPENAI_COMPATIBLE_BASE_URL'
  );
  const normalizedGenericBaseURL = normalizeProviderBaseURL(genericBaseURL);
  const genericModel = readConfig(configs, 'LLM_MODEL', 'AI_MODEL');
  const genericIsConfigured =
    hasUsableTextProviderConnection({
      source: 'generic',
      provider: explicitProvider,
      apiKey: genericApiKey,
      baseURL: normalizedGenericBaseURL,
    }) &&
    (hasConfig(
      configs,
      'LLM_API_KEY',
      'AI_API_KEY',
      'OPENAI_COMPATIBLE_API_KEY',
      'LLM_BASE_URL',
      'AI_BASE_URL',
      'OPENAI_COMPATIBLE_BASE_URL',
      'LLM_MODEL',
      'AI_MODEL'
    ) ||
      (explicitProvider &&
        !matchesProviderAlias(explicitProvider, 'volcengine') &&
        !matchesProviderAlias(explicitProvider, 'openrouter')));

  if (genericIsConfigured) {
    candidates.push({
      source: 'generic',
      origin: 'legacy',
      provider: explicitProvider || 'openai-compatible',
      apiKey: genericApiKey,
      baseURL: normalizedGenericBaseURL,
      model:
        options.requestModel ||
        genericModel ||
        options.characterModel ||
        options.defaultModel,
    });
  }

  const volcengineApiKey = readConfig(configs, 'VOLCENGINE_API_KEY');
  const volcengineBaseURL = normalizeProviderBaseURL(
    readConfig(configs, 'VOLCENGINE_MODEL_BASE_URL', 'VOLCENGINE_BASE_URL')
  );
  if (volcengineApiKey && volcengineBaseURL) {
    candidates.push({
      source: 'volcengine',
      origin: 'legacy',
      provider: 'volcengine',
      apiKey: volcengineApiKey,
      baseURL: volcengineBaseURL,
      model:
        options.requestModel ||
        readConfig(configs, 'VOLCENGINE_TEXT_VISION_TEXT_MODEL') ||
        options.characterModel ||
        options.defaultModel,
    });
  }

  const openRouterApiKey = readConfig(configs, 'OPENROUTER_API_KEY');
  if (openRouterApiKey) {
    candidates.push({
      source: 'openrouter',
      origin: 'legacy',
      provider: 'openrouter',
      apiKey: openRouterApiKey,
      baseURL:
        normalizeProviderBaseURL(readConfig(configs, 'OPENROUTER_BASE_URL')) ||
        undefined,
      model:
        options.requestModel ||
        readConfig(configs, 'OPENROUTER_MODEL', 'ROLEPLAY_MODEL') ||
        options.characterModel ||
        options.defaultModel,
    });
  }

  const sortedCandidates = explicitProvider
    ? candidates.filter((candidate) =>
        matchesProviderAlias(explicitProvider, candidate.source)
      ).length
      ? candidates.filter((candidate) =>
          matchesProviderAlias(explicitProvider, candidate.source)
        )
      : candidates.filter((candidate) => candidate.source === 'generic')
    : candidates;

  return sortedCandidates.filter(
    (candidate, index, list) =>
      list.findIndex(
        (item) =>
          item.source === candidate.source &&
          item.apiKey === candidate.apiKey &&
          item.baseURL === candidate.baseURL &&
          item.model === candidate.model
      ) === index
  );
}

export function resolveTextProviderConfig(
  configs: Configs,
  options: ResolveTextProviderOptions
): TextProviderConfig {
  const candidates = resolveTextProviderCandidates(configs, options);
  const configuredCandidate =
    candidates.find((candidate) => Boolean(candidate.apiKey)) || candidates[0];

  if (configuredCandidate) return configuredCandidate;

  return {
    provider: 'openrouter',
    origin: 'legacy',
    apiKey: '',
    baseURL: undefined,
    model:
      options.requestModel || options.characterModel || options.defaultModel,
  };
}

export function createOpenAICompatibleChatModel(config: TextProviderConfig) {
  const provider = createOpenRouter({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  return provider.chat(config.model);
}

export function resolveImageProviderConfig(
  configs: Configs,
  options: ResolveImageProviderOptions
): ImageProviderConfig {
  const apiKey = readConfig(
    configs,
    'IMAGE_GENERATION_API_KEY',
    'IMAGE_API_KEY',
    'OPENAI_COMPATIBLE_IMAGE_API_KEY',
    'OPENROUTER_IMAGE_API_KEY',
    'OPENROUTER_API_KEY',
    'XAI_IMAGE_API_KEY',
    'XAI_API_KEY',
    'VOLCENGINE_API_KEY'
  );
  const baseURL = readConfig(
    configs,
    'IMAGE_GENERATION_BASE_URL',
    'IMAGE_BASE_URL',
    'OPENAI_COMPATIBLE_IMAGE_BASE_URL',
    'OPENROUTER_IMAGE_BASE_URL',
    'OPENROUTER_BASE_URL',
    'XAI_IMAGE_BASE_URL',
    'XAI_BASE_URL',
    'VOLCENGINE_MODEL_BASE_URL',
    'VOLCENGINE_BASE_URL'
  );
  const model = readConfig(
    configs,
    'IMAGE_GENERATION_MODEL',
    'IMAGE_MODEL',
    'OPENROUTER_IMAGE_MODEL',
    'XAI_IMAGE_MODEL',
    'VOLCENGINE_GENERAL_IMAGE_MODEL'
  );
  const size = readConfig(
    configs,
    'IMAGE_GENERATION_SIZE',
    'IMAGE_SIZE',
    'VOLCENGINE_IMAGE_SIZE'
  );
  const provider =
    readConfig(configs, 'IMAGE_GENERATION_PROVIDER', 'IMAGE_PROVIDER') ||
    inferImageProviderFromBaseURL(baseURL) ||
    (readConfig(configs, 'VOLCENGINE_API_KEY') ? 'volcengine' : 'image');
  const shouldUseDefaultSize =
    !isOpenRouterImageProvider(provider, baseURL) &&
    !isXAIImageProvider(provider, baseURL);

  return {
    provider,
    apiKey,
    baseURL: normalizeProviderBaseURL(baseURL),
    model: options.requestModel || model || options.defaultModel,
    size: size || (shouldUseDefaultSize ? options.defaultSize : undefined),
  };
}

function inferImageProviderFromBaseURL(baseURL: string) {
  const normalized = baseURL.trim().toLowerCase();
  if (normalized.includes('openrouter.ai')) return 'openrouter';
  if (normalized.includes('api.x.ai') || normalized.includes('x.ai')) {
    return 'xai';
  }

  return '';
}

function isOpenRouterImageProvider(provider: string, baseURL = '') {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedBaseURL = baseURL.trim().toLowerCase();

  return (
    normalizedProvider === 'openrouter' ||
    normalizedProvider === 'open-router' ||
    normalizedBaseURL.includes('openrouter.ai')
  );
}

function isXAIImageProvider(provider: string, baseURL = '') {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedBaseURL = baseURL.trim().toLowerCase();

  return (
    normalizedProvider === 'xai' ||
    normalizedProvider === 'x-ai' ||
    normalizedProvider === 'grok' ||
    normalizedBaseURL.includes('api.x.ai')
  );
}

function inferTTSProviderFromConfig({
  provider,
  endpoint,
  model,
}: {
  provider: string;
  endpoint: string;
  model: string;
}) {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedEndpoint = endpoint.trim().toLowerCase();
  const normalizedModel = model.trim().toLowerCase();

  if (
    ['minimax', 'minimax-t2a', 'minimax-speech', 'minimax-t2a-v2'].includes(
      normalizedProvider
    ) ||
    normalizedEndpoint.includes('api.minimax.io') ||
    normalizedEndpoint.includes('api-uw.minimax.io') ||
    normalizedEndpoint.includes('api.minimaxi.com') ||
    normalizedEndpoint.includes('api-bj.minimaxi.com') ||
    normalizedModel.startsWith('speech-')
  ) {
    return 'minimax';
  }

  if (
    [
      'alibaba',
      'aliyun',
      'dashscope',
      'cosyvoice',
      'alibaba-cosyvoice',
      'aliyun-cosyvoice',
    ].includes(normalizedProvider) ||
    normalizedEndpoint.includes('dashscope.aliyuncs.com') ||
    normalizedModel.includes('cosyvoice')
  ) {
    return 'alibaba-cosyvoice';
  }

  if (
    normalizedProvider === 'openrouter' ||
    normalizedProvider === 'open-router' ||
    normalizedEndpoint.includes('openrouter.ai') ||
    normalizedModel.includes('/')
  ) {
    return 'openrouter';
  }

  if (
    normalizedProvider === 'volcengine' ||
    normalizedProvider === 'volcengine-v1' ||
    normalizedEndpoint.includes('openspeech.bytedance.com')
  ) {
    return 'volcengine-v1';
  }

  return normalizedProvider || 'volcengine-v1';
}

function normalizeTTSResponseFormat(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  return normalized === 'pcm' ? 'pcm' : 'mp3';
}

export function inferTTSTextLocale(text: string) {
  return /[\u3400-\u9fff]/.test(text) ? 'zh-CN' : 'en-US';
}

export function resolveVoiceTypeForText(
  profile: RoleplayTTSVoiceProfile | null | undefined,
  text: string
) {
  if (!profile?.voiceTypeByLocale) return profile?.voiceType || '';

  const locale = inferTTSTextLocale(text);
  return (
    profile.voiceTypeByLocale[locale] ||
    profile.voiceTypeByLocale[locale.split('-')[0]] ||
    profile.voiceType
  );
}

function normalizeTTSVoiceForProvider(
  provider: string,
  voiceType: string,
  gender?: 'male' | 'female' | 'non-binary'
) {
  const normalized = voiceType.trim();
  if (provider !== 'openrouter') {
    if (normalized) return normalized;
    if (provider === 'minimax') {
      return gender === 'male'
        ? 'Chinese (Mandarin)_Warm_Bestie'
        : 'Chinese (Mandarin)_Warm_HeartedGirl';
    }
    if (provider === 'alibaba-cosyvoice') {
      return gender === 'male' ? 'longcheng' : 'longxiaochun';
    }
    return normalized;
  }

  const lower = normalized.toLowerCase();
  if (!lower || lower.startsWith('zh_') || lower.includes('bigtts')) {
    if (gender === 'male') return 'echo';
    if (gender === 'non-binary') return 'sage';
    return 'coral';
  }

  return normalized;
}

function resolveTTSModelForProvider(provider: string, configuredModel: string) {
  const model = configuredModel.trim();

  if (provider === 'minimax') {
    return model.startsWith('speech-') ? model : 'speech-2.8-turbo';
  }

  if (provider === 'alibaba-cosyvoice') {
    return model.includes('cosyvoice') ? model : 'cosyvoice-v3-flash';
  }

  return model;
}

function resolveTTSEndpointForProvider(
  provider: string,
  configuredEndpoint: string
) {
  const endpoint = configuredEndpoint.trim();
  const normalized = endpoint.toLowerCase();

  if (provider === 'openrouter') {
    return normalized.includes('openrouter.ai')
      ? endpoint
      : 'https://openrouter.ai/api/v1/audio/speech';
  }

  if (provider === 'minimax') {
    return normalized.includes('minimax')
      ? endpoint
      : 'https://api.minimax.io/v1/t2a_v2';
  }

  if (provider === 'alibaba-cosyvoice') {
    return normalized.includes('dashscope.aliyuncs.com')
      ? endpoint
      : 'https://dashscope.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer';
  }

  return endpoint || 'https://openspeech.bytedance.com/api/v1/tts';
}

function getMiniMaxTTSEndpointCandidates(endpoint: string) {
  return Array.from(
    new Set([
      endpoint,
      'https://api.minimaxi.com/v1/t2a_v2',
      'https://api-bj.minimaxi.com/v1/t2a_v2',
      'https://api.minimax.io/v1/t2a_v2',
    ])
  );
}

function isGeminiTTSModel(model?: string) {
  const normalized = String(model || '')
    .trim()
    .toLowerCase();
  return normalized.includes('gemini') && normalized.includes('tts');
}

const OPENROUTER_GEMINI_TTS_CHUNK_CHARS = 120;

function splitTTSText(text: string, maxChars: number) {
  const sentences = text
    .match(/[^。！？!?；;\n]+[。！？!?；;]*/g)
    ?.map((item) => item.trim()) || [text.trim()];
  const chunks: string[] = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = '';
  };

  for (const sentence of sentences) {
    if (!sentence) continue;

    if (sentence.length > maxChars) {
      pushCurrent();
      for (let index = 0; index < sentence.length; index += maxChars) {
        const chunk = sentence.slice(index, index + maxChars).trim();
        if (chunk) chunks.push(chunk);
      }
      continue;
    }

    if (current && `${current} ${sentence}`.length > maxChars) {
      pushCurrent();
    }
    current = current ? `${current} ${sentence}` : sentence;
  }

  pushCurrent();
  return chunks.length ? chunks : [text.trim()].filter(Boolean);
}

function formatGeminiTTSInput(input: string, instructions?: string) {
  const text = input.trim();
  const direction = String(instructions || '').trim();

  if (!direction) return text;

  return [
    'Perform this exact roleplay line as natural spoken dialogue.',
    `Director notes: ${direction}`,
    'Only speak the quoted line. Do not read these director notes aloud.',
    `"${text.replace(/"/g, '\\"')}"`,
  ].join('\n');
}

function buildPcmSilence({
  milliseconds,
  sampleRate,
  channels,
  bitDepth,
}: {
  milliseconds: number;
  sampleRate: number;
  channels: number;
  bitDepth: number;
}) {
  const bytesPerSample = bitDepth / 8;
  const samples = Math.floor((sampleRate * milliseconds) / 1000);
  return Buffer.alloc(samples * channels * bytesPerSample);
}

function writeAscii(buffer: Buffer, offset: number, value: string) {
  buffer.write(value, offset, value.length, 'ascii');
}

function wrapPcmInWav({
  pcm,
  sampleRate,
  channels,
  bitDepth,
}: {
  pcm: Buffer;
  sampleRate: number;
  channels: number;
  bitDepth: number;
}) {
  const header = Buffer.alloc(44);
  const bytesPerSample = bitDepth / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;

  writeAscii(header, 0, 'RIFF');
  header.writeUInt32LE(36 + pcm.length, 4);
  writeAscii(header, 8, 'WAVE');
  writeAscii(header, 12, 'fmt ');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  writeAscii(header, 36, 'data');
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

function buildImageEndpoint(baseURL: string, path: string) {
  const normalizedBaseURL = baseURL.trim().replace(/\/+$/, '');
  if (!normalizedBaseURL) return path;

  if (normalizedBaseURL.endsWith(path)) return normalizedBaseURL;

  if (path === '/chat/completions' && normalizedBaseURL.endsWith('/api/v1')) {
    return `${normalizedBaseURL}${path}`;
  }

  if (
    path === '/chat/completions' &&
    normalizedBaseURL === 'https://openrouter.ai'
  ) {
    return `${normalizedBaseURL}/api/v1${path}`;
  }

  return `${normalizedBaseURL}${path}`;
}

export async function generateOpenAICompatibleImage({
  config,
  prompt,
  size,
  imageInput,
  timeoutMs = 60_000,
}: {
  config: ImageProviderConfig;
  prompt: string;
  size?: string;
  imageInput?: string | string[];
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const isImageToImage = Boolean(imageInput);
  let response: Response;
  try {
    if (isOpenRouterImageProvider(config.provider, config.baseURL)) {
      response = await fetch(
        buildImageEndpoint(config.baseURL, '/chat/completions'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            buildOpenRouterImagePayload(config, prompt, size, imageInput)
          ),
          signal: controller.signal,
        }
      );
    } else if (
      isXAIImageProvider(config.provider, config.baseURL) &&
      imageInput
    ) {
      response = await fetch(
        buildImageEndpoint(config.baseURL, '/images/edits'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            buildXAIImageEditPayload(config, prompt, size, imageInput)
          ),
          signal: controller.signal,
        }
      );
    } else if (isXAIImageProvider(config.provider, config.baseURL)) {
      response = await fetch(
        buildImageEndpoint(config.baseURL, '/images/generations'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(
            buildXAIImageGenerationPayload(config, prompt, size)
          ),
          signal: controller.signal,
        }
      );
    } else {
      response = await fetch(
        buildImageEndpoint(config.baseURL, '/images/generations'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.model,
            watermark: false,
            prompt,
            ...(imageInput
              ? { image: Array.isArray(imageInput) ? imageInput : [imageInput] }
              : {}),
            size: size || config.size,
            ...(isImageToImage
              ? {
                  sequential_image_generation: 'auto',
                  sequential_image_generation_options: {
                    max_images: 1,
                  },
                }
              : {
                  n: 1,
                  response_format: 'url',
                }),
          }),
          signal: controller.signal,
        }
      );
    }
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const text = await response.text();
    const urls = extractImageUrlsFromText(text);

    if (!urls.length) {
      throw new Error(`image generation stream returned no URL: ${text}`);
    }

    return {
      created: Date.now(),
      data: urls.map((url) => ({ url })),
    };
  }

  const json = await response.json();

  if (isOpenRouterImageProvider(config.provider, config.baseURL)) {
    const urls = extractOpenRouterImageUrls(json);
    if (!urls.length) {
      throw new Error(`OpenRouter image generation returned no image URL`);
    }

    return {
      created: Date.now(),
      data: urls.map((url) => ({ url })),
    };
  }

  return normalizeImageGenerationResponse(json) as {
    created?: number;
    data?: Array<{ url?: string; b64_json?: string }>;
  };
}

function buildOpenRouterImagePayload(
  config: ImageProviderConfig,
  prompt: string,
  size?: string,
  imageInput?: string | string[]
) {
  const imageInputs = Array.isArray(imageInput)
    ? imageInput.filter(Boolean)
    : imageInput
      ? [imageInput]
      : [];
  const content =
    imageInputs.length > 0
      ? [
          { type: 'text', text: prompt },
          ...imageInputs.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
        ]
      : prompt;
  const imageSize = size || config.size;

  return {
    model: config.model,
    messages: [{ role: 'user', content }],
    modalities: isLikelyOpenRouterImageOnlyModel(config.model)
      ? ['image']
      : ['image', 'text'],
    stream: false,
    ...(imageSize ? { image_config: { size: imageSize } } : {}),
  };
}

function buildXAIImageGenerationPayload(
  config: ImageProviderConfig,
  prompt: string,
  size?: string
) {
  return {
    model: config.model,
    prompt,
    n: 1,
    response_format: 'url',
    ...(size || config.size ? { size: size || config.size } : {}),
  };
}

function buildXAIImageEditPayload(
  config: ImageProviderConfig,
  prompt: string,
  size?: string,
  imageInput?: string | string[]
) {
  const images = Array.isArray(imageInput)
    ? imageInput.filter(Boolean)
    : imageInput
      ? [imageInput]
      : [];
  const imagePayload = images.map((url) => ({
    type: 'image_url',
    url,
  }));

  return {
    model: config.model,
    prompt,
    image: imagePayload.length === 1 ? imagePayload[0] : imagePayload,
    ...(size || config.size ? { size: size || config.size } : {}),
  };
}

function extractOpenRouterImageUrls(result: unknown) {
  const urls: string[] = [];
  const choices = Array.isArray((result as any)?.choices)
    ? (result as any).choices
    : [];

  for (const choice of choices) {
    const message = choice?.message || {};
    const images = Array.isArray(message.images) ? message.images : [];

    for (const image of images) {
      const url =
        image?.image_url?.url ||
        image?.imageUrl?.url ||
        image?.url ||
        image?.image_url ||
        image?.imageUrl;
      if (typeof url === 'string' && url.trim()) {
        urls.push(url.trim());
      }
    }

    if (typeof message.content === 'string') {
      urls.push(...extractImageUrlsFromText(message.content));
      urls.push(...extractDataImageUrlsFromText(message.content));
    }
  }

  return Array.from(new Set(urls));
}

function isLikelyOpenRouterImageOnlyModel(model: string) {
  const normalized = model.trim().toLowerCase();

  return (
    normalized.includes('grok-imagine') ||
    normalized.includes('/flux') ||
    normalized.includes('sourceful/')
  );
}

function normalizeImageGenerationResponse(result: any) {
  const data = Array.isArray(result?.data) ? result.data : [];

  return {
    ...result,
    data: data.map((item: any) => ({
      ...item,
      url:
        item?.url ||
        (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : undefined),
    })),
  };
}

function extractImageUrlsFromText(text: string) {
  const urls = text.match(/https?:\/\/[^\s"'<>]+/g) || [];
  return Array.from(new Set(urls));
}

function extractDataImageUrlsFromText(text: string) {
  const urls =
    text.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g) || [];
  return Array.from(new Set(urls));
}

type RawVoiceProfile = Partial<RoleplayTTSVoiceProfile> & {
  id?: unknown;
  label?: unknown;
  provider?: unknown;
  voiceType?: unknown;
  voiceTypeByLocale?: unknown;
  fallbackVoiceType?: unknown;
  instructions?: unknown;
  gender?: unknown;
  traits?: unknown;
  locale?: unknown;
  enabled?: unknown;
  sortOrder?: unknown;
};

const SAFE_ROLEPLAY_VOICE_LABELS: Record<string, string> = {
  'minimax female - soft warm': 'Female Warm Voice',
  'minimax female - tender quiet': 'Female Quiet Voice',
  'minimax female - playful bright': 'Female Bright Voice',
  'minimax female - mature smooth': 'Female Smooth Voice',
  'minimax female - clear sweet': 'Female Clear Voice',
  'minimax male - warm gentle': 'Male Gentle Voice',
  'minimax male - deep protective': 'Male Deep Voice',
  'minimax male - modern casual': 'Male Modern Voice',
  'minimax male - smooth refined': 'Male Refined Voice',
  'minimax male - playful friendly': 'Male Friendly Voice',
  'minimax neutral - soft balanced': 'Neutral Balanced Voice',
  'minimax neutral - clear warm': 'Neutral Clear Voice',
  'warm female (legacy)': 'Female Warm Voice',
  'cool female (legacy)': 'Female Composed Voice',
  'playful female (legacy)': 'Female Bright Voice',
  'warm male (legacy)': 'Male Gentle Voice',
  'cool male (legacy)': 'Male Steady Voice',
  'playful male (legacy)': 'Male Friendly Voice',
  'neutral (legacy)': 'Neutral Balanced Voice',
};

const UNSAFE_ROLEPLAY_VOICE_LABEL_WORDS =
  /\b(MiniMax|Mature|Playful|legacy)\b/gi;

export function getCreemSafeRoleplayVoiceLabel(label: string) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return 'Balanced Voice';

  const direct = SAFE_ROLEPLAY_VOICE_LABELS[trimmed.toLowerCase()];
  if (direct) return direct;

  const providerFree = trimmed
    .replace(/^MiniMax\s+/i, '')
    .replace(/\s*\(legacy\)\s*$/i, '')
    .replace(/\s*-\s*/g, ' ');
  const sanitized = providerFree
    .replace(UNSAFE_ROLEPLAY_VOICE_LABEL_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = sanitized || 'Balanced';

  return /\bvoice\b/i.test(base) ? base : `${base} Voice`;
}

function normalizeVoiceProfile(
  raw: RawVoiceProfile,
  index: number
): RoleplayTTSVoiceProfile | null {
  const id = String(raw.id || '').trim();
  const label = String(raw.label || '').trim();
  const voiceType = String(raw.voiceType || '').trim();
  const fallbackVoiceType = String(raw.fallbackVoiceType || '').trim();
  const instructions = String(raw.instructions || '').trim();

  if (!id || !label || !voiceType) {
    return null;
  }

  const gender =
    raw.gender === 'male' ||
    raw.gender === 'female' ||
    raw.gender === 'non-binary'
      ? raw.gender
      : undefined;

  return {
    id,
    label: getCreemSafeRoleplayVoiceLabel(label),
    provider: String(raw.provider || 'volcengine-v1').trim() || 'volcengine-v1',
    voiceType,
    voiceTypeByLocale:
      raw.voiceTypeByLocale &&
      typeof raw.voiceTypeByLocale === 'object' &&
      !Array.isArray(raw.voiceTypeByLocale)
        ? Object.fromEntries(
            Object.entries(raw.voiceTypeByLocale as Record<string, unknown>)
              .map(([locale, value]) => [
                String(locale || '').trim(),
                String(value || '').trim(),
              ])
              .filter(([locale, value]) => locale && value)
          )
        : undefined,
    fallbackVoiceType,
    instructions,
    gender,
    traits: Array.isArray(raw.traits)
      ? raw.traits.map((item) => String(item).trim()).filter(Boolean)
      : [],
    locale: String(raw.locale || '').trim() || undefined,
    enabled: raw.enabled !== false,
    sortOrder:
      typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder)
        ? raw.sortOrder
        : index,
  } satisfies RoleplayTTSVoiceProfile;
}

const LEGACY_ROLEPLAY_TTS_VOICE_PROFILES: RoleplayTTSVoiceProfile[] = [
  {
    id: 'warm-female',
    label: 'Female Warm Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Warm_HeartedGirl',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Warm_HeartedGirl',
      'en-US': 'English_SereneWoman',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Warm_Bestie',
    instructions:
      'Warm, gentle female voice. Keep delivery natural and emotionally present.',
    gender: 'female',
    traits: ['warm', 'gentle'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9001,
  },
  {
    id: 'cool-female',
    label: 'Female Composed Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Mature_Woman',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Mature_Woman',
      'en-US': 'English_ConfidentWoman',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Wise_Women',
    instructions: 'Cool, composed female voice with restrained emotion.',
    gender: 'female',
    traits: ['cool', 'composed'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9002,
  },
  {
    id: 'playful-female',
    label: 'Female Bright Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Crisp_Girl',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Crisp_Girl',
      'en-US': 'English_PlayfulGirl',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Warm_Girl',
    instructions:
      'Playful, expressive female voice. Add light smiles and lively emotional color.',
    gender: 'female',
    traits: ['playful', 'bright'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9003,
  },
  {
    id: 'warm-male',
    label: 'Male Gentle Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Gentleman',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Gentleman',
      'en-US': 'English_Gentle-voiced_man',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Gentle_Youth',
    instructions:
      'Warm, emotionally open male voice. Keep it intimate and conversational.',
    gender: 'male',
    traits: ['warm', 'romantic'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9004,
  },
  {
    id: 'cool-male',
    label: 'Male Steady Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Reliable_Executive',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Reliable_Executive',
      'en-US': 'English_Deep-VoicedGentleman',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Gentleman',
    instructions:
      'Cool, modern male voice. Keep delivery calm, direct, and natural.',
    gender: 'male',
    traits: ['cool', 'modern'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9005,
  },
  {
    id: 'playful-male',
    label: 'Male Friendly Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Unrestrained_Young_Man',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Unrestrained_Young_Man',
      'en-US': 'English_Jovialman',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Southern_Young_Man',
    instructions:
      'Playful, friendly male voice. Keep it lively without sounding cartoonish.',
    gender: 'male',
    traits: ['playful', 'friendly'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9006,
  },
  {
    id: 'neutral',
    label: 'Neutral Balanced Voice',
    provider: 'minimax',
    voiceType: 'Chinese (Mandarin)_Sincere_Adult',
    voiceTypeByLocale: {
      'zh-CN': 'Chinese (Mandarin)_Sincere_Adult',
      'en-US': 'English_FriendlyPerson',
    },
    fallbackVoiceType: 'Chinese (Mandarin)_Warm_Bestie',
    instructions:
      'Neutral, balanced voice. Keep gender presentation subtle and delivery responsive.',
    gender: 'non-binary',
    traits: ['neutral', 'balanced'],
    locale: 'zh-CN',
    enabled: true,
    sortOrder: 9007,
  },
];

export function resolveRoleplayTTSVoiceProfiles(configs: Configs) {
  const raw = readConfig(configs, 'ROLEPLAY_TTS_VOICE_PROFILES');
  let configuredProfiles: RoleplayTTSVoiceProfile[] = [];

  try {
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        configuredProfiles = parsed
          .map((item, index) =>
            normalizeVoiceProfile((item || {}) as RawVoiceProfile, index)
          )
          .filter((item): item is RoleplayTTSVoiceProfile => Boolean(item))
          .filter((item) => item.enabled);
      }
    }
  } catch {
    configuredProfiles = [];
  }

  const configuredIds = new Set(
    configuredProfiles.map((profile) => profile.id)
  );
  return [
    ...configuredProfiles,
    ...LEGACY_ROLEPLAY_TTS_VOICE_PROFILES.filter(
      (profile) => !configuredIds.has(profile.id)
    ),
  ].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

export function resolveRoleplayTTSVoiceProfileById(
  configs: Configs,
  profileId?: string | null
) {
  const normalizedId = String(profileId || '').trim();
  if (!normalizedId) return null;

  return (
    resolveRoleplayTTSVoiceProfiles(configs).find(
      (profile) => profile.id === normalizedId
    ) || null
  );
}

export function resolveTTSProviderConfig(
  configs: Configs,
  options: ResolveTTSProviderOptions = {}
): TTSProviderConfig {
  const accessToken = readConfig(
    configs,
    'VOLCENGINE_GENERAL_TTS_ACCESS_TOKEN',
    'VOLCENGINE_GENERAL_TTS_Access_Token',
    'VOLCENGINE_TTS_ACCESS_TOKEN',
    'VOLCENGINE_GENERAL_TTS_KEY',
    'VOLCENGINE_GENERAL_TTS_key',
    'VOLCENGINE_TTS_API_KEY'
  );
  const appId = readConfig(
    configs,
    'ROLEPLAY_TTS_APP_ID',
    'TTS_APP_ID',
    'VOLCENGINE_GENERAL_TTS_APPID',
    'VOLCENGINE_TTS_APPID',
    'VOLCENGINE_TTS_APP_ID'
  );
  const configuredEndpoint = readConfig(
    configs,
    'ROLEPLAY_TTS_ENDPOINT',
    'TTS_ENDPOINT',
    'MINIMAX_TTS_ENDPOINT',
    'DASHSCOPE_TTS_ENDPOINT',
    'ALIBABA_TTS_ENDPOINT',
    'VOLCENGINE_TTS_ENDPOINT'
  );
  const model = readConfig(configs, 'ROLEPLAY_TTS_MODEL', 'TTS_MODEL');
  const fallbackModel = readConfig(
    configs,
    'ROLEPLAY_TTS_FALLBACK_MODEL',
    'TTS_FALLBACK_MODEL'
  );
  const provider = inferTTSProviderFromConfig({
    provider:
      options.provider ||
      readConfig(configs, 'ROLEPLAY_TTS_PROVIDER', 'TTS_PROVIDER'),
    endpoint: configuredEndpoint,
    model,
  });
  const resolvedModel = resolveTTSModelForProvider(provider, model);
  const fallbackVoiceType = normalizeTTSVoiceForProvider(
    provider,
    options.fallbackVoiceType ||
      readConfig(
        configs,
        'ROLEPLAY_TTS_FALLBACK_VOICE',
        'TTS_FALLBACK_VOICE'
      ) ||
      'alloy',
    options.gender
  );
  const genericTTSApiKey = readConfig(
    configs,
    'ROLEPLAY_TTS_API_KEY',
    'TTS_API_KEY'
  );
  const openRouterFallbackApiKey = readConfig(
    configs,
    'OPENROUTER_TTS_API_KEY',
    'OPENROUTER_API_KEY'
  );
  const openRouterApiKey = genericTTSApiKey || openRouterFallbackApiKey;
  const minimaxApiKey = readConfig(
    configs,
    'MINIMAX_TTS_API_KEY',
    'MINIMAX_API_KEY'
  );
  const dashscopeApiKey = readConfig(
    configs,
    'DASHSCOPE_API_KEY',
    'ALIBABA_TTS_API_KEY',
    'ALIYUN_TTS_API_KEY',
    'ALIBABA_API_KEY'
  );
  const isOpenRouterGeminiTTS =
    provider === 'openrouter' && isGeminiTTSModel(model);
  const configuredResponseFormat = isOpenRouterGeminiTTS
    ? undefined
    : normalizeTTSResponseFormat(
        readConfig(
          configs,
          'ROLEPLAY_TTS_RESPONSE_FORMAT',
          'TTS_RESPONSE_FORMAT'
        )
      );
  const responseFormat =
    configuredResponseFormat || (provider === 'openrouter' ? undefined : 'mp3');
  const resolvedVoiceType = normalizeTTSVoiceForProvider(
    provider,
    options.voiceType ||
      readConfig(configs, 'ROLEPLAY_TTS_VOICE', 'TTS_VOICE') ||
      (provider === 'volcengine-v1'
        ? 'zh_female_kailangjiejie_moon_bigtts'
        : ''),
    options.gender
  );

  return {
    provider,
    endpoint: resolveTTSEndpointForProvider(provider, configuredEndpoint),
    appId,
    accessToken:
      provider === 'openrouter'
        ? openRouterApiKey || accessToken
        : provider === 'minimax'
          ? minimaxApiKey || genericTTSApiKey || accessToken
          : provider === 'alibaba-cosyvoice'
            ? dashscopeApiKey || genericTTSApiKey || accessToken
            : accessToken,
    cluster:
      readConfig(configs, 'ROLEPLAY_TTS_CLUSTER', 'VOLCENGINE_TTS_CLUSTER') ||
      'volcano_tts',
    voiceType: resolvedVoiceType,
    instructions: options.instructions,
    model:
      resolvedModel ||
      (provider === 'minimax'
        ? 'speech-2.8-turbo'
        : provider === 'alibaba-cosyvoice'
          ? 'cosyvoice-v3-flash'
          : model),
    fallbackModel:
      provider === 'openrouter'
        ? fallbackModel || 'google/gemini-3.1-flash-tts-preview'
        : '',
    fallbackVoiceType,
    responseFormat,
    storageFormat:
      isOpenRouterGeminiTTS || responseFormat === 'pcm' ? 'wav' : 'mp3',
    contentType:
      isOpenRouterGeminiTTS || responseFormat === 'pcm'
        ? 'audio/wav'
        : 'audio/mpeg',
    pcmSampleRate:
      Number(readConfig(configs, 'ROLEPLAY_TTS_PCM_SAMPLE_RATE')) || 24000,
    pcmChannels: Number(readConfig(configs, 'ROLEPLAY_TTS_PCM_CHANNELS')) || 1,
    pcmBitDepth:
      Number(readConfig(configs, 'ROLEPLAY_TTS_PCM_BIT_DEPTH')) || 16,
    fallbackEndpoint:
      readConfig(configs, 'ROLEPLAY_TTS_FALLBACK_ENDPOINT') ||
      'https://openrouter.ai/api/v1/audio/speech',
    fallbackAccessToken:
      openRouterFallbackApiKey ||
      (provider === 'openrouter' ? openRouterApiKey : ''),
  };
}

export async function generateOpenRouterSpeech({
  config,
  text,
  timeoutMs = 45_000,
}: {
  config: TTSProviderConfig;
  text: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isGeminiTTS = isGeminiTTSModel(config.model);
    const sampleRate = config.pcmSampleRate || 24000;
    const channels = config.pcmChannels || 1;
    const bitDepth = config.pcmBitDepth || 16;

    const requestSpeech = async ({
      input,
      model,
      voice,
      responseFormat,
      chunk,
      totalChunks,
    }: {
      input: string;
      model?: string;
      voice?: string;
      responseFormat?: 'mp3' | 'pcm';
      chunk?: number;
      totalChunks?: number;
    }) => {
      const payloadModel = model || config.model;
      const payloadIsGeminiTTS = isGeminiTTSModel(payloadModel);
      const payloadInput = payloadIsGeminiTTS
        ? formatGeminiTTSInput(input, config.instructions)
        : input;
      const payload = {
        model: payloadModel,
        input: payloadInput,
        voice: voice || config.voiceType || 'alloy',
        ...(config.instructions ? { instructions: config.instructions } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {}),
      };
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          [
            `OpenRouter TTS failed (${response.status})`,
            `model=${payload.model || ''}`,
            `voice=${payload.voice}`,
            `chars=${payloadInput.length}`,
            `response_format=${responseFormat || 'default'}`,
            chunk && totalChunks ? `chunk=${chunk}/${totalChunks}` : '',
            model ? `fallback_from=${config.model || ''}` : '',
            `generation=${response.headers.get('x-generation-id') || ''}`,
            errorBody,
          ]
            .filter(Boolean)
            .join(' ')
        );
      }

      return Buffer.from(await response.arrayBuffer());
    };

    if (isGeminiTTS && text.length > OPENROUTER_GEMINI_TTS_CHUNK_CHARS) {
      const chunks = splitTTSText(text, OPENROUTER_GEMINI_TTS_CHUNK_CHARS);
      const silence = buildPcmSilence({
        milliseconds: 140,
        sampleRate,
        channels,
        bitDepth,
      });
      const pcmChunks: Buffer[] = [];

      try {
        for (const [index, chunk] of chunks.entries()) {
          pcmChunks.push(
            await requestSpeech({
              input: chunk,
              chunk: index + 1,
              totalChunks: chunks.length,
            })
          );
          if (index < chunks.length - 1) pcmChunks.push(silence);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          !config.fallbackModel ||
          !message.includes('OpenRouter TTS failed (5')
        ) {
          throw error;
        }
        return requestSpeech({
          input: text,
          model: config.fallbackModel,
          voice: config.fallbackVoiceType || 'alloy',
          responseFormat: 'mp3',
        });
      }

      return wrapPcmInWav({
        pcm: Buffer.concat(pcmChunks),
        sampleRate,
        channels,
        bitDepth,
      });
    }

    let audio: Buffer;
    try {
      audio = await requestSpeech({
        input: text,
        responseFormat: config.responseFormat,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (
        !config.fallbackModel ||
        !message.includes('OpenRouter TTS failed (5')
      ) {
        throw error;
      }
      audio = await requestSpeech({
        input: text,
        model: config.fallbackModel,
        voice: config.fallbackVoiceType || 'alloy',
        responseFormat: 'mp3',
      });
      return audio;
    }
    if (
      config.storageFormat === 'wav' &&
      (config.responseFormat === 'pcm' || isGeminiTTS)
    ) {
      return wrapPcmInWav({
        pcm: audio,
        sampleRate,
        channels,
        bitDepth,
      });
    }

    return audio;
  } finally {
    clearTimeout(timeout);
  }
}

export async function synthesizeVolcengineTTS({
  config,
  text,
  userId,
  speedRatio = 1,
  loudnessRatio = 1,
  emotion,
  timeoutMs = 45_000,
}: {
  config: TTSProviderConfig;
  text: string;
  userId: string;
  speedRatio?: number;
  loudnessRatio?: number;
  emotion?: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer; ${config.accessToken || 'token'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app: {
          appid: config.appId,
          token: config.accessToken,
          cluster: config.cluster,
        },
        user: {
          uid: userId,
        },
        audio: {
          voice_type: config.voiceType,
          encoding: 'mp3',
          speed_ratio: speedRatio,
          volume_ratio: loudnessRatio,
          ...(emotion ? { emotion } : {}),
        },
        request: {
          reqid: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          text,
          operation: 'query',
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return (await response.json()) as {
      code?: number;
      message?: string;
      data?: string;
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateVolcengineV1Speech({
  config,
  text,
  userId = 'roleplay',
}: {
  config: TTSProviderConfig;
  text: string;
  userId?: string;
}) {
  const result = await synthesizeVolcengineTTS({
    config,
    text,
    userId,
  });

  if (result.code && result.code !== 3000) {
    throw new Error(result.message || `Volcengine TTS failed: ${result.code}`);
  }

  if (!result.data) {
    throw new Error(result.message || 'Volcengine TTS returned no audio data');
  }

  return Buffer.from(result.data, 'base64');
}

export async function generateMiniMaxSpeech({
  config,
  text,
  timeoutMs = 45_000,
}: {
  config: TTSProviderConfig;
  text: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = JSON.stringify({
      model: config.model || 'speech-2.8-turbo',
      text,
      stream: false,
      language_boost: 'auto',
      output_format: 'hex',
      voice_setting: {
        voice_id: config.voiceType,
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: config.responseFormat || 'mp3',
        channel: 1,
      },
    });
    let lastError = 'MiniMax TTS failed';

    for (const endpoint of getMiniMaxTTSEndpointCandidates(config.endpoint)) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        lastError = `MiniMax TTS failed (${response.status}) endpoint=${endpoint} ${await response.text()}`;
        if (response.status === 401 || response.status === 403) continue;
        throw new Error(lastError);
      }

      const result = await response.json();
      const statusCode = Number(result?.base_resp?.status_code || 0);
      const statusMessage = String(
        result?.base_resp?.status_msg ||
          `MiniMax TTS failed: ${result?.base_resp?.status_code}`
      );
      if (statusCode !== 0) {
        lastError = `${statusMessage} endpoint=${endpoint}`;
        if (/invalid api key/i.test(statusMessage)) continue;
        throw new Error(lastError);
      }

      const audioHex = String(result?.data?.audio || '').trim();
      if (!audioHex) {
        throw new Error(
          `MiniMax TTS returned no audio data endpoint=${endpoint}`
        );
      }

      return Buffer.from(audioHex, 'hex');
    }

    throw new Error(lastError);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateAlibabaCosyVoiceSpeech({
  config,
  text,
  timeoutMs = 45_000,
}: {
  config: TTSProviderConfig;
  text: string;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'cosyvoice-v3-flash',
        input: {
          text,
          voice: config.voiceType,
          format: config.responseFormat || 'mp3',
          sample_rate: config.pcmSampleRate || 24000,
          ...(config.instructions ? { instruction: config.instructions } : {}),
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result = await response.json();
    const audioData = String(result?.output?.audio?.data || '').trim();
    if (audioData) {
      return Buffer.from(audioData, 'base64');
    }

    const audioUrl = String(result?.output?.audio?.url || '').trim();
    if (!audioUrl) {
      throw new Error('Alibaba CosyVoice TTS returned no audio URL or data');
    }

    const audioResponse = await fetch(audioUrl, { signal: controller.signal });
    if (!audioResponse.ok) {
      throw new Error(await audioResponse.text());
    }

    return Buffer.from(await audioResponse.arrayBuffer());
  } finally {
    clearTimeout(timeout);
  }
}

async function generateOpenRouterFallbackSpeech({
  config,
  text,
}: {
  config: TTSProviderConfig;
  text: string;
}) {
  if (!config.fallbackAccessToken || !config.fallbackModel) return null;

  return generateOpenRouterSpeech({
    config: {
      ...config,
      provider: 'openrouter',
      endpoint:
        config.fallbackEndpoint || 'https://openrouter.ai/api/v1/audio/speech',
      accessToken: config.fallbackAccessToken,
      model: config.fallbackModel,
      voiceType: config.fallbackVoiceType || 'alloy',
      responseFormat: 'mp3',
      storageFormat: 'mp3',
      contentType: 'audio/mpeg',
    },
    text,
  });
}

export async function generateTTSSpeech({
  config,
  text,
  userId = 'roleplay',
}: {
  config: TTSProviderConfig;
  text: string;
  userId?: string;
}) {
  if (config.provider === 'openrouter') {
    return generateOpenRouterSpeech({ config, text });
  }

  try {
    if (config.provider === 'minimax') {
      return await generateMiniMaxSpeech({ config, text });
    }

    if (config.provider === 'alibaba-cosyvoice') {
      return await generateAlibabaCosyVoiceSpeech({ config, text });
    }

    return await generateVolcengineV1Speech({ config, text, userId });
  } catch (error) {
    const fallbackAudio = await generateOpenRouterFallbackSpeech({
      config,
      text,
    });
    if (fallbackAudio) return fallbackAudio;
    throw error;
  }
}

export function getMissingTextProviderMessage() {
  return [
    'Roleplay text provider is not configured.',
    'Set LLM_API_KEY for a generic OpenAI-compatible provider,',
    'or VOLCENGINE_API_KEY / OPENROUTER_API_KEY for provider-specific aliases.',
  ].join(' ');
}

export function getMissingImageProviderMessage() {
  return [
    'Roleplay image provider is not configured.',
    'Set IMAGE_GENERATION_API_KEY / IMAGE_GENERATION_BASE_URL,',
    'or rely on VOLCENGINE_API_KEY / VOLCENGINE_BASE_URL aliases.',
  ].join(' ');
}

export function getMissingTTSProviderMessage() {
  return [
    'Roleplay TTS provider is not configured.',
    'Set ROLEPLAY_TTS_PROVIDER / ROLEPLAY_TTS_API_KEY / ROLEPLAY_TTS_MODEL,',
    'or VOLCENGINE_GENERAL_TTS_APPID and VOLCENGINE_GENERAL_TTS_ACCESS_TOKEN.',
  ].join(' ');
}

export function getRoleplayTTSVoiceProfileLabel(
  configs: Configs,
  profileId?: string | null
) {
  return resolveRoleplayTTSVoiceProfileById(configs, profileId)?.label || '';
}

export function isOpenRouterModel(model: string) {
  return /^([a-z0-9-]+\/[a-z0-9-._]+)$/i.test(model);
}

export function ensureOpenRouterModelPrefix(model: string) {
  const normalized = String(model || '').trim();
  if (!normalized) return normalized;
  return isOpenRouterModel(normalized) ? normalized : normalized;
}

export function getTextProviderDebugSummary(config: TextProviderConfig) {
  return {
    provider: config.provider,
    origin: config.origin || '',
    baseURL: config.baseURL || '',
    model: config.model,
    hasApiKey: Boolean(config.apiKey),
  };
}
