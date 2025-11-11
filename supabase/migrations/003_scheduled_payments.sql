-- Scheduled Payments and Recurring Transfers
-- Run this after 002_dashboard_features.sql

-- Scheduled Payments Table
CREATE TABLE IF NOT EXISTS public.scheduled_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_account TEXT,
    recipient_email TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_payment_date DATE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add QR code data to user_profiles for payment QR codes
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_user_id ON public.scheduled_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_next_payment_date ON public.scheduled_payments(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_payments_status ON public.scheduled_payments(status);

-- Enable RLS
ALTER TABLE public.scheduled_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Scheduled Payments
DROP POLICY IF EXISTS "Users can view own scheduled payments" ON public.scheduled_payments;
CREATE POLICY "Users can view own scheduled payments"
    ON public.scheduled_payments FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own scheduled payments" ON public.scheduled_payments;
CREATE POLICY "Users can manage own scheduled payments"
    ON public.scheduled_payments FOR ALL
    USING (auth.uid() = user_id);

-- Trigger for updated_at (function should already exist from 001_initial_schema.sql)
DROP TRIGGER IF EXISTS update_scheduled_payments_updated_at ON public.scheduled_payments;
CREATE TRIGGER update_scheduled_payments_updated_at
    BEFORE UPDATE ON public.scheduled_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

