import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findActiveUsers() {
  console.log('Finding all users with meal logs...');

  const { data: logs, error } = await supabase
    .from('meal_logs')
    .select('user_id')
    .limit(100);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  const userIds = [...new Set(logs.map(log => log.user_id))];
  console.log('User IDs with logs:', userIds);

  for (const id of userIds) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    console.log(`User ${id}:`, profile);
  }
}

findActiveUsers();
