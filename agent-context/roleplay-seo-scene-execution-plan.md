# RolePlay SEO Scene Execution Plan

Last updated: 2026-06-15 Asia/Shanghai

## Goal

Turn the default RolePlay characters and quick-create flow into search-driven
scene assets, then connect those assets to landing pages that can convert:

- Free AI character chat
- AI character chat with memory
- Anime AI roleplay characters
- Custom AI character creator
- Character.AI alternative with memory

The first implementation pass should keep risk low: use local character data,
MDX pages, sitemap entries, and quick-create metadata before adding database
columns.

## Principles

- One page maps to one search intent cluster.
- Homepage owns broad category terms only.
- Scene pages own commercial and transactional long-tail intent.
- Default characters support discovery; quick-create templates support
  conversion.
- Database schema changes wait until the first page/creation loop proves useful.

## Character Scene Taxonomy

Canonical SEO scene slugs:

| Slug | Purpose |
| --- | --- |
| `free_chat` | Free-start and low-friction chat intent. |
| `memory_companion` | Characters that remember user/story context. |
| `anime_roleplay` | Original anime roleplay and anime character chat. |
| `crush_chat` | Slow-burn, romantic, date, almost-confession chat. |
| `comfort_companion` | Emotional comfort, cozy, late-night companionship. |
| `private_character_template` | Good defaults for remixing into private characters. |
| `custom_character` | Creation-oriented page and quick-create flows. |
| `slow_burn_romance` | Relationship continuity and romantic tension. |
| `cozy_roleplay` | Low-pressure, warm, daily-life roleplay. |
| `fantasy_roleplay` | Fantasy/anime/magic/supernatural scene discovery. |

## Default Character Mapping

Realistic/muse characters:

| Character | Primary Scenes | Notes |
| --- | --- | --- |
| Chloe | `crush_chat`, `cozy_roleplay`, `free_chat` | Best default crush chat card. |
| Sienna | `comfort_companion`, `custom_character` | Confidence and mood-reset angle. |
| Amara | `comfort_companion`, `cozy_roleplay` | Soft escape and travel warmth. |
| Valeria | `crush_chat`, `slow_burn_romance` | Playful, bold, high-tension. |
| Leila | `comfort_companion`, `crush_chat` | Quiet attention and elegant care. |
| Priya | `comfort_companion`, `private_character_template` | Honest conversation and thoughtful check-in. |
| Elena | `crush_chat`, `cozy_roleplay` | Private walks and sweet discovery. |
| Maya | `private_character_template`, `comfort_companion` | High-standard mentor/remix template. |
| Freya | `crush_chat`, `private_character_template` | Subtle lounge tension. |
| Zuri | `crush_chat`, `free_chat` | High-energy playful discovery. |
| Camila | `crush_chat`, `comfort_companion` | Romantic sunset and grounded warmth. |
| Noor | `private_character_template`, `crush_chat`, `memory_companion` | Composed private-hour template. |

Anime characters:

| Scene | First Characters |
| --- | --- |
| `anime_roleplay` | Elira, Serina, Liora, Akane, Emi-09, Daphne, Nyra, Toma, Lucian, Mika |
| `comfort_companion` | Elira, Serina, Liora, Emi-09, Yun Lan, Arin, Noel, Ren, Mika, Caspian |
| `crush_chat` | Akane, Mira, Nyra, Rin, Kieran, Lucian, Caspian |
| `private_character_template` | Emi-09, Elira, Liora, Lucian, Mika, Serina |

## Quick Create Changes

Add a scene-first quick-create path:

1. Choose a target scene:
   - Anime Roleplay
   - Crush Chat
   - Comfort Companion
   - Private Character
2. Choose an inspiration template:
   - Start from a cozy companion
   - Start from an anime mage
   - Start from a crush chat template
   - Start from a private memory companion
3. Customize relationship, traits, memory, opening, and image.
4. Save as private by default.

Local data additions:

- `intentCategory`
- `inspirationType`
- `inspirationTitleEn`
- `inspirationSummaryEn`
- `defaultVisibility`
- `starterMemoryMode`
- `recommendedLandingSlug`

Save metadata on generated characters:

```json
{
  "intentCategory": "anime_roleplay",
  "inspirationType": "anime_mage",
  "sourceTemplateId": "anime-comfort-mage",
  "customizationMode": "quick_create",
  "starterMemoryMode": "relationship",
  "recommendedLandingSlug": "anime-ai-roleplay-characters"
}
```

## Database Plan

Phase 1 avoids migrations. Store new metadata in JSON where possible.

If metrics show the scene system is useful, promote to real columns:

- `seo_scenes text not null default '[]'`
- `source_template_id text not null default ''`
- `customization_mode text not null default ''`
- `landing_slug text not null default ''`

When promoted, update PostgreSQL, MySQL, SQLite schemas, migrations, seed
scripts, and roleplay character model helpers together.

## SEO Landing Pages

Priority pages:

1. `/free-ai-character-chat`
   - Target: low-friction free-start searches.
   - CTA: start free chat, create free AI character.
2. `/ai-character-chat-with-memory`
   - Target: core memory differentiator.
   - CTA: chat with memory, create memory companion.
3. `/anime-ai-roleplay-characters`
   - Target: anime roleplay with real character cards.
   - CTA: start anime roleplay, create anime character.
4. `/custom-ai-character-creator`
   - Target: transactional creation intent.
   - CTA: create custom character, use inspiration template.
5. `/character-ai-alternative-with-memory`
   - Existing page to strengthen as a comparison page.
   - CTA: try memory roleplay, create private character.

Page structure:

- H1 and direct promise.
- Scene-specific character/template recommendations.
- Differentiation section.
- Creation CTA.
- FAQ.
- Internal links to related scene pages and character pages.

## Implementation Order

1. Create this plan and execution log.
2. Add character scene metadata to default character data.
3. Add quick-create intent/inspiration metadata and expose inspiration grouping.
4. Create or strengthen the five SEO pages.
5. Add pages to sitemap.
6. Add scoped homepage links to the new scene pages if safe with current changes.
7. Run type/lint/targeted scripts where available.
8. Update execution log with completed work, checks, and remaining risks.

