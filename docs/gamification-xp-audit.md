# Gamification XP Audit

## Canonical XP Event Map

Backend source of truth: `supabase/functions/award-xp/index.ts`

| Event | Status | Notes |
| --- | --- | --- |
| `workout_completed` | Wired | Awarded from `services/workoutService.ts` |
| `workout_on_time` | Supported but unwired | No product callsite found |
| `all_sets_completed` | Supported but unwired | No product callsite found |
| `pr_achieved` | Supported but unwired | No product callsite found |
| `meal_logged` | Wired | Awarded from `services/nutritionService.ts` for manual and planned meals |
| `daily_calories_met` | Supported but unwired | No product callsite found |
| `daily_macros_met` | Supported but unwired | No product callsite found |
| `water_goal_hit` | Wired | Awarded from `services/waterService.ts` |
| `weight_logged` | Supported but unwired | No product callsite found |
| `progress_photo` | Supported but unwired | No product callsite found |
| `seven_day_streak` | Type mismatch repaired | Frontend previously used `7_day_streak` |
| `thirty_day_streak` | Type mismatch repaired | Frontend previously used `30_day_streak` |
| `perfect_week` | Supported but unwired | No product callsite found |
| `app_checkin` | Type mismatch repaired | Frontend previously used `app_check_in` |
| `ai_coach_interaction` | Supported but unwired | No product callsite found |
| `plan_regeneration` | Supported but unwired | No product callsite found |

## Client Refresh Path

- XP awards route through `services/gamificationService.ts`
- Successful awards emit `GAMIFICATION_XP_AWARDED`
- `components/gamification/GlobalGamificationToasts.tsx` listens for that event and invalidates `gamificationKeys.all`

This means live XP UI refresh depends on the award going through `awardXP()`. Planned meal logging previously skipped that path entirely.

## Nutrition Logging Audit

- `logFood()` already awarded `meal_logged`
- `logPlannedMeal()` previously inserted meal items without awarding XP
- Nutrition streak checks previously queried a non-existent `meal_logs.date` column

The repair consolidates both manual and planned meal logs through one shared nutrition gamification helper and performs same-day meal counting from `logged_at`.

## Achievement Audit

Seeded definitions contain unlock condition types beyond what `supabase/functions/check-achievements/index.ts` evaluates today.

Implemented evaluator types:

- `workout_count`
- `meal_count`
- `streak_length`
- `pr_count`
- `workouts_per_week`
- `triple_threat_day`

Dormant seeded condition types not implemented in the checker:

- `perfect_week`
- `pr_exercise`
- `protein_streak`
- `macro_adherence`
- `water_streak`
- `weight_log_count`
- `workout_time`
- `comeback`

This audit is documentation-only for achievements. Runtime behavior is unchanged in this pass.
