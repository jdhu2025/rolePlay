import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const source = readFileSync('src/shared/contexts/app.tsx', 'utf8');

assert.match(
  source,
  /useEffect\(\(\)\s*=>\s*\{\s*fetchConfigs\(\);\s*\},\s*\[fetchConfigs\]\);/,
  'AppContextProvider should fetch public configs when it mounts'
);

assert.match(
  source,
  /useEffect\(\(\)\s*=>\s*\{\s*fetchUserInfo\(\);\s*\},\s*\[fetchUserInfo\]\);/,
  'AppContextProvider should sync signed-in user info when it mounts'
);
