# MetriqFit Elite Action Item Implementation Plan

Date: February 14, 2026  
Inputs: `FRONTEND_AUDIT_REPORT.md`, `PRD/metriqfit_PRD_v1_8_1.md`

## 0) Plan Intent
This plan converts audit findings into an implementation program that stabilizes the product, fixes systemic correctness gaps, hardens backend/data contracts, improves UX and conversion, and prepares the app for scalable release operations. It is intentionally broader than bug-fixing and includes architecture, observability, testing, and growth tooling.

## 1) Delivery Principles
- Fix user-blocking correctness issues before optimization.
- Enforce contract-first data flow (DB schema, service types, UI assumptions).
- Prefer server-side enforcement for subscriptions, rate limits, and safety controls.
- Instrument all critical flows before scaling or experimentation.
- Ship in waves with hard exit criteria and rollback plans.

## 2) Phase 1: Categorized Audit Findings

### 2.1 UI/UX Issues
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| UI-01 | Settings actions show placeholder alerts (Security, Notifications, Units, Theme, Help). | Creates dead-end UX and trust loss. | Replace placeholders with real screens or hide behind clear "Coming soon" cards in one roadmap area. | 1) Add routes/components for each settings domain. 2) Wire settings registry instead of inline handlers. 3) Add visual status tags (`available`, `beta`, `planned`). | `app/settings/index.tsx`, settings routes | Medium |
| UI-02 | Home quick action `Summary` routes to Nutrition root. | Misleading IA and unnecessary navigation friction. | Route to actual summary destination or relabel action. | 1) Define canonical IA map. 2) Update CTA mapping. 3) Add route assertion tests. | `app/(tabs)/home/index.tsx`, route map | Low |
| UI-03 | Subscription manage on web opens Play Store/Google sign-in flow. | Broken experience on web users; poor conversion and support overhead. | Platform-aware subscription management UX. | 1) Detect web platform. 2) On web, show in-app subscription state + support CTA instead of store deep link. 3) Keep native deep links only for mobile. | `app/settings/subscription.tsx`, subscription service | Medium |
| UI-04 | Daily Summary screen is placeholder-only. | Breaks expectation of dashboard depth and continuity. | Implement MVP summary content from existing logs. | 1) Add summary cards (macros, water, workout, streak). 2) Use existing queries. 3) Add empty/error/loading states. | `app/(tabs)/home/daily-summary.tsx`, user/nutrition/workout hooks | Medium |
| UI-05 | Check-in final CTA says "Accept Updates" but no plan changes applied. | Misleading affordance and trust erosion. | Match CTA text to actual behavior or implement updates. | 1) If still placeholder, rename CTA to "Finish Check-In". 2) If implementing, persist adjustments and show diff confirmation. | `app/check-in/index.tsx`, plan/targets services | Low (copy only) / High (full feature) |

### 2.2 Front-End Functional Issues
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| FE-01 | Personal Records crashes (`useUserPRs` not a function). | Hard runtime failure on core progress flow. | Implement `useUserPRs` hook and align exports/imports. | 1) Add hook in `hooks/useWorkout.ts`. 2) Update `hooks/index.ts` export consistency. 3) Add route-level smoke test. | workout service PR query support | Medium |
| FE-02 | Meal time input crash on partial time (`minutes.toString`). | User data entry crash on settings route. | Guard/validate parsing before formatting. | 1) Update `formatTime12h` for invalid/partial strings. 2) Render fallback label until valid. 3) Add unit tests for malformed input. | `services/mealTimesService.ts`, `app/settings/meal-times.tsx` | Low |
| FE-03 | Workout summary can remain in perpetual loading when `sessionId` absent/invalid. | Broken navigation endpoint and poor recovery. | Add explicit invalid-state handling. | 1) Validate `sessionId` param. 2) Show actionable empty/error state with back CTA. 3) Add guard tests. | `app/(tabs)/workout/summary.tsx` | Low |
| FE-04 | Tabs layout warning for extraneous `quick-add-placeholder`. | Noisy runtime and fragile nav setup. | Remove extraneous tab declaration; keep FAB separate from Tabs routes. | 1) Delete placeholder route entry. 2) Verify tab order and labels. 3) Snapshot test tab config. | `app/(tabs)/_layout.tsx` | Low |
| FE-05 | Web warnings (`pointerEvents` deprecation, animation fallback). | Technical debt and potential future breakage/perf drift. | Migrate deprecated props and animation behavior for web. | 1) Replace deprecated prop usage. 2) Gate native-driver settings by platform. 3) Track warning-free baseline in CI. | layout + premium background components | Medium |

### 2.3 Backend / API Issues
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| BE-01 | Start session reads wrong table (`workout_plan_exercises` vs `user_workout_plan_exercises`). | Prevents planned workout sessions from loading exercises. | Align service query to canonical table contract. | 1) Replace table reference. 2) Add typed query helper. 3) Add integration test for session creation with planned day. | `services/workoutService.ts`, DB schema | Medium |
| BE-02 | `profiles.meal_times` query returns 400 (schema mismatch). | Meal schedule feature unreliable or non-functional. | Resolve schema drift (migration + type generation + runtime fallback). | 1) Confirm deployed schema. 2) Apply migration across envs. 3) Regenerate Supabase types. 4) Add startup schema health check. | `supabase/migrations`, `lib/supabase/types.ts` | High |
| BE-03 | AI usage query uses `.single()` and fails on no-row day (`406`). | False error path for new users/days and rate-limit instability. | Use `.maybeSingle()` and default row semantics. | 1) Update usage queries. 2) Normalize read/write path to upsert. 3) Add tests for missing usage row. | `services/foodPhotoService.ts`, usage table/RPC | Medium |
| BE-04 | Entitlement logic not consistently enforced before premium navigation. | Revenue leakage and inconsistent behavior across platforms. | Centralize entitlement checks in service + server gates. | 1) Create entitlement guard utility. 2) Enforce in paywall and premium routes. 3) Add edge-function verification for premium actions. | subscription service, edge functions | High |
| BE-05 | Error responses are not normalized across services/edge functions. | Hard to render consistent recovery UI and monitor failures. | Introduce domain error model (`code`, `message`, `retryable`, `context`). | 1) Add shared error contract module. 2) Wrap Supabase/edge errors. 3) Map UI error states to codes. | services layer, edge functions | Medium |

### 2.4 Business Logic Gaps
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| BL-01 | Paywall CTAs route directly to app without purchase/entitlement. | Breaks monetization model and product rules. | Enforce entitlement-state transition before routing. | 1) Add explicit free vs elite path. 2) Show trial/purchase state. 3) Route to app only after entitlement resolution. | `app/(onboarding)/paywall.tsx`, subscription hooks | High |
| BL-02 | Check-in adjustments are informational, not actionable. | No adaptive planning loop; low feature value. | Implement check-in-driven plan/target updates with preview + confirm. | 1) Define adjustment rules. 2) Create edge function to apply adjustments. 3) Persist change log and show plan version delta. | targets + plan services + DB tables | High |
| BL-03 | Home insight banner is static. | Reduces personalization credibility. | Drive insight from actual daily adherence data. | 1) Define insight rules engine. 2) Fetch status. 3) Render contextual copy variants. | home hooks, nutrition/workout logs | Medium |
| BL-04 | Check-in metric unit label hardcoded to lbs. | Incorrect display for metric users. | Use canonical unit-system conversion everywhere in check-in. | 1) Replace hardcoded label. 2) Convert values by user unit. 3) Add snapshot tests for both unit systems. | `app/check-in/index.tsx`, profile unit preference | Low |
| BL-05 | Food camera confirm flow is placeholder and does not persist analyzed meal items. | High-friction premium feature with low completion. | Implement review-and-save flow with editable items. | 1) Add AI result review screen/state. 2) Save selected items into meal logs. 3) Track completion analytics. | `app/(tabs)/nutrition/food-camera.tsx`, nutrition service | High |

### 2.5 Performance Problems
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| PERF-01 | No enforced performance guardrail in current implementation flow. | Regressions can silently ship. | Implement PRD performance gates in CI. | 1) Add web bundle size check. 2) Add TTI smoke benchmarks. 3) Fail CI on threshold breach. | CI pipeline, build scripts | Medium |
| PERF-02 | Potentially heavy screens (food/exercise search) risk non-virtualized lists and expensive rerenders. | Poor UX on low-end devices and larger datasets. | Virtualize lists + memoize item rows + debounce queries. | 1) Audit list components. 2) Apply FlashList/FlatList optimizations. 3) Add perf profiling script. | nutrition/workout list screens | Medium |
| PERF-03 | Edge/AI calls may block UX without background status model. | Perceived slowness and user abandonment. | Use async job pattern with polling/websocket status. | 1) Create generation job table/status. 2) Update UI to reflect queued/running/failed/success. 3) Add retries/backoff. | plan generation function + UI | High |
| PERF-04 | Runtime warnings from animation fallback on web. | JS-thread overhead and animation jank. | Introduce platform-specific animation strategy. | 1) Disable unsupported native-driver paths on web. 2) Simplify expensive Moti transitions in high-frequency screens. | animation components | Medium |

### 2.6 Security Concerns
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| SEC-01 | Premium feature access can be bypassed through client navigation. | Revenue/security boundary failure. | Server-enforced entitlement checks for all premium actions. | 1) Validate entitlement in edge functions. 2) Return 403 with structured code. 3) Gate UI with same source of truth. | subscription service + edge functions | High |
| SEC-02 | Rate-limiting can behave inconsistently when usage rows are absent. | Abuse risk and unreliable tier controls. | Atomic upsert + server-side limiter for coach/photo/regen APIs. | 1) Consolidate limiter RPCs. 2) Add daily and rolling-window checks. 3) Surface remaining quota to client. | `ai_usage_daily`, RPC functions | High |
| SEC-03 | Error/logging paths may expose sensitive internals in client console. | Information leakage and support/security risk. | Sanitize client-visible errors and centralize secure logging. | 1) Implement log redaction utility. 2) Strip stack/internal DB details in production builds. 3) Send detailed traces to Sentry only. | error middleware, Sentry integration | Medium |
| SEC-04 | Account deletion flow not verified against PRD cascade requirements. | Compliance/privacy exposure. | Implement and test irreversible cascade deletion. | 1) Add secure delete flow + re-auth check. 2) Execute DB cascade function. 3) Verify table-level deletion checklist. | settings UI, edge function, DB policy | High |

### 2.7 Missing Features
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| MF-01 | Progress photo tracking is not implemented. | Weak adherence/motivation loop and missing premium value. | Build photo timeline with secure storage and privacy controls. | 1) Add upload/capture flows. 2) Persist metadata. 3) Render chronological comparison UI. | storage bucket, progress UI | High |
| MF-02 | Check-in photo analysis and adjustment engine is missing. | Core weekly adaptation promise unfulfilled. | Add analysis pipeline + recommendation diff + apply flow. | 1) Collect inputs. 2) Generate recommendation payload. 3) User approve/reject with audit log. | check-in, plan service, edge AI | High |
| MF-03 | Daily Summary experience is placeholder. | App lacks daily closure view for behavior reinforcement. | Implement summary screen with actionable deltas and recommendations. | 1) Aggregate today metrics. 2) Add completion score. 3) Add "next best action" CTA. | home/nutrition/workout/progress data | Medium |
| MF-04 | Plan history/version browsing is not exposed in UX. | Users cannot understand plan changes over time. | Add plan version history UI with compare view. | 1) Build version list route. 2) Show differences (macros, split, volume). 3) Add restore option with safeguards. | plan tables/services | High |
| MF-05 | Robust error states/retry UX is inconsistent across flows. | High failure frustration and abandonment on flaky network. | Introduce standard error-state components and retry policy. | 1) Shared `AsyncState` component. 2) Route-level error boundaries. 3) Retry/backoff strategy per API type. | frontend shared components/services | Medium |

### 2.8 Architectural Weaknesses
| ID | Problem | Why It Matters | Recommended Fix | Implementation Steps | Dependencies | Complexity |
|---|---|---|---|---|---|---|
| ARCH-01 | Contract drift between DB schema and frontend assumptions. | Causes runtime 400/404/406 and brittle releases. | Add contract validation gate in CI and environment health checks. | 1) Compare generated types vs migrations. 2) Add startup health endpoint checks. 3) Block deploy on mismatch. | CI, Supabase types, migrations | High |
| ARCH-02 | Hook/service exports are not protected by integration tests. | Missing exports can crash routes in production. | Add route smoke tests and exported API contract tests. | 1) Add test for each route mount. 2) Add hook export snapshot tests. 3) Run in PR pipeline. | test framework setup | Medium |
| ARCH-03 | Navigation/CTA wiring is distributed and weakly governed. | Dead links and misroutes recur. | Implement centralized CTA/route registry with compile-time types. | 1) Define route constants. 2) Map CTA IDs to typed handlers. 3) Add dev-time assertion for unknown CTAs. | navigation and quick add components | Medium |
| ARCH-04 | Business logic split across UI/service layers without domain boundaries. | Hard to test, reason, and evolve. | Introduce domain modules (`auth`, `plans`, `nutrition`, `workout`, `billing`, `coach`). | 1) Move rules to domain services. 2) Keep screens presentational. 3) Add integration tests per domain. | refactor across app/services/hooks | High |
| ARCH-05 | Observability/testing guardrails from PRD are not fully operationalized. | False "green" releases and hard post-release debugging. | Implement PRD CI/CD + Sentry + diagnostics screen + AT automation. | 1) Add PR checks + coverage gates. 2) Add Sentry tags. 3) Build dev diagnostics route. | CI, observability tooling, QA | High |

## 3) Phase 2: Upgrade and Optimization Review

### 3.1 Signup System
Structural upgrades:
- Move to explicit auth state machine: `unauthenticated -> registering -> verifying -> onboard-required -> active`.
- Add backend-driven auth/session health endpoint and silent token-refresh telemetry.

UI simplifications:
- Merge sign-up and sign-in visual patterns with progressive disclosure.
- Add inline validation before submit, and clear auth error mapping (`invalid_credentials`, `email_taken`, network timeout).

Backend efficiency improvements:
- Consolidate profile bootstrap into one transaction (auth user + profile defaults + analytics event).
- Reduce post-auth round trips via batched bootstrap endpoint.

Scalability improvements:
- Add idempotent registration endpoint for repeated submits.
- Add antifraud/rate-limiting around auth attempts.

### 3.2 Onboarding System
Structural upgrades:
- Persist per-step completion in `onboarding_answers` to allow recovery/resume.
- Add deterministic target calculation checksum for auditability.

UI simplifications:
- Use single form shell with consistent controls, progress, and save/resume feedback.
- Replace placeholder text with contextual helper copy and limits.

Backend efficiency improvements:
- Submit consolidated payload once per step group instead of per-field network writes.
- Validate all computed targets server-side once and return complete object.

Scalability improvements:
- Version onboarding schema and maintain backward compatibility for older users.
- Instrument drop-off analytics per step for funnel optimization.

### 3.3 Plan Generation System
Structural upgrades:
- Convert synchronous generation to job model (`queued`, `running`, `failed`, `completed`).
- Add plan version diff and rollback metadata.

UI simplifications:
- Replace static loading sequence with real progress states and retry reasons.
- Provide deterministic fallback: "Use baseline plan now, regenerate in background".

Backend efficiency improvements:
- Cache reusable template computations by goal/profile archetype.
- Enforce edge validation and reject invalid exercise/food references before write.

Scalability improvements:
- Queue generation requests and enforce per-user concurrency limits.
- Add model/provider failover and timeout budgets (p95 under PRD target).

### 3.4 Paywall and Subscription System
Structural upgrades:
- Add single entitlement gateway service consumed by all premium features.
- Normalize subscription states (`free`, `trialing`, `active`, `grace`, `expired`, `canceled`).

UI simplifications:
- Make paywall states explicit: trial info, billing date, restore path, current tier.
- On web, avoid native-store deep links as primary action; provide account/support path.

Backend efficiency improvements:
- Sync entitlements via webhook-first model; client only reads normalized entitlement state.
- Store subscription ledger for audit and reconciliation.

Scalability improvements:
- Add experimentation framework for paywall variants by cohort.
- Add server-driven offer configuration without app redeploy.

### 3.5 Dashboard (Home + Progress) System
Structural upgrades:
- Introduce card registry driven by user context and feature flags.
- Build unified daily aggregate endpoint for home/progress consistency.

UI simplifications:
- Replace static insight text with dynamic card stack (`on track`, `behind`, `action needed`).
- Expose one-tap "next best action" buttons.

Backend efficiency improvements:
- Precompute daily summary materialized view to avoid repeated expensive queries.
- Cache frequently needed aggregates with short TTL.

Scalability improvements:
- Support card-level lazy loading and skeleton placeholders.
- Add personalized ranking model for dashboard card priority.

## 4) Phase 3: Missing Feature Expansion

| Feature Area | Current State | Expansion Plan | Dependencies | Complexity |
|---|---|---|---|---|
| Progress tracking systems | Basic screens exist; records/photos incomplete; some placeholders. | Implement full trend suite: weight, volume, adherence, photo timeline, milestone badges, weekly recap. | measurements/workout/nutrition aggregates, storage | High |
| Plan versioning/regeneration | Data model supports versions; UX and compare/restore not complete. | Add plan history center with version compare, restore, and regeneration reason tags. | plan tables + generation run logs | High |
| Smart macro auto-adjustments | Check-in mentions adjustments but does not apply. | Add rules engine and optional AI-assisted adjustment proposals with user approval workflow. | targets service, check-in engine | High |
| Subscription state management | Mixed client behavior; inconsistent entitlement gating. | Centralize entitlement state, enforce server-side checks, add billing state UI and webhook reconciliation. | billing provider + edge functions | High |
| Error-state handling | Inconsistent loading/error/retry across routes. | Build shared async-state pattern, typed error codes, and recovery CTAs per domain. | shared UI kit + error model | Medium |
| Data validation layers | Partial validation at UI; weak server contract validation. | Add Zod schemas at route/service boundaries and edge-function input/output validation. | shared schema package | Medium |
| Analytics tracking | PRD event list exists; implementation incomplete. | Implement event instrumentation, taxonomy governance, and funnel dashboards. | analytics provider + event adapter | Medium |
| Admin tools | No operational admin console/diagnostics beyond local checks. | Add role-restricted admin/ops panels for user support, entitlements, and job retries. | auth roles + secure admin APIs | High |
| Logging systems | Console logs only in many flows. | Add structured app logging + edge request tracing + Sentry breadcrumbs. | Sentry/log pipeline | Medium |
| Performance monitoring | No continuous p95 dashboards. | Track TTI, API latency, AI response latency, bundle size in CI and runtime telemetry. | perf tooling + CI | Medium |
| Feature flags | Not systematically present. | Introduce server-driven feature flags by cohort/platform/environment. | config service, client SDK | Medium |
| A/B testing capabilities | Not present. | Build experiment assignment and metrics attribution layer for paywall and onboarding variants. | analytics + feature flags | High |
| AI response caching | No response cache strategy. | Cache grounded AI responses for repeated intents with invalidation by context timestamp. | coach context hash, cache table | Medium |
| Rate limiting hardening | Partial and inconsistent for empty-row conditions. | Implement unified quota service (daily + rolling) with deterministic client display of remaining quota/reset. | `ai_usage_daily`, RPCs, edge guards | High |
| Security hardening | RLS and policies not fully verified against all flows. | Perform full policy audit, add automated RLS tests, enforce secrets and redaction policies. | DB policies + CI checks | High |

## 5) Phase 4: Technical Architecture Improvements

### 5.1 State Management
- Standardize on server-state via React Query and local UI-state via co-located component state.
- Create domain query-key factory modules to prevent invalidation drift.
- Add optimistic update strategy only for low-risk local writes (water/steps), keep high-risk writes pessimistic.

### 5.2 Data Flow Integrity
- Define shared schema package for client + edge function payload validation.
- Add "contract tests" that mount each route and verify required hooks/services resolve.
- Add env startup health check route for schema and RPC availability.

### 5.3 API Structure
- Wrap Supabase calls behind domain services with typed outputs and normalized errors.
- Add edge endpoints for high-value aggregates (`daily_summary`, `dashboard_cards`, `entitlement_status`).
- Add idempotency keys for plan generation and purchase callbacks.

### 5.4 Database Schema Improvements
- Resolve `meal_times` schema drift and establish migration discipline across envs.
- Add constraints/indexes for frequent filters (`user_id`, `logged_date`, `usage_date`, `is_active`).
- Add generation audit tables (`plan_generation_runs`, failure codes, duration).

### 5.5 Modularity and Code Reuse
- Restructure by feature domains: `features/auth`, `features/onboarding`, `features/workout`, `features/nutrition`, `features/progress`, `features/coach`, `features/billing`.
- Keep screens thin; move business rules to services/use-cases.
- Introduce shared design primitives and async-state components.

### 5.6 Error Handling Strategy
- Create global error taxonomy (`AUTH_*`, `SUBSCRIPTION_*`, `RATE_LIMIT_*`, `PLAN_*`, `NETWORK_*`).
- Add route-level error boundaries with domain-specific recovery actions.
- Enforce production-safe user messaging while preserving detailed traces in observability tools.

### 5.7 Test Coverage Improvements
- Unit: reach PRD targets (70% services, 50% components minimum).
- Integration: add service + edge function contract tests for all critical mutations.
- E2E: implement Playwright and Maestro suites for AT-01 to AT-12.
- Add route smoke tests to catch missing exports and crash-on-mount failures.

### 5.8 DevOps and CI/CD Upgrades
- Enforce PR gates: lint, typecheck, unit tests, build, smoke E2E.
- Add performance gates (bundle size, key route load timings in CI smoke run).
- Add staged deployment with manual promotion and instant rollback playbooks.
- Add release checklist artifact generated per deployment.

## 6) Execution Roadmap (Recommended)

### Wave 0: Stabilization (Week 1)
- Fix C-01, C-02, C-03, FE-04, BE-03.
- Exit criteria: zero crash-on-navigation in audited routes; no 404/406 from known contract issues.

### Wave 1: Contract and Monetization Integrity (Weeks 2-3)
- Fix BE-02, BL-01, SEC-01, SEC-02.
- Implement entitlement gateway and schema health checks.
- Exit criteria: paywall and premium actions gated server-side; schema checks green across envs.

### Wave 2: Core Product Completion (Weeks 4-6)
- Implement MF-03, MF-01/MF-02 foundational pieces, BL-02, BL-03, UI-01.
- Exit criteria: no placeholder-only critical routes on main journey.

### Wave 3: Architecture + Observability (Weeks 7-9)
- Implement ARCH-01 to ARCH-05, error taxonomy, diagnostics screen, Sentry.
- Exit criteria: actionable monitoring and deterministic failure handling live.

### Wave 4: Performance + Scale + Experimentation (Weeks 10-12)
- Implement PERF-01 to PERF-04, feature flags, analytics completeness, A/B test framework.
- Exit criteria: PRD performance targets tracked and enforced; experimentation pipeline live.

## 7) Ownership Model
- Frontend Platform: FE-01/02/03/04/05, UI consistency, async-state components.
- Backend/Edge: BE-series, entitlement/rate limits, contract validation.
- Product Logic: BL-series, check-in adaptation rules, dashboard intelligence.
- Growth/Monetization: paywall experiments, entitlement UX, subscription analytics.
- QA/Release: AT suite automation, CI policy, regression dashboards.

## 8) Success Metrics
- Reliability: crash-free sessions > 99.5% on web and mobile.
- Conversion: onboarding completion rate and paywall conversion uplift.
- Performance: meet PRD thresholds (Home TTI < 2s, AI p95 < 5s, bundle < 2MB gzipped).
- Quality: zero dead primary CTAs; no unresolved schema-drift incidents in release window.
- Operations: MTTR < 30 minutes for P1 regressions using structured logs and rollback runbook.

## 9) Immediate Next Actions (This Week)
1. Implement FE-01, BE-01, FE-02 as a single stabilization PR with route smoke tests.
2. Run full E2E pass for auth/onboarding/tabs/quick-add and attach evidence to report.
3. Open architecture RFC for entitlement gateway + schema health checks.
4. Create backlog tickets from all IDs in this plan and assign owners/dates.
