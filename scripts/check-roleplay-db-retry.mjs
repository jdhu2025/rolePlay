import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(process.cwd(), 'src/shared/models/roleplay.ts'),
  'utf8'
);
const userSource = readFileSync(
  join(process.cwd(), 'src/shared/models/user.ts'),
  'utf8'
);
const dbResilienceSource = readFileSync(
  join(process.cwd(), 'src/shared/lib/db-resilience.ts'),
  'utf8'
);
const chatRouteSource = readFileSync(
  join(process.cwd(), 'src/app/api/roleplay/chat/route.ts'),
  'utf8'
);
const settingsSource = readFileSync(
  join(process.cwd(), 'src/shared/services/settings.ts'),
  'utf8'
);
const dbRetryConfigSource = readFileSync(
  join(process.cwd(), 'src/shared/lib/server/db-retry-config.ts'),
  'utf8'
);

function functionBody(fileSource, name) {
  const start = fileSource.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} should exist`);
  const next = fileSource.indexOf('\nexport ', start + 1);
  return fileSource.slice(start, next === -1 ? fileSource.length : next);
}

for (const name of [
  'findRoleplayCharacterById',
  'createRoleplayConversation',
  'updateRoleplayConversation',
  'upsertRoleplayConversationMemory',
  'createRoleplayMessage',
  'incrementCharacterCounter',
  'createRoleplayQualityEvent',
]) {
  assert.match(
    functionBody(source, name),
    /withTransientDatabaseRetry/,
    `${name} should retry transient database interruptions`
  );
}

assert.match(
  functionBody(userSource, 'findUserById'),
  /withTransientDatabaseRetry/,
  'findUserById should retry transient database interruptions'
);

assert.match(
  dbResilienceSource,
  /export function isMarkedTransientDatabaseError/,
  'db-resilience should expose a strict marker for user-visible database errors'
);
assert.match(
  dbResilienceSource,
  /export function getDatabaseRetryOptions/,
  'db-resilience should expose configurable retry options'
);
assert.match(
  dbRetryConfigSource,
  /getAllConfigs/,
  'db retry config should read admin settings'
);
for (const settingName of [
  'roleplay_db_timeout_ms',
  'roleplay_db_retries',
  'roleplay_db_retry_delay_ms',
]) {
  assert.match(
    settingsSource,
    new RegExp(`name:\\s*'${settingName}'`),
    `${settingName} should be configurable in admin settings`
  );
}
assert.match(
  dbResilienceSource,
  /DatabaseOperationTimeoutError/,
  'db timeouts should be typed for clearer transient error handling'
);
assert.doesNotMatch(
  source,
  /ROLEPLAY_DB_TIMEOUT_MS\s*=\s*6_000/,
  'roleplay model should not hard-code a 6000ms database timeout'
);
assert.match(
  chatRouteSource,
  /isMarkedTransientDatabaseError\(error\)/,
  'chat error copy should only show database interruption for marked DB errors'
);
assert.doesNotMatch(
  chatRouteSource,
  /isTransientDatabaseError\(error\)/,
  'chat error copy must not classify generic timeout/network errors as database interruptions'
);
assert.match(
  chatRouteSource,
  /Network connection was interrupted\. Please retry in a moment\./,
  'chat error copy should show network interruption for tunnel/provider timeouts'
);

console.log('Roleplay DB retry and chat error classification rules OK');
