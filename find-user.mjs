import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findUser() {
  const email = 'jonmurr1996@yahoo.com';
  console.log(`Searching for user with email: ${email}...`);

  // We can't query auth.users directly with anon key, 
  // but we can check profiles or wait, maybe I can just get the session if I'm on the machine.
  // Actually, I'll check 'profiles' table.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    // Try without email filter if it doesn't exist
  }

  if (profile) {
    console.log(`Found profile: ID=${profile.id}, Name=${profile.full_name}`);
  } else {
    console.log('No profile found with that email. Listing all profiles to find candidates...');
    const { data: allProfiles } = await supabase.from('profiles').select('id, email, full_name').limit(10);
    console.log('Profiles:', allProfiles);
  }
}

findUser();
