import type { Configs } from '@/shared/models/config';

type ConfigLike = Partial<Configs> | Record<string, string | undefined>;

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

function envNames(key: string) {
  const upper = key.toUpperCase();
  return [upper, `NEXT_PUBLIC_${upper}`];
}

function readRawConfig(configs: ConfigLike | undefined, key: string) {
  const configValue = String(configs?.[key] || '').trim();
  if (configValue) return configValue;

  for (const envName of envNames(key)) {
    const envValue = String(process.env[envName] || '').trim();
    if (envValue) return envValue;
  }

  return '';
}

export function readComplianceBoolean(
  configs: ConfigLike | undefined,
  key: string,
  fallback: boolean
) {
  const raw = readRawConfig(configs, key).toLowerCase();
  if (!raw) return fallback;
  if (TRUE_VALUES.has(raw)) return true;
  if (FALSE_VALUES.has(raw)) return false;
  return fallback;
}

export function isComplianceMode(configs?: ConfigLike) {
  return readComplianceBoolean(configs, 'public_compliance_mode', true);
}

export function canShowHighRiskSeoPages(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return true;
  return readComplianceBoolean(
    configs,
    'show_high_risk_seo_pages',
    false
  );
}

export function shouldBlockHighRiskSeoPages(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return false;
  return readComplianceBoolean(
    configs,
    'block_high_risk_seo_pages',
    !canShowHighRiskSeoPages(configs)
  );
}

export function canShowRomanceTemplates(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return true;
  return readComplianceBoolean(
    configs,
    'show_romance_templates',
    false
  );
}

export function canShowCompanionCopy(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return true;
  return readComplianceBoolean(
    configs,
    'show_companion_copy',
    false
  );
}

export function canShowSensitiveVoiceStyles(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return true;
  return readComplianceBoolean(
    configs,
    'show_sensitive_voice_styles',
    false
  );
}

export function canShowPublicGallery(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return true;
  return readComplianceBoolean(
    configs,
    'show_public_gallery',
    false
  );
}

export function canUseCustomImagePrompts(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return true;
  return readComplianceBoolean(
    configs,
    'show_custom_image_prompts',
    false
  );
}

export function getVisiblePublicGallery<T>(gallery: T[], configs?: ConfigLike) {
  if (canShowPublicGallery(configs)) return gallery;
  return gallery.slice(0, 1);
}

export function shouldRequireCreemModeration(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return false;
  return readComplianceBoolean(
    configs,
    'require_creem_moderation',
    true
  );
}

export function shouldFailClosedOnModerationUnavailable(configs?: ConfigLike) {
  if (!isComplianceMode(configs)) return false;
  return readComplianceBoolean(
    configs,
    'creem_moderation_fail_closed',
    true
  );
}

export const HIGH_RISK_SEO_PATHS = new Set([
  '/crush-ai-chat',
  '/comfort-ai-companion',
  '/ai-companion-that-remembers-you',
  '/ai-roleplay-secret-memory',
  '/ai-roleplay-shared-memory',
  '/character-ai-alternative-with-memory',
  '/anime-character-ai-chat',
  '/talkie-ai-alternative',
  '/anime-ai-roleplay-characters',
]);

export function isHighRiskSeoPath(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return HIGH_RISK_SEO_PATHS.has(normalized);
}

export function isComplianceSafeVoiceProfile(profile: unknown) {
  const text = JSON.stringify(profile || {}).toLowerCase();
  return ![
    'romance',
    'romantic',
    'girlfriend',
    'boyfriend',
    'flirty',
    'intimacy',
    'late-night',
    'late night',
  ].some((term) => text.includes(term));
}
