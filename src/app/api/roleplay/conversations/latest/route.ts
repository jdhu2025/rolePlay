import { respData, respErr } from '@/shared/lib/resp';
import {
  findLatestRoleplayConversationForCharacter,
  getRoleplayMessages,
  isMissingRoleplayTable,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function readPositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({
        authenticated: false,
        conversation: null,
        messages: [],
      });
    }

    const url = new URL(request.url);
    const characterId = (url.searchParams.get('characterId') || '').trim();
    if (!characterId) {
      return respErr('missing characterId');
    }

    const messagesLimit = readPositiveInt(
      url.searchParams.get('messagesLimit'),
      60,
      100
    );
    const scanLimit = readPositiveInt(
      url.searchParams.get('scanLimit'),
      40,
      80
    );
    const conversation = await findLatestRoleplayConversationForCharacter({
      userId: user.id,
      characterId,
      scanLimit,
    });
    if (!conversation) {
      return respData({
        authenticated: true,
        conversation: null,
        messages: [],
      });
    }

    const messages = await getRoleplayMessages({
      conversationId: conversation.id,
      limit: messagesLimit,
      latest: true,
    });

    return respData({
      authenticated: true,
      conversation: {
        ...conversation,
        characterSnapshot: safeJsonParse(conversation.characterSnapshot, {}),
        metadata: safeJsonParse(conversation.metadata, {}),
      },
      messages: messages.map((message) => ({
        ...message,
        metadata: safeJsonParse(message.metadata, {}),
      })),
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: true,
        conversation: null,
        messages: [],
        migrationRequired: true,
      });
    }
    console.log('get latest roleplay conversation failed:', e);
    return respErr(e.message || 'get latest roleplay conversation failed');
  }
}
