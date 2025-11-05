-- Supabase Storage Setup for ID Documents
-- Run this in your Supabase SQL Editor after creating the tables

-- Create storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own ID documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own ID documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own ID documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Set up storage policies for ID documents
-- Note: During signup, users might not be authenticated yet, so we need to handle this
-- Option 1: Allow unauthenticated uploads (for signup flow)
-- Option 2: Make bucket public temporarily or use service role key

-- For development: Allow all authenticated users to upload (we'll filter by user later)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-documents');

-- Allow authenticated users to view files in the bucket
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id-documents');

-- Allow authenticated users to delete files
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'id-documents');

-- For signup flow: Allow anonymous uploads during registration
-- This allows users to upload ID documents before they're fully authenticated
CREATE POLICY "Allow anonymous uploads during signup"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'id-documents');

CREATE POLICY "Allow anonymous reads during signup"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'id-documents');

