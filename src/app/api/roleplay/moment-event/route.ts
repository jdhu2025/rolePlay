import { respData, respErr } from '@/shared/lib/resp';
import { FIRST_EXPERIENCE_EVENT_TYPES } from '@/shared/lib/roleplay-first-experience';
import {
  createRoleplayQualityEvent,
  findRoleplayCharacterById,
  findRoleplayConversationById,
  isMissingRoleplayTable,
  serializeJson,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

const ALLOWED_EVENT_TYPES = new Set([
  'first_impression_selected',
  'continuation_hint_shown',
  'wrap_up_clicked',
  'local_fallback_shown',
  'keepsake_voice_clicked',
  ...FIRST_EXPERIENCE_EVENT_TYPES,
]);

function compactString(value: unknown, maxLength = 240) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeMetadata(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const input = raw as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input).slice(0, 24)) {
    if (!/^[a-zA-Z0-9_.-]{1,48}$/.test(key)) continue;
    if (typeof value === 'string') {
      output[key] = value.slice(0, 500);
    } else if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      output[key] = value;
    } else if (Array.isArray(value)) {
      output[key] = value.slice(0, 12).map((item) => compactString(item, 160));
    }
  }

  return output;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => ({}));
    const eventType = compactString(payload.eventType, 80);
    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return respErr('unsupported roleplay moment event');
    }

    const user = await getUserInfo().catch(() => null);
    const requestedCharacterId = compactString(payload.characterId, 120);
    const requestedConversationId = compactString(payload.conversationId, 120);
    const metadata = normalizeMetadata(payload.metadata);
    let characterId: string | undefined;
    let conversationId: string | undefined;

    if (requestedCharacterId) {
      const character = await findRoleplayCharacterById(requestedCharacterId)
        .catch(() => null);
      if (character) characterId = character.id;
    }

    if (requestedConversationId) {
      const conversation = await findRoleplayConversationById(
        requestedConversationId
      ).catch(() => null);
      if (
        conversation &&
        (!user || !conversation.userId || conversation.userId === user.id)
      ) {
        conversationId = conversation.id;
        if (!characterId) {
          const snapshot = conversation.characterSnapshot;
          if (snapshot && typeof snapshot === 'object') {
            const snapshotId = compactString(
              (snapshot as Record<string, unknown>).id,
              120
            );
            const character = snapshotId
              ? await findRoleplayCharacterById(snapshotId).catch(() => null)
              : null;
            if (character) characterId = character.id;
          }
        }
      }
    }

    const rawValue = Number(payload.value);
    const value =
      Number.isFinite(rawValue) && rawValue > 0
        ? Math.min(Math.round(rawValue), 1_000_000)
        : 1;

    await createRoleplayQualityEvent({
      userId: user?.id,
      characterId,
      conversationId,
      eventType,
      value,
      metadata: serializeJson({
        characterKey: requestedCharacterId || undefined,
        conversationKey: requestedConversationId || undefined,
        ...metadata,
        source: 'client_moment',
      }),
    });

    return respData({ recorded: true });
  } catch (error) {
    if (isMissingRoleplayTable(error)) {
      return respData({ recorded: false, reason: 'missing_table' });
    }
    console.log('record roleplay moment event failed:', error);
    return respErr('record roleplay moment event failed');
  }
}
