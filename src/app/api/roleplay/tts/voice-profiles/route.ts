import { resolveRoleplayTTSVoiceProfiles } from '@/shared/lib/ai-provider';
import {
  canShowSensitiveVoiceStyles,
  isComplianceSafeVoiceProfile,
} from '@/shared/lib/compliance';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';

export async function GET() {
  try {
    const configs = await getAllConfigs();
    const profiles = resolveRoleplayTTSVoiceProfiles(configs);
    const visibleProfiles = canShowSensitiveVoiceStyles(configs)
      ? profiles
      : profiles.filter(isComplianceSafeVoiceProfile);
    const defaultProfileId = visibleProfiles.some(
      (profile: any) =>
        profile?.id === configs.roleplay_tts_default_voice_profile_id
    )
      ? configs.roleplay_tts_default_voice_profile_id
      : visibleProfiles[0]?.id || '';

    return respData({
      profiles: visibleProfiles,
      defaultProfileId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return respErr(message || 'failed to load roleplay TTS voice profiles');
  }
}
