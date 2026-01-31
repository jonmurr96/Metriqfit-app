# MetriqFit Elite - Implementation Task List

**Last Updated:** 2026-01-24
**Status:** Slice A - 85% Complete
**Next Milestone:** Complete Slice A Foundation

> This task list tracks implementation progress against the PRD v1.8.1 Implementation Playbook.
> Full alignment analysis: `/Users/owner/.claude/plans/hidden-dancing-lollipop.md`

---

## 🎯 SLICE A: FOUNDATIONS (CURRENT PRIORITY)

**Goal:** Get onboarding → targets → Home dashboard working end-to-end
**Status:** 85% Complete | **Target:** Complete this week

### A1. App Shell + Theme System ✅ COMPLETE
- [x] Theme tokens (`metriqfit_theme_v1.ts`)
- [x] ThemeProvider and useTokens() hook
- [x] Dark mode default
- [x] 333-line theme file with comprehensive design tokens

### A2. Bottom Nav + Quick Add FAB ⚠️ IN PROGRESS
- [x] 5-tab navigation implemented
- [x] FAB renders above tab bar
- [x] QuickAddSheet component exists
- [ ] **TODO:** Wire all 7 Quick Add actions
  - [ ] Scan Meal Photo → FoodCamera (Elite)
  - [ ] Scan Barcode → BarcodeScanner (Elite)
  - [ ] Quick Add Food → FoodSearch
  - [ ] Start Workout → ActiveSession or WorkoutHome
  - [ ] Log Weight → LogWeightSheet
  - [ ] Log Water → LogWaterSheet
  - [ ] Log Steps → LogStepsSheet
- [ ] **TODO:** CTA registry validation (throw on unknown IDs in dev)

**Files:** `/app/(tabs)/_layout.tsx`, `/components/sheets/QuickAddSheet.tsx`

### A3. Auth (Email/Password) ✅ COMPLETE
- [x] Sign up with email/password
- [x] Sign in with email/password
- [x] Sign out
- [x] Session persistence (AsyncStorage)
- [x] Auth state context provider

**Files:** `/lib/auth/AuthProvider.tsx`, `/app/(auth)/*`

### A4. Profile + Onboarding Flow ⚠️ CRITICAL - NEEDS WORK
- [x] 5-step onboarding UI implemented
- [x] OnboardingProvider context
- [x] Form validation per step
- [x] Progress indicators
- [ ] **TODO:** On completion, save to `profiles` table
- [ ] **TODO:** On completion, save to `onboarding_answers` table
- [ ] **TODO:** Trigger target calculation
- [ ] **TODO:** Trigger plan generation (call Edge Function)
- [ ] **TODO:** Navigate to Home tab after success

**Files:** `/app/(onboarding)/nutrition-prefs.tsx` (last step)
**Acceptance Test:** AT-01

### A5. Targets Engine ⚠️ CRITICAL - NEEDS INTEGRATION
- [x] `calculateTargets()` function implemented
- [x] Mifflin-St Jeor BMR formula
- [x] TDEE, calorie adjustment, macro distribution
- [x] Water calculation with bonuses
- [x] Safety guardrails (min calories)
- [ ] **TODO:** Call after onboarding completion
- [ ] **TODO:** Save result to `user_targets` table
- [ ] **TODO:** Create `useTargets()` hook to fetch targets in screens

**Files:** `/lib/targets/calculateTargets.ts`
**Acceptance Test:** AT-01, AT-02

### A6. MacroDashboardHero ⚠️ CRITICAL - NEEDS DATA WIRING
- [x] MacroDashboard component with AnimatedCalorieRing
- [x] Macro cards (protein, carbs, fat) with progress bars
- [ ] **TODO:** Fetch real data from `user_targets` using React Query
- [ ] **TODO:** Fetch daily totals from `meal_logs`
- [ ] **TODO:** Update in real-time when food is logged
- [ ] **TODO:** Show loading states
- [ ] **TODO:** Show error states with retry

**Files:** `/components/dashboard/MacroDashboard.tsx`
**Acceptance Test:** AT-02

### A7. Water Logging (Quick Add) ⚠️ NEEDS WIRING
- [x] LogWaterSheet UI component
- [x] `waterService.logWater()` function
- [ ] **TODO:** Wire sheet submit button to service
- [ ] **TODO:** Save to `water_logs` table
- [ ] **TODO:** Update Home dashboard with remaining water
- [ ] **TODO:** Update Nutrition tab with remaining water
- [ ] **TODO:** Add success toast notification
- [ ] **TODO:** Add error handling

**Files:** `/app/log-water-sheet.tsx`, `/services/waterService.ts`
**Acceptance Test:** AT-05

---

## SLICE A EXIT CRITERIA (MUST PASS BEFORE PROCEEDING TO SLICE B)

- [ ] New user can: create account → complete onboarding → land on Home → see real macros/water → log water → see updated remaining
- [ ] `user_targets` row exists in database with correct calculations
- [x] Theme tokens used everywhere (no hardcoded colors) ✅
- [ ] CTA registry throws on unknown IDs in dev mode
- [ ] AT-01 passes: Onboarding completion creates all required database rows
- [ ] AT-02 passes: Home dashboard displays real macro targets and water
- [ ] AT-05 passes: Water logging updates displays correctly

---

## 🍎 SLICE B: NUTRITION CORE (START AFTER SLICE A)

**Goal:** Get nutrition logging fully functional
**Status:** 30% Complete (services exist, UI needs wiring)

### B1. Food Search (Basic Catalog)
- [x] Service function: `searchFoods(query)` exists
- [x] UI screen: `food-search.tsx` exists
- [ ] **TODO:** Wire search input to service
- [ ] **TODO:** Display results in FlatList
- [ ] **TODO:** Add pagination/virtualization
- [ ] **TODO:** Add loading states
- [ ] **TODO:** Add empty state ("No foods found")
- [ ] **TODO:** Add search debouncing (300ms)

**Files:** `/app/(tabs)/nutrition/food-search.tsx`

### B2. Add Food to Meal
- [x] Service function: `logFood()` exists
- [x] UI screen: `food-detail.tsx` exists
- [ ] **TODO:** Meal slot selection (Breakfast, Lunch, Dinner, Snack)
- [ ] **TODO:** Gram entry with numeric keyboard
- [ ] **TODO:** Save to `meal_logs` and `meal_log_items`
- [ ] **TODO:** Success confirmation + navigation back
- [ ] **TODO:** Add to favorites option

**Files:** `/app/(tabs)/nutrition/food-detail.tsx`

### B3. Gram Entry + Macro Math
- [x] Service function: `calculateMacros(foodItem, grams)` exists
- [ ] **TODO:** Real-time macro preview as user types grams
- [ ] **TODO:** Verify formula: `(per_100g × grams) / 100`
- [ ] **TODO:** Display calculated values before save

**Files:** `/services/nutritionService.ts`

### B4. Daily Totals Component
- [x] Component: `NutritionSummaryCard.tsx` exists
- [x] Service function: `getDailyTotals()` exists
- [ ] **TODO:** Fetch and display daily totals
- [ ] **TODO:** Match `user_targets` display format
- [ ] **TODO:** Color-coded progress (under/on/over target)
- [ ] **TODO:** Real-time updates via React Query

**Files:** `/components/nutrition/NutritionSummaryCard.tsx`

### B5. Nutrition Tab Daily View
- [x] Screen: `nutrition/index.tsx` exists
- [x] Component: `MealTimeline.tsx` exists
- [ ] **TODO:** Display meals grouped by slot
- [ ] **TODO:** Show items per meal with grams and macros
- [ ] **TODO:** Daily totals summary at top
- [ ] **TODO:** Remaining macros display
- [ ] **TODO:** Pull-to-refresh

**Files:** `/app/(tabs)/nutrition/index.tsx`

### B6. Home ↔ Nutrition Parity
- [ ] **TODO:** Shared React Query cache for daily totals
- [ ] **TODO:** Verify Home and Nutrition show identical totals
- [ ] **TODO:** Real-time updates in both locations

---

## SLICE B EXIT CRITERIA

- [ ] User can: search food → add with custom grams → see daily totals update
- [ ] Home and Nutrition tab show identical macro totals
- [ ] Macro math is correct (manual verification)
- [ ] AT-04 passes: Nutrition logging flow end-to-end

---

## 💪 SLICE C: WORKOUT CORE (START AFTER SLICE B)

**Goal:** Get workout logging fully functional
**Status:** 25% Complete (services exist, UI needs wiring)

### C1. Program Browser
- [x] Service function: `getPrograms()` exists
- [x] UI screen: `program-browser.tsx` exists
- [ ] **TODO:** Fetch and display workout templates
- [ ] **TODO:** Filter by experience level
- [ ] **TODO:** Filter by equipment
- [ ] **TODO:** Filter by muscle groups
- [ ] **TODO:** Preview program details

**Files:** `/app/(tabs)/workout/program-browser.tsx`

### C2. Day Preview
- [x] Service function: `getProgramWithDays()` exists
- [x] UI screen: `day-preview.tsx` exists
- [ ] **TODO:** Display exercises for selected day
- [ ] **TODO:** Show sets, reps, rest time
- [ ] **TODO:** Show RPE guidance
- [ ] **TODO:** "Start Workout" CTA

**Files:** `/app/(tabs)/workout/day-preview.tsx`

### C3. Start Session
- [x] Service function: `startSession()` exists
- [x] UI screen: `active-session.tsx` exists
- [ ] **TODO:** Create `workout_sessions` row
- [ ] **TODO:** Set `started_at` timestamp
- [ ] **TODO:** Load exercises from plan day
- [ ] **TODO:** Initialize session exercises

**Files:** `/app/(tabs)/workout/active-session.tsx`

### C4. Log Sets
- [x] Service function: `logSet()` exists
- [ ] **TODO:** UI for entering reps
- [ ] **TODO:** UI for entering weight
- [ ] **TODO:** UI for entering RPE (1-10 scale)
- [ ] **TODO:** Create `workout_sets` rows
- [ ] **TODO:** Mark warmup sets checkbox
- [ ] **TODO:** Auto-fill with previous workout weights

**Files:** `/app/(tabs)/workout/active-session.tsx`

### C5. Finish Session
- [x] Service function: `finishSession()` exists
- [ ] **TODO:** Set `finished_at` timestamp
- [ ] **TODO:** Calculate total volume
- [ ] **TODO:** Calculate duration
- [ ] **TODO:** Save session notes
- [ ] **TODO:** Show completion summary

**Files:** `/services/workoutService.ts`

### C6. PR Detection
- [x] Service function: `checkAndUpdatePR()` exists
- [x] Brzycki formula for 1RM estimation
- [ ] **TODO:** Call after each set is logged
- [ ] **TODO:** Compare against `user_prs` table
- [ ] **TODO:** Update if new max
- [ ] **TODO:** Show PR badge/celebration in UI

**Files:** `/services/workoutService.ts`

### C7. Workout History
- [x] Service function: `getWorkoutHistory()` exists
- [x] UI screen: `workout-history.tsx` exists
- [ ] **TODO:** Display past sessions with summary
- [ ] **TODO:** Show duration, volume, exercises
- [ ] **TODO:** Tap to view session detail
- [ ] **TODO:** Filter by date range

**Files:** `/app/(tabs)/workout/workout-history.tsx`

### C8. Exercise Library
- [x] Service function: `getExercises()` exists
- [x] UI screen: `exercise-library.tsx` exists
- [ ] **TODO:** Searchable exercise database
- [ ] **TODO:** Filter by muscle group
- [ ] **TODO:** Filter by equipment
- [ ] **TODO:** Filter by difficulty
- [ ] **TODO:** Exercise detail view with instructions

**Files:** `/app/(tabs)/workout/exercise-library.tsx`

---

## SLICE C EXIT CRITERIA

- [ ] User can: browse programs → start workout → log all sets → finish → see in history
- [ ] PR badge appears when new max achieved
- [ ] Session duration and volume calculated correctly
- [ ] AT-03 passes: Workout logging flow end-to-end
- [ ] AT-06 passes: Quick Add workout action works

---

## 🤖 SLICE D: AI PLANS + COACH (START AFTER SLICES B + C)

**Goal:** Get AI plan generation and AI Coach working
**Status:** 20% Complete (Edge Functions exist, UI wiring needed)

### D1. Plan Generation Edge Function
- [x] Edge Function exists: `generate-user-plans/index.ts`
- [ ] **TODO:** Call from onboarding completion
- [ ] **TODO:** Fetch onboarding_answers
- [ ] **TODO:** Fetch user_targets
- [ ] **TODO:** Fetch equipment and injuries
- [ ] **TODO:** Call OpenAI GPT-4 with structured prompt
- [ ] **TODO:** Create `user_workout_plans` rows
- [ ] **TODO:** Create `user_nutrition_plans` rows

**Files:** `/supabase/functions/generate-user-plans/index.ts`

### D2. Plan Validation
- [ ] **TODO:** Validate all exercise IDs exist
- [ ] **TODO:** Validate all food IDs exist
- [ ] **TODO:** Reject invalid plan with error
- [ ] **TODO:** Fallback to default template if AI fails

### D3. Plan Versioning
- [x] Database schema supports versioning
- [ ] **TODO:** On regenerate, create new version
- [ ] **TODO:** Set new version as active
- [ ] **TODO:** Keep old versions in "History"

### D4. Plan → UI Rendering
- [ ] **TODO:** Fetch active workout plan in Workout tab
- [ ] **TODO:** Render plan days and exercises
- [ ] **TODO:** Fetch active nutrition plan in Nutrition tab
- [ ] **TODO:** Render meal suggestions

### D5. AI Coach Edge Function
- [x] Edge Function exists: `ai-coach-message/index.ts`
- [x] Service function: `sendMessage()` exists
- [ ] **TODO:** Wire chat UI to Edge Function
- [ ] **TODO:** Send user message + context
- [ ] **TODO:** Receive and display AI response
- [ ] **TODO:** Save to `ai_coach_messages` table

**Files:** `/app/(tabs)/ai-coach/index.tsx`

### D6. Coach Grounding Layer
- [ ] **TODO:** Fetch user_targets before AI call
- [ ] **TODO:** Fetch today's food logs
- [ ] **TODO:** Fetch today's water logs
- [ ] **TODO:** Fetch today's workout (if any)
- [ ] **TODO:** Fetch last 30 days history
- [ ] **TODO:** Inject context into system prompt

### D7. Missing Data Handling (CRITICAL for AT-10)
- [ ] **TODO:** If no data logged, AI says "I don't see X logged"
- [ ] **TODO:** Prompt user to log missing data
- [ ] **TODO:** Offer labeled assumption option

**Acceptance Test:** AT-10 (negative test)

### D8. Rate Limiting
- [x] Service function: `checkRateLimit()` exists
- [x] Table: `ai_usage_daily` exists
- [ ] **TODO:** Enforce server-side (Free: 10/day, Elite: unlimited)
- [ ] **TODO:** Display remaining usage in UI
- [ ] **TODO:** Show next reset time

### D9. Safety Filters
- [ ] **TODO:** Reject medical advice requests
- [ ] **TODO:** Reject eating disorder coaching
- [ ] **TODO:** Reject unsafe supplement protocols
- [ ] **TODO:** Suggest safer alternatives
- [ ] **TODO:** Show "Not medical advice" disclaimer

---

## SLICE D EXIT CRITERIA

- [ ] Plans generate and render without errors
- [ ] AI Coach answers "What are my macros?" with exact values
- [ ] AT-10 passes: "How many steps today?" → AI says data is missing (negative test)
- [ ] Rate limit enforced (11th message blocked on free tier)
- [ ] AT-08 passes: AI Coach responds within 5s
- [ ] AT-09 passes: Plan versioning works

---

## 📊 SLICE E: PROGRESS + POLISH + SHIP (FINAL SLICE)

**Goal:** Polish, test, and prepare for App Store submission
**Status:** 10% Complete (components exist, data integration needed)

### E1. Weight Trend Chart
- [x] Component: `WeeklyTrendChart.tsx` exists
- [ ] **TODO:** Fetch `user_measurements` over time
- [ ] **TODO:** Integrate chart library (Victory Native)
- [ ] **TODO:** Plot weight trend with goal line

### E2. Nutrition Adherence Chart
- [x] Component: `MacroConsistencyCard.tsx` exists
- [ ] **TODO:** Calculate % of target hit per day/week
- [ ] **TODO:** Display adherence chart

### E3. Workout Volume/Frequency
- [x] Component: `PRHighlightCard.tsx` exists
- [ ] **TODO:** Calculate sets/week, workouts/week
- [ ] **TODO:** Display volume chart

### E4. Paywall + RevenueCat
- [x] Service: `subscriptionService.ts` exists
- [ ] **TODO:** Create paywall screen
- [ ] **TODO:** Integrate RevenueCat SDK
- [ ] **TODO:** Gate Elite features
- [ ] **TODO:** Check entitlements

### E5. Subscription Disclosures (REQUIRED FOR APP STORE)
- [ ] **TODO:** Display pricing (monthly/annual/lifetime)
- [ ] **TODO:** Show trial length and billing date
- [ ] **TODO:** Show cancel instructions
- [ ] **TODO:** Show auto-renew disclosure

### E6. Push Notifications
- [ ] **TODO:** Opt-in flow
- [ ] **TODO:** Workout reminder
- [ ] **TODO:** Meal reminder
- [ ] **TODO:** Water reminder
- [ ] **TODO:** Weekly summary
- [ ] **TODO:** Deep links

### E7. Accessibility Audit (REQUIRED FOR APP STORE)
- [ ] **TODO:** Verify touch targets ≥ 44×44pt
- [ ] **TODO:** Verify color contrast ≥ 4.5:1
- [ ] **TODO:** Add accessibilityLabel to all interactive elements
- [ ] **TODO:** Test with VoiceOver (iOS)
- [ ] **TODO:** Test with TalkBack (Android)

### E8. Performance Audit
- [ ] **TODO:** Measure cold start (target: < 3s)
- [ ] **TODO:** Measure AI response time (target: < 5s p95)
- [ ] **TODO:** Measure bundle size (target: < 2MB gzipped)
- [ ] **TODO:** Optimize images
- [ ] **TODO:** Add code splitting

### E9. Account Deletion (REQUIRED FOR APP STORE)
- [x] Edge Function exists: `delete-account/index.ts`
- [ ] **TODO:** Add UI in Settings
- [ ] **TODO:** Add confirmation warning
- [ ] **TODO:** Implement full cascade delete
- [ ] **TODO:** Redirect to Auth screen after deletion

**Acceptance Test:** AT-12

### E10. Store Assets (REQUIRED BEFORE SUBMISSION)
- [ ] **TODO:** 6 screenshots (onboarding, home, workout, nutrition, progress, AI coach)
- [ ] **TODO:** App preview video (15-30s)
- [ ] **TODO:** App description
- [ ] **TODO:** Keywords
- [ ] **TODO:** App icon (1024×1024)

### E11. Privacy Policy + Compliance (REQUIRED BEFORE SUBMISSION)
- [ ] **TODO:** Write privacy policy
- [ ] **TODO:** Publish privacy policy
- [ ] **TODO:** Add in-app link to privacy policy
- [ ] **TODO:** Data use disclosures (PII, fitness metrics, AI usage)

---

## SLICE E EXIT CRITERIA (APP STORE READY)

- [ ] Progress tab shows real trend data
- [ ] Paywall blocks Elite features for free users
- [ ] Push notifications deliver and deep link correctly
- [ ] VoiceOver/TalkBack pass key flows
- [ ] All performance targets met
- [ ] Account deletion removes all user data
- [ ] All store assets ready
- [ ] Privacy policy published
- [ ] AT-07 passes: Progress charts display
- [ ] AT-11 passes: Staging/prod parity
- [ ] AT-12 passes: Account deletion works

---

## 🚀 CRITICAL PATH (IMMEDIATE FOCUS)

### This Week: Complete Slice A

1. **Wire Onboarding Completion** (HIGHEST PRIORITY)
   - File: `/app/(onboarding)/nutrition-prefs.tsx`
   - Action: On submit, call `calculateTargets()`, save to DB, trigger plan generation

2. **Wire MacroDashboard Data Fetching**
   - File: `/components/dashboard/MacroDashboard.tsx`
   - Action: Use React Query to fetch `user_targets` and daily totals

3. **Wire Water Logging**
   - File: `/app/log-water-sheet.tsx`
   - Action: On submit, call `waterService.logWater()`

4. **Wire Quick Add Actions**
   - File: `/components/sheets/QuickAddSheet.tsx`
   - Action: Implement all 7 action routes

5. **Test End-to-End**
   - Run AT-01, AT-02, AT-05
   - Verify database rows created
   - Verify UI updates

---

## 📋 VERIFICATION CHECKLIST

### Before Proceeding to Next Slice
- [ ] All tasks in current slice marked complete
- [ ] All acceptance tests for current slice pass
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Tested on web

### Before App Store Submission
- [ ] All acceptance tests (AT-01 through AT-12) pass
- [ ] Privacy policy published and linked
- [ ] All store assets prepared
- [ ] Performance benchmarks met
- [ ] Accessibility audit complete
- [ ] Account deletion tested

---

## 📚 REFERENCE

**Full Alignment Report:** `/Users/owner/.claude/plans/hidden-dancing-lollipop.md`
**PRD:** `/PRD/metriqfit_PRD_v1_8_1.md`
**Agent Instructions:** `/CLAUDE.md`
**Theme Source of Truth:** `/lib/theme/metriqfit_theme_v1.ts`

---

**Next Action:** Wire onboarding completion to save data and trigger plan generation. This unlocks the entire app flow.
