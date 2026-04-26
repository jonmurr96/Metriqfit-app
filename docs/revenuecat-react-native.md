# RevenueCat React Native Setup

This app now supports RevenueCat's hosted paywall flow, customer center, and customer info syncing.

## 1. Install packages

```bash
npm install --save react-native-purchases react-native-purchases-ui
npx pod-install ios
```

Because `react-native-purchases-ui` is a native module, Expo Go is not enough. Rebuild the dev client after installation or plugin changes.

## 2. Configure environment

Add these values to `.env`:

```env
EXPO_PUBLIC_APP_ENV=local
EXPO_PUBLIC_REVENUECAT_NATIVE_PLUGIN_ENABLED=true
EXPO_PUBLIC_REVENUECAT_TEST_STORE_KEY=test_NpyVJXNYCzCqvDtNbUcowIipMZc
EXPO_PUBLIC_REVENUECAT_REQUIRED_ENTITLEMENT_ID=Metriqffit Pro
```

For production, replace the Test Store key with platform-specific public SDK keys:

```env
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
```

Do not ship `test_...` keys in production builds.

## 3. RevenueCat dashboard configuration

Create one entitlement:

- `Metriqffit Pro`

Create products in RevenueCat and attach all of them to that entitlement:

- `weekly`
- `monthly`
- `yearly`

Create one default offering and attach packages:

- `weekly`
- `monthly`
- `annual`

The hosted paywall uses the current offering by default, so pricing and product order are now controlled from RevenueCat instead of hardcoded in the app.

## 4. App integration points

### SDK initialization and sync

- [services/subscriptionService.ts](/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/services/subscriptionService.ts)
- [services/revenuecatClient.ts](/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/services/revenuecatClient.ts)

The app:

- configures RevenueCat for the signed-in user
- supports RevenueCat Test Store in local builds
- syncs customer info into the `subscriptions` table
- exposes the required entitlement identifier through env

### Hosted paywall

- [services/revenuecatUiService.ts](/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/services/revenuecatUiService.ts)
- [hooks/useSubscription.ts](/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/hooks/useSubscription.ts)

Primary method:

```ts
await RevenueCatUI.presentPaywallIfNeeded({
  requiredEntitlementIdentifier: 'Metriqffit Pro',
});
```

### Customer Center

- [app/settings/subscription.tsx](/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/app/settings/subscription.tsx)

Primary method:

```ts
await RevenueCatUI.presentCustomerCenter();
```

If Customer Center fails, the app falls back to the App Store / Play subscription management URL.

## 5. Customer info and entitlement handling

The app uses:

- `Purchases.getCustomerInfo()`
- `Purchases.addCustomerInfoUpdateListener(...)`

Current behavior:

- purchase / restore / customer center changes trigger customer info updates
- updates are synced back to Supabase
- subscription queries are invalidated immediately

The relevant auth listener is in:

- [lib/auth/AuthProvider.tsx](/Users/owner/Projects/Metriqfit-elite-remote-20260307-073401/lib/auth/AuthProvider.tsx)

## 6. Best practices used here

- Use hosted paywalls so pricing and copy live in RevenueCat, not in app releases.
- Use `presentPaywallIfNeeded` so users with the entitlement do not see the paywall again.
- Treat RevenueCat as the source of truth for paid state, then sync to your app DB.
- Subscribe to customer info updates instead of waiting for the next app launch.
- Keep Customer Center in settings, not onboarding.
- Keep Test Store keys local-only and block them in production.

## 7. Verification checklist

After rebuilding the dev client:

1. Sign in with a real app user.
2. Open onboarding paywall and confirm the RevenueCat hosted paywall appears.
3. Purchase a Test Store product.
4. Confirm `Metriqffit Pro` is active.
5. Confirm the app refreshes paid state without relaunching.
6. Open settings and confirm Customer Center opens.
7. Restore purchases and confirm entitlement remains active.
