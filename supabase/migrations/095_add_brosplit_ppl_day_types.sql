-- 095_add_brosplit_ppl_day_types.sql
-- Extend day_type enum with muscle-group-focused day labels for Bro Split and
-- dedicated PPL splits.  PostgreSQL ADD VALUE is transactional-safe; IF NOT EXISTS
-- makes this idempotent.

ALTER TYPE day_type ADD VALUE IF NOT EXISTS 'ChestAndTriceps';
ALTER TYPE day_type ADD VALUE IF NOT EXISTS 'BackAndBiceps';
ALTER TYPE day_type ADD VALUE IF NOT EXISTS 'ShoulderDay';
ALTER TYPE day_type ADD VALUE IF NOT EXISTS 'ArmsDay';
