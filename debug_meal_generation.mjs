#!/usr/bin/env node
// Simulate the exact meal generation logic from the edge function

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

// User selections from the recent onboarding
const userSelections = {
  proteins: ["chicken", "beef", "eggs"],
  carbs: ["rice", "sweet_potato", "fruit"],
  fats: ["peanut_butter", "almonds", "olive_oil"],
  traditional_meals: true
};

async function testMealGeneration() {
  console.log('🔍 Testing meal generation with user selections:', userSelections);
  console.log('');
  
  // 1. Fetch all foods (like the edge function does)
  const { data: foods, error } = await supabase
    .from('food_items')
    .select('*');
  
  if (error) {
    console.error('❌ Error fetching foods:', error);
    return;
  }
  
  console.log(`✅ Fetched ${foods.length} foods from database`);
  
  // 2. Convert to scientific format (like convertFoodsToScientificFormat)
  const scientificFoods = foods.map(f => ({
    ...f,
    variety_family: f.variety_family || 'other',
  }));
  
  // 3. Filter proteins (>5g protein)
  const availableProteins = scientificFoods.filter(
    (f) => userSelections.proteins.includes(f.variety_family) && f.protein_per_100g > 5
  );
  
  // 4. Filter carbs (>5g carbs)
  const availableCarbs = scientificFoods.filter(
    (f) => userSelections.carbs.includes(f.variety_family) && f.carbs_per_100g > 5
  );
  
  // 5. Filter fats (>2g fat)
  const availableFats = scientificFoods.filter(
    (f) => userSelections.fats.includes(f.variety_family) && f.fat_per_100g > 2
  );
  
  console.log(`\n📊 Available foods by category:`);
  console.log(`  Proteins: ${availableProteins.length}`);
  console.log(`  Carbs: ${availableCarbs.length}`);
  console.log(`  Fats: ${availableFats.length}`);
  
  if (availableProteins.length === 0) {
    console.log('\n❌ NO PROTEINS MATCH!');
    console.log('  User wants:', userSelections.proteins);
    const proteinVarieties = [...new Set(scientificFoods.filter(f => f.protein_per_100g > 5).map(f => f.variety_family))];
    console.log('  Available varieties with protein>5g:', proteinVarieties.slice(0, 20));
    
    // Check exact matches
    for (const p of userSelections.proteins) {
      const matches = scientificFoods.filter(f => f.variety_family === p && f.protein_per_100g > 5);
      console.log(`  - "${p}" matches: ${matches.length}`);
      if (matches.length > 0) {
        console.log(`    Example: ${matches[0].name} (variety_family="${matches[0].variety_family}", protein=${matches[0].protein_per_100g}g)`);
      }
    }
  } else {
    console.log('\n✅ Proteins found:');
    availableProteins.slice(0, 5).forEach(f => {
      console.log(`  - ${f.name} (${f.variety_family}, ${f.protein_per_100g}g protein)`);
    });
  }
  
  if (availableCarbs.length === 0) {
    console.log('\n❌ NO CARBS MATCH!');
    console.log('  User wants:', userSelections.carbs);
    const carbVarieties = [...new Set(scientificFoods.filter(f => f.carbs_per_100g > 5).map(f => f.variety_family))];
    console.log('  Available varieties with carbs>5g:', carbVarieties.slice(0, 20));
    
    // Check exact matches
    for (const c of userSelections.carbs) {
      const matches = scientificFoods.filter(f => f.variety_family === c && f.carbs_per_100g > 5);
      console.log(`  - "${c}" matches: ${matches.length}`);
      if (matches.length > 0) {
        console.log(`    Example: ${matches[0].name} (variety_family="${matches[0].variety_family}", carbs=${matches[0].carbs_per_100g}g)`);
      } else {
        // Check if variety_family exists at all
        const anyMatches = scientificFoods.filter(f => f.variety_family === c);
        console.log(`    No foods with carbs>5g and variety_family="${c}"`);
        if (anyMatches.length > 0) {
          console.log(`    But found ${anyMatches.length} foods with variety_family="${c}" (carbs too low):`);
          anyMatches.slice(0, 3).forEach(f => {
            console.log(`      - ${f.name}: carbs=${f.carbs_per_100g}g`);
          });
        }
      }
    }
  } else {
    console.log('\n✅ Carbs found:');
    availableCarbs.slice(0, 5).forEach(f => {
      console.log(`  - ${f.name} (${f.variety_family}, ${f.carbs_per_100g}g carbs)`);
    });
  }
  
  if (availableFats.length === 0) {
    console.log('\n❌ NO FATS MATCH!');
    console.log('  User wants:', userSelections.fats);
    const fatVarieties = [...new Set(scientificFoods.filter(f => f.fat_per_100g > 2).map(f => f.variety_family))];
    console.log('  Available varieties with fat>2g:', fatVarieties.slice(0, 20));
    
    // Check exact matches
    for (const f of userSelections.fats) {
      const matches = scientificFoods.filter(food => food.variety_family === f && food.fat_per_100g > 2);
      console.log(`  - "${f}" matches: ${matches.length}`);
      if (matches.length > 0) {
        console.log(`    Example: ${matches[0].name} (variety_family="${matches[0].variety_family}", fat=${matches[0].fat_per_100g}g)`);
      }
    }
  } else {
    console.log('\n✅ Fats found:');
    availableFats.slice(0, 5).forEach(f => {
      console.log(`  - ${f.name} (${f.variety_family}, ${f.fat_per_100g}g fat)`);
    });
  }
  
  // Final result
  console.log('\n' + '='.repeat(50));
  if (availableProteins.length > 0 && availableCarbs.length > 0 && availableFats.length > 0) {
    console.log('✅ SUCCESS - Meal generation should work!');
  } else {
    console.log('❌ FAILURE - No foods available for one or more categories');
  }
}

testMealGeneration().catch(console.error);
