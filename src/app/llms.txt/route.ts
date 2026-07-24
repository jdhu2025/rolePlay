import { envConfigs } from '@/config';
import { defaultLocale, localePrefix } from '@/config/locale';
import { buildLocalizedPath } from '@/shared/lib/seo-url';

export const revalidate = 3600;

const publicPaths = [
  '/',
  '/ai-character-chat-with-memory',
  '/create-ai-character-with-memory',
  '/ai-companion-that-remembers-you',
  '/ai-roleplay-secret-memory',
  '/character-ai-alternative-with-memory',
  '/anime-ai-roleplay-characters',
  '/talkie-ai-alternative',
  '/privacy-policy',
  '/acceptable-use-policy',
].map((path) =>
  buildLocalizedPath(path, defaultLocale, {
    defaultLocale,
    localePrefix,
  })
);

export function GET() {
  const appUrl = envConfigs.app_url.replace(/\/$/, '');
  const body = [
    '# Keepsay',
    '',
    '> Keepsay is an AI character chat app focused on memory-based roleplay, private character creation, and story continuity.',
    '',
    '## Public Pages',
    '',
    ...publicPaths.map((path) => `- ${appUrl}${path}`),
    '',
    '## AI Search Policy',
    '',
    'Public marketing, landing, policy, and character-profile pages may be used for search, citation, answer retrieval, and product discovery. Private account, settings, admin, activity, and API routes are not public reference material.',
    '',
    'Robots.txt selectively allows answer-engine crawlers for public pages and restricts training-oriented crawlers.',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=14400',
    },
  });
}
