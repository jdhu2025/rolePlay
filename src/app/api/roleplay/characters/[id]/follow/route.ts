import { respData, respErr } from '@/shared/lib/resp';
import {
  followRoleplayCharacter,
  getRoleplayCharacterSocialState,
  isMissingRoleplayTable,
  unfollowRoleplayCharacter,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserInfo();
    const social = await getRoleplayCharacterSocialState({
      userId: user?.id,
      characterId: id,
    });

    return respData({ authenticated: Boolean(user), social });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: false,
        social: { followCount: 0, commentCount: 0, viewerFollowed: false },
        migrationRequired: true,
      });
    }
    console.log('get roleplay follow state failed:', e);
    return respErr(e.message || 'get roleplay follow state failed');
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    await followRoleplayCharacter({ userId: user.id, characterId: id });
    const social = await getRoleplayCharacterSocialState({
      userId: user.id,
      characterId: id,
    });

    return respData({ social });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('follow roleplay character failed:', e);
    return respErr(e.message || 'follow roleplay character failed');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    await unfollowRoleplayCharacter({ userId: user.id, characterId: id });
    const social = await getRoleplayCharacterSocialState({
      userId: user.id,
      characterId: id,
    });

    return respData({ social });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('unfollow roleplay character failed:', e);
    return respErr(e.message || 'unfollow roleplay character failed');
  }
}
