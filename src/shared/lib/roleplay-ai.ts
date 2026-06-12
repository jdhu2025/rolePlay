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
  emotionalHooks?: Array<Record<string, unknown>>;
  humanMomentHooks?: Array<Record<string, unknown>>;
  routing?: {
    firstChatFastModel?: string;
  };
  timing?: {
    firstChatTurn?: number;
    firstTokenMs?: number;
    generationMs?: number;
    streamed?: boolean;
  };
};

export type RoleplayInsufficientCreditsPayload = {
  reason: 'insufficient_credits';
  action: string;
  requiredCredits: number;
  remainingCredits: number;
};

export type RoleplayAuthRequiredPayload = {
  reason: 'auth_required';
  signInUrl?: string;
};

export function createRoleplayAuthRequiredPayload(
  signInUrl = '/sign-up'
): RoleplayAuthRequiredPayload {
  return {
    reason: 'auth_required',
    signInUrl,
  };
}

export class RoleplayApiError extends Error {
  insufficientCredits?: RoleplayInsufficientCreditsPayload;
  authRequired?: RoleplayAuthRequiredPayload;

  constructor(
    message: string,
    options?: {
      insufficientCredits?: RoleplayInsufficientCreditsPayload;
      authRequired?: RoleplayAuthRequiredPayload;
    }
  ) {
    super(message);
    this.name = 'RoleplayApiError';
    this.insufficientCredits = options?.insufficientCredits;
    this.authRequired = options?.authRequired;
  }
}

export type RoleplayHistoryMessage = {
  role: 'user' | 'character';
  text: string;
};

export type RoleplayClientPersona = {
  firstImpression?: string;
};

type RoleplayStreamHandlers = {
  onDelta?: (delta: string) => void;
  onStart?: (payload: Record<string, unknown>) => void;
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

export function parseRoleplayAuthRequiredPayload(
  payload: unknown
): RoleplayAuthRequiredPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Record<string, unknown>;
  if (value.reason !== 'auth_required') return null;

  return {
    reason: 'auth_required',
    signInUrl: typeof value.signInUrl === 'string' ? value.signInUrl : undefined,
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
  if (parseRoleplayAuthRequiredPayload(value.data)) {
    return typeof value.message === 'string' && value.message
      ? value.message
      : 'Please sign in to continue this story.';
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
  const authRequired =
    payload && typeof payload === 'object'
      ? parseRoleplayAuthRequiredPayload((payload as Record<string, unknown>).data)
      : null;

  return new RoleplayApiError(getRoleplayApiErrorMessage(payload, fallback), {
    insufficientCredits: insufficientCredits || undefined,
    authRequired: authRequired || undefined,
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
  requestId = createRoleplayRequestId('rp-chat'),
  clientPersona?: RoleplayClientPersona
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
      clientPersona,
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

function parseRoleplayStreamEvent(raw: string) {
  let event = 'message';
  const dataLines: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
      continue;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) return null;

  try {
    return {
      event,
      data: JSON.parse(dataLines.join('\n')) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export async function generateRoleplayReplyStream(
  character: RoleplayCharacterPrompt,
  input: string,
  history: RoleplayHistoryMessage[] = [],
  conversationId?: string,
  requestId = createRoleplayRequestId('rp-chat'),
  clientPersona?: RoleplayClientPersona,
  handlers: RoleplayStreamHandlers = {}
): Promise<RoleplayReply> {
  const response = await fetch('/api/roleplay/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      character,
      input,
      history,
      conversationId,
      requestId,
      clientPersona,
      stream: true,
    }),
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      // Keep the status-based error below when the server returns non-JSON.
    }
    throw createRoleplayApiError(
      payload,
      `roleplay stream request failed: ${response.status}`
    );
  }

  if (!response.ok || !response.body) {
    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      // Keep the status-based error below when the server returns non-JSON.
    }
    throw createRoleplayApiError(
      payload,
      `roleplay stream request failed: ${response.status}`
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalReply: RoleplayReply | undefined;

  const processEvent = (raw: string) => {
    const parsed = parseRoleplayStreamEvent(raw.trim());
    if (!parsed) return;

    if (parsed.event === 'start') {
      handlers.onStart?.(parsed.data);
      return;
    }

    if (parsed.event === 'delta') {
      const text = typeof parsed.data.text === 'string' ? parsed.data.text : '';
      if (text) handlers.onDelta?.(text);
      return;
    }

    if (parsed.event === 'done') {
      finalReply = parsed.data as RoleplayReply;
      return;
    }

    if (parsed.event === 'error') {
      throw createRoleplayApiError(
        { message: parsed.data.message, data: parsed.data },
        typeof parsed.data.message === 'string'
          ? parsed.data.message
          : 'roleplay stream failed'
      );
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split(/\n\n/);
    buffer = events.pop() || '';
    for (const event of events) {
      if (event.trim()) processEvent(event);
    }
  }

  if (buffer.trim()) processEvent(buffer);

  const reply = finalReply;
  if (!reply || !reply.text) {
    throw new RoleplayApiError('roleplay stream ended without a reply');
  }

  return reply;
}
