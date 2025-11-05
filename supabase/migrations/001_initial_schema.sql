-- NovaBank Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    date_of_birth DATE,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'United States',
    id_type TEXT,
    id_number TEXT,
    id_file_url TEXT,
    security_question_1 TEXT,
    security_answer_1 TEXT,
    security_question_2 TEXT,
    security_answer_2 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Cards Table
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    card_holder_name TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    card_type TEXT DEFAULT 'DEBIT',
    is_frozen BOOLEAN DEFAULT FALSE,
    is_contactless_enabled BOOLEAN DEFAULT TRUE,
    is_magstripe_enabled BOOLEAN DEFAULT TRUE,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    gradient_type TEXT DEFAULT 'purple',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.cards(id) ON DELETE SET NULL,
    recipient_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    recipient_name TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sent', 'received', 'withdrawal', 'deposit')),
    category TEXT DEFAULT 'Other',
    description TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Favorites/Contacts Table (for quick send again feature)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    favorite_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    favorite_name TEXT NOT NULL,
    favorite_card_last_four TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, favorite_user_id)
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    dark_mode_enabled BOOLEAN DEFAULT FALSE,
    personal_offers_enabled BOOLEAN DEFAULT TRUE,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    biometric_enabled BOOLEAN DEFAULT FALSE,
    language TEXT DEFAULT 'en',
    pin_hash TEXT, -- Store hashed PIN (in production, use proper hashing)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON public.cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON public.transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

-- Allow email lookup for PIN login (anonymous users can check if email exists)
-- This is needed for PIN login flow where user is not yet authenticated
DROP POLICY IF EXISTS "Allow email lookup for PIN login" ON public.user_profiles;
CREATE POLICY "Allow email lookup for PIN login"
    ON public.user_profiles FOR SELECT
    TO anon, authenticated
    USING (true); -- Allow reading email to verify account exists for PIN login

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Cards Policies
DROP POLICY IF EXISTS "Users can view own cards" ON public.cards;
CREATE POLICY "Users can view own cards"
    ON public.cards FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cards" ON public.cards;
CREATE POLICY "Users can insert own cards"
    ON public.cards FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cards" ON public.cards;
CREATE POLICY "Users can update own cards"
    ON public.cards FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cards" ON public.cards;
CREATE POLICY "Users can delete own cards"
    ON public.cards FOR DELETE
    USING (auth.uid() = user_id);

-- Transactions Policies
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
CREATE POLICY "Users can view own transactions"
    ON public.transactions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
CREATE POLICY "Users can insert own transactions"
    ON public.transactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Favorites Policies
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites"
    ON public.favorites FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;
CREATE POLICY "Users can manage own favorites"
    ON public.favorites FOR ALL
    USING (auth.uid() = user_id);

-- Notifications Policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- User Settings Policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_date_of_birth DATE;
BEGIN
    -- Safely parse date_of_birth (handle NULL and invalid dates)
    BEGIN
        IF NEW.raw_user_meta_data->>'date_of_birth' IS NOT NULL AND NEW.raw_user_meta_data->>'date_of_birth' != '' THEN
            v_date_of_birth := (NEW.raw_user_meta_data->>'date_of_birth')::DATE;
        ELSE
            v_date_of_birth := NULL;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            v_date_of_birth := NULL;
    END;

    -- Insert user profile with all metadata
    INSERT INTO public.user_profiles (
        id, 
        email, 
        first_name, 
        last_name,
        phone,
        date_of_birth,
        address,
        city,
        state,
        zip_code,
        country,
        id_type,
        id_number,
        id_file_url,
        security_question_1,
        security_answer_1,
        security_question_2,
        security_answer_2
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'phone', ''),
        v_date_of_birth,
        NULLIF(NEW.raw_user_meta_data->>'address', ''),
        NULLIF(NEW.raw_user_meta_data->>'city', ''),
        NULLIF(NEW.raw_user_meta_data->>'state', ''),
        NULLIF(NEW.raw_user_meta_data->>'zip_code', ''),
        COALESCE(NULLIF(NEW.raw_user_meta_data->>'country', ''), 'United States'),
        NULLIF(NEW.raw_user_meta_data->>'id_type', ''),
        NULLIF(NEW.raw_user_meta_data->>'id_number', ''),
        NULLIF(NEW.raw_user_meta_data->>'id_file_url', ''),
        NULLIF(NEW.raw_user_meta_data->>'security_question_1', ''),
        NULLIF(NEW.raw_user_meta_data->>'security_answer_1', ''),
        NULLIF(NEW.raw_user_meta_data->>'security_question_2', ''),
        NULLIF(NEW.raw_user_meta_data->>'security_answer_2', '')
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
    
    -- Create default settings (only if doesn't exist)
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile (can be called by authenticated users)
CREATE OR REPLACE FUNCTION public.update_user_profile(
    p_phone TEXT DEFAULT NULL,
    p_date_of_birth DATE DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_city TEXT DEFAULT NULL,
    p_state TEXT DEFAULT NULL,
    p_zip_code TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL,
    p_id_type TEXT DEFAULT NULL,
    p_id_number TEXT DEFAULT NULL,
    p_id_file_url TEXT DEFAULT NULL,
    p_security_question_1 TEXT DEFAULT NULL,
    p_security_answer_1 TEXT DEFAULT NULL,
    p_security_question_2 TEXT DEFAULT NULL,
    p_security_answer_2 TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE public.user_profiles
    SET
        phone = COALESCE(p_phone, phone),
        date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
        address = COALESCE(p_address, address),
        city = COALESCE(p_city, city),
        state = COALESCE(p_state, state),
        zip_code = COALESCE(p_zip_code, zip_code),
        country = COALESCE(p_country, country),
        id_type = COALESCE(p_id_type, id_type),
        id_number = COALESCE(p_id_number, id_number),
        id_file_url = COALESCE(p_id_file_url, id_file_url),
        security_question_1 = COALESCE(p_security_question_1, security_question_1),
        security_answer_1 = COALESCE(p_security_answer_1, security_answer_1),
        security_question_2 = COALESCE(p_security_question_2, security_question_2),
        security_answer_2 = COALESCE(p_security_answer_2, security_answer_2),
        updated_at = TIMEZONE('utc', NOW())
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to verify PIN for login (allows PIN verification without exposing data)
CREATE OR REPLACE FUNCTION public.verify_pin_for_login(email_input TEXT, pin_input TEXT)
RETURNS TABLE(user_id UUID, email TEXT, pin_set BOOLEAN) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.email,
        CASE WHEN us.pin_hash IS NOT NULL AND us.pin_hash = pin_input THEN TRUE ELSE FALSE END as pin_set
    FROM public.user_profiles up
    LEFT JOIN public.user_settings us ON us.user_id = up.id
    WHERE LOWER(up.email) = LOWER(email_input);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.verify_pin_for_login(TEXT, TEXT) TO anon, authenticated;

-- Function to save PIN for new users (bypasses RLS, used during signup)
-- Also ensures profile exists (in case trigger hasn't run yet)
CREATE OR REPLACE FUNCTION public.save_pin_for_new_user(p_user_id UUID, p_pin TEXT)
RETURNS void AS $$
DECLARE
    v_email TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_phone TEXT;
    v_date_of_birth DATE;
    v_address TEXT;
    v_city TEXT;
    v_state TEXT;
    v_zip_code TEXT;
    v_country TEXT;
    v_id_type TEXT;
    v_id_number TEXT;
    v_id_file_url TEXT;
    v_security_question_1 TEXT;
    v_security_answer_1 TEXT;
    v_security_question_2 TEXT;
    v_security_answer_2 TEXT;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if profile exists
    SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = p_user_id) INTO v_user_exists;
    
    -- If profile doesn't exist, create it from auth.users metadata
    IF NOT v_user_exists THEN
        -- Get all user data from auth.users
        SELECT 
            email,
            COALESCE(raw_user_meta_data->>'first_name', ''),
            COALESCE(raw_user_meta_data->>'last_name', ''),
            NULLIF(raw_user_meta_data->>'phone', ''),
            CASE 
                WHEN raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                     AND raw_user_meta_data->>'date_of_birth' != ''
                THEN (raw_user_meta_data->>'date_of_birth')::DATE
                ELSE NULL
            END,
            NULLIF(raw_user_meta_data->>'address', ''),
            NULLIF(raw_user_meta_data->>'city', ''),
            NULLIF(raw_user_meta_data->>'state', ''),
            NULLIF(raw_user_meta_data->>'zip_code', ''),
            COALESCE(NULLIF(raw_user_meta_data->>'country', ''), 'United States'),
            NULLIF(raw_user_meta_data->>'id_type', ''),
            NULLIF(raw_user_meta_data->>'id_number', ''),
            NULLIF(raw_user_meta_data->>'id_file_url', ''),
            NULLIF(raw_user_meta_data->>'security_question_1', ''),
            NULLIF(raw_user_meta_data->>'security_answer_1', ''),
            NULLIF(raw_user_meta_data->>'security_question_2', ''),
            NULLIF(raw_user_meta_data->>'security_answer_2', '')
        INTO 
            v_email, v_first_name, v_last_name, v_phone, v_date_of_birth,
            v_address, v_city, v_state, v_zip_code, v_country,
            v_id_type, v_id_number, v_id_file_url,
            v_security_question_1, v_security_answer_1,
            v_security_question_2, v_security_answer_2
        FROM auth.users
        WHERE id = p_user_id;
        
        -- Create full profile with all metadata
        IF v_email IS NOT NULL THEN
            INSERT INTO public.user_profiles (
                id, email, first_name, last_name, phone, date_of_birth,
                address, city, state, zip_code, country,
                id_type, id_number, id_file_url,
                security_question_1, security_answer_1,
                security_question_2, security_answer_2
            )
            VALUES (
                p_user_id, v_email, v_first_name, v_last_name, v_phone, v_date_of_birth,
                v_address, v_city, v_state, v_zip_code, v_country,
                v_id_type, v_id_number, v_id_file_url,
                v_security_question_1, v_security_answer_1,
                v_security_question_2, v_security_answer_2
            )
            ON CONFLICT (id) DO NOTHING;
        END IF;
    END IF;
    
    -- Create settings record if it doesn't exist
    INSERT INTO public.user_settings (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Now save or update PIN
    INSERT INTO public.user_settings (user_id, pin_hash)
    VALUES (p_user_id, p_pin)
    ON CONFLICT (user_id) 
    DO UPDATE SET pin_hash = p_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.save_pin_for_new_user(UUID, TEXT) TO anon, authenticated;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_cards_updated_at ON public.cards;
CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

