# MetriqFit Elite Front-End Audit Report (Second Pass)

**Date:** February 14, 2026  
**Auditor:** Codex  
**Environment:** Expo Web on `http://localhost:8081` + Chrome DevTools (Console/Network/Elements)

## Scope and Method

- Executed A->Z runtime audit as a logged-in new-user flow on localhost web.
- Navigated auth -> onboarding -> paywall -> tabs -> sub-screens -> settings -> check-in -> modal sheets.
- Click-tested all visible primary actions, quick actions, FAB actions, and modal sheet actions during traversal.
- Validated runtime findings against source files with file/line references.

## Route Coverage

**Route files in codebase (screen files, excluding `_layout`): 47**

- Auth (2/2): `/sign-up`, `/sign-in`
- Onboarding (7/7): `/identity`, `/body-stats`, `/goals-lifestyle`, `/training-setup`, `/nutrition-prefs`, `/paywall`, `/plan-generation`
- Home (2/2): `/home`, `/home/daily-summary`
- Workout (12/12): `/workout`, `/workout/my-plan`, `/workout/program-browser`, `/workout/program-detail`, `/workout/day-preview`, `/workout/exercise-library`, `/workout/exercise-detail`, `/workout/workout-history`, `/workout/active-session`, `/workout/summary`, `/workout/calculators/plate-calculator`, `/workout/calculators/one-rep-max`
- Nutrition (9/9): `/nutrition`, `/nutrition/food-search`, `/nutrition/food-camera`, `/nutrition/barcode-scanner`, `/nutrition/food-detail`, `/nutrition/meal-detail`, `/nutrition/my-plan`, `/nutrition/plan-meal-editor`, `/nutrition/recipes/create`
- Progress (5/5): `/progress`, `/progress/daily-summary`, `/progress/trends`, `/progress/weekly-review`, `/progress/personal-records`
- AI Coach (1/1): `/ai-coach`
- Settings (4/4): `/settings`, `/settings/profile`, `/settings/subscription`, `/settings/meal-times`
- Other (5/5): `/`, `/check-in`, `/log-weight-sheet`, `/log-water-sheet`, `/log-steps-sheet`

## Findings (Ordered by Severity)

| ID | Severity | Screen/Area | Finding | Evidence |
|---|---|---|---|---|
| C-01 | Critical | Progress -> Personal Records | Route crashes at runtime: `(0, _hooksUseWorkout.useUserPRs) is not a function` | `app/(tabs)/progress/personal-records.tsx:7`, `app/(tabs)/progress/personal-records.tsx:14`; `hooks/useWorkout.ts` has no `useUserPRs` export; stale re-export at `hooks/index.ts:41` |
| C-02 | Critical | Workout start session | Session bootstrap reads wrong table (`workout_plan_exercises`), causing 404 and incomplete active-session setup | `services/workoutService.ts:271`; runtime network `GET /rest/v1/workout_plan_exercises...` -> 404 (`PGRST205`, table not found) |
| C-03 | Critical | Settings -> Meal Schedule | Partial/invalid time entry can crash UI (`Cannot read properties of undefined (reading 'toString')`) | `services/mealTimesService.ts:26` called from `app/settings/meal-times.tsx:50` |
| H-01 | High | Settings -> Meal Schedule data load | Runtime DB schema mismatch for `profiles.meal_times` causes 400 fetch failures | `services/mealTimesService.ts:35`; runtime network `GET /profiles?select=meal_times...` -> 400 (`42703` column missing) |
| H-02 | High | Nutrition photo scan limits | `.single()` on daily usage row causes 406 when no row exists (new-day/new-user case) | `services/foodPhotoService.ts:70`; runtime network `GET /ai_usage_daily?...` -> 406 (`PGRST116`) |
| H-03 | High | Onboarding paywall | Elite CTA and Basic CTA both bypass entitlement and route directly into app | `app/(onboarding)/paywall.tsx:17`, `app/(onboarding)/paywall.tsx:23` |
| H-04 | High | Check-in flow | Step 4 is placeholder-only (“COMING SOON”); adjustments are informational and not applied to plan targets | `app/check-in/index.tsx:273`, `app/check-in/index.tsx:279`, `app/check-in/index.tsx:328` |
| H-05 | High | Check-in photos | Photo slots are non-functional placeholders (alert only, no camera/gallery) | `app/check-in/index.tsx:117` |
| H-06 | High | Progress quick links | Photos quick link is still placeholder alert, no route/feature | `app/(tabs)/progress/index.tsx:42` |
| H-07 | High | Settings | Multiple settings actions are placeholder alerts (Security, Notifications, Units, Theme, Help Center) | `app/settings/index.tsx:152`, `app/settings/index.tsx:159`, `app/settings/index.tsx:177`, `app/settings/index.tsx:184`, `app/settings/index.tsx:194` |
| M-01 | Medium | Home | Insight banner text is static (“You've logged Today...”) instead of data-driven state | `app/(tabs)/home/index.tsx:172` |
| M-02 | Medium | Home quick actions | “Summary” quick action routes to Nutrition root instead of summary screen | `app/(tabs)/home/index.tsx:30` |
| M-03 | Medium | Workout summary | `/workout/summary` without valid `sessionId` shows perpetual loading state | `app/(tabs)/workout/summary.tsx:20`, `app/(tabs)/workout/summary.tsx:46` |
| M-04 | Medium | Home -> Daily Summary | Entire route is placeholder (“Coming Soon”) | `app/(tabs)/home/daily-summary.tsx:61` |
| M-05 | Medium | Subscription (web) | Manage Subscription opens store URL flow (`play.google.com`) leading to Google sign-in page in browser context | `app/settings/subscription.tsx:24`, `app/settings/subscription.tsx:26`, `app/settings/subscription.tsx:29` |
| M-06 | Medium | Tabs layout | Extraneous tabs route warning appears repeatedly (`quick-add-placeholder`) | `app/(tabs)/_layout.tsx:181`; console warning `[Layout children]: Too many screens defined...` |
| M-07 | Medium | Nutrition camera flow | Post-analysis confirm path is still placeholder UX (“would navigate...”) before redirect | `app/(tabs)/nutrition/food-camera.tsx:120`, `app/(tabs)/nutrition/food-camera.tsx:129` |
| L-01 | Low | Check-in metrics | Weight unit label is hardcoded `lbs` despite computed `weightUnit` | `app/check-in/index.tsx:28`, `app/check-in/index.tsx:185` |
| L-02 | Low | Console hygiene | Web warnings: `props.pointerEvents` deprecation, `useNativeDriver` fallback warnings | `app/(tabs)/_layout.tsx:196`, `components/premium/PremiumBackground.tsx:73`, `components/premium/PremiumBackground.tsx:82`, `components/premium/PremiumBackground.tsx:91` |

## Console and Network Log (Key Runtime Evidence)

### Console/runtime errors observed

- `TypeError: ... useUserPRs is not a function` on `/progress/personal-records`
- `Cannot read properties of undefined (reading 'toString')` on `/settings/meal-times`
- Repeated warning: `[Layout children]: Too many screens defined. Route "quick-add-placeholder" is extraneous.`
- Warnings: `props.pointerEvents is deprecated`, `Animated: useNativeDriver is not supported` (web)

### Failed/abnormal network requests observed

- `GET /rest/v1/workout_plan_exercises?...` -> **404** (`PGRST205`) during workout start flow
- `GET /rest/v1/profiles?select=meal_times...` -> **400** (`42703` missing column)
- `GET /rest/v1/ai_usage_daily?...` -> **406** (`PGRST116` empty row with `.single()`)
- `POST /auth/v1/token?grant_type=password` with invalid credentials -> **400** (`invalid_credentials`, expected behavior)

## UI/UX Quality Notes

- Tab bar and FAB remained visible/functional across core tab routes.
- Quick Add modal and all 7 actions were reachable.
- No major text clipping observed in default desktop viewport during traversal.
- Camera-permission-dependent flows on web require manual browser permission confirmation and remain inconsistent in this run.

## Priority Fix List (Execution Order)

1. Fix Personal Records crash by implementing/exporting `useUserPRs` (or refactor route to existing hook) and add runtime route test.
2. Fix workout session bootstrap table from `workout_plan_exercises` to `user_workout_plan_exercises` in `startSession`.
3. Harden meal-time formatting for partial input and add input guards before `formatTime12h`.
4. Resolve DB/app schema drift for `profiles.meal_times` in deployed/local DB used by web.
5. Replace `.single()` with `.maybeSingle()` for new-day usage checks (`foodPhotoService`) and handle empty rows.
6. Remove paywall bypass (wire entitlement/purchase flow before routing to tabs).
7. Replace placeholder-heavy check-in/settings/progress-photo flows with implemented paths or hide behind feature flags.
8. Remove extraneous `quick-add-placeholder` Tabs screen to eliminate layout warnings.

## Verification Summary

- Auth validation: wrong-credentials and password-mismatch cases tested.
- Onboarding sequence: all 7 screens traversed.
- Tabs and subscreens: all discovered routes visited and interacted.
- Modals/sheets: all log sheets opened, inputs changed, save actions tested.
- Report evidence: each listed issue linked to runtime observation and file/line.
