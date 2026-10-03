/*
# Create avatar storage bucket for profile photo uploads
1. Purpose: allow users to upload profile photos from device gallery during onboarding
2. Storage: public bucket "avatars" for avatar images
3. RLS: public read, authenticated insert/update/delete own
*/
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public can read avatars" ON storage.objects;
CREATE POLICY "Public can read avatars" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'avatars');
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);