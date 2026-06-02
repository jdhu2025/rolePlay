CREATE TABLE IF NOT EXISTS "roleplay_quality_event" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "character_id" text REFERENCES "roleplay_character"("id") ON DELETE SET NULL,
  "conversation_id" text REFERENCES "roleplay_conversation"("id") ON DELETE SET NULL,
  "message_id" text REFERENCES "roleplay_message"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'created' NOT NULL,
  "event_type" text NOT NULL,
  "value" integer DEFAULT 1 NOT NULL,
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_roleplay_quality_event_character_type"
  ON "roleplay_quality_event" ("character_id", "event_type");
CREATE INDEX IF NOT EXISTS "idx_roleplay_quality_event_conversation"
  ON "roleplay_quality_event" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_roleplay_quality_event_created"
  ON "roleplay_quality_event" ("created_at");

CREATE TABLE IF NOT EXISTS "roleplay_quality_evaluation" (
  "id" text PRIMARY KEY NOT NULL,
  "character_id" text REFERENCES "roleplay_character"("id") ON DELETE SET NULL,
  "conversation_id" text REFERENCES "roleplay_conversation"("id") ON DELETE SET NULL,
  "sample_message_id" text REFERENCES "roleplay_message"("id") ON DELETE SET NULL,
  "status" text DEFAULT 'created' NOT NULL,
  "judge_model" text NOT NULL DEFAULT '',
  "voice_score" integer DEFAULT 0 NOT NULL,
  "values_score" integer DEFAULT 0 NOT NULL,
  "relationship_score" integer DEFAULT 0 NOT NULL,
  "immersion_score" integer DEFAULT 0 NOT NULL,
  "ooc_score" integer DEFAULT 0 NOT NULL,
  "summary" text NOT NULL DEFAULT '',
  "issues" text NOT NULL DEFAULT '[]',
  "recommendations" text NOT NULL DEFAULT '[]',
  "metadata" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_roleplay_quality_eval_character_created"
  ON "roleplay_quality_evaluation" ("character_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_roleplay_quality_eval_conversation"
  ON "roleplay_quality_evaluation" ("conversation_id");
