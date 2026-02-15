import React from 'react';
import { View } from 'react-native';

import { RingIconButton } from '../../common/RingIconButton';
import { useTokens } from '../../../lib/theme';

export type WorkoutQuickAccessItem = {
  label: string;
  icon: string;
  onPress: () => void;
};

type Props = {
  items: WorkoutQuickAccessItem[];
  delayBase?: number;
};

export function WorkoutQuickAccessRow({ items, delayBase = 120 }: Props) {
  const { s } = useTokens();

  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: s.sm }}>
      {items.map((item, index) => (
        <RingIconButton
          key={item.label}
          icon={item.icon}
          label={item.label}
          onPress={item.onPress}
          size={72}
          delay={delayBase + index * 70}
        />
      ))}
    </View>
  );
}
