import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const routePath = join(root, 'src/app/api/webhooks/creem/route.ts');
const settingsPath = join(root, 'src/shared/services/settings.ts');
const configModelPath = join(root, 'src/shared/models/config.ts');
const paymentServicePath = join(root, 'src/shared/services/payment.ts');
const creemProviderPath = join(root, 'src/extensions/payment/creem.ts');

assert.ok(existsSync(routePath), 'Creem webhook route must exist');

const route = readFileSync(routePath, 'utf8');
assert.match(route, /payment\/notify\/\[provider\]\/route/);
assert.match(route, /provider:\s*'creem'/);

const settings = readFileSync(settingsPath, 'utf8');
assert.match(settings, /name:\s*'creem_api_base_url'/);

const configModel = readFileSync(configModelPath, 'utf8');
assert.match(configModel, /CREEM_API_Key/);

const paymentService = readFileSync(paymentServicePath, 'utf8');
assert.match(paymentService, /apiBaseUrl:\s*configs\.creem_api_base_url/);

const creemProvider = readFileSync(creemProviderPath, 'utf8');
assert.match(creemProvider, /apiBaseUrl\?:\s*string/);
assert.match(creemProvider, /configs\.apiBaseUrl/);

console.log('Creem webhook integration rules OK');
