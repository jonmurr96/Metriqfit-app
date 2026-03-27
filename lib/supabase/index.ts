import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Use placeholder values that pass validation if credentials are missing
const PLACEHOLDER_URL = 'https://xxxxxxxxxxxxxxxxxxxxx.supabase.co';
const PLACEHOLDER_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4eHh4eHh4eHh4eHh4eHh4eHh4eCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ2NjY2NjY2LCJleHAiOjE5NjIyNDI2NjZ9.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

// Validate that we have the required configuration
const hasValidConfig = supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http');

if (!hasValidConfig) {
  console.warn(
    '\n⚠️  SUPABASE NOT CONFIGURED ⚠️\n' +
    'Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.\n' +
    'Authentication and data features will not work until configured.\n'
  );
} else {
  console.log('✅ SUPABASE CONFIGURED WITH URL:', supabaseUrl);
}

// Create Supabase client (use placeholders if not configured)
export const supabase = createClient(
  hasValidConfig ? supabaseUrl : PLACEHOLDER_URL,
  hasValidConfig ? supabaseAnonKey : PLACEHOLDER_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    },
  }
);

// Export flag to check if Supabase is properly configured
export const isSupabaseConfigured = hasValidConfig;
