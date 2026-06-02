import type { PersonalityCard } from '@/shared/lib/roleplay-personality';
import type { RoleplayFormatStyle } from '@/shared/lib/roleplay-format-style';
import type { RoleplayStyleExample } from '@/shared/lib/roleplay-style-examples';

export type RoleplayCharacterPrompt = {
  id?: string;
  name: string;
  tagline: string;
  opening: string;
  scene: string;
  settings?: string;
  intro?: string;
  relationship?: string;
  style?: string;
  personality?: string[];
  personalityCard?: PersonalityCard | string;
  formatStyle?: RoleplayFormatStyle | string;
  styleExamples?: RoleplayStyleExample[] | string;
  voice?: string;
  voicePreset?: string;
  visualIdentity?: Record<string, unknown>;
  imageStyleSuffix?: string;
  avatar?: string;
  gallery?: string[];
  model?: string;
};

export type RoleplayReply = {
  text: string;
  media?: 'voice' | 'image' | 'locked';
  provider?: string;
  conversationId?: string;
  userMessageId?: string;
  characterMessageId?: string;
  authenticated?: boolean;
  persisted?: boolean;
  billing?: {
    action: string;
    costCredits: number;
    freePlay: boolean;
    consumedCreditId?: string;
  };
  guestUsage?: {
    replies: number;
    limit: number;
    softPrompt: boolean;
    hardGate: boolean;
  };
  imageRequest?: {
    shouldGenerate: boolean;
    requestText?: string;
    shotIntent?: string;
    holdingText?: string;
  };
};

export type RoleplayInsufficientCreditsPayload = {
  reason: 'insufficient_credits';
  action: string;
  requiredCredits: number;
  remainingCredits: number;
};

export class RoleplayApiError extends Error {
  insufficientCredits?: RoleplayInsufficientCreditsPayload;

  constructor(
    message: string,
    options?: { insufficientCredits?: RoleplayInsufficientCreditsPayload }
  ) {
    super(message);
    this.name = 'RoleplayApiError';
    this.insufficientCredits = options?.insufficientCredits;
  }
}

export type RoleplayHistoryMessage = {
  role: 'user' | 'character';
  text: string;
};

export function parseRoleplayInsufficientCreditsPayload(
  payload: unknown
): RoleplayInsufficientCreditsPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, unknown>;
  if (value.reason !== 'insufficient_credits') return null;
  const requiredCredits = Number(value.requiredCredits);
  const remainingCredits = Number(value.remainingCredits);
  if (!Number.isFinite(requiredCredits) || !Number.isFinite(remainingCredits)) {
    return null;
  }

  return {
    reason: 'insufficient_credits',
    action: typeof value.action === 'string' ? value.action : '',
    requiredCredits,
    remainingCredits,
  };
}

export function formatRoleplayInsufficientCreditsMessage(
  payload: RoleplayInsufficientCreditsPayload
) {
  const actionLabels: Record<string, string> = {
    roleplay_text: 'this reply',
    roleplay_image: 'this image',
    roleplay_voice: 'this voice',
    roleplay_ai_writer_text: 'AI Writer',
    roleplay_ai_writer_image: 'AI Writer image generation',
    roleplay_publish_public: 'public publishing',
    roleplay_publish_private: 'private publishing',
  };
  const actionLabel = actionLabels[payload.action] || 'this action';

  return `Not enough credits for ${actionLabel}. Need ${payload.requiredCredits}, you have ${payload.remainingCredits}.`;
}

export function getRoleplayApiErrorMessage(
  payload: unknown,
  fallback = 'RolePlay request failed'
) {
  if (!payload || typeof payload !== 'object') return fallback;
  const value = payload as Record<string, unknown>;
  const insufficientCredits = parseRoleplayInsufficientCreditsPayload(
    value.data
  );
  if (insufficientCredits) {
    return formatRoleplayInsufficientCreditsMessage(insufficientCredits);
  }

  return typeof value.message === 'string' && value.message
    ? value.message
    : fallback;
}

export function createRoleplayApiError(
  payload: unknown,
  fallback = 'RolePlay request failed'
) {
  const insufficientCredits =
    payload && typeof payload === 'object'
      ? parseRoleplayInsufficientCreditsPayload(
          (payload as Record<string, unknown>).data
        )
      : null;

  return new RoleplayApiError(getRoleplayApiErrorMessage(payload, fallback), {
    insufficientCredits: insufficientCredits || undefined,
  });
}

export function createRoleplayRequestId(prefix = 'rp') {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function generateRoleplayReply(
  character: RoleplayCharacterPrompt,
  input: string,
  history: RoleplayHistoryMessage[] = [],
  conversationId?: string,
  requestId = createRoleplayRequestId('rp-chat')
): Promise<RoleplayReply> {
  const response = await fetch('/api/roleplay/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      character,
      input,
      history,
      conversationId,
      requestId,
    }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    // Keep the status-based error below when the server returns non-JSON.
  }

  if (!response.ok || payload?.code !== 0 || !payload?.data?.text) {
    throw createRoleplayApiError(
      payload,
      `roleplay LLM request failed: ${response.status}`
    );
  }

  return payload.data as RoleplayReply;
}
