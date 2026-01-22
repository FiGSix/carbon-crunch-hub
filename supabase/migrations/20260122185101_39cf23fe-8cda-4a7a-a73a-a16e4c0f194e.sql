-- Confirm Seth Finley's email address (only update email_confirmed_at)
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'sethfinlay@gmail.com';