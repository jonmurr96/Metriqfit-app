import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export interface HostedPaywallOutcome {
  result: PAYWALL_RESULT;
  purchased: boolean;
  restored: boolean;
  cancelled: boolean;
  notPresented: boolean;
  success: boolean;
}

function mapPaywallResult(result: PAYWALL_RESULT): HostedPaywallOutcome {
  return {
    result,
    purchased: result === PAYWALL_RESULT.PURCHASED,
    restored: result === PAYWALL_RESULT.RESTORED,
    cancelled: result === PAYWALL_RESULT.CANCELLED,
    notPresented: result === PAYWALL_RESULT.NOT_PRESENTED,
    success: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
  };
}

export async function presentHostedPaywall(): Promise<HostedPaywallOutcome> {
  const result = await RevenueCatUI.presentPaywall();
  return mapPaywallResult(result);
}

export async function presentHostedPaywallIfNeeded(
  requiredEntitlementIdentifier: string,
): Promise<HostedPaywallOutcome> {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier,
  });
  return mapPaywallResult(result);
}

export async function presentRevenueCatCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}
