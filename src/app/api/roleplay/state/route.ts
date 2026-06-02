import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/core/db';
import { chat } from '@/config/db/schema';
import { getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus } from '@/shared/models/chat';
import { getUserInfo } from '@/shared/models/user';

const ROLEPLAY_STATE_PROVIDER = 'roleplay-state';
const ROLEPLAY_STATE_MODEL = 'roleplay-mvp-state';
const ROLEPLAY_STATE_TITLE = 'RolePlay MVP State';

type RoleplayState = {
  created?: unknown[];
  messages?: unknown[];
  selectedId?: string;
  conversationIds?: Record<string, string>;
};

async function findRoleplayState(userId: string) {
  const [result] = await db()
    .select()
    .from(chat)
    .where(
      and(
        eq(chat.userId, userId),
        eq(chat.provider, ROLEPLAY_STATE_PROVIDER),
        eq(chat.model, ROLEPLAY_STATE_MODEL),
        eq(chat.status, ChatStatus.CREATED)
      )
    )
    .orderBy(desc(chat.updatedAt))
    .limit(1);

  return result;
}

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ authenticated: false, state: null });
    }

    const stateRecord = await findRoleplayState(user.id);
    if (!stateRecord?.content) {
      return respData({ authenticated: true, state: null });
    }

    return respData({
      authenticated: true,
      state: JSON.parse(stateRecord.content),
      updatedAt: stateRecord.updatedAt,
    });
  } catch (e: any) {
    console.log('get roleplay state failed:', e);
    return respErr(e.message || 'get roleplay state failed');
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ authenticated: false, saved: false });
    }

    const state = (await request.json()) as RoleplayState;
    const safeState: RoleplayState = {
      created: Array.isArray(state.created) ? state.created : [],
      messages: Array.isArray(state.messages) ? state.messages : [],
      selectedId: typeof state.selectedId === 'string' ? state.selectedId : '',
      conversationIds:
        state.conversationIds && typeof state.conversationIds === 'object'
          ? Object.fromEntries(
              Object.entries(state.conversationIds).filter(
                ([key, value]) => key && typeof value === 'string'
              )
            )
          : {},
    };

    const content = JSON.stringify(safeState);
    const current = await findRoleplayState(user.id);

    if (current) {
      const [updated] = await db()
        .update(chat)
        .set({
          content,
          parts: content,
          metadata: JSON.stringify({ source: 'talkie-mvp' }),
          updatedAt: new Date(),
        })
        .where(eq(chat.id, current.id))
        .returning();

      return respData({ authenticated: true, saved: true, state: updated });
    }

    const [created] = await db()
      .insert(chat)
      .values({
        id: getUuid(),
        userId: user.id,
        status: ChatStatus.CREATED,
        model: ROLEPLAY_STATE_MODEL,
        provider: ROLEPLAY_STATE_PROVIDER,
        title: ROLEPLAY_STATE_TITLE,
        parts: content,
        content,
        metadata: JSON.stringify({ source: 'talkie-mvp' }),
      })
      .returning();

    return respData({ authenticated: true, saved: true, state: created });
  } catch (e: any) {
    console.log('save roleplay state failed:', e);
    return respErr(e.message || 'save roleplay state failed');
  }
}
