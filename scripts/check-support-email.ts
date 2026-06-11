import assert from 'node:assert/strict';

import {
  DEFAULT_SUPPORT_EMAIL,
  getSupportEmail,
  getSupportMailto,
} from '../src/shared/lib/support-email';
import { publicSettingNames } from '../src/shared/services/settings';

assert.equal(DEFAULT_SUPPORT_EMAIL, 'support@keepsay.dpdns.org');
assert.ok(
  publicSettingNames.includes('support_email'),
  'support_email must be exposed to the public config endpoint'
);

assert.equal(getSupportEmail({}), DEFAULT_SUPPORT_EMAIL);
assert.equal(
  getSupportEmail({ support_email: ' help@example.com ' }),
  'help@example.com'
);
assert.equal(
  getSupportMailto({ support_email: 'help@example.com' }),
  'mailto:help@example.com'
);

console.log('Support email config rules OK');
