# Storage Bucket Setup Instructions

## Required Storage Buckets

The following storage buckets need to be created in your Supabase project:

1. **check-deposits** - For mobile check deposit images
2. **dispute-evidence** - For transaction dispute evidence files
3. **profile-images** - For user profile images (optional, already exists in some setups)

## Setup Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **"New bucket"**
4. Create each bucket with these settings:

   **check-deposits:**
   - Name: `check-deposits`
   - Public: `No` (Private)
   - File size limit: 5 MB
   - Allowed MIME types: `image/*`

   **dispute-evidence:**
   - Name: `dispute-evidence`
   - Public: `No` (Private)
   - File size limit: 10 MB
   - Allowed MIME types: `image/*, application/pdf`

   **profile-images:**
   - Name: `profile-images`
   - Public: `Yes` (Public)
   - File size limit: 2 MB
   - Allowed MIME types: `image/*`

5. After creating buckets, run the SQL script: `supabase/storage_setup_check_deposits.sql` in the SQL Editor to set up RLS policies

### Option 2: Using SQL Script

Run the updated `supabase/storage_setup_check_deposits.sql` script in your Supabase SQL Editor. This will:
- Create all required buckets
- Set up Row Level Security (RLS) policies
- Configure access permissions

## Verification

After setup, verify buckets exist:
1. Go to Supabase Dashboard > Storage
2. You should see all three buckets listed
3. Test by uploading a file through the app

## Troubleshooting

If you see "Bucket not found" errors:
1. Ensure buckets are created in Supabase Dashboard
2. Run the SQL script to set up policies
3. Check that bucket names match exactly (case-sensitive)
4. Verify RLS policies are active

