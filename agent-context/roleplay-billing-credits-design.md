# RolePlay Billing / Credits Design

> Draft date: 2026-05-28
>
> Goal: let users taste the core roleplay loop for free, convert at the moment
> of emotional intent, make the first paid step feel extremely cheap, and keep
> text / image / voice / video costs bounded.

## 1. Principles

- Do not charge before the user feels the character. Anonymous users can get 6
  free AI replies. Show a soft sign-in prompt after the 3rd reply and a hard
  sign-in gate after the 6th reply.
- Subscriptions sell relationship continuity: more chats, memory, voice, photos,
  private scenes, custom characters.
- Credits meter expensive actions. Subscription unlocks access and grants a
  monthly credit allowance; credits are still consumed for costly media.
- Text should feel generous, not like every sentence is being charged. Use
  hidden monthly chat allowance, fair-use limits, and server-side throttles
  instead of making the user stare at per-message scarcity.
- The first purchase must be almost frictionless. Use a one-time $1.99-$2.99
  new-user offer or first-month discount before asking users to commit to a
  full subscription.
- Media must always be 18+ safe and policy-checked. "Private" means user-private
  or relationship-context media, not a promise of explicit content.

## 2. Market Anchors

- Character.AI c.ai+ is publicly listed at $9.99/month and $94.99/year, with
  better memory, ad-free chats, latest models, no slow mode, unlimited voice
  calls, and customization.
- Candy AI publicly lists $13.99/month, $8.99/month quarterly, and $3.99/month
  annually, with unlimited text messages and 100 tokens/month.
- Our first version should use a sharper low-price entry than c.ai+. The main
  acquisition hook should be Lite / first-purchase offers at $1.99-$3.99, while
  Plus and Pro capture higher intent users.

## 3. Credit Unit

Use `credit` as the user-facing unit already supported by ShipAny.

Recommended internal mental model:

- 1 credit ~= one lightweight text reply.
- 10 credits ~= one small premium action.
- 60-120 credits ~= one generated image.
- 250+ credits ~= video / long call / heavy generation.

User-facing mental model:

- "Messages are included in your plan."
- "Credits are for premium moments: photos, voice, calls, private scenes, and
  creator tools."
- Avoid showing users that every normal reply burns 1 credit unless they are on
  the free tier and close to the limit.

Internal target:

- Keep blended gross margin above 75%.
- Media prices should assume provider cost volatility and leave room for retries.
- All consume checks must run server-side with idempotency keys.

## 4. User States

| State | Allowance | Gate |
| --- | ---: | --- |
| Guest | 6 AI replies total per browser/device fingerprint | Soft prompt after 3 replies; hard sign-in after 6 |
| Registered Free | 120 starter credits, valid 10 days | Low balance: upgrade / buy credits |
| Free Daily Drip | claim 5 credits/day, max 30-60/month | Optional; enable only after abuse controls |
| Lite | low-price chat continuity plan | Better chat / memory, limited media |
| Plus | monthly plan credits + unlocked premium features | Fair-use throttles still apply |
| Pro | larger credits + priority + creator features | Higher media limits |

Starter credits recommendation: `N = 120`, valid for 10 days.

Why 120:

- Enough for 60-100 text turns depending on model tier and queue rules.
- Enough to try one basic generated image or several voice messages after
  registration.
- Small enough that account farming is not catastrophic.
- Short enough validity to create a reason to return within the first week.

Abuse controls:

- Guest 6 replies by device cookie + IP bucket + local storage.
- Starter credits only once per verified email / OAuth account.
- Optional phone or CAPTCHA challenge before granting another free starter pack.
- Do not grant starter credits to disposable email domains at full amount; grant
  30 preview credits instead.

## 5. Credit Spend Matrix

### Chat

| Action | Free | Lite | Plus | Pro | Credits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Text reply, normal model | yes | yes | yes | yes | 1 |
| Text reply, premium model | no | limited | yes | yes | 2 |
| Long context reply | no | no | limited | yes | 3 |
| OOC rewrite / "不像" regenerate | 3/day | 8/day | 20/day | 60/day | 0 first retry, then 1 |
| Long-term memory extraction | limited | basic | yes | yes | bundled |

Cost control:

- Keep default replies short: 1-3 short paragraphs.
- Summarize old history; never send full chat history beyond recent turns.
- Downgrade model automatically when backlog or cost threshold is high.
- Add daily text cap even for paid users, but show it as fair use, not "hard
  scarcity".

### Images

| Action | Credits |
| --- | ---: |
| Unlock preset locked photo | 20 |
| Chat-context generated photo | 60 |
| Higher quality generated photo | 100 |
| Image-to-image / user image reference | 120 |
| Private scene image | 120 |
| Failed generation | refund automatically |

Trigger:

- User explicitly asks to see a photo / picture / outfit / scene.
- User taps a photo / gallery / private scene CTA.
- The prompt must include current scene + roleplay context + visual identity.

### Voice / Call

| Action | Credits |
| --- | ---: |
| Opening voice | 0 |
| First reply voice per character | 0 |
| Generate voice for a reply | 5 |
| Voice chat message | 8 |
| Phone mode | 12 / minute |
| Pro priority voice | same credits, faster queue |

### Video / Live Action

P0 should show this as "coming soon" or gated preview unless provider quality and
safety are ready.

| Action | Credits |
| --- | ---: |
| Short private video preview | 250 |
| High quality private video | 500 |
| Failed generation | refund automatically |

### Creator / Character Supply

| Action | Free | Lite | Plus | Pro | Credits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Create draft manually | 1 active draft | 3 active drafts | 10 active drafts | 50 active drafts | 0 |
| AI Writer character card | 1/day | 5/month | 20/month | 100/month | 10 |
| AI avatar | no | limited | yes | yes | 20 |
| AI cover / background | no | limited | yes | yes | 20 |
| Publish private character | 1 free/month | 3/month | 10/month | 50/month | then 20 |
| Submit public character | 1 free/month | 2/month | 5/month | 20/month | then 50 |
| Public review re-submit | 1 free/rejection | 1 free/rejection | 3 free/rejection | 5 free/rejection | then 20 |

Why public publishing costs more:

- It creates moderation load.
- It adds storage and indexing surface.
- It discourages low-effort spam.

### Social / Economy

| Action | Credits |
| --- | ---: |
| Tip character small | 10 |
| Tip character medium | 50 |
| Tip character large | 200 |
| Unlock secret space episode | 40 |
| Save generated media to Collection | 0 |
| Download original media | Plus/Pro only or 5 credits |

Creator rewards can be introduced later:

- Public character reaches milestones -> grant creator bonus credits.
- Do not promise cash-out in P0.

## 6. Plans

### Recommended Pricing

Use a four-layer ladder:

1. Free creates the emotional hook.
2. First-purchase / Lite removes the payment barrier.
3. Plus becomes the default value plan.
4. Pro captures heavy users and creators.

| Plan | Monthly | Quarterly | Yearly | Credits / month | Positioning |
| --- | ---: | ---: | ---: | ---: | --- |
| Free | $0 | - | - | 30 drip after starter | try, browse, light chat |
| Lite | $3.99 | - | $35.88/year ($2.99/mo) | 600 | cheap chat continuity |
| Plus | $7.99 | $6.99/mo | $47.88-$59.88/year ($3.99-$4.99/mo) | 1,200 | best value for most users |
| Pro | $19.99 | $15.99/mo | $143.88/year ($11.99/mo) | 3,600 | heavy chat + creator + media |

Intro offer:

- First purchase: $1.99-$2.99 for 200-350 credits plus 3 days of Plus-like
  benefits. One per verified user.
- First-month Lite or Plus: $1.99-$2.99 if we want the lowest possible paywall
  conversion friction.
- First-year Plus yearly: $47.88-$49.99/year ($3.99-$4.17/month) as a launch
  offer.
- Renewal: $59.88/year ($4.99/month) or $71.88/year ($5.99/month), depending on
  early retention data.
- Keep Pro yearly at $143.88/year ($11.99/month).

One-time credit packs:

| Pack | Price | Credits | Bonus |
| --- | ---: | ---: | ---: |
| First Spark | $1.99 | 200 | one-time new-user pack |
| Spark | $2.99 | 300 | - |
| Glow | $4.99 | 550 | +10% |
| Flare | $9.99 | 1,100 | +10% |
| Muse | $19.99 | 2,400 | +20% |
| Studio | $49.99 | 6,500 | +30% |

### Free

Core rights:

- Browse all public characters.
- Guest: 6 free AI replies before login gate.
- Registered: 120 starter credits, 10-day validity.
- 1 active draft character.
- 1 public submission/month.
- Basic memory, short history.
- Ads / upgrade entry allowed.

Gates:

- No private media generation.
- No phone mode.
- Extra voice and image actions require credits.
- Low balance prompts show First Spark first, Lite second, Plus third.

### Lite

Value promise:

> Keep the story going for less than a coffee.

Rights:

- 600 monthly credits or equivalent hidden chat allowance.
- Better chat continuity than Free.
- Basic long-term memory and cloud sync 30 days.
- Ad-light or ad-free during beta.
- 3 active private characters.
- Voice generation and generated photos are visible but mostly paid by credits.

Fair use:

- 150 text replies/day soft cap.
- 5 generated images/day hard cap.
- 20 voice generations/day hard cap.

Why Lite exists:

- It gives price-sensitive users an easy "yes".
- It creates payment method attachment early.
- It lets us reserve Plus for stronger media and memory value instead of making
  Plus carry all acquisition pressure.

### Plus

Value promise:

> Keep your favorite characters close: more messages, better memory, voice,
> photos, and custom characters.

Rights:

- 1,200 credits/month.
- Premium text model access.
- Better memory and cloud sync 120 days.
- Ad-free.
- 10 active private characters.
- 5 public submissions/month.
- Chat-context photos enabled.
- Voice generation enabled.
- Secret space episodes enabled.
- Standard queue priority.

Fair use:

- 400 text replies/day soft cap.
- 20 generated images/day hard cap.
- 60 voice generations/day hard cap.

### Pro

Value promise:

> For heavy roleplay and creators: priority responses, long memory, more media,
> and a bigger character studio.

Rights:

- 3,600 credits/month.
- Priority model / faster queue.
- Long memory and cloud sync 365 days.
- 50 active private characters.
- 20 public submissions/month.
- Higher-quality images enabled.
- Phone mode enabled.
- Early access to video / live action when ready.
- Creator analytics and quality tools.

Fair use:

- 1,200 text replies/day soft cap.
- 100 generated images/day hard cap.
- 180 voice generations/day hard cap.
- Phone max 60 minutes/day.

## 7. Login And Paywall Moments

### Guest Reply Gate

After the 3rd AI reply, show a soft prompt without blocking the conversation:

Title: "Save this story"

Body:

> Sign in to keep your chat with Chloe and get 120 starter credits.

CTA:

- Primary: "Save and continue free"
- Secondary: "Maybe later"

After the 6th AI reply, require sign-in:

Title: "Keep this story going"

Body:

> Sign in to save your chat with Chloe and get 120 starter credits.

CTA:

- Primary: "Continue free"
- Secondary: "See Plus"

Do not erase the draft. If the user typed the 4th message before signing in,
keep it in the composer and send after auth.

### First-Purchase Gate

Trigger when a registered free user runs out of starter credits or asks for a
photo / voice moment with insufficient balance.

Primary offer:

- "$1.99 starter pack"
- "200 credits + 3 days of Plus benefits"
- One-time only, verified account only.

Secondary offer:

- Lite monthly for $3.99.
- Plus yearly launch offer if the user has already shown repeated activity.

### Low Credit Gate

Trigger at balance below next action cost.

Priority:

1. If user is Free: show First Spark first, Lite second, Plus third.
2. If user is Lite: show Plus first, credit packs second.
3. If user is Plus/Pro: show credit packs.
4. If action is creator publishing: explain moderation cost.

### Media Intent Gate

When user asks "send me a photo" or taps photo CTA:

- If enough credits: show compact confirmation with cost.
- If not enough: show "Plus includes monthly credits" and "Buy credits".
- Always show safety text: generated images follow platform rules.

## 8. Expiration Rules

- Starter credits: expire in 10 days.
- Subscription credits: expire at the end of the billing period.
- Purchased credit packs: expire in 12 months.
- Gift / creator reward credits: expire in 90 days.
- Consume FIFO by nearest expiration, which matches the current ShipAny credit
  model.

Rollover:

- Plus: unused monthly credits can roll over up to 1x monthly grant while active.
- Pro: unused monthly credits can roll over up to 2x monthly grant while active.
- On cancellation, subscription-granted credits expire at period end; purchased
  packs remain until their original expiration.

## 9. Server Enforcement

All checks should happen server-side:

- `roleplay_entitlement` resolver: returns plan, active subscription, monthly
  caps, feature flags.
- `roleplay_usage` ledger: records guest replies, text replies, media actions,
  voice seconds, phone minutes, public submissions.
- `credit` ledger: existing ShipAny table remains the source of truth for
  paid-unit balance.
- Every paid action must use an idempotency key:
  `userId + actionType + requestId`.
- On provider failure, automatically refund consumed credits.
- Never trust frontend cost values.

Suggested scenes for `credit.transactionScene`:

- `roleplay_text`
- `roleplay_image`
- `roleplay_voice`
- `roleplay_phone`
- `roleplay_secret_space`
- `roleplay_tip`
- `roleplay_ai_writer`
- `roleplay_publish`

## 10. Rollout

Phase 1:

- Guest soft prompt after 3 replies and hard sign-in gate after 6 replies.
- Register grants 120 starter credits with 10-day validity.
- Free text chat consumes 1 credit after starter/free allowance; paid plans use
  hidden allowance and fair-use limits.
- Low-credit modal.
- First Spark $1.99-$2.99 pack.

Phase 2:

- Image and voice credit consumption.
- Collection/Gallery saves generated media.
- Lite and Plus pricing page with checkout.

Phase 3:

- Creator limits, publish costs, public submission quotas.
- Pro plan.
- Phone mode.

Phase 4:

- Video / live action preview if safe and economically viable.
- Creator reward credits.

## 11. Open Decisions

- Whether Free gets daily claim credits immediately or only during beta.
- Whether text replies should be visible credits on Free only, then hidden inside
  plan allowance for paid users.
- Whether Lite should be a permanent plan or a first-90-days acquisition plan.
- Whether Pro should launch at the same time as Plus or stay "coming soon".
- Whether annual Plus first-year discount should be permanent or launch-only.
- Whether $1.99 first purchase should include temporary Plus benefits or credits
  only.

## 12. Value And Experience Plan

The pricing page should not only look cheap. The product must repeatedly prove
that each paid tier feels better than Free.

### Missing Or Weak Capabilities

| Area | Current risk | Needed improvement | Priority |
| --- | --- | --- | --- |
| Onboarding | Users may hit paywall before they feel attachment | 6-reply guest flow, character cold open, saved draft after sign-in | P0 |
| Memory | "Better memory" is hard to feel | visible memory moments, editable memories, "remember this" action | P0 |
| Paywall timing | Generic upgrade modal can feel like interruption | intent-aware paywalls for chat, photo, voice, creator actions | P0 |
| Value clarity | Credits are abstract | show examples: "about 20 photos" / "hundreds of messages" | P0 |
| First purchase | $7.99-$9.99 may be too much for first commitment | one-time $1.99-$2.99 starter pack | P0 |
| Roleplay quality | Cheap price cannot compensate for weak replies | persona consistency, retry/rewrite, scene memory, tone controls | P0 |
| Media trust | Users fear wasting credits on bad generations | preview confirmation, automatic refund on failure, quality rating | P1 |
| Voice | Voice can be expensive and uneven | free first voice per character, short voice preview, queue status | P1 |
| Retention | Monthly credits alone may not create habit | daily check-in, streak bonus, character messages, story milestones | P1 |
| Creator value | Creator features are listed but not emotionally priced | templates, quality score, analytics, public submission feedback | P2 |
| Transparency | Users may feel "hidden costs" | clear credit history, upcoming renewal, rollover balance | P2 |
| Abuse control | Generous free plan can be farmed | disposable email rules, IP/device buckets, CAPTCHA/phone challenge | P0 |

### P0 Product Work

- Build the 6-reply guest funnel with a non-blocking 3-reply sign-in prompt.
- Preserve typed messages and chat state across sign-in and checkout.
- Add the First Spark offer and one-time eligibility enforcement.
- Implement entitlement resolver for Free / Lite / Plus / Pro.
- Hide normal per-message credit burn for paid users; expose allowance only near
  limits.
- Add server-side usage ledger for guest replies, text replies, media actions,
  voice seconds, phone minutes, and public submissions.
- Add idempotency keys and automatic refunds for failed paid actions.
- Add clear low-balance modals that explain the next best option.

### P1 Product Work

- Add editable memory cards: user can view, pin, delete, or correct what a
  character remembers.
- Add "better reply" actions: retry, make warmer, make shorter, stay in
  character, continue scene.
- Add photo confirmation UI with cost, style, character identity, and safety
  note before consuming credits.
- Add first free voice sample per character and a paid voice preview flow.
- Add daily return loop: claim credits, character message, story milestone,
  streak bonus.
- Add in-app value meter: show what the current plan unlocked this month.

### P2 Product Work

- Add creator studio upgrades: character templates, AI card writer, cover/avatar
  generation, publishing checklist.
- Add creator analytics: chats started, favorites, retention, ratings, quality
  suggestions.
- Add collections: saved photos, favorite scenes, private story archive.
- Add plan comparison analytics: conversion by paywall moment, first-purchase
  conversion, credit burn, refund rate, gross margin by action.
- Add lifecycle offers: winback discount, annual upgrade offer, low-balance
  bundle, creator bundle.

### Value Messaging

Recommended paid value language:

- Lite: "Keep the story going for less than a coffee."
- Plus: "More memory, more messages, photos and voice when the moment hits."
- Pro: "For heavy roleplay and creators who want priority, long memory, and a
  bigger studio."

Avoid:

- "Unlimited" unless there are clear fair-use terms.
- Showing a hard per-message meter to paid users.
- Making media feel free when it is actually the main cost center.
