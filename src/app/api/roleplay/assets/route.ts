import { respData, respErr } from '@/shared/lib/resp';
import {
  createRoleplayAsset,
  getRoleplayAssets,
  isMissingRoleplayTable,
  safeJsonParse,
  serializeJson,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

export async function GET(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ authenticated: false, assets: [] });
    }

    const { searchParams } = new URL(request.url);
    const assets = await getRoleplayAssets({
      userId: user.id,
      type: searchParams.get('type') || undefined,
      characterId: searchParams.get('characterId'),
      conversationId: searchParams.get('conversationId'),
    });

    return respData({
      authenticated: true,
      assets: assets.map((asset) => ({
        ...asset,
        metadata: safeJsonParse(asset.metadata, {}),
      })),
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: true,
        assets: [],
        migrationRequired: true,
      });
    }
    console.log('get roleplay assets failed:', e);
    return respErr(e.message || 'get roleplay assets failed');
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const {
      characterId,
      conversationId,
      messageId,
      type,
      url,
      storageKey,
      contentType,
      metadata,
    } = await request.json();

    if (!type || !url) {
      return respErr('asset type and url are required');
    }

    const asset = await createRoleplayAsset({
      userId: user.id,
      characterId,
      conversationId,
      messageId,
      type,
      url,
      storageKey: storageKey || '',
      contentType: contentType || '',
      status: 'created',
      metadata: serializeJson(metadata || { source: 'talkie-mvp' }),
    });

    return respData({ asset });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('create roleplay asset failed:', e);
    return respErr(e.message || 'create roleplay asset failed');
  }
}
