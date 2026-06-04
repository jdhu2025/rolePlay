import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROLEPLAY_ANIME_CHARACTERS } from '@/data/roleplay-anime-characters';
import { ROLEPLAY_OFFICIAL_CHARACTERS } from '@/data/roleplay-characters';

import {
  generateOpenAICompatibleImage,
  resolveImageProviderConfig,
} from '@/shared/lib/ai-provider';
import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { buildCharacterImageUrl } from '@/shared/lib/roleplay-assets';
import {
  assertRoleplayCreditsAvailable,
  consumeRoleplayCredits,
  getRoleplayRequestIdempotencyKey,
  isRoleplayInsufficientCreditsError,
} from '@/shared/lib/roleplay-billing';
import { getAllConfigs } from '@/shared/models/config';
import {
  createRoleplayAsset,
  createRoleplayMessage,
  findRoleplayCharacterById,
  findRoleplayConversationById,
  isMissingRoleplayTable,
  RoleplayStatus,
  serializeJson,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

const DEFAULT_IMAGE_MODEL = 'doubao-seedream-5-0-260128';
const DEFAULT_IMAGE_SIZE = '2k';
const DEFAULT_CHAT_SNAPSHOT_IMAGE_SIZE = '1k';
const CHAT_SNAPSHOT_REFERENCE_IMAGE_LIMIT = 1;
// xAI currently rejects image prompts above 8000. Keep some headroom for
// provider-side serialization differences and count UTF-8 bytes so Chinese
// admin templates are capped correctly.
const MAX_IMAGE_PROMPT_BYTES = 7400;

const REFERENCE_IDENTITY_LOCK =
  'Identity lock: use the provided reference image(s) as the non-negotiable identity source. Keep the same adult person, face shape, facial proportions, eye shape, nose, lips, cheekbones, skin tone, hair color, hairstyle, signature accessories, and overall likeness. Change only the requested scene, pose, framing, lighting, clothing when asked, and current activity. Do not invent a different person.';

const NO_REFERENCE_IDENTITY_LOCK =
  'No reliable reference image is available. Keep the same adult character identity by strictly following the provided visual identity, signature items, face, hair, palette, and style anchor.';

type ChatSnapshotMessage = {
  role: 'user' | 'character';
  text: string;
};

type VisualIdentity = {
  ageRange?: string;
  genderPresentation?: string;
  hair?: string;
  eyes?: string;
  face?: string;
  body?: string;
  style?: string;
  signatureItems?: string[];
  colorPalette?: string[];
  defaultSetting?: string;
};

type CharacterGender = 'male' | 'female' | 'non-binary';

type ImageAccessDecision = {
  allowed: boolean;
  reason?: 'insufficient_credits' | 'level_locked';
};

type ImageRequestMode = 'portrait' | 'chat_snapshot';

function createTimingMarks() {
  const startedAt = Date.now();
  let lastMark = startedAt;
  const timings: Record<string, number> = {};

  return {
    mark(name: string) {
      const now = Date.now();
      timings[name] = now - lastMark;
      lastMark = now;
    },
    log(context: {
      mode?: ImageRequestMode;
      provider?: string;
      model?: string;
      size?: string;
      referenceCount?: number;
      promptBytes?: number;
    }) {
      if (
        process.env.NODE_ENV === 'production' &&
        process.env.ROLEPLAY_IMAGE_TIMING !== 'true'
      ) {
        return;
      }

      console.log('[roleplay:image] timing', {
        totalMs: Date.now() - startedAt,
        ...context,
        ...timings,
      });
    },
  };
}

function buildPrompt({
  characterName,
  characterIntro,
  characterStyle,
  characterGender,
  photoTemplate,
  prompt,
  imageStyleSuffix,
  mode,
  scene,
  recentMessages,
  requestText,
}: {
  characterName?: string;
  characterIntro?: string;
  characterStyle?: string;
  characterGender?: CharacterGender;
  photoTemplate?: string;
  prompt?: string;
  imageStyleSuffix?: string;
  mode?: 'portrait' | 'chat_snapshot';
  scene?: string;
  recentMessages?: ChatSnapshotMessage[];
  requestText?: string;
}) {
  const recentContext = recentMessages
    ?.slice(-6)
    .map((message) => `${message.role}: ${message.text}`)
    .join('\n');

  return [
    photoTemplate
      ? `Admin ${characterGender || 'character'} photo template:\n${photoTemplate}`
      : '',
    mode === 'chat_snapshot'
      ? requestText
        ? `Create an in-world chat photo that shows exactly what the user asked to see: ${requestText}`
        : 'Create an in-world chat photo that matches the current conversation moment.'
      : prompt || '',
    characterName
      ? mode === 'chat_snapshot'
        ? `Depict ${characterName} as the same adult character in a casual real-time photo they would send in chat.`
        : `Create a tasteful cinematic character portrait of ${characterName}.`
      : '',
    scene ? `Current scene: ${scene}` : '',
    recentContext ? `Recent conversation context:\n${recentContext}` : '',
    characterIntro ? `Character context: ${characterIntro}` : '',
    characterStyle ? `Visual mood: ${characterStyle}` : '',
    mode === 'chat_snapshot'
      ? 'This should feel like a candid chat snapshot, selfie, mirror shot, or quick phone photo depending on the request and context, not a studio portrait unless the context clearly calls for it.'
      : 'Editorial portrait, expressive face, natural posture, polished lighting, fully clothed, non-explicit.',
    prompt || '',
    imageStyleSuffix ? `Style: ${imageStyleSuffix}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 5000);
}

function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

function truncateUtf8(value: string, maxBytes: number) {
  if (utf8ByteLength(value) <= maxBytes) return value;

  let usedBytes = 0;
  let output = '';
  for (const char of value) {
    const charBytes = utf8ByteLength(char);
    if (usedBytes + charBytes > maxBytes) break;
    output += char;
    usedBytes += charBytes;
  }

  return output.trimEnd();
}

function buildFinalProviderPrompt(basePrompt: string, identityLock: string) {
  const lock = identityLock.trim();
  const separator = lock ? '\n' : '';
  const lockBytes = utf8ByteLength(`${separator}${lock}`);
  const availableBaseBytes = Math.max(800, MAX_IMAGE_PROMPT_BYTES - lockBytes);
  const cappedBase = truncateUtf8(basePrompt.trim(), availableBaseBytes);

  return truncateUtf8(
    [cappedBase, lock].filter(Boolean).join('\n'),
    MAX_IMAGE_PROMPT_BYTES
  );
}

function getImageErrorText(error: unknown) {
  const raw = String((error as any)?.message || error || '');
  try {
    const parsed = JSON.parse(raw);
    return [raw, parsed?.error, parsed?.message, parsed?.code]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function isImageModerationError(error: unknown) {
  return /\b(content moderation|moderation|safety|rejected)\b/.test(
    getImageErrorText(error)
  );
}

function getImageErrorMessage(error: unknown) {
  if (isImageModerationError(error)) {
    return 'Image provider content moderation rejected this generation. Try a fully clothed, non-bedroom, less body-focused scene or prompt.';
  }

  return String((error as any)?.message || 'roleplay image failed');
}

function normalizeCharacterGender(value: unknown): CharacterGender | undefined {
  const text = String(value || '')
    .trim()
    .toLowerCase();
  if (!text) return undefined;
  if (/\b(female|woman|girl)\b|女性|女人|女生|女孩/.test(text)) return 'female';
  if (/\b(male|man|boy)\b|男性|男人|男生|男孩/.test(text)) return 'male';
  if (/\b(non[- ]?binary|androgynous|genderfluid)\b|非二元|中性/.test(text)) {
    return 'non-binary';
  }
  return undefined;
}

function readConfigString(configs: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    const value = String(configs[lowerKey] || configs[key] || '').trim();
    if (value) return value;
  }
  return '';
}

function resolvePhotoPromptTemplate(
  configs: Record<string, any>,
  gender?: CharacterGender
) {
  if (gender === 'female') {
    return readConfigString(
      configs,
      'roleplay_female_photo_prompt_template',
      'ROLEPLAY_FEMALE_PHOTO_PROMPT_TEMPLATE'
    );
  }

  if (gender === 'male') {
    return readConfigString(
      configs,
      'roleplay_male_photo_prompt_template',
      'ROLEPLAY_MALE_PHOTO_PROMPT_TEMPLATE'
    );
  }

  return '';
}

function isOpenRouterOrXaiImageConfig({
  provider,
  baseURL,
}: {
  provider: string;
  baseURL: string;
}) {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedBaseURL = baseURL.trim().toLowerCase();

  return (
    normalizedProvider === 'openrouter' ||
    normalizedProvider === 'open-router' ||
    normalizedProvider === 'xai' ||
    normalizedProvider === 'x-ai' ||
    normalizedBaseURL.includes('openrouter.ai') ||
    normalizedBaseURL.includes('api.x.ai') ||
    normalizedBaseURL.includes('x.ai')
  );
}

function resolveChatSnapshotImageSize(configs: Record<string, any>) {
  return (
    readConfigString(
      configs,
      'roleplay_chat_image_size',
      'ROLEPLAY_CHAT_IMAGE_SIZE',
      'roleplay_chat_snapshot_image_size',
      'ROLEPLAY_CHAT_SNAPSHOT_IMAGE_SIZE'
    ) || DEFAULT_CHAT_SNAPSHOT_IMAGE_SIZE
  );
}

async function checkRoleplayImageGenerationAccess(): Promise<ImageAccessDecision> {
  return { allowed: true };
}

function absolutizeReferenceImage(url: string): string {
  return url;
}

function isPotentialReferenceImage(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('/')) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.trim().toLowerCase();
    if (!host) return false;
    return true;
  } catch {
    return false;
  }
}

function pickReferenceImages(
  candidates: Array<string | null | undefined>,
  limit = 4
): string[] {
  const seen = new Set<string>();
  const references: string[] = [];

  for (const candidate of candidates) {
    const value = typeof candidate === 'string' ? candidate.trim() : '';
    if (!value) continue;
    if (!isPotentialReferenceImage(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    references.push(value);
    if (references.length >= limit) break;
  }

  return references;
}

function contentTypeFromPath(pathname: string) {
  const lower = pathname.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/png';
}

async function siteRelativeImageToDataUrl(pathname: string) {
  const cleanPath = pathname.split('?')[0]?.replace(/^\/+/, '') || '';
  if (!cleanPath || cleanPath.includes('..')) return '';

  try {
    const buffer = await readFile(join(process.cwd(), 'public', cleanPath));
    return `data:${contentTypeFromPath(cleanPath)};base64,${buffer.toString(
      'base64'
    )}`;
  } catch {
    return '';
  }
}

async function resolveReferenceImageForProvider(url: string) {
  const value = url.trim();
  if (!value) return '';
  if (value.startsWith('data:image/')) return value;
  if (value.startsWith('/')) return siteRelativeImageToDataUrl(value);

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.trim().toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return siteRelativeImageToDataUrl(parsed.pathname);
    }
    return value;
  } catch {
    return '';
  }
}

async function resolveReferenceImagesForProvider(images: string[]) {
  const resolved = await Promise.all(
    images.map(resolveReferenceImageForProvider)
  );
  return resolved.filter(Boolean);
}

function getBuiltInCharacterReferenceImages(characterId: string) {
  const official = ROLEPLAY_OFFICIAL_CHARACTERS.find(
    (character) => character.id === characterId
  );
  if (official) {
    return [
      ...official.images.map(buildCharacterImageUrl),
      buildCharacterImageUrl(official.avatar),
    ];
  }

  const anime = ROLEPLAY_ANIME_CHARACTERS.find(
    (character) => character.id === characterId
  );
  if (anime) {
    return [
      ...anime.images.map(buildCharacterImageUrl),
      buildCharacterImageUrl(anime.avatar),
    ];
  }

  return [];
}

export async function POST(request: Request) {
  const timing = createTimingMarks();

  try {
    const {
      characterId,
      conversationId,
      characterName,
      characterGender,
      characterAvatar,
      characterReferenceImages,
      characterIntro,
      characterStyle,
      visualIdentity,
      imageStyleSuffix,
      prompt,
      requestText,
      scene,
      recentMessages,
      mode,
      requestId,
    }: {
      characterId?: string;
      conversationId?: string;
      characterName?: string;
      characterGender?: CharacterGender;
      characterAvatar?: string;
      characterReferenceImages?: string[];
      characterIntro?: string;
      characterStyle?: string;
      visualIdentity?: VisualIdentity;
      imageStyleSuffix?: string;
      prompt?: string;
      requestText?: string;
      scene?: string;
      recentMessages?: ChatSnapshotMessage[];
      mode?: 'portrait' | 'chat_snapshot';
      requestId?: string;
    } = await request.json();
    timing.mark('parse_request');

    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');
    const idempotencyKey = getRoleplayRequestIdempotencyKey(request, requestId);

    const billingPreview = await assertRoleplayCreditsAvailable({
      userId: user.id,
      action: 'roleplay_image',
      idempotencyKey,
    });
    timing.mark('auth_and_billing_preview');

    const access = await checkRoleplayImageGenerationAccess();
    if (!access.allowed) {
      return respErr(access.reason || 'image generation not allowed');
    }

    let activeReferenceImages = pickReferenceImages([
      ...(Array.isArray(characterReferenceImages)
        ? characterReferenceImages
        : []),
      absolutizeReferenceImage(characterAvatar || ''),
    ]);
    let activeVisualIdentity = visualIdentity;
    let activeImageStyleSuffix =
      typeof imageStyleSuffix === 'string'
        ? imageStyleSuffix.trim().slice(0, 600)
        : '';
    let activeGender =
      normalizeCharacterGender(characterGender) ||
      normalizeCharacterGender(activeVisualIdentity?.genderPresentation);

    if (characterId && !characterId.startsWith('custom-')) {
      try {
        const storedCharacter = await findRoleplayCharacterById(characterId);
        if (storedCharacter) {
          const resolvedAvatar = buildCharacterImageUrl(
            storedCharacter.avatarUrl
          );
          activeGender =
            normalizeCharacterGender((storedCharacter as any).gender) ||
            activeGender;
          const resolvedGallery = (() => {
            try {
              const parsed = JSON.parse(
                (storedCharacter as any).gallery || '[]'
              );
              return Array.isArray(parsed)
                ? parsed.map((item) =>
                    buildCharacterImageUrl(String(item || ''))
                  )
                : [];
            } catch {
              return [] as string[];
            }
          })();
          activeReferenceImages = pickReferenceImages([
            ...resolvedGallery,
            buildCharacterImageUrl(storedCharacter.coverUrl),
            resolvedAvatar,
            ...activeReferenceImages,
          ]);
          if (
            storedCharacter.visualIdentity &&
            typeof storedCharacter.visualIdentity === 'string'
          ) {
            try {
              activeVisualIdentity = JSON.parse(
                storedCharacter.visualIdentity
              ) as VisualIdentity;
            } catch {
              // ignore malformed stored visual identity
            }
          }
          if (
            typeof (storedCharacter as any).imageStyleSuffix === 'string' &&
            (storedCharacter as any).imageStyleSuffix.trim()
          ) {
            activeImageStyleSuffix = (storedCharacter as any).imageStyleSuffix
              .trim()
              .slice(0, 600);
          }
        }
      } catch (error) {
        if (!isMissingRoleplayTable(error)) throw error;
      }
    }

    if (!activeReferenceImages.length && characterId) {
      activeReferenceImages = pickReferenceImages(
        getBuiltInCharacterReferenceImages(characterId)
      );
    }

    if (mode === 'chat_snapshot') {
      activeReferenceImages = activeReferenceImages.slice(
        0,
        CHAT_SNAPSHOT_REFERENCE_IMAGE_LIMIT
      );
    }
    timing.mark('load_character_references');

    if (conversationId && user) {
      try {
        const conversation = await findRoleplayConversationById(conversationId);
        if (!conversation || conversation.userId !== user.id) {
          return respErr('conversation not found');
        }
      } catch (error) {
        if (!isMissingRoleplayTable(error)) throw error;
      }
    }

    activeGender =
      activeGender ||
      normalizeCharacterGender(activeVisualIdentity?.genderPresentation);

    const configs = await getAllConfigs();
    const photoTemplate = resolvePhotoPromptTemplate(configs, activeGender);
    timing.mark('conversation_and_configs');

    const imagePrompt = buildPrompt({
      characterName,
      characterGender: activeGender,
      characterIntro: [
        characterIntro,
        activeVisualIdentity?.ageRange,
        activeVisualIdentity?.genderPresentation,
        activeVisualIdentity?.hair ? `Hair: ${activeVisualIdentity.hair}` : '',
        activeVisualIdentity?.eyes ? `Eyes: ${activeVisualIdentity.eyes}` : '',
        activeVisualIdentity?.face ? `Face: ${activeVisualIdentity.face}` : '',
        activeVisualIdentity?.body
          ? `Build and posture: ${activeVisualIdentity.body}`
          : '',
        activeVisualIdentity?.signatureItems?.length
          ? `Signature items: ${activeVisualIdentity.signatureItems.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      characterStyle: [
        characterStyle,
        activeVisualIdentity?.style,
        activeVisualIdentity?.colorPalette?.length
          ? `Color palette: ${activeVisualIdentity.colorPalette.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
      photoTemplate,
      prompt: [activeVisualIdentity?.defaultSetting, prompt]
        .filter(Boolean)
        .join('\n'),
      imageStyleSuffix: activeImageStyleSuffix,
      mode,
      scene,
      recentMessages,
      requestText,
    });

    if (!imagePrompt) {
      return respErr('image prompt is required');
    }

    const baseImageConfig = resolveImageProviderConfig(configs, {
      defaultModel: DEFAULT_IMAGE_MODEL,
      defaultSize:
        mode === 'chat_snapshot'
          ? DEFAULT_CHAT_SNAPSHOT_IMAGE_SIZE
          : DEFAULT_IMAGE_SIZE,
    });
    const imageConfig =
      mode === 'chat_snapshot' && !isOpenRouterOrXaiImageConfig(baseImageConfig)
        ? {
            ...baseImageConfig,
            size: resolveChatSnapshotImageSize(configs),
          }
        : baseImageConfig;

    if (!imageConfig.apiKey || !imageConfig.baseURL) {
      return respErr(
        'Image generation API key and base URL are required. Set IMAGE_GENERATION_API_KEY / IMAGE_GENERATION_BASE_URL or VOLCENGINE_API_KEY / VOLCENGINE_BASE_URL.'
      );
    }

    const usableReferenceImages = await resolveReferenceImagesForProvider(
      activeReferenceImages
    );
    timing.mark('resolve_reference_images');

    if (mode === 'chat_snapshot' && !usableReferenceImages.length) {
      return respErr(
        'chat image generation requires a usable character reference image'
      );
    }

    const identityLock = usableReferenceImages.length
      ? REFERENCE_IDENTITY_LOCK
      : NO_REFERENCE_IDENTITY_LOCK;
    const providerPrompt = buildFinalProviderPrompt(imagePrompt, identityLock);

    let generated;
    try {
      generated = await generateOpenAICompatibleImage({
        config: imageConfig,
        prompt: providerPrompt,
        imageInput: usableReferenceImages.length
          ? usableReferenceImages
          : undefined,
        timeoutMs: 90_000,
      });
    } catch (error: any) {
      return respErr(getImageErrorMessage(error), {
        reason: isImageModerationError(error)
          ? 'content_moderation'
          : 'image_generation_failed',
      });
    }
    timing.mark('provider_generate');

    const sourceUrl = generated?.data?.[0]?.url;

    if (!sourceUrl) {
      return respErr('image generation returned no URL');
    }

    const key = `roleplay/image/${md5(
      `${imageConfig.provider}:${imageConfig.model}:${activeReferenceImages.join(
        '|'
      )}:${imagePrompt}`
    )}.png`;
    const storageService = await getStorageService(configs);
    const upload = await storageService.downloadAndUpload({
      url: sourceUrl,
      key,
      contentType: 'image/png',
      disposition: 'inline',
    });
    timing.mark('download_and_upload');

    if (!upload.success || !upload.url) {
      return respErr(upload.error || 'upload generated image failed');
    }

    const consumedCredit = await consumeRoleplayCredits({
      userId: user.id,
      action: 'roleplay_image',
      description: 'roleplay generated image',
      metadata: {
        characterId: characterId || '',
        conversationId: conversationId || '',
        mode: mode || 'portrait',
        provider: imageConfig.provider,
        model: imageConfig.model,
      },
      idempotencyKey,
    });

    let assetId = '';
    let messageId = '';
    let messageText = '';
    if (user && conversationId) {
      try {
        messageText = requestText
          ? `*${characterName || '她'}发来了一张照片，回应你刚才想看的内容。*`
          : `*${characterName || '她'}发来了一张照片。*`;
        const characterMessage = await createRoleplayMessage({
          userId: user.id,
          conversationId,
          status: RoleplayStatus.CREATED,
          role: 'character',
          text: messageText,
          provider: imageConfig.provider,
          model: imageConfig.model,
          metadata: serializeJson({
            source: 'chat-image-generation',
            mediaType: 'image',
            assetUrl: upload.url,
            requestText: requestText || '',
            shotIntent: mode === 'chat_snapshot' ? 'chat_snapshot' : 'portrait',
          }),
        });
        messageId = characterMessage.id;

        const asset = await createRoleplayAsset({
          userId: user.id,
          characterId: characterId || null,
          conversationId,
          messageId: characterMessage.id,
          status: RoleplayStatus.CREATED,
          type: 'image',
          url: upload.url,
          storageKey: upload.key || key,
          contentType: 'image/png',
          metadata: serializeJson({
            sourceUrl,
            provider: imageConfig.provider,
            model: imageConfig.model,
            size: imageConfig.size,
            prompt: imagePrompt,
            requestText: requestText || '',
            mode: mode || 'portrait',
            referenceImages: activeReferenceImages,
          }),
        });
        assetId = asset.id;
      } catch (error) {
        if (!isMissingRoleplayTable(error)) throw error;
      }
    }
    timing.mark('persist_billing_and_message');
    timing.log({
      mode,
      provider: imageConfig.provider,
      model: imageConfig.model,
      size: imageConfig.size,
      referenceCount: usableReferenceImages.length,
      promptBytes: utf8ByteLength(providerPrompt),
    });

    return respData({
      url: upload.url,
      sourceUrl,
      key: upload.key,
      provider: imageConfig.provider,
      model: imageConfig.model,
      size: imageConfig.size,
      assetId,
      messageId,
      text: messageText,
      mediaType: 'image',
      billing: {
        action: 'roleplay_image',
        costCredits: billingPreview.costCredits,
        freePlay: billingPreview.freePlay,
        consumedCreditId: consumedCredit?.id || '',
      },
      metadata: {
        assetId,
        assetUrl: upload.url,
        mediaType: 'image',
        source: 'chat-image-generation',
      },
    });
  } catch (error: any) {
    console.log('roleplay image failed:', error);
    if (isRoleplayInsufficientCreditsError(error)) {
      return respErr(error.message, error.data);
    }
    return respErr(error.message || 'roleplay image failed');
  }
}
