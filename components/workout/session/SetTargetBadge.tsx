import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTokens } from '../../../lib/theme';

interface SetTargetBadgeProps {
  weight?: number;
  reps?: number;
  label?: string;
  isPR?: boolean;
}

export function SetTargetBadge({ weight, reps, label, isPR }: SetTargetBadgeProps) {
  const { c, s, r, ty } = useTokens();

  if (!weight && !reps && !label) return null;

  // Premium colors: Success is a vibrant emerald, Primary is a deep electric blue
  const accentColor = isPR ? c.success : c.primary;
  const backgroundColor = isPR ? `${c.success}12` : `${c.primary}12`;
  const borderColor = isPR ? `${c.success}25` : `${c.primary}25`;

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor, 
        borderColor,
        borderLeftWidth: 3, // Accent stripe for height/importance
        borderLeftColor: accentColor 
      }
    ]}>
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons 
            name={isPR ? "flash" : "trending-up"} 
            size={14} 
            color={accentColor} 
          />
        </View>
        <Text style={[styles.label, { color: accentColor, fontFamily: ty.body.familySemibold }]}>
          {label || 'Target'}
        </Text>
      </View>
      
      {(weight || reps) && (
        <View style={[styles.targetPill, { backgroundColor: accentColor }]}>
          <Text style={[styles.targetText, { color: '#FFFFFF', fontFamily: ty.body.familySemibold }]}>
            {weight ? `${weight} lbs` : ''}{weight && reps ? ' × ' : ''}{reps ? `${reps} reps` : ''}
          </Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    // Subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  targetPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  targetText: {
    fontSize: 14,
  }
});

