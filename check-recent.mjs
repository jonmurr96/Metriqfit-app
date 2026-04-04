import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLogs() {
  console.log('Checking all meal logs from the last 48 hours...');

  const { data: logs, error } = await supabase
    .from('meal_logs')
    .select(`
      id,
      user_id,
      meal_slot,
      logged_at,
      items:meal_log_items(
        id,
        calories
      )
    `)
    .order('logged_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log(`Found ${logs.length} recent meal logs.`);
  logs.forEach(log => {
    const totalCalories = log.items.reduce((sum, item) => sum + (item.calories || 0), 0);
    console.log(`- Log: ${log.id}, User: ${log.user_id}, Slot: ${log.meal_slot}, LoggedAt: ${log.logged_at}, Items: ${log.items.length}, Cal: ${totalCalories}`);
  });
}

checkRecentLogs();
