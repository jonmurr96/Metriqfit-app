-- Migration 086: Add FullBodyHypertrophy to day_type enum
-- ─────────────────────────────────────────────────────────────────────────────
-- Context: FullBodyHypertrophy existed in the TypeScript DayType enum (types/v1_engine.ts)
-- but was absent from the Postgres day_type enum created in migration 080.
-- This was discovered when writing the 2-day aesthetics seed (migration 087).
--
-- Why this is a standalone migration:
-- Postgres does not allow ALTER TYPE ... ADD VALUE to be used in the same
-- transaction as any INSERT that references that new value.
-- The enum value must be committed first, then it can be used in DML.
-- See: https://www.postgresql.org/docs/current/sql-altertype.html
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TYPE day_type ADD VALUE IF NOT EXISTS 'FullBodyHypertrophy';
