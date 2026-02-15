import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface PlanItem {
  id: string;
  label: string;
  price: string;
  helper: string;
  badge?: string;
}

interface PackageToggleProps {
  items: PlanItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function PackageToggle({ items, selectedId, onSelect }: PackageToggleProps) {
  const { c, ty, r } = useTokens();

  return (
    <View style={[styles.row, { borderColor: c.border, borderRadius: r.md }]}> 
      {items.map((item, idx) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            style={[
              styles.option,
              {
                borderRightWidth: idx === items.length - 1 ? 0 : 1,
                borderRightColor: c.border,
                backgroundColor: selected ? c.opacity.primaryLight : 'transparent',
              },
            ]}
            onPress={() => onSelect(item.id)}
          >
            {item.badge ? (
              <View style={[styles.badge, { backgroundColor: c.primary, borderRadius: r.sm }]}>
                <Text style={[styles.badgeText, { color: c.bg, fontFamily: ty.body.familySemibold }]}>{item.badge}</Text>
              </View>
            ) : null}
            <Text style={[styles.label, { color: selected ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold }]}>{item.label}</Text>
            <Text style={[styles.price, { color: c.text, fontFamily: ty.heading.familySemibold }]}>{item.price}</Text>
            <Text style={[styles.helper, { color: c.textMuted, fontFamily: ty.body.family }]}>{item.helper}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  option: {
    flex: 1,
    minHeight: 112,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    borderRightWidth: 1,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    letterSpacing: 0.4,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  price: {
    fontSize: 30,
  },
  helper: {
    marginTop: 2,
    fontSize: 11,
    lineHeight: 14,
  },
});
