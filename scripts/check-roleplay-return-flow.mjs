import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const helper = read('src/shared/lib/roleplay-return.ts');
assert.match(helper, /ROLEPLAY_RETURN_STORAGE_KEY/);
assert.match(helper, /rememberRoleplayReturnPath/);
assert.match(helper, /withRoleplayCallbackUrl/);
assert.match(helper, /readRememberedRoleplayReturnPath/);

const chat = read('src/shared/components/roleplay/roleplay-chat.tsx');
assert.match(chat, /rememberRoleplayReturnPath\(\)/);
assert.match(chat, /withRoleplayCallbackUrl\(signInUrl\)/);
assert.match(chat, /withRoleplayCallbackUrl\('\/pricing'\)/);

const toast = read('src/shared/components/roleplay/roleplay-billing-toast.tsx');
assert.match(toast, /withRoleplayCallbackUrl/);
assert.match(toast, /rememberRoleplayReturnPath/);

const signIn = read('src/shared/blocks/sign/sign-in.tsx');
assert.match(signIn, /signUpHref/);
assert.match(signIn, /Continue without signing in/);
assert.match(signIn, /callbackUrl=/);

const signUp = read('src/shared/blocks/sign/sign-up.tsx');
assert.match(signUp, /signInHref/);
assert.match(signUp, /Continue without signing up/);
assert.match(signUp, /normalizedReturnPath/);

const pricing = read('src/themes/default/blocks/pricing.tsx');
assert.match(pricing, /searchParams\.get\('callbackUrl'\)/);
assert.match(pricing, /callbackUrl: returnPath/);
assert.match(pricing, /rememberRoleplayReturnPath\(returnPath\)/);

const checkout = read('src/app/api/payment/checkout/route.ts');
assert.match(checkout, /safeInternalCallbackUrl/);
assert.match(checkout, /raw\.startsWith\('\/sign-in'\)/);
assert.match(checkout, /raw\.startsWith\('\/pricing'\)/);
assert.match(checkout, /orderCallbackUrl/);
assert.match(checkout, /cancelUrl: returnPath/);
assert.match(checkout, /callbackUrl: orderCallbackUrl/);

console.log('Roleplay return flow wiring OK');
