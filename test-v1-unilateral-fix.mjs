#!/usr/bin/env node
/**
 * V1 Unilateral Fix Verification Script
 * Tests that the unilateral exercise group mapping fix works correctly
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

// Test credentials - update these with your test user
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'james@test.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'your-test-password';

async function testV1UnilateralFix() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  V1 UNILATERAL FIX VERIFICATION                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('This test verifies the fix for:');
  console.log('  "No valid exercises found for group Unilateral_Hinge"');
  console.log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Step 1: Sign in
  console.log(`🔐 Signing in as ${TEST_EMAIL}...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (authError) {
    console.error('❌ Sign in failed:', authError.message);
    console.log('');
    console.log('Update TEST_USER_EMAIL and TEST_USER_PASSWORD in this script');
    console.log('Or set them as environment variables.');
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`✅ Signed in as: ${authData.user.email}`);
  console.log(`   User ID: ${userId}`);
  console.log('');

  // Step 2: Call Edge Function with V1
  console.log('📡 Testing V1 plan generation with unilateral exercises...');
  console.log('   This uses a 6-day template that includes Unilateral_Hinge slots.');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-user-plans', {
      body: {
        user_id: userId,
        plan_type: 'workout',
        generation_version: 'v1',
        activation_mode: 'preview',
        workout_start_date: new Date().toISOString().split('T')[0]
      }
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('');

    if (error) {
      console.error('❌ FUNCTION ERROR');
      console.error('Error:', error);
      
      if (error.message?.includes('non-2xx')) {
        console.log('');
        console.log('The Edge Function returned an error status.');
        console.log('This usually means the function itself threw an exception.');
      }
      process.exit(1);
    }

    if (!data) {
      console.error('❌ No data returned from function');
      process.exit(1);
    }

    console.log('📊 Response keys:', Object.keys(data).join(', '));
    console.log('');
    
    if (data.success === false) {
      console.error('❌ GENERATION FAILED');
      console.error('');
      console.error('Error:', data.error);
      console.error('');
      
      if (data.error?.includes('Unilateral_Hinge')) {
        console.error('⚠️  THE UNILATERAL BUG IS STILL PRESENT!');
        console.error('   The fix may not be deployed yet.');
      }
      
      if (data.details) {
        console.error('Details:', JSON.stringify(data.details, null, 2));
      }
      if (data.run_id) {
        console.log('Run ID:', data.run_id);
      }
      process.exit(1);
    }

    if (data.success === true) {
      console.log('✅ V1 GENERATION SUCCESS!');
      console.log('');
      console.log('Results:');
      console.log('  Run ID:', data.run_id);
      
      if (data.workout_plan) {
        console.log('  Workout Plan ID:', data.workout_plan.plan_id);
        console.log('  Days generated:', data.workout_plan.days?.length || 0);
        
        // Check if day 6 exists (the one with unilateral hinge)
        const day6 = data.workout_plan.days?.find(d => d.day_number === 6);
        if (day6) {
          console.log('  Day 6 exercises:', day6.exercises?.length || 0);
          const unilateralExercise = day6.exercises?.find(e => 
            e.name?.toLowerCase().includes('single') || 
            e.name?.toLowerCase().includes('unilateral') ||
            e.is_unilateral
          );
          if (unilateralExercise) {
            console.log('  ✅ Day 6 has unilateral exercise:', unilateralExercise.name);
          }
        }
      }
      
      if (data.warnings?.length > 0) {
        console.log('  Warnings:', data.warnings.length);
        data.warnings.forEach(w => console.log(`    - ${w}`));
      }
      
      console.log('');
      console.log('╔═══════════════════════════════════════════════════════════╗');
      console.log('║  ✅ UNILATERAL FIX VERIFIED SUCCESSFULLY!                ║');
      console.log('╚═══════════════════════════════════════════════════════════╝');
      process.exit(0);
    }

    // Unknown response format
    console.log('⚠️ Unknown response format:');
    console.log(JSON.stringify(data, null, 2));
    process.exit(1);

  } catch (e) {
    console.error('❌ EXCEPTION:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

testV1UnilateralFix();
