import { getDailyUsage } from './aiCoachService';
import { getPhotoScanUsage } from './foodPhotoService';
import {
  getEditableNutritionPlanContext,
  type EditableNutritionPlanContext,
} from './planService';
import { getGroceryLists } from './groceryService';
import { getPantryItems } from './pantryService';
import {
  canAccessFeature,
  checkEntitlementStatus,
  getFeatureRequiredTier,
} from './subscriptionService';
import type { FeatureGateKey, SubscriptionTier } from '../lib/subscription/plans';

export type NutritionToolAccessState = 'available' | 'premium_required' | 'elite_required';

export interface NutritionToolCard {
  id: 'camera' | 'barcode' | 'menu' | 'recipe-import' | 'pantry' | 'grocery';
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
  latestGroceryListTitle: string | null;
  pantryLowStockCount: number;
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
  const [entitlement, photoUsage, aiUsage, groceryLists, pantryItems, editableContext] = await Promise.all([
    checkEntitlementStatus(userId),
    getPhotoScanUsage(userId).catch(() => null),
    getDailyUsage(userId).catch(() => null),
    getGroceryLists(userId).catch(() => []),
    getPantryItems(userId).catch(() => []),
    getEditableNutritionPlanContext(userId),
  ]);

  const tier = entitlement.tier;
  const isElite = entitlement.isElite;
  const isPremium = entitlement.isPremium;
  const lowStockCount = pantryItems.filter((item) => Number(item.reorder_threshold || 0) > 0
    && Number(item.quantity_value || 0) <= Number(item.reorder_threshold || 0)).length;
  const latestList = groceryLists[0] || null;
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
    latestGroceryListTitle: latestList?.title || null,
    pantryLowStockCount: lowStockCount,
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
        id: 'pantry',
        title: 'Pantry',
        subtitle: 'Track what is on hand before you build or swap meals.',
        icon: 'archive-outline',
        route: '/(tabs)/nutrition/pantry',
        accessState: getAccessState('pantry', tier),
        meta: lowStockCount > 0 ? `${lowStockCount} low-stock items` : `${pantryItems.length} active items`,
      },
      {
        id: 'grocery',
        title: 'Grocery Builder',
        subtitle: 'Generate meals and a grocery list around constraints.',
        icon: 'basket-outline',
        route: '/(tabs)/nutrition/grocery-planner',
        accessState: getAccessState('grocery_planner', tier),
        meta: withPreviewMeta(latestList?.title || 'No active grocery list yet', editableContext),
      },
    ],
  };
}
