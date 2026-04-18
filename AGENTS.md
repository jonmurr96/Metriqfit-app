# MetriqFit Elite - AI Agent Documentation

> **Version:** 1.0.0 | **Last Updated:** 2026-04-11

## Project Overview

MetriqFit Elite is an AI-powered fitness and nutrition tracking mobile application. The app provides personalized workout plans, nutrition tracking, AI coaching, and progress analytics through a premium dark-themed interface.

### Core Features
- **User Onboarding**: Multi-step onboarding flow that collects user data and computes personalized targets (calories, macros, water)
- **AI-Generated Plans**: Workout and nutrition plans generated via server-side AI (OpenAI GPT-4)
- **5-Tab Navigation**: Home, Workout, Nutrition, Progress, and AI Coach
- **Real-time Tracking**: Daily macro tracking, water logging, weight measurements, and step counting
- **Gamification**: Level progression, achievements, streaks, and premium features
- **Multi-Platform**: iOS, Android, and Web from a single codebase

---

## Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Expo SDK | ~54.0.0 |
| UI Framework | React Native | 0.81.5 |
| React | React | 19.1.0 |
| Navigation | Expo Router | ~6.0.22 (file-based) |
| Backend | Supabase | PostgreSQL + Auth + Edge Functions |
| State Management | TanStack React Query | ^5.62.16 |
| Animations | React Native Reanimated | ~4.1.1 |
| Gestures | React Native Gesture Handler | ~2.28.0 |
| Bottom Sheets | @gorhom/bottom-sheet | ^5.0.6 |
| Subscriptions | RevenueCat | ^9.14.0 |
| AI Provider | OpenAI GPT-4 | Via Edge Functions |
| Database ORM | WatermelonDB | ^0.28.0 |
| Icons | @expo/vector-icons | ^15.0.3 |

---

## Project Structure

```
/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (auth)/                   # Authentication group
│   │   ├── _layout.tsx           # Auth layout
│   │   ├── sign-in.tsx           # Sign in screen
│   │   ├── sign-up.tsx           # Sign up screen
│   │   └── forgot-password.tsx   # Password reset
│   ├── (onboarding)/             # Onboarding flow group
│   │   ├── _layout.tsx
│   │   ├── identity.tsx          # Name/email
│   │   ├── about-you.tsx         # Basic info
│   │   ├── goals.tsx             # Fitness goals
│   │   ├── training.tsx          # Training preferences
│   │   ├── nutrition.tsx         # Diet preferences
│   │   ├── height.tsx            # Height input
│   │   ├── weight.tsx            # Weight input
│   │   ├── paywall.tsx           # Subscription screen
│   │   └── plan-generation.tsx   # AI plan generation
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tab navigation layout
│   │   ├── home/                 # Dashboard tab
│   │   ├── workout/              # Training tab
│   │   ├── nutrition/            # Food logging tab
│   │   ├── progress/             # Analytics tab
│   │   └── ai-coach/             # AI chat tab
│   ├── settings/                 # Settings screens
│   ├── check-in/                 # Daily check-in
│   ├── _layout.tsx               # Root layout
│   ├── index.tsx                 # Entry redirect
│   ├── achievements.tsx          # Achievements screen
│   ├── level-progress.tsx        # Level/XP screen
│   ├── streaks.tsx               # Streak tracking
│   ├── today-plan.tsx            # Today's plan view
│   ├── log-weight-sheet.tsx      # Weight entry modal
│   ├── log-water-sheet.tsx       # Water entry modal
│   └── log-steps-sheet.tsx       # Steps entry modal
├── components/                   # React components
│   ├── ai-coach/                 # AI chat components
│   ├── ai/                       # AI-related UI
│   ├── auth/                     # Authentication components
│   ├── common/                   # Shared UI components
│   ├── dashboard/                # Home screen components
│   ├── gamification/             # Level/achievement UI
│   ├── home/                     # Home-specific components
│   ├── navigation/               # Navigation components
│   ├── nutrition/                # Food/nutrition UI
│   ├── onboarding/               # Onboarding form components
│   ├── premium/                  # Premium/glass components
│   ├── progress/                 # Charts and analytics
│   ├── programs/                 # Workout program UI
│   ├── sheets/                   # Bottom sheet components
│   └── workout/                  # Workout logging UI
├── lib/                          # Core libraries
│   ├── auth/                     # Authentication logic
│   │   ├── AuthProvider.tsx      # Auth context
│   │   └── checkOnboardingStatus.ts
│   ├── Barcode Scan/             # Barcode scanning
│   ├── supabase/                 # Supabase client
│   │   ├── index.ts              # Client initialization
│   │   └── types.ts              # Database types (88KB+)
│   ├── database/                 # Database models/schema
│   ├── theme/                    # Theme system
│   │   └── metriqfit_theme_v1.ts # Theme tokens
│   ├── targets/                  # Target calculations
│   ├── workout/                  # Workout domain logic
│   │   ├── v1_architect.ts       # Plan architecture
│   │   ├── exercise-pool.ts      # Exercise catalog
│   │   ├── split-selector.ts     # Training split logic
│   │   ├── quality-gates.ts      # Validation system
│   │   └── *.test.mjs            # Test files
│   ├── nutrition/                # Nutrition domain logic
│   ├── onboarding/               # Onboarding state
│   ├── ai-coach/                 # AI coach logic
│   ├── analytics/                # Analytics tracking
│   ├── gamification/             # Gamification logic
│   ├── home/                     # Home screen logic
│   ├── progress/                 # Progress tracking
│   ├── navigation/               # Navigation utilities
│   ├── subscription/             # Subscription logic
│   ├── config/                   # App configuration
│   ├── appConfig.ts              # Runtime config
│   ├── preferences.ts            # User preferences
│   └── queryClient.ts            # React Query setup
├── services/                     # Domain services
│   ├── planService.ts            # AI plan generation (103KB+)
│   ├── workoutService.ts         # Workout operations
│   ├── workoutBuilderService.ts  # Plan building
│   ├── nutritionService.ts       # Nutrition operations
│   ├── aiCoachService.ts         # AI coach service
│   ├── subscriptionService.ts    # RevenueCat integration
│   ├── exerciseSubstitutionService.ts
│   ├── progressiveOverloadService.ts
│   ├── gamificationService.ts
│   └── ... (40+ services)
├── hooks/                        # Custom React hooks
│   ├── usePlan.ts                # Plan management
│   ├── useWorkout.ts             # Workout session
│   ├── useNutrition.ts           # Nutrition tracking
│   ├── useUser.ts                # User profile
│   ├── useSubscription.ts        # Billing/subscription
│   ├── useGamification.ts        # XP/levels
│   ├── useProgressiveOverload.ts
│   ├── useAICoach.ts
│   └── ... (35+ hooks)
├── utils/                        # Pure utility functions
│   ├── macroMath.ts              # Macro calculations
│   ├── unitConversion.ts         # Unit conversions
│   └── exerciseGifMapper.ts      # Exercise media mapping
├── constants/                    # App constants
│   ├── routes.ts                 # Route definitions
│   └── featureFlags.ts           # Feature flags
├── supabase/                     # Supabase configuration
│   ├── migrations/               # SQL migrations (80+)
│   ├── functions/                # Edge Functions (15+)
│   │   ├── generate-user-plans/
│   │   ├── ai-coach-message/
│   │   ├── build-meals-from-constraints/
│   │   └── ...
│   └── config.toml               # Function config
├── scripts/                      # Utility scripts
│   ├── validate-exercise-catalog.mjs
│   ├── validate-billing-sandbox.mjs
│   ├── validate-release-readiness.mjs
│   ├── seeds/                    # Seed data
│   └── ...
├── types.ts                      # Global TypeScript types (87KB)
├── app.json                      # Expo configuration
├── app.config.js                 # Dynamic Expo config
├── eas.json                      # EAS Build profiles
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
├── metro.config.js               # Metro bundler config
├── babel.config.js               # Babel config
└── eslint.config.js              # ESLint rules
```

---

## Build and Development Commands

### Development
```bash
# Start Expo development server
npm start

# Platform-specific development
npm run ios           # iOS simulator
npm run android       # Android emulator
npm run web           # Web development

# Build commands
npm run build         # Build for web (outputs to dist/)
```

### Code Quality
```bash
npm run typecheck     # TypeScript type checking
npm run lint          # ESLint (app, components, hooks, lib, services)
```

### Validation Scripts
```bash
npm run validate:exercises     # Validate exercise catalog
npm run validate:billing       # Validate billing sandbox
npm run validate:release       # Release readiness check
```

### Testing
```bash
# Run V1 activation regression tests
npm run test:v1-activation

# Run all tests
npm test              # Node.js test runner on lib/workout/*.test.mjs
```

### Supabase Commands
```bash
supabase start        # Start local Supabase
supabase db reset     # Reset + run migrations
supabase functions serve  # Local Edge Functions
supabase migration new <name>  # Create new migration
```

### EAS Build Commands
```bash
# Development builds
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview/Staging
eas build --profile preview --platform ios
eas build --profile staging --platform ios

# Production
eas build --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform ios
```

---

## Code Style Guidelines

### Theme System (CRITICAL)
**Never hardcode colors. Always use theme tokens.**

```typescript
// CORRECT
import { metriqfitTheme as t } from '@/lib/theme/metriqfit_theme_v1';
<View style={{ backgroundColor: t.colors.bg }}>

// WRONG - Never do this
<View style={{ backgroundColor: '#050505' }}>
```

Key theme tokens:
- `t.colors.bg` - Background (#050510)
- `t.colors.surface` - Card surface (#0A1128)
- `t.colors.primary` - Neon cyan (#22D3EE)
- `t.colors.text` - Primary text (#FFFFFF)
- `t.colors.textMuted` - Secondary text (#A1A1AA)
- `t.colors.macros.protein/carbs/fat` - Macro colors
- `t.spacing.xs/sm/md/lg/xl` - Spacing scale
- `t.radius.sm/md/lg/xl` - Border radius

### Typography
Use theme typography families:
- **Headings**: `Unbounded_700Bold`, `Unbounded_600SemiBold`
- **Body**: `Sora_400Regular`, `Sora_500Medium`, `Sora_600SemiBold`
- **Numbers/Code**: `JetBrainsMono_500Medium`

### Import Paths
Use TypeScript path aliases:
```typescript
import { Button } from '@components/common';
import { useUser } from '@hooks/useUser';
import { metriqfitTheme } from '@lib/theme';
```

### File Naming
- Components: PascalCase (e.g., `WorkoutCard.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useWorkout.ts`)
- Services: camelCase (e.g., `workoutService.ts`)
- Utilities: camelCase (e.g., `macroMath.ts`)
- Tests: `.test.mjs` or `.test.ts` suffix

### Component Structure
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { metriqfitTheme as t } from '@/lib/theme/metriqfit_theme_v1';

interface Props {
  title: string;
  onPress: () => void;
}

export function MyComponent({ title, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: t.colors.surface,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
  },
  title: {
    fontFamily: t.type.heading.family,
    fontSize: t.type.sizes.md,
    color: t.colors.text,
  },
});
```

---

## Testing Strategy

### Test Framework
- **Runner**: Node.js built-in test runner (`node --test`)
- **Location**: Co-located with source files (`*.test.mjs` or `*.test.ts`)
- **Pattern**: Tests are in `lib/workout/*.test.mjs`

### Test Types
1. **Unit Tests**: Test individual functions and utilities
2. **Integration Tests**: Test service interactions
3. **Regression Tests**: V1 activation and hydration tests

### Running Tests
```bash
# Specific test files
node --test lib/workout/v1-activation-regression.test.mjs
node --test lib/workout/v1-hydration-regression.test.mjs

# All workout tests
npm test

# V1 activation tests
npm run test:v1-activation
```

### Test File Structure
```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { functionToTest } from './module.js';

describe('Feature Name', () => {
  it('should do something specific', () => {
    const result = functionToTest(input);
    assert.strictEqual(result, expected);
  });
});
```

---

## Environment Variables

### Client-Side (EXPO_PUBLIC_* prefix required)
```bash
EXPO_PUBLIC_SUPABASE_URL=              # Supabase project URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=         # Supabase anon key
EXPO_PUBLIC_APP_ENV=local|staging|prod # Environment
EXPO_PUBLIC_AUTH_GOOGLE_ENABLED=true   # Google auth toggle
EXPO_PUBLIC_AUTH_APPLE_ENABLED=false   # Apple auth toggle
```

### RevenueCat Configuration
```bash
EXPO_PUBLIC_REVENUECAT_IOS_KEY=        # iOS SDK key
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=    # Android SDK key
EXPO_PUBLIC_BILLING_TEST_MODE=true     # Test mode (no charges)
EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED=false
EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED=false
```

### Server-Only (Edge Functions only - NEVER in client)
```bash
SUPABASE_SERVICE_ROLE_KEY=             # Admin key
OPENAI_API_KEY=                        # GPT-4 API key
REVENUECAT_API_KEY=                    # RevenueCat secret
SENTRY_DSN=                            # Error tracking
```

### Copy from Example
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

---

## Database Schema Overview

### Core User Tables
- `profiles` - User profile data
- `onboarding_answers` - Complete onboarding JSON
- `user_targets` - Computed macros and targets
- `user_measurements` - Weight history

### Workout Tables
- `exercises` - Exercise catalog (175 exercises)
- `workout_templates` - Program templates
- `workout_sessions` - User logged workouts
- `workout_sets` - Individual sets (reps, weight, RPE)
- `user_prs` - Personal records
- `user_workout_plans` - AI-generated plans (versioned)

### Nutrition Tables
- `food_items` - Nutrition database
- `meal_logs` - Meal entries by slot
- `meal_log_items` - Food items in meals
- `user_nutrition_plans` - AI-generated meal plans

### Gamification Tables
- `user_xp` - Experience points
- `user_achievements` - Unlocked achievements
- `user_streaks` - Daily streaks

### Subscription Tables
- `subscriptions` - RevenueCat mirror
- `entitlements` - Feature access

---

## Security Considerations

### Row Level Security (RLS)
- All user-owned tables have RLS enabled
- Policy: `auth.uid() = user_id`
- Template/exercise tables are publicly readable

### Secrets Management
- **NEVER** store server keys in client code
- Use Edge Functions for OpenAI API calls
- Use `expo-secure-store` for sensitive client data

### Edge Function Security
```typescript
// All Edge Functions verify JWT (except specific internal functions)
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Anti-Patterns (NEVER DO)
1. Never hardcode colors - Use theme tokens
2. Never hallucinate exercise/food IDs - Validate against database
3. Never skip RLS - All user data must be protected
4. Never store secrets in client - Use Edge Functions
5. Never create dead buttons - All CTAs must route somewhere
6. Never skip validation - Validate all AI responses
7. Never overwrite plans - Create new versions
8. Never give medical advice - AI Coach guardrails

---

## Deployment Process

### Web Deployment (Firebase Hosting)
```bash
npm run build         # Outputs to dist/
firebase deploy       # Deploy to Firebase Hosting
```

### Mobile Deployment (EAS)
```bash
# Development builds (simulator/emulator)
eas build --profile development --platform ios
eas build --profile development --platform android

# Staging builds (TestFlight/Internal Testing)
eas build --profile staging --platform ios
eas build --profile staging --platform android

# Production builds
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

### Build Profiles (eas.json)
- `development` - Local development with dev client
- `preview` - Internal testing
- `staging` - Pre-production testing
- `production` - App Store / Play Store

---

## Navigation Structure

### Route Groups
- `(auth)` - Authentication screens (no tab bar)
- `(onboarding)` - Onboarding flow (no tab bar)
- `(tabs)` - Main app with bottom tab bar

### 5 Bottom Tabs (Fixed Order)
1. **Home** - Dashboard with macro targets, water, next actions
2. **Workout** - Program browser, session logging, history
3. **Nutrition** - Food logging, meal tracking, daily totals
4. **Progress** - Weight trends, adherence charts, PRs
5. **AI Coach** - Chat interface with GPT-4

### Modal Screens
- `log-weight-sheet` - Weight entry (slide from bottom)
- `log-water-sheet` - Water entry (slide from bottom)
- `log-steps-sheet` - Steps entry (slide from bottom)

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

---

## Troubleshooting

### Metro Bundler Issues
```bash
# Clear cache
npx expo start --clear

# Or manually
rm -rf node_modules/.cache
```

### iOS Build Issues
```bash
cd ios && pod deintegrate && pod install
```

### TypeScript Errors
```bash
npm run typecheck
```

### Database Issues
```bash
supabase db reset  # WARNING: Destroys local data
```

---

## Definition of Done

A task is complete when:
- [ ] Code compiles (`npm run typecheck` passes)
- [ ] Lint passes (`npm run lint` zero errors)
- [ ] Unit tests pass (if applicable)
- [ ] UI matches theme system (no hardcoded colors)
- [ ] RLS policies protect data (if new tables)
- [ ] No dead buttons (all CTAs route correctly)
- [ ] Tested on iOS + Android + Web
