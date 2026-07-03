import { defineRouting } from 'next-intl/routing';

import {
  defaultLocale,
  localeDetection,
  localePrefix,
  locales,
} from '@/config/locale';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix,
  localeDetection,
  // HTML metadata already emits localized alternates with x-default -> /en.
  // Disable next-intl's HTTP Link header so it cannot drift to x-default -> /.
  alternateLinks: false,
});
