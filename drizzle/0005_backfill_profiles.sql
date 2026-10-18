-- Users who already picked favourites before onboarding existed count as
-- onboarded, so they never see the picker again.
INSERT INTO "profiles" ("user_id")
SELECT DISTINCT "user_id" FROM "user_movies" WHERE "signal" = 'favorite'
ON CONFLICT DO NOTHING;
