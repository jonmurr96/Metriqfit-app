import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../../lib/theme';
import { TabBarIcon } from '../../../../components/navigation/TabBarIcon';
import {
  usePantryItem,
  usePantryTransactions,
  useCreatePantryItem,
  useUpdatePantryItem,
  useLogPantryTransaction,
} from '../../../../hooks/usePantry';

type TxMode = 'add' | 'consume' | 'waste' | 'adjust';

export default function PantryItemScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ itemId?: string }>();
  const itemId = typeof params.itemId === 'string' ? params.itemId : '';

  const itemQuery = usePantryItem(itemId, !!itemId);
  const txQuery = usePantryTransactions(itemId || undefined);
  const createMutation = useCreatePantryItem();
  const updateMutation = useUpdatePantryItem();
  const txMutation = useLogPantryTransaction();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('g');
  const [location, setLocation] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [reorder, setReorder] = useState('0');
  const [notes, setNotes] = useState('');

  const [txMode, setTxMode] = useState<TxMode>('add');
  const [txAmount, setTxAmount] = useState('0');

  useEffect(() => {
    if (!itemQuery.data) return;
    const item = itemQuery.data;
    setName(item.name || '');
    setQuantity(String(item.quantity_value || 0));
    setUnit(item.quantity_unit || 'g');
    setLocation(item.location || '');
    setExpiresAt(item.expires_at || '');
    setReorder(String(item.reorder_threshold || 0));
    setNotes(item.notes || '');
  }, [itemQuery.data]);

  const onSave = async () => {
    const qty = Number(quantity || 0);
    const reorderThreshold = Number(reorder || 0);

    if (!name.trim()) {
      Alert.alert('Missing name', 'Pantry item name is required.');
      return;
    }

    try {
      if (itemId) {
        await updateMutation.mutateAsync({
          itemId,
          updates: {
            name: name.trim(),
            quantity_value: qty,
            quantity_unit: unit.trim() || 'g',
            location: location.trim() || null,
            expires_at: expiresAt.trim() || null,
            reorder_threshold: reorderThreshold,
            notes: notes.trim() || null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          quantityValue: qty,
          quantityUnit: unit.trim() || 'g',
          location: location.trim() || null,
          expiresAt: expiresAt.trim() || null,
          reorderThreshold,
          notes: notes.trim() || null,
        });
      }

      Alert.alert('Saved', 'Pantry item saved.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Save failed', error?.message || 'Could not save pantry item.');
    }
  };

  const onLogTransaction = async () => {
    if (!itemId) return;
    const delta = Number(txAmount || 0);

    if (!Number.isFinite(delta) || delta <= 0) {
      Alert.alert('Invalid quantity', 'Enter a positive quantity.');
      return;
    }

    try {
      await txMutation.mutateAsync({
        pantryItemId: itemId,
        type: txMode,
        quantityDelta: delta,
        quantityUnit: unit.trim() || 'g',
        notes: `Pantry ${txMode}`,
      });
      setTxAmount('0');
    } catch (error: any) {
      Alert.alert('Transaction failed', error?.message || 'Could not log pantry transaction.');
    }
  };

  const isBusy = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
          {itemId ? 'Edit Pantry Item' : 'New Pantry Item'}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}>
        {(itemId && itemQuery.isLoading) ? (
          <View style={{ paddingVertical: s.xl, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.md }]}> 
              <Field label="Name" value={name} onChangeText={setName} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} />

              <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                <Field label="Quantity" value={quantity} onChangeText={setQuantity} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} keyboardType="decimal-pad" />
                <Field label="Unit" value={unit} onChangeText={setUnit} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} />
              </View>

              <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                <Field label="Location" value={location} onChangeText={setLocation} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} />
                <Field label="Reorder" value={reorder} onChangeText={setReorder} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} keyboardType="decimal-pad" />
              </View>

              <Field label="Expires (YYYY-MM-DD)" value={expiresAt} onChangeText={setExpiresAt} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} style={{ marginTop: s.sm }} />
              <Field label="Notes" value={notes} onChangeText={setNotes} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} style={{ marginTop: s.sm }} />

              <Pressable
                onPress={onSave}
                disabled={isBusy}
                style={[styles.primaryBtn, { marginTop: s.md, backgroundColor: c.primary, borderRadius: r.md }]}
              >
                {isBusy ? (
                  <ActivityIndicator color={c.bg} size="small" />
                ) : (
                  <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Save Pantry Item
                  </Text>
                )}
              </Pressable>
            </View>

            {!!itemId && (
              <>
                <View style={[styles.card, { marginTop: s.lg, backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Log Inventory Change
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s.xs, marginTop: s.sm }}>
                    {(['add', 'consume', 'waste', 'adjust'] as TxMode[]).map((mode) => {
                      const active = txMode === mode;
                      return (
                        <Pressable
                          key={mode}
                          onPress={() => setTxMode(mode)}
                          style={{
                            borderRadius: r.pill,
                            borderWidth: 1,
                            borderColor: active ? c.primary : c.border,
                            backgroundColor: active ? `${c.primary}15` : c.surface2,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                          }}
                        >
                          <Text style={{ color: active ? c.primary : c.textMuted, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                            {mode}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={{ flexDirection: 'row', gap: s.sm, marginTop: s.sm }}>
                    <Field label="Amount" value={txAmount} onChangeText={setTxAmount} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} keyboardType="decimal-pad" />
                    <Field label="Unit" value={unit} onChangeText={setUnit} colors={{ text: c.text, border: c.border, muted: c.textMuted }} family={ty.body.family} />
                  </View>

                  <Pressable
                    onPress={onLogTransaction}
                    disabled={txMutation.isPending}
                    style={[styles.secondaryBtn, { marginTop: s.md, borderColor: c.border, borderRadius: r.md }]}
                  >
                    {txMutation.isPending ? (
                      <ActivityIndicator color={c.text} size="small" />
                    ) : (
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                        Save Transaction
                      </Text>
                    )}
                  </Pressable>
                </View>

                <View style={[styles.card, { marginTop: s.md, backgroundColor: c.surface, borderRadius: r.md, padding: s.md }]}> 
                  <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                    Transaction History
                  </Text>

                  {txQuery.isLoading ? (
                    <View style={{ marginTop: s.sm }}>
                      <ActivityIndicator color={c.primary} size="small" />
                    </View>
                  ) : (
                    <View style={{ marginTop: s.sm, gap: s.xs }}>
                      {(txQuery.data || []).slice(0, 12).map((tx) => (
                        <Text key={tx.id} style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                          {new Date(tx.created_at).toLocaleString()} • {tx.transaction_type} {tx.quantity_delta}{tx.quantity_unit}
                        </Text>
                      ))}
                      {!txQuery.data?.length && (
                        <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs }}>
                          No transactions yet.
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  colors,
  family,
  keyboardType,
  style,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: { text: string; border: string; muted: string };
  family: string;
  keyboardType?: 'decimal-pad';
  style?: any;
}) {
  return (
    <View style={[{ flex: 1 }, style]}>
      <Text style={{ color: colors.muted, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.muted}
        style={{
          marginTop: 6,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: 10,
          paddingVertical: 10,
          color: colors.text,
          fontFamily: family,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {},
  primaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
});
