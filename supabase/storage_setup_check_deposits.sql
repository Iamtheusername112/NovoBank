-- Storage bucket setup for check deposits and other buckets
-- Run this in Supabase SQL Editor

-- Create storage bucket for check deposits
INSERT INTO storage.buckets (id, name, public)
VALUES ('check-deposits', 'check-deposits', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for dispute evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('dispute-evidence', 'dispute-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile images (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own check deposits" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own check deposits" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own check deposits" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can view dispute evidence" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete dispute evidence" ON storage.objects;

-- Policy: Allow authenticated users to upload their own check images
CREATE POLICY "Users can upload their own check deposits"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'check-deposits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to view their own check images
CREATE POLICY "Users can view their own check deposits"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'check-deposits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own check images
CREATE POLICY "Users can delete their own check deposits"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'check-deposits' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow authenticated users to upload dispute evidence
CREATE POLICY "Users can upload dispute evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to view their own dispute evidence
CREATE POLICY "Users can view dispute evidence"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own dispute evidence
CREATE POLICY "Users can delete dispute evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

