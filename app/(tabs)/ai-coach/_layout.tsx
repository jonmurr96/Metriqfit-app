import { Stack } from 'expo-router';
import { useTokens } from '../../../lib/theme';

export default function AICoachLayout() {
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
    </Stack>
  );
}
