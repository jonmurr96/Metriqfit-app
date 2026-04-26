import { Stack } from 'expo-router';
import { useTokens } from '../../../lib/theme';

export default function ProgressLayout() {
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
      <Stack.Screen name="personal-records" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="daily-summary" />
      <Stack.Screen name="trends" />
      <Stack.Screen name="weekly-review" />
      <Stack.Screen name="photo-compare" />
    </Stack>
  );
}
