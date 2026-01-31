# MetriqFit Elite - AI Agent Instructions

> **Version:** 1.0.0 | **Last Updated:** 2025-01-21

## Project Overview

MetriqFit is an AI-powered fitness and nutrition tracking application that:
- Onboards users and computes deterministic targets (calories, macros, water)
- Generates personalized workout and nutrition plans via server-side AI (OpenAI GPT-4)
- Provides 5-tab daily tracking + progress analytics + AI Coach
- Deploys to web (Firebase Hosting) and mobile (iOS/Android via EAS) from a single codebase

---

## Tech Stack (Locked)

| Layer | Technology |
|-------|------------|
| App Framework | Expo + React Native |
| Navigation | Expo Router (file-based) |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI Provider | OpenAI GPT-4 |
| State Management | React Context + React Query |
| Web Hosting | Firebase Hosting |
| Mobile Builds | EAS Build (iOS/Android) |
| Subscriptions | RevenueCat |
| Error Tracking | Sentry |

---

## Folder Structure

```
metriqfit/
├── CLAUDE.md                    # This file - AI agent instructions
├── app/                         # Expo Router screens
│   ├── (auth)/                  # Auth screens (sign-in, sign-up)
│   ├── (onboarding)/            # 5-step onboarding flow
│   ├── (tabs)/                  # Main 5-tab navigation
│   │   ├── home/                # Dashboard
│   │   ├── workout/             # Training programs
│   │   ├── nutrition/           # Food logging
│   │   ├── progress/            # Analytics/trends
│   │   └── ai-coach/            # AI Chat
│   └── _layout.tsx              # Root layout
├── components/                  # UI components
│   ├── ai-coach/                # Chat components
│   ├── dashboard/               # Home screen components
│   ├── navigation/              # Nav components
│   ├── nutrition/               # Nutrition components
│   ├── onboarding/              # Onboarding forms
│   ├── premium/                 # Glass cards, animations
│   ├── progress/                # Charts, trends
│   ├── sheets/                  # Bottom sheets
│   └── workout/                 # Workout components
├── lib/                         # Core libraries
│   ├── auth/                    # AuthProvider
│   ├── supabase/                # Supabase client + types
│   ├── targets/                 # Target calculation
│   ├── theme/                   # Theme system
│   └── onboarding/              # Onboarding context
├── services/                    # Domain services
│   ├── nutritionService.ts
│   ├── workoutService.ts
│   ├── waterService.ts
│   ├── aiCoachService.ts
│   ├── planService.ts
│   └── subscriptionService.ts
├── hooks/                       # Custom React hooks
├── utils/                       # Pure utility functions
├── constants/                   # App constants, routes
├── supabase/
│   ├── migrations/              # SQL migrations
│   ├── functions/               # Edge Functions
│   └── seed/                    # Seed data
└── __tests__/                   # Test files
```

---

## Source of Truth Files

**These are contracts. Do not modify structure without updating the contract.**

| Artifact | Path |
|----------|------|
| PRD | `/PRD/metriqfit_PRD_v1_8_1.md` |
| Workout Programs | `/Metriqfit 3/metriqfit-replit/docs/Source-of-truth artifacts (contracts)/app_ready_programs_175_v3_constraints.json` |
| Nutrition Engine | `/Metriqfit 3/metriqfit-replit/docs/Source-of-truth artifacts (contracts)/nutrition_engine_v3_1_integration_ready.json` |
| 5-Tab Blueprint | `/Metriqfit 3/metriqfit-replit/docs/Source-of-truth artifacts (contracts)/metriqfit_5tab_blueprint_v2_all_in_one.json` |
| Onboarding Spec | `/Metriqfit 3/metriqfit-replit/docs/Source-of-truth artifacts (contracts)/metriqfit_onboarding_targets_spec_v1.json` |
| Theme Tokens | `/Metriqfit 3/metriqfit-replit/lib/theme/metriqfit_theme_v1.ts` |

---

## Theme System Rules

**CRITICAL: Never hardcode colors. Always use theme tokens.**

```typescript
// CORRECT
import { metriqfitTheme as t } from '@/lib/theme/metriqfit_theme_v1';
<View style={{ backgroundColor: t.colors.surface }}>

// WRONG - Never do this
<View style={{ backgroundColor: '#0B1428' }}>
```

Key tokens:
- `t.colors.bg` - Background (#03060D)
- `t.colors.surface` - Card surface (#0B1428)
- `t.colors.primary` - Neon aqua (#88E6EA)
- `t.colors.text` - Primary text (#EAF2FF)
- `t.colors.macros.protein/carbs/fat` - Macro colors
- `t.spacing.xs/sm/md/lg/xl` - Spacing scale
- `t.radius.sm/md/lg/xl` - Border radius
- `t.type.heading/body/mono` - Typography

---

## Navigation Contract

### 5 Bottom Tabs (Fixed Order)
1. **Home** - Dashboard with macro targets, water, next actions
2. **Workout** - Program browser, session logging, history
3. **Nutrition** - Food logging, meal tracking, daily totals
4. **Progress** - Weight trends, adherence charts, PRs
5. **AI Coach** - Chat interface with GPT-4

### Quick Add FAB (+) Actions
| # | Action | Route | Description |
|---|--------|-------|-------------|
| 1 | Scan Meal Photo | `FoodCamera` | AI food recognition (Elite) |
| 2 | Scan Barcode | `BarcodeScanner` | Barcode lookup (Elite) |
| 3 | Quick Add Food | `FoodSearch` | Search food database |
| 4 | Start Workout | `ActiveSession` | Start/resume workout |
| 5 | Log Weight | `LogWeightSheet` | Weight entry modal |
| 6 | Log Water | `LogWaterSheet` | Water entry modal |
| 7 | Log Steps | `LogStepsSheet` | Step entry modal |

**Rule:** No dead buttons. All CTAs must route somewhere.

---

## Database Schema

### Core Tables
```
profiles              - User profile (name, DOB, sex, height, weight, unit_system)
onboarding_answers    - Complete onboarding JSON
user_targets          - Computed macros (calories, protein, carbs, fat, water)
water_logs            - Water intake entries
user_measurements     - Weight history
food_items            - Nutrition database (per 100g)
meal_logs             - Meal entries by slot
meal_log_items        - Food items in meals
```

### Workout Tables
```
exercises             - Exercise reference (175 exercises)
workout_templates     - Program templates
workout_template_days - Days within programs
workout_sessions      - User logged workouts
session_exercises     - Exercises in sessions
workout_sets          - Individual sets (reps, weight, RPE)
user_prs              - Personal records
```

### Plan Tables
```
user_workout_plans         - AI-generated workout plans (versioned)
user_workout_plan_days     - Days in plans
user_workout_plan_exercises - Exercises in plan days
user_nutrition_plans       - AI-generated nutrition plans (versioned)
plan_generation_runs       - Audit log
```

### AI & Subscription Tables
```
ai_usage_daily        - Rate limit tracking
ai_coach_messages     - Conversation history
subscriptions         - RevenueCat mirror
```

### RLS Rules
- All user-owned tables have RLS enabled
- Policy: `auth.uid() = user_id`
- Templates/exercises are publicly readable

---

## AI Coach Rules

### What AI Coach CAN Do
- Answer questions about today's targets and adherence
- Suggest meal swaps aligned to targets/allergies
- Suggest exercise substitutions (respecting injuries/equipment)
- Explain training/nutrition concepts
- Plan 24-72 hour micro-plans
- Modify user settings when explicitly asked

### What AI Coach CANNOT Do
- Medical diagnosis, treatment, or medication advice
- Eating disorder coaching or extreme restriction
- Unsafe supplement/steroid protocols
- "Guaranteed" outcome claims

### Grounding Rules (Anti-Hallucination)
Coach must ONLY reference:
- `user_targets` (exact values)
- Today's logs (food, water, weight, workout)
- Last 30 days history

If data is missing, coach must:
1. Say "I don't see X logged"
2. Ask user to log it
3. OR offer assumption labeled as assumption

### Rate Limits
| Tier | Messages/Day | Plan Regens/Hour | Food Scans/Day |
|------|-------------|------------------|----------------|
| Free | 10 | 1 | 3 |
| Elite | Unlimited | 3 | Unlimited |

---

## Edge Functions

### `generate-user-plans`
**Trigger:** After onboarding completion
**Input:** user_id
**Process:**
1. Fetch onboarding_answers, user_targets
2. Fetch exercises matching user's equipment/injuries
3. Call OpenAI GPT-4 with structured prompt
4. Validate all exercise IDs exist in database
5. Create user_workout_plans and user_nutrition_plans
**Output:** plan_ids

### `ai-coach-message`
**Trigger:** User sends chat message
**Input:** user_id, message
**Process:**
1. Check rate limits
2. Fetch grounding data (targets, today's logs, 30-day history)
3. Build system prompt with guardrails
4. Call OpenAI GPT-4
5. Store in ai_coach_messages
**Output:** response, action_buttons

### `delete-account`
**Trigger:** User requests deletion
**Process:** Cascade delete all user data, revoke entitlements

---

## Macro Math

**Formula:** `(per_100g_value * grams) / 100`

```typescript
function calculateMacros(foodItem: FoodItem, grams: number) {
  return {
    calories: Math.round((foodItem.calories_per_100g * grams) / 100),
    protein: Math.round((foodItem.protein_per_100g * grams) / 100 * 10) / 10,
    carbs: Math.round((foodItem.carbs_per_100g * grams) / 100 * 10) / 10,
    fat: Math.round((foodItem.fat_per_100g * grams) / 100 * 10) / 10,
  };
}
```

---

## Unit Conversions

**Storage:** Always use canonical units (ml, kg, cm)
**Display:** Convert client-side based on user's unit_system

| Conversion | Formula |
|------------|---------|
| oz → ml | × 29.5735 (round to 1ml) |
| ml → oz | ÷ 29.5735 (1 decimal) |
| lbs → kg | × 0.453592 (1 decimal) |
| kg → lbs | ÷ 0.453592 (1 decimal) |
| in → cm | × 2.54 (1 decimal) |
| cm → in | ÷ 2.54 (1 decimal) |

---

## Acceptance Tests

| ID | Test | Pass Criteria |
|----|------|---------------|
| AT-01 | Onboarding completes | `profiles`, `onboarding_answers`, `user_targets` rows created |
| AT-02 | Home dashboard loads | Shows real macro targets, water, actions |
| AT-03 | Workout logging | Start → sets → finish → history + PR detection |
| AT-04 | Nutrition logging | Search → add grams → daily totals update |
| AT-05 | Water logging | Quick Add → save → display updates |
| AT-06 | Quick Add wired | All 7 actions navigate correctly |
| AT-07 | Progress charts | Weight trend, volume/frequency render |
| AT-08 | AI Coach responds | < 5s, references targets |
| AT-09 | Plan versioning | Regen creates new version, old in history |
| AT-10 | AI grounding | Missing data handled correctly |
| AT-11 | Env parity | Staging/prod match, no env leakage |
| AT-12 | Account deletion | Cascade delete + redirect to auth |

---

## Build Commands

```bash
# Development
npm start                    # Start Expo dev server
npm run ios                  # Start iOS simulator
npm run android              # Start Android emulator
npm run web                  # Start web dev server

# Type checking & Linting
npm run typecheck            # TypeScript check
npm run lint                 # ESLint

# Building
npm run build                # Build web (outputs to dist/)

# Supabase
supabase start               # Start local Supabase
supabase db reset            # Reset + run migrations
supabase functions serve     # Local Edge Functions

# EAS
eas build --profile staging --platform ios
eas build --profile production --platform all
eas submit --profile production --platform ios
```

---

## Environment Variables

**Client (safe, use EXPO_PUBLIC_ prefix):**
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_ENV=local|staging|prod
```

**Server-only (Edge Functions, never in client):**
```
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
REVENUECAT_API_KEY=
SENTRY_DSN=
```

---

## Anti-Patterns (Do NOT)

1. **Never hardcode colors** - Use theme tokens
2. **Never hallucinate exercise/food IDs** - Validate against database
3. **Never skip RLS** - All user data must be protected
4. **Never store secrets in client** - Use Edge Functions
5. **Never create dead buttons** - All CTAs must route
6. **Never skip validation** - Validate all AI responses
7. **Never overwrite plans** - Create new versions
8. **Never give medical advice** - AI Coach guardrails

---

## Common Patterns

### Supabase Query
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId)
  .single();

if (error) throw error;
return data;
```

### Service Function
```typescript
export async function getActiveWorkoutPlan(userId: string) {
  const { data, error } = await supabase
    .from('user_workout_plans')
    .select(`
      *,
      days:user_workout_plan_days(
        *,
        exercises:user_workout_plan_exercises(*)
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return data;
}
```

### React Query Hook
```typescript
export function useActiveWorkoutPlan() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['workout-plan', 'active', user?.id],
    queryFn: () => getActiveWorkoutPlan(user!.id),
    enabled: !!user,
  });
}
```

---

## Definition of Done

A task is complete when:
- [ ] Code compiles (typecheck passes)
- [ ] Lint passes (zero errors)
- [ ] Unit tests pass (if applicable)
- [ ] UI matches theme system
- [ ] RLS policies protect data
- [ ] No hardcoded colors/values
- [ ] No dead buttons
- [ ] Tested on iOS + Android + Web
