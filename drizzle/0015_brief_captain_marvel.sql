CREATE TYPE "public"."memory_kind" AS ENUM('on_this_day', 'month_recap', 'year_recap');--> statement-breakpoint
CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "memory_kind" NOT NULL,
	"period" text NOT NULL,
	"films" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "memories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_movies" ADD COLUMN "watched_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_movies" ADD COLUMN "watched_via" text;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "memories_user_kind_period_idx" ON "memories" USING btree ("user_id","kind","period");--> statement-breakpoint
CREATE INDEX "memories_unsent_idx" ON "memories" USING btree ("created_at") WHERE "memories"."sent_at" is null;--> statement-breakpoint
CREATE INDEX "user_movies_watched_at_idx" ON "user_movies" USING btree ("watched_at");