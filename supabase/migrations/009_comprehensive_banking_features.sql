-- Comprehensive Banking Features Migration
-- This migration adds tables for Bill Pay, Check Deposit, Account Transfers, Alerts, Card Controls, and more

-- ============================================
-- BILL PAY FEATURES
-- ============================================

-- Payees Table (Companies and individuals you can pay)
CREATE TABLE IF NOT EXISTS public.payees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_number TEXT,
    routing_number TEXT,
    payee_type TEXT NOT NULL CHECK (payee_type IN ('company', 'individual', 'utility', 'credit_card', 'subscription')),
    category TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Bill Payments Table
CREATE TABLE IF NOT EXISTS public.bill_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    payee_id UUID NOT NULL REFERENCES public.payees(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    next_payment_date DATE,
    memo TEXT,
    confirmation_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- CHECK DEPOSIT FEATURES
-- ============================================

-- Check Deposits Table
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

-- ============================================
-- INTERNAL ACCOUNT TRANSFERS
-- ============================================

-- Internal Transfers Table (between user's own accounts)
CREATE TABLE IF NOT EXISTS public.internal_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    from_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    to_account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    transfer_date DATE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'cancelled')),
    is_recurring BOOLEAN DEFAULT FALSE,
    recurring_frequency TEXT CHECK (recurring_frequency IN ('weekly', 'biweekly', 'monthly')),
    next_transfer_date DATE,
    memo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CHECK (from_account_id != to_account_id)
);

-- ============================================
-- ATM & BRANCH LOCATOR
-- ============================================

-- ATM Locations Table
CREATE TABLE IF NOT EXISTS public.atm_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_24_hours BOOLEAN DEFAULT FALSE,
    accepts_deposits BOOLEAN DEFAULT TRUE,
    accepts_withdrawals BOOLEAN DEFAULT TRUE,
    is_accessible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Branch Locations Table
CREATE TABLE IF NOT EXISTS public.branch_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone TEXT,
    email TEXT,
    hours_monday TEXT,
    hours_tuesday TEXT,
    hours_wednesday TEXT,
    hours_thursday TEXT,
    hours_friday TEXT,
    hours_saturday TEXT,
    hours_sunday TEXT,
    services TEXT[], -- Array of services offered
    is_accessible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- SAVINGS GOALS
-- ============================================

-- Savings Goals Table
CREATE TABLE IF NOT EXISTS public.savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(10, 2) NOT NULL,
    current_amount DECIMAL(10, 2) DEFAULT 0.00,
    target_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    auto_transfer_enabled BOOLEAN DEFAULT FALSE,
    auto_transfer_amount DECIMAL(10, 2),
    auto_transfer_frequency TEXT CHECK (auto_transfer_frequency IN ('weekly', 'biweekly', 'monthly')),
    next_auto_transfer_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- ACCOUNT ALERTS
-- ============================================

-- Account Alerts Table
CREATE TABLE IF NOT EXISTS public.account_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('low_balance', 'large_transaction', 'deposit', 'withdrawal', 'login', 'card_used', 'bill_due', 'goal_milestone', 'custom')),
    threshold_amount DECIMAL(10, 2),
    comparison_operator TEXT CHECK (comparison_operator IN ('greater_than', 'less_than', 'equals')),
    is_enabled BOOLEAN DEFAULT TRUE,
    notification_method TEXT[] DEFAULT ARRAY['push', 'email'], -- Array of notification methods
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Alert History Table
CREATE TABLE IF NOT EXISTS public.alert_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID REFERENCES public.account_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- ADVANCED CARD CONTROLS
-- ============================================

-- Card Controls Table
CREATE TABLE IF NOT EXISTS public.card_controls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    daily_spending_limit DECIMAL(10, 2),
    monthly_spending_limit DECIMAL(10, 2),
    blocked_merchant_categories TEXT[], -- Array of blocked categories
    blocked_countries TEXT[], -- Array of blocked country codes
    allowed_countries TEXT[], -- Array of allowed country codes (if specified, only these allowed)
    require_approval_for_large_transactions BOOLEAN DEFAULT FALSE,
    large_transaction_threshold DECIMAL(10, 2),
    is_location_based_enabled BOOLEAN DEFAULT FALSE,
    allowed_locations TEXT[], -- Array of allowed location names/addresses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Travel Notifications Table
CREATE TABLE IF NOT EXISTS public.travel_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
    destination_country TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- CARD REWARDS & CASHBACK
-- ============================================

-- Card Rewards Table
CREATE TABLE IF NOT EXISTS public.card_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('points', 'cashback', 'miles')),
    current_balance DECIMAL(10, 2) DEFAULT 0.00,
    lifetime_earned DECIMAL(10, 2) DEFAULT 0.00,
    redemption_rate DECIMAL(5, 4), -- e.g., 0.01 for 1% cashback
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Reward Transactions Table
CREATE TABLE IF NOT EXISTS public.reward_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reward_id UUID NOT NULL REFERENCES public.card_rewards(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- TRANSACTION DISPUTES
-- ============================================

-- Transaction Disputes Table
CREATE TABLE IF NOT EXISTS public.transaction_disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    dispute_type TEXT NOT NULL CHECK (dispute_type IN ('fraudulent', 'unauthorized', 'duplicate', 'incorrect_amount', 'merchant_error', 'other')),
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'resolved', 'cancelled')),
    evidence_urls TEXT[], -- Array of evidence file URLs
    admin_notes TEXT,
    resolution_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- P2P PAYMENTS
-- ============================================

-- P2P Payments Table
CREATE TABLE IF NOT EXISTS public.p2p_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    recipient_email TEXT,
    recipient_phone TEXT,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('send', 'request')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'expired')),
    memo TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- WIRE TRANSFERS
-- ============================================

-- Wire Transfers Table
CREATE TABLE IF NOT EXISTS public.wire_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_account_number TEXT NOT NULL,
    recipient_routing_number TEXT NOT NULL,
    recipient_bank_name TEXT NOT NULL,
    recipient_bank_address TEXT,
    recipient_country TEXT DEFAULT 'US',
    amount DECIMAL(10, 2) NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0.00,
    transfer_type TEXT NOT NULL CHECK (transfer_type IN ('domestic', 'international')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    reference_number TEXT,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- STOP PAYMENT
-- ============================================

-- Stop Payments Table
CREATE TABLE IF NOT EXISTS public.stop_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    check_number TEXT,
    amount DECIMAL(10, 2),
    payee_name TEXT,
    stop_type TEXT NOT NULL CHECK (stop_type IN ('check', 'recurring_payment')),
    recurring_payment_id UUID REFERENCES public.bill_payments(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    expiration_date DATE,
    fee DECIMAL(10, 2) DEFAULT 0.00,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- LOAN APPLICATIONS
-- ============================================

-- Loan Applications Table
CREATE TABLE IF NOT EXISTS public.loan_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    loan_type TEXT NOT NULL CHECK (loan_type IN ('personal', 'auto', 'home', 'business')),
    requested_amount DECIMAL(10, 2) NOT NULL,
    purpose TEXT,
    employment_status TEXT,
    annual_income DECIMAL(10, 2),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'denied', 'cancelled')),
    approved_amount DECIMAL(10, 2),
    interest_rate DECIMAL(5, 4),
    term_months INTEGER,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Loans Table (for approved loans)
CREATE TABLE IF NOT EXISTS public.loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    application_id UUID REFERENCES public.loan_applications(id) ON DELETE SET NULL,
    loan_type TEXT NOT NULL CHECK (loan_type IN ('personal', 'auto', 'home', 'business')),
    principal_amount DECIMAL(10, 2) NOT NULL,
    current_balance DECIMAL(10, 2) NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL,
    term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    next_payment_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Loan Payments Table
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    principal_amount DECIMAL(10, 2),
    interest_amount DECIMAL(10, 2),
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'completed', 'failed', 'missed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- CREDIT SCORE
-- ============================================

-- Credit Scores Table
CREATE TABLE IF NOT EXISTS public.credit_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 300 AND score <= 850),
    score_type TEXT DEFAULT 'fico' CHECK (score_type IN ('fico', 'vantagescore')),
    factors JSONB, -- JSON object with factors affecting score
    report_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- SECURITY & SESSIONS
-- ============================================

-- Active Sessions Table
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    device_name TEXT,
    device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    ip_address TEXT,
    user_agent TEXT,
    location TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    is_current_session BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Login History Table
CREATE TABLE IF NOT EXISTS public.login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    login_method TEXT CHECK (login_method IN ('pin', 'fingerprint', 'face_id', 'password', 'biometric')),
    ip_address TEXT,
    device_type TEXT,
    location TEXT,
    success BOOLEAN DEFAULT TRUE,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- REFERRAL PROGRAM
-- ============================================

-- Referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referred_email TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded', 'expired')),
    reward_amount DECIMAL(10, 2) DEFAULT 0.00,
    reward_paid BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_payees_user_id ON public.payees(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_user_id ON public.bill_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_payee_id ON public.bill_payments(payee_id);
CREATE INDEX IF NOT EXISTS idx_bill_payments_status ON public.bill_payments(status);
CREATE INDEX IF NOT EXISTS idx_check_deposits_user_id ON public.check_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_check_deposits_status ON public.check_deposits(status);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_user_id ON public.internal_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_transfers_status ON public.internal_transfers(status);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_account_alerts_user_id ON public.account_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_alerts_enabled ON public.account_alerts(is_enabled);
CREATE INDEX IF NOT EXISTS idx_card_controls_card_id ON public.card_controls(card_id);
CREATE INDEX IF NOT EXISTS idx_travel_notifications_user_id ON public.travel_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_travel_notifications_active ON public.travel_notifications(is_active);
CREATE INDEX IF NOT EXISTS idx_card_rewards_card_id ON public.card_rewards(card_id);
CREATE INDEX IF NOT EXISTS idx_transaction_disputes_user_id ON public.transaction_disputes(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_disputes_status ON public.transaction_disputes(status);
CREATE INDEX IF NOT EXISTS idx_p2p_payments_sender_id ON public.p2p_payments(sender_id);
CREATE INDEX IF NOT EXISTS idx_p2p_payments_recipient_id ON public.p2p_payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_user_id ON public.wire_transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_stop_payments_user_id ON public.stop_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON public.loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_scores_user_id ON public.credit_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON public.login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Payees RLS
ALTER TABLE public.payees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own payees" ON public.payees;
CREATE POLICY "Users can view their own payees" ON public.payees FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own payees" ON public.payees;
CREATE POLICY "Users can insert their own payees" ON public.payees FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own payees" ON public.payees;
CREATE POLICY "Users can update their own payees" ON public.payees FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own payees" ON public.payees;
CREATE POLICY "Users can delete their own payees" ON public.payees FOR DELETE USING (auth.uid() = user_id);

-- Bill Payments RLS
ALTER TABLE public.bill_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own bill payments" ON public.bill_payments;
CREATE POLICY "Users can view their own bill payments" ON public.bill_payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own bill payments" ON public.bill_payments;
CREATE POLICY "Users can insert their own bill payments" ON public.bill_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own bill payments" ON public.bill_payments;
CREATE POLICY "Users can update their own bill payments" ON public.bill_payments FOR UPDATE USING (auth.uid() = user_id);

-- Check Deposits RLS
ALTER TABLE public.check_deposits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own check deposits" ON public.check_deposits;
CREATE POLICY "Users can view their own check deposits" ON public.check_deposits FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own check deposits" ON public.check_deposits;
CREATE POLICY "Users can insert their own check deposits" ON public.check_deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own check deposits" ON public.check_deposits;
CREATE POLICY "Users can update their own check deposits" ON public.check_deposits FOR UPDATE USING (auth.uid() = user_id);

-- Internal Transfers RLS
ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own internal transfers" ON public.internal_transfers;
CREATE POLICY "Users can view their own internal transfers" ON public.internal_transfers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own internal transfers" ON public.internal_transfers;
CREATE POLICY "Users can insert their own internal transfers" ON public.internal_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own internal transfers" ON public.internal_transfers;
CREATE POLICY "Users can update their own internal transfers" ON public.internal_transfers FOR UPDATE USING (auth.uid() = user_id);

-- Savings Goals RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own savings goals" ON public.savings_goals;
CREATE POLICY "Users can view their own savings goals" ON public.savings_goals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own savings goals" ON public.savings_goals;
CREATE POLICY "Users can insert their own savings goals" ON public.savings_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own savings goals" ON public.savings_goals;
CREATE POLICY "Users can update their own savings goals" ON public.savings_goals FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own savings goals" ON public.savings_goals;
CREATE POLICY "Users can delete their own savings goals" ON public.savings_goals FOR DELETE USING (auth.uid() = user_id);

-- Account Alerts RLS
ALTER TABLE public.account_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.account_alerts;
CREATE POLICY "Users can view their own alerts" ON public.account_alerts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own alerts" ON public.account_alerts;
CREATE POLICY "Users can insert their own alerts" ON public.account_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.account_alerts;
CREATE POLICY "Users can update their own alerts" ON public.account_alerts FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.account_alerts;
CREATE POLICY "Users can delete their own alerts" ON public.account_alerts FOR DELETE USING (auth.uid() = user_id);

-- Alert History RLS
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own alert history" ON public.alert_history;
CREATE POLICY "Users can view their own alert history" ON public.alert_history FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own alert history" ON public.alert_history;
CREATE POLICY "Users can update their own alert history" ON public.alert_history FOR UPDATE USING (auth.uid() = user_id);

-- Card Controls RLS
ALTER TABLE public.card_controls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own card controls" ON public.card_controls;
CREATE POLICY "Users can view their own card controls" ON public.card_controls FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.cards WHERE cards.id = card_controls.card_id AND cards.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can insert their own card controls" ON public.card_controls;
CREATE POLICY "Users can insert their own card controls" ON public.card_controls FOR INSERT 
    WITH CHECK (EXISTS (SELECT 1 FROM public.cards WHERE cards.id = card_controls.card_id AND cards.user_id = auth.uid()));
DROP POLICY IF EXISTS "Users can update their own card controls" ON public.card_controls;
CREATE POLICY "Users can update their own card controls" ON public.card_controls FOR UPDATE 
    USING (EXISTS (SELECT 1 FROM public.cards WHERE cards.id = card_controls.card_id AND cards.user_id = auth.uid()));

-- Travel Notifications RLS
ALTER TABLE public.travel_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own travel notifications" ON public.travel_notifications;
CREATE POLICY "Users can view their own travel notifications" ON public.travel_notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own travel notifications" ON public.travel_notifications;
CREATE POLICY "Users can insert their own travel notifications" ON public.travel_notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own travel notifications" ON public.travel_notifications;
CREATE POLICY "Users can update their own travel notifications" ON public.travel_notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own travel notifications" ON public.travel_notifications;
CREATE POLICY "Users can delete their own travel notifications" ON public.travel_notifications FOR DELETE USING (auth.uid() = user_id);

-- Card Rewards RLS
ALTER TABLE public.card_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own card rewards" ON public.card_rewards;
CREATE POLICY "Users can view their own card rewards" ON public.card_rewards FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own card rewards" ON public.card_rewards;
CREATE POLICY "Users can update their own card rewards" ON public.card_rewards FOR UPDATE USING (auth.uid() = user_id);

-- Transaction Disputes RLS
ALTER TABLE public.transaction_disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own disputes" ON public.transaction_disputes;
CREATE POLICY "Users can view their own disputes" ON public.transaction_disputes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own disputes" ON public.transaction_disputes;
CREATE POLICY "Users can insert their own disputes" ON public.transaction_disputes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own disputes" ON public.transaction_disputes;
CREATE POLICY "Users can update their own disputes" ON public.transaction_disputes FOR UPDATE USING (auth.uid() = user_id);

-- P2P Payments RLS
ALTER TABLE public.p2p_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own p2p payments" ON public.p2p_payments;
CREATE POLICY "Users can view their own p2p payments" ON public.p2p_payments FOR SELECT 
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "Users can insert their own p2p payments" ON public.p2p_payments;
CREATE POLICY "Users can insert their own p2p payments" ON public.p2p_payments FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Users can update their own p2p payments" ON public.p2p_payments;
CREATE POLICY "Users can update their own p2p payments" ON public.p2p_payments FOR UPDATE 
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Wire Transfers RLS
ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own wire transfers" ON public.wire_transfers;
CREATE POLICY "Users can view their own wire transfers" ON public.wire_transfers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own wire transfers" ON public.wire_transfers;
CREATE POLICY "Users can insert their own wire transfers" ON public.wire_transfers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own wire transfers" ON public.wire_transfers;
CREATE POLICY "Users can update their own wire transfers" ON public.wire_transfers FOR UPDATE USING (auth.uid() = user_id);

-- Stop Payments RLS
ALTER TABLE public.stop_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own stop payments" ON public.stop_payments;
CREATE POLICY "Users can view their own stop payments" ON public.stop_payments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own stop payments" ON public.stop_payments;
CREATE POLICY "Users can insert their own stop payments" ON public.stop_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own stop payments" ON public.stop_payments;
CREATE POLICY "Users can update their own stop payments" ON public.stop_payments FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own stop payments" ON public.stop_payments;
CREATE POLICY "Users can delete their own stop payments" ON public.stop_payments FOR DELETE USING (auth.uid() = user_id);

-- Loan Applications RLS
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own loan applications" ON public.loan_applications;
CREATE POLICY "Users can view their own loan applications" ON public.loan_applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own loan applications" ON public.loan_applications;
CREATE POLICY "Users can insert their own loan applications" ON public.loan_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own loan applications" ON public.loan_applications;
CREATE POLICY "Users can update their own loan applications" ON public.loan_applications FOR UPDATE USING (auth.uid() = user_id);

-- Loans RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
CREATE POLICY "Users can view their own loans" ON public.loans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view their own loan payments" ON public.loan_payments;
CREATE POLICY "Users can view their own loan payments" ON public.loan_payments FOR SELECT 
    USING (EXISTS (SELECT 1 FROM public.loans WHERE loans.id = loan_payments.loan_id AND loans.user_id = auth.uid()));

-- Credit Scores RLS
ALTER TABLE public.credit_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own credit scores" ON public.credit_scores;
CREATE POLICY "Users can view their own credit scores" ON public.credit_scores FOR SELECT USING (auth.uid() = user_id);

-- Active Sessions RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.active_sessions;
CREATE POLICY "Users can view their own sessions" ON public.active_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.active_sessions;
CREATE POLICY "Users can delete their own sessions" ON public.active_sessions FOR DELETE USING (auth.uid() = user_id);

-- Login History RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own login history" ON public.login_history;
CREATE POLICY "Users can view their own login history" ON public.login_history FOR SELECT USING (auth.uid() = user_id);

-- Referrals RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);
DROP POLICY IF EXISTS "Users can insert their own referrals" ON public.referrals;
CREATE POLICY "Users can insert their own referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referrer_id);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all tables with updated_at column
CREATE TRIGGER trigger_update_payees_updated_at BEFORE UPDATE ON public.payees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_bill_payments_updated_at BEFORE UPDATE ON public.bill_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_check_deposits_updated_at BEFORE UPDATE ON public.check_deposits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_internal_transfers_updated_at BEFORE UPDATE ON public.internal_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_savings_goals_updated_at BEFORE UPDATE ON public.savings_goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_account_alerts_updated_at BEFORE UPDATE ON public.account_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_card_controls_updated_at BEFORE UPDATE ON public.card_controls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_card_rewards_updated_at BEFORE UPDATE ON public.card_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_transaction_disputes_updated_at BEFORE UPDATE ON public.transaction_disputes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_p2p_payments_updated_at BEFORE UPDATE ON public.p2p_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_wire_transfers_updated_at BEFORE UPDATE ON public.wire_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_stop_payments_updated_at BEFORE UPDATE ON public.stop_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_loan_applications_updated_at BEFORE UPDATE ON public.loan_applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_loans_updated_at BEFORE UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trigger_update_referrals_updated_at BEFORE UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

