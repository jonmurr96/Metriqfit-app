export interface HostedPaywallOutcome {
  result: 'NOT_PRESENTED';
  purchased: false;
  restored: false;
  cancelled: false;
  notPresented: true;
  success: false;
}

const NOT_PRESENTED_RESULT: HostedPaywallOutcome = {
  result: 'NOT_PRESENTED',
  purchased: false,
  restored: false,
  cancelled: false,
  notPresented: true,
  success: false,
};

export async function presentHostedPaywall(): Promise<HostedPaywallOutcome> {
  return NOT_PRESENTED_RESULT;
}

export async function presentHostedPaywallIfNeeded(
  _requiredEntitlementIdentifier?: string,
): Promise<HostedPaywallOutcome> {
  return NOT_PRESENTED_RESULT;
}

export async function presentRevenueCatCustomerCenter(): Promise<void> {}
