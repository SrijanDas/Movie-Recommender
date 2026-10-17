CREATE TYPE "public"."movie_signal" AS ENUM('favorite', 'liked', 'up', 'down', 'seen');--> statement-breakpoint
CREATE TABLE "user_movies" (
	"user_id" uuid NOT NULL,
	"tmdb_id" integer NOT NULL,
	"signal" "movie_signal" NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_movies_user_id_tmdb_id_pk" PRIMARY KEY("user_id","tmdb_id")
);
--> statement-breakpoint
ALTER TABLE "user_movies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_movies" ADD CONSTRAINT "user_movies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;