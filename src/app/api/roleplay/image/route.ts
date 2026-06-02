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

type ImageAccessDecision = {
  allowed: boolean;
  reason?: 'insufficient_credits' | 'level_locked';
};

function buildPrompt({
  characterName,
  characterIntro,
  characterStyle,
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
    .slice(0, 2200);
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
  try {
    const {
      characterId,
      conversationId,
      characterName,
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

    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');
    const idempotencyKey = getRoleplayRequestIdempotencyKey(request, requestId);

    const billingPreview = await assertRoleplayCreditsAvailable({
      userId: user.id,
      action: 'roleplay_image',
      idempotencyKey,
    });

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

    if (characterId && !characterId.startsWith('custom-')) {
      try {
        const storedCharacter = await findRoleplayCharacterById(characterId);
        if (storedCharacter) {
          const resolvedAvatar = buildCharacterImageUrl(
            storedCharacter.avatarUrl
          );
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

    const imagePrompt = buildPrompt({
      characterName,
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

    const configs = await getAllConfigs();
    const imageConfig = resolveImageProviderConfig(configs, {
      defaultModel: DEFAULT_IMAGE_MODEL,
      defaultSize: DEFAULT_IMAGE_SIZE,
    });

    if (!imageConfig.apiKey || !imageConfig.baseURL) {
      return respErr(
        'Image generation API key and base URL are required. Set IMAGE_GENERATION_API_KEY / IMAGE_GENERATION_BASE_URL or VOLCENGINE_API_KEY / VOLCENGINE_BASE_URL.'
      );
    }

    const usableReferenceImages = await resolveReferenceImagesForProvider(
      activeReferenceImages
    );
    if (mode === 'chat_snapshot' && !usableReferenceImages.length) {
      return respErr(
        'chat image generation requires a usable character reference image'
      );
    }

    let generated;
    try {
      generated = await generateOpenAICompatibleImage({
        config: imageConfig,
        prompt: [
          imagePrompt,
          usableReferenceImages.length
            ? 'Identity lock: use the provided reference image(s) as the non-negotiable identity source. Keep the same adult person, face shape, facial proportions, eye shape, nose, lips, cheekbones, skin tone, hair color, hairstyle, signature accessories, and overall likeness. Change only the requested scene, pose, framing, lighting, clothing when asked, and current activity. Do not invent a different person.'
            : 'No reliable reference image is available. Keep the same adult character identity by strictly following the provided visual identity, signature items, face, hair, palette, and style anchor.',
        ]
          .filter(Boolean)
          .join('\n'),
        imageInput: usableReferenceImages.length
          ? usableReferenceImages
          : undefined,
        timeoutMs: 90_000,
      });
    } catch (error: any) {
      if (usableReferenceImages.length) {
        return respErr(
          error?.message ||
            'reference-image generation failed; primary image was not preserved'
        );
      }
      generated = await generateOpenAICompatibleImage({
        config: imageConfig,
        prompt: imagePrompt,
        timeoutMs: 60_000,
      });
    }
    const sourceUrl = generated?.data?.[0]?.url;

    if (!sourceUrl) {
      return respErr('image generation returned no URL');
    }

    const key = `roleplay/image/${md5(
      `${imageConfig.provider}:${imageConfig.model}:${activeReferenceImages.join(
        '|'
      )}:${imagePrompt}`
    )}.png`;
    const storageService = await getStorageService();
    const upload = await storageService.downloadAndUpload({
      url: sourceUrl,
      key,
      contentType: 'image/png',
      disposition: 'inline',
    });

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
