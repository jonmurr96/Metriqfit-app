#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

function parseArgs(argv) {
  const args = {
    target: 'staging',
    mode: null,
    json: false,
    batchSize: 50,
    cursor: null,
    all: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target') {
      args.target = String(argv[i + 1] || 'staging').toLowerCase();
      i += 1;
      continue;
    }
    if (arg === '--mode') {
      args.mode = String(argv[i + 1] || '').toLowerCase();
      i += 1;
      continue;
    }
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--batch-size') {
      args.batchSize = Number(argv[i + 1] || 50);
      i += 1;
      continue;
    }
    if (arg === '--cursor') {
      args.cursor = String(argv[i + 1] || '');
      i += 1;
      continue;
    }
    if (arg === '--all') {
      args.all = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      args.help = true;
      continue;
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/audit-workout-mappings.mjs --target <staging|prod> --mode <templates-v2|templates-v1|user-plans-active> [--json] [--batch-size N] [--cursor ID] [--all]

Required env vars:
  Staging: SUPABASE_STAGING_URL + SUPABASE_STAGING_SERVICE_ROLE_KEY
  Prod:    SUPABASE_PROD_URL + SUPABASE_PROD_SERVICE_ROLE_KEY

Fallback env vars (staging only):
  EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY)

Optional env var:
  WORKOUT_MAPPING_ADMIN_SECRET
`);
}

function resolveEnv(target) {
  const isProd = target === 'prod' || target === 'production';
  if (isProd) {
    return {
      url: process.env.SUPABASE_PROD_URL || process.env.SUPABASE_URL_PROD,
      key: process.env.SUPABASE_PROD_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY_PROD,
      label: 'prod',
    };
  }

  return {
    url:
      process.env.SUPABASE_STAGING_URL
      || process.env.SUPABASE_URL_STAGING
      || process.env.EXPO_PUBLIC_SUPABASE_URL
      || process.env.SUPABASE_URL,
    key:
      process.env.SUPABASE_STAGING_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_ROLE_KEY_STAGING
      || process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    label: 'staging',
  };
}

function modeToOperation(mode) {
  if (mode === 'templates-v2') {
    return { operation: 'audit_templates', scope: 'v2' };
  }
  if (mode === 'templates-v1') {
    return { operation: 'audit_templates', scope: 'v1' };
  }
  if (mode === 'user-plans-active') {
    return { operation: 'audit_active_plans', scope: null };
  }
  return null;
}

function summarizeForConsole(result) {
  const summary = result?.summary || {};
  console.log(`jobId: ${result?.jobId || 'n/a'}`);
  console.log(`processed: ${result?.processed || 0}`);
  console.log(`changed: ${result?.changed || 0}`);
  console.log(`skipped: ${result?.skipped || 0}`);
  console.log(`failed: ${result?.failed || 0}`);
  console.log(`cursor: ${result?.cursor || 'null'}`);

  if (summary && Object.keys(summary).length) {
    console.log('\nSummary:');
    for (const [key, value] of Object.entries(summary)) {
      console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
    }
  }

  const violations = result?.violations || [];
  if (violations.length) {
    console.log(`\nViolations: ${violations.length}`);
    for (const item of violations.slice(0, 20)) {
      const location = [item.templateExternalId || item.planId || '-', item.dayName || '-', item.exerciseName || '-']
        .filter(Boolean)
        .join(' | ');
      console.log(`  - ${location} :: ${Array.isArray(item.violationTypes) ? item.violationTypes.join(', ') : 'unknown'}`);
    }
    if (violations.length > 20) {
      console.log(`  ... ${violations.length - 20} more`);
    }
  }
}

function buildEmptyAggregate() {
  return {
    success: true,
    jobId: null,
    processed: 0,
    changed: 0,
    skipped: 0,
    failed: 0,
    cursor: null,
    completed: false,
    summary: {},
    violations: [],
    pages: [],
  };
}

function mergeNumericObject(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      mergeNumericObject(target[key], value);
      continue;
    }
    if (typeof value === 'number') {
      target[key] = Number(target[key] || 0) + value;
      continue;
    }
    if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.mode) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const op = modeToOperation(args.mode);
  if (!op) {
    console.error(`Unsupported mode: ${args.mode}`);
    printHelp();
    process.exit(1);
  }

  const env = resolveEnv(args.target);
  if (!env.url || !env.key) {
    console.error(`Missing Supabase credentials for target: ${env.label}`);
    process.exit(1);
  }

  if (args.mode === 'user-plans-active' && !String(env.key).includes('service')) {
    console.warn('Warning: user-plans-active mode generally requires a service-role key.');
  }

  const supabase = createClient(env.url, env.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const payload = {
    operation: op.operation,
    scope: op.scope || undefined,
    dryRun: true,
    batchSize: Number.isFinite(args.batchSize) ? Math.max(1, Math.min(200, Number(args.batchSize))) : 50,
    cursor: args.cursor || null,
    adminSecret: process.env.WORKOUT_MAPPING_ADMIN_SECRET || undefined,
  };
  const aggregate = buildEmptyAggregate();
  let nextCursor = payload.cursor;
  let page = 0;
  let nextJobId = null;

  while (true) {
    page += 1;
    const { data, error } = await supabase.functions.invoke('remediate-workout-mappings', {
      body: {
        ...payload,
        cursor: nextCursor,
        jobId: nextJobId,
      },
    });

    if (error) {
      console.error('Function invocation failed:', error.message || error);
      process.exit(1);
    }

    if (!data?.success) {
      if (args.json) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        summarizeForConsole(data || {});
      }
      process.exit(1);
    }

    aggregate.success = aggregate.success && !!data.success;
    aggregate.jobId = data.jobId || aggregate.jobId;
    aggregate.processed += Number(data.processed || 0);
    aggregate.changed += Number(data.changed || 0);
    aggregate.skipped += Number(data.skipped || 0);
    aggregate.failed += Number(data.failed || 0);
    aggregate.cursor = data.cursor ?? null;
    aggregate.completed = !!data.completed;
    aggregate.violations.push(...(data.violations || []));
    aggregate.pages.push({
      page,
      processed: Number(data.processed || 0),
      changed: Number(data.changed || 0),
      skipped: Number(data.skipped || 0),
      failed: Number(data.failed || 0),
      cursor: data.cursor ?? null,
      completed: !!data.completed,
    });
    mergeNumericObject(aggregate.summary, data.summary || {});

    if (!args.all || data.completed) {
      break;
    }

    nextCursor = data.cursor ?? null;
    nextJobId = data.jobId || nextJobId;
    if (!nextCursor) {
      break;
    }
  }

  if (args.json) {
    console.log(JSON.stringify(aggregate, null, 2));
  } else {
    summarizeForConsole(aggregate);
    if (aggregate.pages.length > 1) {
      console.log(`\nPages: ${aggregate.pages.length}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
