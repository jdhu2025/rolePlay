# RolePlay KGR Keyword Audit

Date: 2026-07-04

Source plan: `agent-context/roleplay-seo-implementation-plan.md`

## Method

KGR formula:

```text
KGR = Google intitle result count / average monthly searches
```

Decision rule from the SEO simulator:

| KGR | Decision |
| --- | --- |
| `< 0.25` | Strongly recommended. Treat as a potential treasure keyword. |
| `0.25 - 1.0` | Usable, but normally needs more authority and backlinks. |
| `> 1.0` | Difficult for a new or low-authority site. |

Backlink estimate rule:

The SEO simulator estimates needed referring domains from KD, not from KGR.
Use the paid-tool KD value, then map it roughly like this:

| KD | Approx. referring domains needed |
| --- | ---: |
| 10 | 10 |
| 20 | 22 |
| 30 | 36 |
| 40 | 56 |
| 50 | 84 |
| 60 | 129 |
| 70 | 202 |
| 80 | 353 |

## Current Data Status

Ahrefs and SearchVolume.io are behind human verification / reCAPTCHA in the
current browser session, and DataForSEO MCP tools are not connected. Because of
that, this audit does not fabricate search volume, KD, or referring-domain
counts.

Known verified rows from the user's Google screenshots / manual checks and
provided volume:

| Keyword | Target page / cluster | Google intitle count | Avg. monthly searches | KGR | KD | Referring domains | Decision |
| --- | --- | ---: | ---: | ---: | --- | --- | --- |
| `ai character chat free` | exact-order free chat intent / homepage-first free chat intent | 591 | 14,800 | 0.0399 | Pending Ahrefs KD | Pending KD | Treasure keyword confirmed by KGR; build/strengthen `/free-ai-character-chat` around the exact `ai character chat free` order without losing memory positioning. |
| `ai character chat without login` | no-login / low-friction free chat intent | 3 | 6,600 | 0.00045 | Pending Ahrefs KD | Pending KD | Treasure keyword confirmed by KGR; only use exact "without login" positioning if the product truly supports a no-login first chat experience. |

## Batch CSV Input Format

Export or paste rows in this shape, then calculate KGR:

```csv
keyword,target_page,intitle_count,monthly_searches,kd,kgr,estimated_referring_domains,decision
ai character chat free,/free-ai-character-chat,591,14800,,=C2/D2,,Treasure if KGR < 0.25
ai character chat without login,/free-ai-character-chat,3,6600,,=C3/D3,,Treasure if KGR < 0.25
```

## Focused Keyword Checklist

Current strategy: remove the other unproven KGR candidates from this active
KGR plan and focus execution on the two confirmed treasure keywords below.
The broader memory, creation, anime, and alternative keywords remain preserved
in `roleplay-seo-implementation-plan.md` for supporting copy, internal links,
FAQ language, and future validation.

| Priority | Keyword | Target page / cluster | Intent | Data status | Notes |
| --- | --- | --- | --- | --- | --- |
| P0 | `ai character chat free` | `/free-ai-character-chat` or homepage free-chat section | Exact-order free chat | KGR calculated | Confirmed treasure keyword: 591 / 14,800 = 0.0399. This exact word order is the primary target. |
| P0 | `ai character chat without login` | `/free-ai-character-chat` or no-login entry section | Free/no-login chat | KGR calculated | Confirmed treasure keyword: 3 / 6,600 = 0.00045. Use exact claim only if no-login chat is actually supported. |

## Implementation Status

Already done:

- `/free-ai-character-chat` exists as a localized landing page.
- It is included in the sitemap and linked from homepage / SEO discovery paths.
- Product code allows limited guest chat before sign-in:
  `GUEST_REPLY_LIMIT = 6` in `/api/roleplay/chat`.
- 2026-07-04 update retargeted the English title, meta description, H1,
  sections, and FAQ around exact `AI character chat free` plus
  `AI character chat without login`.
- 2026-07-04 homepage follow-up retargeted the first viewport and homepage meta:
  the H1 starts with `AI character chat free`, the subtitle includes
  `without login` and `first guest replies`, primary CTA starts free chat, and
  create-character remains as the secondary path.
- 2026-07-05 field-weight refinement moved the homepage meta title to keyword
  first order, kept exact `AI character chat free` in the H1, added exact
  `AI character chat without login` to subtitle / FAQ / right-card H2, and kept
  anime, fantasy, roommate, comfort, and fictional crush as natural scene terms.
- 2026-07-05 follow-up added `free AI character chat without login` as a
  secondary exact-order variant in H2/FAQ positions. Treat it as support for the
  no-login intent, not as a reason to duplicate the same target across many
  pages.
- `scripts/check-roleplay-seo-landing-pages.ts` now guards both KGR phrases and
  requires the no-login claim to stay framed as guest replies / guest identity.
- `scripts/check-home-positioning.ts` and `scripts/check-seo-copy.ts` now guard
  the homepage KGR wording.

Still needed:

- Ahrefs/DataForSEO/Semrush KD for each of the two active keywords.
- Backlink/referring-domain estimate after KD is known.
- Post-deploy check that Google sees the updated title, description, FAQ, and
  canonical page.

## Current Treasure Keywords

| Keyword | Why it qualifies | Next action |
| --- | --- | --- |
| `ai character chat free` | KGR is 0.0399, far below 0.25. It also matches the product's free chat entry point. | Keep this exact order as the primary phrase for `/free-ai-character-chat`; use `free AI character chat` only as a supporting variant. Confirm Ahrefs KD for backlink estimates. |
| `ai character chat without login` | KGR is 0.00045, far below 0.25, with extremely low `intitle` competition. | Confirm whether the product can honestly offer no-login first chat. If yes, make this a dedicated section/page angle; if no, keep it as a future product/SEO opportunity rather than an exact title claim. |

## Parked Keywords

All other candidate keywords are parked for now because they either have no
confirmed monthly search volume or no confirmed KGR. Do not build standalone
pages for them in the current KGR sprint. Use them only as natural supporting
phrases where they fit the product:

- memory / story continuity copy
- FAQ questions
- internal link anchor variants
- future Ahrefs/SearchVolume validation batches

## Next Data Needed

To finish backlink estimates for the two active keywords, collect these fields:

1. KD from Ahrefs/DataForSEO/Semrush.
2. Current top-ranking page quality and referring domains for each keyword.
3. Confirmation that the product can honestly support the `without login` claim.

Then calculate:

```text
KGR = intitle_count / monthly_searches
estimated_referring_domains = KD mapped to the simulator table above
```
