import { Stack } from 'expo-router';
import { useTokens } from '../../../lib/theme';

export default function WorkoutLayout() {
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
      <Stack.Screen name="active-session" />
      <Stack.Screen name="program-browser" />
      <Stack.Screen name="day-preview" />
      <Stack.Screen name="workout-history" />
      <Stack.Screen name="exercise-library" />
      <Stack.Screen
        name="calculators/plate-calculator"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="calculators/one-rep-max"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack>
  );
}
