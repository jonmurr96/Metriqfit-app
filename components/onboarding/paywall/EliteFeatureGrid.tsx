import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';
import { PackageToggle } from './PackageToggle';

interface EliteFeatureGridProps {
  selectedPackageId: string;
  monthly: { id: string; price: string; helper: string; trialLabel?: string };
  yearly: { id: string; price: string; helper: string; badge?: string; trialLabel?: string };
  onSelectPackage: (id: string) => void;
}

export function EliteFeatureGrid({
  selectedPackageId,
  monthly,
  yearly,
  onSelectPackage,
}: EliteFeatureGridProps) {
  const { c, ty, r } = useTokens();

  const features = [
    { icon: 'sparkles-outline', label: 'AI Coach Chat 24/7' },
    { icon: 'trending-up-outline', label: 'Advanced Analytics' },
    { icon: 'restaurant-outline', label: 'Custom Meal Plans' },
    { icon: 'time-outline', label: 'Unlimited History' },
    { icon: 'people-outline', label: 'Elite Community' },
    { icon: 'phone-portrait-outline', label: 'Multi-device Sync' },
  ];

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: r.lg }]}>
      <View style={[styles.head, { borderBottomColor: c.border }]}> 
        <Text style={[styles.title, { color: c.text, fontFamily: ty.heading.familySemibold }]}>Everything in free plus...</Text>
        <Text style={[styles.subtitle, { color: c.textMuted, fontFamily: ty.body.family }]}>Unlock the full power of AI coaching</Text>
      </View>

      <View style={[styles.grid, { borderBottomColor: c.border }]}> 
        {features.map((feature, idx) => (
          <View
            key={feature.label}
            style={[
              styles.featureCell,
              {
                borderRightWidth: idx % 3 === 2 ? 0 : 1,
                borderBottomWidth: idx < 3 ? 1 : 0,
                borderColor: c.border,
              },
            ]}
          >
            <TabBarIcon name={feature.icon as any} color={c.primary} size={20} />
            <Text style={[styles.featureLabel, { color: c.text, fontFamily: ty.body.familyMedium }]}>{feature.label}</Text>
          </View>
        ))}
      </View>

      <PackageToggle
        items={[
          {
            id: monthly.id,
            label: monthly.trialLabel ? `${monthly.trialLabel} then Monthly` : 'Monthly',
            price: monthly.price,
            helper: monthly.helper,
          },
          {
            id: yearly.id,
            label: yearly.trialLabel ? `${yearly.trialLabel} then Yearly` : 'Yearly',
            price: yearly.price,
            helper: yearly.helper,
            badge: yearly.badge,
          },
        ]}
        selectedId={selectedPackageId}
        onSelect={onSelectPackage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  head: {
    padding: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderBottomWidth: 1,
  },
  featureCell: {
    width: '33.33%',
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  featureLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});
