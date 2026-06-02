import { resolveRoleplayTTSVoiceProfiles } from '@/shared/lib/ai-provider';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';

export async function GET() {
  try {
    const configs = await getAllConfigs();
    const profiles = resolveRoleplayTTSVoiceProfiles(configs);

    return respData({
      profiles,
      defaultProfileId: configs.roleplay_tts_default_voice_profile_id || '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return respErr(message || 'failed to load roleplay TTS voice profiles');
  }
}
