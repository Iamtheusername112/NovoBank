-- Seed Data for NovaBank
-- Optional: Run this after creating the schema to add sample data
-- Make sure to replace the user_id with an actual user ID from auth.users

-- Note: This is optional seed data for testing
-- You'll need to replace 'YOUR_USER_ID_HERE' with an actual UUID from auth.users

-- Example: Insert a sample card (uncomment and replace user_id)
/*
INSERT INTO public.cards (user_id, card_number, card_holder_name, expiry_date, balance, gradient_type)
VALUES (
    'YOUR_USER_ID_HERE',
    '1234 5678 9000 0000',
    'Mick Gardy',
    '12/24',
    800.12,
    'purple'
);
*/

-- Example: Insert sample transactions (uncomment and replace user_id)
/*
INSERT INTO public.transactions (user_id, amount, transaction_type, category, description, recipient_name)
VALUES 
    ('YOUR_USER_ID_HERE', -100.00, 'sent', 'Other', 'Payment to Ethan', 'Ethan'),
    ('YOUR_USER_ID_HERE', 24.00, 'received', 'Other', 'Payment from Daniel', 'Daniel'),
    ('YOUR_USER_ID_HERE', -60.00, 'sent', 'Other', 'Payment to Ann', 'Ann');
*/

