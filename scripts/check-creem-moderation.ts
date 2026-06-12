import assert from 'node:assert/strict';

import {
  moderatePromptForCreem,
  shouldFailOpenCreemModeration,
  shouldModerateAIGeneration,
} from '../src/shared/lib/creem-moderation';

async function run() {
  assert.equal(
    shouldModerateAIGeneration({ mediaType: 'image', scene: 'text-to-image' }),
    true
  );
  assert.equal(
    shouldModerateAIGeneration({ mediaType: 'video', scene: 'text-to-video' }),
    true
  );
  assert.equal(
    shouldModerateAIGeneration({ mediaType: 'music', scene: 'text-to-music' }),
    false
  );

  const deny = await moderatePromptForCreem({
    prompt: 'unsafe prompt',
    configs: { creem_api_key: 'creem_test_key' },
    externalId: 'test_deny',
    fetcher: async () =>
      new Response(
        JSON.stringify({
          id: 'mod_deny',
          object: 'moderation_result',
          decision: 'deny',
        }),
        { status: 200 }
      ),
  });

  assert.equal(deny.allowed, false);
  assert.equal(deny.reason, 'prompt_rejected');

  const flag = await moderatePromptForCreem({
    prompt: 'borderline prompt',
    configs: { creem_api_key: 'creem_test_key' },
    externalId: 'test_flag',
    fetcher: async () =>
      new Response(
        JSON.stringify({
          id: 'mod_flag',
          object: 'moderation_result',
          decision: 'flag',
        }),
        { status: 200 }
      ),
  });

  assert.equal(flag.allowed, false);
  assert.equal(flag.reason, 'prompt_rejected');

  const allow = await moderatePromptForCreem({
    prompt: 'a fully clothed character portrait in a cafe',
    configs: { creem_api_key: 'creem_test_key' },
    externalId: 'test_allow',
    fetcher: async () =>
      new Response(
        JSON.stringify({
          id: 'mod_allow',
          object: 'moderation_result',
          decision: 'allow',
        }),
        { status: 200 }
      ),
  });

  assert.equal(allow.allowed, true);

  const missingKey = await moderatePromptForCreem({
    prompt: 'safe prompt',
    configs: {},
    externalId: 'test_missing_key',
    fetcher: async () => {
      throw new Error('fetch should not be called without a key');
    },
  });

  assert.equal(missingKey.allowed, true);
  assert.equal(
    shouldFailOpenCreemModeration({
      configs: {},
      reason: missingKey.reason,
    }),
    true
  );
  assert.equal(missingKey.reason, 'moderation_unavailable');

  const networkFailure = await moderatePromptForCreem({
    prompt: 'safe prompt',
    configs: { creem_api_key: 'creem_test_key' },
    externalId: 'test_network_failure',
    fetcher: async () => {
      throw new Error('network down');
    },
  });

  assert.equal(networkFailure.allowed, true);
  assert.equal(networkFailure.reason, 'moderation_unavailable');

  const failClosedNetworkFailure = await moderatePromptForCreem({
    prompt: 'safe prompt',
    configs: {
      creem_api_key: 'creem_test_key',
      creem_moderation_fail_closed: 'true',
    },
    externalId: 'test_network_failure_closed',
    fetcher: async () => {
      throw new Error('network down');
    },
  });

  assert.equal(failClosedNetworkFailure.allowed, false);
  assert.equal(failClosedNetworkFailure.reason, 'moderation_unavailable');

  console.log('Creem moderation rules OK');
}

run();
