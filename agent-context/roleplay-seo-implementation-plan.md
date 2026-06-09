# RolePlay SEO Implementation Plan

Last updated: 2026-06-09 17:32 Asia/Shanghai

## Goal

Improve crawlability and search-result quality for the current Vercel preview domain while leaving the final production domain setup as a tracked pending item.

## Current Findings

- `https://role-play-eta.vercel.app/en` is indexable and renders meaningful content.
- Lighthouse SEO is 92 on mobile and desktop.
- `robots.txt` points to `/sitemap.xml`, but the sitemap currently contains `https://your-domain.com/...`.
- `/en` and `/en/character/rp-anime-001` both canonicalize to the root URL, even though `localePrefix` is configured as `always`.
- Character detail pages inherit the generic `RolePlay` title and generic MVP description.
- PageSpeed Insights has no CrUX field data for this preview domain yet.

## Scope

### In Scope Now

- Canonical URL correctness for localized pages.
- Locale alternate links correctness.
- Dynamic sitemap generation using the current app URL.
- Homepage metadata that describes the actual AI roleplay product.
- Character detail metadata for long-tail roleplay character pages.
- Remove stale static sitemap data that references `your-domain.com`.
- Add lightweight verification scripts for URL rules.
- Strengthen search display copy around `AI Character Chat`, `AI Roleplay`,
  `Character.AI alternative`, and `Best Character AI alternatives` style
  discovery terms.
- Add visible homepage and character-page subtitle content that matches the
  metadata vocabulary.

### Pending Until Domain Is Ready

- Configure final production domain in Vercel.
- Set `NEXT_PUBLIC_APP_URL` to the final domain.
- Re-run PageSpeed Insights and Search Console URL inspection against the final domain.
- Submit final-domain sitemap to Google Search Console.
- Add brand/legal contact replacements for `your-domain.com` in legal pages and footer links.

## Domain And Long-Tail Landing Page Strategy

### Product Positioning To Encode In Naming

The brand/domain should not only sound like a generic AI chat product. It should
hint at the RolePlay-specific advantages:

- Fast character creation: users can create a character quickly, not spend an hour configuring prompts.
- Memory: the AI companion remembers the user, their story, and relationship context.
- Private bonds: users and characters can build small secrets, promises, inside jokes, rituals, and recurring agreements.
- Emotional search intent: the strongest query family is close to `ai companion that remembers you`, plus "not alone", "crush", "story", "secret", and "memory" variations.

### Naming Principles

- Prefer short, emotional, and pronounceable names over literal keyword stuffing.
- The main brand should carry feeling: remembered, accompanied, trusted, secret, ongoing.
- SEO-heavy exact-match phrases should live in subdomains or landing pages, not necessarily in the main brand.
- Avoid names that sound too clinical (`MemoryBot`) or too narrow (`AnimeOnlyChat`) for the main brand.
- Do not claim "no filter" as a brand promise. If targeting no-filter queries, use careful comparison-page language around creative freedom, safety, and content boundaries.

### Main Domain Candidate Shortlist

These are naming candidates only. Availability, trademark risk, and final TLD fit still need checking.

| Candidate | Why It Fits | SEO/Brand Angle | Risk |
| --- | --- | --- | --- |
| `Withly` | Warm, simple, immediately suggests companionship. | Good for "with you" / companion positioning. | Less explicit about memory. |
| `Memora` | Directly suggests remembered stories and continuity. | Strong fit for memory-focused pages. | May be less playful. |
| `Keepsay` | Suggests kept promises, remembered words, and private agreements. | Good match for secrets/rituals. | Slightly unusual spelling. |
| `Pactly` | Strongly signals small promises and agreements between user and character. | Distinctive for "secrets and promises" feature. | Could feel formal if copy is not warm. |
| `Secretly` | Direct hit on secrets and private bonds. | Very memorable emotional hook. | Common word; availability/trademark likely hard. |
| `Crushly` | Strong emotional driver for crush-style AI chat. | Strong for Z-gen, crush, boyfriend/girlfriend intent. | Narrows perception toward romance. |
| `Reverie` | Immersive, dreamy, story-first. | Good for bedtime / escape / story roleplay. | Less direct about memory. |
| `Arcana` | Unlocking, secrets, mystery, anime/game affinity. | Strong for voice/photo/secret unlock mechanics. | More fantasy-coded. |
| `Unsolo` | Directly targets "not alone" and lonely/solo emotional intent. | Powerful companion positioning. | Can feel heavy if not softened. |
| `Rememberly` | Very clear "remembers you" promise. | Strong exact emotional SEO alignment. | Longer and more literal. |

Recommended direction:

1. `Withly` if the product wants the broadest international companion feel.
2. `Memora` if memory is the central differentiator.
3. `Pactly` if "small secrets and promises with your character" becomes the moat.
4. `Crushly` if the go-to-market leans into crush/romance discovery.

### Domain Query Notes

Initial live query notes from 2026-06-09:

- `ai-companion-that-remembers-you.dpdns.org` is reported as already registered/unavailable. Treat it as the ideal keyword phrase and page intent, not as the usable domain.
- The next five near-exact memory candidates are also reported as already registered/unavailable: `ai-companion-who-remembers-you.dpdns.org`, `ai-companion-remembers-you.dpdns.org`, `ai-companion-with-memory.dpdns.org`, `ai-roleplay-that-remembers-you.dpdns.org`, and `ai-character-that-remembers-you.dpdns.org`.
- Re-rank the remaining candidates by low competition, not only semantic closeness. Broad `AI roleplay with memory` has relevant product pages already, so the next experiment should target narrower `AI roleplay memory`, `story memory`, and `private memory` phrases.
- The next six low-competition candidates are also reported as already registered/unavailable: `ai-roleplay-memory.dpdns.org`, `roleplay-chatbot-with-story-memory.dpdns.org`, `ai-roleplay-that-remembers-story.dpdns.org`, `private-ai-roleplay-with-memory.dpdns.org`, `ai-character-chat-story-memory.dpdns.org`, and `ai-character-with-private-memory.dpdns.org`.
- Local `dig` results are not reliable in this environment because DNS resolves random `.dpdns.org` and unrelated domains to sequential `198.18.0.x` addresses. Use Cloudflare DNS-over-HTTPS or the `.dpdns.org` registration UI for availability checks.
- Cloudflare DNS-over-HTTPS returned NXDOMAIN for the fallback batch led by `ai-roleplay-secret-memory.dpdns.org`, but the DigitalPlat registration UI still reports these names as already registered. Treat the registration UI as authoritative; DNS is only a weak early filter for this namespace.
- There is no legitimate way to bypass an already-registered public namespace label. The workable options are: switch to another DigitalPlat suffix such as `.qzz.io`, `.us.kg`, or `.xx.kg`; register a more unique brandable base label and put exact SEO terms in URL paths; or buy/transfer the existing label if the owner is reachable.
- `keepsay.dpdns.org` is reported as available. Use it as the single canonical brand domain if registered. Do not use the two-domain plan with `ai-companion-that-remembers-you.dpdns.org` because that SEO domain is unavailable.
- `bb-browser` daemon timed out during RDAP/domain checks in the current local session. Use it again after the daemon is healthy, or check through a registrar.
- Search results show `memora.com` has long-standing registration and existing domain records, so treat `Memora` as a brand idea but not as an easy `.com` candidate.
- Search results show `rememberly.com` is registered and appears to be for sale, so treat it as a high-cost/low-priority acquisition path.
- Search results show existing `pactly.com` material, so `Pactly` needs deeper trademark/domain checks before serious use.

### Updated Naming Recommendation After SERP Review

The SERP for `ai companion that remembers you` already contains products and
threads explicitly using "remembers you" language. That validates the search
intent, but it also means a main brand that is only a memory word may blend in.

Prefer a brand that combines memory with private relationship mechanics:

| Candidate | Why It Is Stronger For RolePlay |
| --- | --- |
| `Pactly` | Best fit for "small secrets and agreements"; distinctive if domain/trademark clears. |
| `Withly` | Broadest companion brand; easy to explain as "the AI companion with you". |
| `Keepsay` | Suggests remembered words, promises, and inside jokes. |
| `Hushly` | Signals secrets/private bonds; warm if styled carefully. |
| `Vowly` | Strong on promises/rituals; compact and emotional. |
| `Bondly` | Direct relationship continuity; simpler than memory-only names. |
| `Murmurly` | Private, intimate, story-like; less generic, more atmospheric. |
| `Recallia` | More memory-forward, but softer than `Rememberly`. |
| `Everwith` | Directly says ongoing companionship; good for "not alone" positioning. |
| `Secreta` | Strong secret-space signal; needs trademark/language checks. |

Working recommendation: shortlist `Withly`, `Keepsay`, `Vowly`, `Bondly`, and
`Everwith` before `Memora` / `Rememberly`, because the latter two are more
obvious memory words and already appear crowded or occupied.

### Keyword Matrix

One page should map to one search intent cluster, not one isolated keyword.

#### Layer 1: Competitor Alternative Pages

These are high competition but strategically necessary. They are the pages that
let the product show up in "best alternatives" and migration searches.

| Landing Page | Primary Intent Cluster |
| --- | --- |
| `/character-ai-alternative` | `character ai alternative`, `best character ai alternatives`, `sites like character ai` |
| `/talkie-ai-alternative` | `talkie ai alternative`, `ai roleplay app like talkie but better` |
| `/polybuzz-alternative` | `polybuzz alternative`, `apps like polybuzz`, `character chat alternatives` |

#### Layer 2: Feature-Specific Pages

These are lower competition and closer to RolePlay's actual product strengths.

| Landing Page | Primary Intent Cluster |
| --- | --- |
| `/ai-companion-with-memory` | `ai companion that remembers you`, `character ai alternative with memory`, `ai roleplay with long term memory` |
| `/create-ai-character-free` | `create custom ai character free`, `create ai character with backstory free`, `how to create your own ai character for free` |
| `/ai-character-chat-with-voice` | `ai character chat with voice`, `ai character chat that unlocks voice`, `voice AI roleplay` |
| `/private-ai-roleplay-secrets` | `ai companion with secrets`, `ai roleplay with private memories`, `chat with ai character who knows you` |

#### Layer 3: Low-Competition Long-Tail Pages

These should be prioritized after canonical/sitemap/metadata are stable because
they can rank faster than broad competitor terms.

| Landing Page | Primary Intent Cluster |
| --- | --- |
| `/anime-character-ai-chat` | `anime character ai chat no login`, `what app lets you chat with anime characters`, `anime AI roleplay` |
| `/ai-boyfriend-remembers-your-story` | `ai boyfriend that remembers your story`, `lonely AI companion`, `not alone AI chat` |
| `/roleplay-stories-character-ai-alternative` | `character ai alternative for roleplay stories`, `immersive roleplay chat`, `AI story companion` |

#### Layer 4: Question Pages / People Also Ask

These can be standalone article-style pages or sections inside the relevant
landing pages.

| Question | Recommended Destination |
| --- | --- |
| `what is the best character ai alternative in 2026` | `/character-ai-alternative` |
| `which ai character app has the best memory` | `/ai-companion-with-memory` |
| `is there an ai like character ai with no filter` | `/character-ai-alternative` with careful safety language |
| `how to create your own ai character for free` | `/create-ai-character-free` |
| `what app lets you chat with anime characters` | `/anime-character-ai-chat` |

### `.dpdns.org` Subdomain Mapping Option

If using `.dpdns.org` as a temporary SEO/domain experiment surface, use exact
intent subdomains for testing, then consolidate or 301 to the final domain once
the production domain is ready.

| Subdomain | Intent |
| --- | --- |
| `character-ai-alternative.dpdns.org` | Competitor alternative broad page |
| `talkie-ai-alternative.dpdns.org` | Talkie migration page |
| `polybuzz-alternative.dpdns.org` | PolyBuzz comparison page |
| `ai-roleplay-with-memory.dpdns.org` | Memory moat page |
| `ai-character-chat-with-memory.dpdns.org` | Character chat memory page |
| `create-ai-character-free.dpdns.org` | Fast creation / free creation page |
| `anime-ai-character-chat.dpdns.org` | Anime roleplay long-tail page |
| `ai-companion-with-long-term-memory.dpdns.org` | Durable companion memory page |

Important: do not split authority forever. These subdomains are useful for
experiments, but the final production strategy should consolidate ranking
signals under the chosen brand domain with clean internal links and canonical
URLs.

### Ranking-First `.dpdns.org` Candidate Order

If the goal is ranking first rather than brand taste, prefer exact-match or
near-exact-match subdomains. Brandable names can still be used for the product,
but they should not be the only SEO entry point.

| Priority | Candidate | Target Query Cluster | Ranking Rationale |
| --- | --- | --- | --- |
| 0 | `ai-companion-that-remembers-you.dpdns.org` | `ai companion that remembers you` | Ideal exact match, but reported unavailable. Keep as keyword/page target only. |
| 0 | `ai-companion-who-remembers-you.dpdns.org` | `AI companion who remembers you`, `ai companion that remembers you` | Near-exact substitute, but reported unavailable. |
| 0 | `ai-companion-remembers-you.dpdns.org` | `AI companion remembers you`, `ai companion that remembers you` | Short substitute, but reported unavailable. |
| 0 | `ai-companion-with-memory.dpdns.org` | `AI companion with memory`, `AI companion that remembers` | Strong broader memory phrase, but reported unavailable. |
| 0 | `ai-roleplay-that-remembers-you.dpdns.org` | `AI roleplay that remembers you`, `AI roleplay with memory` | Product-specific near-exact phrase, but reported unavailable. |
| 0 | `ai-character-that-remembers-you.dpdns.org` | `AI character that remembers you`, `chat with AI character who knows you` | Character-chat near-exact phrase, but reported unavailable. |
| 1 | `ai-roleplay-memory.dpdns.org` | `AI roleplay memory`, `AI roleplay with memory`, `AI roleplay that remembers story` | Best low-competition next test: shorter and less contested than the full "with memory" product phrase. Can work as an informational + product landing page. |
| 2 | `roleplay-chatbot-with-story-memory.dpdns.org` | `roleplay chatbot with story memory`, `AI roleplay app that remembers my story` | Very specific long-tail intent. Lower volume, but strongest chance to rank early. |
| 3 | `ai-roleplay-that-remembers-story.dpdns.org` | `AI roleplay that remembers story`, `AI roleplay app that remembers my story` | Emotional story-continuity phrase; avoids the saturated "remembers you" wording. |
| 4 | `private-ai-roleplay-with-memory.dpdns.org` | `private AI roleplay with memory`, `private AI roleplay` | Adds privacy, which narrows competition and matches private secrets/agreements. |
| 5 | `ai-character-chat-story-memory.dpdns.org` | `AI character chat story memory`, `AI character chat that remembers story` | Character-chat category plus story continuity. Lower competition than generic companion terms. |
| 6 | `ai-character-with-private-memory.dpdns.org` | `AI character with private memory`, `private AI character memory` | Strong product fit for per-user memory and private bonds. |
| 7 | `create-ai-character-with-memory.dpdns.org` | `create AI character with memory`, `custom AI character with memory` | Bridges fast character creation and memory. Good product-fit page. |
| 8 | `ai-roleplay-with-memory.dpdns.org` | `AI roleplay with memory`, `AI roleplay that remembers you` | Still relevant, but less preferred after SERP review because more product pages already target it. |
| 9 | `ai-character-chat-with-memory.dpdns.org` | `AI character chat with memory`, `character chat that remembers you` | Good category phrase, but product pages and directories already use it. |
| 10 | `character-ai-alternative-with-memory.dpdns.org` | `character ai alternative with memory` | Strong conversion page for users leaving Character.AI; higher competition but clearer buying intent. |
| 11 | `ai-roleplay-with-long-term-memory.dpdns.org` | `ai roleplay with long term memory` | Directly targets roleplay users frustrated by forgetting. Longer and more contested than `ai-roleplay-memory`. |
| 12 | `create-ai-character-free.dpdns.org` | `create custom AI character free` | Creation intent, likely higher volume but less memory-specific. |
| 13 | `anime-ai-character-chat.dpdns.org` | `anime character AI chat`, `anime character AI chat no login` | Good anime long-tail page, but less tied to the memory moat. |
| 14 | `ai-companion-with-secrets.dpdns.org` | `AI companion with secrets`, private AI companion | Strong product fit for small secrets and promises, but search volume is less proven. |
| 15 | `private-ai-roleplay-memory.dpdns.org` | private AI roleplay, AI roleplay memory | Product-fit page for private memories and agreements. Needs SERP validation. |

Recommendation if only one DigitalPlat domain can be chosen for SEO:

Register and use `keepsay.dpdns.org` as the canonical domain. Put exact SEO
phrases in URL paths, titles, H1s, intro copy, FAQ, and internal anchors:

`keepsay.dpdns.org/ai-companion-that-remembers-you`

Recommendation if using one brand subdomain plus SEO landing pages:

- Brand/app and canonical host: `keepsay.dpdns.org`
- First SEO page/path: `/ai-companion-that-remembers-you`
- Second SEO page/path: `/ai-roleplay-secret-memory`

### Next NXDOMAIN Fallback Batch

These candidates returned NXDOMAIN through Cloudflare DNS-over-HTTPS on
2026-06-09, but the DigitalPlat registration UI later reported the batch as
already registered under `.dpdns.org`. Do not keep trying to bypass `.dpdns.org`
exact-match labels. Reuse these exact phrases under another suffix or as URL
paths on a unique domain.

| Priority | Candidate | Target Query Cluster | Why It Fits Low-Competition SEO |
| --- | --- | --- | --- |
| 1 | `ai-roleplay-secret-memory.dpdns.org` | `AI roleplay secret memory`, `AI roleplay that keeps secrets`, `private AI roleplay memory` | Best current fit: combines roleplay, memory, and the product's private secrets/agreements moat. |
| 2 | `ai-roleplay-shared-memory.dpdns.org` | `AI roleplay shared memory`, `shared memory AI character`, `AI character remembers our story` | Strong emotional angle: memory belongs to the user-character relationship, not only the bot. |
| 3 | `ai-character-shared-memory.dpdns.org` | `AI character shared memory`, `AI character that remembers our story` | Character-chat category plus relationship continuity. Slightly broader than roleplay-specific wording. |
| 4 | `ai-character-private-memory.dpdns.org` | `AI character private memory`, `private AI character memory` | Good match for per-user memory, private bonds, and secrets. More competitive than "secret memory" but clearer. |
| 5 | `ai-roleplay-lore-memory.dpdns.org` | `AI roleplay lore memory`, `roleplay lore memory` | Niche but rankable. Strong for story/world continuity and advanced roleplay users. |
| 6 | `ai-character-lore-memory.dpdns.org` | `AI character lore memory`, `character lore memory` | Good for creators who care about backstory, world rules, and long arcs. |
| 7 | `ai-roleplay-story-recall.dpdns.org` | `AI roleplay story recall`, `AI roleplay remembers story` | Natural continuity phrase with lower competition than "memory" head terms. |
| 8 | `roleplay-story-memory.dpdns.org` | `roleplay story memory`, `roleplay chatbot story memory` | Shorter and more informational; useful if AI-prefixed variants are taken. |
| 9 | `ai-roleplay-that-keeps-secrets.dpdns.org` | `AI roleplay that keeps secrets`, `AI character that keeps secrets` | Very product-specific to private promises/secrets, likely low competition but lower volume. |
| 10 | `custom-ai-character-memory.dpdns.org` | `custom AI character memory`, `create AI character with memory` | Best fallback for the fast-character-creation advantage. |

### Bypass Strategy For Saturated `.dpdns.org`

Do not keep adding words to `.dpdns.org` exact-match labels after repeated
"already registered" responses. It makes the URL worse while adding little SEO
benefit. Use one of these instead:

1. Same keyword phrase on another DigitalPlat suffix:
   `ai-roleplay-secret-memory.qzz.io`,
   `ai-roleplay-shared-memory.qzz.io`,
   `ai-character-private-memory.qzz.io`.
2. Unique brandable base plus exact SEO path:
   `keepsay.qzz.io/ai-roleplay-secret-memory`,
   `pactly.qzz.io/ai-roleplay-shared-memory`,
   `withly.qzz.io/ai-character-private-memory`.
3. Shorter unique base plus topical paths:
   `memoryroleplay.qzz.io/ai-roleplay-secret-memory`,
   `secretroleplay.qzz.io/ai-character-shared-memory`.

For ranking, the exact phrase in the title, H1, intro paragraph, FAQ, internal
anchors, and URL path matters more than forcing every word into the subdomain.
Use one canonical domain; do not create duplicate content across every suffix.

### Current Domain Decision

Use `keepsay.dpdns.org` as the primary canonical domain. The previous two-domain
idea was:

- Brand domain: `keepsay.dpdns.org`
- SEO exact-match domain: `ai-companion-that-remembers-you.dpdns.org`

That plan is no longer recommended because the SEO exact-match domain cannot be
registered. Keeping only `keepsay.dpdns.org` concentrates authority and avoids
duplicate-content/canonical complexity.

Primary SEO paths under `keepsay.dpdns.org`:

1. `/ai-companion-that-remembers-you`
2. `/ai-roleplay-secret-memory`
3. `/ai-roleplay-shared-memory`
4. `/create-ai-character-with-memory`
5. `/character-ai-alternative-with-memory`

Set `NEXT_PUBLIC_APP_URL=https://keepsay.dpdns.org` after the domain is added
to Vercel. The sitemap, canonical URLs, Open Graph URLs, and Search Console
submission should all use `keepsay.dpdns.org`.

Brandable names are weaker for immediate ranking because users do not search
for them yet. Exact-match subdomains are not a magic ranking factor by
themselves, but they improve topical clarity, CTR, anchor text, and page-message
match when the content directly satisfies the query.

### SERP Validation Workflow

Before building each landing page:

1. Search the exact target phrase in Google.
2. Check whether Reddit, Quora, forums, or thin small blogs rank in the top 3.
3. If yes, mark the page as "green light".
4. If the first page is dominated by Character.AI, major publishers, or strong
   SaaS comparison domains, deprioritize the broad term and target a narrower
   long-tail variant.
5. For a new domain, prioritize terms with estimated KD 0-15 where possible.

### First Landing Pages To Build After Domain Setup

Recommended order:

1. `/ai-roleplay-secret-memory`
2. `/ai-roleplay-shared-memory`
3. `/create-ai-character-free`
4. `/anime-character-ai-chat`
5. `/talkie-ai-alternative`
6. `/character-ai-alternative`

`/ai-roleplay-secret-memory` is now the first page to build because the exact
`remembers you` and broad `AI roleplay memory` `.dpdns.org` variants were
reported unavailable, while broader `AI roleplay with memory` results already
contain several relevant product pages. The lower-competition path is to lead
with a product-specific page around secret/private/shared memory and expand
into story-memory phrases.

- Results include small/specialized AI companion products rather than only
  dominant incumbents.
- Reddit threads repeatedly complain that AI companions and Character.AI
  alternatives do not truly remember users over time.
- The query maps directly to RolePlay's strongest differentiators: persistent
  memory, relationship continuity, private agreements, and character-specific
  shared history.
- It can naturally absorb adjacent phrases such as `AI companion with memory`,
  `chat with AI character who knows you`, `AI boyfriend that remembers your
  story`, and `character ai alternative with memory`.

Suggested page angle:

- H1: `AI Companion That Remembers You`
- Subtitle: `Create a character fast, build private memories, and keep the small secrets and promises that make the story feel ongoing.`
- Primary CTA: `Create a character`
- Secondary CTA: `Chat with a character`
- Sections: memory problem, how RolePlay remembers, small secrets/promises,
  fast character creation, voice/photo unlocks, FAQ.

Previous recommended order before SERP review:

1. `/ai-companion-with-memory`
2. `/create-ai-character-free`
3. `/anime-character-ai-chat`
4. `/talkie-ai-alternative`
5. `/character-ai-alternative`

This order favors low-to-mid competition terms first while still preparing the
required competitor-alternative pages.

## Implementation Tasks

- [x] Record current audit findings and scope.
- [x] Add red-check script for localized canonical/sitemap URL rules.
- [x] Add shared SEO URL helper.
- [x] Update global metadata canonical generation.
- [x] Update root alternate links.
- [x] Add dynamic sitemap route and remove stale public sitemap.
- [x] Add homepage metadata.
- [x] Add character detail metadata.
- [x] Verify with script, lint, typecheck, production build, and sitemap content sampling.
- [x] Add search-display copy rules for alternative/best-list keywords.
- [x] Update homepage and character-page subtitles to support the metadata.
- [x] Switch the active domain strategy to single canonical host `keepsay.dpdns.org`.
- [x] Add the primary SEO landing paths to the dynamic sitemap.
- [x] Add first-pass English and Chinese MDX landing pages for the primary SEO paths.
- [x] Fix dynamic landing-page canonical generation to respect `localePrefix = always`.
- [x] Deploy the Keepsay SEO changes to production.
- [x] Verify production `keepsay.dpdns.org` homepage, SEO landing page, robots.txt, and sitemap.
- [x] Fix dynamic landing-page Open Graph URL to match each page canonical URL.
- [x] Replace user-visible `your-domain.com` placeholders in legal/contact/footer surfaces.
- [x] Add `keepsay.dpdns.org` to Vercel and set production `NEXT_PUBLIC_APP_URL=https://keepsay.dpdns.org`.
- [ ] Submit `https://keepsay.dpdns.org/sitemap.xml` in Google Search Console after DNS and Vercel are live.

## Verification Log

- `node --import tsx scripts/check-seo-url-rules.ts`: passed. Confirms `/en`, `/zh`, localized character URLs, the `keepsay.dpdns.org` canonical host, and primary SEO landing sitemap URLs follow `localePrefix = always`.
- `node --import tsx scripts/check-seo-copy.ts`: passed. Confirms title,
  description, and keywords cover `AI Character Chat`, `AI Roleplay`,
  `Character.AI alternative`, `Best Character AI alternatives`, `Talkie AI
alternative`, and `PolyBuzz alternative`.
- `pnpm exec fumadocs-mdx`: passed. Regenerated MDX source after adding primary SEO landing pages.
- `pnpm lint`: passed with 0 errors and 10 existing warnings unrelated to this SEO change.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: passed. `/sitemap.xml` is generated with 1 hour revalidation. Local build logs `DATABASE_URL is not set`, then falls back to local official character IDs as intended.
- `node --import tsx -e "...sitemap sample..."`: generated 80 local sitemap entries, included `https://keepsay.dpdns.org/en/ai-companion-that-remembers-you` and `https://keepsay.dpdns.org/zh/ai-roleplay-secret-memory`, and contained no `https://ai-companion-that-remembers-you.dpdns.org` URLs.
- Production `curl` checks after deployment: `/en`, `/en/ai-companion-that-remembers-you`, `/robots.txt`, and `/sitemap.xml` returned 200. Robots points to `https://keepsay.dpdns.org/sitemap.xml`; sitemap includes the primary SEO landing URLs.
- Follow-up local checks after Open Graph/contact cleanup: `pnpm exec fumadocs-mdx`, `node --import tsx scripts/check-seo-url-rules.ts`, `node --import tsx scripts/check-seo-copy.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` passed.

## Status Log

- 2026-06-09 07:35: Audited preview URL with bb-browser, Lighthouse, and DevTools trace.
- 2026-06-09 07:40: Found invalid sitemap entries pointing to `https://your-domain.com`.
- 2026-06-09 07:41: Confirmed character detail pages use generic metadata and root canonical.
- 2026-06-09 08:00: Created this implementation plan. Final domain remains pending.
- 2026-06-09 08:05: Added shared SEO URL helper and canonical URL rule verification script.
- 2026-06-09 08:08: Updated canonical and alternate link generation to respect `localePrefix = always`.
- 2026-06-09 08:10: Replaced stale static sitemap with dynamic sitemap route covering localized home, blog, showcases, and public character pages.
- 2026-06-09 08:12: Added homepage metadata and long-tail character detail metadata.
- 2026-06-09 08:17: Completed verification. Domain setup, Search Console submission, and final-domain PageSpeed run remain pending.
- 2026-06-09 08:30: Added keyword strategy for Character.AI alternative and best-list discovery terms without changing the product name.
- 2026-06-09 08:34: Updated homepage H1/subtitle and character detail subtitle so visible content supports metadata.
- 2026-06-09 08:38: Added SEO copy verification script for the new title, description, and competitor-alternative keyword requirements.
- 2026-06-09 09:05: Added domain naming principles, candidate shortlist, long-tail keyword matrix, `.dpdns.org` subdomain map, and SERP validation workflow. Domain availability and trademark checks remain pending.
- 2026-06-09 09:12: Promoted `ai companion that remembers you` to the first landing-page priority after SERP review showed small/specialized competitors and Reddit memory-pain discussions rather than only dominant incumbents.
- 2026-06-09 09:18: Added ranking-first `.dpdns.org` candidate order. Exact-match memory subdomains are preferred over brandable names when the goal is fastest SEO ranking.
- 2026-06-09 09:32: Marked `ai-companion-that-remembers-you.dpdns.org` unavailable and promoted near-exact alternatives led by `ai-companion-who-remembers-you.dpdns.org`.
- 2026-06-09 12:40: Marked the five near-exact fallback subdomains unavailable and promoted the next cluster led by `ai-roleplay-with-memory.dpdns.org`.
- 2026-06-09 12:49: Re-ranked remaining `.dpdns.org` candidates by low-competition opportunity. Promoted `ai-roleplay-memory.dpdns.org` over broader `ai-roleplay-with-memory.dpdns.org`.
- 2026-06-09 12:49: Marked the next six candidates unavailable per registration checks. Used Cloudflare DNS-over-HTTPS after local DNS returned unreliable `198.18.0.x` wildcard-like answers, then promoted NXDOMAIN fallback candidates led by `ai-roleplay-secret-memory.dpdns.org`.
- 2026-06-09 12:56: Registration UI reported the NXDOMAIN fallback batch as already registered under `.dpdns.org`. Updated strategy: stop trying to bypass registered labels, switch suffixes or use a unique brandable base with exact SEO paths.
- 2026-06-09 13:08: Marked `keepsay.dpdns.org` as the recommended single canonical domain. Dropped the two-domain plan because `ai-companion-that-remembers-you.dpdns.org` is unavailable.
- 2026-06-09 13:15: Executed the single-domain plan in code: added primary SEO landing paths to sitemap, added first-pass localized MDX landing pages, updated dynamic landing-page canonical generation, and expanded SEO URL verification for `keepsay.dpdns.org`.
- 2026-06-09 13:17: Verified MDX generation, SEO URL rules, SEO copy rules, lint, typecheck, production build, and sitemap sampling after the Keepsay single-domain update.
- 2026-06-09 17:20: Pushed `main` through `f409f80`, deploying the Keepsay SEO code to production.
- 2026-06-09 17:32: Production verification found the new SEO page live and sitemap/robots on the Keepsay host. Added a follow-up cleanup for dynamic-page `og:url` and user-visible `your-domain.com` placeholders.
