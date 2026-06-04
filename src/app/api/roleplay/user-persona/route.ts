import { respData, respErr } from '@/shared/lib/resp';
import {
  normalizeUserPersona,
  parseUserPersona,
  serializeUserPersona,
} from '@/shared/lib/roleplay-user-persona';
import { findUserById, getUserInfo, updateUser } from '@/shared/models/user';

const FIRST_IMPRESSION_LABELS: Record<string, string> = {
  quiet: 'The user chose quiet, attentive companionship for the first meeting.',
  playful: 'The user chose playful teasing and lightness for the first meeting.',
  guarded:
    'The user chose someone a little hard to approach, with tension before warmth.',
};

function normalizeFirstImpression(raw: unknown) {
  const value = String(raw || '').trim();
  return FIRST_IMPRESSION_LABELS[value] || value.slice(0, 240);
}

export async function GET() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respData({ authenticated: false, persona: {} });
    }

    const dbUser = await findUserById(user.id);
    const persona = parseUserPersona((dbUser as any)?.persona);
    return respData({ authenticated: true, persona });
  } catch (error) {
    console.log('get roleplay user persona failed:', error);
    return respErr('get roleplay user persona failed');
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const payload = await req.json().catch(() => ({}));
    const dbUser = await findUserById(user.id);
    const current = parseUserPersona((dbUser as any)?.persona);
    const next = normalizeUserPersona({
      ...current,
      firstImpression: normalizeFirstImpression(payload.firstImpression),
    });

    await updateUser(user.id, {
      persona: serializeUserPersona(next),
    });

    return respData({ persona: next });
  } catch (error) {
    console.log('update roleplay user persona failed:', error);
    return respErr('update roleplay user persona failed');
  }
}
