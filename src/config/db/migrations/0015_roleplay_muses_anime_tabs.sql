-- Put the picker's primary tabs in the new product order:
-- ALL (client-only), Muses, Anime, then the legacy discovery categories.

INSERT INTO "roleplay_tag" ("id", "slug", "label_en", "label_zh", "sort_order")
VALUES ('tag_muses', 'muses', 'Muses', '缪斯', 10)
ON CONFLICT (slug) DO UPDATE SET
  "label_en" = EXCLUDED."label_en",
  "label_zh" = EXCLUDED."label_zh",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "roleplay_tag"
SET
  "label_en" = 'Anime',
  "label_zh" = '动漫',
  "sort_order" = 20,
  "updated_at" = now()
WHERE "slug" = 'anime_game';
--> statement-breakpoint
UPDATE "roleplay_tag"
SET "sort_order" = CASE "slug"
  WHEN 'featured' THEN 30
  WHEN 'recommend' THEN 40
  WHEN 'play_fun' THEN 50
  WHEN 'helper' THEN 60
  WHEN 'original' THEN 70
  WHEN 'fiction_media' THEN 80
  WHEN 'icon' THEN 90
  ELSE "sort_order"
END,
"updated_at" = now()
WHERE "slug" IN (
  'featured',
  'recommend',
  'play_fun',
  'helper',
  'original',
  'fiction_media',
  'icon'
);
