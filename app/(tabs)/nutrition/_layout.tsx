import { Stack } from 'expo-router';
import { useTokens } from '../../../lib/theme';

export default function NutritionLayout() {
  const { c } = useTokens();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="food-search" />
      <Stack.Screen name="food-camera" />
      <Stack.Screen name="barcode-scanner" />
      <Stack.Screen name="food-detail" />
      <Stack.Screen name="meal-detail" />
    </Stack>
  );
}
