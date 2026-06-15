# RolePlay SEO Growth Metadata DB Decision

Date: 2026-06-15

## Decision

Do not add database columns for `seoScenes`, `sourceTemplateId`,
`customizationMode`, or `landingSlug` yet.

Keep the first implementation in local data and JSON metadata until the SEO
page loop has real click, create, and publish data.

## Why

- The current SEO scene system is still changing quickly.
- Local mappings are enough for sitemap, landing pages, character cards, and
  Quick Create metadata.
- Adding columns too early would freeze naming before we know which intents
  convert.
- The useful product question is not "can we store this field?" but "which
  scene intent creates retained private characters?"

## Current Storage

- Default character scene mapping:
  `src/data/roleplay-seo-scenes.ts`
- Quick Create growth metadata:
  `getQuickCreateGrowthMetadata(template)`
- Saved quick-created characters:
  JSON `metadata` includes `sourceTemplateId`, `customizationMode`,
  `seoScenes`, `intentCategory`, `inspirationType`, `starterMemoryMode`, and
  `recommendedLandingSlug`.

## Promote To DB When

Promote fields into first-class columns only after at least one of these is
true:

- SEO landing pages start sending meaningful traffic.
- We need admin filtering by scene intent or source template.
- We need analytics queries over scene/template conversion without JSON parsing.
- Public character ranking needs scene-level boosting.
- The same metadata is required by multiple backend jobs.

## Likely Future Columns

On `roleplay_characters`:

- `source_template_id`
- `customization_mode`
- `primary_seo_scene`
- `landing_slug`

On a join table if many-to-many scene ranking becomes important:

- `roleplay_character_seo_scenes`
- `character_id`
- `scene_slug`
- `sort_order`

## Metrics To Watch First

- `seo_scene_link_clicked`
- `seo_landing_cta_clicked`
- `quick_create_intent_selected`
- `quick_create_inspiration_selected`
- `quick_create_template_selected`
- `quick_create_generated`
- `quick_create_published`

The first migration should be based on these event paths, not on assumed
taxonomy completeness.
