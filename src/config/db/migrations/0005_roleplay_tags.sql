-- Phase A2: roleplay tag taxonomy
-- - Creates roleplay_tag (the canonical 8 categories from Talkie's home tabs).
-- - Creates roleplay_character_tag junction.
-- - Seeds the 8 default tags. Idempotent on slug.

CREATE TABLE IF NOT EXISTS "roleplay_tag" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"label_en" text NOT NULL,
	"label_zh" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_roleplay_tag_slug" ON "roleplay_tag" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_tag_sort" ON "roleplay_tag" USING btree ("sort_order");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roleplay_character_tag" (
	"character_id" text NOT NULL,
	"tag_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roleplay_character_tag_pk" PRIMARY KEY ("character_id","tag_id")
);
--> statement-breakpoint
ALTER TABLE "roleplay_character_tag" ADD CONSTRAINT "roleplay_character_tag_character_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."roleplay_character"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "roleplay_character_tag" ADD CONSTRAINT "roleplay_character_tag_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."roleplay_tag"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roleplay_character_tag_tag" ON "roleplay_character_tag" USING btree ("tag_id");
--> statement-breakpoint
INSERT INTO "roleplay_tag" ("id", "slug", "label_en", "label_zh", "sort_order") VALUES
	('tag_featured',      'featured',      'Featured',         '精选',         10),
	('tag_recommend',     'recommend',     'Recommend',        '推荐',         20),
	('tag_play_fun',      'play_fun',      'Play & Fun',       '玩乐',         30),
	('tag_helper',        'helper',        'Helper',           '助手',         40),
	('tag_original',      'original',      'Original',         '原创',         50),
	('tag_anime_game',    'anime_game',    'Anime & Game',     '动漫与游戏',   60),
	('tag_fiction_media', 'fiction_media', 'Fiction & Media',  '影视与小说',   70),
	('tag_icon',          'icon',          'Icon',             '名人',         80)
ON CONFLICT (slug) DO NOTHING;
