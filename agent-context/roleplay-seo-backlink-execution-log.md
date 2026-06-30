# RolePlay SEO Backlink Execution Log

## 2026-06-30

Status: indexing-first production release prepared

### Completed

- [x] Rechecked the current dirty worktree and split the changes into
  indexing-first SEO hardening versus unrelated product reliability fixes.
- [x] Confirmed the SEO changes support the current `Crawled - currently not
  indexed` priority: homepage brand/metadata alignment, visible overview
  content, visible FAQ content, server-rendered FAQ JSON-LD, and permanent root
  redirect to `/en`.
- [x] Confirmed the non-SEO changes do not touch robots, sitemap, canonical,
  noindex, or the crawlable homepage content path. They affect image provider
  error handling, OpenRouter image payload handling, and Quick Create/edit
  draft image persistence.
- [x] Ran release checks successfully:
  `pnpm exec tsc --noEmit`, `pnpm lint`,
  `node --import tsx scripts/check-seo-copy.ts`,
  `node --import tsx scripts/check-seo-url-rules.ts`, and `pnpm build`.
- [x] Noted that direct Vercel CLI deployment was the wrong path for this
  project workflow and also failed during upload with a TLS/network abort.
  Deployment should proceed through GitHub push, which triggers Vercel
  automatically.

### Current Status

- Current code is ready to push to GitHub for the normal Vercel auto-deploy
  flow.
- Live verification is still pending until the GitHub-triggered Vercel
  deployment finishes.

### Next Actions

- Push the prepared commit to `origin/main`.
- After Vercel completes, rerun `bb-browser` checks for
  `https://keepsay.dpdns.org/en`: title, description, canonical, overview
  copy, FAQ copy, and FAQ JSON-LD.
- If live verification passes, request URL Inspection for
  `https://keepsay.dpdns.org/en` in Google Search Console.

## 2026-06-29

Status: planning converted to offsite execution workflow

### Indexing Diagnosis

- [x] Reviewed the Google Search Console screenshots supplied by the user.
  GSC reports `Crawled - currently not indexed`, not `Discovered - currently
  not indexed`, for:
  `http://keepsay.dpdns.org/`, `https://keepsay.dpdns.org/`, and
  `https://keepsay.dpdns.org/en`.
- [x] Confirmed the examples were last crawled on 2026-06-09 and the affected
  URL count shown in GSC is 3.
- [x] Checked public search visibility for `site:keepsay.dpdns.org`; no visible
  indexed results were found during this review.
- [x] Verified live redirect/crawl signals:
  `http://keepsay.dpdns.org/` redirects to HTTPS, `https://keepsay.dpdns.org/`
  redirects to `https://keepsay.dpdns.org/en`, and
  `https://keepsay.dpdns.org/en` returns 200.
- [x] Verified live `robots.txt` allows general search crawling and points to
  `https://keepsay.dpdns.org/sitemap.xml`.
- [x] Verified live `sitemap.xml` contains localized homepage, SEO landing page,
  legal page, and character page URLs under `https://keepsay.dpdns.org`.
- [x] Recorded the conclusion in `roleplay-seo-implementation-plan.md`:
  current evidence points to weak authority/new-domain quality evaluation and
  canonical confidence, not a hard robots/sitemap block.
- [x] Tried to continue deeper HTML inspection and bb-browser usage. Direct
  `bb-browser` is not on PATH in this shell, and later network attempts were
  blocked by the approval service returning 429/503. The successful live header,
  robots, and sitemap checks are still enough for the current indexing
  diagnosis.
- [x] Re-ran live `bb-browser` verification through the local CLI path. The
  live page `https://keepsay.dpdns.org/en` still shows the old title
  `AI Character Chat & AI Roleplay | RolePlay`, old description, old `WebSite`
  JSON-LD name `RolePlay`, and no visible homepage FAQ/overview copy yet. This
  confirms the indexing hardening code is not deployed to production yet.

### Completed

- [x] Prioritized the indexing fix path on the site itself: changed the root
  `/` redirect to a permanent `/en` redirect, expanded the homepage with a
  clearer product explanation block, added visible FAQ content, and aligned
  homepage SEO copy to the Keepsay brand while keeping the existing landing
  page intent structure.
- [x] Added server-rendered FAQ structured data on the home page and removed
  the duplicate client-side FAQ JSON-LD so the page has one clean schema
  source.
- [x] Clarified that the day-by-day cadence is for offsite backlink execution,
  not daily edits to the Keepsay site.
- [x] Updated `roleplay-seo-implementation-plan.md` with a dedicated offsite
  backlink plan, target pages, anchor rules, quality rules, 30-day external
  execution schedule, and outreach templates.
- [x] Created `roleplay-seo-backlink-tracker.md` with KPI snapshot, status
  legend, target page rotation, and row schema.
- [x] Created this backlink execution log for daily status updates.
- [x] Added the first 4 backlink prospects to the tracker:
  Futurepedia, Toolify, Product Hunt, and SaaSHub.
- [x] Marked paid or login-gated opportunities as `blocked` instead of
  treating them as completed submissions.
- [x] Added four more directory prospects to the tracker: FutureTools,
  ToolPilot, TopAI.tools, and AITopTools.

### Current Status

- Offsite execution workflow is active.
- Current tracker count: 8 qualified prospects, 0 submissions, 0 outreach
  messages, 0 live links.
- Homepage hardening for indexing is in place; next verification step is to
  deploy it, verify the live page shows the new Keepsay title/description,
  overview block, and FAQ JSON-LD, then request GSC URL Inspection for
  `https://keepsay.dpdns.org/en` and watch for the bucket to move out of
  `Crawled - currently not indexed`.
- The tracker now has 8 qualified prospects. Two are active prospects that can
  move forward after form/CAPTCHA/account review, and six are blocked because
  they require payment, login, launch-account access, or a backlink condition.
- No third-party submissions, emails, or community posts were completed in this
  session because those actions require account access, login, CAPTCHA, paid
  placement decisions, or outreach identity approval.
- Site changes should be handled as batched prerequisites/backlog work, not as
  a daily schedule. The daily cadence is only for external backlink work.

### Blockers / Needs

- Need account access or user approval before submitting to third-party
  directories, launch platforms, communities, or any site requiring login.
- Need a decision on whether paid placements are allowed at all. Default is
  unpaid only.
- Need a name/email identity to use for outreach if direct editor/blogger
  pitches should be sent.

### Next Actions

- Deploy the current SEO hardening changes to production before requesting
  indexing again.
- After deployment, rerun `bb-browser` verification for page title,
  description, canonical, FAQ JSON-LD, and visible overview/FAQ copy.
- Build the remaining 42 prospects for the first 50-prospect batch across AI
  tool directories, startup directories, AI companion/character chat comparison
  pages, and relevant communities.
- Move suitable rows in `roleplay-seo-backlink-tracker.md` from `prospect` to
  `submitted` or `outreach_sent` as work happens.
- Record replies, live URLs, link attributes, and rejection reasons here after
  each execution session.
