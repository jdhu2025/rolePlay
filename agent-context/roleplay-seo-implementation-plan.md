# RolePlay SEO Implementation Plan

Last updated: 2026-06-30 Asia/Shanghai

## Remaining Todo

- [ ] In Google Search Console, inspect the canonical URL
  `https://keepsay.dpdns.org/en` and record Google's selected canonical,
  crawl date, crawl user agent, and any page quality notes. The current GSC
  bucket is `Crawled - currently not indexed`, so this is a quality/canonical
  confidence problem unless URL Inspection shows a new technical blocker.
- [ ] Use root variants only as discovery/redirect variants:
  `http://keepsay.dpdns.org/` and `https://keepsay.dpdns.org/` should point
  users and crawlers to the localized canonical entry, while offsite links
  should primarily use `https://keepsay.dpdns.org/en` or the specific SEO
  landing page being promoted.
- [ ] Execute the offsite backlink plan. Daily cadence applies only to
  external submissions, outreach, community answers, and backlink follow-up.
  Site changes should stay as one-time prerequisites or backlog tasks, not
  daily work.
- [ ] Maintain the backlink tracker in
  `agent-context/roleplay-seo-backlink-tracker.md` after every submission,
  outreach email, community answer, listing approval, or rejection.
- [ ] Maintain the backlink execution log in
  `agent-context/roleplay-seo-backlink-execution-log.md` after each working
  session.
- [ ] Run real browser screenshot QA for homepage, Quick Create, and the new
  SEO landing pages after the local dev-server lock is cleared or Playwright is
  installed. Current coverage includes build, route status, and HTML checks.
- [ ] Review SEO conversion events after production traffic starts:
  `seo_scene_link_clicked`, `seo_landing_cta_clicked`, and `quick_create_*`.
- [ ] Decide whether to promote `seoScenes`, `sourceTemplateId`,
  `customizationMode`, and `landingSlug` from JSON metadata into database
  columns after conversion data is available.
- [ ] Expand high-fit character assets based on search and conversion data,
  especially for memory companion, comfort companion, and private character
  intents.
- [ ] Use Google Search Console after deployment to review impressions, clicks,
  and query clusters for the new scene landing pages.
- [ ] Consider adding Playwright screenshot regression tests if UI iteration on
  these pages becomes frequent.

## Indexing First Fix

- [x] Harden the root redirect so `/` resolves permanently to `/en`.
- [x] Add a visible product explanation block on the home page.
- [x] Add a visible FAQ block on the home page.
- [x] Add server-rendered `FAQPage` JSON-LD on the home page.
- [x] Align homepage SEO copy to the Keepsay brand while keeping the core
  discovery terms.
- [x] Deploy the main SEO hardening changes through the normal GitHub to
  Vercel auto-deploy flow. `bb-browser` verified the live Keepsay title,
  description, canonical URL, visible overview copy, visible FAQ copy, and
  `FAQPage` JSON-LD.
- [ ] Deploy and verify the homepage brand-consistency follow-up for
  `og:site_name` and `WebSite.name`, so production no longer depends on the
  old `NEXT_PUBLIC_APP_NAME` value.
- [ ] Re-run GSC URL Inspection for `https://keepsay.dpdns.org/en` after the
  live update is deployed and watch for bucket movement.

## Offsite Backlink Execution Plan

This section is for external backlink acquisition only. Do not turn site edits
into a day-by-day plan. Site edits are supporting prerequisites: fix them in
batches when needed, then return to offsite execution.

### Goal

Build qualified external references to `https://keepsay.dpdns.org/` and the
highest-intent SEO pages so Keepsay gains referring domains, relevant anchor
context, referral traffic, and stronger discovery signals.

90-day targets:

- 40-60 qualified referring domains.
- 15+ relevant AI / chatbot / character chat / creator-tool references.
- 10+ links or mentions pointing to memory and creator pages, not only the
  homepage.
- 5+ links from pages that can plausibly send real trial users.

### Target Pages

| Priority | URL | Use Case |
| --- | --- | --- |
| P0 | `https://keepsay.dpdns.org/en/ai-character-chat-with-memory` | Memory-based AI character chat listings, reviews, and comparisons. |
| P0 | `https://keepsay.dpdns.org/en/custom-ai-character-creator` | Creator-tool, prompt-tool, and custom character directory submissions. |
| P0 | `https://keepsay.dpdns.org/en/free-ai-character-chat` | Free AI chat directories and low-friction product listings. |
| P1 | `https://keepsay.dpdns.org/en/character-ai-alternative-with-memory` | Character.AI / Talkie alternative pages and comparison mentions. |
| P1 | `https://keepsay.dpdns.org/en/anime-ai-roleplay-characters` | Anime roleplay, character chat, and fandom-adjacent discovery pages. |
| P1 | `https://keepsay.dpdns.org/en/ai-companion-that-remembers-you` | Memory and companion-content references. |
| P2 | `https://keepsay.dpdns.org/en/talkie-ai-alternative` | Talkie alternative discussions and listicles. |

### Anchor Text Rules

Use mixed anchors. Avoid repeating exact-match anchors in bulk.

| Anchor Type | Target Share | Examples |
| --- | --- | --- |
| Brand | 40% | `Keepsay`, `Keepsay AI`, `Keepsay RolePlay` |
| Natural description | 30% | `an AI character chat app`, `a custom AI character creator`, `an AI roleplay app with memory` |
| URL / naked link | 20% | `https://keepsay.dpdns.org/` |
| Exact or partial long-tail | 10% | `AI character chat with memory`, `custom AI character creator`, `free AI character chat` |

### Quality Rules

Accept a backlink target only when it passes most of these checks:

- The page or site is indexable and not obviously auto-generated spam.
- The topic is related to AI tools, chatbots, companions, roleplay, character
  creation, anime roleplay, creator tools, or startup discovery.
- The link can appear in body copy, a product profile, a review, a comparison,
  a resource list, or a genuinely helpful community answer.
- The surrounding page does not mix Keepsay with adult, gambling, malware,
  crypto spam, or unrelated bulk-link content.
- Paid placements are recorded as paid and should use `rel="sponsored"` or
  `nofollow`; do not treat paid dofollow links as an SEO win.

Reject:

- PBNs, link farms, bulk directory packs, comment spam, forum signature spam,
  irrelevant profile links, and "guaranteed DA" packages.
- Any pitch that frames Keepsay as NSFW, adult chat, no-filter chat, or explicit
  companion content.

### 30-Day Offsite Schedule

Daily work here means offsite work only.

| Day | Action | Output | Status |
| --- | --- | --- | --- |
| 1 | Set target pages, anchor rules, tracker, and outreach templates. | Tracker and log created. | Done |
| 2 | Build first 50-target prospect list across AI directories, launch sites, communities, and comparison pages. | 50 rows in tracker with status `prospect`. | Pending |
| 3 | Submit Keepsay to 5 AI tool directories. | 5 tracker rows moved to `submitted`. | Pending |
| 4 | Submit Keepsay to 5 more directories or product databases. | 5 additional submissions. | Pending |
| 5 | Draft Product Hunt / launch-platform positioning assets. | Tagline, description, gallery notes. | Pending |
| 6 | Reach out to 10 AI-tool bloggers or directory editors. | 10 outreach rows. | Pending |
| 7 | Follow up, check submission confirmations, and update tracker. | First weekly backlink status review. | Pending |
| 8 | Write 3 helpful community answers without forced links. | 3 community rows; link only where relevant. | Pending |
| 9 | Submit to startup / indie maker directories. | 5 submissions. | Pending |
| 10 | Pitch `AI character chat with memory` angle to 10 comparison/listicle pages. | 10 outreach rows. | Pending |
| 11 | Pitch `custom AI character creator` angle to creator-tool pages. | 10 outreach rows. | Pending |
| 12 | Publish or prepare one external guest/resource post pitch. | 1 pitch draft. | Pending |
| 13 | Check which submissions are indexed or live. | Tracker statuses updated. | Pending |
| 14 | Weekly review: count live links, replies, referral visits, and blockers. | Week 2 report in log. | Pending |
| 15 | Add 30 new prospects based on winners from first two weeks. | 30 new prospects. | Pending |
| 16 | Submit 5 more directories/listings. | 5 submissions. | Pending |
| 17 | Send 10 second-wave outreach emails. | 10 outreach rows. | Pending |
| 18 | Build comparison-page pitch around Character.AI/Talkie alternatives. | 10 targeted prospects. | Pending |
| 19 | Answer 3 more community threads. | 3 community rows. | Pending |
| 20 | Follow up with all non-responsive high-fit prospects from days 6, 10, 11. | Follow-up statuses updated. | Pending |
| 21 | Weekly review and prune low-quality channels. | Week 3 report in log. | Pending |
| 22 | Create a small embeddable resource pitch: memory checklist, template list, or comparison table. | Pitch asset defined. | Pending |
| 23 | Pitch the resource to 10 blogs/newsletters/resource pages. | 10 outreach rows. | Pending |
| 24 | Submit to 5 remaining high-quality directories. | 5 submissions. | Pending |
| 25 | Review all live links for anchor text, target page, and surrounding context. | Quality audit complete. | Pending |
| 26 | Replace weak prospects with stronger alternatives. | Tracker cleanup. | Pending |
| 27 | Run GSC/referral review for linked pages. | Performance notes in log. | Pending |
| 28 | Prepare next 30-day prospect batch. | 50 new prospects. | Pending |
| 29 | Final follow-up on month-one outreach. | Follow-up rows updated. | Pending |
| 30 | Month-one report and next-month priorities. | Summary report in log. | Pending |

### Outreach Templates

Directory submission description:

```text
Keepsay is an AI character chat app focused on memory-based roleplay, fast
custom character creation, and private story continuity. Users can start with
free public characters or create a private AI companion with personality,
scene, voice, and memory.
```

Short blogger/editor pitch:

```text
Subject: Keepsay for your AI character chat / AI tools list

Hi [Name],

I found your AI tools list and thought Keepsay may fit the character chat or
AI companion category.

Keepsay is an AI character chat app focused on memory-based roleplay and fast
custom AI character creation. The best fit page for your readers is:
https://keepsay.dpdns.org/en/ai-character-chat-with-memory

Short description:
Keepsay lets users chat with AI characters, create private roleplay companions,
and keep stories going with memory.

Would this be a fit for your list or a future update?

Thanks,
[Name]
```

Community answer rule:

```text
Answer the question first. Mention Keepsay only when the user explicitly asks
for an AI character chat app, a Character.AI/Talkie alternative, memory, or
custom character creation. Use one natural link at most.
```

## Goal

Improve crawlability and search-result quality for the current Vercel preview domain while leaving the final production domain setup as a tracked pending item.

## Current Findings

### Current Production Indexing Diagnosis: 2026-06-29

- Google Search Console shows `Crawled - currently not indexed` for three
  variants last crawled on 2026-06-09:
  `http://keepsay.dpdns.org/`, `https://keepsay.dpdns.org/`, and
  `https://keepsay.dpdns.org/en`. This means Google has discovered and fetched
  the URLs, but has not decided they are worth putting into the searchable
  index yet.
- Public search checks for `site:keepsay.dpdns.org` returned no visible Google
  results during the 2026-06-29 review.
- Live response checks showed `http://keepsay.dpdns.org/` returns a permanent
  HTTP-to-HTTPS redirect, and `https://keepsay.dpdns.org/` returns a 307
  redirect to `https://keepsay.dpdns.org/en`. The canonical user-facing
  homepage should therefore be treated as `/en` for English promotion.
- `https://keepsay.dpdns.org/en` returns 200 and is crawlable. The response
  includes hreflang alternates for `/en`, `/zh`, and x-default `/`.
- Live `robots.txt` allows `User-agent: *`, includes Cloudflare content signals
  with `search=yes`, and points to
  `https://keepsay.dpdns.org/sitemap.xml`.
- Live `sitemap.xml` lists the localized homepage, SEO landing pages, legal
  pages, and character pages under `https://keepsay.dpdns.org`.
- No evidence was found that the homepage is blocked by robots.txt or missing
  from the sitemap. The likely blockers are low domain trust/new-domain
  quality evaluation, weak external references, and diluted crawl signals from
  multiple root variants being crawled before Google settles on `/en`.
- The first practical priority is external authority: build clean backlinks to
  `/en` and the most relevant SEO landing pages, then request URL inspection
  for those exact URLs after new references go live.

### Historical Technical Findings

- `https://role-play-eta.vercel.app/en` was indexable and rendered meaningful content.
- Lighthouse SEO was 92 on mobile and desktop.
- Earlier `robots.txt` pointed to `/sitemap.xml`, but the sitemap contained `https://your-domain.com/...`.
- Earlier `/en` and `/en/character/rp-anime-001` both canonicalized to the root URL, even though `localePrefix` was configured as `always`.
- Earlier character detail pages inherited the generic `RolePlay` title and generic MVP description.
- PageSpeed Insights had no CrUX field data for the preview domain yet.

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
- [x] Submit `https://keepsay.dpdns.org/sitemap.xml` in Google Search Console after DNS and Vercel are live.

## SEO Growth Backlog

Status markers: `⏳ pending` / `▶ in progress` / `✅ done` / `⚠ blocked`.

| ID | Task | Status | Priority | Notes |
| --- | --- | --- | --- | --- |
| SEO-G1 | Build `/anime-character-ai-chat` localized landing pages and add them to sitemap/tests | ✅ done | P0 | Added English and Chinese MDX pages, sitemap entries, and URL rule coverage. Targets `anime character ai chat`, `anime AI roleplay`, and `what app lets you chat with anime characters`. |
| SEO-G2 | Build `/talkie-ai-alternative` localized landing pages and add them to sitemap/tests | ✅ done | P0 | Added English and Chinese MDX pages, sitemap entries, and URL rule coverage for users searching `talkie ai alternative` and apps like Talkie. |
| SEO-G3 | Build `/create-ai-character-free` localized landing pages and add them to sitemap/tests | ⏳ pending | P1 | Creation-intent page from the earlier recommended order; can cross-link to `/create-ai-character-with-memory`. |
| SEO-G4 | Build `/character-ai-alternative` localized landing pages and add them to sitemap/tests | ⏳ pending | P1 | Broader competitor-alternative page; keep safety/no-filter wording careful and boundary-aware. |
| SEO-G5 | Build `/polybuzz-alternative` localized landing pages and add them to sitemap/tests | ⏳ pending | P2 | Optional competitor page after Talkie and Character.AI alternatives are live. |
| SEO-G6 | Add homepage and SEO-page internal links to the primary and growth landing pages | ✅ done | P0 | Added homepage guide links plus related-guide sections across the primary and growth SEO landing pages to concentrate authority around memory, anime roleplay, creation, and alternatives. |
| SEO-G7 | Add character detail page cross-links to relevant SEO pages | ⏳ pending | P1 | Link anime characters toward anime chat intent and memory-oriented profiles toward memory pages. |
| SEO-G8 | Run final-domain PageSpeed Insights for core SEO pages and record results | ⏳ pending | P1 | Re-run against `https://keepsay.dpdns.org` after new pages ship. |
| SEO-G9 | Run Google Search Console URL Inspection for homepage, primary SEO pages, and new growth pages | ⏳ pending | P1 | Track indexing status, canonical selected by Google, and crawl issues. |
| SEO-G10 | SERP-validate each new page target before or immediately after publishing | ⏳ pending | P1 | Follow the SERP validation workflow above; prioritize terms where forums, Reddit, Quora, or thin pages rank. |
| SEO-G11 | Execute offsite backlink campaign and maintain backlink tracker/log | ▶ in progress | P0 | Daily cadence applies only to external submissions, outreach, community answers, and follow-ups. Tracker: `agent-context/roleplay-seo-backlink-tracker.md`; log: `agent-context/roleplay-seo-backlink-execution-log.md`. |

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
- Google Search Console sitemap submission: completed externally for `https://keepsay.dpdns.org/sitemap.xml`.
- SEO-G1/G2 local verification: `pnpm exec fumadocs-mdx`, `node --import tsx scripts/check-seo-url-rules.ts`, `node --import tsx scripts/check-seo-copy.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` passed. Local sitemap checks and build still log `DATABASE_URL is not set`, then use the intended local fallback for roleplay character sitemap entries.
- SEO-G6 local verification: `pnpm exec fumadocs-mdx`, `node --import tsx scripts/check-seo-url-rules.ts`, `node --import tsx scripts/check-seo-copy.ts`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` passed. Browser automation was not available in the current tool context, so verification relied on build, lint, generated MDX source, and content/link inspection.
- SEO-G11 documentation verification: created the backlink tracker and
  backlink execution log, then updated the implementation plan with target
  pages, anchor rules, quality rules, a 30-day offsite schedule, and outreach
  templates. No code build was required because this pass changed
  documentation only.
- SEO-G11 follow-up verification: server-rendered the homepage FAQ structured
  data in `src/app/[locale]/(landing)/page.tsx`, removed the duplicate client
  FAQ JSON-LD from `src/shared/components/roleplay/roleplay-landing.tsx`, then
  reran `pnpm exec tsc --noEmit` and `pnpm lint` successfully.
- Live `bb-browser` follow-up: `https://keepsay.dpdns.org/en` still shows the
  old title `AI Character Chat & AI Roleplay | RolePlay`, old description,
  `WebSite` JSON-LD name `RolePlay`, and no visible homepage overview/FAQ
  copy. Deploy before requesting indexing again in Google Search Console.
- 2026-06-30 pre-deploy verification: `pnpm exec tsc --noEmit`, `pnpm lint`,
  `node --import tsx scripts/check-seo-copy.ts`,
  `node --import tsx scripts/check-seo-url-rules.ts`, and `pnpm build` passed.
  `pnpm lint` reported warnings only. Local sitemap checks and build still log
  `DATABASE_URL is not set`, then use the intended local fallback for roleplay
  character sitemap entries.

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
- 2026-06-09 17:40: Google Search Console sitemap submission completed for `https://keepsay.dpdns.org/sitemap.xml`; SEO implementation plan is fully checked off.
- 2026-06-13 00:00: Re-opened SEO planning for the next growth phase. Added `SEO Growth Backlog` with pending landing pages, internal-linking work, PageSpeed/Search Console checks, and SERP validation follow-ups.
- 2026-06-13 11:09: Completed SEO-G1 and SEO-G2. Added first-pass localized MDX pages for `/anime-character-ai-chat` and `/talkie-ai-alternative`, added both paths to the dynamic sitemap and SEO URL rule checks, regenerated MDX source, and verified with SEO scripts, typecheck, lint, and production build.
- 2026-06-13 11:17: Completed SEO-G6. Added homepage guide links and related-guide link sections across the primary and growth SEO landing pages, then verified MDX generation, SEO scripts, typecheck, lint, and production build.
- 2026-06-29 18:35: Started SEO-G11. Converted the external-link strategy into an offsite-only execution workflow, added the backlink tracker, and opened the backlink execution log. No third-party submissions were made yet because they require prospect research plus account/login or outreach identity decisions.
- 2026-06-30 10:45: Prepared indexing-first hardening for production. Direct Vercel CLI upload was attempted but aborted during file upload because of a TLS/network error, so deployment is proceeding through the normal GitHub push to Vercel auto-deploy flow instead.
