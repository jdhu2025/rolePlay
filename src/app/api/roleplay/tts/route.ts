import {
  generateTTSSpeech,
  getMissingTTSProviderMessage,
  resolveRoleplayTTSVoiceProfileById,
  resolveTTSProviderConfig,
  resolveVoiceTypeForText,
} from '@/shared/lib/ai-provider';
import { md5 } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import {
  assertRoleplayCreditsAvailable,
  consumeRoleplayCredits,
  getRoleplayBillingEntitlement,
  getRoleplayRequestIdempotencyKey,
  isRoleplayInsufficientCreditsError,
} from '@/shared/lib/roleplay-billing';
import { parseMessage } from '@/shared/lib/roleplay-message-format';
import {
  normalizeVoicePreset,
  resolveVoicePresetVoiceType,
} from '@/shared/lib/roleplay-personality';
import { getAllConfigs } from '@/shared/models/config';
import { getUserInfo } from '@/shared/models/user';
import { getStorageService } from '@/shared/services/storage';

const MAX_TTS_TEXT_LENGTH = 500;
const MAX_TTS_SPEECH_TEXT_LENGTH = 360;
const MAX_TTS_INSTRUCTIONS_LENGTH = 900;
const TTS_EMOTION_STRATEGY_VERSION = 'emotion-v2';

type RoleplayTTSContext = {
  characterName?: string;
  scene?: string;
  relationship?: string;
  style?: string;
  personality?: string[] | string;
  voiceDirection?: string;
  recentMessages?: Array<{
    role?: string;
    text?: string;
  }>;
};

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_TTS_TEXT_LENGTH);
}

function normalizeSpeechText(text: string) {
  const segments = parseMessage(text);
  const speech = segments
    .filter((segment) => segment.type !== 'action')
    .map((segment) => segment.text)
    .join(' ');
  const candidate = speech.trim() || text;

  return candidate
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[`*_#>~|]+/g, '')
    .replace(/\[[^\]\n]{1,40}\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TTS_SPEECH_TEXT_LENGTH);
}

function compactInstructionText(value: unknown, maxLength = 160) {
  return String(value || '')
    .replace(/[`*_#>~|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function formatRecentMessageContext(
  messages: RoleplayTTSContext['recentMessages']
) {
  if (!Array.isArray(messages) || !messages.length) return '';

  return messages
    .slice(-4)
    .map((message) => {
      const role = message?.role === 'user' ? 'User' : 'Character';
      const text = compactInstructionText(message?.text, 110);
      return text ? `${role}: ${text}` : '';
    })
    .filter(Boolean)
    .join(' | ')
    .slice(0, 360);
}

function extractPerformanceCue(text: string) {
  const actionCue = parseMessage(text)
    .filter((segment) => segment.type === 'action')
    .map((segment) => segment.text)
    .join(' ');
  const cueText = compactInstructionText(actionCue, 180).toLowerCase();
  const cues: string[] = [];

  if (/笑|微笑|开心|高兴|cheer|smil|laugh|happy/.test(cueText)) {
    cues.push('warm, lightly smiling');
  }
  if (/脸红|害羞|羞|紧张|blush|shy|nervous/.test(cueText)) {
    cues.push('soft and a little shy');
  }
  if (/低声|轻声|耳边|悄悄|whisper|softly|quiet/.test(cueText)) {
    cues.push('quiet, intimate, close-mic');
  }
  if (/生气|冷|皱眉|angry|annoyed|cold/.test(cueText)) {
    cues.push('restrained, tense');
  }
  if (/哭|哽咽|难过|sad|cry|tears/.test(cueText)) {
    cues.push('vulnerable, slightly tremulous');
  }
  if (/兴奋|急切|快|excited|eager|urgent/.test(cueText)) {
    cues.push('brighter and more energetic');
  }

  return cues.length ? Array.from(new Set(cues)).join('; ') : '';
}

function inferDialogueCue(text: string) {
  const cueText = compactInstructionText(text, 240).toLowerCase();
  const cues: string[] = [];

  if (
    /!|！|哈|笑|开心|想你|喜欢|爱你|miss you|love you|happy|laugh/.test(cueText)
  ) {
    cues.push('warm, smiling, affectionate');
  }
  if (/…|\.{2,}|嗯|唔|啊|靠近|抱|亲|kiss|hug|close|baby|dear/.test(cueText)) {
    cues.push('soft, intimate, with natural pauses');
  }
  if (/别|不要|等等|紧张|害羞|脸红|shy|nervous|wait|please/.test(cueText)) {
    cues.push('slightly shy and emotionally responsive');
  }
  if (/生气|讨厌|烦|冷|走开|angry|mad|annoyed|cold/.test(cueText)) {
    cues.push('restrained and tense, not cheerful');
  }
  if (/难过|哭|疼|累|怕|sad|cry|hurt|tired|afraid/.test(cueText)) {
    cues.push('vulnerable, lower energy, a little breathy');
  }
  if (/[?？]/.test(cueText)) {
    cues.push('curious, responsive intonation');
  }

  return cues.length ? Array.from(new Set(cues)).join('; ') : '';
}

function inferContextCue(context: RoleplayTTSContext) {
  const recentText = formatRecentMessageContext(
    context.recentMessages
  ).toLowerCase();
  const cues: string[] = [];

  if (/想你|喜欢你|爱你|miss you|love you|need you/.test(recentText)) {
    cues.push('answer with affectionate warmth and a private smile');
  }
  if (
    /难过|孤单|害怕|累|疼|哭|sad|lonely|afraid|tired|hurt|cry/.test(recentText)
  ) {
    cues.push('comfort first, lower the energy, sound tender and present');
  }
  if (/为什么|真的|确定|吗|呢|\?|？|why|really|sure/.test(recentText)) {
    cues.push(
      'respond with attentive, alive intonation rather than flat certainty'
    );
  }
  if (/哈哈|笑死|好玩|逗|tease|funny|haha|lol/.test(recentText)) {
    cues.push('keep a playful lift and conversational timing');
  }

  return cues.length ? Array.from(new Set(cues)).join('; ') : '';
}

function buildTTSInstructions({
  gender,
  profileLabel,
  profileTraits,
  profileInstructions,
  context,
  text,
}: {
  gender?: 'male' | 'female' | 'non-binary';
  profileLabel?: string;
  profileTraits?: string[];
  profileInstructions?: string;
  context: RoleplayTTSContext;
  text: string;
}) {
  const personality = Array.isArray(context.personality)
    ? context.personality.join(', ')
    : context.personality;
  const lines = [
    'Perform this roleplay reply as natural character dialogue. Do not read stage directions, markdown, or narration aloud.',
    gender
      ? `Character gender: ${gender}. Keep the perceived voice consistent with this gender unless the chosen voice profile says otherwise.`
      : '',
    profileLabel
      ? `Voice profile: ${compactInstructionText(profileLabel, 80)}.`
      : '',
    profileTraits?.length
      ? `Voice traits: ${profileTraits
          .map((trait) => compactInstructionText(trait, 40))
          .filter(Boolean)
          .join(', ')}.`
      : '',
    profileInstructions
      ? `Profile direction: ${compactInstructionText(profileInstructions, 220)}.`
      : '',
    context.characterName
      ? `Character: ${compactInstructionText(context.characterName, 80)}.`
      : '',
    context.scene ? `Scene: ${compactInstructionText(context.scene)}.` : '',
    context.relationship
      ? `Relationship: ${compactInstructionText(context.relationship)}.`
      : '',
    context.style
      ? `Speaking style: ${compactInstructionText(context.style)}.`
      : '',
    personality ? `Personality: ${compactInstructionText(personality)}.` : '',
    context.voiceDirection
      ? `Voice direction: ${compactInstructionText(context.voiceDirection, 220)}.`
      : '',
    formatRecentMessageContext(context.recentMessages)
      ? `Recent emotional context: ${formatRecentMessageContext(context.recentMessages)}.`
      : '',
    extractPerformanceCue(text)
      ? `Current action cue: ${extractPerformanceCue(text)}.`
      : '',
    inferContextCue(context)
      ? `Context emotion cue: ${inferContextCue(context)}.`
      : '',
    inferDialogueCue(text)
      ? `Dialogue emotion cue: ${inferDialogueCue(text)}.`
      : '',
    'Priority: emotional performance is more important than neutral clarity. Avoid announcer, audiobook, assistant, customer-service, or text-to-speech reading cadence.',
    'Use varied pacing: slow down on intimate or vulnerable words, brighten on teasing words, and leave tiny pauses where the text has ellipses, commas, questions, or implied hesitation.',
    'Act as if speaking directly to the user in the moment, not reading a script. Use subtext, small breaths, micro-pauses, and changing intonation where the language implies affection, teasing, shyness, tension, or vulnerability.',
    'Keep the spoken words exact, but make the delivery emotionally alive, close, and conversational.',
  ];

  return lines.filter(Boolean).join(' ').slice(0, MAX_TTS_INSTRUCTIONS_LENGTH);
}

export async function POST(request: Request) {
  try {
    const {
      text,
      voiceType,
      voicePreset,
      gender,
      characterName,
      scene,
      relationship,
      style,
      personality,
      voiceDirection,
      recentMessages,
      requestId,
    }: {
      text?: string;
      voiceType?: string;
      voicePreset?: string;
      gender?: 'male' | 'female' | 'non-binary';
      characterName?: string;
      scene?: string;
      relationship?: string;
      style?: string;
      personality?: string[] | string;
      voiceDirection?: string;
      recentMessages?: Array<{ role?: string; text?: string }>;
      requestId?: string;
    } = await request.json();
    const normalizedText = normalizeText(text || '');

    if (!normalizedText) {
      return respErr('TTS text is required');
    }
    const speechText = normalizeSpeechText(normalizedText);

    if (!speechText) {
      return respErr('No speakable TTS text found');
    }

    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');
    const idempotencyKey = getRoleplayRequestIdempotencyKey(request, requestId);

    const billingEntitlement = await getRoleplayBillingEntitlement(user.id);

    const configs = await getAllConfigs();

    // New semantics: voicePreset should be a global admin-configured voice
    // profile id. Legacy preset ids are still accepted through the
    // normalizeVoicePreset/resolveVoicePresetVoiceType fallback below.
    const configuredProfile = resolveRoleplayTTSVoiceProfileById(
      configs,
      voicePreset
    );
    const presetVoiceType = resolveVoicePresetVoiceType(
      normalizeVoicePreset(voicePreset)
    );
    const defaultProfile = resolveRoleplayTTSVoiceProfileById(
      configs,
      configs.roleplay_tts_default_voice_profile_id
    );
    const selectedVoiceType =
      voiceType ||
      resolveVoiceTypeForText(configuredProfile, speechText) ||
      presetVoiceType ||
      resolveVoiceTypeForText(defaultProfile, speechText) ||
      '';
    const selectedProfile = configuredProfile || defaultProfile;
    const instructions = buildTTSInstructions({
      gender,
      profileLabel: selectedProfile?.label,
      profileTraits: selectedProfile?.traits,
      profileInstructions: selectedProfile?.instructions,
      context: {
        characterName,
        scene,
        relationship,
        style,
        personality,
        voiceDirection,
        recentMessages,
      },
      text: normalizedText,
    });
    const ttsConfig = resolveTTSProviderConfig(configs, {
      provider: selectedProfile?.provider,
      voiceType: selectedVoiceType,
      fallbackVoiceType: selectedProfile?.fallbackVoiceType,
      gender,
      instructions,
    });

    if (!ttsConfig.accessToken) {
      return respErr(getMissingTTSProviderMessage());
    }

    if (ttsConfig.provider === 'volcengine-v1' && !ttsConfig.appId) {
      return respErr(getMissingTTSProviderMessage());
    }

    if (ttsConfig.provider === 'openrouter' && !ttsConfig.model) {
      return respErr(
        'OpenRouter TTS model is required. Set ROLEPLAY_TTS_MODEL to google/gemini-3.1-flash-tts-preview.'
      );
    }

    const digest = md5(
      [
        ttsConfig.provider,
        ttsConfig.model || '',
        ttsConfig.voiceType,
        ttsConfig.fallbackVoiceType || '',
        ttsConfig.instructions || '',
        TTS_EMOTION_STRATEGY_VERSION,
        ttsConfig.responseFormat || 'default',
        ttsConfig.storageFormat || ttsConfig.responseFormat || 'mp3',
        speechText,
      ].join(':')
    );
    const audioFormat =
      ttsConfig.storageFormat || ttsConfig.responseFormat || 'mp3';
    const key = `roleplay/tts/${digest}.${audioFormat}`;
    const contentType =
      ttsConfig.contentType ||
      (audioFormat === 'wav'
        ? 'audio/wav'
        : audioFormat === 'pcm'
          ? 'audio/pcm'
          : 'audio/mpeg');
    const storageService = await getStorageService();
    const existingUrl = storageService.getPublicUrl({ key });

    if (await storageService.exists({ key })) {
      return respData({
        url: existingUrl,
        key,
        provider: ttsConfig.provider,
        model: ttsConfig.model || '',
        voiceType: ttsConfig.voiceType,
        voiceProfileId: configuredProfile?.id || defaultProfile?.id || '',
        deduped: true,
        billing: {
          action: 'roleplay_voice',
          costCredits: 0,
          freePlay: billingEntitlement.freePlay,
          consumedCreditId: '',
          reason: 'deduped',
        },
      });
    }

    const billingPreview = await assertRoleplayCreditsAvailable({
      userId: user.id,
      action: 'roleplay_voice',
      idempotencyKey,
    });

    const audio = await generateTTSSpeech({
      config: ttsConfig,
      text: speechText,
    });
    const upload = await storageService.uploadFile({
      body: audio,
      key,
      contentType,
      disposition: 'inline',
    });

    if (!upload.success || !upload.url) {
      return respErr(upload.error || 'upload TTS audio failed');
    }

    const consumedCredit = await consumeRoleplayCredits({
      userId: user.id,
      action: 'roleplay_voice',
      description: 'roleplay voice generation',
      metadata: {
        provider: ttsConfig.provider,
        model: ttsConfig.model || '',
        voiceType: ttsConfig.voiceType,
        originalLength: normalizedText.length,
        speechLength: speechText.length,
      },
      idempotencyKey,
    });

    return respData({
      url: upload.url,
      key: upload.key,
      provider: ttsConfig.provider,
      model: ttsConfig.model || '',
      voiceType: ttsConfig.voiceType,
      voiceProfileId: configuredProfile?.id || defaultProfile?.id || '',
      bytes: audio.length,
      deduped: false,
      billing: {
        action: 'roleplay_voice',
        costCredits: billingPreview.costCredits,
        freePlay: billingPreview.freePlay,
        consumedCreditId: consumedCredit?.id || '',
      },
    });
  } catch (error: any) {
    console.log('roleplay tts failed:', error);
    if (isRoleplayInsufficientCreditsError(error)) {
      return respErr(error.message, error.data);
    }
    return respErr(error.message || 'roleplay tts failed');
  }
}
