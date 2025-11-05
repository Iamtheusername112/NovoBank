-- Fix existing users who don't have profiles
-- This will create profiles for all users in auth.users who don't have profiles in user_profiles

DO $$
DECLARE
    v_user RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Loop through all users in auth.users who don't have profiles
    FOR v_user IN 
        SELECT 
            u.id,
            u.email,
            u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN public.user_profiles up ON u.id = up.id
        WHERE up.id IS NULL
    LOOP
        -- Create profile with all metadata
        INSERT INTO public.user_profiles (
            id, email, first_name, last_name, phone, date_of_birth,
            address, city, state, zip_code, country,
            id_type, id_number, id_file_url,
            security_question_1, security_answer_1,
            security_question_2, security_answer_2
        )
        VALUES (
            v_user.id,
            COALESCE(v_user.email, ''),
            COALESCE(v_user.raw_user_meta_data->>'first_name', ''),
            COALESCE(v_user.raw_user_meta_data->>'last_name', ''),
            NULLIF(v_user.raw_user_meta_data->>'phone', ''),
            CASE 
                WHEN v_user.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
                     AND v_user.raw_user_meta_data->>'date_of_birth' != ''
                THEN (v_user.raw_user_meta_data->>'date_of_birth')::DATE
                ELSE NULL
            END,
            NULLIF(v_user.raw_user_meta_data->>'address', ''),
            NULLIF(v_user.raw_user_meta_data->>'city', ''),
            NULLIF(v_user.raw_user_meta_data->>'state', ''),
            NULLIF(v_user.raw_user_meta_data->>'zip_code', ''),
            COALESCE(NULLIF(v_user.raw_user_meta_data->>'country', ''), 'United States'),
            NULLIF(v_user.raw_user_meta_data->>'id_type', ''),
            NULLIF(v_user.raw_user_meta_data->>'id_number', ''),
            NULLIF(v_user.raw_user_meta_data->>'id_file_url', ''),
            NULLIF(v_user.raw_user_meta_data->>'security_question_1', ''),
            NULLIF(v_user.raw_user_meta_data->>'security_answer_1', ''),
            NULLIF(v_user.raw_user_meta_data->>'security_question_2', ''),
            NULLIF(v_user.raw_user_meta_data->>'security_answer_2', '')
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Create settings record
        INSERT INTO public.user_settings (user_id)
        VALUES (v_user.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Created % profiles for existing users', v_count;
END $$;

-- Verify profiles were created
SELECT 
    u.id,
    u.email,
    CASE WHEN up.id IS NOT NULL THEN 'Profile exists' ELSE 'NO PROFILE' END as profile_status,
    CASE WHEN us.user_id IS NOT NULL THEN 'Settings exist' ELSE 'NO SETTINGS' END as settings_status
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.id
LEFT JOIN public.user_settings us ON u.id = us.user_id
ORDER BY u.created_at DESC;

