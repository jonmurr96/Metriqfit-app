import { View, StyleSheet, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens } from '../../../../lib/theme';
import { TabBarIcon } from '../../../../components/navigation/TabBarIcon';
import { SupplementGuide } from '../../../../components/nutrition/SupplementGuide';

export default function SupplementGuideScreen() {
  const { c, ty } = useTokens();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { paddingHorizontal: 20, paddingTop: 10 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={20}>
          <TabBarIcon name="chevron-back" size={28} color={c.text} />
        </Pressable>
        <Text style={{ color: c.text, fontFamily: ty.heading.familySemibold, fontSize: ty.sizes.xl }}>
          Supplement Guide
        </Text>
        <View style={styles.backButton} />
      </View>
      <SupplementGuide />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
