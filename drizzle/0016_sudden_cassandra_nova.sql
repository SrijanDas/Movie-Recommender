CREATE TABLE "user_series" (
	"user_id" uuid NOT NULL,
	"series_id" integer NOT NULL,
	"signal" "movie_signal" NOT NULL,
	"title" text NOT NULL,
	"poster_path" text,
	"year" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_series_user_id_series_id_pk" PRIMARY KEY("user_id","series_id")
);
--> statement-breakpoint
ALTER TABLE "user_series" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_series" ADD CONSTRAINT "user_series_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;