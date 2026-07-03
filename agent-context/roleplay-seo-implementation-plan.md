# RolePlay SEO Implementation Plan

Last updated: 2026-07-03 16:49 Asia/Shanghai

## Remaining Todo

- [x] Fix the 2026-07-03 audit's sitemap soft-404 risk: sitemap character
  URLs must not return `200` pages with `Character not found | RolePlay`.
  If `getMetadataCharacter(id)` cannot resolve an ID, use a true `404`
  (`notFound()`) or remove/noindex that URL before it enters the sitemap.
  Local implementation now maps `ROLEPLAY_ANIME_CHARACTERS` into the shared
  local character resolver, uses `notFound()` for unresolved character pages,
  and extends the URL-rule smoke test so every local sitemap character ID must
  resolve on detail pages.
- [x] Make public SEO surfaces cacheable where possible. The live `/en`
  response was `private, no-cache, no-store`, `x-vercel-cache: MISS`, and
  `cf-cache-status: DYNAMIC`; the homepage source currently forces dynamic
  rendering with `dynamic = 'force-dynamic'` and `revalidate = 0`.
  Local implementation removed homepage `force-dynamic` / `revalidate = 0`,
  switched initial homepage data to a public non-personalized loader, restored
  `revalidate = 3600`, and verified local `Cache-Control`,
  `CDN-Cache-Control`, and `Cloudflare-CDN-Cache-Control` headers.
- [x] Trim primary meta descriptions after the 2026-07-03 audit. Homepage
  description was 249 characters and an observed character description was
  231 characters; target roughly 140-155 English characters for predictable
  snippets. Local homepage description is now 146 characters, and the
  character description builder caps output at 155 characters.
- [x] Expand indexable character profile pages with more server-rendered,
  unique copy. The successful `/en/character/rp-012` crawl showed roughly 90
  visible words, which is too thin for a scalable character-profile sitemap
  layer. Local implementation now preloads full public character data on the
  server, renders a 300+ word profile-specific `Character guide` block with
  memory hooks and internal links, and adds profile-specific FAQ content plus
  FAQPage JSON-LD.
- [x] Resolve blog thinness before treating `/blog` as an SEO asset. The
  successful `/zh/blog` crawl showed about 31 visible words and no schema; add
  real posts/schema or temporarily noindex/remove empty blog listings. Local
  implementation temporarily removes `/blog` from the sitemap, sets blog
  listings/categories to noindex, and returns true 404s for missing posts and
  categories.
- [x] Normalize `x-default` hreflang policy across HTML, HTTP `Link` headers,
  redirects, and sitemap inclusion. The audit saw HTML x-default point to
  `/en`, while the HTTP `Link` header pointed to `/`. Local implementation
  disables next-intl's automatic HTTP alternate `Link` header so HTML
  alternates, root redirect, and sitemap remain aligned around `/en`.
- [x] Add baseline security headers for public pages: CSP,
  `x-content-type-options`, `x-frame-options`, `referrer-policy`,
  `permissions-policy`, COOP, and CORP, while preserving HSTS. Local smoke
  verified these headers on `/en` and character pages.
- [x] Decide the AI-search policy. Current robots allows search/reference use
  but blocks GPTBot, ClaudeBot, Google-Extended, CCBot, and other AI crawlers;
  no `llms.txt` exists. If GEO visibility is a goal, add `/llms.txt` and
  selectively allow answer-engine crawlers. Local implementation adds
  `/llms.txt`, explicitly allows `ChatGPT-User` and `PerplexityBot` for public
  pages, and blocks training-oriented crawlers (`GPTBot`, `ClaudeBot`,
  `Google-Extended`, `CCBot`, and `Bytespider`).
- [x] In Google Search Console, inspect the canonical URL
  `https://keepsay.dpdns.org/en` and request indexing after the live URL test
  passes. First live test briefly returned `server error (5xx)` during the
  deployment window, but the follow-up live test at 2026-06-30 09:45 reported
  that the URL can be indexed and indexing was requested.
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
- [x] Fix AITDK extension issues found on the live homepage:
  `og:image` / `twitter:image` still show the ShipAny template graphic, 5
  images are missing alt text, homepage `ItemList` structured data order does
  not match the refreshed memory-led priority, and meta keywords are too long
  at roughly 303 characters. Local implementation now sets the homepage social
  image to a Keepsay character asset, shortens homepage meta keywords, reorders
  homepage `ItemList` toward memory/create-with-memory pages, and gives
  homepage character cards more descriptive image alt/title/aria labels. Recheck
  the live AITDK extension after deployment.
- [x] Apply Talkie competitor lessons without copying its technical debt:
  strengthen character-card internal links, add clean collection/category
  pages, expand footer discovery links, and make the Talkie alternative angle
  clearly about memory and private story continuity. Local implementation now
  adds `/ai-character-collections` as a clean collection/category index,
  links it from the homepage guide rail, homepage guide list, footer discovery
  links, and sitemap, and connects each collection to real character cards plus
  `CollectionPage`, `ItemList`, and `FAQPage` JSON-LD.
- [x] Refresh homepage and landing-page copy with a more grounded user
  vocabulary layer: AI friend, fictional crush, roommate, classmate, comfort
  chat, fantasy adventure, anime school story, free chat, create character,
  and "remembers your story" phrasing. Local homepage, creator page, and
  Talkie-alternative page copy now use this layer.

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
- [x] Deploy and verify the homepage brand-consistency follow-up for
  `og:site_name` and `WebSite.name`, so production no longer depends on the
  old `NEXT_PUBLIC_APP_NAME` value.
- [x] Re-run GSC URL Inspection for `https://keepsay.dpdns.org/en` after the
  live update is deployed. Live test passed and indexing was requested.
- [ ] Recheck GSC URL Inspection in 24-48 hours and watch for the bucket to
  move from `Crawled - currently not indexed` to indexed or a new diagnostic.

## Offsite Backlink Execution Plan

This section is for external backlink acquisition only. Do not turn site edits
into a day-by-day plan. Site edits are supporting prerequisites: fix them in
batches when needed, then return to offsite execution.

## 2026-07-03 Full Site Audit Follow-up

Source artifact:

- `../keepsay.dpdns.org-audit/FULL-AUDIT-REPORT.md`
- `../keepsay.dpdns.org-audit/ACTION-PLAN.md`
- `../keepsay.dpdns.org-audit/audit-data.json`

Audit summary:

- Overall health score: 72/100.
- Detected business type: bilingual AI character chat / AI roleplay SaaS.
- Sitemap count: 108 URLs, split into 54 English URLs, 54 Chinese URLs, and
  68 character URLs.
- Homepage live snapshot: 443,708 bytes of HTML, about 1,050 visible words,
  18 images, 0 missing image alt attributes, 42 script tags, title length 39,
  description length 249, canonical `https://keepsay.dpdns.org/en`, and
  `WebSite`, `ItemList`, plus `FAQPage` JSON-LD.
- Robots allows generic search/reference crawling but blocks several AI
  crawlers; sitemap and robots were both reachable.
- Local SEO validation passed with `pnpm check:roleplay-seo`.
- Limitation: a full second crawl rerun could not be completed because the
  approval service returned a `502`; conclusions combine the successful live
  homepage, robots, sitemap, partial crawl subset, and local source checks.

### P0 / P1 Issues To Merge Into Implementation

1. Soft-404 character sitemap risk:
   - Observed successful-crawl examples:
     `https://keepsay.dpdns.org/zh/character/rp-anime-004`,
     `https://keepsay.dpdns.org/zh/character/rp-anime-006`, and
     `https://keepsay.dpdns.org/zh/character/rp-anime-015`.
   - These returned `200` with `Character not found | RolePlay`, no H1, no
     schema, and almost no visible copy.
   - Root cause hypothesis: sitemap includes local character IDs, but live
     route/data resolution can still fall through. The server page returns
     noindex metadata when lookup fails, but the page can still render the
     client detail shell instead of a true HTTP 404.
   - Implementation direction: use `notFound()` on unresolved server lookup,
     or exclude unresolved/noindex character URLs from the sitemap. Add a
     sitemap smoke test that fails on `200` pages containing
     `Character not found`.

2. Homepage cacheability/performance:
   - Live headers showed no-store and dynamic cache behavior:
     `cache-control: private, no-cache, no-store`, `x-vercel-cache: MISS`,
     and `cf-cache-status: DYNAMIC`.
   - Source currently sets `dynamic = 'force-dynamic'` and `revalidate = 0`
     on the public homepage.
   - Implementation direction: separate public cached content from volatile
     character/session data, then move the homepage toward ISR or cached
     fetches.

3. Overlong SERP snippets:
   - Homepage meta description: 249 characters.
   - Observed character meta description: 231 characters.
   - Implementation direction: rewrite homepage and character-description
     builder around the primary intent in about 140-155 English characters.

4. Thin scalable pages:
   - Observed character page `/en/character/rp-012` had about 90 visible
     words.
   - Observed `/zh/blog` had about 31 visible words and no schema.
   - Implementation direction: character pages need 300-500 unique
     server-rendered words per indexable profile; blog needs real posts/schema
     or temporary noindex/removal from sitemap.

5. Technical trust and AI-search policy:
   - Missing security headers: CSP, `x-content-type-options`,
     `x-frame-options`, `referrer-policy`, `permissions-policy`, COOP, and
     CORP.
   - No `llms.txt`; robots blocks GPTBot, ClaudeBot, Google-Extended, CCBot,
     and other AI crawlers.
   - Implementation direction: add conservative security headers and make a
     product decision on whether GEO/AI-answer visibility is worth selected
     crawler access plus `/llms.txt`.

## 2026-06-30 Keyword Refresh

Method:

- Used `bb-browser` to open Google Trends at
  `https://trends.google.com/trends/explore?q=custom%20AI%20character%20creator&legacy&hl=zh-CN`.
- Scope for trend checks: global, past 12 months, all categories, Google web
  search. Google Trends numbers are relative indices, not search volume.
- Benchmarked key phrases against `AI character chat` where Trends returned
  complete visible data. Later Trends widget requests hit temporary 429
  responses, so non-returned rows are treated as directional only.
- Used `bb-browser site google/search` for first-page SERP checks. Competition
  density below is an observed SERP density label, not paid-tool keyword
  difficulty.
- Used `bb-browser` on `https://aitdk.com/ai-seo-keywords-generator` as a
  supplemental keyword-idea check. AITDK generated keyword suggestions but did
  not provide search volume, keyword difficulty, or competition metrics. Its
  output is therefore used only for intent validation and copy expansion.

AITDK supplemental output:

| Input | AITDK Keyword Suggestions | SEO Use |
| --- | --- | --- |
| `custom AI character creator` | `AI character design`, `personalized character generator`, `custom avatar maker`, `unique character design`, `AI-driven character customization`, `digital character builder`, `virtual character artist` | Confirms this phrase drifts toward visual/avatar generation. Keep exact phrase secondary and avoid making it the main acquisition anchor. |
| `AI character chat with memory` | `chat with memory`, `memory-enabled chatbots`, `personalized AI interactions`, `memory in chatbots`, `AI character dialogue`, `immersive AI experiences` | Useful copy-expansion terms for memory pages, FAQs, and comparison outreach. |
| `create AI character with memory` | `character memory`, `memory retention in AI`, `AI storytelling`, `character personalization`, `memory simulation`, `intelligent character design` | Useful for the creation-with-memory page and creator-page rewrite. |

### Refresh Summary

| Keyword / Cluster | Trend Signal | SERP Competition Density | Decision |
| --- | --- | --- | --- |
| `AI character chat` | Strongest benchmark: avg 77, peak 100, recent pullback from May peak but still high. | High: Character.AI, Talkie, Perchance, app stores, PolyBuzz. | Keep as broad category language in titles, nav, intro copy, and internal anchors. Too competitive as a standalone new-domain page. |
| `AI character creator` | Mid signal: avg 12, peak 23, rising into May-June before pullback. | High and partly mismatched: Canva, Adobe, OpenArt, Hotpot, Perchance image-generator pages. | Use as a supporting phrase. Do not rely on it as the primary Keepsay acquisition keyword. |
| `custom AI character creator` | Very low exact signal when benchmarked: avg 0; sparse or insufficient weekly data. | High and mismatched: top results skew toward visual character/image generators. | Demote exact-match anchor and directory priority. Keep the page, but position it around private chat-character creation and memory. |
| `AI roleplay with memory` / `AI character chat with memory` | Low exact-volume signal in Trends, but visible sparse demand. | Medium: Reddit, smaller guides, small products, GitHub/technical pages appear alongside competitors. | Promote as a high-fit long-tail cluster. Best for editorial pages, FAQ, comparison outreach, and memory-focused backlinks. |
| `create AI character with memory` / `custom AI character with memory` | Very low exact Trends signal. | Low-medium: Reddit, OpenAI community, GitHub, YouTube, technical guides, and fewer polished commercial pages. | Make this the preferred creation-intent long-tail over `custom AI character creator`. |
| `AI companion that remembers you` | Directional only after Trends rate limit. | Medium: Reddit, Nomi, Dearest, Replika, Questie, and smaller memory-app guides. | Keep as a P0/P1 emotional memory page and outreach angle. |
| `character ai alternative with memory` | Directional only after Trends rate limit. | Medium-high: Reddit plus 2026 alternative listicles and competitor blogs. | Keep as a P1 comparison page; useful for switching intent, but harder than memory-only long tails. |
| `free AI character chat` | Directional only after Trends rate limit. | High: Talkie, Character.AI, SeaArt, Saylo, Perchance, Emochi, PolyBuzz. | Keep for directories and low-friction discovery, but avoid making it the main SEO bet for a new domain. |
| `anime character AI chat` / `anime AI roleplay` | Directional only after Trends rate limit. | High: app stores, Character.AI, Talkie, Talefy, Reddit, PolyBuzz. | Keep as a supporting growth page because it matches user intent, but it needs internal links and character assets to compete. |
| `talkie ai alternative` | Directional only after Trends rate limit. | Medium-high: Reddit plus several 2026 alternative/listicle pages. | Keep as P2/P1 depending on outreach fit; use memory and continuity as the differentiator. |

Rising related queries visible for the `AI character chat` benchmark included
`chat ai charms.ai`, `character ai charms.ai`, `darlink ai`, `ourdream ai`, and
`swerve ai`. Treat these as competitor/market-watch terms, not target anchors
for Keepsay pages.

### Refreshed Keyword Direction

1. Use `AI character chat` as the broad category umbrella.
2. Use memory-specific long tails for ranking attempts:
   `AI character chat with memory`, `AI roleplay with memory`,
   `AI companion that remembers you`, and `create AI character with memory`.
3. Demote exact `custom AI character creator` from P0 promotion because Trends
   showed insufficient exact demand and Google SERPs skew toward image/avatar
   generators rather than chat-character creation.
4. Keep competitor alternatives, but lead them with a narrower memory angle:
   `Character.AI alternative with memory`, `Talkie AI alternative with memory`,
   and `AI roleplay app with good memory`.
5. For new copy, prefer natural product-fit anchors over exact-match bulk
   anchors: `an AI character chat app with memory`, `a private AI character
   creator`, `create an AI character that remembers the story`.

## 2026-06-30 Talkie Competitor Notes

Method:

- Used `bb-browser` to open `https://www.talkie-ai.com/`. The live page
  redirected to `https://www.talkie-ai.com/zh-Hant` in the current browser
  session.
- Compared the live extraction with the user's AITDK extension screenshots for
  traffic, headings, density, and links.
- Treat AITDK traffic and keyword-density numbers as third-party directional
  estimates, not first-party analytics.

Observed Talkie signals:

| Area | Finding | Keepsay Takeaway |
| --- | --- | --- |
| Traffic | AITDK reported May 2026 monthly visits of 6.75M, bounce rate 24.53%, pages per visit 11.19, average visit duration 00:14:45, global rank 5,784, and domain age 3.13 years. | The category has real demand and strong engagement when users can browse many characters. Keepsay should measure page depth and repeat chat starts, not only landing-page clicks. |
| Sources | AITDK reported Direct 54.97%, Search 33.36%, Social 7.68%, Referrals 1.73%, Display Ads 1.06%, Mail 0.26%, Other 0.94%. | Brand/direct and SEO both matter. Offsite work should build brand mentions plus targeted memory-led pages, not only generic directory links. |
| Metadata | User screenshot/root data showed canonical `https://www.talkie-ai.com/`, description around free AI character chat, personalized connections, real conversations, and AI friends, plus keywords such as `talkie ai`, `ai character chat`, `roleplay ai`, `free ai chat`, `ai girlfriend`, and `ai boyfriend`. Live localized meta repeats the same category in Traditional Chinese and canonicalizes to `/zh-Hant/`. | Use simple broad-category language in top-level metadata, but pair it with Keepsay's sharper differentiator: memory, private characters, and story continuity. |
| Headings | AITDK and live extraction both showed 3 H1s: `For You` / `為您推薦`, `Roleplay` / `角色扮演`, and `Get your tasks done` / `完成您的任務`; no H2/H3. | Do not copy the heading structure. Keepsay should keep one clear H1 and use H2/H3 for collections such as memory, anime roleplay, companions, creator, and alternatives. |
| Density | AITDK showed `chat` as the top keyword with 173 uses / 1.73%, while the rest of the list was noisy character-story vocabulary such as pronouns, relationship terms, places, and names. | Talkie's topical mass comes from many character stories, not clean keyword density. Keepsay should generate useful character/story copy, but keep landing-page density focused on memory-led terms. |
| Internal links | Live extraction found 219 links, with many dofollow character links whose anchors include character names plus long backstory snippets. AITDK showed link `title` missing on these anchors. | Character cards are SEO assets. Keepsay should make character-card anchors descriptive, indexable, and safe, while using clean titles/alt text where useful. |
| Images | Live extraction found 750 images and 171 images without alt text. Many visible card images do use alt text like `Talkie AI - Chat with [name]`, but hidden/hover assets still create noise. | Add useful alt text consistently. This is an area where Keepsay can be technically cleaner than Talkie. |
| Footer/navigation | Talkie links to `Create Talkie`, Explore, Search, Memory, Community, FAQ, app download, blog/support/legal, plus SEO discovery links such as `AI Anime Chat`, `Free AI Chat`, `AI Roleplay Chat`, and `Character AI Alternative`. | Add a restrained footer/category layer for discovery terms, and make the memory pages prominent in nav/footer instead of burying them. |
| Structured data | Live HTML included Organization, WebSite with SearchAction, WebPage, and FAQPage JSON-LD, plus broad hreflang coverage. | Keep Keepsay's structured data healthy and add/maintain FAQPage and ItemList ordering around memory-led pages. |

What to reference:

1. Clear top-level promise: free AI character chat, real-feeling
   conversations, personalized AI friends.
2. Browse-first homepage: character cards and collections are the product,
   not a marketing wrapper.
3. Long character descriptions as internal-link anchors and search-context
   text.
4. Footer discovery links for high-volume category pages.
5. FAQPage, WebSite SearchAction, localized alternates, and social preview
   completeness.
6. Engagement model: many pages per visit and long sessions imply users
   browse, sample, and return to characters.

What not to copy:

1. Multiple H1s and no H2/H3 hierarchy.
2. Noisy keyword density that depends on scraped/user-generated story text.
3. Missing anchor titles and many missing image alt texts.
4. Over-broad romance/adult-adjacent keyword positioning. Keepsay should stay
   boundary-aware and lead with memory, privacy, and story continuity.
5. Reliance on celebrity/anime/IP-heavy character names as the primary SEO
   engine. Keepsay should prefer original, safe, high-fit characters and
   collection pages.

Keepsay action items from Talkie:

1. Refresh `/talkie-ai-alternative` copy toward `Talkie AI alternative with
   memory`, `AI roleplay app that remembers the story`, and private companion
   continuity.
2. Add or strengthen collection pages around memory characters, anime
   roleplay, companions, creator/private characters, free chat, and
   alternatives.
3. Upgrade character cards/details into consistent internal-link assets:
   descriptive anchor text, useful image alt text, reply/chat counts where
   available, and links back to the right SEO landing pages.
4. Add footer discovery links for `AI Anime Chat`, `Free AI Chat`,
   `AI Roleplay Chat`, `Character AI Alternative`, and memory-led pages, using
   natural labels rather than keyword stuffing.
5. Keep technical SEO cleaner than Talkie: one H1, sensible H2/H3 hierarchy,
   canonical/hreflang correctness, FAQ/ItemList/SearchAction structured data,
   and no stale social preview images.

## 2026-06-30 Keepsay Density Reality Check

Trigger:

- The user's AITDK density screenshot for `https://keepsay.dpdns.org` showed
  top terms such as `chat` 26 / 2.78%, `character` 14 / 1.50%, `anime` 14 /
  1.50%, `keepsay` 10 / 1.07%, `memory` 9 / 0.96%, `story` 8 / 0.85%,
  `characters` 7 / 0.75%, then softer or less search-natural words such as
  `room`, `small`, `composed`, character names, and `celestial`.
- Live `bb-browser` extraction showed the homepage has about 936 visible words,
  while the Talkie AITDK screenshot showed about 9,984 words. Talkie's density
  is not only a keyword choice advantage; it has much more visible character
  story text.

Diagnosis:

The current Keepsay page is strategically correct but less grounded. It says
`AI character chat`, `memory`, `story`, and `anime`, but the surrounding words
often feel literary or internal: `composed`, `celestial`, `ongoing stories`,
`private continuity`, `clear story boundaries`. Talkie is messier, but it uses
words closer to how users browse and search: `friend`, `girl`, `boy`, `school`,
`roommate`, `crush`, `world`, `date`, `fantasy`, `reply`, and character-name
anchors.

AITDK Density interpretation:

- AITDK Density is a visible-word frequency table, not a keyword strategy
  table. It counts simple words from all visible copy, including character
  names, pronouns, story snippets, UI labels, and repeated card text.
- Talkie's simple words are not all deliberate SEO targets. Words like
  `eyes`, `years`, `school`, `friend`, `boyfriend`, `room`, `reply`, `family`,
  and character names appear because the page contains many character stories.
- Keepsay's long phrases come from deliberate SEO positioning and metadata:
  `AI character chat with memory`, `Talkie AI alternative with memory`,
  `create AI character with memory`, `private story continuity`, and similar
  phrases. These are useful for titles, H1/H2 copy, comparison pages, and
  backlinks, but they feel too stiff when repeated in homepage cards.
- Therefore, do not replace all long-tail strategy with one-word density
  chasing. Instead, use long-tail phrases for search direction and simple
  scene words for homepage readability, character-card text, and natural
  topical mass.

Use two keyword layers:

| Layer | Purpose | Example Phrases |
| --- | --- | --- |
| Strategic SEO layer | Page titles, H1/H2, metadata, backlinks, comparison pages. | `AI character chat`, `AI roleplay`, `AI character chat with memory`, `Talkie AI alternative with memory`, `create AI character with memory`. |
| Grounded user layer | Homepage cards, character descriptions, chips, FAQs, internal anchors. | `AI friend chat`, `fictional crush story`, `anime school roleplay`, `roommate character chat`, `comfort companion`, `fantasy adventure`, `create your own character`, `free AI character chat`, `remembers your story`. |

Grounded vocabulary to add naturally:

| User Intent | Safer Keepsay Language | Avoid As Primary Positioning |
| --- | --- | --- |
| Friendship / companion | `AI friend`, `comfort companion`, `someone to talk to`, `character who remembers the small stuff` | Do not overclaim therapy or emotional dependence. |
| Crush / romance-lite | `fictional crush story`, `slow-burn roleplay`, `date scene`, `romantic story character` | Do not market as `AI girlfriend`, `AI boyfriend`, NSFW, or adult chatbot. |
| School / campus | `adult campus story`, `classmate roleplay`, `graduate campus mentor`, `school-style anime story` | Avoid minor-coded school language; keep characters clearly adult. |
| Roommate / everyday scenes | `roommate character chat`, `shared apartment story`, `late-night kitchen scene`, `favorite drink` | Avoid coercive or unsafe relationship framing. |
| Fantasy / anime | `anime mage`, `fantasy adventure`, `cafe fantasy character`, `mystery roleplay`, `story world` | Avoid relying on third-party IP or celebrity names. |
| Memory | `remembers your story`, `remembers your favorite drink`, `picks up the last scene`, `keeps the nickname`, `continues tomorrow` | Avoid abstract-only phrases like `memory layer` without examples. |

Suggested copy direction:

- Homepage H1 test: `Chat with AI characters who remember your story.`
- Homepage subtitle test: `Start a free AI character chat with an anime
  friend, fantasy companion, classmate, roommate, or fictional crush story.
  Create your own character and come back to a story that remembers the small
  stuff.`
- Quick-entry chips: `AI friend chat`, `Anime school story`, `Roommate
  roleplay`, `Fictional crush chat`, `Fantasy adventure`, `Comfort companion`,
  `Create your own character`, `Talkie alternative with memory`.
- Character-card anchors should combine name + simple scenario, not only
  polished adjectives: `Chloe - fashion friend who remembers your last outfit`,
  `Mika - cozy cafe character who remembers your favorite drink`, `Liora -
  adult campus mentor for classmate-style roleplay`.

Density target:

- Do not chase a fixed density percentage. Keep `chat`, `character`, `anime`,
  `memory`, `story`, `create`, and `free` visible, but add grounded scene words
  through real UI text and character descriptions.
- A near-term healthy homepage should have 1,500-2,500 visible words, enough
  for category clarity without becoming a thin keyword page.
- AITDK should show more everyday terms after the refresh: `friend`, `crush`,
  `roommate`, `school`, `fantasy`, `comfort`, `create`, `free`, `remember`,
  and `story`.

Execution principle:

Long-tail phrases should define the ranking map; simple words should make the
page feel real. The next copy pass should turn the homepage from an SEO product
explanation into a character-story entry point without losing the memory-led
differentiator.

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
| P0 | `https://keepsay.dpdns.org/en/create-ai-character-with-memory` | Creation intent with memory; better product fit than exact `custom AI character creator`. |
| P0 | `https://keepsay.dpdns.org/en/ai-companion-that-remembers-you` | Emotional memory and companion-content references. |
| P1 | `https://keepsay.dpdns.org/en/ai-roleplay-secret-memory` | Private memory, secrets, promises, and story-continuity outreach. |
| P1 | `https://keepsay.dpdns.org/en/character-ai-alternative-with-memory` | Character.AI / Talkie alternative pages and comparison mentions. |
| P1 | `https://keepsay.dpdns.org/en/free-ai-character-chat` | Free AI chat directories and low-friction product listings; high competition. |
| P1 | `https://keepsay.dpdns.org/en/anime-ai-roleplay-characters` | Anime roleplay, character chat, and fandom-adjacent discovery pages. |
| P2 | `https://keepsay.dpdns.org/en/custom-ai-character-creator` | Keep for private creator-tool context; exact SERP skews toward image generators. |
| P2 | `https://keepsay.dpdns.org/en/talkie-ai-alternative` | Talkie alternative discussions and listicles. |

### Anchor Text Rules

Use mixed anchors. Avoid repeating exact-match anchors in bulk.

| Anchor Type | Target Share | Examples |
| --- | --- | --- |
| Brand | 45% | `Keepsay`, `Keepsay AI`, `Keepsay RolePlay` |
| Natural description | 35% | `an AI character chat app with memory`, `a private AI character creator`, `an AI roleplay app that remembers the story` |
| URL / naked link | 15% | `https://keepsay.dpdns.org/` |
| Exact or partial long-tail | 5% | `AI character chat with memory`, `AI companion that remembers you`, `create AI character with memory` |

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
| 11 | Pitch `create AI character with memory` and private creator angle to creator-tool pages. | 10 outreach rows. | Pending |
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
| `/ai-companion-that-remembers-you` | `ai companion that remembers you`, `ai companion with memory`, `chat with ai character who knows you` |
| `/ai-character-chat-with-memory` | `AI character chat with memory`, `AI roleplay with memory`, `AI roleplay app with good memory` |
| `/create-ai-character-with-memory` | `create AI character with memory`, `custom AI character with memory`, `create an AI character that remembers the story` |
| `/ai-character-chat-with-voice` | `ai character chat with voice`, `ai character chat that unlocks voice`, `voice AI roleplay` |
| `/private-ai-roleplay-secrets` | `ai companion with secrets`, `ai roleplay with private memories`, `chat with ai character who knows you` |
| `/custom-ai-character-creator` | `private AI character creator`, `custom chat character creator`, `make a private AI character` |

#### Layer 3: Low-Competition Long-Tail Pages

These should be prioritized after canonical/sitemap/metadata are stable because
they can rank faster than broad competitor terms.

| Landing Page | Primary Intent Cluster |
| --- | --- |
| `/anime-character-ai-chat` | `anime character ai chat no login`, `what app lets you chat with anime characters`, `anime AI roleplay` |
| `/ai-boyfriend-remembers-your-story` | `ai boyfriend that remembers your story`, `lonely AI companion`, `not alone AI chat` |
| `/roleplay-stories-character-ai-alternative` | `character ai alternative for roleplay stories`, `immersive roleplay chat`, `AI story companion` |
| `/create-ai-character-free` | `how to create your own AI character for free`, `create AI character free`, `create custom AI character free` |

#### Layer 4: Question Pages / People Also Ask

These can be standalone article-style pages or sections inside the relevant
landing pages.

| Question | Recommended Destination |
| --- | --- |
| `what is the best character ai alternative in 2026` | `/character-ai-alternative` |
| `which ai character app has the best memory` | `/ai-character-chat-with-memory` |
| `is there an ai like character ai with no filter` | `/character-ai-alternative` with careful safety language |
| `how do I create an AI character that remembers my story` | `/create-ai-character-with-memory` |
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

Historical recommended order from the 2026-06-09 domain/setup review:

1. `/ai-roleplay-secret-memory`
2. `/ai-roleplay-shared-memory`
3. `/create-ai-character-free`
4. `/anime-character-ai-chat`
5. `/talkie-ai-alternative`
6. `/character-ai-alternative`

At that point, `/ai-roleplay-secret-memory` was the first page to build because the exact
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

Refreshed recommended order after the 2026-06-30 Trends and SERP review:

1. `/ai-character-chat-with-memory`
2. `/create-ai-character-with-memory`
3. `/ai-companion-that-remembers-you`
4. `/ai-roleplay-secret-memory`
5. `/character-ai-alternative-with-memory`
6. `/anime-character-ai-chat`
7. `/talkie-ai-alternative`
8. `/create-ai-character-free`

This order keeps broad `AI character chat` language in the site architecture,
but puts new-domain ranking effort into memory-led and creation-with-memory
long tails. `create-ai-character-free` is still useful for low-friction
discovery, but it is no longer ahead of memory-led creation terms.

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
| SEO-G3 | Build `/create-ai-character-free` localized landing pages and add them to sitemap/tests | ⏳ pending | P2 | Keep as a free-creation support page, but 2026-06-30 keyword refresh demoted exact `custom AI character creator` / free-creation terms below memory-led creation intent. |
| SEO-G4 | Build `/character-ai-alternative` localized landing pages and add them to sitemap/tests | ⏳ pending | P1 | Broader competitor-alternative page; keep safety/no-filter wording careful and boundary-aware. |
| SEO-G5 | Build `/polybuzz-alternative` localized landing pages and add them to sitemap/tests | ⏳ pending | P2 | Optional competitor page after Talkie and Character.AI alternatives are live. |
| SEO-G6 | Add homepage and SEO-page internal links to the primary and growth landing pages | ✅ done | P0 | Added homepage guide links plus related-guide sections across the primary and growth SEO landing pages to concentrate authority around memory, anime roleplay, creation, and alternatives. |
| SEO-G7 | Add character detail page cross-links to relevant SEO pages | ✅ done | P1 | Character detail pages now render a related-guides block with scene-specific landing links plus memory, create-with-memory, and free-chat links. Clicks keep using `seo_scene_link_clicked` with `character_detail_related_guides` metadata. |
| SEO-G8 | Run final-domain PageSpeed Insights for core SEO pages and record results | ⏳ pending | P1 | Re-run against `https://keepsay.dpdns.org` after new pages ship. |
| SEO-G9 | Run Google Search Console URL Inspection for homepage, primary SEO pages, and new growth pages | ⏳ pending | P1 | Track indexing status, canonical selected by Google, and crawl issues. |
| SEO-G10 | SERP-validate each new page target before or immediately after publishing | ⏳ pending | P1 | Follow the SERP validation workflow above; prioritize terms where forums, Reddit, Quora, or thin pages rank. |
| SEO-G11 | Execute offsite backlink campaign and maintain backlink tracker/log | ▶ in progress | P0 | Daily cadence applies only to external submissions, outreach, community answers, and follow-ups. Tracker target rotation was refreshed toward memory/create-with-memory pages. Actual submissions/outreach remain blocked by login, CAPTCHA, paid-placement decisions, backlink requirements, or outreach identity approval. |
| SEO-G12 | Refresh creator-page copy around private chat-character creation with memory | ✅ done | P1 | Refreshed `/custom-ai-character-creator` metadata and page copy around `private AI character creator`, `create AI character with memory`, chat-first creation, memory seeds, and story continuity instead of broad image-generator SERPs. |
| SEO-G13 | Fix AITDK live-homepage audit issues | ✅ done | P0 | Local implementation replaces the ShipAny homepage social preview with a Keepsay character image, shortens homepage meta keywords, reorders homepage `ItemList` toward memory/create-with-memory pages, and adds more useful character-card alt/title/aria text. Requires post-deploy AITDK recheck to confirm live extension output. |
| SEO-G14 | Apply Talkie competitor lessons to IA, internal links, and comparison copy | ✅ done | P1 | Strengthened character-card anchor semantics, added restrained footer discovery links, refreshed `/talkie-ai-alternative` around memory/private continuity, and added `/ai-character-collections` as a clean collection/category index that groups memory, anime, comfort, free-chat, creator, and alternative paths around real character cards. |
| SEO-G15 | Refresh copy with grounded user vocabulary | ✅ done | P0 | Added everyday scene terms to homepage, scene rail, creator page, and Talkie alternative page: AI friend, fictional crush, roommate, classmate, comfort chat, fantasy adventure, anime school story, free chat, create character, and remembers-your-story examples. Avoided AI girlfriend/boyfriend and NSFW positioning. |
| SEO-G16 | Fix sitemap soft-404 character URLs | ✅ done | P0 | Local implementation maps anime seed characters into the shared local resolver, calls `notFound()` when server lookup cannot resolve a character, and extends `scripts/check-seo-url-rules.ts` so every local sitemap character ID must resolve. Local smoke verified `/en/character/rp-anime-004` returns 200 and `/en/character/not-a-real-character` returns 404. |
| SEO-G17 | Make public homepage/SEO pages cacheable | ✅ done | P0 | Removed homepage `force-dynamic` / `revalidate = 0`, switched initial homepage data to a public non-personalized loader, restored `revalidate = 3600`, and verified local public cache headers on `/en`. Production header recheck remains a deployment verification item. |
| SEO-G18 | Trim homepage and character meta descriptions | ✅ done | P0 | Homepage meta description is now 146 characters, and character meta descriptions are generated with a 155-character cap while preserving the memory-led intent. `scripts/check-seo-copy.ts` now enforces the length cap. |
| SEO-G19 | Expand character profile SEO content | ✅ done | P1 | Character pages now server-preload full public character data, render a 300+ word profile-specific `Character guide` block, expose memory hooks / quick-fit facts / related internal links, and add profile-specific FAQ content plus FAQPage JSON-LD. `scripts/check-roleplay-character-seo-profile.ts` enforces the local character profile word-count and link floor. |
| SEO-G20 | Resolve blog thinness or noindex empty blog listings | ✅ done | P1 | Temporarily removed `/blog` from the sitemap, set blog listing/category metadata to noindex, and changed missing blog posts/categories to true `notFound()` responses. Real posts plus Blog/CollectionPage/BreadcrumbList schema remain a future re-indexing prerequisite. |
| SEO-G21 | Normalize x-default hreflang behavior | ✅ done | P1 | Disabled next-intl's automatic HTTP alternate `Link` header because it generated x-default `/`; HTML alternates, root redirect, and sitemap now stay aligned around `/en`. |
| SEO-G22 | Add public-page security headers | ✅ done | P2 | Added CSP, HSTS, `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy`, COOP, and CORP in `next.config.mjs`; local HTTP smoke verified them on public pages. |
| SEO-G23 | Decide and implement AI-search / GEO policy | ✅ done | P2 | Added `/llms.txt`; robots now explicitly allows answer/reference crawlers `ChatGPT-User` and `PerplexityBot` on public pages while blocking training-oriented crawlers `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot`, and `Bytespider`. |

## Verification Log

- 2026-07-03 audit merge verification: merged the full-site audit issues from
  `../keepsay.dpdns.org-audit/` into this implementation plan as top-level
  remaining todos, a dedicated audit follow-up section, and SEO-G16 through
  SEO-G23 backlog rows. No app code changed in this pass.
- 2026-07-03 16:05 local implementation verification for SEO-G16 through
  SEO-G23: `pnpm check:roleplay-seo`, `node --import tsx
  scripts/check-seo-url-rules.ts`, `node --import tsx
  scripts/check-seo-copy.ts`, `pnpm lint`, and `pnpm build:fast` passed.
  `pnpm lint` reported 0 errors and 11 existing warnings. `pnpm
  format:check` still reports the repository's pre-existing formatting drift,
  so only the files touched in this pass were formatted with Prettier. Local
  production HTTP smoke on port 3010 verified `/en/character/rp-anime-004`
  returns 200, `/en/character/not-a-real-character` returns 404, `/en` returns
  public cache headers plus the new security headers, and `/robots.txt` plus
  `/llms.txt` expose the selected AI-search policy. Local build/smoke still
  logs `DATABASE_URL is not set` where DB-backed optional data is unavailable,
  then falls back successfully.
- 2026-07-03 16:33 local implementation verification for SEO-G7 and SEO-G19:
  added `scripts/check-roleplay-character-seo-profile.ts` and wired it into
  `pnpm check:roleplay-seo`. `node --import tsx
  scripts/check-roleplay-character-seo-profile.ts`, `node --import tsx
  scripts/check-seo-url-rules.ts`, `node --import tsx
  scripts/check-seo-copy.ts`, `pnpm check:roleplay-seo`, `pnpm lint`, and
  `pnpm build:fast` passed. The first sandboxed `pnpm check:roleplay-seo`
  attempt failed before business checks because `tsx` could not create an IPC
  pipe under `/var/folders/...`; rerunning the same command outside the
  sandbox passed. Local production HTML smoke on `/en/character/rp-anime-004`
  verified that `Character guide`, `memory story guide`, `Profile FAQ`, and
  `AI character chat with memory` appear in the returned HTML.
- 2026-07-03 16:49 local implementation verification for SEO-G14: added
  `/ai-character-collections`, extracted a reusable local-character-card helper,
  added the new path to sitemap/homepage/footer links, and extended SEO landing
  checks for collection-page JSON-LD. `node --import tsx
  scripts/check-roleplay-seo-landing-pages.ts`, `node --import tsx
  scripts/check-seo-url-rules.ts`, `node --import tsx scripts/check-seo-copy.ts`,
  `pnpm check:roleplay-seo`, `pnpm lint`, and `pnpm build:fast` passed. The
  first sandboxed `pnpm check:roleplay-seo` attempt failed before business
  checks because `tsx` could not create an IPC pipe under `/var/folders/...`;
  the escalated rerun passed. The first build caught a missing type-only import
  after the helper extraction; the import was restored and the rerun passed.
  Local production smoke on port 3011 verified `/en/ai-character-collections`
  returns 200 with public cache/security headers, contains `CollectionPage`,
  `ItemList`, and `FAQPage` JSON-LD, and that `/sitemap.xml` includes both
  `/en/ai-character-collections` and `/zh/ai-character-collections`.
- `node --import tsx scripts/check-seo-url-rules.ts`: passed. Confirms `/en`, `/zh`, localized character URLs, the `keepsay.dpdns.org` canonical host, and primary SEO landing sitemap URLs follow `localePrefix = always`.
- `node --import tsx scripts/check-seo-copy.ts`: passed. Confirms title,
  description, keywords, and description-length rules cover `AI Character
  Chat`, memory-led positioning, private-character language, and predictable
  homepage / character snippets.
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
- 2026-06-30 live `bb-browser` verification: `https://keepsay.dpdns.org/en`
  now returns the Keepsay title, description, canonical URL, `og:site_name`
  `Keepsay`, `WebSite.name` `Keepsay`, visible overview copy, visible FAQ copy,
  and `WebSite`, `ItemList`, plus `FAQPage` JSON-LD.
- 2026-06-30 keyword refresh verification: used `bb-browser` Google Trends
  with global, past-12-month, Google web-search scope and Google SERP adapter
  checks. Trends returned complete visible data for the benchmark group:
  `AI character chat` avg 77, `AI character creator` avg 12, and exact
  memory/custom-creator long tails at avg 0 or sparse data. Later Trends widget
  calls hit temporary 429 responses, so the plan records exact numbers only
  where the page rendered them and uses SERP density labels for competition.
- 2026-06-30 Talkie competitor verification: used `bb-browser` against
  `https://www.talkie-ai.com/` and the user's AITDK screenshots. The live
  session redirected to `/zh-Hant`, exposed localized meta/canonical tags, 3
  H1s, 219 links, 750 images with 171 missing alt attributes, footer SEO
  discovery links, hreflang alternates, and Organization/WebSite/WebPage/FAQPage
  JSON-LD.
- 2026-06-30 Keepsay density check: reviewed the user's AITDK screenshot and
  extracted the live homepage with `bb-browser`. Keepsay's top density terms
  are strategically relevant but less grounded than Talkie's character-story
  vocabulary, and the homepage has far less visible text than Talkie's large
  character gallery.
- 2026-06-30 density interpretation follow-up: documented that AITDK Density
  is a single-word frequency table, not a keyword strategy table. The plan now
  separates long-tail SEO phrases for ranking direction from simple scene words
  for natural homepage and character-card language.
- 2026-06-30 local implementation verification for SEO-G12/G13/G14/G15:
  `node --import tsx scripts/check-seo-copy.ts`,
  `node --import tsx scripts/check-home-positioning.ts`,
  `node --import tsx scripts/check-roleplay-seo-scenes.ts`,
  `node --import tsx scripts/check-roleplay-seo-landing-pages.ts`,
  `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm exec fumadocs-mdx`,
  `pnpm check:roleplay-seo`, and `pnpm build` passed. The first
  sandboxed `pnpm check:roleplay-seo` attempt failed before business checks
  because `tsx` could not create an IPC pipe under `/var/folders/...`; rerunning
  the same local check outside the sandbox passed. `pnpm lint` still reports
  existing warnings only, and local build still logs the expected
  `DATABASE_URL is not set` sitemap fallback before succeeding.

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
- 2026-06-30 11:20: Pushed `2741241` and `8f441b7` to `origin/main`, triggering Vercel auto-deploys. Verified production with `bb-browser`; homepage indexing-first hardening and brand-consistency fields are live.
- 2026-06-30 15:43: Refreshed keyword priorities with `bb-browser` Google
  Trends and SERP checks. Demoted exact `custom AI character creator` promotion
  because Trends showed sparse exact demand and SERPs skew to image/avatar
  generators; promoted memory-led chat and creation terms for outbound links,
  internal anchors, and next copy updates.
- 2026-06-30 16:08: Added AITDK extension findings to the SEO todo list.
  Live homepage issues to fix: stale ShipAny social preview image, 5 missing
  image alt texts, `ItemList` structured data order lagging the refreshed
  keyword priority, and overlong meta keywords.
- 2026-06-30 16:45: Added Talkie competitor analysis from `bb-browser` and the
  user's AITDK screenshots. The plan now tracks what to reference from Talkie's
  traffic, character-card SEO, footer discovery links, structured data, and
  multilingual setup, plus what to avoid: multiple H1s, missing alt/title
  hygiene, noisy density, and over-broad romance/IP positioning.
- 2026-06-30 16:50: Added a grounded vocabulary layer after comparing Keepsay's
  AITDK density screenshot with Talkie's. The next copy pass should keep the
  memory-led SEO strategy, but express it through user-native scene words such
  as AI friend, fictional crush, roommate, classmate, comfort chat, fantasy
  adventure, anime school story, free chat, create character, and remembers
  your story.
- 2026-06-30 16:57: Added the AITDK Density interpretation rule requested by
  the user: Talkie's simple words come from visible character-story text, while
  Keepsay's long strings come from SEO positioning. Future copy should use
  long-tail terms for page strategy and simple scene words for natural user
  language.
- 2026-06-30 17:44: Implemented the highest-priority local SEO plan items
  that do not require external account access. Completed SEO-G13 homepage
  audit fixes locally: homepage metadata now uses a Keepsay character social
  image instead of the stale ShipAny `preview.png`, meta keywords are shorter
  and memory-led, homepage `ItemList` starts with memory/create-with-memory
  pages, and character cards have descriptive alt/title/aria anchor text.
  Completed SEO-G15 grounded vocabulary refresh across homepage H1/subtitle,
  scene rail, overview, FAQ, proof points, creator page, and Talkie-alternative
  page. Completed SEO-G12 creator-page copy refresh around private
  chat-character creation with memory. Started SEO-G14 by adding footer
  discovery links and rewriting Talkie-alternative copy around memory/private
  continuity; category/collection page expansion remains pending. Updated the
  backlink tracker target rotation toward memory/create-with-memory pages, but
  no offsite submissions or outreach were performed because they require
  account/login/CAPTCHA, paid-placement decisions, backlink placement approval,
  or outreach identity.
- 2026-07-03 11:45: Merged the full-site audit issues from
  `../keepsay.dpdns.org-audit/` into this implementation plan. Added P0/P1
  follow-ups for character soft-404 sitemap risk, homepage no-store dynamic
  rendering, overlong descriptions, thin character/blog content, x-default
  hreflang consistency, security headers, and AI-search policy. Added
  SEO-G16 through SEO-G23 to the growth backlog.
- 2026-07-03 16:05: Implemented the site-edit items from the 2026-07-03 audit
  that were locally actionable without third-party accounts or production
  traffic data. Completed SEO-G16 by resolving local anime sitemap characters
  and returning true 404s for unresolved character IDs. Completed SEO-G17 by
  removing forced dynamic rendering from the homepage and using a public
  cacheable initial-data loader. Completed SEO-G18 by trimming homepage and
  character meta descriptions. Started SEO-G19 with a visible character
  `Memory and story` section. Completed SEO-G20 by temporarily noindexing blog
  listing/category surfaces, removing `/blog` from the sitemap, and returning
  true 404s for missing blog posts/categories. Completed SEO-G21 by disabling
  the conflicting next-intl HTTP alternate `Link` header. Completed SEO-G22 by
  adding baseline security headers. Completed SEO-G23 by adding `/llms.txt`
  and setting an AI-search policy that allows answer/reference crawlers while
  blocking training-oriented crawlers.
- 2026-07-03 16:33: Continued the local SEO implementation by completing
  SEO-G7 and SEO-G19. Character pages now use server-preloaded public
  character data instead of relying on a client-only fetch, render a
  profile-specific 300+ word `Character guide`, expose quick-fit memory hooks,
  show related SEO guide links, and include profile-specific FAQ content in
  both visible HTML and FAQPage JSON-LD. Added a reusable
  `buildRoleplayCharacterSeoProfile` helper plus a dedicated profile-depth
  check script, then wired the check into `pnpm check:roleplay-seo`.
- 2026-07-03 16:49: Completed SEO-G14 by adding a clean
  `/ai-character-collections` category index. The page groups memory, anime,
  comfort, free-chat, private-creator, and alternative discovery paths; links
  each path to real local character cards; emits `CollectionPage`, `ItemList`,
  `BreadcrumbList`, and `FAQPage` JSON-LD; and is linked from homepage guide
  surfaces, footer discovery links, and the XML sitemap.
