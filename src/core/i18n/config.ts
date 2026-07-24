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
  // HTML metadata already emits localized alternates with x-default -> the
  // default-locale root URL. Disable next-intl's HTTP Link header so canonical
  // and hreflang signals only come from our explicit metadata.
  alternateLinks: false,
});
