# MetriqFit MASVS Release Audit

Last updated: 2026-05-08

Scope: Expo SDK 54 / React Native mobile app, Supabase Auth/Postgres/Storage/Edge Functions, RevenueCat subscriptions, AI food/photo/coach flows, progress photos, workout and nutrition data.

References:
- OWASP MASVS: https://github.com/OWASP/masvs
- MASVS controls YAML: https://raw.githubusercontent.com/OWASP/masvs/master/OWASP_MASVS.yaml

## Executive Status

| Area | Status | Release posture |
| --- | --- | --- |
| MASVS-STORAGE | Partial | Auth session storage is in SecureStore and private progress-photo storage exists, but local cache and screenshot leakage need a full pass. |
| MASVS-CRYPTO | Partial | No custom crypto found in the reviewed paths; key lifecycle is blocked by leaked key rotation/history purge. |
| MASVS-AUTH | Partial | P0 public entitlement/auth RPC paths were removed or locked down. User-facing Edge Functions now use gateway JWT verification; two admin batch functions remain secret-gated exceptions. |
| MASVS-NETWORK | Partial | HTTPS endpoints are used by configuration, but cleartext/native transport and pinning decisions are not yet documented. |
| MASVS-PLATFORM | Needs review | Deep links, app screenshots, notifications, WebViews, file/image pickers, and permission minimization need native-device validation. |
| MASVS-CODE | Partial | High-risk secret/bypass scan now exists. Broad `npm run typecheck` still fails and must be resolved or formally triaged. |
| MASVS-RESILIENCE | Partial | Subscription entitlement enforcement moved server-side. Root/jailbreak/tamper/obfuscation decisions remain threat-model dependent. |
| MASVS-PRIVACY | Partial | Account export/delete exists. Sentry redaction exists. AI/photo/vendor data minimization and disclosures still need legal/product review. |

## Release Blockers

1. Rotate and revoke the leaked Firebase Admin SDK service-account keys.
2. Rotate the leaked Supabase service-role key.
3. Purge leaked secrets from git history before public sharing or launch.
4. Deploy `supabase/migrations/093_security_hardening_privileged_rpcs.sql`.
5. Deploy `sync-revenuecat-subscription` and configure `REVENUECAT_API_KEY` or `REVENUECAT_SECRET_API_KEY`.
6. Set `WORKOUT_MIGRATION_ADMIN_SECRET` and `WORKOUT_MAPPING_ADMIN_SECRET` wherever those admin functions are deployed.
7. Resolve or formally triage the existing `npm run typecheck` failures.

## Control Matrix

### MASVS-STORAGE

Evidence:
- `progress-photos` storage bucket is private and scoped by first path segment matching `auth.uid()`.
- Progress photo signed URLs are short-lived in `services/progressPhotoService.ts`.
- Account deletion removes `progress-photos` storage objects before deleting the metadata/auth rows, and explicitly covers major user-owned tables for AI coach, analytics, pantry/grocery, recipes/imports, workout imports/adaptations, prep coach, gamification, subscription events, onboarding review state, and user-created food items.
- Sentry scrubber redacts token, image, URL, prompt, content, body, note, and attachment-like keys.

Gaps:
- Audit all `AsyncStorage`, WatermelonDB, FileSystem cache/document storage, image picker temp files, and workout draft storage for sensitive data.
- Decide whether progress/food photos should be deleted from local temporary paths after upload/analysis.
- Add app-switcher/screenshot protection for screens showing progress photos, body metrics, account data, or AI health-adjacent chat.

### MASVS-CRYPTO

Evidence:
- No app-owned cryptographic algorithms were identified in the reviewed paths.
- Sensitive server keys are expected to live only in Edge Function secrets.

Gaps:
- Leaked Firebase and Supabase keys must be rotated and purged from history.
- `npm run validate:security` scans tracked plus non-ignored untracked files for private keys, service-account files, JWT-looking secrets, bypass headers, unsafe Expo public token naming, and serialized Sentry auth token config.

### MASVS-AUTH

Evidence:
- Client signup no longer calls `admin_create_email_user`.
- `upsert_subscription` and manual auth user RPCs are revoked from `anon` and `authenticated` in migration `093`.
- RevenueCat entitlement writes now go through `sync-revenuecat-subscription`, which derives the user from the authenticated JWT.
- Gamification functions reject caller-supplied `userId` mismatches.
- User-facing functions in `supabase/config.toml` now use `verify_jwt=true` in addition to in-function ownership checks.
- Food catalog utility functions that use the service-role key now require a real Supabase user token in-function; the client wrapper sends the current session access token instead of the public anon key as Bearer auth.
- The security validator fails service-role Edge Functions that lack an in-function `auth.getUser()` check, except explicitly secret-gated admin maintenance jobs.

Gaps:
- `migrate-workout-plans-v2` and `remediate-workout-mappings` still use `verify_jwt=false` because they are admin maintenance jobs; keep the mandatory admin secret checks and ensure those secrets are deployed.
- Add regression tests for user A trying to act on user B for every service-role Edge Function.
- Move subscription truth to RevenueCat webhooks as the production source of record.

### MASVS-NETWORK

Evidence:
- Supabase, RevenueCat, OpenAI/Gemini, Sentry, and configured legal URLs are HTTPS-based.
- Recipe URL import now validates redirects manually and blocks private/link-local/local destinations.

Gaps:
- Document cleartext traffic settings for Android and iOS App Transport Security.
- Decide whether certificate pinning is viable for first-party or controlled endpoints.
- Add URL allowlists or stricter destination validation for any future external fetchers.

### MASVS-PLATFORM

Evidence:
- App has a custom scheme: `metriqfit`.
- Camera and photo library permissions are declared.

Gaps:
- Audit deep-link handlers for auth/session or route injection.
- Audit WebView usage before release; no sensitive bridge should be exposed.
- Validate permission prompts match actual behavior, especially microphone wording.
- Ensure notifications never expose body metrics, meal details, medical-adjacent content, or OTP/reset tokens.
- Current local notification copy is generic and does not include logged food, weight, macros, body metrics, or reset-token content.

### MASVS-CODE

Evidence:
- `scripts/security/validate-security.mjs` checks tracked plus non-ignored untracked files for private-key/service-account patterns, JWT-looking secrets, bypass headers, public manual-auth RPC calls, stale mock billing entitlement language, unsafe Expo public access-token names, and serialized Sentry auth-token config.
- The validator also rejects Edge Function wrappers that use the public anon key as Bearer auth.
- CI runs `validate:security`, focused lint, focused Deno checks, and the Node workout tests.
- `app.config.js` only enables the Sentry config plugin when `SENTRY_AUTH_TOKEN` is present, but does not serialize that token into the Expo plugin config.
- `npm test` passes for the workout test suite.

Gaps:
- `npm run typecheck` currently fails broadly.
- Add CI for `npm run validate:security`, `npm test`, focused Deno checks, lint, and typecheck once typecheck is clean.
- Run dependency vulnerability audit before every release candidate.

### MASVS-RESILIENCE

Evidence:
- Premium/Elite access no longer relies on local mock entitlement writes.
- Ambiguous RevenueCat product IDs default to the least-privileged paid tier.

Gaps:
- Decide on jailbreak/root detection, runtime tamper signals, and obfuscation level for production builds.
- Keep all premium authorization server-enforced; never depend on local feature flags alone.

### MASVS-PRIVACY

Evidence:
- Security settings include export and delete account flows.
- Sentry event sanitization exists and removes authorization headers plus sensitive fields.
- Delete-account now covers progress photo storage objects and a broad set of user-owned database rows beyond the original core profile/workout/nutrition tables.
- Export-my-data now includes core user-owned datasets across onboarding, targets, measurements, water/steps, meals, recipes, pantry/grocery, workouts, progress photos metadata, AI coach, AI usage, gamification, analytics, subscriptions, and onboarding review state.

Gaps:
- Review data sent to OpenAI/Gemini, RevenueCat, Sentry, Firebase, and Supabase for minimization and privacy-policy alignment.
- Move large account exports to a downloadable server-generated file if the JSON payload becomes too large for native share sheets.
- Add user-facing disclosures for AI processing of photos, nutrition logs, body metrics, and coach chat.
