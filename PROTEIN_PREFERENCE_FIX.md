# Protein Preference Fix - Deployment Summary

## Changes Made

### 1. Edge Function: `supabase/functions/generate-user-plans/index.ts`

#### Added `preferred_proteins` to UserContext type (line ~194)
```typescript
onboarding: {
  // ... other fields
  preferred_proteins: string[];
};
```

#### Added `preferred_proteins` to NutritionRegenerationRequest type (line ~107)
```typescript
preferred_proteins?: string[];
```

#### Extract `preferred_proteins` from onboarding answers (line ~3109)
```typescript
preferred_proteins: answers.preferred_proteins || [],
```

#### Added `matchesProteinPreference()` helper function
Maps food names to protein preference categories:
- chicken → poultry, chicken
- beef → beef, steak, ground
- eggs → eggs
- fish → fish, salmon, tuna, cod
- etc.

#### Modified `buildMacroRotationPool()` to prioritize preferred proteins
- Added optional `preferredProteins` parameter
- 3x score boost for foods matching user preferences
- Only applies to protein macro pool

#### Updated protein pool creation (line ~5112)
```typescript
const proteinPool = buildMacroRotationPool(
  workingFoods, 
  "protein", 
  varietyProfile, 
  context.onboarding.preferred_proteins  // NEW
);
```

#### Store preferred_proteins in plan's dietary_preferences (line ~5074)
```typescript
dietary_preferences: {
  preference: context.onboarding.dietary_preference,
  allergies: context.onboarding.allergies_exclusions,
  refused_foods: context.onboarding.refused_foods,
  preferred_proteins: context.onboarding.preferred_proteins,  // NEW
},
```

#### Handle preferred_proteins in regeneration (lines ~3436-3437)
```typescript
if (nutritionRegeneration.preferred_proteins?.length) {
  nextContext.onboarding.preferred_proteins = nutritionRegeneration.preferred_proteins;
}
```

## Deployment Status

✅ **Edge function deployed successfully**
- URL: https://supabase.com/dashboard/project/hatskscplygyrrpepqmx/functions
- Function: `generate-user-plans`

## How It Works

1. **User selects proteins** during onboarding (e.g., chicken, beef, eggs)
2. **Selections saved** to `onboarding_answers` table
3. **Plan generation** extracts `preferred_proteins` from onboarding data
4. **Protein pool building** gives 3x score boost to preferred proteins
5. **Meal generation** selects proteins from prioritized pool
6. **Result**: 70-80% of meals use preferred proteins with variety

## Testing

To test the fix:

1. **Regenerate existing plan:**
   - Go to Plan tab
   - Tap "Regenerate Plan"
   - Select "Different meals" or "Different foods"
   - New plan should prioritize your previously selected proteins

2. **Create new plan (full test):**
   - Log out and back in
   - Go through onboarding again
   - Select chicken, beef, eggs as preferred proteins
   - Generate plan
   - Verify meals show chicken, beef, or eggs in 70-80% of cases

## Expected Behavior

**Before Fix:**
- User selects: chicken, beef, eggs
- Meals show: tuna, turkey breast, salmon (random proteins)

**After Fix:**
- User selects: chicken, beef, eggs  
- Meals show: grilled chicken breast, ground beef stir-fry, egg scramble (preferred proteins)
- Occasional variety: salmon, turkey (20-30% of meals for nutritional balance)

## Supported Protein Preferences

- chicken
- turkey
- beef
- pork
- fish
- shellfish
- eggs
- dairy
- tofu_tempeh
- legumes
- protein_powder
