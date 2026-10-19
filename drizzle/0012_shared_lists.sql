CREATE TYPE "public"."list_source" AS ENUM('watchlist', 'my_films');--> statement-breakpoint
CREATE TABLE "list_items" (
	"list_id" uuid NOT NULL,
	"tmdb_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"added" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"year" smallint,
	CONSTRAINT "list_items_list_id_tmdb_id_pk" PRIMARY KEY("list_id","tmdb_id")
);
--> statement-breakpoint
ALTER TABLE "list_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"source" "list_source",
	"source_filter" text,
	"synced" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_list_id_lists_id_fk" FOREIGN KEY ("list_id") REFERENCES "public"."lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lists_user_slug" ON "lists" USING btree ("user_id","slug");