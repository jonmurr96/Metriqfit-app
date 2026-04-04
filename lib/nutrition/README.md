# Intelligent Nutrition System

A comprehensive meal generation system that creates goal-based, timing-optimized meal plans with exact portion calculations.

## Features

- **Protein Prioritization**: User's top 3 proteins get 80% usage (20% variety)
- **Goal-Based Forms**: Whole foods for bulking, ground/minced for cutting
- **Carb Timing**: Fast carbs pre/post workout, slow carbs otherwise
- **Fat Timing**: Minimal fats around training to optimize absorption
- **Exact Portions**: Gram-accurate calculations for every macro target
- **Schedule Integration**: Auto-calculated meal times from wake/training schedule

## Quick Start

```typescript
import { useIntelligentMealPlan } from '@/hooks';
import { MealPlanDayView } from '@/components/nutrition';

function MealPlanScreen() {
  const { 
    weekPlan, 
    currentDayPlan, 
    isLoading,
    refreshPlan 
  } = useIntelligentMealPlan({
    trainingDays: ['monday', 'wednesday', 'friday'],
    autoGenerate: true,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <MealPlanDayView
      dayPlan={currentDayPlan}
      onMealPress={handleMealPress}
      onMealSwap={handleMealSwap}
      onRefresh={refreshPlan}
    />
  );
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Meal Generation Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Onboarding Data → Config → Generator → UI Components        │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐     │
│  │ Top 3       │   │ Goal Type    │   │ Generated    │     │
│  │ Proteins    │──→│ (bulk/cut)   │──→│ Meal Plan    │     │
│  │             │   │              │   │              │     │
│  │ Wake Time   │   │ Training     │   │ • Portions   │     │
│  │             │   │ Time         │   │ • Timing     │     │
│  │ Carb        │   │              │   │ • Macros     │     │
│  │ Tolerance   │   │ Daily        │   │              │     │
│  │             │   │ Targets      │   │              │     │
│  └─────────────┘   └──────────────┘   └──────────────┘     │
│                                              │              │
│                                              ▼              │
│                                     ┌──────────────────┐    │
│                                     │ MealPlanDayView  │    │
│                                     │ MealCard         │    │
│                                     │ FoodItemRow      │    │
│                                     └──────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules

### 1. Food Database (`food-database.ts`)
Comprehensive database of 50+ foods with macros and properties.

```typescript
import { 
  getFoodById, 
  calculatePortion,
  proteinFoods,
  carbFoods,
  fatFoods 
} from '@/lib/nutrition';

// Get food by ID
const chicken = getFoodById('chicken_breast');

// Calculate portion for 40g protein
const grams = calculatePortion(chicken, 'protein', 40);
// Returns: ~129g
```

### 2. Meal Timing Engine (`meal-timing-engine.ts`)
Calculates optimal meal times from schedule preferences.

```typescript
import { calculateMealTimes } from '@/lib/nutrition';

const mealTimes = calculateMealTimes({
  wakeTime: '6_7am',
  firstMealDelay: '1_2hrs',
  trainingTime: 'afternoon',
  lastMealBeforeBed: '2hrs',
});

// Returns:
// [
//   { slot: 'breakfast', time: '07:30', ... },
//   { slot: 'lunch', time: '12:00', ... },
//   { slot: 'pre_workout', time: '14:30', ... },
//   { slot: 'post_workout', time: '16:30', ... },
//   { slot: 'dinner', time: '19:00', ... }
// ]
```

### 3. Intelligent Meal Generator (`intelligent-meal-generator.ts`)
Core algorithm for generating meals.

```typescript
import { generateDayMealPlan, generateWeekMealPlan } from '@/lib/nutrition';

// Generate single day
const dayPlan = generateDayMealPlan(config, 'monday', true);

// Generate full week
const weekPlan = generateWeekMealPlan(config, ['mon', 'wed', 'fri']);
```

### 4. Portion Calculator (`portion-calculator.ts`)
Utilities for calculating exact food portions.

```typescript
import { 
  calculatePortionForMacro,
  getServingInfo,
  getPortionDescription 
} from '@/lib/nutrition';

// Calculate portion for specific macro
const result = calculatePortionForMacro(
  chicken, 
  'protein', 
  40
);
// Returns: { grams: 129, display: '129g', macros: {...} }

// Get human-readable description
const desc = getPortionDescription('chicken_breast', 150);
// Returns: "1 medium breast"
```

## Food Selection Logic

### Protein Selection (80/20 Rule)
```typescript
// 80% of meals use top 3 proteins
const useTopProtein = Math.random() < 0.8;
if (useTopProtein) {
  protein = selectFrom(user.topProteins);
} else {
  protein = selectFrom(varietyProteins);
}
```

### Form Selection Based on Goal
| Goal | Form | Examples |
|------|------|----------|
| Bulk | Whole | Chicken breast, sirloin steak, whole eggs |
| Cut | Ground | Ground chicken, 93/7 beef, egg whites |

### Carb Selection Matrix
| Goal | Timing | Selection |
|------|--------|-----------|
| Cut | Pre-workout | White rice, banana, rice cakes |
| Cut | Post-workout | White rice, potatoes |
| Cut | Evening | Vegetables, berries |
| Bulk | Anytime | Sweet potato, oats, quinoa |
| Bulk | Pre-workout | White rice, banana |

### Fat Selection Matrix
| Timing | Amount | Rationale |
|--------|--------|-----------|
| Pre-workout | <5g | Avoid slowing digestion |
| Post-workout | <8g | Rapid nutrient absorption |
| Other meals | Normal | Satiety, hormone support |

## UI Components

### MealCard
Displays a single meal with food portions and macros.

```typescript
<MealCard
  meal={meal}
  onPress={() => showDetails(meal)}
  onSwap={() => openSwapModal(meal)}
/>
```

### MealPlanDayView
Displays all meals for a day with training indicators.

```typescript
<MealPlanDayView
  dayPlan={dayPlan}
  onMealPress={handleMealPress}
  onMealSwap={handleMealSwap}
  onRefresh={handleRefresh}
  isRefreshing={isRefreshing}
/>
```

### FoodItemRow
Displays a single food with portion.

```typescript
<FoodItemRow
  food={foodPortion}
  showMacros={false} // Set true for detailed view
/>
```

## Configuration

```typescript
interface MealGenerationConfig {
  // User preferences
  topProteins: ProteinSource[];      // Top 3 ranked proteins
  goal: 'bulk' | 'cut';               // Goal type
  trainingTime: TrainingTime;         // When they train
  wakeTime: WakeTime;                 // When they wake
  firstMealDelay: FirstMealDelay;     // How long until first meal
  lastMealBeforeBed: LastMealBeforeBed;
  carbTolerance: CarbTolerance;       // How they respond to carbs
  cookingLevel: CookingLevel;         // Their cooking ability
  
  // Targets
  dailyTargets: MacroTargets;
}
```

## Example Output

### Cutting User, Afternoon Training

```
Monday (Training Day)

7:30 AM - Breakfast
  200g Egg Whites
  80g Oats
  30g Almond Butter
  → 520 cal | 46P | 45C | 18F

12:00 PM - Lunch  
  180g Ground Chicken
  200g White Rice
  5g Olive Oil
  → 485 cal | 42P | 50C | 8F

2:30 PM - Pre-Workout
  30g Whey Protein
  1 Banana
  → 280 cal | 25P | 35C | 2F

4:30 PM - Post-Workout
  200g Chicken Breast
  250g White Rice
  3g Olive Oil
  → 520 cal | 46P | 65C | 5F

7:00 PM - Dinner
  150g Tilapia
  200g Broccoli
  10g Olive Oil
  → 320 cal | 38P | 15C | 12F

Daily Totals: 2125 cal | 197P | 210C | 45F
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `generateWeeklyMealPlan()` | Generate 7-day meal plan |
| `generateDayMealPlan()` | Generate single day |
| `calculateMealTimes()` | Calculate meal schedule |
| `calculatePortion()` | Calculate grams for macro target |
| `getProteinDiversity()` | Get protein usage stats |
| `formatMealSimple()` | Format meal for display |

### Hooks

| Hook | Description |
|------|-------------|
| `useIntelligentMealPlan()` | React hook for meal plan generation |

### Components

| Component | Description |
|-----------|-------------|
| `MealCard` | Single meal display |
| `MealPlanDayView` | Full day display |
| `FoodItemRow` | Single food item |
| `MacroSummary` | Macro totals display |

## Testing

```typescript
// Verify protein diversity
const diversity = getProteinDiversity(weekPlan);
console.log(diversity.topProteinPercentage); // Should be ~80%

// Verify portions
const meal = dayPlan.meals[0];
console.log(meal.foods[0].displayPortion); // "200g"
console.log(meal.foods[0].macros.protein); // ~46g

// Verify timing
const preWorkout = dayPlan.meals.find(m => m.slot === 'pre_workout');
console.log(preWorkout.time); // "14:30" (1.5hrs before 4pm training)
```

## Future Enhancements

- [ ] Recipe integration (map foods to actual recipes)
- [ ] Shopping list generation from portions
- [ ] Adaptive adjustments based on adherence
- [ ] Seasonal food availability
- [ ] Restaurant/food delivery integration
- [ ] Meal prep batch calculations

## License

Part of MetriqFit. Internal use only.
