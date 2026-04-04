# Intelligent Nutrition System - Implementation Summary

## Overview
Implemented a comprehensive intelligent meal generation system that creates goal-based, timing-optimized meal plans with exact portion calculations.

## Files Created/Modified

### 1. Food Database (`lib/nutrition/food-database.ts`)
**Size:** 23,772 bytes  
**Purpose:** Comprehensive database of foods with macros, forms, and timing properties

**Features:**
- 50+ food items with complete macro profiles
- Protein foods (chicken, beef, eggs, fish, dairy, plant-based, supplements)
- Carb sources (fast-acting: white rice, banana; slow-acting: oats, sweet potato)
- Fat sources (nuts, oils, avocado, dairy fats)
- Each food tagged with:
  - Digestion speed (fast/medium/slow)
  - Goal preference (bulk/cut/both)
  - Timing appropriateness (pre-workout/post-workout/anytime)
  - Available forms (whole/ground/lean/minced/liquid)
  - Goal-specific default forms

**Key Functions:**
- `getFoodById()` - Retrieve specific food
- `getFoodsForTiming()` - Filter by meal timing
- `getFoodsForGoal()` - Filter by goal type
- `calculatePortion()` - Calculate grams for macro target
- `calculateMacrosForPortion()` - Calculate macros for given grams

### 2. Meal Timing Engine (`lib/nutrition/meal-timing-engine.ts`)
**Size:** 9,601 bytes  
**Purpose:** Calculate optimal meal times from schedule preferences

**Features:**
- Converts wake time enum to actual hours
- Calculates first meal based on delay preference
- Handles 4 training time scenarios:
  - Early morning (6 AM)
  - Morning (10 AM)
  - Afternoon (1-4 PM)
  - Evening (7 PM+)
- Automatically places pre-workout meal 1.5hrs before training
- Places post-workout meal 30min after training
- Respects last meal before bed constraint

**Key Functions:**
- `calculateMealTimes()` - Main function to generate schedule
- `getMealSlotDescription()` - Human-readable descriptions
- `isTrainingMeal()` - Check if slot is pre/post workout
- `sortMealsByTime()` - Chronological ordering

### 3. Intelligent Meal Generator (`lib/nutrition/intelligent-meal-generator.ts`)
**Size:** 19,211 bytes  
**Purpose:** Core algorithm for generating meals with goal-based selections

**Features:**

#### Protein Selection (80/20 Rule)
- 80% of meals use user's top 3 proteins
- 20% variety from other sources
- Form selection based on goal:
  - Bulk: Whole foods (chicken breast, steak, whole eggs)
  - Cut: Ground/minced (ground chicken, 93/7 beef, egg whites)

#### Carb Selection Matrix
| Goal | Timing | Selection |
|------|--------|-----------|
| Cut | Pre-workout | White rice, banana, rice cakes (fast) |
| Cut | Post-workout | White rice, potatoes (glycogen) |
| Cut | Evening | Vegetables, berries (low calorie) |
| Bulk | Anytime | Sweet potato, oats, quinoa, brown rice |
| Bulk | Pre-workout | White rice, banana (quick energy) |

#### Fat Selection Matrix
| Timing | Selection |
|--------|-----------|
| Pre-workout | Minimal (<5g, just cooking oil) |
| Post-workout | Minimal (<8g, avoid slowing absorption) |
| Other meals | Full healthy fats (nuts, avocado, olive oil) |

#### Macro Distribution
- **Training Days:**
  - Pre-workout: 20% protein, 25% carbs, minimal fat
  - Post-workout: 35% protein, 40% carbs, minimal fat
  - Other meals: Remaining macros distributed evenly
- **Rest Days:**
  - Even distribution with slightly more fat at dinner

**Key Functions:**
- `generateDayMealPlan()` - Generate one day
- `generateWeekMealPlan()` - Generate full week
- `getProteinDiversity()` - Stats on protein variety
- `formatMealForDisplay()` - Human-readable format

### 4. Portion Calculator (`lib/nutrition/portion-calculator.ts`)
**Size:** 8,505 bytes  
**Purpose:** Calculate exact food portions to hit macro targets

**Features:**
- Calculate grams needed for specific macro target
- Rounding to practical amounts (1g for small, 5g for medium, 10g for large)
- Mixed portion calculations (combining multiple foods)
- Practical serving size suggestions
- Common portion reference database

**Key Functions:**
- `calculatePortionForMacro()` - Main calculation
- `calculateMixedPortions()` - Multiple foods
- `getServingInfo()` - Standard serving macros
- `getPortionDescription()` - Human-readable (e.g., "1 medium breast")

### 5. Meal Generation Service (`lib/nutrition/meal-generation-service.ts`)
**Size:** 15,721 bytes  
**Purpose:** Integration layer connecting onboarding to meal generation

**Features:**
- Converts OnboardingData to generation config
- Handles goal type mapping (build_muscle → bulk, lose_fat → cut)
- Generates weekly meal plans
- Provides meal timing previews for onboarding UI
- Validates required nutrition fields
- Legacy compatibility for existing recipe system

**Key Functions:**
- `generateWeeklyMealPlan()` - Main entry point
- `generateSingleDayMeals()` - Single day generation
- `getMealTimingPreview()` - UI preview
- `validateNutritionOnboarding()` - Check completeness
- `formatMealSimple()` - "200g Chicken, 150g Rice" format

### 6. Module Exports (`lib/nutrition/index.ts`)
**Size:** 2,011 bytes  
**Purpose:** Clean public API for the nutrition module

Exports organized by:
- Food database
- Meal timing
- Meal generation
- Portion calculation
- Service layer
- Legacy compatibility

### 7. Demo (`lib/nutrition/demo.ts`)
**Size:** 7,070 bytes  
**Purpose:** Working examples of the system

Shows 3 scenarios:
1. **Cutting user** - Chicken/fish/eggs, afternoon training, 4 meals
2. **Bulking user** - Beef/chicken/eggs, evening training, 5 meals
3. **Early morning trainer** - Chicken/yogurt/fish, 5:30 AM workout

## Integration Points

### From Onboarding
```typescript
const plan = generateWeeklyMealPlan(onboardingData, undefined, trainingDays);
```

### To UI Display
```typescript
// Simple format
"200g Chicken Breast, 150g White Rice, 5g Olive Oil"

// With macros
"Post-Workout (4:30 PM): 200g Chicken Breast, 250g White Rice"
"→ 520 cal | 46g protein | 65g carbs | 5g fat"
```

### Storage Format
Each meal contains:
- `slot`: breakfast/lunch/dinner/pre_workout/post_workout/evening_snack
- `time`: "16:30"
- `foods`: Array of { food, grams, displayPortion, macros, form }
- `targetMacros`: What we aimed for
- `actualMacros`: What the foods provide

## Key Behaviors

### Protein Prioritization
- User selects top 3 proteins during onboarding
- System uses these 80% of the time
- 20% variety from other sources
- Prevents monotony while maintaining consistency

### Goal-Based Forms
**Bulking:**
- Chicken breast (whole)
- Sirloin steak
- Whole eggs
- Large portions

**Cutting:**
- Ground chicken (easier to eat, less chewing)
- 93/7 ground beef (controlled fat)
- Egg whites (pure protein)
- Smaller, frequent meals

### Training Nutrition
**Pre-Workout (1.5hrs before):**
- Fast-digesting protein (egg whites, fish, whey)
- Fast carbs (white rice, banana)
- Minimal fat

**Post-Workout (within 30min):**
- Lean protein (chicken breast, white fish)
- Fast carbs for glycogen (white rice, potatoes)
- Minimal fat for rapid absorption

### Carb Tolerance Integration
- `energized_satiated`: Standard macro split
- `hungry_quickly`: More frequent meals, more carbs
- `tired_sleepy`: Fewer carbs, more fats
- `bloated`: Lower fiber carbs, smaller portions

## Usage Example

```typescript
import { generateWeeklyMealPlan, formatMealSimple } from '@/lib/nutrition';

// Generate plan
const plan = generateWeeklyMealPlan(onboardingData);

// Display meals
for (const day of plan.weekPlan) {
  console.log(`\n${day.day.toUpperCase()}`);
  for (const meal of day.meals) {
    console.log(`${meal.time} - ${formatMealSimple(meal)}`);
  }
}

// Check protein diversity
console.log(`Top 3 proteins used ${plan.summary.proteinDiversity.topProteinPercentage}% of time`);
```

## Next Steps for Full Integration

1. **UI Components**
   - Create `MealCard` component showing food + portions
   - Add swap functionality for manual food changes
   - Display meal times with training indicators

2. **Database Storage**
   - Store generated plans with exact portions
   - Track user food swaps
   - Log adherence data

3. **Recipe Integration**
   - Map generated foods to actual recipes
   - Scale recipes to hit exact portions
   - Generate shopping lists from portions

4. **Adaptive Adjustments**
   - If user consistently skips foods, adjust preferences
   - If weight stalls, recalculate portions
   - Seasonal food availability

## Testing Checklist

- [ ] 80/20 protein distribution verified
- [ ] Goal-appropriate forms selected
- [ ] Fast carbs around training
- [ ] Minimal fats pre/post workout
- [ ] Portion calculations accurate
- [ ] Meal times align with schedule
- [ ] Macro totals match targets within 5%
- [ ] Protein diversity stats correct
