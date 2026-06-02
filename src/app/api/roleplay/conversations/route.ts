import { respData, respErr } from '@/shared/lib/resp';
import {
  getRoleplayConversations,
  isMissingRoleplayTable,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ authenticated: false, conversations: [] });
    }

    const conversations = await getRoleplayConversations({ userId: user.id });
    return respData({
      authenticated: true,
      conversations: conversations.map((conversation) => ({
        ...conversation,
        characterSnapshot: safeJsonParse(conversation.characterSnapshot, {}),
        metadata: safeJsonParse(conversation.metadata, {}),
      })),
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: true,
        conversations: [],
        migrationRequired: true,
      });
    }
    console.log('get roleplay conversations failed:', e);
    return respErr(e.message || 'get roleplay conversations failed');
  }
}
