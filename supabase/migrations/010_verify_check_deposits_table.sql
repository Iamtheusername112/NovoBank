-- Verification and fix script for check_deposits table
-- Run this if you're experiencing issues with check deposits

-- First, ensure the table exists
CREATE TABLE IF NOT EXISTS public.check_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    check_number TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    front_image_url TEXT,
    back_image_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    deposit_date DATE NOT NULL,
    available_date DATE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.check_deposits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own check deposits" ON public.check_deposits;
DROP POLICY IF EXISTS "Users can insert their own check deposits" ON public.check_deposits;
DROP POLICY IF EXISTS "Users can update their own check deposits" ON public.check_deposits;

-- Create RLS policies
CREATE POLICY "Users can view their own check deposits"
ON public.check_deposits FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own check deposits"
ON public.check_deposits FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own check deposits"
ON public.check_deposits FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_check_deposits_user_id ON public.check_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_check_deposits_status ON public.check_deposits(status);
CREATE INDEX IF NOT EXISTS idx_check_deposits_account_id ON public.check_deposits(account_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_check_deposits_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_check_deposits_updated_at ON public.check_deposits;
CREATE TRIGGER trigger_update_check_deposits_updated_at
    BEFORE UPDATE ON public.check_deposits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_check_deposits_updated_at();

