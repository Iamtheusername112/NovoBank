-- Debug script to check trigger setup and manually fix missing profiles

-- 1. Check if trigger exists
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    tgenabled as enabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- 2. Check if function exists
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Check auth.users to see if user exists
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    raw_user_meta_data
FROM auth.users
WHERE email = 'mykrypto112@gmail.com'
LIMIT 1;

-- 4. Manually create profile for existing user (if trigger didn't fire)
-- Replace 'USER_ID_HERE' with the actual user ID from step 3
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_date_of_birth DATE;
BEGIN
    -- Get user data from auth.users
    SELECT 
        id,
        email,
        COALESCE(raw_user_meta_data->>'first_name', ''),
        COALESCE(raw_user_meta_data->>'last_name', ''),
        CASE 
            WHEN raw_user_meta_data->>'date_of_birth' IS NOT NULL 
            THEN (raw_user_meta_data->>'date_of_birth')::DATE
            ELSE NULL
        END
    INTO v_user_id, v_email, v_first_name, v_last_name, v_date_of_birth
    FROM auth.users
    WHERE email = 'mykrypto112@gmail.com'
    LIMIT 1;

    -- Create profile if it doesn't exist
    IF v_user_id IS NOT NULL THEN
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
        SELECT 
            v_user_id,
            v_email,
            COALESCE(u.raw_user_meta_data->>'first_name', ''),
            COALESCE(u.raw_user_meta_data->>'last_name', ''),
            NULLIF(u.raw_user_meta_data->>'phone', ''),
            CASE 
                WHEN u.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                THEN (u.raw_user_meta_data->>'date_of_birth')::DATE
                ELSE NULL
            END,
            NULLIF(u.raw_user_meta_data->>'address', ''),
            NULLIF(u.raw_user_meta_data->>'city', ''),
            NULLIF(u.raw_user_meta_data->>'state', ''),
            NULLIF(u.raw_user_meta_data->>'zip_code', ''),
            COALESCE(NULLIF(u.raw_user_meta_data->>'country', ''), 'United States'),
            NULLIF(u.raw_user_meta_data->>'id_type', ''),
            NULLIF(u.raw_user_meta_data->>'id_number', ''),
            NULLIF(u.raw_user_meta_data->>'id_file_url', ''),
            NULLIF(u.raw_user_meta_data->>'security_question_1', ''),
            NULLIF(u.raw_user_meta_data->>'security_answer_1', ''),
            NULLIF(u.raw_user_meta_data->>'security_question_2', ''),
            NULLIF(u.raw_user_meta_data->>'security_answer_2', '')
        FROM auth.users u
        WHERE u.id = v_user_id
        ON CONFLICT (id) DO NOTHING;
        
        -- Create settings if it doesn't exist
        INSERT INTO public.user_settings (user_id)
        VALUES (v_user_id)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Profile created for user: %', v_email;
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;

-- 5. Verify profile was created
SELECT id, email, first_name, last_name, created_at 
FROM user_profiles 
WHERE email = 'mykrypto112@gmail.com';

-- 6. Check settings
SELECT user_id, pin_hash IS NOT NULL as has_pin
FROM user_settings 
WHERE user_id IN (
    SELECT id FROM user_profiles WHERE email = 'mykrypto112@gmail.com'
);

