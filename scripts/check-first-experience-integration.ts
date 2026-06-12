import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function read(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

const landing = read('src/shared/components/roleplay/roleplay-landing.tsx');
assert.match(landing, /FirstExperienceDirector/);
assert.match(landing, /refreshRecommendationsForExperience/);
assert.ok(
  landing.indexOf('<FirstExperienceDirector') < landing.indexOf('<ForYouSection'),
  'FirstExperienceDirector should appear before ForYouSection'
);

const client = read('src/shared/lib/roleplay-client.ts');
assert.match(client, /firstImpression\?:/);
assert.match(client, /buildFirstExperienceRecommendationQuery/);
assert.match(client, /params\.set\('firstImpression'/);

const recommendations = read('src/app/api/roleplay/recommendations/route.ts');
assert.match(recommendations, /normalizeFirstExperienceChoice/);
assert.match(recommendations, /rankFirstExperienceCharacters/);
assert.match(recommendations, /firstImpression/);

const momentClient = read('src/shared/lib/roleplay-moment-events.ts');
assert.match(momentClient, /FIRST_EXPERIENCE_EVENT_TYPES/);

const momentRoute = read('src/app/api/roleplay/moment-event/route.ts');
assert.match(momentRoute, /FIRST_EXPERIENCE_EVENT_TYPES/);

const chat = read('src/shared/components/roleplay/roleplay-chat.tsx');
assert.match(chat, /FirstExperienceSceneNote/);
assert.match(chat, /seed_revealed/);
assert.match(chat, /goodbye_stamp_shown/);
assert.match(chat, /markFirstExperienceConversationFlag/);

console.log('First experience integration wiring OK');
