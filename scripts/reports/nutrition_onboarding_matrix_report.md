# Nutrition Onboarding Matrix Audit

Generated: 2026-05-03T04:07:27.507Z
Reference date: 2026-05-02
Positive cases: 240
Auto-fill probes: 48
Validation controls: 240
Normalization checks: 2
Passed: 482
Failed: 0
Info: 48

## Summary

- Goal groups covered: lose_weight, lose_weight, maintain_weight, recomp, build_muscle, gain_weight, increase_endurance, general_fitness
- Meal choices covered: 2, 3, 4, 5_plus, no_preference
- Recommendation distribution: 2=36, 3=108, 4=108, 5_plus=36
- Warning distribution: info=180, none=48, moderate=48, strong=12

## Positive Failures

- None
## Auto-fill Probes

### cut_low_appetite__balanced_anything__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_low_appetite__vegetarian_cut__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_low_appetite__vegan_endurance__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_low_appetite__keto_low_carb__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_low_appetite__pescatarian_volume__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_low_appetite__custom_other__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_high_load__balanced_anything__unset_meals
- Resolved meals/day: 4
- Recommended meals/day: 4
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_high_load__vegetarian_cut__unset_meals
- Resolved meals/day: 4
- Recommended meals/day: 4
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_high_load__vegan_endurance__unset_meals
- Resolved meals/day: 4
- Recommended meals/day: 4
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_high_load__keto_low_carb__unset_meals
- Resolved meals/day: 4
- Recommended meals/day: 4
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_high_load__pescatarian_volume__unset_meals
- Resolved meals/day: 4
- Recommended meals/day: 4
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### cut_high_load__custom_other__unset_meals
- Resolved meals/day: 4
- Recommended meals/day: 4
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### maintain_standard__balanced_anything__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### maintain_standard__vegetarian_cut__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### maintain_standard__vegan_endurance__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### maintain_standard__keto_low_carb__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### maintain_standard__pescatarian_volume__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### maintain_standard__custom_other__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### recomp_strength__balanced_anything__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

### recomp_strength__vegetarian_cut__unset_meals
- Resolved meals/day: 3
- Recommended meals/day: 3
- Warning level: info
- Notes: raw_state_requires_auto_fill
- Screen missing: meals_per_day

## Control Cases

- Passing control cases: 240
- Control failures: 0

- No control failures
### PASS cut_low_appetite__balanced_anything__missing_proteins
- Goal: Cutting / lower appetite
- Bundle: Balanced omnivore
- Screen missing: preferred_proteins
- Service missing: Protein preferences

### PASS cut_low_appetite__balanced_anything__missing_wake_time
- Goal: Cutting / lower appetite
- Bundle: Balanced omnivore
- Screen missing: wake_time
- Service missing: Wake time

### PASS cut_low_appetite__balanced_anything__missing_last_meal
- Goal: Cutting / lower appetite
- Bundle: Balanced omnivore
- Screen missing: last_meal_before_bed
- Service missing: Last meal timing

### PASS cut_low_appetite__balanced_anything__missing_meals_per_day
- Goal: Cutting / lower appetite
- Bundle: Balanced omnivore
- Screen missing: meals_per_day
- Service missing: Meals per day

### PASS cut_low_appetite__balanced_anything__other_text_missing
- Goal: Cutting / lower appetite
- Bundle: Balanced omnivore
- Screen missing: dietary_preference_other_text, allergies_other_text
- Service missing: none

### PASS cut_low_appetite__vegetarian_cut__missing_proteins
- Goal: Cutting / lower appetite
- Bundle: Vegetarian cut
- Screen missing: preferred_proteins
- Service missing: Protein preferences

### PASS cut_low_appetite__vegetarian_cut__missing_wake_time
- Goal: Cutting / lower appetite
- Bundle: Vegetarian cut
- Screen missing: wake_time
- Service missing: Wake time

### PASS cut_low_appetite__vegetarian_cut__missing_last_meal
- Goal: Cutting / lower appetite
- Bundle: Vegetarian cut
- Screen missing: last_meal_before_bed
- Service missing: Last meal timing

### PASS cut_low_appetite__vegetarian_cut__missing_meals_per_day
- Goal: Cutting / lower appetite
- Bundle: Vegetarian cut
- Screen missing: meals_per_day
- Service missing: Meals per day

### PASS cut_low_appetite__vegetarian_cut__other_text_missing
- Goal: Cutting / lower appetite
- Bundle: Vegetarian cut
- Screen missing: dietary_preference_other_text, allergies_other_text
- Service missing: none

### PASS cut_low_appetite__vegan_endurance__missing_proteins
- Goal: Cutting / lower appetite
- Bundle: Vegan endurance
- Screen missing: preferred_proteins
- Service missing: Protein preferences

### PASS cut_low_appetite__vegan_endurance__missing_wake_time
- Goal: Cutting / lower appetite
- Bundle: Vegan endurance
- Screen missing: wake_time
- Service missing: Wake time

## Normalization Checks

### explicit_training_days
- Status: pass
- Issues: none
- Normalized: {"training_days":["mon","tue","wed"],"training_days_per_week":3,"preferred_days_off":["thu","fri","sat","sun"],"allergies_exclusions":["none"],"refused_foods":["seafood","peanuts","nuts"],"technique_preferences":[]}

### legacy_days_off
- Status: pass
- Issues: none
- Normalized: {"training_days":[],"training_days_per_week":4,"preferred_days_off":["mon","tue"],"allergies_exclusions":["gluten","dairy"],"refused_foods":[],"technique_preferences":[]}


## Files

- JSON: scripts/reports/nutrition_onboarding_matrix_report.json
- Markdown: scripts/reports/nutrition_onboarding_matrix_report.md
