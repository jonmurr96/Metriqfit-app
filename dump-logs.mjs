import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dumpLogs() {
  console.log('Dumping all meal_logs...');

  const { data: logs, error } = await supabase
    .from('meal_logs')
    .select('*')
    .limit(50);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log(`Found ${logs.length} logs in total.`);
  logs.forEach(log => {
    console.log(`- Log: ${log.id}, User: ${log.user_id}, Slot: ${log.meal_slot}, LoggedAt: ${log.logged_at}`);
  });
}

dumpLogs();
