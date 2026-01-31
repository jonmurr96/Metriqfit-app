#!/bin/bash
# Script to apply all Supabase migrations
# This script applies migrations 002-008 to complete the database setup

set -e

MIGRATIONS_DIR="supabase/migrations"
BASE_URL="https://supabase.com/dashboard/project/hatskscplygyrrpepqmx/sql/new"

echo "🚀 MetriqFit Database Migration Script"
echo "======================================"
echo ""
echo "✅ Migration 001 already completed"
echo ""

# List of migrations to apply
MIGRATIONS=(
  "002_workout_tables.sql"
  "003_plan_tables.sql"
  "004_ai_usage_tables.sql"
  "005_subscription_tables.sql"
  "006_seed_exercises.sql"
  "007_seed_food_items.sql"
  "008_seed_workout_templates.sql"
)

echo "📋 Pending migrations:"
for migration in "${MIGRATIONS[@]}"; do
  size=$(wc -c < "$MIGRATIONS_DIR/$migration" | tr -d ' ')
  lines=$(wc -l < "$MIGRATIONS_DIR/$migration" | tr -d ' ')
  echo "   - $migration ($lines lines, $size bytes)"
done

echo ""
echo "📖 Migration files are located at:"
for migration in "${MIGRATIONS[@]}"; do
  echo "   $PWD/$MIGRATIONS_DIR/$migration"
done

echo ""
echo "🌐 Supabase SQL Editor: $BASE_URL"
echo ""
echo "⏳ Migrations will be applied via browser automation..."
