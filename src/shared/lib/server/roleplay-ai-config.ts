import {
  hasUsableTextProviderConnection,
  normalizeProviderBaseURL,
} from '@/shared/lib/ai-provider';
import {
  getAllConfigs,
  getConfigs,
  type Configs,
} from '@/shared/models/config';

const TEXT_PROVIDER_CANDIDATES_KEY = '__text_provider_candidates';
const DISABLE_ENV_FALLBACK_FLAG = '__disable_env_fallback';

const OPENROUTER_TEXT_CONFIG_KEYS = [
  'openrouter_api_key',
  'openrouter_base_url',
  'openrouter_model',
  'roleplay_model',
  'roleplay_fast_model',
];

const ROLEPLAY_LLM_CONFIG_KEYS = [
  'llm_provider',
  'llm_api_key',
  'llm_base_url',
  'llm_model',
  'ai_provider',
  'ai_api_key',
  'ai_base_url',
  'ai_model',
  'openai_compatible_api_key',
  'openai_compatible_base_url',
];

const ROLEPLAY_IMAGE_CONFIG_KEYS = [
  'image_generation_provider',
  'image_generation_api_key',
  'image_generation_base_url',
  'image_generation_model',
  'image_generation_size',
  'image_provider',
  'image_api_key',
  'image_base_url',
  'image_model',
  'image_size',
  'openai_compatible_image_api_key',
  'openai_compatible_image_base_url',
  'openrouter_image_api_key',
  'openrouter_image_base_url',
  'openrouter_image_model',
  'openrouter_api_key',
  'openrouter_base_url',
  'xai_image_api_key',
  'xai_image_base_url',
  'xai_image_model',
  'xai_api_key',
  'xai_base_url',
  'volcengine_api_key',
  'volcengine_model_base_url',
  'volcengine_base_url',
  'volcengine_general_image_model',
  'volcengine_image_size',
];

function hasAdminConfig(configs: Configs, keys: string[]) {
  return keys.some((key) => Boolean(configs[key]?.trim()));
}

function readFromConfigs(configs: Configs, ...keys: string[]) {
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    const value = configs[lowerKey] || configs[key] || '';
    if (value) return value;
  }

  return '';
}

function readFromEnv(...keys: string[]) {
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    const upperKey = key.toUpperCase();
    const value =
      process.env[upperKey] || process.env[key] || process.env[lowerKey] || '';
    if (value) return value;
  }

  return '';
}

type TextProviderCandidateSource = 'generic' | 'volcengine' | 'openrouter';
type TextProviderCandidateOrigin = 'admin' | 'env';
type TextProviderCandidate = {
  provider: string;
  source: TextProviderCandidateSource;
  origin: TextProviderCandidateOrigin;
  apiKey: string;
  baseURL?: string;
  model?: string;
};

function pushTextProviderCandidate(
  candidates: TextProviderCandidate[],
  candidate: TextProviderCandidate
) {
  if (
    hasUsableTextProviderConnection({
      source: candidate.source,
      provider: candidate.provider,
      apiKey: candidate.apiKey,
      baseURL: candidate.baseURL,
    })
  ) {
    candidates.push(candidate);
  }
}

function buildTextProviderCandidates(
  adminConfigs: Configs,
  { includeEnvFallback = true }: { includeEnvFallback?: boolean } = {}
) {
  const candidates: TextProviderCandidate[] = [];

  if (hasAdminConfig(adminConfigs, ROLEPLAY_LLM_CONFIG_KEYS)) {
    const provider =
      readFromConfigs(adminConfigs, 'llm_provider', 'ai_provider') ||
      'openai-compatible';

    pushTextProviderCandidate(candidates, {
      provider,
      source: 'generic',
      origin: 'admin',
      apiKey: readFromConfigs(
        adminConfigs,
        'llm_api_key',
        'ai_api_key',
        'openai_compatible_api_key'
      ),
      baseURL:
        normalizeProviderBaseURL(
          readFromConfigs(
            adminConfigs,
            'llm_base_url',
            'ai_base_url',
            'openai_compatible_base_url'
          )
        ) || undefined,
      model: readFromConfigs(adminConfigs, 'llm_model', 'ai_model'),
    });
  }

  if (hasAdminConfig(adminConfigs, OPENROUTER_TEXT_CONFIG_KEYS)) {
    pushTextProviderCandidate(candidates, {
      provider: 'openrouter',
      source: 'openrouter',
      origin: 'admin',
      apiKey: readFromConfigs(adminConfigs, 'openrouter_api_key'),
      baseURL:
        normalizeProviderBaseURL(
          readFromConfigs(adminConfigs, 'openrouter_base_url')
        ) || undefined,
      model: readFromConfigs(
        adminConfigs,
        'openrouter_model',
        'roleplay_model'
      ),
    });
  }

  if (
    includeEnvFallback &&
    readFromEnv(
      'LLM_API_KEY',
      'AI_API_KEY',
      'OPENAI_COMPATIBLE_API_KEY',
      'LLM_BASE_URL',
      'AI_BASE_URL',
      'OPENAI_COMPATIBLE_BASE_URL',
      'LLM_MODEL',
      'AI_MODEL'
    )
  ) {
    const provider =
      readFromEnv('LLM_PROVIDER', 'AI_PROVIDER') || 'openai-compatible';

    pushTextProviderCandidate(candidates, {
      provider,
      source: 'generic',
      origin: 'env',
      apiKey: readFromEnv(
        'LLM_API_KEY',
        'AI_API_KEY',
        'OPENAI_COMPATIBLE_API_KEY'
      ),
      baseURL:
        normalizeProviderBaseURL(
          readFromEnv(
            'LLM_BASE_URL',
            'AI_BASE_URL',
            'OPENAI_COMPATIBLE_BASE_URL'
          )
        ) || undefined,
      model: readFromEnv('LLM_MODEL', 'AI_MODEL'),
    });
  }

  if (
    includeEnvFallback &&
    readFromEnv(
      'VOLCENGINE_API_KEY',
      'VOLCENGINE_MODEL_BASE_URL',
      'VOLCENGINE_BASE_URL',
      'VOLCENGINE_TEXT_VISION_TEXT_MODEL'
    )
  ) {
    pushTextProviderCandidate(candidates, {
      provider: 'volcengine',
      source: 'volcengine',
      origin: 'env',
      apiKey: readFromEnv('VOLCENGINE_API_KEY'),
      baseURL:
        normalizeProviderBaseURL(
          readFromEnv('VOLCENGINE_MODEL_BASE_URL', 'VOLCENGINE_BASE_URL')
        ) || undefined,
      model: readFromEnv('VOLCENGINE_TEXT_VISION_TEXT_MODEL'),
    });
  }

  if (
    includeEnvFallback &&
    readFromEnv(
      'OPENROUTER_API_KEY',
      'OPENROUTER_BASE_URL',
      'OPENROUTER_MODEL',
      'ROLEPLAY_MODEL'
    )
  ) {
    pushTextProviderCandidate(candidates, {
      provider: 'openrouter',
      source: 'openrouter',
      origin: 'env',
      apiKey: readFromEnv('OPENROUTER_API_KEY'),
      baseURL:
        normalizeProviderBaseURL(readFromEnv('OPENROUTER_BASE_URL')) ||
        undefined,
      model: readFromEnv('OPENROUTER_MODEL', 'ROLEPLAY_MODEL'),
    });
  }

  return candidates;
}

async function getAdminFirstConfigs(keys: string[]) {
  const adminConfigs = await getConfigs().catch(() => ({}) as Configs);

  if (hasAdminConfig(adminConfigs, keys)) {
    return {
      ...adminConfigs,
      [DISABLE_ENV_FALLBACK_FLAG]: 'true',
    };
  }

  return getAllConfigs();
}

export async function getRoleplayAIConfigs() {
  const adminConfigs = await getConfigs().catch(() => ({}) as Configs);
  const hasAdminTextConfig = hasAdminConfig(adminConfigs, [
    ...OPENROUTER_TEXT_CONFIG_KEYS,
    ...ROLEPLAY_LLM_CONFIG_KEYS,
  ]);
  const candidates = buildTextProviderCandidates(adminConfigs, {
    includeEnvFallback: !hasAdminTextConfig,
  });

  return {
    ...adminConfigs,
    ...(hasAdminTextConfig ? { [DISABLE_ENV_FALLBACK_FLAG]: 'true' } : {}),
    [TEXT_PROVIDER_CANDIDATES_KEY]: JSON.stringify(candidates),
  } as Record<string, any>;
}

export async function getRoleplayImageConfigs() {
  return (await getAdminFirstConfigs(ROLEPLAY_IMAGE_CONFIG_KEYS).catch(
    () => ({})
  )) as Record<string, any>;
}
