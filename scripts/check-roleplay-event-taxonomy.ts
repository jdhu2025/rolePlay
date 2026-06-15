import fs from 'node:fs';
import path from 'node:path';

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function stringLiterals(source: string) {
  return Array.from(source.matchAll(/'([a-z0-9_.-]+)'/g)).map(
    (match) => match[1]
  );
}

function main() {
  const clientPath = path.join(
    process.cwd(),
    'src/shared/lib/roleplay-moment-events.ts'
  );
  const apiPath = path.join(
    process.cwd(),
    'src/app/api/roleplay/moment-event/route.ts'
  );
  const clientSource = fs.readFileSync(clientPath, 'utf8');
  const apiSource = fs.readFileSync(apiPath, 'utf8');

  const clientEvents = new Set(
    stringLiterals(clientSource).filter(
      (event) =>
        event.startsWith('quick_create_') ||
        event.startsWith('seo_') ||
        [
          'first_impression_selected',
          'continuation_hint_shown',
          'wrap_up_clicked',
          'local_fallback_shown',
          'keepsake_voice_clicked',
        ].includes(event)
    )
  );
  const apiEvents = new Set(stringLiterals(apiSource));

  for (const event of clientEvents) {
    assert(
      apiEvents.has(event),
      `client event ${event} is missing from moment-event API allowlist`
    );
  }

  const requiredEvents = [
    'seo_scene_link_clicked',
    'seo_landing_cta_clicked',
    'quick_create_intent_selected',
    'quick_create_inspiration_selected',
    'quick_create_template_selected',
    'quick_create_generated',
    'quick_create_published',
  ];
  for (const event of requiredEvents) {
    assert(clientEvents.has(event), `missing client event type ${event}`);
    assert(apiEvents.has(event), `missing API event allowlist entry ${event}`);
  }

  console.log('Roleplay event taxonomy checks OK');
}

main();
