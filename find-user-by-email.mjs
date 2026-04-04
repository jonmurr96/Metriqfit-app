import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
  const email = 'jonmurr1996@yahoo.com';
  console.log(`Searching for user with email: ${email}`);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error finding user:', error);
    return;
  }

  if (profile) {
    console.log('Found profile:', profile);
    
    // Check meal logs for THIS user
    const { data: logs } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', profile.id)
      .limit(10);
    
    console.log(`Meal logs for ${profile.id}:`, logs);
  } else {
    console.log('No profile found for this email.');
    
    // List all profiles just in case
    const { data: allProfiles } = await supabase.from('profiles').select('id, email').limit(10);
    console.log('All profiles (first 10):', allProfiles);
  }
}

findUser();
