#!/usr/bin/env node
/**
 * V1 Generation Diagnostic Script
 * Tests V1 plan generation with detailed error capture
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user configuration
const TEST_USER_ID = process.argv[2] || '9ba15f77-efd8-4135-8e7b-c633e8f6ad78'; // Default test user

async function testV1Generation() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     V1 PLAN GENERATION DIAGNOSTIC TEST                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`User ID: ${TEST_USER_ID}`);
  console.log(`URL: ${SUPABASE_URL}`);
  console.log('');

  // Invoke Edge Function with V1
  console.log('📡 Invoking generate-user-plans Edge Function...');
  console.log('   Parameters:', {
    user_id: TEST_USER_ID,
    plan_type: 'workout',
    generation_version: 'v1',
    activation_mode: 'preview'
  });
  console.log('');

  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-user-plans', {
      body: {
        user_id: TEST_USER_ID,
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
      console.error('❌ FUNCTION INVOCATION ERROR');
      console.error('');
      console.error('Error type:', typeof error);
      console.error('Error:', error);
      
      // Try to extract more details from error
      if (error.message) console.error('Message:', error.message);
      if (error.context) console.error('Context:', error.context);
      if (error.stack) console.error('Stack:', error.stack);
      
      // The error might be an HTTP response error
      if (error.name === 'FunctionsHttpError' || error.name === 'FunctionsRelayError') {
        console.error('');
        console.error('This is an HTTP/Relay error - the function may have thrown an exception.');
        console.error('Check the Supabase Edge Function logs in the dashboard.');
      }
      
      process.exit(1);
    }

    if (!data) {
      console.error('❌ No data returned from function');
      process.exit(1);
    }

    console.log('📊 Response keys:', Object.keys(data).join(', '));
    
    if (data.success === false) {
      console.error('');
      console.error('❌ FUNCTION REPORTED FAILURE');
      console.error('');
      console.error('Error:', data.error);
      console.error('');
      if (data.details) {
        console.error('Details:');
        console.error(JSON.stringify(data.details, null, 2));
      }
      if (data.run_id) {
        console.error('');
        console.error('Run ID:', data.run_id);
        
        // Try to fetch the run status for more details
        console.log('');
        console.log('🔍 Fetching run details...');
        const { data: runData, error: runError } = await supabase
          .from('plan_generation_runs')
          .select('*')
          .eq('id', data.run_id)
          .single();
        
        if (runError) {
          console.error('Could not fetch run:', runError.message);
        } else {
          console.log('Run status:', runData.status);
          console.log('Run created at:', runData.created_at);
          if (runData.validation_errors) {
            console.log('Validation errors:', runData.validation_errors);
          }
          if (runData.warnings_json) {
            console.log('Warnings:', runData.warnings_json);
          }
        }
      }
      process.exit(1);
    }

    if (data.success === true) {
      console.log('');
      console.log('✅ FUNCTION SUCCESS');
      console.log('Run ID:', data.run_id);
      
      if (data.workout_plan) {
        console.log('Workout Plan ID:', data.workout_plan.plan_id);
        console.log('Workout Days:', data.workout_plan.days?.length || 0);
      } else {
        console.log('⚠️  No workout_plan in response');
      }
      
      if (data.nutrition_plan) {
        console.log('Nutrition Plan ID:', data.nutrition_plan.plan_id);
      }
      
      if (data.warnings?.length > 0) {
        console.log('Warnings:', data.warnings.length);
        data.warnings.forEach(w => console.log(`  - ${w}`));
      }
      
      process.exit(0);
    }

    // Unknown response format
    console.log('');
    console.log('⚠️  UNKNOWN RESPONSE FORMAT');
    console.log(JSON.stringify(data, null, 2));
    process.exit(1);

  } catch (e) {
    const duration = Date.now() - startTime;
    console.error('');
    console.error(`❌ EXCEPTION after ${duration}ms`);
    console.error('Error:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }
}

testV1Generation();
