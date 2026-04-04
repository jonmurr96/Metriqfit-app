import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findActiveUsers() {
  console.log('Finding all users with any activity in the last 7 days...');

  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [workouts, measurements] = await Promise.all([
    supabase.from('workout_sessions').select('user_id, started_at').gte('started_at', weekAgo).limit(20),
    supabase.from('user_measurements').select('user_id, logged_at').gte('logged_at', weekAgo).limit(20)
  ]);

  const userIds = new Set();
  workouts.data?.forEach(w => userIds.add(w.user_id));
  measurements.data?.forEach(m => userIds.add(m.user_id));

  console.log('Active User IDs found:', Array.from(userIds));

  for (const id of userIds) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    console.log(`User ${id}:`, profile);
  }
}

findActiveUsers();
