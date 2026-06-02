import {
  getMissingTextProviderMessage,
  resolveTextProviderConfig,
} from '@/shared/lib/ai-provider';
import { extractAndStoreRoleplayFacts } from '@/shared/lib/roleplay-memory-extraction';
import { respData, respErr } from '@/shared/lib/resp';
import { getRoleplayAIConfigs } from '@/shared/lib/server/roleplay-ai-config';
import { getUserInfo } from '@/shared/models/user';

const DEFAULT_MODEL = 'openai/gpt-4o-mini';

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) return respErr('no auth, please sign in');

    const {
      characterId,
      conversationId,
      characterName,
      userText,
      characterText,
      history = [],
      model,
    }: {
      characterId?: string | null;
      conversationId?: string | null;
      characterName?: string;
      userText?: string;
      characterText?: string;
      history?: { role: 'user' | 'character'; text: string }[];
      model?: string;
    } = await request.json();

    if (!characterName?.trim() || !userText?.trim() || !characterText?.trim()) {
      return respErr('invalid roleplay memory extraction params');
    }

    const configs = await getRoleplayAIConfigs();
    const textProvider = resolveTextProviderConfig(configs as any, {
      requestModel: model,
      defaultModel: DEFAULT_MODEL,
    });
    if (!textProvider.apiKey) {
      throw new Error(getMissingTextProviderMessage());
    }

    const facts = await extractAndStoreRoleplayFacts({
      userId: user.id,
      characterId,
      conversationId,
      characterName,
      userText,
      characterText,
      history,
      textProvider,
    });

    return respData({ facts, count: facts.length });
  } catch (e: any) {
    console.log('extract roleplay memory failed:', e);
    return respErr(e.message || 'extract roleplay memory failed');
  }
}
