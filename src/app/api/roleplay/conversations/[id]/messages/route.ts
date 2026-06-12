import { respData, respErr } from '@/shared/lib/resp';
import {
  findRoleplayConversationById,
  getRoleplayMessages,
  isMissingRoleplayTable,
  safeJsonParse,
} from '@/shared/models/roleplay';
import { getOptionalUserInfo } from '@/shared/models/user';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getOptionalUserInfo();
    if (!user) {
      return respData({ authenticated: false, messages: [] });
    }

    const { id } = await params;
    const conversation = await findRoleplayConversationById(id);
    if (!conversation || conversation.userId !== user.id) {
      return respErr('conversation not found');
    }

    const messages = await getRoleplayMessages({
      conversationId: id,
      limit: 100,
      latest: true,
    });

    return respData({
      authenticated: true,
      messages: messages.map((message) => ({
        ...message,
        metadata: safeJsonParse(message.metadata, {}),
      })),
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: true,
        messages: [],
        migrationRequired: true,
      });
    }
    console.log('get roleplay messages failed:', e);
    return respErr(e.message || 'get roleplay messages failed');
  }
}
