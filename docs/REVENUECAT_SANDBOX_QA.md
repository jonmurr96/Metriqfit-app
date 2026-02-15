# RevenueCat Sandbox QA

## 1) Environment Setup
- Set `EXPO_PUBLIC_BILLING_TEST_MODE=false`.
- Set `EXPO_PUBLIC_REVENUECAT_SANDBOX_ENABLED=true`.
- Set:
  - `EXPO_PUBLIC_REVENUECAT_IOS_KEY=<your_iOS_public_sdk_key>`
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<your_android_public_sdk_key>`
- Run `npm run validate:billing` and resolve any failures.

## 2) Build Prerequisites
- Use a native dev build (RevenueCat sandbox is not available on web):
  - iOS: `npx expo run:ios`
  - Android: `npx expo run:android`
- Sign in with a sandbox test Apple/Google account on device/simulator.

## 3) Functional Test Matrix
1. Launch app and sign in.
2. Open onboarding paywall.
3. Verify package cards load from RevenueCat offerings.
4. Verify yearly option is selected by default.
5. Tap Elite CTA and complete sandbox purchase.
6. Confirm route to home.
7. Open `Settings -> Subscription` and confirm Elite active state.
8. Restart app.
9. Confirm entitlement persists (startup sync + DB sync).
10. Tap `Restore Purchases` and verify success path.
11. Sign out and sign in again to confirm auth-triggered entitlement sync.

## 4) Expected Outcomes
- `subscriptions` row is updated after purchase/restore/startup sync.
- `checkEntitlementStatus` returns Elite when active entitlement exists.
- Paywall error states are actionable if purchase fails or is cancelled.
- Free tier AI limit remains 5/day when entitlement is not Elite.

## 5) Known Constraints
- Web (`expo start --web`) cannot execute native RevenueCat purchase APIs.
- If offerings do not load, app falls back to static package display.
