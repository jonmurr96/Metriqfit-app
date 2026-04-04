#!/usr/bin/env node
// Diagnostic script to check food data in Supabase

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function checkFoodData() {
  console.log('🔍 Checking food data in database...\n');
  
  // 1. Check total food count
  const { count: totalCount, error: countError } = await supabase
    .from('food_items')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('❌ Error counting foods:', countError);
    return;
  }
  console.log(`Total foods: ${totalCount}`);
  
  // 2. Check foods with NULL variety_family
  const { count: nullCount, error: nullError } = await supabase
    .from('food_items')
    .select('*', { count: 'exact', head: true })
    .is('variety_family', null);
  
  if (nullError) {
    console.error('❌ Error counting NULL variety_family:', nullError);
    return;
  }
  console.log(`Foods with NULL variety_family: ${nullCount}`);
  
  // 3. Check foods with empty variety_family
  const { count: emptyCount, error: emptyError } = await supabase
    .from('food_items')
    .select('*', { count: 'exact', head: true })
    .eq('variety_family', '');
  
  if (emptyError) {
    console.error('❌ Error counting empty variety_family:', emptyError);
    return;
  }
  console.log(`Foods with empty variety_family: ${emptyCount}`);
  
  // 4. Get distinct variety_family values
  const { data: varieties, error: varError } = await supabase
    .from('food_items')
    .select('variety_family')
    .not('variety_family', 'is', null)
    .not('variety_family', 'eq', '');
  
  if (varError) {
    console.error('❌ Error getting varieties:', varError);
    return;
  }
  
  const uniqueVarieties = [...new Set(varieties.map(v => v.variety_family))].sort();
  console.log(`\n📋 Unique variety_family values (${uniqueVarieties.length}):`);
  uniqueVarieties.forEach(v => console.log(`  - ${v}`));
  
  // 5. Check sample foods for each macro type
  console.log('\n🥩 Sample protein foods (>5g protein):');
  const { data: proteins, error: protError } = await supabase
    .from('food_items')
    .select('name, variety_family, protein_per_100g')
    .gt('protein_per_100g', 5)
    .limit(10);
  
  if (protError) {
    console.error('❌ Error getting proteins:', protError);
  } else {
    proteins.forEach(f => {
      console.log(`  - ${f.name}: variety_family=${f.variety_family}, protein=${f.protein_per_100g}g`);
    });
  }
  
  console.log('\n🍚 Sample carb foods (>5g carbs):');
  const { data: carbs, error: carbError } = await supabase
    .from('food_items')
    .select('name, variety_family, carbs_per_100g')
    .gt('carbs_per_100g', 5)
    .limit(10);
  
  if (carbError) {
    console.error('❌ Error getting carbs:', carbError);
  } else {
    carbs.forEach(f => {
      console.log(`  - ${f.name}: variety_family=${f.variety_family}, carbs=${f.carbs_per_100g}g`);
    });
  }
  
  console.log('\n🥑 Sample fat foods (>2g fat):');
  const { data: fats, error: fatError } = await supabase
    .from('food_items')
    .select('name, variety_family, fat_per_100g')
    .gt('fat_per_100g', 2)
    .limit(10);
  
  if (fatError) {
    console.error('❌ Error getting fats:', fatError);
  } else {
    fats.forEach(f => {
      console.log(`  - ${f.name}: variety_family=${f.variety_family}, fat=${f.fat_per_100g}g`);
    });
  }
  
  // 6. Count by variety_family
  console.log('\n📊 Count by variety_family:');
  const { data: counts, error: countByError } = await supabase
    .rpc('get_variety_family_counts');
  
  if (countByError) {
    // Try alternative query
    const { data: allFoods, error: allError } = await supabase
      .from('food_items')
      .select('variety_family');
    
    if (allError) {
      console.error('❌ Error getting counts:', allError);
    } else {
      const countMap = {};
      allFoods.forEach(f => {
        const vf = f.variety_family || 'NULL/empty';
        countMap[vf] = (countMap[vf] || 0) + 1;
      });
      Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .forEach(([vf, count]) => {
          console.log(`  - ${vf}: ${count}`);
        });
    }
  }
  
  console.log('\n✅ Diagnostic complete');
}

checkFoodData().catch(console.error);
