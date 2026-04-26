import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../../lib/theme';
import { NutritionPreviewBanner } from '../../../../components/nutrition/NutritionPreviewBanner';
import { NutritionSectionShell } from '../../../../components/nutrition/NutritionSectionShell';
import { NutritionToolHubCard } from '../../../../components/nutrition/NutritionToolHubCard';
import { useNutritionToolsSnapshot } from '../../../../hooks/useNutritionDashboard';
import { trackNutritionToolGateViewed, trackNutritionToolOpened } from '../../../../lib/analytics';

export default function NutritionToolsScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toolsQuery = useNutritionToolsSnapshot();
  const snapshot = toolsQuery.data;

  React.useEffect(() => {
    if (!snapshot) return;
    for (const card of snapshot.cards) {
      if (card.accessState !== 'available') {
        trackNutritionToolGateViewed({ tool: card.id, source: 'nutrition_tools' });
      }
    }
  }, [snapshot]);

  if (toolsQuery.isLoading && !snapshot) {
    return (
      <NutritionSectionShell title="Nutrition Tools" primarySection="tools" showBackButton={false}>
        <View style={[styles.loadingState, { backgroundColor: c.bg }]}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      </NutritionSectionShell>
    );
  }

  return (
    <NutritionSectionShell title="Nutrition Tools" primarySection="tools" showBackButton={false}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + 120, gap: s.lg }}
        refreshControl={
          <RefreshControl
            refreshing={toolsQuery.isRefetching}
            onRefresh={() => toolsQuery.refetch()}
            tintColor={c.primary}
          />
        }
      >
        {snapshot?.previewPending && snapshot.editableContext.previewPlan ? (
          <NutritionPreviewBanner
            previewName={snapshot.editableContext.previewPlan.name || 'Preview nutrition plan'}
            onReview={() => router.push('/(tabs)/nutrition/regenerate-plan' as any)}
          />
        ) : null}

        <View style={styles.summaryRow}>
          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: c.surface,
                borderRadius: r.lg,
                borderWidth: 1,
                borderColor: c.border,
                padding: s.md,
              },
            ]}
          >
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              EDIT TARGET
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginTop: s.xs }}>
              {snapshot?.editableContext.source === 'preview' ? 'Preview Plan' : 'Live Plan'}
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
              {snapshot?.editableContext.source === 'preview'
                ? 'Plan-changing tools write into the pending preview.'
                : 'Plan-changing tools update the current live nutrition plan.'}
            </Text>
          </View>

          <View
            style={[
              styles.summaryCard,
              {
                backgroundColor: c.surface,
                borderRadius: r.lg,
                borderWidth: 1,
                borderColor: c.border,
                padding: s.md,
              },
            ]}
          >
            <Text style={{ color: c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
              QUICK STATUS
            </Text>
            <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md, marginTop: s.xs }}>
              {snapshot?.pantryLowStockCount || 0} low-stock items
            </Text>
            <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: s.xs }}>
              {snapshot?.latestGroceryListTitle || 'No active grocery list'}{snapshot?.scanQuotaLabel ? ` • ${snapshot.scanQuotaLabel}` : ''}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.heroCard,
            {
              backgroundColor: c.surface,
              borderRadius: r.xl,
              borderWidth: 1,
              borderColor: c.border,
              padding: s.lg,
            },
          ]}
        >
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
            Logging, planning, and AI helpers in one place
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.sm }}>
            Use scans for faster logging, import recipes into the meal flow, and keep grocery or pantry changes aligned with the plan you are currently editing.
          </Text>
        </View>

        <View style={styles.grid}>
          {(snapshot?.cards || []).map((card) => (
            <NutritionToolHubCard
              key={card.id}
              title={card.title}
              subtitle={card.subtitle}
              icon={card.icon}
              accessState={card.accessState}
              meta={card.meta}
              onPress={() => {
                trackNutritionToolOpened({ tool: card.id, source: 'nutrition_tools' });
                router.push(card.route as any);
              }}
            />
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/nutrition/my-plan')}
          style={[
            styles.footerCta,
            {
              borderRadius: r.lg,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.surface,
              padding: s.lg,
            },
          ]}
        >
          <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.md }}>
            Review the weekly plan
          </Text>
          <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, marginTop: s.xs }}>
            Open the Plan view to inspect the meals these tools are writing into.
          </Text>
        </Pressable>
      </ScrollView>
    </NutritionSectionShell>
  );
}

const styles = StyleSheet.create({
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minHeight: 128,
  },
  heroCard: {},
  grid: {
    gap: 12,
  },
  footerCta: {},
});
