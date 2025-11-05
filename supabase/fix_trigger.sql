-- Fix trigger setup - ensure trigger is properly configured

-- Drop and recreate trigger to ensure it's set up correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_date_of_birth DATE;
    v_error_message TEXT;
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
    BEGIN
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
        ON CONFLICT (id) DO NOTHING;
        
        -- Create default settings (only if doesn't exist)
        INSERT INTO public.user_settings (user_id)
        VALUES (NEW.id)
        ON CONFLICT (user_id) DO NOTHING;
        
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't fail the trigger
            v_error_message := SQLERRM;
            RAISE WARNING 'Error in handle_new_user trigger for user %: %', NEW.id, v_error_message;
            -- Still return NEW to allow auth.users insert to succeed
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger with explicit timing
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Verify trigger was created
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name,
    CASE tgenabled
        WHEN 'O' THEN 'Enabled'
        WHEN 'D' THEN 'Disabled'
        ELSE 'Unknown'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

