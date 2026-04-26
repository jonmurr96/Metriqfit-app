import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// px between each tick (1 unit = 1 tick)
const TICK_SPACING = 11;
const TICK_HEIGHT_MINOR = 18;
const TICK_HEIGHT_MAJOR = 34;
const MAJOR_EVERY = 5; // every 5 ticks is a major tick

const CYAN = '#22D3EE';
const ORANGE = '#F97316';
const PURPLE = '#A855F7';

interface RulerPickerProps {
  min: number;
  max: number;
  step?: number;
  initialValue: number;
  onChangeEnd: (value: number) => void; // called on scroll end → saves to context
  formatDisplay: (value: number) => string; // formats the large value label
  accentColor?: string;
}

export function RulerPicker({
  min,
  max,
  step = 1,
  initialValue,
  onChangeEnd,
  formatDisplay,
  accentColor = CYAN,
}: RulerPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const SIDE_PADDING = SCREEN_WIDTH / 2;

  // Local display value (updates every scroll tick for smooth UX)
  const [displayValue, setDisplayValue] = useState(initialValue);

  const totalSteps = Math.round((max - min) / step);

  const valueToOffset = useCallback(
    (val: number) => ((val - min) / step) * TICK_SPACING,
    [min, step],
  );

  const offsetToValue = useCallback(
    (offset: number) => {
      const raw = min + Math.round(offset / TICK_SPACING) * step;
      return Math.max(min, Math.min(max, raw));
    },
    [min, max, step],
  );

  // Scroll to initial position on mount
  useEffect(() => {
    const offset = valueToOffset(initialValue);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: offset, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, []); // intentionally empty — only on mount

  // When initialValue changes externally (unit switch), scroll to new position
  const prevInitialValue = useRef(initialValue);
  useEffect(() => {
    if (prevInitialValue.current !== initialValue) {
      prevInitialValue.current = initialValue;
      setDisplayValue(initialValue);
      const offset = valueToOffset(initialValue);
      scrollRef.current?.scrollTo({ x: offset, animated: true });
    }
  }, [initialValue, valueToOffset]);

  const handleScroll = useCallback(
    (event: any) => {
      const offset = event.nativeEvent.contentOffset.x;
      const newValue = offsetToValue(offset);
      setDisplayValue(newValue);
    },
    [offsetToValue],
  );

  const handleScrollEnd = useCallback(
    (event: any) => {
      const offset = event.nativeEvent.contentOffset.x;
      const newValue = offsetToValue(offset);
      setDisplayValue(newValue);
      onChangeEnd(newValue);
    },
    [offsetToValue, onChangeEnd],
  );

  // Pre-build tick array
  const ticks = useMemo(() => {
    const items: React.ReactNode[] = [];
    for (let i = 0; i <= totalSteps; i++) {
      const isMajor = i % MAJOR_EVERY === 0;
      const val = min + i * step;
      items.push(
        <View key={i} style={styles.tick}>
          <View
            style={[
              styles.tickLine,
              {
                height: isMajor ? TICK_HEIGHT_MAJOR : TICK_HEIGHT_MINOR,
                marginTop: isMajor ? 0 : (TICK_HEIGHT_MAJOR - TICK_HEIGHT_MINOR) / 2,
                backgroundColor: isMajor
                  ? `${accentColor}90`
                  : 'rgba(255,255,255,0.18)',
                width: isMajor ? 2 : 1,
              },
            ]}
          />
          {isMajor && (
            <Text style={styles.tickLabel} numberOfLines={1}>{val}</Text>
          )}
        </View>,
      );
    }
    return items;
  }, [totalSteps, min, step, accentColor]);

  return (
    <View style={styles.wrapper}>
      {/* Large value display */}
      <Text style={[styles.valueDisplay, { color: '#FFFFFF' }]}>
        {formatDisplay(displayValue)}
      </Text>

      {/* Ruler container */}
      <View style={styles.rulerContainer}>
        {/* Fixed center cursor line */}
        <View
          style={[
            styles.centerCursor,
            {
              backgroundColor: accentColor,
              shadowColor: accentColor,
            } as any,
          ]}
          pointerEvents="none"
        />

        {/* Fade masks on edges */}
        <View style={[styles.fadeMask, styles.fadeMaskLeft]} pointerEvents="none" />
        <View style={[styles.fadeMask, styles.fadeMaskRight]} pointerEvents="none" />

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleScrollEnd}
          onScrollEndDrag={handleScrollEnd}
          snapToInterval={TICK_SPACING}
          decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.95}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: SIDE_PADDING - TICK_SPACING / 2 },
          ]}
        >
          {ticks}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  valueDisplay: {
    fontSize: 72,
    fontFamily: 'Unbounded_700Bold',
    lineHeight: 88,
    letterSpacing: -2,
    textAlign: 'center',
    marginBottom: 24,
  },
  rulerContainer: {
    width: SCREEN_WIDTH,
    height: TICK_HEIGHT_MAJOR + 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCursor: {
    position: 'absolute',
    left: SCREEN_WIDTH / 2 - 1,
    top: 0,
    width: 2,
    height: TICK_HEIGHT_MAJOR + 8,
    zIndex: 20,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 5,
  },
  fadeMask: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    zIndex: 10,
  },
  fadeMaskLeft: {
    left: 0,
    background: 'linear-gradient(to right, #050510, transparent)',
  } as any,
  fadeMaskRight: {
    right: 0,
    background: 'linear-gradient(to left, #050510, transparent)',
  } as any,
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tick: {
    width: TICK_SPACING,
    alignItems: 'center',
  },
  tickLine: {
    borderRadius: 1,
  },
  tickLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 9,
    fontFamily: 'Sora_400Regular',
    marginTop: 4,
    textAlign: 'center',
    width: 28,
  },
});
