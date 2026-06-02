export type StoredRoleplayChatMessage = {
  id?: string;
  role?: string;
  text?: string;
  mediaType?: 'image';
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
};

export type StoredRoleplayChatState = {
  selectedId?: string;
  messages?: StoredRoleplayChatMessage[];
  messagesByCharacter?: Record<string, StoredRoleplayChatMessage[]>;
  conversationIds?: Record<string, string>;
};

const ROLEPLAY_CHAT_STORAGE_KEY = 'roleplay.chat.v1';

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function readLocalRoleplayChatState(): StoredRoleplayChatState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(ROLEPLAY_CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? (parsed as StoredRoleplayChatState)
      : null;
  } catch {
    return null;
  }
}

export function readLocalRoleplayMessages(characterId: string) {
  const state = readLocalRoleplayChatState();
  if (!state) return [];

  const byCharacter = state.messagesByCharacter?.[characterId];
  if (Array.isArray(byCharacter)) return byCharacter;

  if (state.selectedId === characterId && Array.isArray(state.messages)) {
    return state.messages;
  }

  return [];
}

export function readLocalRoleplayConversationId(characterId: string) {
  const state = readLocalRoleplayChatState();
  const id = state?.conversationIds?.[characterId];
  return typeof id === 'string' ? id : '';
}

export function writeLocalRoleplayChatState({
  characterId,
  messages,
  conversationId,
}: {
  characterId: string;
  messages: StoredRoleplayChatMessage[];
  conversationId?: string;
}) {
  if (!canUseStorage()) return;

  const current = readLocalRoleplayChatState() ?? {};
  const messagesByCharacter = {
    ...(current.messagesByCharacter ?? {}),
    [characterId]: messages.slice(-200),
  };
  const conversationIds = {
    ...(current.conversationIds ?? {}),
  };
  if (conversationId) conversationIds[characterId] = conversationId;

  window.localStorage.setItem(
    ROLEPLAY_CHAT_STORAGE_KEY,
    JSON.stringify({
      ...current,
      selectedId: characterId,
      messages: messagesByCharacter[characterId],
      messagesByCharacter,
      conversationIds,
    } satisfies StoredRoleplayChatState)
  );
}
