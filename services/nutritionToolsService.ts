import { getDailyUsage } from './aiCoachService';
import { getPhotoScanUsage } from './foodPhotoService';
import {
  getEditableNutritionPlanContext,
  type EditableNutritionPlanContext,
} from './planService';
import {
  canAccessFeature,
  checkEntitlementStatus,
  getFeatureRequiredTier,
} from './subscriptionService';
import type { FeatureGateKey, SubscriptionTier } from '../lib/subscription/plans';

export type NutritionToolAccessState = 'available' | 'premium_required' | 'elite_required';

export interface NutritionToolCard {
  id: 'camera' | 'barcode' | 'menu' | 'recipe-import' | 'macro-budgeter' | 'supplement-guide';
  title: string;
  subtitle: string;
  icon: string;
  route: string;
  accessState: NutritionToolAccessState;
  meta: string | null;
}

export interface NutritionToolsSnapshot {
  tier: SubscriptionTier;
  isElite: boolean;
  isPremium: boolean;
  scanQuotaLabel: string | null;
  editableContext: EditableNutritionPlanContext;
  previewPending: boolean;
  cards: NutritionToolCard[];
}

function withPreviewMeta(base: string, editableContext: EditableNutritionPlanContext) {
  if (editableContext.source === 'preview') {
    return `${base} • applies to preview`;
  }
  return base;
}

function getAccessState(feature: FeatureGateKey, tier: SubscriptionTier): NutritionToolAccessState {
  if (canAccessFeature(feature, tier)) return 'available';
  return getFeatureRequiredTier(feature) === 'premium' ? 'premium_required' : 'elite_required';
}

export async function getNutritionToolsSnapshot(userId: string): Promise<NutritionToolsSnapshot> {
  const [entitlement, photoUsage, aiUsage, editableContext] = await Promise.all([
    checkEntitlementStatus(userId),
    getPhotoScanUsage(userId).catch(() => null),
    getDailyUsage(userId).catch(() => null),
    getEditableNutritionPlanContext(userId),
  ]);

  const tier = entitlement.tier;
  const isElite = entitlement.isElite;
  const isPremium = entitlement.isPremium;
  const previewPending = editableContext.source === 'preview';
  const photoQuota = photoUsage
    ? photoUsage.isUnlimited
      ? 'Unlimited scans'
      : `${photoUsage.remainingScans} of ${photoUsage.scansLimit} photo scans left today`
    : null;

  const menuUsageMeta = !isElite
    ? 'Elite-only tool'
    : aiUsage
      ? `${Number(aiUsage.menu_scans || 0)} menu scans used today`
      : null;

  return {
    tier,
    isElite,
    isPremium,
    scanQuotaLabel: photoQuota,
    editableContext,
    previewPending,
    cards: [
      {
        id: 'camera',
        title: 'Camera Scan',
        subtitle: 'Estimate macros from a meal photo and log faster.',
        icon: 'camera-outline',
        route: '/(tabs)/nutrition/food-camera',
        accessState: getAccessState('food_photo_scan', tier),
        meta: photoQuota,
      },
      {
        id: 'barcode',
        title: 'Barcode Scan',
        subtitle: 'Jump straight to packaged foods without typing.',
        icon: 'barcode-outline',
        route: '/(tabs)/nutrition/barcode-scanner',
        accessState: getAccessState('barcode_scan', tier),
        meta: !isPremium ? 'Premium and Elite only' : 'Ready to scan',
      },
      {
        id: 'menu',
        title: 'Menu Scan',
        subtitle: 'Rank menu options and apply the best pick to a meal slot.',
        icon: 'restaurant-outline',
        route: '/(tabs)/nutrition/menu-scan',
        accessState: getAccessState('menu_scan', tier),
        meta: withPreviewMeta(menuUsageMeta || 'Apply to your next planned meal', editableContext),
      },
      {
        id: 'recipe-import',
        title: 'Recipe Import',
        subtitle: 'Turn recipe links into editable meals for logging.',
        icon: 'link-outline',
        route: '/(tabs)/nutrition/recipe-import',
        accessState: getAccessState('recipe_url_import', tier),
        meta: !isElite ? 'Elite-only import flow' : 'Saves into your recipe flow',
      },
      {
        id: 'macro-budgeter',
        title: 'Macro Budgeter',
        subtitle: 'Log a cheat meal and see how to recover the rest of the day.',
        icon: 'calculator-outline',
        route: '/(tabs)/nutrition/tools/macro-budgeter',
        accessState: getAccessState('macro_budgeter', tier),
        meta: 'Recover smarter',
      },
      {
        id: 'supplement-guide',
        title: 'Supplement Guide',
        subtitle: 'Searchable reference for vitamins, minerals, and performance supplements.',
        icon: 'medical-outline',
        route: '/(tabs)/nutrition/tools/supplement-guide',
        accessState: getAccessState('supplement_guide', tier),
        meta: 'Educational only',
      },
    ],
  };
}
