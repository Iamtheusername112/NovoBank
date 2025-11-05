# Supabase Database Setup

This directory contains the database schema and migrations for NovaBank.

## Quick Setup

1. **Go to your Supabase Dashboard**
   - Navigate to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the contents of `migrations/001_initial_schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)

4. **Set up Storage Bucket**
   - Copy the contents of `storage_setup.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - This creates the storage bucket for ID documents
   - **Note**: The policies allow anonymous uploads during signup for better UX

5. **Verify Setup**
   - Go to "Table Editor" in the left sidebar
   - You should see these tables:
     - `user_profiles`
     - `cards`
     - `transactions`
     - `favorites`
     - `notifications`
     - `user_settings`
   - Go to "Storage" in the left sidebar
   - You should see the `id-documents` bucket

## Database Schema

### Tables

1. **user_profiles** - Extended user information (complements Supabase auth.users)
2. **cards** - User's payment cards
3. **transactions** - All financial transactions
4. **favorites** - Quick send contacts
5. **notifications** - User notifications
6. **user_settings** - User preferences and settings

### Security

- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Policies are automatically applied

### Features

- Automatic profile creation on user signup
- Automatic `updated_at` timestamp updates
- Indexes for optimal query performance

## Testing

After running the migration, you can test by:

1. Creating a user account through the app
2. A user profile will be automatically created
3. Default settings will be initialized

## Optional: Seed Data

If you want sample data for testing, you can run `seed_data.sql` after creating a user account. Make sure to replace `YOUR_USER_ID_HERE` with an actual user ID.

## Troubleshooting

If you encounter errors:

1. **"Extension already exists"** - This is safe to ignore
2. **"Table already exists"** - Drop the table first or use `CREATE TABLE IF NOT EXISTS`
3. **RLS errors** - Make sure you're authenticated when testing

## Next Steps

After setting up the database:

1. Update your `.env.local` with real Supabase credentials
2. Test user registration in the app
3. Verify data is being saved correctly
4. Check the Supabase dashboard to see created records

