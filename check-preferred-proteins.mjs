import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://hatskscplygyrrpepqmx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdHNrc2NwbHlneXJycGVwcW14Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzQyNDkzNywiZXhwIjoyMDUzMDAwOTM3fQ._yO6_p7B2Pq8_P0G6g09G5En0iZvrfLVeTjQ0hOqHDU'
);

async function main() {
  const userId = '84e76b6e-236b-4c20-af02-6d12c1754c70';
  
  const { data, error } = await supabase
    .from('onboarding_answers')
    .select('answers')
    .eq('user_id', userId)
    .single();
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('=== User Onboarding Answers ===');
  console.log('User ID:', userId);
  console.log('\nPreferred Proteins:', data.answers.preferred_proteins || 'NOT SET');
  console.log('Dietary Preference:', data.answers.dietary_preference);
  console.log('Refused Foods:', data.answers.refused_foods);
  console.log('Allergies:', data.answers.allergies_exclusions);
}

main();
