# MetriqFit Elite Comprehensive Action Item Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver a production-ready MetriqFit Elite app by resolving audited defects, closing business logic and architecture gaps, and hardening quality/performance/security across web and mobile.

**Architecture:** Keep Expo app as the single UI client, move critical enforcement to Supabase Edge Functions + RLS, and normalize domain logic into typed service modules with strict contracts. Use phased delivery (stabilize -> complete feature parity -> harden platform -> scale) with measurable acceptance gates.

**Tech Stack:** Expo/React Native, Expo Router, TanStack Query, Supabase (Auth/Postgres/RLS/Edge Functions), Firebase Hosting, EAS, Jest/RNTL, Playwright, Maestro.

---

## Inputs and Baseline

- Audit source: `FRONTEND_AUDIT_REPORT.md` (runtime second-pass evidence).
- Product contract source: `PRD/metriqfit_PRD_v1_8_1.md` (Sections 6, 8-27 especially).
- Current execution snapshot: `docs/plans/2026-02-14-wave0-execution-log.md`.

### Current status snapshot

Resolved in Wave 0 (keep regression tests):
- `useUserPRs` crash fix: `hooks/useWorkout.ts:310`, `hooks/index.ts:41`
- workout table mismatch fix: `services/workoutService.ts:271`
- meal-time partial input crash fix: `services/mealTimesService.ts`
- food photo usage empty-row handling: `services/foodPhotoService.ts:48`
- workout summary no-session fallback: `app/(tabs)/workout/summary.tsx:51`
- extraneous tab warning removed: `app/(tabs)/_layout.tsx`
- home quick-action summary route and insight dynamics: `app/(tabs)/home/index.tsx:35`

Still high-risk/open (must plan and implement):
- settings placeholder actions: `app/settings/index.tsx:152`
- check-in placeholder behavior + no persistence: `app/check-in/index.tsx:117`
- progress forecast/consistency logic gaps: `app/(tabs)/progress/index.tsx:62`
- premium gating still inconsistent (client-side paths without server authority)
- CI toolchain instability (`lint`/`typecheck` reliability)

---

## Phase 1: Categorize Audit Findings

## 1) UI/UX Issues

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| UI-01 | Settings has multiple placeholder alerts instead of real screens/actions (`app/settings/index.tsx:152`, `app/settings/index.tsx:159`, `app/settings/index.tsx:177`, `app/settings/index.tsx:184`) | Creates trust loss and dead-end UX | Implement full settings IA with actionable routes and clear disabled states only when intentionally gated | 1) Add routes for Security, Notifications, Units, Theme, Help 2) Replace alerts with navigation 3) Add feature-flagged disabled rows with explanation if not ready | New screens, copy, feature flags | M |
| UI-02 | Progress Photos quick action is placeholder alert (`app/(tabs)/progress/index.tsx:42`) | Breaks expected journaling workflow | Replace with real flow to progress photos or hide until supported | 1) Add `/progress/photos` route 2) Implement photo grid/upload states 3) Update quick action CTA | Storage permissions, media service | M |
| UI-03 | Check-in step 4 still "COMING SOON" (`app/check-in/index.tsx:279`) | Core weekly check-in loop feels fake | Ship real analysis summary cards driven by persisted check-in data | 1) Add check-in computation endpoint 2) Replace placeholder content with computed metrics 3) Add retry/error states | Check-in schema + service | H |
| UI-04 | Check-in photo slots are placeholder alerts (`app/check-in/index.tsx:117`) | Fails user expectation for visual tracking | Integrate camera/gallery picker + secure upload + preview | 1) Add media picker component 2) Add upload pipeline 3) Persist metadata and thumbnails | Storage bucket, permission UX | H |
| UI-05 | Subscription manage action opens store URLs in web context (`app/settings/subscription.tsx:25`) | Confusing web behavior and conversion drop | Provide platform-aware handling: native opens store, web shows billing portal/manual instructions | 1) Detect platform 2) For web open billing portal/help modal 3) Add telemetry for click outcome | Subscription provider/webhook | M |
| UI-06 | Home daily summary route is placeholder screen (`app/(tabs)/home/daily-summary.tsx`) | Summary action has low product value until completed | Implement usable daily recap with calories, workouts, consistency, and recommendations | 1) Build summary aggregates 2) Add cards/charts 3) Link to corrective actions | Analytics + daily totals APIs | M |
| UI-07 | Root tab back behavior on Progress uses `router.back()` (`app/(tabs)/progress/index.tsx:132`) | Non-standard tab UX can produce confusing navigation stacks | Replace with tab-level static header and remove root back action | 1) Remove back CTA on root tabs 2) Keep close/back only on pushed screens | Navigation standards | L |
| UI-08 | Hardcoded/placeholder copy in premium and support flows (paywall + help center) | Weakens compliance and trust (store/legal copy requirements) | Align copy with PRD Section 7 disclosures and support policy | 1) Add disclosure block 2) Add legal links and restore behavior 3) Content review | Legal/compliance copy | M |

## 2) Front-End Functional Issues

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| FE-01 | Progress forecast uses fallback `goalWeight = currentWeight - 10/-5` (`app/(tabs)/progress/index.tsx:62`) | Forecast is inaccurate and misleading | Source goal from persisted targets/onboarding answers | 1) Extend profile/targets query 2) Remove fallback magic numbers 3) Add empty state for missing goal | `user_targets` contract | M |
| FE-02 | Consistency trend chart hardcoded `changePercent={0}` (`app/(tabs)/progress/index.tsx:239`) | KPI card appears broken/static | Compute actual delta over selected timeframe | 1) Build utility from history rows 2) Unit-test calculation 3) Render sign/formatting | Consistency history data | L |
| FE-03 | Settings still mixes route actions + alerts in same list (`app/settings/index.tsx`) | Inconsistent interaction model | Normalize settings items to typed action model (`route`/`toggle`/`external`) | 1) Create config array 2) Render by action type 3) Add dev assertion for unsupported types | Component refactor | M |
| FE-04 | Check-in weight unit label is hardcoded in UI copy path (`app/check-in/index.tsx:185`) | Unit mismatches for metric users | Use computed `weightUnit` everywhere | 1) Replace literal labels 2) Add unit formatting helper 3) Add snapshot tests metric/imperial | Unit conversion helper | L |
| FE-05 | Nutrition recipe action has dead handler (`app/(tabs)/nutrition/food-search.tsx:306`) | Dead controls hurt discoverability and QA reliability | Wire recipe action to recipe detail/log flow or hide | 1) Implement route 2) Add temporary disabled state if missing 3) E2E click test | Recipe route | M |
| FE-06 | Next workout card duration/calories derived from rough exercise-count heuristic (`app/(tabs)/home/index.tsx:155`) | Metric credibility issue | Use planned set/rep/rest metadata and historical pace model | 1) Add estimator utility 2) Pull plan metadata 3) Validate against completed sessions | Workout plan schema | M |
| FE-07 | Entitlement gating mostly client-driven (paywall basic path still direct home) (`app/(onboarding)/paywall.tsx:23`) | Premium features can drift from real entitlement state | Centralize guard logic and always verify server entitlement before premium actions | 1) Add shared `canAccess(feature)` utility 2) Guard premium routes/components 3) Add fallback upsell UX | Server entitlement API | H |
| FE-08 | Multiple “Coming Soon” interactions remain in core surfaces | Incomplete behavior in production paths | Replace with complete features or feature-flagged hidden controls | 1) Build per-feature completion matrix 2) Remove or hide incomplete controls 3) Validate route coverage | Feature flag system | M |

## 3) Backend / API Issues

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| BE-01 | `profiles.meal_times` schema drift in some DB environments; local fallback masks mismatch (`services/mealTimesService.ts:99`) | Silent divergence between local and deployed environments | Enforce migration parity and remove long-term fallback reliance | 1) Add migration verification script 2) Gate app startup on schema check in dev/staging 3) Keep fallback only as temporary safety net | Supabase migrations (`022_add_meal_times_to_profiles.sql`) | M |
| BE-02 | Premium feature enforcement not guaranteed server-side | Security and revenue leakage risk | Enforce plan checks in Edge Functions and sensitive queries | 1) Add entitlement middleware in functions 2) Return structured error codes 3) Add tests for free/elite tiers | Subscription table + edge auth | H |
| BE-03 | Subscription state lifecycle not fully defined (purchase, restore, expiry, grace) | Inconsistent entitlement and UX edge cases | Add authoritative subscription state machine and webhook reconciliation | 1) Define `subscriptions` states 2) Add webhook handler/retry queue 3) Add nightly reconciliation job | RevenueCat/Store APIs | H |
| BE-04 | Plan generation auditability partial | Difficult debugging and trust in generated plans | Persist generation runs with request IDs, validation results, and version metadata | 1) Expand `plan_generation_runs` schema 2) Log inputs/outputs hashes 3) Surface in admin diagnostics | Edge functions + DB migration | M |
| BE-05 | Check-in adjustments are not persisted/applied to targets/plan | Core loop broken between check-in and plan adaptation | Build `apply_check_in_adjustments` function and update target deltas/versioning | 1) Add check-in tables 2) compute adjustment policy 3) regenerate plan version with rationale | Plan versioning pipeline | H |
| BE-06 | Inconsistent idempotency and retry strategy in Edge Functions | Duplicate writes and hard-to-debug transient failures | Add idempotency keys + exponential retry policy with bounded attempts | 1) Add idempotency token fields 2) write conflict-safe upserts 3) standardize retry wrapper | Edge function shared lib | M |
| BE-07 | Observability fields from PRD section 11 not uniformly emitted | Hard to triage production incidents | Standardize log envelope (`request_id`, duration, status, error_code) | 1) Shared logger module 2) patch all functions 3) ship dashboards/alerts | Sentry + log sink | M |

## 4) Business Logic Gaps

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| BL-01 | Goal forecast uses heuristics instead of explicit goal targets (`app/(tabs)/progress/index.tsx:62`) | Incorrect coaching guidance | Bind forecast to `user_targets.goal_weight_kg` and target-date policy | 1) Add goal fields to query 2) compute forecast from trend + explicit target 3) show confidence band | Targets schema | M |
| BL-02 | AI coach context can rely on defaults/TODO values (`services/aiCoachService.ts:430`) | Hallucination and trust risk | Strict grounding contract with “missing data” response policy | 1) Remove default fake context 2) add null-safe context map 3) add grounding tests | AI function contract | H |
| BL-03 | Check-in currently informational, not behavior-changing | Weekly check-in provides no practical effect | Connect check-in outputs to plan deload, calories, hydration, and coaching prompts | 1) define adjustment matrix 2) persist decisions 3) surface change summary to user | Check-in backend pipeline | H |
| BL-04 | Unit handling inconsistent across displays and conversions | Data interpretation errors | Canonical storage in metric; format only at edge; shared conversion helpers | 1) central conversion module 2) refactor screens to helper 3) add tests for all conversions | PRD section 20 | M |
| BL-05 | Streak/consistency semantics not explicitly standardized | Inconsistent motivation metrics | Define streak policy (what counts, skips, rest days) and codify in one service | 1) policy doc 2) service implementation 3) parity tests home/progress/ai coach | Product policy + service refactor | M |

## 5) Performance Problems

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| PERF-01 | Toolchain instability: lint/typecheck unreliable in current workspace | Blocks safe releases and CI confidence | Repair dependency graph and enforce deterministic install | 1) clean install strategy 2) lockfile integrity check in CI 3) preflight script | npm tooling, CI | M |
| PERF-02 | Frequent polling and refetching can create unnecessary load (`nutrition` totals refetch every 30s) | Battery/network overhead and noisy backend traffic | Move to event-driven invalidation after mutations, reduce polling | 1) adjust query stale times 2) invalidate on successful writes 3) monitor request volume | Query key strategy | M |
| PERF-03 | Large lists may not be virtualized/paginated by default (exercise/food) | Slow rendering on lower-end devices | Add pagination + list virtualization contracts | 1) define API pagination 2) use `FlashList/FlatList` optimized props 3) load-test list screens | API pagination endpoints | M |
| PERF-04 | Web animation warnings (`useNativeDriver` fallback) reduce signal/noise | Harder to detect real runtime issues | Refactor unsupported animation props for web-safe paths | 1) isolate web animation config 2) update components 3) ensure console-clean target | Motion component updates | L |
| PERF-05 | No enforced web bundle/perf budget in pipeline | Regressions can ship unnoticed | Add bundle size and TTI checks in CI | 1) add bundle analyzer step 2) fail thresholds per PRD targets 3) publish trend artifacts | Build pipeline updates | M |

## 6) Security Concerns

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| SEC-01 | Premium and usage limits can be bypassed if checked only in client | Revenue abuse and policy violations | Server-enforce all limits and entitlements | 1) edge middleware 2) signed usage checks 3) client displays server truth | Usage tables + edge functions | H |
| SEC-02 | Rate limits need complete server implementation across AI, photo scan, regeneration | Protects cost and abuse surface | Consolidate rate-limit service with daily + rolling windows | 1) shared limiter function 2) function-level guard 3) alert on spikes | `ai_usage_daily` and similar tables | H |
| SEC-03 | Potential sensitive logs without consistent redaction | Compliance and privacy risk | Add redaction policy for PII and tokens in logs | 1) sanitize logger 2) audit existing logs 3) Sentry scrubbing rules | Observability stack | M |
| SEC-04 | Account deletion flow needs strict end-to-end verification (PRD 13.3) | Legal/compliance risk | Implement and verify full cascade delete + session revoke | 1) complete delete function checks 2) add QA script SQL verification 3) final confirmation UX | `delete-account` function + DB policies | H |

## 7) Missing Features

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| MF-01 | Progress photo tracking module missing | Expected core progress modality absent | Build photo timeline with compare views and privacy controls | 1) storage model 2) upload flow 3) comparison UI | Media storage + permissions | H |
| MF-02 | Plan version history UI incomplete | Users cannot trust/compare regenerated plans | Add plan version browser with diffs and rollback | 1) version list endpoint 2) UI compare cards 3) activate prior version action | Plan version schema | H |
| MF-03 | Smart macro auto-adjustment loop absent | Coaching does not adapt automatically | Build weekly adjustment engine tied to adherence + weight trend | 1) define adjustment policy 2) scheduled job 3) user approval workflow | Measurement + adherence data | H |
| MF-04 | Subscription lifecycle management incomplete | Billing and entitlement drift | Full state machine + restore/grace/cancel logic | 1) webhook sync 2) local cache sync 3) graceful downgrade UX | Billing provider integration | H |
| MF-05 | Robust error-state library missing | Inconsistent retries and messaging | Create shared error-state components and error code map | 1) common `ErrorView` 2) route-level usage 3) telemetry hooks | Design system + analytics | M |
| MF-06 | Data validation layers partial | Invalid payloads reach services/functions | Add schema validation on client and server boundaries | 1) zod schemas for DTOs 2) edge validation 3) test malformed payloads | Shared schema package | M |
| MF-07 | Analytics event coverage incomplete vs PRD section 17 | Weak product insights and experiment support | Implement required event taxonomy and QA event verification | 1) event registry 2) instrumentation by flow 3) analytics QA checklist | Analytics SDK | M |
| MF-08 | Admin diagnostics and support tooling missing | Slow incident resolution and poor support workflow | Add dev/admin diagnostics screen + support export | 1) diagnostics route 2) health checks 3) support bundle generation | Auth roles, tooling | M |
| MF-09 | Performance monitoring not integrated (Sentry/perf traces) | No proactive detection of regressions | Add runtime monitoring + alerts | 1) initialize Sentry web/native 2) perf spans on key flows 3) alert thresholds | Sentry setup | M |
| MF-10 | Feature flags and A/B testing absent | Unsafe releases and no experimentation path | Add flag provider + experiment assignment | 1) integrate flag service 2) wrap risky features 3) logging for variant assignment | Config service | M |
| MF-11 | AI response caching and dedupe not implemented | Higher latency/cost for repeated queries | Cache grounded coach responses for short TTL where safe | 1) normalized prompt key 2) TTL cache table/Redis 3) invalidation on new logs | AI pipeline + cache store | M |

## 8) Architectural Weaknesses

| ID | Problem | Why it matters | Recommended fix | Implementation steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| ARCH-01 | Route and CTA wiring is stringly-typed and scattered | Dead buttons and regressions recur | Create centralized typed route/CTA registry with build-time checks | 1) `routeRegistry.ts` and `ctaRegistry.ts` 2) replace inline strings 3) CI fail on unresolved IDs | Router wrappers | M |
| ARCH-02 | Domain logic split across UI components and services | Hard to test and maintain | Move business rules into domain services/hooks and keep UI declarative | 1) extract forecast/check-in logic 2) add unit tests 3) thin components | Refactor budget | M |
| ARCH-03 | Type safety leaks (`any` and implicit shapes) in several data paths | Runtime bugs and weak tooling | Introduce strict DTO typing from Supabase schema and mappers | 1) generate typed clients 2) enforce `noImplicitAny` in touched modules 3) remove unsafe casts | Supabase type generation | M |
| ARCH-04 | Error handling not standardized across services | Inconsistent UX and observability | Define app-wide error taxonomy + mapper | 1) `errors.ts` model 2) service wrappers 3) route-level error boundaries | Shared lib | M |
| ARCH-05 | Test strategy is below PRD acceptance depth | Regressions not caught before release | Add layered test matrix (unit/integration/e2e) tied to AT-01..AT-12 | 1) build test inventory 2) automate critical e2e on web 3) block merges on required tests | CI capacity | H |

---

## Phase 2: Upgrade and Optimization Review (System-by-System)

### A) Signup / Authentication

| Area | Upgrade Proposal |
|---|---|
| Structural upgrade | Introduce auth orchestration service that handles sign-up, profile bootstrap, onboarding status, and guarded redirects as a deterministic state machine. |
| UI simplification | Replace fragmented validation prompts with single inline error model (field + form-level); add password strength and explicit email verification state. |
| Backend efficiency | Move bootstrap writes to one transaction or edge function to prevent partially-created users. |
| Scalability | Add idempotent signup endpoint and retry-safe profile initialization; instrument funnel metrics (`signup_started`, `signup_completed`, `auth_error`). |

### B) Onboarding

| Area | Upgrade Proposal |
|---|---|
| Structural upgrade | Persist onboarding as a versioned draft until final submit; avoid per-screen fragile writes. |
| UI simplification | Add step autosave, progress persistence, and clear validation gating before next step. |
| Backend efficiency | Compute deterministic targets in one server operation after completion and persist with audit metadata. |
| Scalability | Add onboarding schema versioning to support future questions without breaking old clients. |

### C) Plan Generation

| Area | Upgrade Proposal |
|---|---|
| Structural upgrade | Split generation into: validate input -> generate candidate -> validate constraints -> persist version -> activate. |
| UI simplification | Surface transparent generation status (queued, running, complete, fallback used) and recovery actions. |
| Backend efficiency | Add structured retries and fallback templates when model fails; cache static template fragments. |
| Scalability | Store generation artifacts and checksums to support replays, diffing, and audit at scale. |

### D) Paywall / Subscription

| Area | Upgrade Proposal |
|---|---|
| Structural upgrade | Introduce authoritative entitlement service (server truth first, client cache second). |
| UI simplification | Show plan comparison, trial terms, billing date, and platform-specific management instructions in one component. |
| Backend efficiency | Webhook-driven entitlement updates with reconciliation job; no client-only status assumptions. |
| Scalability | Support future tiers and feature bundles via `feature_entitlements` table rather than hardcoded booleans. |

### E) Dashboard (Home + Progress + Quick Add)

| Area | Upgrade Proposal |
|---|---|
| Structural upgrade | Build `daily_snapshot` aggregation layer (targets + logs + streak + next actions) consumed by Home/Progress/AI Coach. |
| UI simplification | Prioritize one primary CTA per card; hide unavailable controls instead of placeholders. |
| Backend efficiency | Reduce N+1 reads by using consolidated query/view for daily summary data. |
| Scalability | Add caching and incremental recompute after logs to keep p95 dashboard load under target. |

---

## Phase 3: Missing Feature Expansion

| Feature Area | Current Gap | Full Implementation Plan | Dependencies | Complexity |
|---|---|---|---|---|
| Progress tracking system | Charts exist but insights and photos are incomplete | Add unified progress domain (measurements, photos, adherence, PRs) + insights engine + compare periods | Measurement/photo schema + chart service | H |
| Plan versioning/regeneration | PRD requires history + active switching; partial | Build plan version timeline, diff viewer, rollback action, and generation run metadata | Plan schema migrations + UI routes | H |
| Smart macro auto-adjustments | Not automated | Weekly cron/trigger computes delta from trend+adherence; propose changes with user confirmation | Targets + adherence calculations | H |
| Subscription state management | Partial local status | Implement webhook sync, grace periods, restore flow, downgrade handling, and entitlement cache invalidation | Billing provider + edge functions | H |
| Error state handling | Inconsistent manual alerts | Standard error taxonomy and reusable retry/offline components across all tabs | Shared error package | M |
| Data validation layers | Partial client checks | Add Zod validation for form inputs, API DTOs, edge requests/responses | Shared schema module | M |
| Analytics tracking | Core events missing parity | Implement PRD section 17 event matrix + event QA harness in staging | Analytics SDK + QA tooling | M |
| Admin tools | No diagnostics or support console | Add hidden diagnostics screen + admin query endpoints + support export bundle | Role-based auth | M |
| Logging systems | No unified request IDs everywhere | Standardize app and edge logs with correlation IDs and severity levels | Logger module + ingestion | M |
| Performance monitoring | No target enforcement | Add Sentry performance, web vitals, bundle budget checks, and release dashboards | Sentry + CI | M |
| Feature flags | No staged rollout controls | Integrate provider and wrap risky/incomplete features | Config/remote flags service | M |
| A/B testing | No experiment framework | Add assignment service, event attribution, and exposure logging | Analytics + flags | M |
| AI response caching | No dedupe/cache path | Implement short-TTL cache for deterministic/coaching queries with invalidation on new logs | Cache store + invalidation hooks | M |
| Rate limiting | Not uniform across all AI/sensitive endpoints | Central rate-limit middleware and consistent client messaging on limits/reset time | Usage tables + edge middleware | H |
| Security hardening | Gaps in deletion verification/log redaction | Add threat model, sensitive log scrubbing, stricter RLS audits, account deletion compliance tests | Security review + CI checks | H |

---

## Phase 4: Technical Architecture Improvements

## 4.1 State management
- Move from screen-local derived state to domain slices: `authState`, `dailySnapshotState`, `planState`, `subscriptionState`, `checkInState`.
- Keep server state in TanStack Query; keep ephemeral UI state local.
- Add selectors/computed helpers to prevent duplicate business logic across Home/Progress/AI.

## 4.2 Data flow integrity
- Introduce typed DTO mappers between Supabase rows and UI models.
- Enforce one write path per domain action (`logWater`, `logFood`, `startWorkout`, `completeCheckIn`).
- Add request correlation IDs from client to edge for every mutation.

## 4.3 API structure
- Create edge function contract map:
  - `generate_user_plans`
  - `ai_coach_message`
  - `apply_check_in_adjustments` (new)
  - `enforce_entitlement` (middleware helper)
- Standardize response envelope `{ ok, data, error: { code, message, retryable } }`.

## 4.4 Database schema improvements
- Add/normalize:
  - `check_in_runs`, `check_in_metrics`, `check_in_adjustments`
  - `plan_generation_runs` (extended fields)
  - `feature_entitlements`
  - `event_log` (or analytics sink bridge)
- Add constraints/indexes for high-volume queries (`user_id`, `log_date`, `created_at`).
- Add schema parity check in CI against expected migration head.

## 4.5 Modularity and code reuse
- Consolidate duplicated helpers for units, percent change, date formatting, and error messaging in `lib/domain/*`.
- Move CTA declarations into one source (`components/navigation/ctaRegistry.ts`).
- Replace alert placeholders with reusable `FeatureUnavailableCard` or hidden controls.

## 4.6 Error handling strategy
- Add global typed error classes (`ValidationError`, `AuthError`, `RateLimitError`, `NetworkError`, `EntitlementError`).
- Add route-level error boundaries for tab stacks.
- Implement consistent retry UI and offline fallback based on error type.

## 4.7 Test coverage (unit, integration, E2E)
- Unit: service calculations, conversion helpers, forecast math, entitlement checks.
- Integration: Supabase service calls with mocked edge responses.
- E2E (web + mobile): enforce AT-01..AT-12 from PRD section 15.
- Add regression suite for Wave 0 fixes to prevent backslides.

## 4.8 DevOps / CI/CD upgrades
- Required PR gates: `lint`, `typecheck`, unit tests, web build, route/CTA integrity test.
- Nightly staging smoke: auth -> onboarding -> paywall -> tabs -> quick add.
- Release checklist automation: migration head check, env var check, bundle budget check, test evidence artifact upload.

---

## Prioritized Execution Roadmap

## Wave 1 (Stabilization, 1-2 weeks)
- Fix open high-risk frontend/backend defects from Phase 1 (settings/check-in/progress/entitlements).
- Repair CI toolchain integrity and enforce deterministic local/CI installs.
- Add regression tests for fixed critical issues.

## Wave 2 (Core Product Completion, 2-4 weeks)
- Complete check-in persistence + adjustments.
- Complete progress module (goal forecast correctness, photos flow).
- Complete settings and subscription UX parity web/mobile.

## Wave 3 (Platform Hardening, 3-5 weeks)
- Implement observability/logging standards, error taxonomy, performance budgets.
- Complete server-side rate limits + entitlement middleware + deletion verification.
- Deploy diagnostics/admin tooling.

## Wave 4 (Scale and Experimentation, 4-8 weeks)
- Ship feature flags + A/B testing framework.
- Implement macro auto-adjustment and AI cache optimization.
- Add plan version diffing and advanced personalization loops.

---

## Dependency Map (Critical)

- Entitlement middleware depends on subscription lifecycle/webhooks.
- Check-in adjustments depend on new check-in schema and plan versioning.
- Accurate progress forecasts depend on `user_targets` and unit normalization.
- A/B testing depends on analytics event parity and feature flags.
- Performance budgets depend on stable CI build pipeline.

---

## Success Criteria and Exit Gates

- Zero critical runtime crashes across audited flows.
- Zero dead primary CTA/buttons in user-facing flows.
- Server-side enforcement for premium gates and usage limits.
- AT-01..AT-12 pass with evidence in implementation reports.
- Web bundle, TTI, and AI response performance meet PRD thresholds.
- Account deletion verified end-to-end with SQL proof.

---

## Execution Tracking Template

Use this per wave/workstream in `docs/plans/`:

- Workstream name:
- Owner:
- Start date / target date:
- In scope issue IDs:
- Completed tasks:
- Verification evidence (screenshots/logs/tests):
- Risks/blockers:
- Rollback plan:

