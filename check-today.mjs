import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkToday() {
  const userId = '038345ec-713d-4432-83e0-b5b12d3ee5bc';
  const today = '2026-03-25';
  
  console.log(`Checking logs for user ${userId} on ${today}...`);

  // Query meal_logs directly with range
  const { data: logs, error } = await supabase
    .from('meal_logs')
    .select(`
      *,
      items:meal_log_items(*)
    `)
    .eq('user_id', userId)
    .gte('logged_at', `${today}T00:00:00`)
    .lte('logged_at', `${today}T23:59:59`);

  if (error) {
    console.error('Error fetching logs:', error);
    return;
  }

  console.log(`Found ${logs.length} meal logs.`);
  logs.forEach(log => {
    console.log(`- Log ID: ${log.id}, Slot: ${log.meal_slot}, LoggedAt: ${log.logged_at}, Items: ${log.items.length}`);
    if (log.items.length > 0) {
      log.items.forEach(item => {
        console.log(`  - Item: ${item.id}, Name: ${item.food_id}, Cal: ${item.calories}`);
      });
    }
  });

  // Also query user_targets to see if they align
  const { data: targets } = await supabase
    .from('user_targets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  console.log('User Targets:', targets);
}

checkToday();
