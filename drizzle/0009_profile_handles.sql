ALTER TABLE "profiles" ALTER COLUMN "onboarded_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "display_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_handle_unique" UNIQUE("handle");