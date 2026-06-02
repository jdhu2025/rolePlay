# RolePlay Anime Image Import Log

Date: 2026-05-27

## Status

- Status: completed
- Scope: add one primary image for each of the 20 anime RolePlay characters.
- Source image directory: `/Users/Zhuanz/.codex/generated_images/019e681a-ac79-7cf2-a86c-1720dabe603b`
- App image directory: `shipany-template-dev/public/roleplay/characters`
- Data source updated: `shipany-template-dev/src/data/roleplay-anime-characters.ts`
- Upsert script updated: `shipany-template-dev/scripts/data/upsert-roleplay-anime-characters.ts`
- DB result: 20 anime characters inserted by `upsert-roleplay-anime-characters.ts`

## Execution Plan

1. Confirm the generated image set and chronological order.
2. Apply the discard rule: original generated images 013, 014, and 015 are invalid; use the last three replacement images for `rp-anime-013`, `rp-anime-014`, and `rp-anime-015`.
3. Copy the 20 selected PNG files into `public/roleplay/characters`.
4. Rename selected files to the stable filenames from `roleplay-anime-image-requirements.md`.
5. Update each anime character's `avatar` and `images` fields.
6. Update anime upsert metadata `assetStatus` to `generated`.
7. Validate local file existence and data consistency.
8. Run anime character upsert dry-run.
9. Run anime character upsert against the configured development database.

## Image Mapping

| Character ID | Character    | App Filename               | Source Selection                   |
| ------------ | ------------ | -------------------------- | ---------------------------------- |
| rp-anime-001 | Elira Frost  | `rp-anime-001-elira.png`   | chronological image 01             |
| rp-anime-002 | Serina Vale  | `rp-anime-002-serina.png`  | chronological image 02             |
| rp-anime-003 | Liora Lin    | `rp-anime-003-liora.png`   | chronological image 03             |
| rp-anime-004 | Akane Vey    | `rp-anime-004-akane.png`   | chronological image 04             |
| rp-anime-005 | Emi-09       | `rp-anime-005-emi.png`     | chronological image 05             |
| rp-anime-006 | Yun Lan      | `rp-anime-006-yunlan.png`  | chronological image 06             |
| rp-anime-007 | Mira Bell    | `rp-anime-007-mira.png`    | chronological image 07             |
| rp-anime-008 | Daphne Noir  | `rp-anime-008-daphne.png`  | chronological image 08             |
| rp-anime-009 | Nyra Kade    | `rp-anime-009-nyra.png`    | chronological image 09             |
| rp-anime-010 | Rin Shiro    | `rp-anime-010-rin.png`     | chronological image 10             |
| rp-anime-011 | Kieran Voss  | `rp-anime-011-kieran.png`  | chronological image 11             |
| rp-anime-012 | Arin Sol     | `rp-anime-012-arin.png`    | chronological image 12             |
| rp-anime-013 | Noel Hart    | `rp-anime-013-noel.png`    | replacement chronological image 21 |
| rp-anime-014 | Kael Orion   | `rp-anime-014-kael.png`    | replacement chronological image 22 |
| rp-anime-015 | Ren Kisar    | `rp-anime-015-ren.png`     | replacement chronological image 23 |
| rp-anime-016 | Toma Aster   | `rp-anime-016-toma.png`    | chronological image 16             |
| rp-anime-017 | Soren Vale   | `rp-anime-017-soren.png`   | chronological image 17             |
| rp-anime-018 | Lucian Reed  | `rp-anime-018-lucian.png`  | chronological image 18             |
| rp-anime-019 | Mika Rowan   | `rp-anime-019-mika.png`    | chronological image 19             |
| rp-anime-020 | Caspian Tide | `rp-anime-020-caspian.png` | chronological image 20             |

## Discarded Images

The original chronological images 13, 14, and 15 were intentionally not imported.

- `ig_079e607f33e0b1ce016a16a6d439048195a30499a980dd7898.png`
- `ig_079e607f33e0b1ce016a16a7228b788195b8fe4f33c9d10e2e.png`
- `ig_079e607f33e0b1ce016a16a7ca733c81958bebb3ace42656a3.png`

## Verification Log

- File existence check: passed.
- Data import check: passed with `count: 20`, `issues: []`.
- Prettier check: passed for `src/data/roleplay-anime-characters.ts` and `scripts/data/upsert-roleplay-anime-characters.ts`.
- Dry-run command: `pnpm tsx scripts/with-env.ts npx tsx scripts/data/upsert-roleplay-anime-characters.ts --dry-run`
- Dry-run result: 20 planned inserts.
- Dry-run snapshot: `shipany-template-dev/scripts/data/anime-upsert-snapshot-2026-05-27T08-55-16-528Z.json`
- Update command: `pnpm tsx scripts/with-env.ts npx tsx scripts/data/upsert-roleplay-anime-characters.ts`
- Update result: 20 inserts completed.
- Update snapshot: `shipany-template-dev/scripts/data/anime-upsert-snapshot-2026-05-27T08-55-33-322Z.json`
- R2 upload result: 20/20 anime PNG files uploaded to `https://pub-f8476a5cfcdc45d5bcd354e1ff73f50f.r2.dev/crushly/roleplay/characters/`.
- R2 public URL spot check: passed for `rp-anime-001-elira.png`, `rp-anime-010-rin.png`, `rp-anime-015-ren.png`, and `rp-anime-020-caspian.png`.
- Local public fallback: added in `src/shared/lib/roleplay-assets.ts` so local files under `public/roleplay/characters` resolve to site-relative URLs when present.

## Notes

- The DB stores image filenames only. Runtime URL resolution remains handled by `buildCharacterImageUrl()`.
- Each character currently has exactly one gallery image. Future additions can append more filenames to `images`.
- `metadata.assetStatus` is now written as `generated` for this anime batch.
- If the local dev page still shows missing images, refresh the browser. If the Next dev server was already running before the fallback code changed, restart `pnpm dev`.
