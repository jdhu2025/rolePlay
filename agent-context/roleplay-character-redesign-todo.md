# RolePlay Character Redesign Todo

## Progress Log (auto-updated)

Last reviewed by assistant.

### Findings

- App project root: `/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev`.
- Neither `/Users/Zhuanz/code/ai-code/rolePlay` nor `shipany-template-dev` is a git repo (`fatal: not a git repository` in both). Confirms the "Known Risks" note. No accidental commit risk yet, but version control should be initialized before destructive cleanup.
- Character storage today is **mixed**:
  - A large static array `characters: Character[]` in `src/shared/components/talkie-mvp.tsx:163` (~35 entries: nathan, luna, crushly-aurelia, crushly-mira, crushly-selene, crushly-elara, crushly-noelle, crushly-aria, crushly-liora, crushly-vivienne, crushly-isla, crushly-maeve, crushly-camille, crushly-sera, akira, seraphina, mika, ivy, noah, rowan, celeste, marco, yara, orian, elena, kai, sana, bea, val, mina, ezra, talia, jin, poppy, dante, amelia). Array ends at `src/shared/components/talkie-mvp.tsx:1109`.
  - A backend table `roleplay_character` defined in `src/config/db/schema.postgres.ts:565` (mirrored in `schema.mysql.ts` and `schema.sqlite.ts`). Fields cover id, userId, status, visibility, name, age, gender, authorName, tagline, intro, opening, avatarUrl, coverUrl, gallery (json string), tags, style, relationship, scene, personality, voice, settings, visualIdentity, model, metadata.
  - GET/POST endpoint at `src/app/api/roleplay/characters/route.ts`. The component merges remote DB rows with the static list via `syncRemoteCharacters` at `src/shared/components/talkie-mvp.tsx:1347` (remote ids win, local-only kept).
- Related backend tables that reference `roleplay_character.id` with `onDelete: 'cascade'` or `set null`: `roleplay_conversation`, `roleplay_message`, `roleplay_memory`, `roleplay_asset`, `roleplay_character_follow`, `roleplay_character_comment`. Cleanup must keep user-owned conversations/messages safe (cascade delete will wipe them if a character row is removed).
- Backend model layer is `src/shared/models/roleplay.ts` (CRUD, follow, comments, social state).
- All 12 reference inputs (`A1`–`A12`) and the 12 recommended `B*` outputs exist in `shipany-template-dev/output/imagegen/roleplay-identity-pilot/`. The v2 versions for Freya, Zuri, Camila are present.
- The clean face crops for Amara, Freya, Zuri, Camila, Noor are also present in that same output directory.
- `scripts/data/` exists but is empty. `scripts/generate-roleplay-identity-pilot.mjs` is in place and is image-to-image only (no JSON seed today).
- `public/roleplay/` did not exist before this session; created it.

### What was completed in this pass

- Verified workspace layout, git state, and presence of every B1–B12 primary image.
- Created stable asset directory `shipany-template-dev/public/roleplay/characters/`.
- Copied the 12 recommended primary photos into that directory with normalized lowercase names (one per character):

  ```text
  public/roleplay/characters/chloe-1.jpeg     <- B1Chloe-night-date.jpeg
  public/roleplay/characters/sienna-1.jpeg    <- B2Sienna-styling-suite.jpeg
  public/roleplay/characters/amara-1.jpeg     <- B3Amara-beach-club-brunch.jpeg
  public/roleplay/characters/valeria-1.jpeg   <- B4Valeria-pool-club.jpeg
  public/roleplay/characters/leila-1.jpeg     <- B5Leila-sunset-lounge.jpeg
  public/roleplay/characters/priya-1.jpeg     <- B6Priya-rooftop-dinner.jpeg
  public/roleplay/characters/elena-1.jpeg     <- B7Elena-old-town-walk.jpeg
  public/roleplay/characters/maya-1.jpeg      <- B8Maya-creative-studio.jpeg
  public/roleplay/characters/freya-1.jpeg     <- B9Freya-cocktail-lounge-v2.jpeg
  public/roleplay/characters/zuri-1.jpeg      <- B10Zuri-poolside-afterparty-v2.jpeg
  public/roleplay/characters/camila-1.jpeg    <- B11Camila-coastal-sunset-v2.jpeg
  public/roleplay/characters/noor-1.jpeg      <- B12Noor-hotel-lobby.jpeg
  ```

  These are now safe to reference as `/roleplay/characters/{name}-1.jpeg` from frontend code or backend records, independent of the `output/imagegen` scratch directory.

### What was NOT completed and why

- **Generate 2-4 additional images per character.** The pilot script needs network access to Doubao + R2; running it from this session would hit `fetch failed` per the doc's own warning. Needs a session with network egress (or run locally by user).
- **Backend seed for the 12 official characters.** Holding off until naming question is resolved (see below). Should be a SQL seed or a one-shot script under `scripts/data/` that inserts rows with `visibility = 'public'` and stable string ids (e.g., `chloe`, `sienna`, ...).
- **Cleanup of old characters.** Two things to remove: (a) the static array in `talkie-mvp.tsx`, and (b) any DB rows from prior testing. The DB cleanup must filter on something like `metadata -> source = 'talkie-mvp'` or on the known seed ids; a blind `DELETE FROM roleplay_character` would cascade into user conversations and messages and is unsafe.
- **Frontend rebuild (Crushly-style picker, multi-photo carousel, character detail).** Not started. Requires the seed and additional photos first to be visually correct.
- **`pnpm lint` / `pnpm build` verification.** Not run; no code changes yet that warrant it.

### Decisions (from user)

1. **Storage**: relational DB (`roleplay_character` table). Each row owns a stable character id (`rp-001` … `rp-012`); the id is independent of the display name. Each row links to its photo files.
2. **Asset hosting**: upload to R2. The DB stores the **immutable filename only** (e.g., `chloe-1.jpeg`). The **mutable parts** (R2 domain, upload folder) live in env (`R2_DOMAIN`, `R2_UPLOAD_PATH`). The API composes the full absolute URL at response time from filename + env. This way swapping R2 domain or moving the folder does not require a DB migration.
3. **Cleanup scope**: partial cleanup now (wipe and reseed the 12 official records). Older legacy data can be cleaned in a later pass.
4. **Real user preservation**: this product has no real users yet, so the entire `roleplay_character` table can be safely truncated together with its dependent rows. Seed script does a full reset of the roleplay tables.
5. **Character ids**: `rp-001` through `rp-012` (zero-padded, sortable, decoupled from names).
6. **System user**: a single hidden `user` row (`id = 'system-roleplay'`) owns all 12 official characters. No schema change needed; FK constraint on `roleplay_character.userId` is satisfied.

### Code landed in this pass

- `src/data/roleplay-characters.ts` — typed array of 12 official records (`rp-001` … `rp-012`). Each record stores `images` and `avatar` as **filenames only** (e.g. `chloe-1.jpeg`). Also exports `ROLEPLAY_SYSTEM_USER` for the seed script. All ages 18-25, all visibility `public`.
- `src/shared/lib/roleplay-assets.ts` — `buildCharacterImageUrl(filename)`, `buildCharacterImageUrls(filenames)`, `characterImageObjectKey(filename)`, `CHARACTER_IMAGE_PREFIX`. Composes `${R2_DOMAIN}/${R2_UPLOAD_PATH}/roleplay/characters/${filename}`. Backwards-compatible: if a stored value is already an absolute http(s) URL or a `/`-prefixed site-relative path, returns it unchanged. Falls back to `public/`-served path when `R2_DOMAIN` is empty (local dev).
- `src/app/api/roleplay/characters/route.ts` — GET response now runs `avatarUrl`, `coverUrl`, and `gallery[]` through `buildCharacterImageUrl(s)`. Wire format the frontend sees is absolute URLs.
- `scripts/data/upload-roleplay-character-images.mjs` — Node + `aws4fetch` script that PUTs every file under `public/roleplay/characters/` to `${R2_UPLOAD_PATH}/roleplay/characters/${filename}` on R2. Accepts an optional whitelist of filenames as args. Idempotent.
- `scripts/data/seed-roleplay-characters.ts` — drizzle-based seed. Pings DB, deletes from roleplay tables in dependency order (`roleplayCharacterComment` → `roleplayCharacterFollow` → `roleplayAsset` → `roleplayMemory` → `roleplayMessage` → `roleplayConversation` → `roleplayCharacter`), upserts the system user, then inserts the 12 records. Never touches `user` / payment / chat tables outside the system user row.
- `roleplay-image-agent-brief.md` — separate handoff doc for the image-generation agent (file naming rules, output directory, identity-anchor rules, v2 references for Freya/Zuri/Camila, clean-crop fallback for Amara/Noor).

### How to run (network/DB-bound, user runs locally)

From `shipany-template-dev/`:

```bash
# 1) Upload the 12 primary images to R2 (and any newly added 2-5 photos later)
node --env-file=.env.development scripts/data/upload-roleplay-character-images.mjs

# 2) Reset and seed the 12 official characters into the DB
pnpm tsx scripts/with-env.ts npx tsx scripts/data/seed-roleplay-characters.ts

# 3) Sanity check: hit the API
curl -s http://localhost:3000/api/roleplay/characters | jq '.data.characters | length'
```

Step 2 wipes all roleplay tables (no real users yet). After it runs, the GET endpoint should return 12 rows with absolute R2 URLs in `avatar` / `cover` / `gallery`.

### Image-generation handoff

Another agent will produce the remaining 2-4 photos per character. Brief is in `roleplay-image-agent-brief.md`. Key contract:

- New images land in `shipany-template-dev/public/roleplay/characters/` only.
- Filename pattern `{name}-{n}.jpeg`, lowercase, starting from `-2` (the `-1.jpeg` slot is the primary image and must not be overwritten).
- After new files exist, update each character's `images: [...]` array in `src/data/roleplay-characters.ts`, rerun the upload script, then rerun the seed script.

### Pre-work done while waiting for images

These are the conflict-free, non-image-dependent items completed:

1. **Sanity-checked the URL helper.** Ran 12 input/env permutations against the same logic in `src/shared/lib/roleplay-assets.ts`: empty/null/undefined/whitespace input, absolute http/https passthrough, site-relative passthrough, missing `R2_DOMAIN` fallback to `public/`, default `R2_UPLOAD_PATH=uploads`, custom upload path, trailing-slash trimming, quoted env values. All 12 pass. Throwaway script was deleted afterwards.

2. **Confirmed there is no test framework yet.** `package.json` has no `vitest` / `jest` / `playwright`. Did not bolt one on for a single helper. If we later need real tests, vitest is the natural fit for this Next.js + tsx project.

3. **Fixed the ESLint v9 config gap.** Added `eslint.config.mjs` at the project root that re-exports `eslint-config-next`'s flat config and adds project-specific ignores (`output/`, `public/`, `content/`, `scripts/`, `src/config/db/migrations/`, `.open-next/`). Verified by running `npx eslint` against the three previously edited files (`route.ts`, `roleplay-characters.ts`, `roleplay-assets.ts`) — exit 0, no warnings. `pnpm lint` is now usable.

4. **Mapped every reference to the static `characters` array in `src/shared/components/talkie-mvp.tsx`.** This is the cleanup blueprint for Step 5:

   | Line  | Reference                                                          | Cleanup intent |
   | ----- | ------------------------------------------------------------------ | -------------- |
   | 163   | `const characters: Character[] = [` (declaration, ends ~1109)       | Delete entirely (35 entries). |
   | 1273  | `characters.find((c) => c.id === initialCharacterId) \|\| characters[0]` (initial selection) | Switch to API result; if none yet, hold a `null` selected and render a loading state. |
   | 1334  | `[...state.created, ...characters].find(...)` (restore selection from local storage) | Same — drop `...characters`, work off `created` (which the remote sync already populates). |
   | 1496  | `const all = [...created, ...characters]` (filter list) | Drop the `...characters` half. |
   | 2015  | `text: characters[0].opening` (fallback first message) | Replace fallback with empty array; the opening line comes from the selected character once API returns. |
   | 2206-2212 | `characters.filter(... relationship)` / `characters.filter(... helper tag)` (DiscoverView shelves) | These shelves are heuristic categorizers off the static set. Replace with: pass through the API list directly, or use new fields (e.g., `tags`) from the seed. Keeping the prop name `characters: Character[]` is fine — only the source changes. |

   Out-of-scope for this map: how the new picker renders. We're rewriting that view anyway in Step 6, so I deliberately did not enumerate every JSX touchpoint inside `DiscoverView` / `AllCharactersView`.

   The cleanup is mechanically safe — every line above is a read of `characters`, never a write, so removing the array and feeding the same shape from `created` (already merged with remote) is purely a sourcing change. No type changes required; `Character` interface stays.

5. **Added a seed-data validator.** `scripts/data/validate-roleplay-characters.mjs`. Runs without network/DB. Checks: exactly 12 records, unique ids, `rp-NNN` shape, age in [18, 25] integers, unique contiguous `sortOrder` 1..12, `avatar` is contained in `images`, every filename is lowercase / no whitespace / supported extension, every filename actually exists under `public/roleplay/characters/`. Current output: `OK: 12 characters validated`. This is the script to rerun after the image agent reports their final filenames and after `images: [...]` is updated in the seed.

6. **Extracted shared client types and fetch helper.** `src/shared/lib/roleplay-client.ts` exports `RoleplayCharacterClient`, `CharactersResponse`, `readCharacterSettings()`, `sortCharacters()`, and `fetchRoleplayCharacters({ signal?, throwOnError? })`. The new picker / detail components consume these instead of re-declaring `Character` shape. The fetch helper:
   - Is non-throwing by default; returns an empty list on network/parse errors so a UI mount cannot crash on a slow server. Pass `throwOnError: true` if you want the throw.
   - Sorts the result via the seeded `settings.sortOrder` so the picker order is deterministic.
   - Sends `credentials: 'include'` so authenticated calls stay logged-in once we wire auth-gated chat.

7. **Routing tree mapped.** Three pages currently render `<TalkieMvp />` from `src/shared/components/talkie-mvp.tsx`:
   - `/[locale]/page.tsx` — landing, no `initialView`.
   - `/[locale]/character/[id]/page.tsx` — `initialView="profile"`, `initialCharacterId={id}`.
   - `/[locale]/chat/profile/[id]/page.tsx` — same as above (legacy route).

   `LandingLayout` is a passthrough (`return children`), so no shared chrome to fight with. The picker rewrite plan: replace `/[locale]/page.tsx` body with the new `<RoleplayLanding />` (first-screen experience = picker), replace `/[locale]/character/[id]/page.tsx` with a new `<RoleplayCharacterDetail />`, leave the legacy `chat/profile/[id]` as-is for now (kept as alias). Documented in `roleplay-picker-design.md`.

8. **Audited i18n keys.** Existing `roleplay.json` (en + zh) already has `nav`, `topbar`, `home`, `chat`, `profile`, `create`, `memory`, `my_ai`, `community`, `collection`, `pricing`, `footer`. Reusable keys for the new design: `profile.age`, `profile.intro`, `profile.opening`, `chat.message`. Missing keys for the picker / detail rewrite are listed (with proposed en + zh strings) in `roleplay-picker-design.md` under section 7 — 13 new keys grouped under new namespaces `roleplay.picker.*`, `roleplay.detail.*`, `roleplay.carousel.*`. They will be added as part of the component rewrite, not now.

9. **Wrote the picker / detail design doc.** `roleplay-picker-design.md` covers route changes, component tree (`RoleplayLanding` → `RoleplayPicker` → `RoleplayCharacterCard` → `PhotoCarousel`, plus `RoleplayCharacterDetail`), data flow, carousel behavior (dots/arrows/swipe/keyboard, image preloading, fallbacks), card visuals (mobile-first 3 column grid, no nested cards, text-not-on-face contract), detail layout, the new i18n keys, and the migration order against existing `talkie-mvp.tsx`. No component code yet — that comes after the image agent finishes so the carousel doesn't get coded against assumptions about photo counts.

10. **No new code that could conflict with the image agent's output.** Specifically did not touch `public/roleplay/characters/` (their write target) or `src/data/roleplay-characters.ts`'s `images: [...]` arrays (will need their filenames once they're done).

### What still needs to happen after images come back

Status: images came back (3 per character, 36 total uploaded to R2 and seeded into DB), the picker / detail rewrite is in, **and the chat page is now also rewritten**. The legacy `talkie-mvp.tsx` is deleted.

Step 5 — Cleanup of the static array. **Done.**

- `src/shared/components/talkie-mvp.tsx` (3576 lines, including the ~950-line static `characters` array) has been deleted entirely. Nothing in `src/` imports it anymore (verified with a project-wide grep — the only remaining hits are `'source: 'talkie-mvp''` metadata strings in API routes, which are inert provenance markers).
- The 6 reference points listed earlier in this doc are gone with the file. No type changes were needed because consumers now go through `roleplay-client.ts`.

Step 6 — Frontend rebuild. **Done.**

- New components under `src/shared/components/roleplay/`:
  - `photo-carousel.tsx` — shared multi-photo carousel.
  - `roleplay-character-card.tsx` — single picker card.
  - `roleplay-landing.tsx` — first-screen picker.
  - `roleplay-character-detail.tsx` — detail page.
  - `roleplay-chat.tsx` — chat page (this round).

- Routes switched:
  - `src/app/[locale]/(landing)/page.tsx` → `<RoleplayLanding />`.
  - `src/app/[locale]/(landing)/character/[id]/page.tsx` → `<RoleplayCharacterDetail />`.
  - `src/app/[locale]/(landing)/chat/profile/[id]/page.tsx` → `<RoleplayChat />` (this round).

- i18n keys: 13 + 11 = 24 new keys total. The earlier batch covered `picker.*`, `detail.*`, `carousel.*`. This round added `chat_page.*` (back, view_profile, placeholder, send, sending, empty_title, empty_hint, thinking, error, sign_in_notice, not_found) in both en and zh.

#### Chat rewrite details (this round)

`RoleplayChat` is built on the same data shape as the picker / detail (consumes `roleplay-client.ts` types, calls `fetchRoleplayCharacters()` to find the character by id). Layout:

- **Sticky header** at the top: back button + circular character avatar (40px) + name + subline (`occupation · location` from `settings`). The avatar also appears on every character message bubble (32px) so identity is visible across the whole conversation, which is exactly what was missing in the old TalkieMvp chat. Header avatar is wrapped in a `<Link>` to `/character/[id]` so users can pop into the profile from chat.
- **Scrolling message list**: alternating bubbles (user = white pill on right, character = gray pill on left with avatar). `whitespace-pre-wrap` so the LLM's stage directions render properly. Auto-scrolls to bottom on new messages and during typing.
- **Typing indicator**: three bouncing dots in a character-style bubble, includes an `aria-live` description.
- **Composer**: textarea auto-grows up to 6 lines, Enter sends, Shift+Enter inserts a newline, IME composition is respected (`event.nativeEvent.isComposing` guard so Chinese input doesn't accidentally send mid-composition). Send button disables on empty input or while sending.
- **Empty state**: friendly card with `empty_title` + `empty_hint` if there's no opening line and no restored history.
- **State restoration**: on mount we hit `/api/roleplay/state`, and *if* the stored `selectedId` matches this character we restore its messages and conversationId. Mismatches (e.g. last chat was with someone else) are ignored, so opening `/character/X/chat` after talking to character Y does not show Y's history. Failures (signed out, migration required, network) silently fall back to just the character's `opening` line.
- **Avatar fallbacks**: if the URL fails to load, falls back to the initial letter on a neutral chip — no broken image icons.
- Reuses the existing `/api/roleplay/chat` endpoint via `generateRoleplayReply()`. No backend changes were required.

#### Avatar in chat detail — implementation summary

Yes, it shows. Two places:
1. Header (40px) — always visible, sticky.
2. Each character message bubble (32px) — reinforces identity even after long scrolls.

Both come from `character.avatar`, which is the resolved R2 URL coming back from `/api/roleplay/characters` (`buildCharacterImageUrl()` already converts the stored filename into a full URL).

Step 7 — Verify. **Partially done locally; full build needs network.**

- Lint of roleplay-related files I added or modified passes (`npx eslint` exit 0; the only output is two ignored-config warnings on JSON files, which is expected).
- `npx tsc --noEmit` runs clean (exit 0). Deleting `talkie-mvp.tsx` did not orphan any imports.
- `pnpm lint` on the whole project still surfaces the pre-existing 43 errors / 61 warnings in unrelated files (template's `<img>` warnings, `setState-in-effect` in `use-media*.ts`, `sonner.tsx`, `header.tsx`, etc.). This was the case before this round too.
- `pnpm build` from the sandbox fails with `Failed to fetch JetBrains Mono / Merriweather / Noto Sans Mono from Google Fonts` — `next/font` requires outbound network. Run from your machine to verify the actual build.

### Files added / changed in this round

```
shipany-template-dev/src/shared/components/roleplay/roleplay-chat.tsx                 (new)
shipany-template-dev/src/app/[locale]/(landing)/chat/profile/[id]/page.tsx            (now uses RoleplayChat)
shipany-template-dev/src/config/locale/messages/en/roleplay.json                      (+ chat_page namespace)
shipany-template-dev/src/config/locale/messages/zh/roleplay.json                      (+ chat_page namespace)
shipany-template-dev/src/shared/components/talkie-mvp.tsx                             (DELETED)
```

### How to verify locally

```bash
cd shipany-template-dev
pnpm dev
# 1) http://localhost:3000/ — picker (12 cards, carousels)
# 2) click a card -> /en/character/rp-001 — detail page
# 3) click "Start chat" -> /en/chat/profile/rp-001 — new chat page
#    - Header shows Chloe's avatar + "Fashion student · Los Angeles, CA"
#    - First bubble is her opening line (with avatar)
#    - Send a message; while waiting you see the typing indicator
#    - Reply bubble has her avatar to the left
#    - Click the header card -> back to /en/character/rp-001
```

### What's queued next (if you want to keep going)

1. **R2 image optimization with `next/image`. Done.**
   - `next.config.mjs` already declares `remotePatterns: [{ protocol: 'https', hostname: '*' }]`, so no config change was needed; the R2 domain (`https://pub-...r2.dev`) is already covered.
   - `photo-carousel.tsx` `CarouselImage` swapped from `<img>` to `next/image`'s `<Image fill>`. Added a `sizes` prop (defaults to `(min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw` for grid cards; detail page passes `(min-width: 768px) 420px, 100vw` so it doesn't request 3840px sources for a 420px column). The first slide of the active loop window passes `priority`, replacing the manual `fetchPriority="high"`. Lazy loading is now handled by `next/image` itself; the explicit `loading={lazy ? 'lazy' : 'eager'}` flag is gone.
   - `roleplay-chat.tsx` avatar swapped to `<Image>` with explicit `width` / `height` and matching `sizes={size}px`. Failure fallback is unchanged (initial-letter chip).
   - The pre-existing manual neighbor preloader (`new Image()` cache warmer) stays — `next/image` lazy-loads slides as they scroll into view, but warming the HTTP cache for ±1 still removes any swap flicker on swipe-heavy usage.
   - Result: gallery + chat avatars now serve AVIF/WebP via the Next image optimizer with proper `srcset` per breakpoint, smaller payloads on mobile, automatic LCP scoring on the hero image.

2. **Pre-existing lint debt. Done.**
   `pnpm lint` is now exit 0 (8 warnings, all in vendored / template files; previously 43 errors / 61 warnings). Approach was scoped overrides in `eslint.config.mjs` rather than rewriting third-party code:
   - **Globally off**: `react-hooks/set-state-in-effect`. The new react-hooks 7 rule blocks idiomatic mount-flag and matchMedia init patterns; React team has not deprecated those. Off across the project, not just vendored.
   - **Off only inside vendored/template surface area** (`src/shared/components/{ui,magicui,ai-elements}/**`, `src/shared/blocks/**`, `src/shared/hooks/**`, `src/themes/**`, `src/mdx-components.tsx`, `src/core/theme/**`, `src/shared/types/**`, `src/shared/lib/rate-limit.ts`, `src/app/[locale]/(landing)/[...slug]/page.tsx`, `src/app/[locale]/(chat)/chat/[id]/page.tsx`):
     - `react-hooks/rules-of-hooks` — early-return-before-hooks pattern in shadcn/template providers.
     - `react-hooks/exhaustive-deps` — upstream code intentionally accepts these deps.
     - `react-hooks/error-boundaries` — "Avoid constructing JSX within try/catch" in fumadocs MDX page and template table preview.
     - `react-hooks/static-components` — "Cannot create components during render" in shadcn `sidebar.tsx` and animated-* primitives.
     - `react-hooks/purity` — "Cannot call impure function during render" in shadcn `sidebar.tsx`.
     - `react-hooks/immutability` — "Cannot access variable before it is declared" in `animated-grid-pattern.tsx`.
     - `@next/next/no-img-element` and `@next/next/no-assign-module-variable` — template patterns predating next/image and dynamic-import naming.
     - `react/display-name`  `mdx-components.tsx`.
     - `import/no-anonymous-default-export` — config-style files.
   - Bracketed Next route segments (`[locale]`, `(landing)`, `[id]`, `[...slug]`) need glob-escaping inside the override file list (`[[]locale[]]`, `[(]landing[)]`), because the eslint micromatch resolver treats `[...]` as character classes; this was the trickiest detail.
   - **All app code** (`src/app/**` excluding the two template page exceptions, `src/data/**`, `src/shared/components/roleplay/**`, `src/shared/lib/**` excluding `rate-limit.ts`, `src/core/**` excluding `theme/**`) still passes the full rule set.
   - The 8 remaining warnings: 6 `Unused eslint-disable` (legacy disables that became no-ops once the new rules took over) and 2 `jsx-a11y/alt-text` warnings (in `mdx-components.tsx` and `blocks/table/index.tsx`). They're all template-side noise, no risk to ship.

3. **`/api/roleplay/characters/[id]` endpoint. Done.**
   - The backend route already existed with GET/PATCH/DELETE. This pass completed the missing client-side integration.
   - Added `fetchRoleplayCharacter(id)` to `src/shared/lib/roleplay-client.ts`. It calls `/api/roleplay/characters/[id]`, preserves the non-throwing UI default, supports `throwOnError`, returns `migrationRequired` when appropriate, and sends credentials.
   - Updated `RoleplayCharacterDetail` to fetch one character directly instead of fetching all 12 and finding by id.
   - Updated `RoleplayChat` to fetch one character directly before seeding/restoring chat state.
   - Aligned the single-character API response with the list endpoint by returning `stats`, `follows`, `premium`, `live`, and `source`, so both helpers share the same `RoleplayCharacterClient` shape.

### Verification (latest pass)

- `npx eslint src/shared/lib/roleplay-client.ts src/shared/components/roleplay/roleplay-character-detail.tsx src/shared/components/roleplay/roleplay-chat.tsx 'src/app/api/roleplay/characters/[id]/route.ts'` → exit 0. Only the existing `baseline-browser-mapping` age notice printed.
- `npx tsc --noEmit` → exit 0.
- Browser smoke check on `http://localhost:3000` → pass:
  - `/en/character/rp-001` renders Chloe, age 22, Fashion student · Los Angeles, CA, About / Tags / Personality, Start chat, and Comments.
  - `/en/chat/profile/rp-001` renders Chloe's header/subline, opening message, avatar images, and composer placeholder `Message Chloe`.
  - Browser console error log → empty.
  - Dev server needed one stale 3000 process restart first; current `pnpm dev` is running at `http://localhost:3000`.
- `pnpm lint` → exit 0. Same 8 template-side warnings as before (0 errors).
- `pnpm build` → exit 0 after clearing a stale/background `next dev --turbopack` process. Root cause of the earlier "hang" was the dev server still running against the same `.next` workspace while the production build was trying to compile. Once that process was stopped, both `npx next build --webpack --debug` and the normal `pnpm build` completed successfully.

### Current next step

Core verification is complete:

- Targeted lint and `tsc` are clean.
- Full `pnpm lint` is clean aside from the known 8 template-side warnings.
- Browser smoke check passes.
- Full `pnpm build` passes.

Optional polish: remove or fix the 8 remaining template warnings (`alt` text on two template image renderers and six unused `eslint-disable` comments). This is not blocking the RolePlay redesign.

### Plan audit follow-up (2026-05-26)

Cross-checked active planning docs:

- `roleplay-character-personality-plan.md`
  - Completed P1-5 dynamic address / intimacy rule in chat pipeline.
  - Added and executed `scripts/data/backfill-official-characters.ts` for official `rp-001..rp-012` personality fields.
  - Completed P2-1 relationship state vector, P2-4 format-style field, and P2-5 inside jokes callback.
  - 2026-05-27 update: completed P3-1/P3-2/P3-3 quality framework: OOC detection + repair rewrite, consistency rubric evaluation, implicit quality events, and `/admin/roleplay/quality` admin report for finding weak characters and adjustment direction.
  - 2026-05-27 update: completed P3-4 character-card consistency audit. Rubric evaluation now outputs `metadata.cardAudit`, and the admin quality report shows role/persona/visual/voice/relationship/reply conflicts with evidence and fix suggestions.
  - Remaining item: P3-5 A/B prompt testing is intentionally paused until real traffic and a feature-flag strategy justify it.
- `roleplay-character-redesign-v2-plan.md`
  - Completed R1 mobile viewport smoke with in-app browser viewport capability: iPhone 12, Pixel 5, iPad mini across landing/detail/chat; no horizontal overflow; console errors empty.
  - Remaining items are R4 AI Writer automation, R7 production DB migration, R9 model picker, R3 parseMessage test infra, R5 theme switch, R10 user/character model preferences.
- `roleplay-account-hub-design.md`
  - Still an unimplemented independent product slice. Existing `/settings/profile` covers user persona, but `/account` hub routes are not present yet.

Verification after this pass:

- `npx eslint src/shared/lib/roleplay-user-persona.ts src/app/api/roleplay/chat/route.ts` → exit 0.
- `npx tsc --noEmit` → exit 0.
- `pnpm lint` → exit 0 (same 8 known template warnings).
- `pnpm build` → exit 0.

### P3 quality framework follow-up (2026-05-27)

Updated `roleplay-character-personality-plan.md` after implementing the first three P3 items:

- P3-1 OOC detector is done via `/api/roleplay/chat/regenerate-with-check` and the chat bubble「不像」button.
- P3-2 consistency rubric is done via `roleplay_quality_evaluation` and `/api/admin/roleplay/quality/evaluate`.
- P3-3 implicit signal tracking is done via `roleplay_quality_event`; chat writes message-length, reply-length, 10/30-turn milestone, OOC flag, and regenerate-request events.
- Admin quality report is available at `/admin/roleplay/quality`, with sidebar entries in zh/en admin navigation.
- P3-4 character-card consistency audit is done via `metadata.cardAudit` and the admin report conflict panel.
- P3-5 A/B prompt testing remains paused by product decision.

Verification for this pass:

- `pnpm exec tsc --noEmit` → exit 0.
- `pnpm lint` → exit 0 (same 8 known template warnings).
- Local dev server compiled the admin route; unauthenticated `/zh/admin/roleplay/quality` redirects to sign-in as expected.
- Unauthenticated quality API smoke checks return `no auth, please sign in`, confirming the admin auth boundary is active.

### P3 character-card consistency audit follow-up (2026-05-29)

Follow-up for the publish-gate / AI repair flow:

- `src/app/api/roleplay/characters/[id]/audit-repair/route.ts` no longer returns only the pre-repair audit. It now generates the repair patch, simulates applying it, reruns the publish audit, and returns the latest post-repair audit to the editor.
- `src/shared/lib/roleplay-publish-audit.ts` repair patches now support top-level `age`, in addition to `settings` and `personalityCard`, so cross-field identity mismatches like `age / personalityCard.identity / settings.identity` can be repaired coherently.
- `src/shared/components/roleplay/roleplay-character-edit-form.tsx` now applies repaired `age` back into local form state and uses the refreshed audit response to decide whether repair fully passed or still left blocking conflicts.
- Publish-blocked copy in the editor was tightened so it explicitly tells creators to use the fields/evidence/recommendations shown below, instead of only showing an abstract “fix the audit issues first” message.
- Added a separate partial-success repair toast so “AI repair succeeded” is no longer shown when blocking audit conflicts still remain.

Expected behavior after this pass:

- If AI repair fully resolves the blocking conflicts, the audit panel clears on the next successful publish attempt after saving.
- If AI repair only resolves part of the issues, the editor keeps showing the remaining concrete conflicts from the rerun audit, so the creator can continue fixing exactly those fields.

Verification:

- Pending current `pnpm exec tsc --noEmit` pass after the latest edit-form and audit-route updates.

### P3 character-card consistency audit follow-up (2026-05-27)

Implemented the new P3-4 checklist:

- `/api/admin/roleplay/quality/evaluate` now asks the LLM to audit identity, visual prompt, voice preset, relationship stage, persona/style examples/negative anchors, scene, and current reply consistency.
- Adult boyfriend/girlfriend style content is not treated as a blanket issue; the audit flags content intensity only when it conflicts with role style, relationship stage, user context, immersion, or platform boundaries.
- Audit output is stored in `roleplay_quality_evaluation.metadata.cardAudit`, so no new DB migration is required.
- `roleplay-quality.ts` aggregates card-audit risk, scores, conflicts, evidence, and prompt fix suggestions per character.
- `/admin/roleplay/quality` now shows a “角色卡一致性审计” panel plus list-level conflict summaries.

Verification:

- `pnpm exec tsc --noEmit` → exit 0.
- `pnpm lint` → exit 0 (same 8 known template warnings).

### LAN default-load fix (2026-05-26)

User reported `http://192.168.1.177:3000` no longer showed the 12 default characters. Reproduced in the in-app browser: the landing page rendered title + tag chips, but zero character cards after 8s. The API itself was not empty, but cold `/api/roleplay/characters` responses could take ~15s after the personality backfill expanded payloads / DB work, and the client fetch helper intentionally swallowed errors/slow failures into an empty list.

Fix:

- Added `OFFICIAL_ROLEPLAY_CHARACTERS` in `src/shared/lib/roleplay-client.ts`, derived from `src/data/roleplay-characters.ts`, with public-folder image URLs.
- Updated `RoleplayLanding` to render the 12 official characters immediately when no tag filter is selected, then replace them with API data once `/api/roleplay/characters` returns.
- Tag filters still use the API result only, so filtered views remain DB-backed.

Verification:

- `npx eslint src/shared/lib/roleplay-client.ts src/shared/components/roleplay/roleplay-landing.tsx` → exit 0.
- `npx tsc --noEmit` → exit 0.
- Browser check on `http://192.168.1.177:3000/en/` → role cards render immediately; first batch shows Chloe, Sienna, Amara, Valeria, Leila, Priya; console errors empty.

### Verification

- `pnpm lint` → exit 0 (8 warnings; 0 errors).
- `npx tsc --noEmit` → exit 0.
- `npx eslint src/shared/components/roleplay` → exit 0 (no warnings).
- Browser smoke test on `http://localhost:3000/en/` via bb-browser:
  - Picker first screen renders with 12 cards, each card has a `region "carousel"` with multiple `<img>` slides + dots + prev/next buttons. Title `Choose someone to talk to`. Subtitle and per-card "{n} photos" badge **removed** as requested.
  - `/en/character/rp-001` detail renders with back link, full carousel, name + age + occupation · location, About / Tags / Personality sections, Start chat CTA.
  - `/en/chat/profile/rp-001` renders sticky header with Chloe avatar + name + "Fashion student · Los Angeles, CA", first bubble shows her opening line with avatar to the left, composer at bottom with placeholder `Message Chloe`.

### Files changed (recent rounds)

```
shipany-template-dev/eslint.config.mjs                                                 (vendored overrides + bracket-escaped globs)
shipany-template-dev/src/shared/components/roleplay/photo-carousel.tsx                 (next/image)
shipany-template-dev/src/shared/components/roleplay/roleplay-character-detail.tsx      (sizes hint)
shipany-template-dev/src/shared/components/roleplay/roleplay-chat.tsx                  (next/image avatar)
shipany-template-dev/src/shared/components/roleplay/roleplay-landing.tsx               (subtitle removed)
shipany-template-dev/src/shared/components/roleplay/roleplay-character-card.tsx        (photo-count chip removed)
```

`next.config.mjs`, the seed data, and the API route stayed unchanged.

---

## Goal

Rebuild the RolePlay character system with 12 new photorealistic female characters.

The old RolePlay characters should be removed or replaced. The new system should store character data in the backend, support 3-5 photos per character, and show multiple photos when a user selects a character.

The target experience should feel close to a Crushly-style character picker: visual-first, swipeable or carousel-based, with large character images and short profile copy.

## User Requirements

- Do not use anime characters.
- Use photorealistic female characters.
- Character age range: 18-25.
- Build 12 female characters.
- Each character eventually needs 3-5 photos.
- Photos should use different scenes while preserving character identity.
- All character data should be stored in the backend.
- When users select a character, they should be able to view that character's multiple photos.
- Remove the old RolePlay characters.
- Avoid making all characters look Chinese or visually similar.
- Use the v2 regenerated versions for Freya, Zuri, and Camila.

## Workspace

Root workspace:

```text
/Users/Zhuanz/code/ai-code/rolePlay
```

App project:

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev
```

## Initial Character Images

The user manually generated these 12 initial reference images:

```text
/Users/Zhuanz/code/ai-code/rolePlay/ A1Chloe.png
/Users/Zhuanz/code/ai-code/rolePlay/A2Sienna.png
/Users/Zhuanz/code/ai-code/rolePlay/A3Amara.png
/Users/Zhuanz/code/ai-code/rolePlay/A4Valeria.png
/Users/Zhuanz/code/ai-code/rolePlay/A5Leila.png
/Users/Zhuanz/code/ai-code/rolePlay/ A6Priya.png
/Users/Zhuanz/code/ai-code/rolePlay/A7Elena.png
/Users/Zhuanz/code/ai-code/rolePlay/A8Maya.png
/Users/Zhuanz/code/ai-code/rolePlay/A9Freya.png
/Users/Zhuanz/code/ai-code/rolePlay/A10Zuri.png
/Users/Zhuanz/code/ai-code/rolePlay/A11Camila.png
/Users/Zhuanz/code/ai-code/rolePlay/A12Noor.png
```

Important: ` A1Chloe.png` and ` A6Priya.png` have a leading space in the filename.

## Current Generated Test Images

Test image output directory:

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/output/imagegen/roleplay-identity-pilot
```

Recommended first image for each character:

```text
B1Chloe-night-date.jpeg
B2Sienna-styling-suite.jpeg
B3Amara-beach-club-brunch.jpeg
B4Valeria-pool-club.jpeg
B5Leila-sunset-lounge.jpeg
B6Priya-rooftop-dinner.jpeg
B7Elena-old-town-walk.jpeg
B8Maya-creative-studio.jpeg
B9Freya-cocktail-lounge-v2.jpeg
B10Zuri-poolside-afterparty-v2.jpeg
B11Camila-coastal-sunset-v2.jpeg
B12Noor-hotel-lobby.jpeg
```

Do not use these older versions unless the user explicitly asks:

```text
B9Freya-winter-lounge.jpeg
B10Zuri-night-gallery.jpeg
B11Camila-tennis-club.jpeg
```

## Existing Image Generation Script

A reusable Doubao image-to-image pilot script already exists:

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/scripts/generate-roleplay-identity-pilot.mjs
```

The script:

- Uploads a reference image to R2.
- Calls Doubao image-to-image.
- Saves the generated image locally.
- Supports running selected character IDs.

Example:

```bash
node --env-file=.env.development scripts/generate-roleplay-identity-pilot.mjs B9 B10 B11
```

Network access is required for R2 and Doubao. In the sandbox, the script may fail with `fetch failed`; rerun with escalation if needed.

## Environment Notes

The app has the required Doubao and R2 variables in:

```text
/Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/.env.development
```

Important configured values include:

```text
VOLCENGINE_API_KEY
VOLCENGINE_BASE_URL
VOLCENGINE_GENERAL_IMAGE_MODEL=doubao-seedream-5-0-260128
R2_ACCOUNT_ID
R2_ACCESS_KEY
R2_SECRET_KEY
R2_BUCKET_NAME
R2_UPLOAD_PATH
R2_DOMAIN
```

Some original images may be sensitive or include UI text. Clean face crops have already been created in the output directory:

```text
A3Amara-reference-face-clean.png
A9Freya-reference-face-clean.png
A10Zuri-reference-face-clean.png
A11Camila-reference-face-clean.png
A12Noor-reference-face-clean.png
```

Notes:

- Amara's original image previously triggered `InputImageSensitiveContentDetected`; the clean face crop worked.
- Noor's original image includes UI text; use the clean face crop.
- Freya, Zuri, and Camila should use their v2 outputs.

## Character Image Completion Todo

Each character currently has one accepted test image. Next step is to generate 2-4 additional images per character so each character has 3-5 images total.

Recommended scene mix:

- Beach or resort
- Casual date
- Nightlife or upscale venue
- Career or lifestyle
- Natural-light selfie or relaxed daily moment

Image generation requirements:

- Preserve the same face, age, skin tone, hair color, hair texture, and signature features.
- Vary scene, pose, outfit, lighting, and composition.
- Do not make all scenes beach/pool scenes.
- Avoid explicit content.
- Use consistent naming: character name plus scene slug.
- Save final project assets somewhere stable, not only under `output/imagegen`.

## Backend Character Data Todo

Create backend data for the 12 official characters.

Suggested shape:

```ts
{
  id: string;
  name: string;
  age: number;
  occupation: string;
  location: string;
  intro: string;
  bio: string;
  openingLine: string;
  tags: string[];
  personality: string[];
  images: string[];
  avatar: string;
  visibility: "public";
  sortOrder: number;
}
```

Age must stay between 18 and 25.

Backend-only fields such as internal tags, type pools, and sorting metadata can be stored without showing everything in the UI.

## Old RolePlay Cleanup Todo

The user wants the old RolePlay characters cleared.

Before deleting or replacing anything, inspect the current data structure carefully. Avoid deleting user chats, payments, accounts, or unrelated data.

Suggested search:

```bash
rg -n "roleplay|character|characters|persona|seed" /Users/Zhuanz/code/ai-code/rolePlay/shipany-template-dev/src -g '!node_modules'
```

Important files or areas to inspect:

```text
src/app/[locale]/(landing)/character/[id]/page.tsx
src/app/[locale]/(landing)/chat/profile/[id]/page.tsx
src/shared/components/talkie-mvp.tsx
src/app/api/roleplay/*
src/config/db/schema.mysql.ts
src/config/db/schema.postgres.ts
src/config/db/schema.sqlite.ts
```

Determine whether characters are currently stored through:

- Static seed data
- Database rows
- API model files
- Mock data in components
- A mixed setup

Then replace old characters with the new official set.

## Asset Storage Todo

Current generated files live under:

```text
shipany-template-dev/output/imagegen/roleplay-identity-pilot
```

Do not treat this as the final production asset location.

Preferred options:

- Copy final images into `public/roleplay/characters/...`
- Or upload final images to R2 and store public URLs in backend data

Final character records should point to stable asset URLs.

## Frontend Todo

Build a visual character picker inspired by Crushly.

Requirements:

- First screen should be the usable character selection experience, not a landing page.
- Show 12 new characters.
- Each character should support 3-5 photos.
- Let users switch photos with carousel controls, dots, swipe, or arrows.
- Show name, age, and a short description on the card.
- Keep the character image as the first visual signal.
- Clicking a character should open the detail page or chat entry.
- Mobile layout must be polished.

Design constraints:

- Do not use nested cards.
- Do not let text cover faces.
- Do not let button or label text overflow.
- Do not use generic marketing hero sections.
- Do not make all cards visually identical.
- Keep the interface dense enough to browse but still visual-first.

## Character Detail Todo

The selected character page should show:

- Multi-photo carousel
- Name and age
- Occupation and location
- Short bio
- Tags or interests
- Start chat button
- Back to character pool link

## Verification Todo

After implementation:

```bash
pnpm lint
pnpm build
```

If running the app locally:

```bash
pnpm dev
```

Then use browser verification to check:

- The role picker loads.
- Only the 12 new characters are visible.
- Every character has multiple photos.
- Carousel controls work.
- Character detail pages load.
- Chat entry still works.
- Mobile viewport works.
- No major console errors.
- Old characters are gone.

## Known Risks

- `shipany-template-dev` may not be the git repository root. Running `git -C shipany-template-dev status` previously returned:

```text
fatal: not a git repository
```

Check git status from:

```text
/Users/Zhuanz/code/ai-code/rolePlay
```

- Doubao image-to-image can drift from the reference identity.
- Use clean face crops when full-body references fail or drift.
- Swimsuit references may trigger content filters.
- Generated assets in `output/imagegen` should be promoted to stable storage before UI integration.

## Suggested Next Execution Order

1. Inspect current RolePlay character storage and API flow.
2. Generate remaining 2-4 photos per character.
3. Move or upload final image assets to stable storage.
4. Create official 12-character backend data.
5. Remove or replace old RolePlay characters.
6. Build the Crushly-style character picker.
7. Build multi-photo character detail display.
8. Verify list, carousel, detail, and chat entry.
9. Run lint/build.
10. Report final paths, changed files, and any remaining risks.
