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
      <Stack.Screen name="tools/index" />
      <Stack.Screen name="program-builder" />
      <Stack.Screen name="program-builder-day" />
      <Stack.Screen name="program-builder-exercise" />
      <Stack.Screen name="import-plan" />
      <Stack.Screen name="regenerate-plan" />
      <Stack.Screen name="adaptation" />
      <Stack.Screen name="active-session" />
      <Stack.Screen name="my-plan" />
      <Stack.Screen name="program-browser" />
      <Stack.Screen name="program-detail" />
      <Stack.Screen name="day-preview" />
      <Stack.Screen name="day-detail" />
      <Stack.Screen name="summary" />
      <Stack.Screen name="workout-history" />
      <Stack.Screen name="workout-notes" />
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
