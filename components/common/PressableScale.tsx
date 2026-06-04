import React, { useState } from 'react';
import {
  Pressable,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

/**
 * Drop-in replacement for `Pressable` whose `style` may be a function of the
 * pressed state: `style={(pressed) => ...}`.
 *
 * NativeWind v4 / react-native-css-interop intercepts `Pressable`'s `style`
 * prop and silently drops `onPress` when handed dynamic-shaped arrays (e.g.
 * `[a, b, pressed && c]`). To stay clear of that path, we leave the underlying
 * Pressable's `style` empty and apply the resolved style to an inner View,
 * which css-interop handles correctly.
 */
type PressableScaleState = {
  pressed: boolean;
};

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  children?: React.ReactNode | ((state: PressableScaleState) => React.ReactNode);
};

export function PressableScale({
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);

  const handlePressIn = (event: GestureResponderEvent) => {
    setPressed(true);
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    setPressed(false);
    onPressOut?.(event);
  };

  const resolved = typeof style === 'function' ? style(pressed) : style;
  const content = typeof children === 'function' ? children({ pressed }) : children;

  return (
    <Pressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={resolved}>{content}</View>
    </Pressable>
  );
}
