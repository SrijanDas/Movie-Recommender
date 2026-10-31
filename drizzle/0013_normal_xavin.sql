ALTER TABLE "user_movies" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_movies" ADD COLUMN "started_via" text;--> statement-breakpoint
ALTER TABLE "user_movies" ADD COLUMN "nudged_at" timestamp with time zone;