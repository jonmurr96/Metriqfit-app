import * as fs from 'fs';
import * as path from 'path';
import { v1_exercises, v1_plan_families, v1_templates } from './v1_seed_data';

// Helper to escape single quotes in SQL strings
const esc = (str: string) => str.replace(/'/g, "''");

const OUTPUT_PATH = path.join(__dirname, '../../supabase/migrations/081_seed_v1_workout_engine.sql');

let sql = `-- Migration 081: Seed V1 Workout Engine Data\n`;
sql += `-- Auto-generated from strictly typed TypeScript seeds to enforce exact schema matching.\n\n`;

// 1. Insert Exercises
sql += `-- 1. EXERCISES\n`;
sql += `INSERT INTO v1_exercises (external_id, name, movement_pattern, architectural_group, equipment_category, is_unilateral, setup_complexity, fatigue_cost, tier, progression_types, estimated_duration_seconds) VALUES\n`;

const exValues = v1_exercises.map(ex => {
  const progressions = `'{${ex.progression_types.join(',')}}'`;
  return `('${ex.external_id}', '${esc(ex.name)}', '${ex.movement_pattern}', '${ex.architectural_group}', '${ex.equipment_category}', ${ex.is_unilateral}, '${ex.setup_complexity}', '${ex.fatigue_cost}', '${ex.tier}', ${progressions}, ${ex.estimated_duration_seconds})`;
});
sql += exValues.join(',\n') + `\nON CONFLICT (external_id) DO NOTHING;\n\n`;

// 2. Insert Plan Families
sql += `-- 2. PLAN FAMILIES\n`;
sql += `INSERT INTO v1_plan_families (external_id, name, goal_bucket, training_style, days_per_week, lift_comfort, environment, progression_model) VALUES\n`;

const famValues = v1_plan_families.map(fam => {
  return `('${fam.external_id}', '${esc(fam.name)}', '${fam.goal_bucket}', '${fam.training_style}', ${fam.days_per_week}, '${fam.lift_comfort}', '${fam.environment}', '${fam.progression_model}')`;
});
sql += famValues.join(',\n') + `\nON CONFLICT (external_id) DO NOTHING;\n\n`;

// 3. Insert Templates, Days, and Slots via nested CTE inserts
sql += `-- 3. TEMPLATES, DAYS, AND SLOTS\n`;
sql += `DO $$\nDECLARE\n`;
sql += `  _family_id UUID;\n  _template_id UUID;\n  _day_id UUID;\n`;
sql += `BEGIN\n\n`;

for (const tpl of v1_templates) {
  // Get Family ID
  sql += `  SELECT id INTO _family_id FROM v1_plan_families WHERE external_id = '${tpl.family_ref}';\n`;
  sql += `  IF _family_id IS NULL THEN\n    RAISE EXCEPTION 'Family ${tpl.family_ref} not found';\n  END IF;\n\n`;

  // Insert Template
  sql += `  INSERT INTO v1_templates (family_id, external_id, name, block_number, difficulty_score)\n`;
  sql += `  VALUES (_family_id, '${tpl.external_id}', '${esc(tpl.name)}', ${tpl.block_number}, ${tpl.difficulty_score})\n`;
  sql += `  ON CONFLICT (external_id) DO UPDATE SET name = EXCLUDED.name\n`;
  sql += `  RETURNING id INTO _template_id;\n\n`;

  // Insert Days and Slots
  for (const day of tpl.days) {
    sql += `  INSERT INTO v1_workout_days (template_id, day_number, day_type)\n`;
    sql += `  VALUES (_template_id, ${day.day_number}, '${day.day_type}')\n`;
    sql += `  RETURNING id INTO _day_id;\n\n`;

    if (day.slots.length > 0) {
      sql += `  INSERT INTO v1_template_slots (workout_day_id, order_index, architectural_group, is_required, archetype, progression_model, sets, reps_min, reps_max, target_rpe, rest_seconds)\n  VALUES\n`;
      const slotValues = day.slots.map(slot => {
        return `  (_day_id, ${slot.order_index}, '${slot.architectural_group}', ${slot.is_required}, '${slot.archetype}', '${slot.progression_model}', ${slot.sets}, ${slot.reps_min}, ${slot.reps_max}, ${slot.target_rpe}, ${slot.rest_seconds})`;
      });
      sql += slotValues.join(',\n') + `;\n\n`;
    }
  }
}

sql += `END\n$$;\n`;

fs.writeFileSync(OUTPUT_PATH, sql, 'utf8');
console.log('Successfully generated SQL seed: ' + OUTPUT_PATH);
