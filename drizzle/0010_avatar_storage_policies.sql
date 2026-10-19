-- Profile pictures live in the public "files" Storage bucket under
-- avatars/<user id>/. Anyone can read them (the bucket is public); a signed-in
-- user can only add or delete files in their own folder. Uploads go through
-- the user's own session (app/profile/actions.ts), so these policies are the
-- only thing that scopes them.
DROP POLICY IF EXISTS "avatars: owner reads" ON storage.objects;--> statement-breakpoint
DROP POLICY IF EXISTS "avatars: owner uploads" ON storage.objects;--> statement-breakpoint
DROP POLICY IF EXISTS "avatars: owner deletes" ON storage.objects;--> statement-breakpoint
CREATE POLICY "avatars: owner reads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'files' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "avatars: owner uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'files' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = (select auth.uid())::text);--> statement-breakpoint
CREATE POLICY "avatars: owner deletes" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'files' AND (storage.foldername(name))[1] = 'avatars' AND (storage.foldername(name))[2] = (select auth.uid())::text);
