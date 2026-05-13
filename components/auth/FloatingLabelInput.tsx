import React, { forwardRef, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useTokens } from '../../lib/theme';

interface FloatingLabelInputProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  isPassword?: boolean;
}

export const FloatingLabelInput = forwardRef<TextInput, FloatingLabelInputProps>(
  function FloatingLabelInput(
    { label, hint, error, isPassword = false, value, onFocus, onBlur, secureTextEntry, ...inputProps },
    ref
  ) {
    const { c, ty, r } = useTokens();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const hasError = Boolean(error);

    const handleFocus = useCallback(
      (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
      },
      [onFocus]
    );

    const handleBlur = useCallback(
      (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
      },
      [onBlur]
    );

    const borderColor = hasError
      ? c.danger
      : isFocused
        ? c.primary
        : 'rgba(255, 255, 255, 0.08)';

    const shadowColor = hasError ? c.danger : c.primary;
    const shadowOpacity = isFocused ? 0.3 : 0;

    const effectiveSecureTextEntry = isPassword ? !showPassword : secureTextEntry;
    const effectiveTextContentType = isPassword
      ? inputProps.textContentType ?? 'none'
      : inputProps.textContentType;

    return (
      <View style={styles.container}>
        {/* Label — animated color on focus */}
        <MotiView
          animate={{
            translateY: isFocused ? -2 : 0,
          }}
          transition={{ type: 'timing', duration: 150 }}
          style={styles.labelWrap}
        >
          <Text
            style={[
              styles.label,
              {
                color: hasError
                  ? c.danger
                  : isFocused
                    ? c.primary
                    : c.textMuted,
                fontFamily: ty.body.familySemibold,
              },
            ]}
          >
            {label}
          </Text>
        </MotiView>

        {/* Input container with glow */}
        <View
          style={[
            styles.inputWrap,
            {
              borderColor,
              borderRadius: r.md,
              backgroundColor: isFocused
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(255, 255, 255, 0.03)',
              shadowColor,
              shadowOpacity,
              shadowRadius: isFocused ? 14 : 0,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        >
          <TextInput
            ref={ref}
            {...inputProps}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={effectiveSecureTextEntry}
            textContentType={effectiveTextContentType}
            placeholderTextColor="rgba(255, 255, 255, 0.2)"
            style={[
              styles.input,
              {
                color: c.text,
                fontFamily: ty.body.family,
                paddingRight: isPassword ? 46 : 16,
              },
            ]}
          />

          {/* Password toggle */}
          {isPassword && (
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              hitSlop={12}
              style={styles.eyeButton}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={isFocused ? c.primary : 'rgba(255, 255, 255, 0.35)'}
              />
            </Pressable>
          )}
        </View>

        {/* Focus indicator line */}
        <MotiView
          animate={{
            scaleX: isFocused ? 1 : 0,
            opacity: isFocused ? 1 : 0,
          }}
          transition={{ type: 'timing', duration: 200 }}
          style={[
            styles.focusLine,
            {
              backgroundColor: hasError ? c.danger : c.primary,
            },
          ]}
        />

        {/* Hint / Error */}
        {hasError ? (
          <Text style={[styles.helper, { color: c.danger, fontFamily: ty.body.family }]}>
            {error}
          </Text>
        ) : hint ? (
          <Text style={[styles.helper, { color: c.textMuted, fontFamily: ty.body.family }]}>
            {hint}
          </Text>
        ) : null}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelWrap: {
    marginBottom: 2,
    marginLeft: 2,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  inputWrap: {
    height: 54,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: 54,
    paddingVertical: 0,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  focusLine: {
    height: 2,
    marginTop: -1,
    marginHorizontal: 16,
    borderRadius: 1,
    transform: [{ scaleX: 0 }],
  },
  helper: {
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 4,
  },
});
