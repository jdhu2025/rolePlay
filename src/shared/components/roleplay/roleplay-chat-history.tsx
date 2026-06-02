'use client';

import Image from 'next/image';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { Link } from '@/core/i18n/navigation';
import {
  readLocalRoleplayConversationId,
  readLocalRoleplayMessages,
  type StoredRoleplayChatMessage,
} from '@/shared/lib/roleplay-chat-storage';
import {
  fetchRoleplayCharacter,
  type RoleplayCharacterClient,
} from '@/shared/lib/roleplay-client';
import { cn } from '@/shared/lib/utils';

type ApiEnvelope<T> = {
  code?: number;
  data?: T;
};

type StoredConversation = {
  id?: string;
  characterId?: string | null;
  characterSnapshot?: {
    id?: string;
  } | null;
};

type HistoryMessage = {
  id: string;
  role: 'user' | 'character';
  text: string;
  createdAt?: string | Date | null;
};

type TimelineItem =
  | {
      type: 'stamp';
      id: string;
      label: string;
    }
  | {
      type: 'message';
      message: HistoryMessage;
    };

function normalizeHistoryMessages(messages: StoredRoleplayChatMessage[]) {
  return messages
    .filter((message) => message && typeof message === 'object')
    .map((message, idx): HistoryMessage => ({
      id: message.id ?? `local-${idx}`,
      role: message.role === 'user' ? 'user' : 'character',
      text: typeof message.text === 'string' ? message.text : '',
    }))
    .filter((message) => message.text);
}

function formatStamp(value: Date | string | null | undefined, locale: string) {
  if (!value) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildTimeline(messages: HistoryMessage[], locale: string) {
  const items: TimelineItem[] = [];
  messages.forEach((message, index) => {
    const previous = messages[index - 1];
    const messageTime = message.createdAt
      ? new Date(message.createdAt).getTime()
      : 0;
    const previousTime = previous?.createdAt
      ? new Date(previous.createdAt).getTime()
      : 0;
    const shouldShowStamp =
      Boolean(message.createdAt) &&
      (!previous?.createdAt || messageTime - previousTime > 1000 * 60 * 8);

    if (shouldShowStamp) {
      items.push({
        type: 'stamp',
        id: `${message.id}-stamp`,
        label: formatStamp(message.createdAt, locale),
      });
    }

    items.push({ type: 'message', message });
  });

  return items;
}

async function fetchRemoteHistory(characterId: string) {
  const conversationsRes = await fetch('/api/roleplay/conversations', {
    credentials: 'include',
    cache: 'no-store',
  });
  if (!conversationsRes.ok) return { authenticated: false, messages: [] };

  const conversationsPayload =
    (await conversationsRes.json()) as ApiEnvelope<{
      authenticated?: boolean;
      conversations?: StoredConversation[];
    }>;
  const authenticated = Boolean(conversationsPayload.data?.authenticated);
  const conversations = conversationsPayload.data?.conversations ?? [];
  const matched = conversations.filter(
    (conversation) =>
      conversation.characterId === characterId ||
      conversation.characterSnapshot?.id === characterId
  );
  const matchedIds = new Set(
    matched
      .map((conversation) => conversation.id)
      .filter((id): id is string => Boolean(id))
  );

  const groups = await Promise.all(
    matched.map(async (conversation) => {
      if (!conversation.id) return [];
      const messagesRes = await fetch(
        `/api/roleplay/conversations/${encodeURIComponent(conversation.id)}/messages`,
        { credentials: 'include', cache: 'no-store' }
      );
      if (!messagesRes.ok) return [];
      const messagesPayload = (await messagesRes.json()) as ApiEnvelope<{
        messages?: Array<
          StoredRoleplayChatMessage & { createdAt?: string | Date | null }
        >;
      }>;
      return (messagesPayload.data?.messages ?? []).map(
        (message, idx): HistoryMessage => ({
          id: message.id ?? `${conversation.id}-${idx}`,
          role: message.role === 'user' ? 'user' : 'character',
          text: typeof message.text === 'string' ? message.text : '',
          createdAt: message.createdAt,
        })
      );
    })
  );

  return {
    authenticated,
    matchedConversationIds: matchedIds,
    messages: groups
      .flat()
      .filter((message) => message.text)
      .sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return at - bt;
      }),
  };
}

export function RoleplayChatHistory({
  characterId,
  locale,
}: {
  characterId: string;
  locale: string;
}) {
  const t = useTranslations('roleplay.chat_page');
  const [character, setCharacter] = useState<RoleplayCharacterClient | null>(
    null
  );
  const [messages, setMessages] = useState<HistoryMessage[]>([]);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [characterRes, historyRes] = await Promise.all([
        fetchRoleplayCharacter(characterId),
        fetchRemoteHistory(characterId).catch(() => ({
          authenticated: false,
      messages: [],
      matchedConversationIds: new Set<string>(),
    })),
  ]);
      if (cancelled) return;

      setCharacter(characterRes.character);
      setAuthenticated(historyRes.authenticated);

      const localConversationId = readLocalRoleplayConversationId(characterId);
      const localMessages = normalizeHistoryMessages(
        readLocalRoleplayMessages(characterId)
      );
      const matchedConversationIds =
        historyRes.matchedConversationIds ?? new Set<string>();
      const localIsSameConversation =
        localConversationId && matchedConversationIds.has(localConversationId);

      if (historyRes.messages.length) {
        setMessages(
          localIsSameConversation && localMessages.length > historyRes.messages.length
            ? localMessages
            : historyRes.messages
        );
        return;
      }

      setMessages(
        historyRes.authenticated
          ? localIsSameConversation
            ? localMessages
            : []
          : localMessages
      );
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [characterId]);

  const characterName = character?.name || t('conversation');
  const avatar = character?.avatar ?? '';
  const timeline = useMemo(
    () => buildTimeline(messages, locale),
    [messages, locale]
  );

  return (
    <main className="flex min-h-dvh flex-col bg-[#0d0d10] text-white">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0d0d10]/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <Link
            href={`/chat/profile/${characterId}`}
            aria-label={t('back')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-white/8 hover:text-white"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <HistoryAvatar src={avatar} name={characterName} size={40} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{t('history')}</h1>
            <p className="truncate text-xs text-zinc-500">
              {characterName}
              {messages.length > 0
                ? ` · ${t('messages_count', { count: messages.length })}`
                : ''}
            </p>
          </div>
          <Link
            href={`/chat/profile/${characterId}`}
            aria-label={t('continue_chat')}
            title={t('continue_chat')}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-black transition-opacity hover:opacity-90"
          >
            <MessageCircle size={17} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-20">
          {timeline.length === 0 ? (
            <EmptyHistory
              message={
                authenticated === false
                  ? t('history_sign_in')
                  : t('history_empty')
              }
            />
          ) : (
            timeline.map((item) =>
              item.type === 'stamp' ? (
                <div
                  key={item.id}
                  className="self-center rounded-full bg-white/8 px-3 py-1 text-[11px] text-zinc-500"
                >
                  {item.label}
                </div>
              ) : (
                <HistoryBubble
                  key={item.message.id}
                  message={item.message}
                  avatar={avatar}
                  name={characterName}
                />
              )
            )
          )}
        </div>
      </section>

      <footer className="sticky bottom-0 z-20 border-t border-white/5 bg-[#0d0d10]/90 px-4 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex w-full max-w-3xl justify-end">
          <Link
            href={`/chat/profile/${characterId}`}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t('continue_chat')}
          </Link>
        </div>
      </footer>
    </main>
  );
}

function HistoryBubble({
  message,
  avatar,
  name,
}: {
  message: HistoryMessage;
  avatar: string;
  name: string;
}) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex w-full items-end gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser ? (
        <HistoryAvatar src={avatar} name={name} size={32} className="mb-1" />
      ) : null}
      <div
        className={cn(
          'max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-br-md bg-white text-black'
            : 'rounded-bl-md bg-white/8 text-zinc-100'
        )}
      >
        {message.text}
      </div>
    </div>
  );
}

function HistoryAvatar({
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
  if (!src) {
    return (
      <div
        className={cn(
          'grid shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-zinc-300',
          className
        )}
        style={{ width: size, height: size }}
      >
        {name.slice(0, 1)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}

function EmptyHistory({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.035] px-5 py-8 text-center text-sm text-zinc-400">
      {message}
    </div>
  );
}
