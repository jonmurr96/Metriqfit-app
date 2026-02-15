import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY / EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function signature(row) {
  const equipment = Array.isArray(row.equipment_required)
    ? row.equipment_required.map((item) => String(item).toLowerCase()).sort().join(',')
    : '';
  return [
    String(row.pattern || '').toLowerCase().trim(),
    String(row.primary_muscle || '').toLowerCase().trim(),
    equipment,
  ].join('|');
}

function isBlank(value) {
  return !value || !String(value).trim();
}

async function main() {
  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('external_id,name,category,equipment_required,primary_muscle,pattern,difficulty,is_compound')
    .order('external_id', { ascending: true })
    .limit(5000);

  if (error) {
    console.error('Failed to fetch exercises:', error.message);
    process.exit(1);
  }

  const rows = exercises || [];
  if (!rows.length) {
    console.error('No exercises returned from database.');
    process.exit(1);
  }

  const byNormalizedName = new Map();
  const duplicateNormalizedGroups = [];
  const duplicateNameWarnings = [];
  const metadataIssues = [];

  for (const row of rows) {
    const normalized = normalizeName(row.name);
    const key = `${normalized}`;
    const bucket = byNormalizedName.get(key) || [];
    bucket.push(row);
    byNormalizedName.set(key, bucket);

    if (isBlank(row.external_id)) metadataIssues.push(`[${row.name}] missing external_id`);
    if (isBlank(row.name)) metadataIssues.push(`[${row.external_id}] missing name`);
    if (isBlank(row.category)) metadataIssues.push(`[${row.external_id}] missing category`);
    if (!Array.isArray(row.equipment_required) || row.equipment_required.length === 0) {
      metadataIssues.push(`[${row.external_id}] missing equipment_required tags`);
    }
    if (isBlank(row.primary_muscle)) metadataIssues.push(`[${row.external_id}] missing primary_muscle`);
    if (isBlank(row.pattern)) metadataIssues.push(`[${row.external_id}] missing pattern`);
    if (!['beginner', 'intermediate', 'advanced'].includes(String(row.difficulty || '').toLowerCase())) {
      metadataIssues.push(`[${row.external_id}] invalid difficulty "${row.difficulty}"`);
    }
    if (typeof row.is_compound !== 'boolean') {
      metadataIssues.push(`[${row.external_id}] missing is_compound flag`);
    }
  }

  for (const group of byNormalizedName.values()) {
    if (group.length > 1) {
      const bySignature = new Map();
      for (const row of group) {
        const key = signature(row);
        const bucket = bySignature.get(key) || [];
        bucket.push(row);
        bySignature.set(key, bucket);
      }

      let hasCollision = false;
      for (const signatureGroup of bySignature.values()) {
        if (signatureGroup.length > 1) {
          hasCollision = true;
          duplicateNormalizedGroups.push(signatureGroup);
        }
      }

      if (!hasCollision) {
        duplicateNameWarnings.push(group);
      }
    }
  }

  if (duplicateNormalizedGroups.length > 0) {
    console.error('\nDuplicate / near-identical exercise names found (normalized match):');
    for (const group of duplicateNormalizedGroups) {
      const formatted = group.map((item) => `${item.external_id}:${item.name}`).join(' | ');
      console.error(`- ${formatted}`);
    }
  }

  if (metadataIssues.length > 0) {
    console.error('\nMetadata completeness issues:');
    for (const issue of metadataIssues) {
      console.error(`- ${issue}`);
    }
  }

  if (duplicateNameWarnings.length > 0) {
    console.warn('\nName-collision warnings (same normalized name, distinct movement signatures):');
    for (const group of duplicateNameWarnings) {
      const formatted = group
        .map((item) => `${item.external_id}:${item.name} [${item.pattern}|${item.primary_muscle}]`)
        .join(' | ');
      console.warn(`- ${formatted}`);
    }
  }

  if (duplicateNormalizedGroups.length > 0 || metadataIssues.length > 0) {
    process.exit(1);
  }

  console.log(`Exercise catalog validation passed (${rows.length} rows checked).`);
}

main().catch((error) => {
  console.error('Validation script failed:', error);
  process.exit(1);
});
