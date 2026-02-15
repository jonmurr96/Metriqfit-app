import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTokens } from '../../lib/theme';
import { TabBarIcon } from '../navigation/TabBarIcon';

export function NutritionEliteGate({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const { c, s, ty, r } = useTokens();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: c.surface, borderRadius: r.lg, padding: s.xl }]}> 
      <TabBarIcon name="diamond-outline" color={c.primary} size={56} />
      <Text
        style={{
          marginTop: s.lg,
          color: c.text,
          fontFamily: ty.heading.familySemibold,
          fontSize: ty.sizes.lg,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: s.sm,
          color: c.textMuted,
          fontFamily: ty.body.family,
          fontSize: ty.sizes.md,
          textAlign: 'center',
        }}
      >
        {subtitle}
      </Text>
      <Pressable
        onPress={() => router.push('/settings/subscription')}
        style={{
          marginTop: s.xl,
          backgroundColor: c.primary,
          borderRadius: r.md,
          paddingVertical: 12,
          paddingHorizontal: 20,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: c.bg, fontFamily: ty.body.familySemibold, fontSize: ty.sizes.md }}>
          Upgrade to Elite
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
