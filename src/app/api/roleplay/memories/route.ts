import { respData, respErr } from '@/shared/lib/resp';
import {
  createRoleplayMemory,
  getRoleplayMemories,
  isMissingRoleplayTable,
  RoleplayVisibility,
  safeJsonParse,
  serializeJson,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ authenticated: false, memories: [] });
    }

    const { searchParams } = new URL(request.url);
    const memories = await getRoleplayMemories({
      userId: user.id,
      characterId: searchParams.get('characterId'),
      conversationId: searchParams.get('conversationId'),
    });

    return respData({
      authenticated: true,
      memories: memories.map((memory: any) => ({
        ...memory,
        metadata: safeJsonParse(memory.metadata, {}),
      })),
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: true,
        memories: [],
        migrationRequired: true,
      });
    }
    console.log('get roleplay memories failed:', e);
    return respErr(e.message || 'get roleplay memories failed');
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { characterId, conversationId, summary, visibility } =
      await request.json();
    if (!summary?.trim()) {
      return respErr('memory summary is required');
    }

    const memory = await createRoleplayMemory({
      userId: user.id,
      characterId,
      conversationId,
      summary,
      visibility:
        visibility === RoleplayVisibility.PUBLIC
          ? RoleplayVisibility.PUBLIC
          : RoleplayVisibility.PRIVATE,
      metadata: serializeJson({ source: 'talkie-mvp' }),
    });

    return respData({ memory });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('create roleplay memory failed:', e);
    return respErr(e.message || 'create roleplay memory failed');
  }
}
