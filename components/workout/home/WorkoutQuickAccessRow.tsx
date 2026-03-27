import React from 'react';
import { View } from 'react-native';

import { RingIconButton } from '../../common/RingIconButton';
import { useTokens } from '../../../lib/theme';

export type WorkoutQuickAccessItem = {
  label: string;
  icon: string;
  onPress: () => void;
  active?: boolean;
};

type Props = {
  items: WorkoutQuickAccessItem[];
  delayBase?: number;
  size?: number;
};

export function WorkoutQuickAccessRow({ items, delayBase = 120, size = 72 }: Props) {
  const { s } = useTokens();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: s.xs }}>
      {items.map((item, index) => (
        <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
          <RingIconButton
            icon={item.icon}
            label={item.label}
            onPress={item.onPress}
            size={size}
            delay={delayBase + index * 70}
            active={item.active}
          />
        </View>
      ))}
    </View>
  );
}
