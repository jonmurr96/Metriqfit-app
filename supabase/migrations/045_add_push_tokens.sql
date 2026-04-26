-- Add push_token column to profiles table for Expo push notifications

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create an index to quickly look up users by their push token if needed
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token);
