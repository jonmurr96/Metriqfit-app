# Settings Release Readiness

Run this before any App Store production build:

```bash
npm run validate:release
```

Required release secrets and environment variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`
- `EXPO_PUBLIC_SUPPORT_EMAIL`
- `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- `EXPO_PUBLIC_TERMS_URL`
- `EXPO_APPLE_ID`
- `EXPO_ASC_APP_ID`
- `EXPO_APPLE_TEAM_ID`

Required production flags:

- `EXPO_PUBLIC_APP_ENV=prod`
- `EXPO_PUBLIC_BILLING_TEST_MODE=false`
- `EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED=true`
- `EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED=false`

Release gates enforced by the validator:

- Production billing cannot use mock mode.
- RevenueCat native plugin must be enabled with platform keys present.
- App Store submit config cannot contain placeholders.
- Privacy policy URL, terms URL, and support email must be configured.
- `runtimeVersion.policy` must remain `appVersion`.
- Settings must expose both data export and account deletion flows.
