# RolePlay Billing Implementation Log

## 2026-05-31 Phase 0 - Read-Only Inventory

Status: done

### Goal

Freeze further changes, inspect the current implementation state, and identify the work needed to align the code with the detailed billing plan.

### Files Observed

- `src/shared/lib/roleplay-billing.ts`
- `src/shared/models/credit.ts`
- `src/shared/services/settings.ts`
- `src/config/locale/messages/en/pages/pricing.json`
- `src/config/locale/messages/zh/pages/pricing.json`
- `src/config/locale/messages/en/admin/users.json`
- `src/config/locale/messages/zh/admin/users.json`
- `src/app/[locale]/(admin)/admin/users/page.tsx`
- `src/app/[locale]/(admin)/admin/users/[id]/grant-credits/page.tsx`
- `src/app/api/roleplay/chat/route.ts`
- `src/app/api/roleplay/image/route.ts`
- `src/app/api/roleplay/tts/route.ts`
- `src/app/api/roleplay/ai-writer/route.ts`
- `src/app/api/roleplay/characters/[id]/publish/route.ts`

### Inventory Notes

- The project folder does not expose a `.git` directory, so inventory is based on targeted `rg` scans rather than `git diff`.
- Pricing has already been changed from ShipAny boilerplate products to low-priced RolePlay credit packs and subscriptions.
- Starter credits defaults have already been changed toward the design target: 120 credits for 10 days.
- A first version of the billing helper exists, but action names still need to be split to match the detailed plan.
- Admin free play is represented as a special 0-credit credit ledger grant with `roleplay_free_play`.
- Chat, image, TTS, AI Writer, and publish routes already have first-pass billing hooks.
- AI Writer currently uses the broad `roleplay_ai_writer` action; the plan requires `roleplay_ai_writer_text` for the text model call and a reserved image sub-action.
- Publish currently uses the broad `roleplay_publish` action; the plan requires public/private actions with private publish free.

### Verification

- Command: `rg -n "ROLEPLAY_CREDIT_COSTS|RoleplayBillingAction|roleplay_ai_writer|roleplay_publish|roleplay_free_play|First Spark|initial_credits_amount|GUEST_REPLY_COOKIE|consumeRoleplayCredits|assertRoleplayCreditsAvailable" src ../roleplay-billing-credits-design.md`
- Result: Found the current billing hooks and identified the action-name gaps above.

### Next

- Phase 1: establish this log file.
- Phase 2-4: normalize pricing/starter credits/action constants to the final plan.

## 2026-05-31 Phase 1 - Operation Log Established

Status: done

### Goal

Create a persistent implementation log and begin recording each step before continuing code changes.

### Files Changed

- `roleplay-billing-implementation-log.md`

### Changes

- Added this log file.
- Recorded the Phase 0 inventory and the initial implementation gaps.

### Verification

- Manual file creation check through `apply_patch`.

### Next

- Phase 2-4: normalize final billing action names and starter/pricing settings.

## 2026-05-31 Phase 2-4 - Billing Action Normalization

Status: done

### Goal

Align server-side billing action names with the detailed plan, especially for AI Writer model calls and public/private character publishing.

### Files Changed

- `src/shared/lib/roleplay-billing.ts`
- `src/app/api/roleplay/ai-writer/route.ts`
- `src/app/api/roleplay/characters/[id]/publish/route.ts`

### Changes

- Replaced the broad `roleplay_ai_writer` action with `roleplay_ai_writer_text` and reserved `roleplay_ai_writer_image`.
- Replaced the broad `roleplay_publish` action with `roleplay_publish_public` and `roleplay_publish_private`.
- Set P0 costs: text reply 1, image 40, voice 3, AI Writer text 5, AI Writer image 20, public publish 10, private publish 0.
- Updated AI Writer metadata with `subAction: text_generation`.
- Updated publish billing to use public/private action names.

### Verification

- Pending in Phase 15: lint and targeted source scan.

### Next

- Phase 5-12: review and tighten each billing integration point.

## 2026-05-31 Phase 5-12 - Billing Integration Review

Status: done

### Goal

Review the server-side billing hooks for admin free play, chat, image, TTS, AI Writer, and character publishing.

### Files Reviewed

- `src/shared/lib/roleplay-billing.ts`
- `src/shared/models/credit.ts`
- `src/app/[locale]/(admin)/admin/users/page.tsx`
- `src/app/[locale]/(admin)/admin/users/[id]/grant-credits/page.tsx`
- `src/app/api/roleplay/chat/route.ts`
- `src/app/api/roleplay/image/route.ts`
- `src/app/api/roleplay/tts/route.ts`
- `src/app/api/roleplay/ai-writer/route.ts`
- `src/app/api/roleplay/characters/[id]/publish/route.ts`

### Changes

- Confirmed free play is checked through the central billing helper.
- Confirmed AI Writer text generation checks credits before the model call and consumes credits only after a valid draft is produced.
- Confirmed AI Writer image generation remains disabled in the current endpoint and is represented as a reserved action.
- Confirmed publish billing is private-free and public-paid.
- Confirmed old broad action names were replaced in source references.

### Verification

- Command: `rg -n "roleplay_ai_writer|roleplay_publish" src/shared/lib src/app/api src/app/'[locale]' src/config/locale/messages -g '*.ts' -g '*.tsx' -g '*.json'`
- Result: Only the new split actions remain.

### Notes / Risks

- The P0 implementation still does not have full idempotency keys. Duplicate user requests may double-charge paid actions in rare retry cases.
- The guest gate uses a cookie in P0. It is enough for functional testing but not strong abuse control.
- Low-credit errors are currently string messages rather than a fully structured paywall payload.

### Next

- Phase 15: run JSON checks, action scans, lint, and TypeScript/build checks where feasible.

## 2026-05-31 Phase 15 - Verification

Status: done

### Goal

Validate JSON syntax, billing action references, TypeScript types, lint, and production build feasibility after the billing implementation.

### Files Changed During Verification

- `src/shared/lib/roleplay-ai.ts`

### Changes

- Added `billing` and `guestUsage` to `RoleplayReply` because the chat API now returns those fields. This fixed the TypeScript error introduced by the billing response metadata.

### Verification

- Command: `node -e "const fs=require('fs'); for (const f of ['src/config/locale/messages/en/pages/pricing.json','src/config/locale/messages/zh/pages/pricing.json','src/config/locale/messages/en/admin/users.json','src/config/locale/messages/zh/admin/users.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('json ok')"`
- Result: passed.

- Command: `rg --pcre2 -n "roleplay_ai_writer(?!_)|roleplay_publish(?!_)" src || true`
- Result: passed; no old broad action names found.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and 10 pre-existing warnings in unrelated files.

- Command: `npm run build`
- Result: inconclusive. The build stayed at `Creating an optimized production build ...` with no further output for several minutes. The process was stopped with `pkill -f "next build"` and exited with code 143. No build error was emitted before termination.

### Notes / Risks

- Build verification should be retried separately with a longer timeout or after checking Turbopack build behavior in this workspace.
- The implementation still lacks idempotency keys and structured low-balance payloads; those remain P1 hardening items.

### Final Status

- P0 billing implementation is in place.
- Static type and lint checks pass.
- Production build was attempted but did not complete within the observed window.

## 2026-05-31 Phase 16 - Build Retry And P1 Billing Hardening

Status: done

### Goal

Continue beyond the P0 implementation by retrying production build with webpack, adding structured low-balance responses, and adding P0 idempotency support for paid RolePlay actions.

### Files Changed

- `src/shared/lib/resp.ts`
- `src/shared/lib/roleplay-billing.ts`
- `src/app/api/roleplay/chat/route.ts`
- `src/app/api/roleplay/image/route.ts`
- `src/app/api/roleplay/tts/route.ts`
- `src/app/api/roleplay/ai-writer/route.ts`
- `src/app/api/roleplay/characters/[id]/publish/route.ts`

### Changes

- Retried production build with `npx next build --webpack`; it completed successfully.
- Extended `respErr` to accept optional structured response data.
- Added `RoleplayInsufficientCreditsError` with structured data:
  - `reason`
  - `action`
  - `requiredCredits`
  - `remainingCredits`
- Added `getRoleplayRequestIdempotencyKey`, reading `x-idempotency-key`, `idempotency-key`, or body `requestId`.
- Added P0 idempotency lookup against the recent active consumed credit ledger entries.
- Wired idempotency and structured low-balance handling into chat, image, TTS, AI Writer, and public publish routes.

### Verification

- Command: `npx next build --webpack`
- Result: passed. The build completed successfully with exit code 0. During static generation, `/api/roleplay/tags` logged `DATABASE_URL is not set`, but that error was caught by the route and did not fail the build.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `rg -n "RoleplayInsufficientCreditsError|getRoleplayRequestIdempotencyKey|idempotencyKey|reason: 'insufficient_credits'|respErr\\(.*data" src/shared src/app/api/roleplay -g '*.ts' -g '*.tsx'`
- Result: passed; structured low-balance and idempotency wiring is present in the paid RolePlay routes.

### Notes / Risks

- Idempotency is P0-level and ledger-backed. It prevents repeated charging for the same explicit key in normal retries, but it is not a full transactional uniqueness constraint.
- For best results, the client should pass a fresh `requestId` for each paid user action and reuse the same `requestId` only when retrying the same action.

### Final Status

- Production build now passes with webpack.
- Structured low-balance responses are available for paid RolePlay actions.
- Optional idempotency keys are supported through `x-idempotency-key`, `idempotency-key`, or body `requestId`.

## 2026-05-31 Phase 17 - Client Request IDs

Status: done

### Goal

Wire client-side paid RolePlay calls to send `requestId`, so the Phase 16 server-side idempotency support can prevent duplicate credit consumption during retries.

### Files Changed

- `src/shared/lib/roleplay-ai.ts`
- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/shared/components/roleplay/ai-writer-dialog.tsx`
- `src/shared/components/roleplay/roleplay-quick-create-wizard.tsx`
- `src/shared/components/roleplay/roleplay-character-edit-form.tsx`

### Changes

- Added `createRoleplayRequestId(prefix)` for browser-safe request id generation.
- Added `parseRoleplayInsufficientCreditsPayload` and `RoleplayInsufficientCreditsPayload` for future low-balance UI handling.
- Chat text sends now use stable request ids from the pending-send queue.
- Chat-triggered image generation sends `requestId`.
- AI Writer dialog and quick-create AI Writer calls send `requestId`.
- Character image generation from quick-create and edit forms sends `requestId`.
- Public/private publish calls from quick-create and edit forms send `requestId`.

### Verification

- Command: `rg -n "requestId: createRoleplayRequestId|parseRoleplayInsufficientCreditsPayload|type RoleplayInsufficientCreditsPayload|createRoleplayRequestId" src/shared -g '*.ts' -g '*.tsx'`
- Result: passed; paid client calls now send request ids.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Notes / Risks

- TTS currently has no direct client caller in the inspected roleplay components. The server endpoint still supports idempotency through headers/body `requestId`.
- Low-balance UI is not yet a dedicated modal; the typed parser is in place for the next UI pass.

### Final Status

- Client request id wiring is complete for chat, generated images, AI Writer, and publishing.
- Static checks and production build pass.

## 2026-05-31 Phase 18 - Low-Balance Frontend Messaging

Status: done

### Goal

Use the structured low-balance payload from paid RolePlay APIs to show clear client-side messages instead of a generic `insufficient credits` error.

### Files Changed

- `src/shared/lib/roleplay-ai.ts`
- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/shared/components/roleplay/ai-writer-dialog.tsx`
- `src/shared/components/roleplay/roleplay-quick-create-wizard.tsx`
- `src/shared/components/roleplay/roleplay-character-edit-form.tsx`

### Changes

- Added `formatRoleplayInsufficientCreditsMessage`.
- Added `getRoleplayApiErrorMessage` to convert structured low-balance payloads into user-facing messages.
- Updated chat, image generation, AI Writer, quick-create, and publish flows to use the helper.

### Verification

- Command: `rg -n "getRoleplayApiErrorMessage|formatRoleplayInsufficientCreditsMessage|payload\\?\\.message \\|\\| t\\('(image_generate_error|generate_error)'\\)|payload\\?\\.message \\|\\| 'publish failed'" src/shared -g '*.ts' -g '*.tsx'`
- Result: passed; key paid-roleplay call sites now use the low-balance helper.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Final Status

- Low-balance frontend messaging is wired into the primary paid RolePlay flows.
- A dedicated modal/paywall UI is still a future UX layer, but the message now includes the action, required credits, and remaining credits.

## 2026-05-31 Phase 19 - Low-Balance Action Toasts

Status: done

### Goal

Make low-balance errors actionable by adding a direct pricing-page CTA in toast-based paid RolePlay flows.

### Files Changed

- `src/shared/lib/roleplay-ai.ts`
- `src/shared/components/roleplay/roleplay-billing-toast.tsx`
- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/shared/components/roleplay/roleplay-quick-create-wizard.tsx`
- `src/shared/components/roleplay/roleplay-character-edit-form.tsx`

### Changes

- Added `RoleplayApiError`, carrying optional structured insufficient-credit details.
- Added `createRoleplayApiError` to preserve low-balance metadata through throw/catch flows.
- Added `showRoleplayApiErrorToast`, which shows the error and a `View plans` action when the error is caused by insufficient credits.
- Updated quick-create image generation, quick-create AI Writer, quick-create publish, edit-form image generation, and edit-form publish to use the actionable toast helper.
- Chat remains inline, but now throws `RoleplayApiError` so future chat paywall UI can inspect the same metadata.

### Verification

- Command: `rg -n "RoleplayApiError|createRoleplayApiError|showRoleplayApiErrorToast|getRoleplayApiErrorMessage" src/shared -g '*.ts' -g '*.tsx'`
- Result: passed; actionable billing toast wiring is present.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Final Status

- Toast-based paid RolePlay flows now show a `View plans` CTA on insufficient-credit errors.
- Inline flows still show clear low-balance text and preserve metadata for a future dedicated paywall panel.

## 2026-05-31 Phase 20 - Starter Credits And Free Play Hardening

Status: done

### Goal

Reduce account and admin edge cases around free credits and test entitlements.

### Files Changed

- `src/shared/models/credit.ts`

### Changes

- Added duplicate prevention for new-user starter credits.
- New starter credit grants now include metadata `{ type: "initial-credits", source: "new-user" }`.
- Duplicate detection also recognizes legacy descriptions: `initial credits` and `RolePlay starter credits`.
- Admin free-play grants now update the active grant expiration when re-submitted, instead of silently doing nothing.

### Verification

- Command: `rg -n "hasInitialCreditsGrant|initial-credits|INITIAL_CREDIT_DESCRIPTIONS|updatedAt: new Date\\(\\)\\.toISOString|metadata" src/shared/models/credit.ts`
- Result: passed; duplicate-prevention and free-play update logic are present.

- Command: `npx tsc --noEmit`
- Result: passed after adding an explicit type to the `existingGrants.some` callback.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Final Status

- Starter credits now have a best-effort one-time grant guard.
- Admin free-play test access can be refreshed with a new expiration by submitting the form again while enabled.

## 2026-06-01 Phase 21 - Admin Billing Bypass And TODO Snapshot

Status: done

### Goal

Fix the reported issue where an administrator chatting with zero credits saw `Not enough credits for this reply. Need 1, you have 0.`, and record the remaining billing work as TODOs.

### Files Changed

- `src/shared/lib/roleplay-billing.ts`
- `roleplay-billing-implementation-log.md`

### Changes

- Added admin permission bypass to `getRoleplayBillingEntitlement`.
- Users with `admin.access` now count as `freePlay: true` for all paid RolePlay actions.
- Existing explicit admin-granted free play still works for non-admin users.

### TODO

- First Spark one-time purchase eligibility and enforcement.
- Full `roleplay_usage` ledger for guest replies, text replies, media actions, voice seconds, phone minutes, and public submissions.
- Subscription entitlement resolver for Free / Lite / Plus / Pro feature flags and fair-use caps.
- Database-level idempotency uniqueness instead of recent-ledger scanning.
- Automatic refund helper for failures after credit consumption.
- Dedicated low-balance/paywall modal rather than toast/inline messaging.
- Guest abuse hardening with IP/device buckets beyond the current cookie gate.
- Optional daily drip credits and claim flow.
- Plan-aware paid-user hidden text allowance rather than visible per-reply consumption for every plan.

### Verification

- Command: `rg -n "admin.access|ADMIN_ACCESS_PERMISSION|getRoleplayBillingEntitlement|hasActiveRoleplayFreePlay" src/shared/lib/roleplay-billing.ts src/shared/models/credit.ts`
- Result: passed; admin permission bypass and explicit free-play grant checks are both present.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### How To Test

- Admin zero-credit chat: sign in as an admin user with `admin.access`, keep credits at 0, open any character chat, and send a message. Expected: reply succeeds; API response includes `billing.freePlay: true` and `billing.costCredits: 0`.
- Non-admin zero-credit guard: sign in as a normal user with 0 credits and no free-play grant, then send a chat message. Expected: request fails with `Not enough credits for this reply. Need 1, you have 0.`.
- Admin-granted free play: go to `/admin/users`, open a user, enter Grant Credits, enable `RolePlay Free Play`, set valid days, and submit. Expected: that non-admin user can use chat, image, voice, AI Writer, and publish actions without credit deduction while the grant is active.
- Revoke test: disable `RolePlay Free Play` for the same user and submit. Expected: if the user has 0 credits, paid RolePlay actions return the structured low-balance message again.
- AI Writer charge test: use a normal user with enough credits, run AI Writer once, and check credits reduce by 5. With admin/free-play, AI Writer should succeed with 0 cost.

### Final Status

- Admin users are now automatically treated as free-play users for RolePlay billing.
- Non-admin users still need credits unless an administrator grants RolePlay Free Play.
- Remaining unfinished items are tracked in the TODO list above.

## 2026-06-01 Phase 22 - Text Provider 401 Diagnostics

Status: done

### Goal

Make OpenRouter `401` text-provider failures easier to diagnose without logging API keys.

### Files Changed

- `src/shared/lib/server/roleplay-ai-config.ts`
- `src/shared/lib/ai-provider.ts`
- `src/app/api/roleplay/chat/route.ts`
- `roleplay-billing-implementation-log.md`

### Findings

- The reported log means OpenRouter rejected the active API key for `/chat/completions`.
- The text-provider candidate order is admin OpenRouter, admin generic, env generic, env Volcengine, env OpenRouter.
- A stale Admin Settings OpenRouter key can therefore be tried before a valid `.env` provider.

### Changes

- Added non-secret `origin` metadata to text provider candidates: `admin`, `env`, or `legacy`.
- Included `origin` in the roleplay provider fallback warning log.
- Future logs like `roleplay text provider failed, trying fallback` can now identify whether the failing key came from Admin Settings or environment variables.

### How To Test

- Reproduce the chat request with the current invalid OpenRouter key.
- Expected warning now includes `origin: "admin"` or `origin: "env"` along with provider, baseURL, model, and status.
- If `origin: "admin"`, update or clear OpenRouter settings in Admin Settings.
- If `origin: "env"`, update `OPENROUTER_API_KEY` or switch to the intended provider in `.env.development`, then restart the dev server.

### Verification

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Final Status

- No API keys are logged.
- OpenRouter 401 failures are now easier to trace to Admin Settings versus environment configuration.

## 2026-06-01 Phase 23 - Text Provider 429 Rate-Limit Fallback

Status: done

### Goal

Handle OpenRouter/free-model upstream `429` rate limits gracefully during RolePlay chat generation.

### Files Changed

- `src/app/api/roleplay/chat/route.ts`
- `roleplay-billing-implementation-log.md`

### Findings

- The reported error is not a credits billing error.
- OpenRouter returned `429` because `qwen/qwen3-next-80b-a3b-instruct:free` was temporarily rate-limited by the upstream provider `Venice`.
- The provider response included `Retry-After: 20`, so users should retry after about 20 seconds if no fallback provider is available.

### Changes

- Treat provider `429` as fallback-eligible when another text provider is configured.
- Parse `Retry-After`, `retry_after_seconds`, and `retry_after_seconds_raw` from the provider response.
- Include `retryAfterSeconds` in the fallback warning log.
- Normalize final `429` chat errors into a short user-facing message instead of returning the raw upstream JSON.
- Sanitize final `roleplay chat failed` logs so they include status, message, and retry-after seconds without dumping the full provider response body.

### How To Test

- Configure OpenRouter free model as the first provider and a valid fallback provider after it, then trigger a chat while OpenRouter is rate-limited. Expected: log shows `status: 429`, `retryAfterSeconds`, and fallback provider is attempted.
- Configure only the rate-limited OpenRouter free model, then trigger a chat. Expected: response status is `429` with a concise message like `Roleplay text provider is temporarily rate-limited. Please retry in about 20 seconds...`.
- For production reliability, prefer a paid/BYOK OpenRouter key, a non-free model, or Volcengine/generic provider as fallback.

### Verification

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Final Status

- OpenRouter/free-model temporary rate limits no longer block configured fallback providers.
- Final no-fallback `429` errors are now clearer and shorter.

## 2026-06-01 Phase 24 - Chat History Restore And Reply Latency

Status: done

### Goal

Fix reports that previous RolePlay chats disappeared and reduce slow chat reply latency.

### Files Changed

- `src/app/api/roleplay/chat/route.ts`
- `src/shared/components/roleplay/roleplay-chat.tsx`
- `roleplay-billing-implementation-log.md`

### Findings

- Chat restore could stop on the newest matched conversation even when that conversation had no messages, for example after a failed provider request created an empty conversation. Older conversations with messages could then appear missing.
- New conversations only wrote `characterId` for non-custom IDs containing `-`. If a valid persisted character used another ID shape, its conversations could be stored with `characterId: null`, making future matching depend only on the snapshot fallback.
- Normal text chat always paid for a second LLM call before the real reply to classify whether the user wanted a photo. This doubled the hot path for ordinary messages and became much worse when the first provider was slow, 401, or 429.
- The largest remaining variable is provider latency and fallback order, especially OpenRouter free models.

### Changes

- Chat restore now tries up to 6 matched conversations and skips empty ones until it finds stored messages.
- New persisted conversations now write `characterId` whenever the character is confirmed in the database, regardless of ID shape.
- Existing conversations with missing `characterId` are updated with the resolved stored character ID on the next successful chat.
- Photo intent detection no longer calls an LLM on every normal text message. It uses a direct keyword classifier and only marks obvious photo/selfie/image requests.
- Added slow chat timing logs for requests over 2.5s, with step timings for config/auth, provider resolution, conversation context, billing, photo intent, reply generation, credit consumption, and persistence.

### How To Test

- Open a character that previously looked empty. Expected: chat restore skips empty latest conversations and loads the newest conversation that actually has messages.
- Send a normal text message such as `今天好累`. Expected: `photo_intent` timing is near-zero and there is no extra classifier model request before the main reply.
- Send an explicit photo request such as `发一张自拍给我看看`. Expected: it still triggers the image-holding reply/image flow.
- Watch server logs for `roleplay chat timing:` on slow replies. The largest `steps[].ms` value identifies the slow segment.
- If `generate_reply` dominates, the active provider/model or fallback order is the bottleneck. If `conversation_context` dominates, database queries are the bottleneck.

### Verification

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and the same 10 unrelated warnings previously observed.

- Command: `npx next build --webpack`
- Result: passed. The local `DATABASE_URL is not set` message for `/api/roleplay/tags` was logged and caught again; build exited with code 0.

### Final Status

- Previous chats are less likely to appear missing due to empty latest conversations.
- Ordinary text replies avoid one unnecessary LLM call before generation.
- Slow replies now emit step-level timing logs so the next bottleneck can be targeted with evidence.

## 2026-06-02 Phase 25 - Starter Credits Recovery And Plan Gap Snapshot

Status: done

### Goal

Fix the reported new-user failure where chat returned `Not enough credits for this reply. Need 1, you have 0.` even though registered users should receive starter credits.

### Findings

- The product plan says registered free users should receive 120 starter credits valid for 10 days.
- The code had a new-user auth hook calling `grantCreditsForNewUser(user)`, but the grant depended entirely on `initial_credits_*` values being present in runtime configs.
- `getAllConfigs()` does not merge default values from `src/shared/services/settings.ts`; if the config table/env did not contain `initial_credits_enabled=true`, `initial_credits_amount=120`, and `initial_credits_valid_days=10`, the grant could silently skip.
- A user-create hook can also be missed by legacy/imported users or transient failures. Those users need a safe backfill and a lazy runtime recovery path.

### Files Changed

- `src/shared/models/credit.ts`
- `src/shared/lib/roleplay-billing.ts`
- `scripts/backfill-roleplay-starter-credits.ts`
- `package.json`
- `roleplay-billing-implementation-log.md`

### Changes

- Added code-level starter credit defaults:
  - enabled: `true`
  - amount: `120`
  - valid days: `10`
  - description: `RolePlay starter credits`
- `grantCreditsForNewUser` now resolves missing config values to the product-plan defaults while still respecting explicit disabled / zero settings.
- Added runtime logs for starter credit outcomes:
  - disabled
  - non-positive amount
  - existing grant
  - grant success
- Added a lazy starter-credit recovery step before paid RolePlay billing checks. If a logged-in user has no initial starter grant because the auth hook was missed, the server grants the starter credits before checking the balance.
- Preserved duplicate prevention: users with active or expired starter grants, or legacy starter descriptions, are not granted again.
- Added `scripts/backfill-roleplay-starter-credits.ts` for existing affected users.
- Added npm script `roleplay:backfill-starter-credits`.

### Backfill Usage

- Dry run recent users:
  - `npm run roleplay:backfill-starter-credits -- --since-days=14`
- Apply for recent users:
  - `npm run roleplay:backfill-starter-credits -- --since-days=14 --apply`
- Diagnose or apply one user:
  - `npm run roleplay:backfill-starter-credits -- --email=user@example.com`
  - `npm run roleplay:backfill-starter-credits -- --email=user@example.com --apply`

### Current Billing Plan Status

Landed or mostly landed:

- Registered starter credits: fixed and hardened in this phase.
- Free text chat credit consumption: implemented through `roleplay_text`.
- Image, voice, AI Writer text, and public/private publish costs: implemented through central RolePlay billing actions.
- Low-balance structured API payloads and pricing CTA toasts: implemented.
- Ledger-backed idempotency for explicit request IDs: implemented at P0 level.
- Admin free-play bypass and admin-granted free play: implemented.
- Pricing page has RolePlay credit packs and Lite / Plus / Pro subscriptions.

Not fully landed:

- First Spark one-time eligibility enforcement.
- Guest 3-reply soft prompt and stronger 6-reply abuse controls beyond cookie gate.
- Full `roleplay_usage` ledger for guest replies, text replies, media actions, voice seconds, phone minutes, and public submissions.
- Subscription entitlement resolver for Free / Lite / Plus / Pro plan feature flags and fair-use caps.
- Paid-user hidden text allowance instead of visible per-reply credit burn.
- Database-level idempotency uniqueness.
- Automatic refund helper after provider failure or failed media generation.
- Dedicated low-balance/paywall modal.
- Daily drip credits and claim/streak loop.
- Public submission quotas, creator rewards, phone mode, and video/live-action preview.

### How To Test

- Register a new account with no `initial_credits_*` rows in config. Expected: auth hook grants 120 starter credits for 10 days.
- Use an existing logged-in user with no starter grant and 0 credits, then send a RolePlay chat message. Expected: billing lazily grants starter credits, then the reply proceeds and consumes 1 credit.
- Use a user with an existing or expired starter grant. Expected: no duplicate starter grant is created.
- Run the backfill script in dry-run mode and confirm it lists only recent users missing starter grants.

### Verification

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and 10 pre-existing warnings in unrelated files.

### Final Status

- New registered users no longer depend on pre-seeded `initial_credits_*` database config rows to receive the planned 120 starter credits.
- Existing affected users can recover automatically on their next paid RolePlay action or be repaired through the dry-run/apply backfill script.

## 2026-06-02 Phase 26 - Low-Credit Payment Guidance

Status: done

### Goal

When a paid RolePlay action returns `Not enough credits...`, guide the user toward the pricing / credit purchase page instead of leaving them at a dead-end error.

### Files Changed

- `src/shared/components/roleplay/roleplay-chat.tsx`
- `src/shared/components/roleplay/roleplay-billing-toast.tsx`
- `src/config/locale/messages/en/roleplay.json`
- `src/config/locale/messages/zh/roleplay.json`
- `roleplay-billing-implementation-log.md`

### Changes

- RolePlay chat now tracks structured `insufficient_credits` payloads from `RoleplayApiError`.
- Chat send, image generation from chat, OOC regenerate, and voice generation all route billing errors through the same low-credit handler.
- Low-credit chat errors now render an inline payment guidance panel with:
  - low-credit title
  - the original required/remaining credits message
  - a localized required/remaining hint
  - a `View plans` / `查看套餐` CTA linking to `/pricing`
- Non-billing errors still render as the existing compact red error line.
- Existing toast-based billing errors now localize the pricing action label for Chinese browser language.

### How To Test

- Use a non-admin user with 0 credits and no starter/free-play grant, then send a chat message. Expected: inline low-credit panel appears with a pricing CTA.
- Trigger voice generation with 0 credits. Expected: the same low-credit panel appears in chat.
- Trigger an image/AI Writer/publish low-credit toast outside chat. Expected: toast includes a pricing CTA; Chinese browser language shows `查看套餐`.

### Verification

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and 10 pre-existing warnings in unrelated files.

### Final Status

- Low-credit chat failures now have a direct pricing-page CTA.
- Existing paid RolePlay toast errors keep their pricing CTA and now use a Chinese label when the browser language is Chinese.

## 2026-06-02 Phase 27 - Account Level And Benefits Visibility

Status: done

### Goal

Make it obvious where users can see their credits, account level, and plan benefits.

### Findings

- Credits were already visible in the signed-in avatar dropdown when `show_credits` is enabled.
- `/settings/credits` already shows the current credit balance and credit ledger.
- `/settings/billing` showed only the current subscription plan name and subscription table; it did not clearly expose account level or concrete benefits.

### Files Changed

- `src/app/[locale]/(landing)/settings/billing/page.tsx`
- `src/config/locale/messages/en/settings/billing.json`
- `src/config/locale/messages/zh/settings/billing.json`
- `roleplay-billing-implementation-log.md`

### Changes

- Added account-level visibility to `/settings/billing`.
- Added available credits and current plan credit grant to the billing summary.
- Added a benefits panel for Free / Lite / Plus / Pro with localized titles, subtitles, and unlocked capabilities.
- Added a direct `View Credits` / `查看积分` action from Billing to `/settings/credits`.

### Current User-Facing Locations

- Avatar dropdown: quick remaining credits.
- `/settings/credits`: remaining credits and credit ledger.
- `/settings/billing`: account level, available credits, plan credits, current subscription, and benefits.
- `/pricing`: upgrade / buy credits.

### Verification

- Command: `node -e "const fs=require('fs'); for (const f of ['src/config/locale/messages/en/settings/billing.json','src/config/locale/messages/zh/settings/billing.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('json ok')"`
- Result: passed.

- Command: `npx tsc --noEmit`
- Result: passed.

- Command: `npm run lint`
- Result: passed with 0 errors and 10 pre-existing warnings in unrelated files.

### Final Status

- Users now have clear places to inspect credits, account level, and benefits.
