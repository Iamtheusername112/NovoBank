-- Migration to add user notifications for admin responses to contact submissions

-- First, ensure contact_submissions has user_id column (it should already exist from 007)
-- Add it if it doesn't exist
ALTER TABLE public.contact_submissions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_contact_submissions_user_id ON public.contact_submissions(user_id);

-- Function to create user notification when admin responds to contact submission
CREATE OR REPLACE FUNCTION public.notify_user_on_admin_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    submission_user_id UUID;
    admin_name TEXT;
BEGIN
    -- Only proceed if admin_response was added or changed
    IF NEW.admin_response IS NULL OR (OLD.admin_response IS NOT NULL AND OLD.admin_response = NEW.admin_response) THEN
        RETURN NEW;
    END IF;

    -- Only proceed if there's a new response (not just an update)
    IF NEW.admin_response IS NULL OR NEW.admin_response = '' THEN
        RETURN NEW;
    END IF;

    -- Get the user_id from the contact submission
    submission_user_id := NEW.user_id;

    -- If no user_id, try to find user by email
    IF submission_user_id IS NULL THEN
        SELECT id INTO submission_user_id
        FROM public.user_profiles
        WHERE email = LOWER(NEW.email)
        LIMIT 1;
    END IF;

    -- If we still don't have a user_id, we can't send a notification
    IF submission_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get admin name if available
    SELECT 
        COALESCE(
            (SELECT first_name || ' ' || last_name FROM public.user_profiles WHERE id = NEW.responded_by),
            'Admin'
        ) INTO admin_name;

    -- Create notification for the user
    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        type,
        is_read,
        created_at
    ) VALUES (
        submission_user_id,
        'Response to Your Contact Form',
        'You have received a response from ' || admin_name || ' regarding your contact submission.',
        'info',
        FALSE,
        TIMEZONE('utc', NOW())
    );

    RETURN NEW;
END;
$$;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS trigger_notify_user_on_admin_response ON public.contact_submissions;

-- Create trigger to notify user when admin responds
CREATE TRIGGER trigger_notify_user_on_admin_response
    AFTER UPDATE ON public.contact_submissions
    FOR EACH ROW
    WHEN (NEW.admin_response IS NOT NULL AND NEW.admin_response != '' AND (OLD.admin_response IS NULL OR OLD.admin_response != NEW.admin_response))
    EXECUTE FUNCTION public.notify_user_on_admin_response();

-- RLS Policy: Allow users to view their own contact submissions
DROP POLICY IF EXISTS "Users can view their own contact submissions" ON public.contact_submissions;
CREATE POLICY "Users can view their own contact submissions"
    ON public.contact_submissions FOR SELECT
    USING (
        user_id IS NOT NULL AND auth.uid() = user_id
        OR
        (user_id IS NULL AND EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND email = LOWER(contact_submissions.email)
        ))
    );

