/**
 * program-detail.tsx
 * 
 * Program detail screen - uses new V2 component with scientific exercise selection.
 */

import { useLocalSearchParams } from 'expo-router';
import ProgramDetailV2 from '../../../components/programs/ProgramDetailV2';

export default function ProgramDetailScreen() {
  const { programId } = useLocalSearchParams<{ programId?: string }>();

  if (!programId) {
    return null;
  }

  return <ProgramDetailV2 programId={programId} />;
}
