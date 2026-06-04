import React from 'react';
import { View, Text, ScrollView, StyleSheet, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../../components/navigation/TabBarIcon';
import { GlassCard } from '../../components/premium/GlassCard';
import { PressableScale } from '@/components/common/PressableScale';

interface Insight {
  id: string;
  type: 'success' | 'info' | 'warning' | 'tip';
  title: string;
  description: string;
  highlight?: string;
}

interface SmartInsightsCarouselProps {
  insights?: Insight[];
  newCount?: number;
  onViewAll?: () => void;
}

const DEFAULT_INSIGHTS: Insight[] = [
  {
    id: '1',
    type: 'success',
    title: 'Consistency King',
    description: 'You hit your calorie target',
    highlight: '5/7 days',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Calorie Crusher',
    description: 'You burned',
    highlight: '300 more calories',
  },
  {
    id: '3',
    type: 'info',
    title: 'Protein Power',
    description: 'Chicken provided',
    highlight: '30%',
  },
];

const TYPE_CONFIG = {
  success: { icon: 'checkmark-circle' },
  info: { icon: 'information-circle' },
  warning: { icon: 'flame' },
  tip: { icon: 'bulb' },
};

/**
 * Smart insights carousel with unified ring + glass design.
 */
export function SmartInsightsCarousel({
  insights = DEFAULT_INSIGHTS,
  newCount = 3,
  onViewAll,
}: SmartInsightsCarouselProps) {
  const { c, s, ty, r, glass } = useTokens();

  const getTypeColor = (type: Insight['type']): string => {
    switch (type) {
      case 'success':
        return c.success;
      case 'warning':
        return c.warning;
      case 'info':
        return c.primary;
      case 'tip':
        return c.accent;
      default:
        return c.primary;
    }
  };

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: 'timing', duration: 400, delay: 200 }}
    >
      <View style={[styles.header, { paddingHorizontal: s.lg }]}>
        <Text
          style={[
            styles.sectionTitle,
            {
              color: c.text,
              fontFamily: ty.heading.familySemibold,
              fontSize: ty.sizes.lg,
            },
          ]}
        >
          Smart Insights
        </Text>
        <View style={styles.headerRight}>
          {newCount > 0 && (
            // Ring badge style
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderColor: c.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: c.primary,
                    fontFamily: ty.body.familySemibold,
                    fontSize: 10,
                  },
                ]}
              >
                {newCount} NEW
              </Text>
            </View>
          )}
          {/* Ring button */}
          <PressableScale
            onPress={onViewAll}
            style={(pressed) => [
              styles.viewAllButton,
              {
                borderWidth: 2,
                borderColor: pressed ? c.primary : `${c.primary}60`,
                borderRadius: r.pill,
                backgroundColor: pressed ? `${c.primary}15` : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: c.primary,
                fontFamily: ty.body.familySemibold,
                fontSize: ty.sizes.xs,
              }}
            >
              View All
            </Text>
          </PressableScale>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: s.lg }]}
        decelerationRate="fast"
        snapToInterval={280 + 12}
      >
        {insights.map((insight, index) => {
          const typeColor = getTypeColor(insight.type);
          const config = TYPE_CONFIG[insight.type];

          return (
            <MotiView
              key={insight.id}
              from={{ opacity: 0, translateX: 20 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 100 + index * 100 }}
              style={[
                styles.card,
                {
                  backgroundColor: glass.background,
                  borderRadius: r.xl,
                  borderWidth: 1,
                  borderColor: `${typeColor}40`,
                  padding: s.md,
                },
                Platform.OS === 'web' && {
                  backdropFilter: 'blur(12px)',
                  boxShadow: `0 0 15px ${typeColor}15`,
                } as any,
              ]}
            >
              <View style={styles.cardContent}>
                {/* Ring icon */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      borderWidth: 2,
                      borderColor: typeColor,
                      backgroundColor: 'transparent',
                    },
                  ]}
                >
                  <TabBarIcon
                    name={config.icon as any}
                    color={typeColor}
                    size={18}
                  />
                </View>
                <View style={styles.textContent}>
                  <Text
                    style={[
                      styles.cardTitle,
                      {
                        color: c.text,
                        fontFamily: ty.body.familySemibold,
                        fontSize: ty.sizes.md,
                      },
                    ]}
                  >
                    {insight.title}
                  </Text>
                  <Text
                    style={[
                      styles.cardDescription,
                      {
                        color: c.textMuted,
                        fontFamily: ty.body.family,
                        fontSize: ty.sizes.sm,
                      },
                    ]}
                  >
                    {insight.description}{' '}
                    {insight.highlight && (
                      <Text
                        style={{
                          color: typeColor,
                          fontFamily: ty.body.familySemibold,
                        }}
                      >
                        {insight.highlight}
                      </Text>
                    )}
                    {' this week.'}
                  </Text>
                </View>
              </View>
            </MotiView>
          );
        })}
      </ScrollView>
    </MotiView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    letterSpacing: 0.5,
  },
  viewAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 4,
  },
  card: {
    width: 280,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {},
  cardDescription: {
    lineHeight: 20,
  },
});
