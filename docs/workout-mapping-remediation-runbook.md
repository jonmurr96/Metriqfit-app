# Workout Mapping Remediation Runbook

This runbook executes the remediation flow for:
- Template sources: `v2` and legacy `v1`
- Active user plans: versioned migration only

## Prerequisites

- Supabase migration `029_workout_mapping_remediation.sql` applied.
- Edge function `remediate-workout-mappings` deployed.
- `WORKOUT_MAPPING_ADMIN_SECRET` set in function env (recommended).
- Local env vars for target:
  - Staging: `SUPABASE_STAGING_URL`, `SUPABASE_STAGING_SERVICE_ROLE_KEY`
  - Prod: `SUPABASE_PROD_URL`, `SUPABASE_PROD_SERVICE_ROLE_KEY`

## 1) Staging Dry-Run Audits (Gate Input)

```bash
node scripts/audit-workout-mappings.mjs --target staging --mode templates-v2 --all --json
node scripts/audit-workout-mappings.mjs --target staging --mode templates-v1 --all --json
node scripts/audit-workout-mappings.mjs --target staging --mode user-plans-active --all --json
```

Review:
- `summary.hardViolationCount`
- `summary.violationCountByType.focus_mismatch`
- `summary.violationCountByType.equipment_mismatch`
- `summary.violationCountByType.duplicate_in_day`

## 2) Staging Template Remediation

Call function directly with `dryRun=false`.

```bash
curl -sS "${SUPABASE_STAGING_URL}/functions/v1/remediate-workout-mappings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_STAGING_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_STAGING_SERVICE_ROLE_KEY}" \
  -d '{
    "operation":"remediate_templates",
    "scope":"both",
    "dryRun":false,
    "batchSize":100,
    "cursor":null,
    "adminSecret":"'"${WORKOUT_MAPPING_ADMIN_SECRET}"'"
  }'
```

If response has `"completed": false`, repeat with returned `jobId` + `cursor` until completed.

## 3) Staging Active Plan Migration (Versioned)

```bash
curl -sS "${SUPABASE_STAGING_URL}/functions/v1/remediate-workout-mappings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_STAGING_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_STAGING_SERVICE_ROLE_KEY}" \
  -d '{
    "operation":"migrate_active_plans",
    "dryRun":false,
    "batchSize":50,
    "cursor":null,
    "adminSecret":"'"${WORKOUT_MAPPING_ADMIN_SECRET}"'"
  }'
```

Repeat batched calls until `"completed": true`.

## 4) Staging Post-Run Audits (Gate 1 + Gate 2)

```bash
node scripts/audit-workout-mappings.mjs --target staging --mode templates-v2 --all --json
node scripts/audit-workout-mappings.mjs --target staging --mode templates-v1 --all --json
node scripts/audit-workout-mappings.mjs --target staging --mode user-plans-active --all --json
```

Expected gates:
- Templates: `hardViolationCount = 0`
- Active plans: `failed = 0` for migration job and post-run hard violations at 0

## 5) Production Rollout

Repeat Steps 1-4 with `--target prod` and production env vars.

## 6) Audit Tables

Use these tables for traceability:
- `workout_mapping_remediation_jobs`
- `workout_mapping_remediation_audit`

Filter by `job_id` and inspect `status`, `violation_types`, `before_json`, `after_json`, `error_message`.
