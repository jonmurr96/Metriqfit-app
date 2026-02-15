import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../../lib/theme';
import { TabBarIcon } from '../../../../components/navigation/TabBarIcon';
import { NutritionEliteGate } from '../../../../components/nutrition/NutritionEliteGate';
import { useFeatureAccess } from '../../../../hooks/useSubscription';
import { usePantryItems } from '../../../../hooks/usePantry';

export default function PantryScreen() {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const access = useFeatureAccess('grocery_pantry_builder');
  const pantryQuery = usePantryItems();

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const items = pantryQuery.data || [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(q));
  }, [pantryQuery.data, search]);

  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(now.getDate() + 7);

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { paddingHorizontal: s.lg }]}> 
        <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: c.surface, borderRadius: r.pill }]}> 
          <TabBarIcon name="chevron-back" color={c.text} size={22} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.lg }}>
          Pantry
        </Text>
        <Pressable
          onPress={() => router.push('/(tabs)/nutrition/pantry/item')}
          style={[styles.iconBtn, { backgroundColor: c.primary, borderRadius: r.pill }]}
        >
          <TabBarIcon name="add" color={c.bg} size={20} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: s.lg, paddingBottom: insets.bottom + s.xl }}>
        {!access.isLoading && !access.hasAccess ? (
          <NutritionEliteGate
            title="Elite Pantry"
            subtitle="Track inventory, depletion, expiration, and pantry-aware grocery planning."
          />
        ) : (
          <>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search pantry"
              placeholderTextColor={c.textMuted}
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: r.md,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: c.text,
                fontFamily: ty.body.family,
              }}
            />

            {pantryQuery.isLoading ? (
              <View style={{ paddingVertical: s.xl, alignItems: 'center' }}>
                <ActivityIndicator color={c.primary} />
              </View>
            ) : (
              <View style={{ marginTop: s.lg, gap: s.sm }}>
                {filtered.map((item) => {
                  const lowStock = Number(item.quantity_value || 0) <= Number(item.reorder_threshold || 0);
                  const expiresSoon = item.expires_at ? new Date(item.expires_at) <= sevenDays : false;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => router.push({ pathname: '/(tabs)/nutrition/pantry/item', params: { itemId: item.id } })}
                      style={{
                        borderRadius: r.md,
                        borderWidth: 1,
                        borderColor: lowStock ? (c.warning || '#f59e0b') : c.border,
                        backgroundColor: c.surface,
                        padding: s.md,
                      }}
                    >
                      <Text style={{ color: c.text, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.sm }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.xs, marginTop: 4 }}>
                        {item.quantity_value}{item.quantity_unit} on hand
                        {item.location ? ` • ${item.location}` : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: s.xs, marginTop: 6 }}>
                        {lowStock && (
                          <Text style={{ color: c.warning || '#f59e0b', fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                            Low stock
                          </Text>
                        )}
                        {expiresSoon && (
                          <Text style={{ color: c.danger || '#ef4444', fontFamily: ty.body.familySemibold, fontSize: ty.sizes.xs }}>
                            Expires soon
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })}

                {!filtered.length && (
                  <Text style={{ color: c.textMuted, fontFamily: ty.body.family, fontSize: ty.sizes.sm, textAlign: 'center' }}>
                    No pantry items yet.
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
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
});
