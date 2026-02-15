import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTokens } from '../../../lib/theme';

interface AcceptEditActionsProps {
  accepted: boolean;
  onAccept: () => void;
  onEdit: () => void;
  disableAccept?: boolean;
}

export function AcceptEditActions({ accepted, onAccept, onEdit, disableAccept }: AcceptEditActionsProps) {
  const { c, ty, r } = useTokens();

  return (
    <View style={[styles.row, { borderColor: c.border, borderRadius: r.md }]}> 
      <Pressable
        style={[styles.button, { borderRightColor: c.border, backgroundColor: accepted ? c.primary : c.surface2 }]}
        onPress={onAccept}
        disabled={disableAccept}
      >
        <Text style={[styles.label, { color: accepted ? c.bg : c.primary, fontFamily: ty.heading.familySemibold }]}>
          {accepted ? 'ACCEPTED' : 'ACCEPT'}
        </Text>
      </Pressable>
      <Pressable style={[styles.button, { backgroundColor: c.surface2 }]} onPress={onEdit}>
        <Text style={[styles.label, { color: c.textMuted, fontFamily: ty.heading.familySemibold }]}>EDIT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  button: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.8,
  },
});
