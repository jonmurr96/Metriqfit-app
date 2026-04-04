#!/usr/bin/env node
/**
 * V1 Generation Test with User Auth
 * Signs in a user and uses their JWT to call the function
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

// Test user credentials - use env vars or defaults
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'demouser@metriqfit.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'demo123';

async function testWithAuth() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     V1 PLAN GENERATION TEST (WITH AUTH)                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
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
    process.exit(1);
  }

  const userId = authData.user.id;
  const accessToken = authData.session.access_token;
  
  console.log(`✅ Signed in as: ${authData.user.email}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Token: ${accessToken.substring(0, 20)}...`);
  console.log('');

  // Step 2: Call Edge Function with user's JWT
  console.log('📡 Calling generate-user-plans...');
  
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
      
      // Try to get response body
      if (error.context) {
        const text = await error.context.text();
        console.error('Response body:', text);
      }
      process.exit(1);
    }

    if (!data) {
      console.error('❌ No data returned');
      process.exit(1);
    }

    console.log('📊 Response keys:', Object.keys(data).join(', '));
    console.log('');
    
    if (data.success === false) {
      console.error('❌ FUNCTION REPORTED FAILURE');
      console.error('Error:', data.error);
      if (data.details) {
        console.error('Details:', JSON.stringify(data.details, null, 2));
      }
      if (data.run_id) {
        console.log('Run ID:', data.run_id);
      }
      process.exit(1);
    }

    if (data.success === true) {
      console.log('✅ FUNCTION SUCCESS!');
      console.log('');
      console.log('Results:');
      console.log('  Run ID:', data.run_id);
      if (data.workout_plan) {
        console.log('  Workout Plan ID:', data.workout_plan.plan_id);
        console.log('  Days:', data.workout_plan.days?.length || 0);
      }
      if (data.warnings?.length > 0) {
        console.log('  Warnings:', data.warnings.length);
        data.warnings.forEach(w => console.log(`    - ${w}`));
      }
      process.exit(0);
    }

    console.log('⚠️ Unknown response format:');
    console.log(JSON.stringify(data, null, 2));
    process.exit(1);

  } catch (e) {
    console.error('❌ EXCEPTION:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
}

testWithAuth();
