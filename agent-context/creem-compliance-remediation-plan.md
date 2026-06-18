# Creem Compliance Remediation Plan

> Status: Phase 1-3 implemented; review-mode defaults, high-risk SEO route blocking, custom image prompt gating, safety page, compliance env template, and validation evidence are complete.
>
> Date: 2026-06-16 Asia/Shanghai
>
> Product name for review: Keepsay
>
> Strategy: hide first, do not delete. Keep growth assets and product capabilities available behind configuration so they can be restored or tested later without large rewrites.

## Implementation Status

| Step | Status | Notes |
| --- | --- | --- |
| Step 0: Freeze product intent | Done | Review-facing positioning is Keepsay as fictional character creation and interactive storytelling. |
| Step 1: Central compliance mode | Done | Added `src/shared/lib/compliance.ts` with review-mode visibility helpers, high-risk SEO path registry, and review-safe default `PUBLIC_COMPLIANCE_MODE=true` behavior when unset. |
| Step 2: Public brand unification | Done | Public config, `.env.example`, and major public locale copy now use Keepsay. Internal package/product ids are intentionally preserved where they are payment mappings. |
| Step 3: Review-facing copy cleanup | Done | Homepage, footer, pricing, profile, create, collection, and detail copy now use story/character/safe-image language. |
| Step 4: Hide high-risk SEO assets | Done | Sitemap, character card scene chips, and character detail scene links filter high-risk paths in compliance mode. Strict review mode redirects direct high-risk SEO URL visits to the safe localized homepage. Page files remain in place. |
| Step 5: Gate Quick Create/categories/gallery | Done | Quick Create templates/groups/inspirations now use visible compliance-filtered collections. Custom Quick Create avatar prompt input is hidden in compliance mode. Public gallery exposure is limited to the first image in compliance mode across public APIs, SSR home data, local fallback data, cards, and detail pages. |
| Step 6: Gate voice profiles | Done | TTS voice profile API filters sensitive voice profiles in compliance mode. |
| Step 7: Image safety and moderation | Done | Roleplay image generation and generic AI media generation force fail-closed moderation behavior in compliance mode; public custom image prompt entry points are hidden or constrained during review. |
| Step 8: Legal/support surfaces | Done | AUP/TOS and Safety pages in English and Chinese now explicitly state not dating, not adult, not deepfake/face-swap, and not NSFW chatbot. |
| External Creem dashboard verification | Prepared | Added `agent-context/creem-dashboard-review-checklist.md`; code-side pricing, checkout order records, and admin mapping guidance use Keepsay names. Actual Creem dashboard display names still require manual confirmation in Creem before re-review. |

## Implementation Log

- 2026-06-16: Added `src/shared/lib/compliance.ts` as the central review-mode switchboard.
- 2026-06-16: Changed default `NEXT_PUBLIC_APP_NAME` fallback from `RolePlay` to `Keepsay`.
- 2026-06-16: Filtered high-risk SEO paths from `src/app/sitemap.ts` when `SHOW_HIGH_RISK_SEO_PAGES=false`.
- 2026-06-16: Added Quick Create visibility helpers and wired the wizard to visible templates, intent groups, and inspirations.
- 2026-06-16: Filtered sensitive TTS voice profiles in `src/app/api/roleplay/tts/voice-profiles/route.ts`.
- 2026-06-16: Enforced compliance fail-closed Creem moderation in `src/app/api/roleplay/image/route.ts` and `src/app/api/ai/generate/route.ts`.
- 2026-06-16: Updated English and Chinese public copy for common metadata, landing footer, roleplay surfaces, and pricing.
- 2026-06-16: Strengthened English and Chinese AUP/TOS with explicit not-dating, not-adult, not-NSFW-chatbot language.
- 2026-06-16: Added `scripts/check-creem-compliance.mjs` and `pnpm check:creem-compliance`.
- 2026-06-16: Validation completed: `pnpm check:creem-compliance`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` passed. `pnpm check:creem-moderation` could not run in this sandbox because `tsx` cannot create its IPC pipe; direct Node strip-types execution also cannot resolve extensionless TS imports. Build emitted a tolerated local warning that `DATABASE_URL` is not set while collecting dynamic sitemap character entries; static build completed successfully.
- 2026-06-16: Added `getVisiblePublicGallery()` and applied it to public character cards, character detail pages, local official fallback data, SSR home data, public character APIs, and recommendation APIs. In compliance mode, public gallery surfaces expose only the first image while owner/admin flows retain full galleries.
- 2026-06-16: Hid the footer "more characters" gallery-style entry in compliance mode.
- 2026-06-16: Expanded `pnpm check:creem-compliance` to verify gallery visibility hooks on public routes and components.
- 2026-06-16: Re-ran validation after gallery gating: `pnpm check:creem-compliance`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` passed. Lint still reports 10 pre-existing warnings; build still logs the local missing-`DATABASE_URL` sitemap fallback and completes.
- 2026-06-16: Set central compliance mode to default review-safe enabled behavior when unset, updated `.env.example` to use Keepsay and include Creem review-mode switches, and expanded `pnpm check:creem-compliance` to verify these settings.
- 2026-06-16: Hid the Quick Create custom avatar image prompt input when `SHOW_CUSTOM_IMAGE_PROMPTS=false`; generated avatars still use structured character context and pass through Creem moderation.
- 2026-06-16: Final validation after unfinished-task cleanup passed: `pnpm check:creem-compliance`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`. Lint still reports 10 pre-existing warnings; build still logs the local missing-`DATABASE_URL` sitemap fallback and completes.
- 2026-06-16: Added English and Chinese `/safety` pages covering product boundaries, moderation, image rules, enforcement, reporting, and related policy links. Added Safety links to header resources, footer policies, and footer agreements; expanded `pnpm check:creem-compliance` to verify the safety pages and links.
- 2026-06-16: Added `BLOCK_HIGH_RISK_SEO_PAGES=true` review-mode control. `src/proxy.ts` now redirects direct high-risk SEO URL visits to the safe localized homepage when strict blocking is enabled, while leaving page files in place for later growth experiments.
- 2026-06-16: Validation after strict high-risk SEO blocking passed: `pnpm check:creem-compliance`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build`. A direct `pnpm exec tsx -e ...` helper smoke check could not run in this sandbox because `tsx` cannot create its IPC pipe; this is the same local sandbox limitation noted for the moderation check.
- 2026-06-16: Updated starter credit defaults and admin setting defaults from `RolePlay starter credits` to `Keepsay starter credits`. Kept the legacy `RolePlay starter credits` string only in duplicate-detection compatibility so existing grants do not receive another starter grant.
- 2026-06-16: Expanded `pnpm check:creem-compliance` to verify Keepsay payment/credit naming and branded support email exposure. Code-side checkout product names are Keepsay; Creem dashboard store/product names remain an external manual verification item before re-review.
- 2026-06-16: Added `agent-context/creem-dashboard-review-checklist.md` with required Creem store name, support email, product display names, `creem_product_ids` mapping, hosted checkout spot checks, and re-review links. Updated the admin Creem Product IDs Mapping placeholder/tip to use actual Keepsay pricing ids and remind operators to match Creem product display names.
- 2026-06-16: Fixed remaining review-visible `RolePlay` brand leaks in the roleplay topbar and mobile drawer. Added payment display normalization so legacy paid orders such as `RolePlay First Spark` render as `Keepsay First Spark` without rewriting historical records.
- 2026-06-16: Changed compliance behavior so `PUBLIC_COMPLIANCE_MODE` / Admin `Review-Safe Mode` is the master switch: `true` applies review-safe defaults; `false` restores growth SEO pages, templates, galleries, custom image prompts, and normal moderation behavior without requiring multiple Vercel env toggles. Advanced child toggles remain available for overrides while review mode is on.

## Purpose

This plan prepares Keepsay for a Creem account re-review while preserving future product flexibility.

The core principle is: hide risky public positioning and sensitive entry points during review, but do not remove underlying product capabilities unless a later policy decision requires it.

The review-facing product should read as:

- Fictional character creation
- Interactive storytelling
- Creative writing
- Story memory
- Policy-safe character images

It should not read as:

- AI companion dating
- NSFW chatbot
- AI girlfriend or boyfriend
- Adult roleplay
- Unfiltered image generation
- Dating-adjacent service

## Source Documents And How This Plan Integrates Them

This document is an overlay plan for Creem compliance. It does not replace the existing product documents. It defines what must be hidden, relabeled, or gated when `PUBLIC_COMPLIANCE_MODE=true`.

| Existing document | Original direction | Compliance overlay |
| --- | --- | --- |
| `README.md` | Agent context entry point and reading order. | Add this document as the required review-read before public launch or payment review work. |
| `roleplay-seo-implementation-plan.md` | Strong SEO around AI companion, memory, roleplay, Character.AI/Talkie alternatives, crush, comfort, anime. | Preserve these as growth assets, but hide high-risk pages from sitemap/navigation in compliance mode. Safe copy and safe paths remain visible. |
| `roleplay-billing-credits-design.md` | Conversion copy emphasizes relationship continuity, photos, voice, private scenes, premium moments. | Keep credit mechanics, but change public pricing language to story memory, safe character images, voice previews, and character creation. |
| `roleplay-billing-implementation-log.md` | Billing hooks already exist for chat, image, TTS, AI Writer, publishing, idempotency. | Use existing hooks. Add compliance copy and moderation constraints without redesigning billing. |
| `roleplay-quick-create-wizard-plan.md` | Quick Create includes romance/crush/life-conflict templates and relationship starts. | Keep template data. Filter or relabel sensitive templates in compliance mode. |
| `roleplay-category-strategy.md` | Categories include `play_fun` for dating, flirting, cozy companionship, nightlife. | Keep category keys. In compliance mode relabel or hide risky category copy and avoid making `play_fun` the public review-facing default. |
| `roleplay-homepage-optimization-plan.md` | Homepage prioritizes photo-first discovery, For You, Explore, character cards, Chat CTAs. | Keep layout, but use safe character/story copy, hide risky SEO links, and optionally restrict gallery. |
| `roleplay-image-agent-brief.md` | Image assets must avoid explicit content and keep lifestyle/editorial style. | Tighten review-facing language from dating-profile/private-photo to policy-safe character images; require moderation for generated images. |

## Step-By-Step Execution Roadmap

### Step 0: Freeze Product Intent For Review

Goal: align everyone on what Creem should see.

Creem-review-facing positioning:

```text
Keepsay is a fictional character creation and interactive storytelling product.
Users create original fictional characters, continue story scenes, save story memory,
preview voices, and generate policy-safe character images.
```

Creem-review-facing exclusions:

```text
Keepsay is not a dating service, adult chatbot, NSFW chatbot, face-swap product,
deepfake tool, escort service, or adult entertainment service.
```

Acceptance:

```text
[x] The team agrees to hide-first rather than delete.
[x] Keepsay is the only public product name in review-facing app surfaces.
[x] Compliance mode is the source of truth for review-facing visibility.
```

### Step 1: Add Central Compliance Mode

Goal: create one switchboard before touching scattered UI.

Create:

```text
src/shared/lib/compliance.ts
```

Required helpers:

```ts
isComplianceMode()
canShowHighRiskSeoPages()
canShowRomanceTemplates()
canShowSensitiveVoiceStyles()
canShowPublicGallery()
canUseCustomImagePrompts()
shouldRequireCreemModeration()
shouldFailClosedOnModerationUnavailable()
```

Acceptance:

```text
[x] All helpers have safe review defaults.
[x] Env config can override defaults.
[x] Future database/admin config can override env if needed.
[x] No review-facing UI component hardcodes policy directly.
```

### Step 2: Unify Public Brand To Keepsay

Goal: remove review confusion from `RolePlay`, `Talkie`, and `Talkie clone` wording.

Priority surfaces:

```text
src/config/index.ts
src/config/locale/messages/en/common.json
src/config/locale/messages/zh/common.json
src/config/locale/messages/en/landing.json
src/config/locale/messages/zh/landing.json
src/config/locale/messages/en/roleplay.json
src/config/locale/messages/zh/roleplay.json
src/config/locale/messages/en/pages/pricing.json
src/config/locale/messages/zh/pages/pricing.json
Creem dashboard store/product names
Receipt/support email display
```

Acceptance:

```text
[x] Public metadata says Keepsay.
[x] Header/footer say Keepsay.
[x] Pricing product names say Keepsay.
[x] Creem dashboard store/product verification checklist is prepared. Code-side checkout product names are Keepsay; actual Creem dashboard display names must be manually confirmed before re-review.
[x] `Talkie clone`, `Talkie-style`, and `RolePlay MVP` are not visible publicly.
```

### Step 3: Clean Review-Facing Copy

Goal: keep product function understandable while removing high-risk public framing.

Replace public copy by display layer. Do not rename internal keys unless necessary.

Risky public wording:

```text
AI companion
roleplay app
crush
romance
girlfriend
boyfriend
flirty
intimacy
late-night intimacy
private photo
private moments
dating
Talkie alternative
Character.AI alternative
photos when the moment hits
uncensored
unfiltered
NSFW
18+
```

Safe review-facing wording:

```text
fictional character
story character
story scene
interactive fiction
character drama
emotional story
warm expressive voice
grounded expressive voice
safe character image
saved story moment
character memory app
creative writing character tool
```

Acceptance:

```text
[x] Homepage hero uses fictional character/story positioning.
[x] Footer uses fictional character/creative writing positioning.
[x] Pricing uses safe character images and voice previews.
[x] Public metadata avoids companion, crush, dating, and clone terms.
```

### Step 4: Hide High-Risk SEO Assets Without Deleting

Goal: preserve SEO work but avoid exposing risky pages during payment review.

Compliance-mode hidden paths:

```text
/crush-ai-chat
/comfort-ai-companion
/ai-companion-that-remembers-you
/ai-roleplay-secret-memory
/ai-roleplay-shared-memory
/character-ai-alternative-with-memory
/anime-character-ai-chat
/talkie-ai-alternative
/anime-ai-roleplay-characters
```

Implementation order:

1. Filter `src/app/sitemap.ts`.
2. Hide homepage SEO links.
3. Hide footer/resource links.
4. Keep page files.
5. Redirect direct high-risk URL visits to the safe localized homepage when strict mode is enabled.

Acceptance:

```text
[x] Review-mode sitemap does not include high-risk paths.
[x] Homepage does not link to high-risk paths.
[x] Footer/resources do not link to high-risk paths.
[x] Files remain in the repo for future growth experiments.
```

### Step 5: Gate Quick Create, Categories, And Gallery

Goal: keep original experience internally, but show a low-risk creation surface publicly.

Quick Create:

```text
romance -> Character Drama
Crush & Regret -> Character Drama
Everyday Care -> Everyday Story
Fantasy Adventure -> Fantasy Story
Work & Pressure -> Workplace Fiction
```

Category strategy overlay:

```text
play_fun remains an internal category.
Compliance mode should not describe it as dating, flirting, nightlife, or companionship.
Default public review category should prefer Recommend, Original, Helper, or story-safe labels.
```

Gallery:

```text
SHOW_PUBLIC_GALLERY=false
```

or:

```text
Only show approved official characters with safe images and safe copy.
```

Acceptance:

```text
[x] Quick Create has no Crush & Regret public label in compliance mode.
[x] `romance` key can remain internal.
[x] Category labels avoid dating/flirting/companion public copy.
[x] Public gallery is hidden or restricted to safe reviewed characters.
```

### Step 6: Gate Voice Profiles

Goal: keep voice assets while hiding risky voice labels and instructions.

Filter sensitive voice profiles from:

```text
roleplay-tts-voice-profiles.json
roleplay-tts-voice-profiles-openai.json
roleplay-tts-voice-profiles-romance-openai.json
src/app/api/roleplay/tts/voice-profiles/route.ts
```

Sensitive indicators:

```text
romance
girlfriend
boyfriend
flirty
intimacy
late-night
romantic tone
```

Safe display replacements:

```text
girlfriend-like voice -> warm expressive voice
boyfriend-like voice -> grounded expressive voice
romantic tone -> emotionally expressive tone
late-night intimacy -> quiet warmth
flirty -> playful
```

Acceptance:

```text
[x] Voice selector has no girlfriend/boyfriend/flirty/intimacy wording.
[x] Sensitive voice profiles remain available internally for future policy decisions.
[x] Filtering happens at API or selector boundary, not by deleting JSON entries.
```

### Step 7: Enforce Image Safety And Moderation

Goal: satisfy Creem AI image compliance without removing image features.

Use existing Creem moderation work as the base. Tighten defaults:

```text
roleplay_image_moderation_enabled=true
creem_moderation_fail_closed=true
SHOW_CUSTOM_IMAGE_PROMPTS=false
REQUIRE_CREEM_MODERATION=true
```

Review-facing behavior:

```text
Character images must be fictional, fully clothed, non-explicit, and policy-safe.
```

Acceptance:

```text
[x] Every generated image prompt passes Creem moderation first.
[x] Moderation unavailable means generation is blocked.
[x] Rejected prompt means generation is blocked.
[x] Free-form custom prompts are hidden or constrained during review.
[x] Error messages do not suggest sensitive workarounds.
```

### Step 8: Strengthen Legal And Support Surfaces

Goal: make policy posture explicit and easy for Creem to verify.

Update:

```text
content/pages/acceptable-use-policy.mdx
content/pages/acceptable-use-policy.zh.mdx
content/pages/terms-of-service.mdx
content/pages/terms-of-service.zh.mdx
```

AUP addition:

```text
Keepsay is not an adult chatbot, dating service, escort service, or NSFW chatbot platform.
Users may not create or market characters as AI girlfriends, AI boyfriends, adult companions, dating partners, or sexual chatbots.
```

TOS addition:

```text
Keepsay provides fictional character creation and interactive storytelling tools. It is not a dating, adult entertainment, escort, sexual service, or NSFW chatbot service.
```

Optional:

```text
/safety
```

Acceptance:

```text
[x] Terms, Privacy, Safety, and AUP are publicly reachable.
[x] AUP/TOS/Safety explicitly say not dating, not adult, not NSFW chatbot.
[x] Branded support email is visible in footer, public config, and support links. Payment records use Keepsay product names from pricing config.
```

## Guiding Principles

1. Product name is Keepsay everywhere public.
2. High-risk words and flows are hidden or renamed at the presentation layer.
3. Internal keys, data models, routes, and future capabilities should be preserved when possible.
4. A centralized compliance mode controls public visibility.
5. Creem-review-visible surfaces must be low risk by default.
6. Admin and backend operations should keep full visibility for management.
7. Image generation must fail closed if required moderation is unavailable.

## Central Compliance Configuration

Add a central compliance helper, preferably:

```text
src/shared/lib/compliance.ts
```

Recommended settings:

```text
PUBLIC_COMPLIANCE_MODE=true

SHOW_HIGH_RISK_SEO_PAGES=false
BLOCK_HIGH_RISK_SEO_PAGES=true
SHOW_ROMANCE_TEMPLATES=false
SHOW_COMPANION_COPY=false
SHOW_SENSITIVE_VOICE_STYLES=false
SHOW_PUBLIC_GALLERY=false
SHOW_CUSTOM_IMAGE_PROMPTS=false
SHOW_ROLEPLAY_MARKETING_COPY=false

REQUIRE_CREEM_MODERATION=true
CREEM_MODERATION_FAIL_CLOSED=true
IMAGE_GENERATION_REVIEW_MODE=true
```

Recommended helper API:

```ts
isComplianceMode()
canShowHighRiskSeoPages()
canShowRomanceTemplates()
canShowSensitiveVoiceStyles()
canShowPublicGallery()
canUseCustomImagePrompts()
shouldRequireCreemModeration()
shouldFailClosedOnModerationUnavailable()
```

Suggested precedence:

```text
environment variable > database config/settings > safe default
```

Safe defaults for Creem re-review:

```text
PUBLIC_COMPLIANCE_MODE=true
SHOW_HIGH_RISK_SEO_PAGES=false
SHOW_ROMANCE_TEMPLATES=false
SHOW_COMPANION_COPY=false
SHOW_SENSITIVE_VOICE_STYLES=false
SHOW_PUBLIC_GALLERY=false
SHOW_CUSTOM_IMAGE_PROMPTS=false
REQUIRE_CREEM_MODERATION=true
CREEM_MODERATION_FAIL_CLOSED=true
```

## Brand Unification

Public-facing product name should be Keepsay.

Replace or hide public references to:

```text
RolePlay
rolePlay
Talkie
Talkie Claw
Talkie-style
Talkie clone
```

Preferred replacements:

```text
RolePlay -> Keepsay
rolePlay -> Keepsay
Talkie -> character
Talkie Claw -> Keepsay
Talkie-style MVP -> fictional character app
Talkie clone -> character creation app
```

Priority files:

```text
src/config/index.ts
src/config/locale/messages/en/common.json
src/config/locale/messages/zh/common.json
src/config/locale/messages/en/roleplay.json
src/config/locale/messages/zh/roleplay.json
src/config/locale/messages/en/pages/pricing.json
src/config/locale/messages/zh/pages/pricing.json
src/config/locale/messages/en/landing.json
src/config/locale/messages/zh/landing.json
```

Package metadata can be deferred if it is not publicly exposed during review.

Payment product names should be unified:

```text
RolePlay First Spark -> Keepsay First Spark
RolePlay Spark Credits -> Keepsay Spark Credits
RolePlay Glow Credits -> Keepsay Glow Credits
RolePlay Lite Monthly -> Keepsay Lite Monthly
RolePlay Plus Monthly -> Keepsay Plus Monthly
RolePlay Pro Monthly -> Keepsay Pro Monthly
```

## Public Copy Risk Reduction

High-risk public words:

```text
AI companion
roleplay app
crush
romance
girlfriend
boyfriend
flirty
intimacy
late-night intimacy
private photo
private moments
dating
Talkie alternative
Character.AI alternative
photos when the moment hits
uncensored
unfiltered
NSFW
18+
```

Preferred replacements:

```text
AI companion -> fictional character / story character
roleplay -> story scene / interactive fiction
crush -> first spark / character drama
romance -> emotional story / character drama
girlfriend-like -> warm expressive
boyfriend-like -> grounded expressive
flirty -> playful
intimacy -> warmth
private photo -> character image
private moments -> saved story moments
dating -> do not show publicly
Talkie alternative -> character story app
Character.AI alternative -> character memory app
```

Homepage positioning:

```text
Fictional characters for ongoing stories.
Create original characters, continue story scenes, and keep story memory across chats.
```

Footer positioning:

```text
Keepsay is a fictional character chat and creative writing app for original characters, story continuity, memory, voice previews, and policy-safe character images.
```

Metadata positioning:

```json
{
  "title": "Keepsay",
  "description": "Keepsay helps users create fictional characters, continue story scenes, and generate policy-safe character images with clear content boundaries.",
  "keywords": "fictional character chat, character creator, story continuity, creative writing, character memory"
}
```

Pricing copy:

```text
Old: Start free, then keep chats, photos, voice, and character creation affordable.
New: Start free, then keep story chats, safe character images, voice previews, and character creation affordable.

Old: More memory, more messages, photos and voice when the moment hits.
New: More story memory, more messages, safe character images, and voice previews.

Old: For heavy roleplay and creators.
New: For frequent character creators and long-running stories.
```

## SEO Page Visibility

Do not delete SEO pages initially. Hide them from public discovery in compliance mode.

High-risk pages to hide from sitemap, homepage links, footer links, and resource navigation:

```text
/crush-ai-chat
/comfort-ai-companion
/ai-companion-that-remembers-you
/ai-roleplay-secret-memory
/ai-roleplay-shared-memory
/character-ai-alternative-with-memory
/anime-character-ai-chat
/talkie-ai-alternative
/anime-ai-roleplay-characters
```

Visibility strategy:

1. Filter high-risk paths from `src/app/sitemap.ts` when `SHOW_HIGH_RISK_SEO_PAGES=false`.
2. Hide homepage SEO links that point to high-risk pages.
3. Hide footer/resource links that point to high-risk pages.
4. Keep page files for now.
5. Return redirect to a safe localized homepage when strict review mode is enabled.

Safer pages to keep, after copy cleanup:

```text
/create-ai-character-with-memory
/custom-ai-character-creator
/free-ai-character-chat
/ai-character-chat-with-memory
```

Longer-term safe page ideas:

```text
/create-fictional-character
/fictional-character-chat
/character-story-memory
/safe-ai-character-images
/creative-writing-character-tool
```

## Quick Create Templates

Keep internal templates. Filter or rename their public presentation.

Compliance-mode behavior:

```text
SHOW_ROMANCE_TEMPLATES=false
```

Hide templates with obvious dating or romance positioning, especially:

```text
romance category
crush-oriented templates
relationship-heavy templates
```

Public label replacements:

```text
romance -> Character Drama
Crush & Regret -> Character Drama
Everyday Care -> Everyday Story
Fantasy Adventure -> Fantasy Story
Work & Pressure -> Workplace Fiction
```

Relevant areas:

```text
src/data/roleplay-quick-create-templates.ts
src/shared/components/roleplay/roleplay-quick-create-wizard.tsx
src/config/locale/messages/en/roleplay.json
src/config/locale/messages/zh/roleplay.json
```

Recommended abstraction:

```ts
getVisibleQuickCreateTemplates({ complianceMode })
```

Avoid scattering template id checks across UI components.

## Voice Profile Visibility

Keep voice profile data. Filter or relabel at API/display boundaries.

Sensitive indicators:

```text
romance
girlfriend
boyfriend
flirty
intimacy
late-night
romantic tone
whisper when paired with adult/romance language
```

Relevant files/routes:

```text
roleplay-tts-voice-profiles.json
roleplay-tts-voice-profiles-openai.json
roleplay-tts-voice-profiles-romance-openai.json
src/app/api/roleplay/tts/voice-profiles/route.ts
```

Compliance-mode API behavior:

```ts
if (isComplianceMode()) {
  return profiles.filter(isComplianceSafeVoiceProfile);
}
```

Display replacements:

```text
girlfriend-like voice -> warm expressive voice
boyfriend-like voice -> grounded expressive voice
romantic tone -> emotionally expressive tone
late-night intimacy -> quiet warmth
flirty -> playful
```

## Image Generation Controls

The project already contains Creem moderation-related code. The remediation should focus on centralized controls, fail-closed behavior, and public prompt visibility.

Compliance-mode defaults:

```text
roleplay_image_moderation_enabled=true
creem_moderation_fail_closed=true
SHOW_CUSTOM_IMAGE_PROMPTS=false
REQUIRE_CREEM_MODERATION=true
```

Image generation rules:

1. Character images can remain available if they are policy-safe.
2. User free-form image prompts should be hidden or tightly constrained during review.
3. If custom prompts remain available, every prompt must pass Creem Moderation first.
4. If moderation is unavailable, block generation.
5. If moderation rejects or flags the prompt, block generation.
6. Store enough moderation metadata for audit and re-review support.
7. Error messages should be neutral and should not suggest sensitive workarounds.

User-facing safety text:

```text
Character images must be fictional, fully clothed, non-explicit, and policy-safe.
```

Relevant code areas:

```text
src/app/api/roleplay/image/route.ts
src/app/api/ai/generate/route.ts
src/shared/components/roleplay/roleplay-character-edit-form.tsx
src/shared/components/roleplay/roleplay-quick-create-wizard.tsx
src/shared/components/roleplay/roleplay-chat.tsx
src/shared/blocks/generator/image.tsx
src/shared/lib/creem-moderation.ts
```

## Public Gallery And Character Pages

Compliance-mode default:

```text
SHOW_PUBLIC_GALLERY=false
```

Alternative: show only approved official characters with safe images and safe copy.

Hide or relabel public character page fields:

```text
Relationship -> Story setup
Secret -> Story note
Photo -> Character image
Roleplay -> Story scene
Private photo -> Character image
Photo-first -> Visual profile
```

Consider hiding `Age` publicly if it creates avoidable review risk.

Relevant areas:

```text
src/shared/components/roleplay/*
src/config/locale/messages/en/roleplay.json
src/config/locale/messages/zh/roleplay.json
```

## Legal Page Strengthening

Existing pages:

```text
/terms-of-service
/privacy-policy
/acceptable-use-policy
```

Add to Acceptable Use Policy:

```text
Keepsay is not an adult chatbot, dating service, escort service, or NSFW chatbot platform.
Users may not create or market characters as AI girlfriends, AI boyfriends, adult companions, dating partners, or sexual chatbots.
```

Add to Terms of Service:

```text
Keepsay provides fictional character creation and interactive storytelling tools. It is not a dating, adult entertainment, escort, sexual service, or NSFW chatbot service.
```

Optional new page:

```text
/safety
```

Suggested safety page sections:

- Content boundaries
- Image generation rules
- Moderation policy
- Reporting abuse
- Not dating
- Not adult entertainment
- Not deepfake or face-swap

## Admin Settings

Short-term: use environment variables and existing config/settings patterns.

Long-term: add an admin compliance settings section.

Suggested admin controls:

```text
Compliance Mode
Show high-risk SEO pages
Show romance/story drama templates
Show sensitive voice styles
Show public gallery
Allow custom image prompts
Require Creem moderation
Fail closed when moderation is unavailable
```

Suggested location:

```text
Admin -> Settings -> Compliance
```

## Creem Re-Review Settings

Use these settings before requesting re-review:

```text
PUBLIC_COMPLIANCE_MODE=true
SHOW_HIGH_RISK_SEO_PAGES=false
BLOCK_HIGH_RISK_SEO_PAGES=true
SHOW_ROMANCE_TEMPLATES=false
SHOW_COMPANION_COPY=false
SHOW_SENSITIVE_VOICE_STYLES=false
SHOW_PUBLIC_GALLERY=false
SHOW_CUSTOM_IMAGE_PROMPTS=false
REQUIRE_CREEM_MODERATION=true
CREEM_MODERATION_FAIL_CLOSED=true
```

Suggested Creem re-review explanation:

```text
Keepsay is a fictional character creation and interactive storytelling product. It is not a dating service, adult chatbot, NSFW chatbot, face-swap product, or deepfake tool.

Users can create original fictional characters, chat within story scenes, save story memory, preview voices, and generate policy-safe character images. All image prompts are screened through Creem Moderation API in production. NSFW, explicit, sexually suggestive, deepfake, face manipulation, impersonation, and minor-related content are prohibited by our Terms and Acceptable Use Policy.
```

Include links:

```text
Homepage
Pricing
Terms of Service
Privacy Policy
Acceptable Use Policy
Safety page, if added
Support email
```

## Implementation Phases

### Phase 1: Public Review Surface

1. Add central compliance config module.
2. Unify public product name to Keepsay.
3. Rewrite homepage, footer, metadata, and pricing to low-risk positioning.
4. Filter sitemap high-risk paths in compliance mode.
5. Hide high-risk homepage SEO links.
6. Hide high-risk footer/resource links.

### Phase 2: Feature Visibility

1. Filter quick-create templates by compliance mode.
2. Filter voice profiles by compliance mode.
3. Hide public gallery or restrict it to approved safe characters.
4. Relabel public character page fields.
5. Hide or constrain custom image prompt input.

### Phase 3: Safety And Review Evidence

1. Enforce Creem Moderation for image generation.
2. Fail closed when moderation is unavailable.
3. Strengthen AUP and TOS.
4. Add a `/safety` page.
5. Add a compliance check script for high-risk public copy.
6. Prepare Creem re-review explanation and links.

Completed review links:

- Homepage: `/`
- Pricing: `/pricing`
- Safety: `/safety`
- Terms of Service: `/terms-of-service`
- Privacy Policy: `/privacy-policy`
- Acceptable Use Policy: `/acceptable-use-policy`
- Support: `support@keepsay.dpdns.org`

## Review-Mode Acceptance Checklist

```text
[x] Homepage has no girlfriend/boyfriend/crush/dating/NSFW/uncensored/intimacy wording
[x] Metadata has no Talkie clone / AI companion / roleplay app positioning
[x] Pricing product names are all Keepsay
[x] Pricing descriptions avoid romantic/private moments/photos when the moment hits
[x] Sitemap excludes high-risk SEO pages
[x] Footer has visible branded support email
[x] Terms of Service, Privacy Policy, and Acceptable Use Policy are public
[x] AUP/TOS explicitly state not dating, not adult, and not NSFW chatbot
[x] Image generation requires moderation
[x] Image generation blocks when moderation is unavailable
[x] Voice selector has no girlfriend/boyfriend/flirty/intimacy labels
[x] Quick Create has no Crush & Regret or similar sensitive public labels
[x] Review-Safe Mode replaces public homepage/API character exposure with neutral story, fantasy, learning, and creative-writing characters
[x] Review-Safe Mode blocks direct public access to risky seeded characters such as Chloe/Sienna
[x] Admin/backend can still restore hidden capabilities later
```

## Implementation Log

- 2026-06-18 14:01 CST: Added review-safe public character curation. In Review-Safe Mode, homepage SSR, public character list API, recommendation API, local fallback characters, and character detail API now filter risky public characters and fill with neutral illustrated story/learning/writing characters. Chloe/Sienna-style seed characters remain available when Review-Safe Mode is off, but are not exposed to public review surfaces while it is on.
- 2026-06-18 14:01 CST: Extended `pnpm check:creem-compliance` to verify the review-safe character module and route/API filtering hooks.

## Minimal Fast-Track Scope

If speed matters, implement only:

1. Env-driven compliance mode.
2. Public copy cleanup.
3. Sitemap filtering.
4. Voice API filtering.
5. Quick Create display filtering.
6. Image moderation fail-closed.
7. AUP/TOS additions.
8. Review-safe public character replacement/filtering.
9. `pnpm check:creem-compliance` high-risk word scan.

This preserves future flexibility while giving the Creem reviewer a cleaner, lower-risk public product surface.
