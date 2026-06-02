'use client';

/**
 * Roleplay chat page.
 *
 * Layout:
 * - Sticky header: back button, character avatar, name + subline, link to detail.
 * - Scrolling message list: alternating user / character bubbles, character
 *   bubbles include a small avatar so identity is reinforced through the
 *   whole conversation.
 * - Composer pinned to the bottom: textarea (auto-grow up to ~6 lines) +
 *   send button.
 *
 * Data flow:
 * - On mount: pull the character via the shared client helper, restore the
 *   latest DB conversation for this character when available, then fall back
 *   to the older /api/roleplay/state blob or the character opening.
 * - sendMessage uses generateRoleplayReply which already implements optimistic
 *   error handling, conversation upsert, message persistence and memory
 *   updates server-side.
 */

import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  Coins,
  Heart,
  ImageOff,
  Loader2,
  MapPin,
  Pause,
  RefreshCw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { Link, useRouter } from '@/core/i18n/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Skeleton } from '@/shared/components/ui/skeleton';
import {
  createRoleplayApiError,
  createRoleplayRequestId,
  generateRoleplayReply,
  RoleplayApiError,
  type RoleplayCharacterPrompt,
  type RoleplayHistoryMessage,
  type RoleplayInsufficientCreditsPayload,
} from '@/shared/lib/roleplay-ai';
import {
  readLocalRoleplayConversationId,
  readLocalRoleplayMessages,
  writeLocalRoleplayChatState,
  type StoredRoleplayChatMessage,
} from '@/shared/lib/roleplay-chat-storage';
import {
  fetchRoleplayCharacter,
  getLocalRoleplayCharacter,
  readCharacterSettings,
  type RoleplayCharacterClient,
} from '@/shared/lib/roleplay-client';
import { parseMessage } from '@/shared/lib/roleplay-message-format';
import { cn } from '@/shared/lib/utils';

type ChatMessage = {
  id: string;
  role: 'user' | 'character';
  text: string;
  mediaType?: 'image';
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  /**
   * Delivery state for the WhatsApp-style ✓ / ✓✓ on user bubbles.
   * - `pending`: in-flight (single check, dimmed).
   * - `sent`: server confirmed (double check). The chat API persists the
   *   user message to `roleplay_message` before producing the reply, so a
   *   successful reply is the user message's own delivery confirmation.
   * - `error`: send failed (single check, red). The text stays in the bubble
   *   so the user can retype if they want.
   * - `undefined`: not applicable (character bubbles, restored history).
   */
  delivery?: 'pending' | 'sent' | 'error';
};

type PendingSend = {
  messageId: string;
  requestId: string;
  text: string;
};

type StoredState = {
  selectedId?: string;
  messages?: StoredRoleplayChatMessage[];
  conversationIds?: Record<string, string>;
};

type StoredConversation = {
  id?: string;
  characterId?: string | null;
  characterSnapshot?: {
    id?: string;
  } | null;
  title?: string | null;
};

type StoredMessage = StoredRoleplayChatMessage;

type Props = {
  characterId: string;
};

type RestoreDebug = {
  checked: boolean;
  authenticated?: boolean;
  conversations?: number;
  matchedConversationId?: string;
  restoredMessages?: number;
  source?: string;
};

const COMPOSER_MAX_ROWS = 6;
const ROLEPLAY_CHAT_HISTORY_LIMIT = 18;
const TTS_EMOTION_STRATEGY_VERSION = 'emotion-v2';

function readMessageTTSUrl(message: ChatMessage, voicePreset?: string) {
  const currentVoicePreset = String(voicePreset || '').trim();
  const cachedVoicePreset =
    typeof message.metadata?.ttsVoicePreset === 'string'
      ? message.metadata.ttsVoicePreset.trim()
      : '';
  const cachedEmotionStrategy =
    typeof message.metadata?.ttsEmotionStrategyVersion === 'string'
      ? message.metadata.ttsEmotionStrategyVersion.trim()
      : '';

  if (
    currentVoicePreset &&
    (!cachedVoicePreset || cachedVoicePreset !== currentVoicePreset)
  ) {
    return '';
  }
  if (cachedEmotionStrategy !== TTS_EMOTION_STRATEGY_VERSION) return '';

  const value = message.metadata?.ttsUrl || message.metadata?.audioUrl;
  return typeof value === 'string' && value ? value : '';
}

function compactVoiceDirection(value: unknown, maxLength = 120) {
  return String(value || '')
    .replace(/[`*_#>~|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function buildRoleplayVoiceDirection(character: RoleplayCharacterClient) {
  const card = character.personalityCard;
  const parts = [
    character.voice ? `Voice note: ${character.voice}` : '',
    card?.speakingStyle ? `Cadence: ${card.speakingStyle}` : '',
    card?.tension ? `Emotional tension: ${card.tension}` : '',
    card?.relationshipHook ? `Relationship stage: ${card.relationshipHook}` : '',
    card?.memoryCallbackStyle
      ? `Memory callback style: ${card.memoryCallbackStyle}`
      : '',
    card?.catchphrases?.length
      ? `Signature wording: ${card.catchphrases.join(', ')}`
      : '',
  ]
    .map((part) => compactVoiceDirection(part, 180))
    .filter(Boolean);

  return parts.join(' ');
}

function normalizeStoredMessages(messages: StoredMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message, idx): ChatMessage => {
      const role: ChatMessage['role'] =
        message.role === 'user' ? 'user' : 'character';
      const metadata =
        message.metadata && typeof message.metadata === 'object'
          ? message.metadata
          : undefined;
      const mediaType =
        message.mediaType === 'image' || metadata?.mediaType === 'image'
          ? 'image'
          : undefined;
      const mediaUrl =
        typeof message.mediaUrl === 'string'
          ? message.mediaUrl
          : typeof metadata?.assetUrl === 'string'
            ? metadata.assetUrl
            : undefined;
      return {
        id: message.id ?? `restore-${idx}`,
        role,
        text: typeof message.text === 'string' ? message.text : '',
        mediaType,
        mediaUrl,
        metadata,
      };
    })
    .filter((message) => message.text || message.mediaUrl);
}

async function fetchLatestConversationMessagesForCharacter(
  characterId: string,
  signal: AbortSignal
) {
  const response = await fetch(
    `/api/roleplay/conversations/latest?characterId=${encodeURIComponent(characterId)}`,
    {
      credentials: 'include',
      cache: 'no-store',
      signal,
    }
  );
  if (!response.ok) {
    return {
      conversation: null,
      messages: [],
      authenticated: undefined,
    };
  }

  const payload = await response.json();
  const conversation = (payload?.data?.conversation ?? null) as
    | StoredConversation
    | null;
  const messages = (payload?.data?.messages ?? []) as
    | StoredMessage[]
    | unknown;
  return {
    conversation,
    messages: Array.isArray(messages) ? normalizeStoredMessages(messages) : [],
    authenticated:
      typeof payload?.data?.authenticated === 'boolean'
        ? Boolean(payload.data.authenticated)
        : undefined,
  };
}

async function fetchConversationMessages(
  conversationId: string,
  signal: AbortSignal
) {
  if (!conversationId) return [];
  const messagesRes = await fetch(
    `/api/roleplay/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      credentials: 'include',
      cache: 'no-store',
      signal,
    }
  );
  if (!messagesRes.ok) return [];

  const messagesPayload = await messagesRes.json();
  const messages = (messagesPayload?.data?.messages ?? []) as
    | StoredMessage[]
    | unknown;
  return Array.isArray(messages) ? normalizeStoredMessages(messages) : [];
}

export function RoleplayChat({ characterId }: Props) {
  const t = useTranslations('roleplay.chat_page');
  const tDetail = useTranslations('roleplay.detail');
  const tProfile = useTranslations('roleplay.profile');
  const router = useRouter();
  const localCharacter = getLocalRoleplayCharacter(characterId);
  const [character, setCharacter] = useState<RoleplayCharacterClient | null>(
    localCharacter
  );
  const [loading, setLoading] = useState(!localCharacter);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [conversationId, setConversationId] = useState<string>('');
  const [pendingReplyCount, setPendingReplyCount] = useState(0);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState('');
  const [voiceLoadingMessageId, setVoiceLoadingMessageId] = useState('');
  const [voicePlayingMessageId, setVoicePlayingMessageId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [insufficientCredits, setInsufficientCredits] =
    useState<RoleplayInsufficientCreditsPayload | null>(null);
  const [restoreDebug, setRestoreDebug] = useState<RestoreDebug | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const seededRef = useRef(false);
  const characterRef = useRef<RoleplayCharacterClient | null>(character);
  const conversationIdRef = useRef(conversationId);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const pendingQueueRef = useRef<PendingSend[]>([]);
  const processingQueueRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const updateMessages = useCallback((
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setMessages((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      messagesRef.current = next;
      return next;
    });
  }, []);

  const clearRoleplayError = useCallback(() => {
    setErrorMessage('');
    setInsufficientCredits(null);
  }, []);

  const setRoleplayError = useCallback((error: unknown, fallback: string) => {
    setInsufficientCredits(
      error instanceof RoleplayApiError
        ? error.insufficientCredits || null
        : null
    );
    setErrorMessage(error instanceof Error ? error.message : fallback);
  }, []);

  // Load the character (and any prior remote chat state) on mount.
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      const localMessages = normalizeStoredMessages(
        readLocalRoleplayMessages(characterId)
      );
      const localConversationId = readLocalRoleplayConversationId(characterId);
      if (localConversationId) {
        conversationIdRef.current = localConversationId;
        setConversationId(localConversationId);
      }
      if (localMessages.length) {
        setRestoreDebug({
          checked: true,
          matchedConversationId: localConversationId || undefined,
          restoredMessages: localMessages.length,
          source: 'local',
        });
        updateMessages(localMessages);
      }

      const characterPromise = fetchRoleplayCharacter(characterId, {
        signal: controller.signal,
      });
      const latestPromise = fetchLatestConversationMessagesForCharacter(
        characterId,
        controller.signal
      ).catch(() => null);
      if (localCharacter) {
        void characterPromise
          .then((data) => {
            if (data.character) setCharacter(data.character);
          })
          .catch(() => {});
      }
      const [data, latest] = await Promise.all([
        localCharacter ? Promise.resolve(null) : characterPromise,
        latestPromise,
      ]);
      const found = localCharacter ?? data?.character ?? null;
      setCharacter(found);

      // Seed opening message + restore prior conversation if available.
      if (found && !seededRef.current) {
        seededRef.current = true;
        const seeded: ChatMessage[] = found.opening
          ? [
              {
                id: `open-${found.id}`,
                role: 'character',
                text: found.opening,
              },
            ]
          : [];
        let hasPriorChat = false;
        let remoteAuthenticated = latest?.authenticated;

        try {
          const conversation = latest?.conversation ?? null;
          if (conversation?.id) {
            hasPriorChat = true;
            conversationIdRef.current = conversation.id;
            setConversationId(conversation.id);
            const restored = latest?.messages ?? [];
            const localIsSameConversation =
              localConversationId === conversation.id;
            setRestoreDebug({
              checked: true,
              authenticated: remoteAuthenticated,
              matchedConversationId: conversation.id,
              restoredMessages: Math.max(
                restored.length,
                localIsSameConversation ? localMessages.length : 0
              ),
              source: 'db',
            });
            if (restored.length || localIsSameConversation) {
              updateMessages(
                localIsSameConversation &&
                  localMessages.length > restored.length
                  ? localMessages
                  : restored
              );
              setLoading(false);
              return;
            }
          }

          if (!localMessages.length) {
            const stateRes = await fetch('/api/roleplay/state', {
              credentials: 'include',
              signal: controller.signal,
            });
            if (stateRes.ok) {
              const payload = await stateRes.json();
              if (typeof payload?.data?.authenticated === 'boolean') {
                remoteAuthenticated = payload.data.authenticated;
              }
              const state = (payload?.data?.state ?? null) as StoredState | null;
              const remoteId = state?.conversationIds?.[characterId] ?? '';
              if (remoteId) {
                hasPriorChat = true;
                conversationIdRef.current = remoteId;
                setConversationId(remoteId);
                const restored = await fetchConversationMessages(
                  remoteId,
                  controller.signal
                );
                if (restored.length) {
                  updateMessages(restored);
                  setLoading(false);
                  return;
                }
              }

              // Only adopt remote messages if they belong to *this* character
              // (the talkie-mvp blob stored selectedId next to messages).
              if (
                state?.selectedId === characterId &&
                Array.isArray(state.messages)
              ) {
                const restored = normalizeStoredMessages(state.messages);
                if (restored.length) {
                  updateMessages(restored);
                  setLoading(false);
                  return;
                }
              }
            }
          }
        } catch {
          if (localMessages.length) {
            setLoading(false);
            return;
          }
          // sign-out / migration / network - chat falls back to opening line.
        }

        if (remoteAuthenticated !== true && localMessages.length) {
          setRestoreDebug((prev) => ({
            ...(prev ?? { checked: true }),
            source: 'local',
            restoredMessages: localMessages.length,
          }));
          updateMessages(localMessages);
          setLoading(false);
          return;
        }
        if (localMessages.length) {
          setLoading(false);
          return;
        }

        // Opening lines are only for the first contact. If we know this
        // character already has a saved conversation, avoid replaying the
        // greeting even when the history fetch returns no visible messages.
        updateMessages(hasPriorChat ? [] : seeded);
      }
      setLoading(false);
    }

    void load();

    return () => controller.abort();
  }, [characterId, localCharacter, updateMessages]);

  useEffect(() => {
    characterRef.current = character;
  }, [character]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // Auto-scroll to bottom when messages change.
  useLayoutEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pendingReplyCount]);

  // Auto-grow textarea up to COMPOSER_MAX_ROWS.
  useLayoutEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = 'auto';
    const lineHeight = parseFloat(getComputedStyle(node).lineHeight || '20');
    const maxHeight = lineHeight * COMPOSER_MAX_ROWS;
    node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
  }, [draft]);

  const buildPrompt = (): RoleplayCharacterPrompt | null => {
    const currentCharacter = characterRef.current;
    if (!currentCharacter) return null;
    return {
      id: currentCharacter.id,
      name: currentCharacter.name,
      tagline: currentCharacter.tagline,
      opening: currentCharacter.opening,
      scene: currentCharacter.scene,
      intro: currentCharacter.intro,
      relationship: currentCharacter.relationship,
      style: currentCharacter.style,
      personality: currentCharacter.personality,
      personalityCard: currentCharacter.personalityCard,
      formatStyle: currentCharacter.formatStyle,
      styleExamples: currentCharacter.styleExamples,
      voicePreset: currentCharacter.voicePreset,
      visualIdentity: currentCharacter.visualIdentity,
      imageStyleSuffix: currentCharacter.imageStyleSuffix,
      avatar: currentCharacter.avatar,
      gallery: currentCharacter.gallery,
      model: currentCharacter.model,
    };
  };

  const getHistoryBeforeMessage = (messageId: string) => {
    const currentMessages = messagesRef.current;
    const index = currentMessages.findIndex((message) => message.id === messageId);
    const historySource =
      index >= 0 ? currentMessages.slice(0, index) : currentMessages;
    return historySource
      .slice(-ROLEPLAY_CHAT_HISTORY_LIMIT)
      .map((message): RoleplayHistoryMessage => ({
        role: message.role,
        text: message.text,
      }));
  };

  const insertCharacterReply = (
    userMessageId: string,
    characterMessage: ChatMessage
  ) => {
    let nextMessages: ChatMessage[] = [];
    updateMessages((prev) => {
      const index = prev.findIndex((message) => message.id === userMessageId);
      const promoted = prev.map((message) =>
        message.id === userMessageId
          ? { ...message, delivery: 'sent' as const }
          : message
      );
      if (index < 0) {
        nextMessages = [...promoted, characterMessage];
        return nextMessages;
      }
      nextMessages = [
        ...promoted.slice(0, index + 1),
        characterMessage,
        ...promoted.slice(index + 1),
      ];
      return nextMessages;
    });
    return nextMessages;
  };


  const requestChatImage = useCallback(async ({
    reply,
    characterMessage,
    character,
  }: {
    reply: Awaited<ReturnType<typeof generateRoleplayReply>>;
    characterMessage: ChatMessage;
    character: RoleplayCharacterClient;
  }) => {
    if (!reply.imageRequest?.shouldGenerate) return;

    const pendingImageMessage: ChatMessage = {
      id: `img-pending-${Date.now()}`,
      role: 'character',
      text: '*正在整理照片发给你…*',
      metadata: { pendingImage: true },
    };

    const withPending = [...messagesRef.current, pendingImageMessage];
    updateMessages(withPending);
    writeLocalRoleplayChatState({
      characterId: character.id,
      conversationId: reply.conversationId || conversationIdRef.current || undefined,
      messages: withPending,
    });

    try {
      const recentMessages = messagesRef.current
        .slice(-6)
        .map((message) => ({ role: message.role, text: message.text }));
      const referenceImages = [
        character.avatar,
        ...(Array.isArray(character.gallery) ? character.gallery : []),
      ].filter(
        (value): value is string => typeof value === 'string' && Boolean(value)
      );
      const imageResponse = await fetch('/api/roleplay/image', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          conversationId: reply.conversationId || conversationIdRef.current || undefined,
          characterName: character.name,
          characterAvatar: referenceImages[0] || undefined,
          characterReferenceImages: referenceImages,
          characterIntro: character.intro || character.settings || undefined,
          characterStyle: character.tagline || character.style || undefined,
          visualIdentity: character.visualIdentity,
          imageStyleSuffix: character.imageStyleSuffix,
          prompt: [character.tagline, character.intro, character.settings]
            .filter(Boolean)
            .join('\n'),
          requestText: reply.imageRequest.requestText,
          scene: character.scene,
          recentMessages,
          mode: 'chat_snapshot',
          requestId: createRoleplayRequestId('rp-image'),
        }),
      });
      const payload = await imageResponse.json().catch(() => ({}));
      if (!imageResponse.ok || (payload?.code && payload.code !== 0)) {
        throw createRoleplayApiError(payload, 'image generate failed');
      }

      const generatedMessage: ChatMessage = {
        id: payload?.data?.messageId || `img-${Date.now()}`,
        role: 'character',
        text:
          typeof payload?.data?.text === 'string' && payload.data.text
            ? payload.data.text
            : characterMessage.text,
        mediaType: payload?.data?.mediaType === 'image' ? 'image' : undefined,
        mediaUrl: payload?.data?.url,
        metadata:
          payload?.data?.metadata && typeof payload.data.metadata === 'object'
            ? payload.data.metadata
            : undefined,
      };

      const nextMessages = messagesRef.current.map((message) =>
        message.id === pendingImageMessage.id ? generatedMessage : message
      );
      updateMessages(nextMessages);
      writeLocalRoleplayChatState({
        characterId: character.id,
        conversationId: reply.conversationId || conversationIdRef.current || undefined,
        messages: nextMessages,
      });
    } catch (error) {
      const failedMessages = messagesRef.current.map((message) =>
        message.id === pendingImageMessage.id
          ? {
              ...message,
              text: '*照片没发成功……等我再试一次。*',
              metadata: { pendingImage: false, failedImage: true },
            }
          : message
      );
      updateMessages(failedMessages);
      writeLocalRoleplayChatState({
        characterId: character.id,
        conversationId: reply.conversationId || conversationIdRef.current || undefined,
        messages: failedMessages,
      });
      setRoleplayError(error, t('error'));
    }
  }, [setRoleplayError, t, updateMessages]);

  const processSendQueue = async () => {
    if (processingQueueRef.current) return;
    processingQueueRef.current = true;

    try {
      while (pendingQueueRef.current.length > 0) {
        const item = pendingQueueRef.current.shift();
        const currentCharacter = characterRef.current;
        if (!item || !currentCharacter) continue;

        setPendingReplyCount((prev) => prev + 1);
        try {
          const prompt = buildPrompt();
          if (!prompt) continue;
          const reply = await generateRoleplayReply(
            prompt,
            item.text,
            getHistoryBeforeMessage(item.messageId),
            conversationIdRef.current || undefined,
            item.requestId
          );
          if (reply.conversationId) {
            conversationIdRef.current = reply.conversationId;
            setConversationId(reply.conversationId);
          }
          const characterMessage: ChatMessage = {
            id: reply.characterMessageId || `c-${Date.now()}`,
            role: 'character',
            text: reply.text,
          };
          const nextMessages = insertCharacterReply(
            item.messageId,
            characterMessage
          );
          writeLocalRoleplayChatState({
            characterId: currentCharacter.id,
            conversationId:
              reply.conversationId || conversationIdRef.current || undefined,
            messages: nextMessages,
          });
          if (reply.imageRequest?.shouldGenerate) {
            await requestChatImage({
              reply,
              characterMessage,
              character: currentCharacter,
            });
          }
        } catch (error) {
          console.warn('roleplay chat send failed', error);
          updateMessages((prev) =>
            prev.map((message) =>
              message.id === item.messageId
                ? { ...message, delivery: 'error' }
                : message
            )
          );
          setRoleplayError(error, t('error'));
        } finally {
          setPendingReplyCount((prev) => Math.max(0, prev - 1));
        }
      }
    } finally {
      processingQueueRef.current = false;
      if (pendingQueueRef.current.length > 0) {
        void processSendQueue();
      }
    }
  };

  const handleSend = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !character) return;

    clearRoleplayError();
    const messageId = `u-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: messageId,
      role: 'user',
      text,
      delivery: 'pending',
    };
    updateMessages((prev) => [...prev, userMessage]);
    setDraft('');
    pendingQueueRef.current.push({
      messageId,
      requestId: createRoleplayRequestId('rp-chat'),
      text,
    });
    void processSendQueue();
  };

  const handleRegenerateWithCheck = async (message: ChatMessage) => {
    if (!character || regeneratingMessageId) return;
    const index = messages.findIndex((item) => item.id === message.id);
    if (index < 0) return;
    const previousUser = [...messages.slice(0, index)]
      .reverse()
      .find((item) => item.role === 'user');
    if (!previousUser) return;
    const prompt = buildPrompt();
    if (!prompt) return;

    clearRoleplayError();
    setRegeneratingMessageId(message.id);
    try {
      const response = await fetch(
        '/api/roleplay/chat/regenerate-with-check',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            character: prompt,
            conversationId: conversationId || undefined,
            messageId: message.id,
            userInput: previousUser.text,
            originalReply: message.text,
            history: messages.slice(0, index).map((item) => ({
              role: item.role,
              text: item.text,
            })),
          }),
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.code !== 0 || !payload?.data?.text) {
        throw createRoleplayApiError(payload, 'regenerate failed');
      }
      const replacementId =
        payload.data.characterMessageId || `regen-${Date.now()}`;
      const nextMessages = messages.map((item) =>
        item.id === message.id
          ? { ...item, id: replacementId, text: payload.data.text }
          : item
      );
      updateMessages(nextMessages);
      writeLocalRoleplayChatState({
        characterId: character.id,
        conversationId: payload.data.conversationId || conversationId || undefined,
        messages: nextMessages,
      });
    } catch (error) {
      console.warn('roleplay OOC regenerate failed', error);
      setRoleplayError(error, t('error'));
    } finally {
      setRegeneratingMessageId('');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handlePlayVoice = useCallback(
    async (message: ChatMessage) => {
      if (!character || message.role !== 'character' || !message.text.trim()) {
        return;
      }

      if (voicePlayingMessageId === message.id) {
        audioRef.current?.pause();
        audioRef.current = null;
        setVoicePlayingMessageId('');
        return;
      }

      let audioUrl = readMessageTTSUrl(message, character.voicePreset);
      clearRoleplayError();
      setVoiceLoadingMessageId(message.id);

      try {
        if (!audioUrl) {
          const messageIndex = messagesRef.current.findIndex(
            (item) => item.id === message.id
          );
          const recentMessages = (
            messageIndex >= 0
              ? messagesRef.current.slice(Math.max(0, messageIndex - 4), messageIndex + 1)
              : messagesRef.current.slice(-5)
          ).map((item) => ({
            role: item.role,
            text: item.text,
          }));

          const response = await fetch('/api/roleplay/tts', {
            method: 'POST',
            credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              text: message.text,
              voicePreset: character.voicePreset,
              gender: character.gender,
              characterName: character.name,
              scene: character.scene,
              relationship: character.relationship,
              style: character.style,
              personality: character.personality,
              voiceDirection: buildRoleplayVoiceDirection(character),
              recentMessages,
              requestId: createRoleplayRequestId('rp-tts'),
            }),
          });
          const payload = await response.json().catch(() => ({}));
          if (!response.ok || payload?.code !== 0 || !payload?.data?.url) {
            throw createRoleplayApiError(payload, 'voice generate failed');
          }

          audioUrl = payload.data.url;
          const nextMessages = messagesRef.current.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  metadata: {
                    ...(item.metadata || {}),
                    ttsUrl: audioUrl,
                    ttsKey: payload.data.key,
                    ttsProvider: payload.data.provider,
                    ttsModel: payload.data.model,
                    ttsVoiceType: payload.data.voiceType,
                    ttsVoicePreset: character.voicePreset || '',
                    ttsEmotionStrategyVersion: TTS_EMOTION_STRATEGY_VERSION,
                  },
                }
              : item
          );
          updateMessages(nextMessages);
          writeLocalRoleplayChatState({
            characterId: character.id,
            conversationId: conversationIdRef.current || undefined,
            messages: nextMessages,
          });
        }

        audioRef.current?.pause();
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setVoicePlayingMessageId(message.id);
        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
            setVoicePlayingMessageId('');
          }
        };
        audio.onerror = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
            setVoicePlayingMessageId('');
          }
          setInsufficientCredits(null);
          setErrorMessage(t('voice_error'));
        };
        await audio.play();
      } catch (error) {
        console.warn('roleplay voice playback failed', error);
        setRoleplayError(error, t('voice_error'));
      } finally {
        setVoiceLoadingMessageId('');
      }
    },
    [character, clearRoleplayError, setRoleplayError, t, updateMessages, voicePlayingMessageId]
  );

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  if (loading) {
    return <ChatSkeleton />;
  }

  if (!character) {
    return (
      <main className="flex min-h-dvh flex-col bg-[#0d0d10] text-white">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pt-6 md:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 self-start text-sm text-zinc-300 hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t('back')}
          </Link>
          <p className="text-zinc-300">{t('not_found')}</p>
        </div>
      </main>
    );
  }

  const settings = readCharacterSettings(character);
  const occupation = settings.occupation || character.style;
  const location = settings.location || character.scene;
  const subline =
    [occupation, location]
      .filter(Boolean)
      .join(' · ') ||
    character.tagline;

  return (
    <main className="flex min-h-dvh flex-col bg-[#0d0d10] text-white">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-[#0d0d10]/85 px-4 py-3 backdrop-blur md:px-6">
        <button
          type="button"
          onClick={handleBack}
          aria-label={t('back')}
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/8 hover:text-white"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <CharacterProfileDialog
            character={character}
            occupation={occupation}
            location={location}
            triggerLabel={t('view_profile')}
            titleLabel={t('profile_title', { name: character.name })}
            aboutLabel={tDetail('bio')}
            personalityLabel={tDetail('personality')}
            tagsLabel={tDetail('tags')}
            ageLabel={tProfile('age')}
            relationshipLabel={tProfile('relationship')}
            openingLabel={tProfile('opening')}
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight">
              {character.name}
            </span>
            <span className="truncate text-xs text-zinc-400">{subline}</span>
          </div>
        </div>
        <Link
          href={`/chat/profile/${character.id}/history`}
          aria-label={t('history')}
          title={t('history')}
          className="grid h-9 w-9 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/8 hover:text-white"
        >
          <Clock3 size={18} aria-hidden="true" />
        </Link>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-4 py-5 md:px-6"
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {messages.length === 0 ? (
            <EmptyState name={character.name} />
          ) : (
            messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                avatar={character.avatar}
                name={character.name}
                regenerating={regeneratingMessageId === message.id}
                onRegenerate={() => handleRegenerateWithCheck(message)}
                onPlayVoice={() => handlePlayVoice(message)}
                regenerateLabel={t('ooc_regenerate')}
                regenerateTitle={t('ooc_regenerate_title')}
                playVoiceTitle={t('play_voice')}
                pauseVoiceTitle={t('pause_voice')}
                voiceLoading={voiceLoadingMessageId === message.id}
                voicePlaying={voicePlayingMessageId === message.id}
              />
            ))
          )}
          {pendingReplyCount > 0 && (
            <TypingIndicator avatar={character.avatar} name={character.name} />
          )}
          {errorMessage && (
            insufficientCredits ? (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-3 text-xs text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 font-medium text-amber-100">
                      <Coins className="size-4" />
                      <span>{t('low_credits_title')}</span>
                    </div>
                    <p className="leading-relaxed text-amber-100/85">
                      {errorMessage}
                    </p>
                    <p className="text-amber-100/70">
                      {t('low_credits_hint', {
                        required: insufficientCredits.requiredCredits,
                        remaining: insufficientCredits.remainingCredits,
                      })}
                    </p>
                  </div>
                  <Link
                    href="/pricing"
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-200 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-amber-100"
                  >
                    <Coins className="size-4" />
                    {t('low_credits_cta')}
                  </Link>
                </div>
              </div>
            ) : (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {errorMessage}
              </p>
            )
          )}
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="sticky bottom-0 z-20 border-t border-white/5 bg-[#0d0d10]/85 px-4 py-3 backdrop-blur md:px-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={t('placeholder', { name: character.name })}
            className={cn(
              'min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm leading-relaxed text-zinc-100 caret-white placeholder:text-zinc-500',
              'focus:border-white/30 focus:bg-white/10 focus:outline-none'
            )}
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={t('send')}
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-black transition-opacity',
              'disabled:cursor-not-allowed disabled:opacity-40'
            )}
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
    </main>
  );
}

function CharacterProfileDialog({
  character,
  occupation,
  location,
  triggerLabel,
  titleLabel,
  aboutLabel,
  personalityLabel,
  tagsLabel,
  ageLabel,
  relationshipLabel,
  openingLabel,
}: {
  character: RoleplayCharacterClient;
  occupation: string;
  location: string;
  triggerLabel: string;
  titleLabel: string;
  aboutLabel: string;
  personalityLabel: string;
  tagsLabel: string;
  ageLabel: string;
  relationshipLabel: string;
  openingLabel: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={triggerLabel}
          title={triggerLabel}
          className="shrink-0 rounded-full outline-none ring-offset-[#0d0d10] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2"
        >
          <CharacterAvatar
            src={character.avatar}
            name={character.name}
            size={40}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[86dvh] overflow-y-auto border-white/10 bg-[#151518] p-0 text-white shadow-2xl sm:max-w-2xl">
        <div className="relative h-44 overflow-hidden rounded-t-lg bg-white/5 sm:h-56">
          <Image
            src={character.cover || character.avatar}
            alt=""
            fill
            priority={false}
            sizes="(min-width: 640px) 640px, 100vw"
            unoptimized={process.env.NODE_ENV !== 'production'}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151518] via-[#151518]/25 to-transparent" />
          <div className="absolute bottom-4 left-5 right-14 flex items-end gap-3">
            <CharacterAvatar
              src={character.avatar}
              name={character.name}
              size={64}
              className="ring-2 ring-[#151518]"
            />
            <DialogHeader className="min-w-0 gap-1 text-left">
              <DialogTitle className="truncate text-2xl font-semibold tracking-normal text-white">
                {character.name}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-300">
                {occupation && (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles size={13} aria-hidden="true" />
                    {occupation}
                  </span>
                )}
                {location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={13} aria-hidden="true" />
                    {location}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="grid gap-5 px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ProfileFact label={ageLabel} value={String(character.age)} />
            <ProfileFact
              label={relationshipLabel}
              value={character.relationship}
            />
          </div>

          {character.intro && (
            <ProfileSection title={aboutLabel}>
              <p className="text-sm leading-relaxed text-zinc-200">
                {character.intro}
              </p>
            </ProfileSection>
          )}

          {character.personality.length > 0 && (
            <ProfileSection title={personalityLabel}>
              <ProfileChipRow items={character.personality} />
            </ProfileSection>
          )}

          {character.tags.length > 0 && (
            <ProfileSection title={tagsLabel}>
              <ProfileChipRow items={character.tags} bright />
            </ProfileSection>
          )}

          {character.opening && (
            <ProfileSection title={openingLabel}>
              <p className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-zinc-200">
                {character.opening}
              </p>
            </ProfileSection>
          )}

          <p className="sr-only">{titleLabel}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-zinc-100">{value}</p>
    </div>
  );
}

function ProfileSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ProfileChipRow({
  items,
  bright,
}: {
  items: string[];
  bright?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs',
            bright
              ? 'border-white/15 bg-white/10 text-zinc-100'
              : 'border-white/10 bg-white/[0.04] text-zinc-300'
          )}
        >
          {bright && <Heart size={11} aria-hidden="true" />}
          {item}
        </span>
      ))}
    </div>
  );
}

function MessageImage({ url }: { url: string }) {
  return (
    <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <Image
        src={url}
        alt="chat image"
        width={720}
        height={960}
        sizes="(min-width: 768px) 420px, 70vw"
        unoptimized={process.env.NODE_ENV !== 'production'}
        className="h-auto w-full object-cover"
      />
    </div>
  );
}
function MessageRow({
  message,
  avatar,
  name,
  regenerating,
  onRegenerate,
  onPlayVoice,
  regenerateLabel,
  regenerateTitle,
  playVoiceTitle,
  pauseVoiceTitle,
  voiceLoading,
  voicePlaying,
}: {
  message: ChatMessage;
  avatar: string;
  name: string;
  regenerating?: boolean;
  onRegenerate?: () => void;
  onPlayVoice?: () => void;
  regenerateLabel: string;
  regenerateTitle: string;
  playVoiceTitle: string;
  pauseVoiceTitle: string;
  voiceLoading?: boolean;
  voicePlaying?: boolean;
}) {
  const isUser = message.role === 'user';
  const segments = isUser ? null : parseMessage(message.text);
  return (
    <div
      className={cn(
        'flex w-full items-end gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <CharacterAvatar src={avatar} name={name} size={32} className="mb-1" />
      )}
      <div
        className={cn(
          'flex max-w-[78%] flex-col gap-0.5',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-br-md bg-white text-black'
              : 'rounded-bl-md bg-white/8 text-zinc-100'
          )}
        >
          {segments
            ? segments.map((seg, idx) =>
                seg.type === 'action' ? (
                  <em
                    key={idx}
                    className="font-normal not-italic text-zinc-400 [font-style:italic]"
                  >
                    {seg.text}
                  </em>
                ) : seg.type === 'emphasis' ? (
                  <strong key={idx} className="font-semibold text-white">
                    {seg.text}
                  </strong>
                ) : (
                  <span key={idx}>{seg.text}</span>
                )
              )
            : message.text}
          {message.mediaType === 'image' && message.mediaUrl ? (
            <MessageImage url={message.mediaUrl} />
          ) : null}
        </div>
        {isUser && message.delivery ? (
          <DeliveryTick state={message.delivery} />
        ) : null}
        {!isUser ? (
          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPlayVoice}
              disabled={voiceLoading || message.mediaType === 'image'}
              title={voicePlaying ? pauseVoiceTitle : playVoiceTitle}
              aria-label={voicePlaying ? pauseVoiceTitle : playVoiceTitle}
              className="grid h-7 w-7 place-items-center rounded-full border border-white/10 text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-60"
            >
              {voiceLoading ? (
                <Loader2 size={12} aria-hidden="true" className="animate-spin" />
              ) : voicePlaying ? (
                <Pause size={12} aria-hidden="true" />
              ) : (
                <Volume2 size={12} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating || message.mediaType === 'image'}
              title={regenerateTitle}
              aria-label={regenerateTitle}
              className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 px-2 text-[11px] text-zinc-400 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-zinc-100 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw
                size={12}
                aria-hidden="true"
                className={cn(regenerating && 'animate-spin')}
              />
              {regenerateLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * WhatsApp-style delivery indicator on user bubbles.
 *
 * pending → single ✓ at low opacity. The chat API hasn't acked yet, so we
 * don't know whether the message landed.
 *
 * sent → ✓✓ in zinc. The server confirmed via a successful reply (the
 * route persists the user message before generating, see
 * `/api/roleplay/chat/route.ts` createRoleplayMessage("user")).
 *
 * error → single ✓ in red. Hover/tap shows a tooltip-via-title.
 */
function DeliveryTick({ state }: { state: 'pending' | 'sent' | 'error' }) {
  if (state === 'sent') {
    return (
      <CheckCheck
        size={14}
        aria-label="delivered"
        className="text-zinc-400"
      />
    );
  }
  if (state === 'error') {
    return (
      <Check
        size={14}
        aria-label="failed"
        className="text-rose-400"
      />
    );
  }
  return (
    <Check
      size={14}
      aria-label="sending"
      className="text-zinc-500 opacity-70"
    />
  );
}

function TypingIndicator({ avatar, name }: { avatar: string; name: string }) {
  const t = useTranslations('roleplay.chat_page');
  return (
    <div className="flex items-end gap-2" aria-live="polite">
      <CharacterAvatar src={avatar} name={name} size={32} className="mb-1" />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white/8 px-4 py-3 text-zinc-400">
        <span className="sr-only">{t('thinking', { name })}</span>
        <Dot delay={0} />
        <Dot delay={150} />
        <Dot delay={300} />
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-300"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden="true"
    />
  );
}

function EmptyState({ name }: { name: string }) {
  const t = useTranslations('roleplay.chat_page');
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-6 text-center">
      <p className="text-base font-medium">{t('empty_title', { name })}</p>
      <p className="mt-1 text-sm text-zinc-400">{t('empty_hint')}</p>
    </div>
  );
}

function CharacterAvatar({
  src,
  name,
  size,
  className,
}: {
  src: string;
  name: string;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-zinc-300',
          className
        )}
        style={{ width: size, height: size }}
        aria-label={name}
      >
        {failed ? (
          <ImageOff size={size / 2} aria-hidden="true" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      sizes={`${size}px`}
      // Same dev-only optimizer bypass as PhotoCarousel: a local fake-IP DNS
      // pool (Clash/Surge) can rewrite the R2 hostname to 198.18.x.y and Next
      // 16's image optimizer rejects upstreams resolving to private IPs.
      // Letting the browser fetch the original URL avoids the round-trip.
      unoptimized={process.env.NODE_ENV !== 'production'}
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}

function ChatSkeleton() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#0d0d10] text-white">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-[#0d0d10]/85 px-4 py-3 md:px-6">
        <Skeleton className="h-9 w-9 rounded-full bg-white/5" />
        <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-32 bg-white/5" />
          <Skeleton className="h-3 w-24 bg-white/5" />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-4 py-5 md:px-6">
        <Skeleton className="h-10 w-3/4 rounded-2xl bg-white/5" />
        <Skeleton className="h-10 w-1/2 self-end rounded-2xl bg-white/5" />
        <Skeleton className="h-10 w-2/3 rounded-2xl bg-white/5" />
      </div>
    </main>
  );
}
