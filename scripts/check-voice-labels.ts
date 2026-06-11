import assert from 'node:assert/strict';

import { resolveRoleplayTTSVoiceProfiles } from '../src/shared/lib/ai-provider';

const unsafeLabelPattern = /\b(MiniMax|Mature|Playful|legacy)\b/i;

const configuredProfiles = [
  {
    id: 'soft-warm',
    label: 'MiniMax Female - Soft Warm',
    provider: 'minimax',
    voiceType: 'English_SereneWoman',
    enabled: true,
  },
  {
    id: 'mature-smooth',
    label: 'MiniMax Female - Mature Smooth',
    provider: 'minimax',
    voiceType: 'English_ConfidentWoman',
    enabled: true,
  },
  {
    id: 'playful-friendly',
    label: 'MiniMax Male - Playful Friendly',
    provider: 'minimax',
    voiceType: 'English_Jovialman',
    enabled: true,
  },
  {
    id: 'neutral-balanced',
    label: 'MiniMax Neutral - Soft Balanced',
    provider: 'minimax',
    voiceType: 'English_FriendlyPerson',
    enabled: true,
  },
];

const configured = resolveRoleplayTTSVoiceProfiles({
  __disable_env_fallback: 'true',
  roleplay_tts_voice_profiles: JSON.stringify(configuredProfiles),
});

for (const profile of configured.filter((item) =>
  configuredProfiles.some((configuredProfile) => configuredProfile.id === item.id)
)) {
  assert.doesNotMatch(profile.label, unsafeLabelPattern, profile.label);
  assert.match(profile.label, /Voice$/i, profile.label);
}

assert.equal(
  configured.find((profile) => profile.id === 'soft-warm')?.label,
  'Female Warm Voice'
);
assert.equal(
  configured.find((profile) => profile.id === 'mature-smooth')?.label,
  'Female Smooth Voice'
);
assert.equal(
  configured.find((profile) => profile.id === 'playful-friendly')?.label,
  'Male Friendly Voice'
);
assert.equal(
  configured.find((profile) => profile.id === 'neutral-balanced')?.label,
  'Neutral Balanced Voice'
);

const fallback = resolveRoleplayTTSVoiceProfiles({
  __disable_env_fallback: 'true',
});

for (const profile of fallback) {
  assert.doesNotMatch(profile.label, unsafeLabelPattern, profile.label);
  assert.match(profile.label, /Voice$/i, profile.label);
}

console.log('Voice profile labels are Creem-safe');
