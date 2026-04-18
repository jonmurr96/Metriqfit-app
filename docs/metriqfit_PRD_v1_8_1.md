# MetriqFit PRD v1.8.1 (Fitness + Nutrition + AI Coach)

**Version:** 1.8.1  
**Date:** 2025-12-30  
**Owner:** Jonathon Murray  
**Status:** Implementation-ready baseline + deployment + App Store ready guardrails

> This builds on PRD v1.8 and **adds the Implementation Playbook** (Section 27):
> vertical slices, agent roles, phase gates, and implementation report template.

---

## 1) Source-of-Truth Artifacts (Contracts)

Agents must treat these as **schemas/contracts**. No new fields without updating the contract.

| Artifact | Filename |
|----------|----------|
| Onboarding + Targets spec | `metriqfit_onboarding_targets_spec_v1.json` |
| Workout engine dataset | `app_ready_programs_175_v3_constraints.json` |
| Nutrition engine dataset | `nutrition_engine_v3_1_integration_ready.json` |
| 5-tab UI blueprint | `metriqfit_5tab_blueprint_v2_all_in_one.json` |
| Theme tokens | `metriqfit_theme_v1.ts` |
| Theme Provider | `ThemeProvider.tsx` |
| Macro dashboard hero | `MacroDashboardHero.tsx` |

---

## 2) Product Summary

MetriqFit onboards a user → computes deterministic targets (calories/macros + water) →
generates workout & nutrition plans (AI server-side) → provides 5-tab daily tracking + progress + AI coach.
Ships to **web** (Firebase Hosting) and **mobile** (iOS/Android via EAS) from one codebase.

---

## 3) Tech Stack (Locked Baseline)

| Layer | Technology |
|-------|------------|
| App framework | Expo + React Native |
| Web build | Expo Web + Vite → `dist/` |
| Backend | Supabase (DB + Auth + Edge Functions) |
| Web hosting | Firebase Hosting |
| Mobile builds | EAS Build (iOS/Android) |

---

## 4) AI Coach Scope + Guardrails

### 4.1 What the AI Coach *Does*
Uses **user data context** (targets + logs + last workouts/meals) to:
- Answer questions about today's targets and adherence
- Suggest meal swaps aligned to targets/allergies
- Suggest workout exercise substitutions (respect injuries/equipment)
- Explain training/nutrition concepts in practical terms
- Plan the next 24–72 hours (micro-plans)

### 4.2 What the AI Coach *Cannot* Do
- Medical diagnosis or treatment, medication advice, or claims of curing conditions
- Eating disorder coaching, extreme restriction guidance, or "how to starve fast"
- Unsafe supplement/steroid protocols, dosages, sourcing, or "tren-level" guidance
- "Guaranteed" outcomes

### 4.3 Grounding Rules (Anti-Hallucination)
Coach must *only* reference metrics that exist in:
- `user_targets`
- Today's logs (food/water/weight/workout)
- Last 30 days history

If data is missing, it must say so and ask the user to log it (or offer a default assumption labeled as an assumption).

### 4.4 Safety UX
- Provide "Not medical advice" note when discussing health-adjacent topics
- Provide "If you feel unwell…" escalation language for concerning symptoms
- Content filtering: reject unsafe requests; suggest safer alternatives

---

## 5) Plan Generation Outputs + Versioning Rules

### 5.1 Plans Generated After Onboarding
- Deterministic targets are computed first and persisted
- Then Edge Function `generate_user_plans` writes:
  - `user_workout_plans` (and child tables)
  - `user_nutrition_plans` (and child tables)
  - Optional `plan_generation_runs` audit log

### 5.2 Plan Versioning
- Plans are **versioned**. One "active" plan per user per type.
- A regenerate does **not** overwrite; it creates a new plan version and sets it active.
- The prior plan remains accessible in "History → Plans".

### 5.3 User Edits and How They Affect AI
User can:
- Swap an exercise in a slot (within constraints)
- Edit a meal item grams or replace item

These edits:
- Persist as "user overrides"
- Do **not** rewrite the base template dataset
- Are fed back to the AI Coach as context (preferred choices), but AI must still validate constraints

### 5.4 UI Mapping (Plan → Screens)
| Screen | Data Source |
|--------|-------------|
| Home → NextActionCard | Active workout plan day + nutrition meal structure for today |
| Workout → Program/DayPreview | Active workout plan |
| Nutrition → NutritionHome | Active nutrition plan meal slots + example day suggestions |

---

## 6) Navigation Contract (Bottom Tabs + Quick Add)

### 6.1 Bottom Tabs (5, Fixed Order)
**Home · Workout · Nutrition · Progress · AI Coach**

- There is **no "Log" tab**. Logging is accessed via:
  - The **Quick Add (+)** button
  - Contextual actions inside each tab (Workout logging inside Workout, food logging inside Nutrition, etc.)
- The center **FAB (+)** opens a **Quick Add Sheet** (bottom sheet / modal)
- **No dead buttons:** Quick Add items must be wired via CTA registry; unknown CTA IDs throw in dev

### 6.2 Quick Add Sheet Actions (Must Be Implemented)

| # | Action | Route | Output |
|---|--------|-------|--------|
| 1 | Scan Meal Photo (AI) | `FoodCamera` | Meal log entry with estimated grams + macro snapshot (editable before save) |
| 2 | Scan Barcode | `BarcodeScanner` | Resolves to `FoodDetail` / `AddToMeal` |
| 3 | Quick Add Food (Search) | `FoodSearch` | — |
| 4 | Start / Resume Workout | `ActiveSession` if exists, else `WorkoutHome` or `Program/DayPreview` | — |
| 5 | Log Weight | `LogWeightSheet` (or inline modal) | — |
| 6 | Log Water | `LogWaterSheet` (ml storage; show oz/ml/L) | — |
| 7 | Log Steps | `LogStepsSheet` (manual entry v1) | — |

### 6.3 Implementation Reference
- **Reference component (source of truth UI):** `MetriqFitBottomNav.tsx`
- Tabs/icons must follow the app theme tokens (dark-mode-first)
- FAB must not cover labels; ensure the center spacer keeps middle labels visible

### 6.4 Navigation Analytics Events
- `quick_add_open`
- `quick_add_action_selected` (props: `action_id`)
- `quick_add_dismissed`

### 6.5 Stack Navigation Rules
- Each tab has a **stack** with explicit route names (no "mystery screens")
- **Modal vs push** must be consistent:
  - Quick Add Sheet actions open either a modal sheet (log water/weight/steps) or push screens (FoodSearch/Scanner/Workout)
- **Back behavior rules:**
  - Back from Quick Add flows returns user to the originating tab screen
  - Completing a Quick Add action returns user to the correct "home" (e.g., NutritionHome after adding food)

> Agents must maintain a single screen tree reference and update it if any route changes.

---

## 7) App Store Readiness Checklist

### 7.1 Privacy & Compliance
Privacy policy must disclose:
- PII collected (name/email)
- "Fitness metrics" logged (weight, steps, water, workouts, foods)
- How AI uses data (server-side processing)
- Data retention and deletion rights

Implement "Delete account" inside app (required).

### 7.2 Subscription Disclosures (Elite)
Paywall copy must include:
- Pricing (monthly/annual/lifetime)
- Trial length and billing start date
- Cancel instructions (iOS settings / Play Store)
- "Auto-renew" disclosure

### 7.3 Store Assets Checklist

**iOS:**
- App name, subtitle, keywords
- Screenshots: onboarding, home dashboard, workout logging, nutrition logging, progress, AI coach
- App preview video (15–30s, recommended for featuring)
- Privacy "nutrition/fitness" category declarations

**Android:**
- Feature graphic
- Screenshots
- Data safety section answers

### 7.4 Permissions Checklist
MVP should require minimal permissions:
- Camera only if enabling food photo scanning (Elite feature)
- Notifications (optional) for reminders; default off

---

## 8) Build & Deployment Matrix

### 8.1 Environments

| Environment | Supabase | Firebase | EAS Profile |
|-------------|----------|----------|-------------|
| local | Local/dev instance | — | — |
| staging | Staging project | Staging site | `staging` |
| prod | Production project | Production site | `production` |

### 8.2 Required Environment Variables

**Client (safe):**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_APP_ENV` = local|staging|prod

**Server-only (never in client):**
- `SUPABASE_SERVICE_ROLE_KEY`
- AI provider keys (OpenAI/Claude/Gemini)
- RevenueCat/Stripe keys (if used)

### 8.3 Web Deploy (Firebase Hosting)
Contract steps:
1. `npm run typecheck`
2. `npm run build` → outputs `dist/`
3. `firebase deploy --only hosting`
4. Smoke test: login → home loads → templates load

### 8.4 Mobile Deploy (EAS)
Contract steps:
1. Configure `eas.json` profiles: `staging`, `production`
2. Secrets stored in EAS secrets (not in repo)
3. Build:
   - `eas build --profile staging --platform ios|android`
   - `eas build --profile production --platform ios|android`
4. Submit via `eas submit` (or App Store Connect/Play Console pipeline)

### 8.5 "Build Must Fail" Rules
- Typecheck errors → fail
- Unresolved CTA registry IDs → fail
- Missing required env vars → fail
- Circular imports detected → fail

---

## 9) CI/CD Pipeline

### 9.1 Pipeline Stages (GitHub Actions + EAS)

| Trigger | Stage | Actions |
|---------|-------|---------|
| On PR | Validate | lint → typecheck → unit tests → build check |
| On merge to `main` | Deploy Staging | Build + deploy to staging environment |
| On release tag | Deploy Production | Build + deploy to production (manual approval gate) |

### 9.2 Required Checks (PR Cannot Merge Without)
- ESLint passes (zero errors)
- TypeScript compiles (zero errors)
- Unit tests pass (≥70% coverage on services)
- Build completes without error

---

## 10) Testing Framework

### 10.1 Testing Stack

| Type | Tool | Target Coverage |
|------|------|-----------------|
| Unit tests | Jest + React Native Testing Library | 70% services, 50% components |
| E2E (mobile) | Maestro | Critical flows |
| E2E (web) | Playwright | Critical flows |

### 10.2 Must-Pass E2E Flows
- Auth + Onboarding completion
- Targets computed and shown on Home + Nutrition
- Quick Add actions (all 7) route correctly
- Workout logging (start → sets → finish → history)
- Nutrition logging (search → add grams → daily totals)
- Account deletion + logout redirect

### 10.3 Device QA Matrix

| Platform | Devices |
|----------|---------|
| iOS | iPhone SE (small), iPhone 14 Pro (large) |
| Android | Pixel 6a (mid-range) |
| Web | Chrome latest, Safari latest |

---

## 11) Observability & Debugging

### 11.1 Error Reporting
Add Sentry (or equivalent) for:
- Web (Vite build)
- Native (Expo)

Include:
- `user_id` (hashed)
- Screen route
- Build version
- Network status

### 11.2 Edge Function Logging Conventions
For every Edge Function call:
- `request_id`
- `user_id_hash`
- `function_name`
- `status` (success/fail)
- `duration_ms`
- `error_code` (if fail)

### 11.3 In-App Diagnostics Screen (Dev-Only)
Add a hidden Diagnostics screen that can:
- Verify auth session
- Query template counts (exercises/templates/days)
- Create/finish a test workout session
- Fetch daily nutrition summary
- Print results in a table

This prevents "agent says done, but it isn't".

---

## 12) Performance Targets

### 12.1 Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| App cold start | < 3s | Time to interactive |
| Home screen TTI | < 2s | After auth |
| AI Coach response | < 5s (p95) | Message sent → response rendered |
| Food search results | < 1s | Query → results displayed |
| Workout plan load | < 1.5s | Tab tap → plan rendered |
| Bundle size (web) | < 2MB gzipped | Production build |

### 12.2 Anti-Bloat Rules
- Lists must paginate/virtualize (ExerciseLibrary, FoodSearch)
- Avoid importing heavy dependencies into the client bundle unless required
- Build must not hang: agents must identify and remove circular deps and long-running postinstall scripts
- Add a lightweight "build health" script in CI

---

## 13) Data Retention & Export

### 13.1 Retention
- Default: user data retained until user deletes account
- Soft delete not required in MVP (optional) but deletion must be irreversible once confirmed

### 13.2 Export
- v1: Provide "Export Data" in Settings with "Coming soon" stub
- v1.4: Generate JSON export with:
  - Targets
  - Workout history
  - Nutrition logs
  - Measurements

### 13.3 Delete Account Cascade List (Must Be Explicit)
Delete must remove:
- `profiles`
- `onboarding_answers`
- `user_targets`
- `user_workout_plans` (+ children)
- `user_nutrition_plans` (+ children)
- `workout_sessions` / `session_exercises` / `workout_sets` / `user_prs`
- `meal_logs` / `meal_log_items` / `water_logs` / `food_favorites`
- `user_measurements`
- `ai_usage_daily` / `subscriptions` (and revoke entitlements)

### 13.4 Logout Behavior
- Clears local user state/cache
- Redirects to Auth screen

---

## 14) Security

### 14.1 Access Control
- Client uses anon key only
- All writes guarded by RLS (user-owned tables) or Edge Functions (service role)
- AI provider keys never leave server

### 14.2 Rate Limits

| Resource | Free Tier | Elite Tier |
|----------|-----------|------------|
| AI coach messages/day | 10 | Unlimited |
| Plan regenerations/hour | 1 | 3 |
| Food photo scans/day | 3 | Unlimited |
| API calls/min (global) | 60 | 120 |

**Enforcement:**
- Enforce limits **server-side** (Edge Functions) using a user-scoped usage table (daily + rolling windows)
- Client must display remaining usage counts and next reset time

---

## 15) QA / Acceptance Tests

### AT-01: Onboarding Completion
- Complete all onboarding steps
- Verify `user_targets` row created with correct calculations
- Verify plans generated and set to active

### AT-02: Home Dashboard Loads
- After onboarding, Home tab displays:
  - Today's macro targets
  - Water target
  - Next workout action card
  - Next meal action card

### AT-03: Workout Logging Flow
- Start workout from plan
- Log sets for each exercise
- Complete workout
- Verify `workout_sessions` and `workout_sets` rows created
- Verify PR detection if applicable

### AT-04: Nutrition Logging Flow
- Search for food item
- Add to meal with custom grams
- Verify `meal_logs` and `meal_log_items` rows created
- Verify daily totals update on Nutrition screen

### AT-05: Water Logging
- Log water via Quick Add
- Verify `water_logs` row created
- Verify remaining water updates on Home/Nutrition

### AT-06: Quick Add Fully Wired (No Dead Buttons)
- Tap **+** to open Quick Add
- Select each action and confirm it navigates to the correct screen
- Complete each flow once (log water, log weight, quick add food, start workout)
- Confirm database rows are created where expected

### AT-07: Progress Charts
- Log multiple days of data
- Verify weight chart shows trend
- Verify workout volume/frequency charts populate

### AT-08: AI Coach Basic Interaction
- Send message to AI Coach
- Verify response received within 5s
- Verify response references user's actual targets

### AT-09: Plan Versioning
- Generate plan → regenerate → ensure new plan becomes active and old remains accessible in History

### AT-10: AI Coach Grounding (Includes Negative Test)
- Ask: **"What are my macros today?"** → must match `user_targets` exactly
- Ask: **"How much water left?"** → must match `water_target_ml - water_logged_ml`
- **Negative test:** Ask about a metric not logged (e.g., **"How many steps today?"** when no steps logged) → AI must say the data is missing and prompt the user to log it

### AT-11: Staging/Prod Parity
- Staging build deploys and loads seeded templates
- Production build deploys and loads seeded templates
- No env var leakage to client

### AT-12: Account Deletion
- Trigger account deletion from Settings
- Confirm warning displayed
- Complete deletion
- Verify all user data removed from database
- Verify redirect to Auth screen

---

## 16) Accessibility Requirements

### 16.1 Minimum Compliance
- Touch targets: minimum **44×44pt** (iOS) / **48×48dp** (Android)
- Color contrast: **4.5:1** minimum for body text, **3:1** for large text
- Screen reader labels on all interactive elements (`accessibilityLabel` / `accessibilityHint`)
- No color-only indicators (add icons/text for states)

### 16.2 Testing
- iOS: **VoiceOver** pass-through on key flows (onboarding, workout logging, food logging)
- Android: **TalkBack** pass-through on key flows

### 16.3 Font Scaling
- App must remain usable at **200%** system font scale
- No truncation that hides critical info (use wrapping, lineHeight, and responsive layout)

---

## 17) Analytics Events

### 17.1 Core Events (Minimum)

| Event | Properties | Notes |
|-------|------------|-------|
| `onboarding_started` | `step_id` | First onboarding screen view |
| `onboarding_completed` | `duration_sec`, `goal_type` | After final submit |
| `workout_started` | `plan_id`, `day_number` | Session created |
| `workout_completed` | `session_id`, `duration_min`, `sets_logged` | `finished_at` set |
| `food_logged` | `source` (search/scan/barcode), `meal_slot` | Meal item created |
| `water_logged` | `amount_ml` | Water log created |
| `ai_coach_message_sent` | `message_length`, `context_type` | User message |
| `ai_coach_response_received` | `response_time_ms`, `was_grounded` | Model response |
| `subscription_viewed` | `paywall_source` | Paywall screen |
| `subscription_started` | `plan_type`, `trial` | Purchase started |
| `error_displayed` | `error_code`, `screen` | Any surfaced error |

### 17.2 Implementation Notes
- Include `user_id` (auth.uid), `ts_ms`, `app_version`, `platform` on every event
- Events must be emitted **client-side**; server-side emits should be additive (e.g., edge function timings)

---

## 18) Input Validation & Edge Cases

### 18.1 Numeric Bounds

| Field | Min | Max | Default |
|-------|-----|-----|---------|
| Weight (lbs) | 50 | 700 | — |
| Weight (kg) | 23 | 320 | — |
| Calories target | 800 | 10,000 | computed |
| Water target (ml) | 500 | 10,000 | computed |
| Food serving (g) | 1 | 5,000 | 100 |
| Workout sets | 1 | 20 | per template |
| Reps per set | 1 | 100 | per template |
| Weight lifted (lbs) | 0 | 2,000 | — |

### 18.2 Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Zero-calorie day logged | Show warning, allow save |
| Duplicate food entry | Allow (user may eat the same thing twice) |
| Workout with 0 sets completed | Save as "skipped", do not count toward streak |
| AI coach timeout (>15s) | Show retry button, log incident via `error_displayed` |

---

## 19) Push Notification Strategy

### 19.1 Notification Types (v1)

| Type | Default | Timing | Content |
|------|---------|--------|---------|
| Workout reminder | Off | User-set time | "Time to train: {workout_name}" |
| Meal reminder | Off | User-set meal times | "Log your {meal_slot}" |
| Water reminder | Off | Every 2h 9am–9pm | "Stay hydrated—{remaining}ml to go" |
| Weekly summary | On | Sunday 9am | "Your week: {workouts} workouts, {avg_adherence}% nutrition" |

### 19.2 Rules
- No notifications until user explicitly enables
- All notifications deep-link to the relevant screen
- Suppress if the user already logged the action today

---

## 20) Unit Conversions & Unit System

### 20.1 User Preference
Stored as: `unit_system` = `imperial` | `metric`

### 20.2 Canonical Storage
- Store canonical units in DB: **ml, kg, cm**
- Display conversions client-side; persist canonical values only

### 20.3 Conversion Factors

| From | To | Factor | Rounding |
|------|----|--------|----------|
| oz → ml | ×29.5735 | Nearest 1ml |
| ml → oz | ÷29.5735 | 1 decimal |
| lbs → kg | ×0.453592 | 1 decimal |
| kg → lbs | ÷0.453592 | 1 decimal |
| in → cm | ×2.54 | 1 decimal |

---

## 21) Caching Strategy

### 21.1 Client-Side Cache (React Query / SWR)

| Data | Stale Time | Cache Time | Invalidate On |
|------|------------|------------|---------------|
| User targets | 24h | 7d | Profile update, plan regen |
| Active workout plan | 1h | 24h | Plan regen |
| Active nutrition plan | 1h | 24h | Plan regen |
| Exercise library | 7d | 30d | App update |
| Food search results | 5min | 1h | — |
| Today's logs | 0 (always fresh) | 10min | Any log action |

### 21.2 Offline-First Priority (Minimum)
Cache these for offline viewing:
- Active workout plan (full structure)
- Today's scheduled meals
- User targets

### 21.3 Offline / Bad Network UX
- If offline or Supabase unreachable:
  - Show a clear error state (no infinite spinner)
  - Allow viewing last loaded plan (cached) if available
  - For logging actions: block with a clear message (local queue optional for v1.5)
- All data fetches must have a timeout + retry affordance

---

## 22) External Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| Supabase | Auth, DB, Edge Functions | None (critical) |
| OpenAI / Claude / Gemini | AI Coach, plan generation | Retry → fallback templates |
| RevenueCat | Subscription management | Direct App Store/Play billing (degraded) |
| Sentry | Error tracking | Console logging (degraded) |
| Firebase Hosting | Web deploy | Vercel/Netlify (manual switch) |
| Open Food Facts API | Food/barcode lookup | Manual search fallback |
| USDA FoodData Central | Nutrition data enrichment (optional) | Supabase `food_items` table |

### 22.1 Barcode Scanning (v1 Decision)
- **Library:** `expo-barcode-scanner` (Expo managed)
- **Fallback if permission denied:** Quick Add Food (Search)
- **Food database:** Open Food Facts API (free, open-source)

---

## 23) Support Flows

### 23.1 In-App Support
- Settings → Help → FAQ (static, offline-available)
- Settings → Help → Contact Support → opens email compose with:
  - Pre-filled: app version, user_id hash, device info
  - User writes issue description

### 23.2 Error Recovery CTAs

| Error State | Primary CTA | Secondary CTA |
|-------------|-------------|---------------|
| Network error | Retry | View cached data |
| AI generation failed | Retry | Use default plan |
| Auth expired | Re-login | — |
| Subscription lapsed | Restore purchases | Contact support |

---

## 24) Disaster Recovery

### 24.1 Database
- Supabase point-in-time recovery (enabled by default on Pro plan)
- Daily automated backups retained for 7 days

### 24.2 Service Outage Handling

| Service | Failure Mode | Recovery |
|---------|--------------|----------|
| Supabase DB | Unreachable | Display cached data + "offline mode" banner |
| Edge Functions | Timeout/error | Retry with exponential backoff → fallback templates |
| AI Provider | Rate limit/outage | Queue message → retry → show "AI temporarily unavailable" |
| Auth Provider | Session invalid | Prompt re-login, preserve local cache |

---

## 25) Internationalization (Roadmap)

### 25.1 v1 Scope
- English only
- All user-facing strings in locale files (prep for i18n)

### 25.2 v1.4+ Scope
- i18n framework: `react-i18next`
- RTL support consideration for Arabic/Hebrew
- Locale-aware number/date formatting

---

## 26) Build Readiness Guardrails (Required for Antigravity)

These rules exist to prevent "claimed complete but not actually working" outcomes.

### 26.1 Definition of Done (Per Phase / Per PR)
A task/phase may not be marked **Complete** unless all of the following are provided:
- **File paths + key line references** for each change
- **UI proof:** Screenshots or short screen recording of the flow
- **Acceptance tests:** AT-01…AT-12 executed with outputs (logs + SQL verification where applicable)
- **CTA registry report:** Zero unresolved CTAs (no dead buttons)
- **Rollback note:** How to revert the change safely

### 26.2 Repo Structure & Naming Conventions (Source of Truth)
Agents must follow these conventions:

**Folders:**
| Folder | Contents |
|--------|----------|
| `components/` | UI building blocks |
| `screens/` | Full screens (tab + stack screens) |
| `services/` | Data layer (Supabase queries + domain services) |
| `lib/` | Shared helpers (theme, utils, clients) |
| `supabase/` | Migrations, SQL, edge functions |
| `assets/` | Images, fonts, icons |

**Naming:**
- Components/screens: `PascalCase.tsx`
- Service modules: `camelCase.ts` (e.g., `workoutService.ts`)
- Route names: Consistent string constants; no ad-hoc route strings

**Theme:**
- Theme tokens live in: `metriqfit_theme_v1.ts`
- Theme provider: `ThemeProvider.tsx`
- UI must consume tokens; no random hex colors in components

### 26.3 Permissions & Platform Behavior (Camera + Barcode)
- Camera permission request must be handled with a **single, branded** system prompt + fallback
- If permission denied:
  - Provide fallback CTA: **Quick Add Food (Search)**
- Barcode scanning:
  - Library: `expo-barcode-scanner`
  - Route + UI + permission handling must exist in v1
- Image handling:
  - Save photo locally while user confirms; upload only if/when required (future expansion)

### 26.4 AI Boundaries + Safety Constraints (No Hallucinations)
Hard rules:
- AI may **not** invent exercise IDs; it must reference `exercises.external_id` only
- AI may **not** generate macros; macros/water are computed deterministically
- Nutrition macro math must be: **per-100g reference × grams/100** with rounding rules
- AI output must be validated server-side (Edge Function). If validation fails:
  - Retry with corrected prompt OR
  - Fallback to default templates + a retry button

### 26.5 Environments, Secrets, and Release Engineering
- Environments: `dev`, `staging`, `prod` (at minimum `dev` + `prod`)
- Client uses **Supabase anon key only**
- AI provider keys exist only in server context (Edge Functions / secure env)
- Build/deploy pipeline must specify:
  - How to build
  - How to deploy
  - Where environment variables are configured

---

## 27) Implementation Playbook (Required for Antigravity)

> **Method:** Vertical slices. Each slice must pass its acceptance tests before moving on.
> No phase may begin until the prior phase gate is cleared.

### 27.1 Agent Roles

| Agent | Responsibilities |
|-------|------------------|
| **Shell/Design** | Theme tokens, nav, shared components, motion, typography, CTA registry, accessibility |
| **Backend** | Schema, RLS, Edge Functions, seed scripts, env/secrets, usage counters, migrations |
| **Nutrition** | Daily summary, food logging, water logging, unit conversions, food search |
| **Workout** | Templates, sessions, sets, PRs, history, offline cache, exercise library |
| **AI** | Plan generation, AI Coach grounding, retries, validation, rate limits, safety filters |
| **QA** | Runs AT suite, produces `IMPLEMENTATION_REPORT.md` with evidence, device testing |

### 27.2 Phase Gate Requirements (No Exceptions)

Every phase PR must include:
- [ ] File paths + key diffs
- [ ] Screenshots/video of the flow
- [ ] SQL verification snippets (row counts + example rows)
- [ ] "How to test" steps (reproducible)
- [ ] Pass: `typecheck`, `lint`, `build` (web + mobile)
- [ ] Rollback instructions

---

### 27.3 Slice A — Foundations (Do First, Always)

> This prevents 80% of later rework.

**Deliverables:**

| # | Task | Owner | Output |
|---|------|-------|--------|
| A1 | App shell + theme system | Shell/Design | `ThemeProvider.tsx`, `metriqfit_theme_v1.ts` loaded, dark mode default |
| A2 | Bottom nav + Quick Add FAB | Shell/Design | 5 tabs render, FAB opens sheet, CTA registry wired (stubs OK) |
| A3 | Auth (email/password) | Backend | Sign up, sign in, sign out, session persistence |
| A4 | Profile + onboarding flow | Backend + Shell | `profiles` + `onboarding_answers` rows created on completion |
| A5 | Targets engine | Backend | `user_targets` computed deterministically from onboarding answers |
| A6 | MacroDashboardHero | Shell/Design + Nutrition | Renders real data from `user_targets` |
| A7 | Water logging (Quick Add) | Nutrition | `water_logs` row created, remaining updates on Home |

**Acceptance Tests:** AT-01, AT-02, AT-05

**Exit Criteria (Slice A Complete When):**
- [ ] New user can: create account → complete onboarding → land on Home → see real macros/water → log water → see updated remaining
- [ ] `user_targets` row exists with correct calculations
- [ ] Theme tokens used everywhere (no hardcoded colors)
- [ ] CTA registry throws on unknown IDs in dev

---

### 27.4 Slice B — Nutrition Core

> Get logging + daily summary rock solid before workout plans.

**Deliverables:**

| # | Task | Owner | Output |
|---|------|-------|--------|
| B1 | Food search (basic catalog) | Nutrition | Search `food_items` table, return results |
| B2 | Add food to meal | Nutrition | `meal_logs` + `meal_log_items` rows created |
| B3 | Gram entry + macro math | Nutrition | `(per_100g × grams) / 100` with rounding |
| B4 | Daily totals component | Nutrition | Sum of logged items matches `user_targets` display |
| B5 | Nutrition tab daily view | Nutrition | Shows meals, items, totals, remaining |
| B6 | Home ↔ Nutrition parity | Nutrition + Shell | Both screens show consistent daily totals |

**Acceptance Tests:** AT-02, AT-04, AT-05

**Exit Criteria (Slice B Complete When):**
- [ ] User can: search food → add with custom grams → see daily totals update
- [ ] Home and Nutrition tab show identical macro totals
- [ ] Macro math is correct (verified with manual calculation)

---

### 27.5 Slice C — Workout Core

> Add workout engine since templates are already seeded.

**Deliverables:**

| # | Task | Owner | Output |
|---|------|-------|--------|
| C1 | Program browser | Workout | List programs from `workout_templates` |
| C2 | Day preview | Workout | Show exercises for selected day |
| C3 | Start session | Workout | `workout_sessions` row created with `started_at` |
| C4 | Log sets | Workout | `workout_sets` rows created per exercise |
| C5 | Finish session | Workout | `finished_at` set, duration calculated |
| C6 | PR detection | Workout | `user_prs` updated if new max |
| C7 | Workout history | Workout | List past sessions with summary stats |
| C8 | Exercise library | Workout | Searchable/filterable exercise database |

**Acceptance Tests:** AT-03, AT-06, AT-07

**Exit Criteria (Slice C Complete When):**
- [ ] User can: browse programs → start workout → log all sets → finish → see in history
- [ ] PR badge appears when new max achieved
- [ ] Session duration and volume calculated correctly

---

### 27.6 Slice D — AI Plans + Coach

> Only after targets + logging exist (so AI can be grounded and validated).

**Deliverables:**

| # | Task | Owner | Output |
|---|------|-------|--------|
| D1 | Plan generation Edge Function | AI + Backend | `generate_user_plans` creates `user_workout_plans` + `user_nutrition_plans` |
| D2 | Plan validation | AI | All exercise IDs exist in `exercises` table, all food IDs exist in `food_items` |
| D3 | Plan versioning | Backend | New generation creates new version, old remains accessible |
| D4 | Plan → UI rendering | Workout + Nutrition | Active plan renders in Workout tab and Nutrition tab |
| D5 | AI Coach Edge Function | AI + Backend | `ai_coach_message` receives context, returns grounded response |
| D6 | Coach grounding layer | AI | Coach only references data from `user_targets`, today's logs, last 30 days |
| D7 | Missing data handling | AI | Coach says "I don't see X logged" instead of inventing values |
| D8 | Rate limiting | Backend | Free tier: 10 messages/day enforced server-side |
| D9 | Safety filters | AI | Rejects medical/unsafe requests with safe alternatives |

**Acceptance Tests:** AT-08, AT-09, AT-10

**Exit Criteria (Slice D Complete When):**
- [ ] Plans generate and render without errors
- [ ] AI Coach answers "What are my macros?" with exact `user_targets` values
- [ ] **Negative test passes:** "How many steps today?" (no steps logged) → AI says data is missing
- [ ] Rate limit enforced (11th message blocked on free tier)

---

### 27.7 Slice E — Progress + Polish + Ship

> Final slice: analytics, monetization, notifications, compliance.

**Deliverables:**

| # | Task | Owner | Output |
|---|------|-------|--------|
| E1 | Weight trend chart | Shell/Design | `user_measurements` plotted over time |
| E2 | Nutrition adherence chart | Nutrition | % of target hit per day/week |
| E3 | Workout volume/frequency | Workout | Sets/week, workouts/week trends |
| E4 | Paywall + RevenueCat | Backend | Elite features gated, entitlements checked |
| E5 | Subscription disclosures | Shell/Design | Pricing, trial, cancel instructions visible |
| E6 | Push notifications | Backend + Shell | Opt-in flow, deep links work |
| E7 | Accessibility audit | QA | Touch targets, contrast, screen reader labels verified |
| E8 | Performance audit | QA | Cold start < 3s, AI response < 5s, bundle < 2MB |
| E9 | Account deletion | Backend | Full cascade delete implemented |
| E10 | Store assets | Shell/Design | Screenshots, preview video, descriptions |
| E11 | Privacy policy + compliance | Backend | Policy published, in-app link works |

**Acceptance Tests:** AT-07, AT-11, AT-12, Accessibility checklist, Performance benchmarks

**Exit Criteria (Slice E Complete When):**
- [ ] Progress tab shows real trend data
- [ ] Paywall blocks Elite features for free users
- [ ] Push notifications deliver and deep link correctly
- [ ] VoiceOver/TalkBack pass key flows
- [ ] All performance targets met
- [ ] Account deletion removes all user data
- [ ] App Store / Play Store submission ready

---

### 27.8 Slice Dependency Map

```
Slice A (Foundations)
    ↓
Slice B (Nutrition Core)
    ↓
Slice C (Workout Core)
    ↓
Slice D (AI Plans + Coach)  ← Requires B + C data to ground AI
    ↓
Slice E (Progress + Ship)
```

**Hard rule:** No slice may begin until prior slice passes all acceptance tests.

---

### 27.9 Implementation Report Template

Each slice completion requires a report in this format:

```markdown
# IMPLEMENTATION_REPORT — Slice [X]

## Summary
- Slice: [A/B/C/D/E]
- Date completed: YYYY-MM-DD
- Lead agent: [name]

## Deliverables

| Task | Status | File paths | Evidence |
|------|--------|------------|----------|
| X1   | ✅/❌   | `path/to/file.tsx` | [screenshot link] |

## Acceptance Tests

| Test | Status | Evidence |
|------|--------|----------|
| AT-XX | ✅/❌ | [SQL output / screenshot] |

## SQL Verification
```sql
-- Row counts
SELECT 'profiles' as t, count(*) FROM profiles
UNION ALL SELECT 'user_targets', count(*) FROM user_targets
-- etc.
```

## How to Test (Reproducible Steps)
1. ...
2. ...

## Build Verification
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Mobile build succeeds (if applicable)

## Rollback Instructions
- To revert: ...

## Known Issues / Tech Debt
- ...
```

---

### 27.10 Quick Add Wiring Checklist (Slice A Specific)

Since Quick Add is the primary logging entry point, verify each action:

| # | Action | Route | Slice | Status |
|---|--------|-------|-------|--------|
| 1 | Scan Meal Photo (AI) | `FoodCamera` | E (Elite) | Stub in A |
| 2 | Scan Barcode | `BarcodeScanner` | E (Elite) | Stub in A |
| 3 | Quick Add Food (Search) | `FoodSearch` | B | — |
| 4 | Start / Resume Workout | `ActiveSession` / `WorkoutHome` | C | — |
| 5 | Log Weight | `LogWeightSheet` | A | — |
| 6 | Log Water | `LogWaterSheet` | A | — |
| 7 | Log Steps | `LogStepsSheet` | A | — |

**Rule:** Stubbed actions must show "Coming soon" or "Upgrade to Elite" — never a dead tap.

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.8.1 | 2025-12-30 | Added Section 27: Implementation Playbook with vertical slices (A–E), agent roles, phase gates, dependency map, and implementation report template |
| 1.8 | 2025-12-30 | Fixed section numbering (1–26 sequential), removed duplicate text, added CI/CD pipeline spec, testing framework section, performance benchmarks, disaster recovery, i18n roadmap, resolved barcode library TBD |
| 1.7 | 2025-12-30 | PRD fixes (renumbering attempt, section moves, AT-10, lint rule, rollback, preview video, minors guardrail) |
| 1.6 | 2025-12-30 | Added accessibility, analytics+rate limits, validation/edge cases, push notifications, unit system+conversions, caching, external deps, support flows |
| 1.5 | 2025-12-30 | Added build readiness guardrails, deployment runbook, observability, retention/export, security, QA expansion |
| 1.2 | 2025-12-28 | Initial 5-tab blueprint, onboarding targets spec, workout/nutrition engine integration |
| 1.0 | 2025-12-20 | MVP scope definition |

---

## Appendix A — Edge Function JSON Schemas

Add fields to base schemas:
- `workout_plan.version` (int)
- `workout_plan.is_active` (bool)
- `nutrition_plan.version` (int)
- `nutrition_plan.is_active` (bool)
- `generation_run_id` (uuid)

---

## Appendix B — Deployment Runbook

### Web Deploy
```bash
npm ci
npm run typecheck
npm run build
firebase deploy --only hosting
```

### Staging Mobile
```bash
eas build --profile staging --platform ios
eas build --profile staging --platform android
```

### Production Mobile
```bash
eas build --profile production --platform ios
eas submit --profile production --platform ios
eas build --profile production --platform android
eas submit --profile production --platform android
```

### Rollback (Web)
```bash
firebase hosting:channel:deploy rollback --only hosting
# Or redeploy previous commit:
git checkout <prev-sha> && npm run build && firebase deploy
```

### Rollback (Mobile)
- **iOS:** Submit previous build via App Store Connect, or pause phased rollout
- **Android:** Use Play Console **Halt rollout** + promote previous release
- **EAS:** `eas build` with previous commit, then `eas submit`

---

## Appendix C — Agent Accountability Proof Checklist

No one can claim "done" unless they provide:
- [ ] File paths + line refs
- [ ] Screenshots/video for UI changes
- [ ] Acceptance test run evidence (Diagnostics output)
- [ ] Build + deploy logs for the environment
- [ ] Rollback instructions tested

---

## Appendix D — Quick Reference: Section Index

| # | Section | Purpose |
|---|---------|---------|
| 1 | Source-of-Truth Artifacts | Contract files |
| 2 | Product Summary | What MetriqFit is |
| 3 | Tech Stack | Locked technologies |
| 4 | AI Coach Scope | What AI can/cannot do |
| 5 | Plan Generation | Versioning rules |
| 6 | Navigation Contract | Tabs + Quick Add |
| 7 | App Store Readiness | Submission checklist |
| 8 | Build & Deployment | Environments + deploy steps |
| 9 | CI/CD Pipeline | Automation |
| 10 | Testing Framework | Tools + coverage |
| 11 | Observability | Error tracking + logging |
| 12 | Performance Targets | Benchmarks |
| 13 | Data Retention | Export + deletion |
| 14 | Security | Access control + rate limits |
| 15 | QA / Acceptance Tests | AT-01 through AT-12 |
| 16 | Accessibility | WCAG compliance |
| 17 | Analytics Events | Tracking spec |
| 18 | Input Validation | Bounds + edge cases |
| 19 | Push Notifications | Types + rules |
| 20 | Unit Conversions | Imperial/metric |
| 21 | Caching Strategy | Client-side cache |
| 22 | External Dependencies | Third-party services |
| 23 | Support Flows | Help + error recovery |
| 24 | Disaster Recovery | Backup + failover |
| 25 | Internationalization | i18n roadmap |
| 26 | Build Readiness | Agent guardrails |
| 27 | Implementation Playbook | Vertical slices, agent roles, phase gates |
