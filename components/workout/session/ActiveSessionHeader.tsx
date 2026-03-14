import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { TabBarIcon } from '../../navigation/TabBarIcon';
import { useTokens } from '../../../lib/theme';

interface ActiveSessionHeaderProps {
  elapsedTimeLabel: string;
  sessionName: string;
  isPaused: boolean;
  onOpenOneRepMax: () => void;
  onTogglePaused: () => void;
  onOpenFinish: () => void;
}

export function ActiveSessionHeader(props: ActiveSessionHeaderProps) {
  const { c, s, ty, r } = useTokens();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: s.lg,
        paddingVertical: s.sm,
      }}
    >
      <View>
        <Text
          style={{
            color: c.primary,
            fontFamily: ty.mono.family,
            fontSize: ty.sizes.h3,
          }}
        >
          {props.elapsedTimeLabel}
        </Text>
        <Text
          style={{
            color: c.textMuted,
            fontFamily: ty.body.family,
            fontSize: ty.sizes.xs,
            marginTop: 2,
          }}
        >
          {props.sessionName}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.sm }}>
        <Pressable
          onPress={props.onOpenOneRepMax}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TabBarIcon name="barbell" color={c.primary} size={18} />
        </Pressable>

        <Pressable
          onPress={props.onTogglePaused}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: c.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TabBarIcon name={props.isPaused ? 'play' : 'pause'} color={c.primary} size={18} />
        </Pressable>

        <Pressable
          onPress={props.onOpenFinish}
          style={{
            paddingHorizontal: s.md,
            paddingVertical: s.xs,
            borderRadius: r.pill,
            backgroundColor: c.surface2,
          }}
        >
          <Text
            style={{
              color: c.text,
              fontFamily: ty.body.familySemibold,
              fontSize: ty.sizes.xs,
            }}
          >
            Finish
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
