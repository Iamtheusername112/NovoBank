-- Contact Submissions Table
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded', 'archived')),
    admin_response TEXT,
    responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Admin Notifications Table (for admin-specific notifications)
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('contact_submission', 'transaction_review', 'account_review', 'system_alert')),
    reference_id UUID, -- ID of the related entity (contact_submission, transaction, etc.)
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON public.contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON public.admin_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Contact Submissions
-- Allow anyone to insert (submit contact form) - authenticated or not
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
CREATE POLICY "Anyone can submit contact form"
    ON public.contact_submissions FOR INSERT
    WITH CHECK (true);

-- Allow users to view their own contact submissions
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

-- Admins can view all contact submissions (checked via service role in API)
-- Note: This policy allows admins to view via service role, but regular users use the policy above

-- Only admins can update contact submissions (checked via service role in API)
DROP POLICY IF EXISTS "Admins can update contact submissions" ON public.contact_submissions;
CREATE POLICY "Admins can update contact submissions"
    ON public.contact_submissions FOR UPDATE
    USING (true); -- Admin check is done in API route

-- RLS Policies for Admin Notifications
-- Only admins can view admin notifications (checked via service role in API)
DROP POLICY IF EXISTS "Admins can view admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view admin notifications"
    ON public.admin_notifications FOR SELECT
    USING (true); -- Admin check is done in API route

-- Only admins can update admin notifications (checked via service role in API)
DROP POLICY IF EXISTS "Admins can update admin notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update admin notifications"
    ON public.admin_notifications FOR UPDATE
    USING (true); -- Admin check is done in API route

-- Function to create admin notification when contact is submitted
CREATE OR REPLACE FUNCTION public.create_contact_submission_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.admin_notifications (
        notification_type,
        reference_id,
        title,
        message,
        is_read
    ) VALUES (
        'contact_submission',
        NEW.id,
        'New Contact Submission',
        'You have received a new contact submission from ' || NEW.name || ' (' || NEW.email || ')',
        FALSE
    );
    RETURN NEW;
END;
$$;

-- Trigger to create notification on contact submission
DROP TRIGGER IF EXISTS trigger_create_contact_notification ON public.contact_submissions;
CREATE TRIGGER trigger_create_contact_notification
    AFTER INSERT ON public.contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.create_contact_submission_notification();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_contact_submission_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS trigger_update_contact_submission_updated_at ON public.contact_submissions;
CREATE TRIGGER trigger_update_contact_submission_updated_at
    BEFORE UPDATE ON public.contact_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_contact_submission_updated_at();

