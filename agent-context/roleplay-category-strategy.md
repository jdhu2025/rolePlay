# RolePlay Category Strategy

## Goal

Use a stable top-level category system that can cover the current original
characters and scale to future batches, especially anime/game characters aimed
at younger users.

The category system should answer one question first:

> Where should users go to find this character?

Specific traits such as occupation, personality, location, outfit, or scene
should remain character tags or metadata, not top-level categories.

## Top-Level Categories

Use the existing 8 canonical categories as the primary homepage taxonomy:

| Slug | English | Chinese | Purpose |
| --- | --- | --- | --- |
| `featured` | Featured | 精选 | Manual homepage promotion and strongest first-screen picks. |
| `recommend` | Recommend | 推荐 | Broad recommendation pool for quality or conversion-friendly characters. |
| `play_fun` | Play & Fun | 娱乐 | Dating, flirting, casual roleplay, nightlife, warm companionship. |
| `helper` | Helper | 助手 | Career, advice, coaching, planning, productivity, learning support. |
| `original` | Original | 原创 | Platform-owned original characters. Default for current realistic characters. |
| `anime_game` | Anime & Game | 动漫游戏 | Anime, manga, game-inspired, VTuber-like, fantasy anime styles. |
| `fiction_media` | Fiction & Media | 影视文学 | Fictional archetypes inspired by movies, novels, dramas, or genres. |
| `icon` | Icon | 图标 | Celebrity/icon-style characters. Use carefully for compliance. |

## Current Character Classification

The current realistic platform-owned characters should all belong to
`original`. Some can also be placed in promotion or usage categories.

| Character | Recommended Categories | Notes |
| --- | --- | --- |
| Chloe | `featured`, `recommend`, `original`, `play_fun` | Strong dating/cozy first-screen candidate. |
| Sienna | `original`, `helper`, `recommend` | Style advice, personal-image helper, warm lifestyle appeal. |
| Amara | `original`, `play_fun` | Travel, beach, relaxed companionship. |
| Valeria | `featured`, `original`, `play_fun` | Confident resort/nightlife energy. |
| Leila | `original`, `recommend` | Elegant, soft, hospitality-oriented companion. |
| Priya | `original`, `helper` | Career, architecture, thoughtful conversation. |
| Elena | `original`, `play_fun` | Travel/culture date-like experience. |
| Maya | `original`, `helper` | Creative director, career/work-adjacent persona. |
| Freya | `featured`, `original`, `recommend` | Refined, cool, premium-feeling character. |
| Zuri | `original`, `play_fun` | Nightlife, DJ, playful social energy. |
| Camila | `original`, `play_fun`, `recommend` | Romantic coastal character. |
| Noor | `original`, `recommend` | Refined, worldly, composed character. |
| New published Chloe variant | `original`, `recommend` | Keep it visible in the default homepage pool after publication. |

## Anime/Game Batch Strategy

Future anime/game characters should primarily use `anime_game`, then optionally
add one or two supporting categories based on the use case.

Suggested batches:

| Batch Theme | Categories | Purpose |
| --- | --- | --- |
| School romance | `anime_game`, `play_fun`, `recommend` | High familiarity, easy first-chat hook. |
| Magical girl | `anime_game`, `play_fun` | Colorful fantasy roleplay. |
| Cyber/mecha pilot | `anime_game`, `featured` | Strong visual identity for homepage experiments. |
| Isekai adventurer | `anime_game`, `fiction_media` | Story-driven fantasy interactions. |
| Healing daily-life companion | `anime_game`, `recommend` | Cozy retention-oriented chats. |
| Idol / VTuber-like performer | `anime_game`, `play_fun`, `featured` | Younger-user appeal, strong visual variety. |
| Tsundere / energetic / cool / shy archetypes | `anime_game`, `play_fun` | Personality-led discovery. |

## Operating Rules

1. Every character should have one content-origin category:
   `original`, `anime_game`, `fiction_media`, or `icon`.

2. Promotion categories are optional:
   `featured` and `recommend` should be curated, not automatically assigned to
   every character.

3. Use `play_fun` for entertainment-first roleplay:
   dating, banter, nightlife, cozy companionship, playful fantasy, or casual
   scene progression.

4. Use `helper` only when the character offers a clear utility mode:
   advice, coaching, tutoring, career help, styling help, planning, or feedback.

5. Avoid making top-level categories too granular:
   labels such as Fashion, Beach, Nightlife, Cozy, Confident, Tsundere, Magical,
   School, and Cyberpunk should remain character tags or prompt metadata.

6. For anime/game and fiction/media characters, avoid directly copying protected
   IP names or living public figures. Prefer original archetypes and genre
   language.

## Recommended Homepage Behavior

- Default should be `recommend`, not `All`, so first load fetches a curated
  subset instead of every public character.
- Put `All` at the end of the chip rail. It remains available for browsing,
  but it should not be the default first-screen query.
- `Original` should show the current realistic platform-owned characters.
- `Anime & Game` should become a dedicated growth channel for younger users.
  After enough anime/game characters exist, consider changing the default from
  `recommend` to `anime_game`.
- `Featured` should be manually controlled and limited to the strongest visual
  and conversational performers.
- `Recommend` can be broader and refreshed more often.

## Implementation Notes

- A character can have multiple category slugs.
- The current 8-category system is enough for the next phase; do not add more
  top-level categories until usage data shows a real discovery problem.
- If anime characters grow large enough, add secondary filters later, such as:
  School, Fantasy, Cyberpunk, Idol, Cozy, Action, Romance.
- Keep top-level category labels stable so URLs, analytics, and user habits do
  not churn.
- Current implementation writes these categories to `roleplay_character_tag`.
  The homepage default is `recommend`, with local seed fallback using the same
  `tagSlugs` so server data and first-paint fallback do not drift.
