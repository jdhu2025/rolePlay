import { respData, respErr } from '@/shared/lib/resp';
import {
  createRoleplayCharacterComment,
  getRoleplayCharacterSocialState,
  isMissingRoleplayTable,
} from '@/shared/models/roleplay';
import { getUserInfo } from '@/shared/models/user';

/**
 * Comments are stored flat with an optional `parent_id` self-reference; the
 * tree is reconstructed here so the client can render Talkie-style "View N
 * Replies" without a second round-trip. Each root carries the first 10
 * replies inline, ordered oldest-first (i.e. opposite of the root order)
 * so a thread reads top-to-bottom like a conversation.
 *
 * `commentCount` covers all alive comments (roots + replies), matching
 * what's shown on the character card before the user enters the chat.
 */
type RawComment = {
  id: string;
  parentId?: string | null;
  body: string;
  authorName: string;
  userId: string;
  createdAt?: string | Date;
  likeCount?: number;
};

type ThreadedComment = RawComment & {
  replies: RawComment[];
  replyCount: number;
};

const REPLY_PREVIEW = 10;

function threadComments(rows: RawComment[]): ThreadedComment[] {
  const roots: ThreadedComment[] = [];
  const repliesByParent = new Map<string, RawComment[]>();

  for (const row of rows) {
    const parentId = (row as any).parentId ?? null;
    if (!parentId) {
      roots.push({ ...row, replies: [], replyCount: 0 });
    } else {
      const arr = repliesByParent.get(parentId) ?? [];
      arr.push(row);
      repliesByParent.set(parentId, arr);
    }
  }

  for (const root of roots) {
    const all = repliesByParent.get(root.id) ?? [];
    // Comments come back desc by createdAt; flip replies to ascending so
    // a thread reads chronologically once expanded.
    const ordered = [...all].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return ta - tb;
    });
    root.replies = ordered.slice(0, REPLY_PREVIEW);
    root.replyCount = ordered.length;
  }

  return roots;
}

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

    return respData({
      authenticated: Boolean(user),
      comments: threadComments(social.comments as RawComment[]),
      commentCount: social.commentCount,
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respData({
        authenticated: false,
        comments: [],
        commentCount: 0,
        migrationRequired: true,
      });
    }
    console.log('get roleplay comments failed:', e);
    return respErr(e.message || 'get roleplay comments failed');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const { body, parentId } = await request.json();
    const trimmed = String(body || '').trim();
    if (!trimmed) return respErr('comment body is required');

    const comment = await createRoleplayCharacterComment({
      userId: user.id,
      characterId: id,
      body: trimmed.slice(0, 800),
      authorName: user.name || user.email || 'user',
      parentId: typeof parentId === 'string' && parentId ? parentId : null,
    });

    const social = await getRoleplayCharacterSocialState({
      userId: user.id,
      characterId: id,
    });

    return respData({
      comment,
      social: {
        ...social,
        comments: threadComments(social.comments as RawComment[]),
      },
    });
  } catch (e: any) {
    if (isMissingRoleplayTable(e)) {
      return respErr('roleplay database tables are not migrated yet');
    }
    console.log('create roleplay comment failed:', e);
    return respErr(e.message || 'create roleplay comment failed');
  }
}
