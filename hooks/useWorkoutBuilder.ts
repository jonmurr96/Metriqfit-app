import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/AuthProvider';
import {
  addBlockExercise,
  addWorkoutPlanDay,
  addPlanDayBlock,
  createCustomWorkoutProgram,
  createPlanFromTemplateV2,
  getPlanDayBlocks,
  getProgramFamilies,
  getProgramsByFamily,
  getProgramTemplateV2,
  movePlanDayBlock,
  movePlanDayExercise,
  moveWorkoutPlanDay,
  publishWorkoutProgram,
  removeBlockExercise,
  removeWorkoutPlanDay,
  removePlanDayBlock,
  saveWorkoutPlanWeeklyLayout,
  updateBlockExercise,
  updateWorkoutPlanDay,
  updatePlanDayBlock,
} from '../services/workoutBuilderService';

export const workoutBuilderKeys = {
  all: ['workout-builder'] as const,
  families: () => [...workoutBuilderKeys.all, 'families'] as const,
  programs: (familyKey?: string) => [...workoutBuilderKeys.all, 'programs', familyKey || 'all'] as const,
  program: (templateId: string) => [...workoutBuilderKeys.all, 'program', templateId] as const,
  day: (planDayId: string) => [...workoutBuilderKeys.all, 'day', planDayId] as const,
};

export function useWorkoutProgramFamilies() {
  return useQuery({
    queryKey: workoutBuilderKeys.families(),
    queryFn: () => getProgramFamilies(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useWorkoutProgramsByFamily(familyKey?: string) {
  return useQuery({
    queryKey: workoutBuilderKeys.programs(familyKey),
    queryFn: () => getProgramsByFamily(familyKey),
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkoutProgramTemplateV2(templateId?: string) {
  return useQuery({
    queryKey: workoutBuilderKeys.program(templateId || ''),
    queryFn: () => getProgramTemplateV2(templateId || ''),
    enabled: !!templateId,
  });
}

export function usePlanDayBlocks(planDayId?: string) {
  return useQuery({
    queryKey: workoutBuilderKeys.day(planDayId || ''),
    queryFn: () => getPlanDayBlocks(planDayId || ''),
    enabled: !!planDayId,
  });
}

export function useAddWorkoutPlanDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planId: string;
      name?: string;
      focus?: string | null;
      dayType?: string;
      estimatedDurationMin?: number | null;
    }) => addWorkoutPlanDay(input.planId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useUpdateWorkoutPlanDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planDayId: string;
      updates: Partial<{
        name: string;
        focus: string | null;
        day_type: string;
        estimated_duration_min: number | null;
      }>;
    }) => updateWorkoutPlanDay(input.planDayId, input.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useRemoveWorkoutPlanDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeWorkoutPlanDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useMoveWorkoutPlanDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; planDayId: string; direction: 'up' | 'down' }) =>
      moveWorkoutPlanDay(input.planId, input.planDayId, input.direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useCreateCustomWorkoutProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; daysPerWeek: number; activate?: boolean }) => {
      if (!user) throw new Error('Authentication required');
      return createCustomWorkoutProgram(user.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
    },
  });
}

export function useCreateWorkoutPlanFromTemplateV2() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: { templateId: string; name?: string; description?: string; activate?: boolean }) => {
      if (!user) throw new Error('Authentication required');
      return createPlanFromTemplateV2(user.id, input.templateId, {
        name: input.name,
        description: input.description,
        activate: input.activate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useAddPlanDayBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planDayId: string;
      input: {
        blockType: 'normal' | 'superset' | 'giant_set' | 'drop_set' | 'rest_pause' | 'amrap' | 'warmup_protocol';
        title?: string;
        config?: Record<string, any>;
      };
    }) => addPlanDayBlock(input.planDayId, input.input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.day(vars.planDayId) });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useUpdatePlanDayBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      blockId: string;
      title?: string;
      blockType?: 'normal' | 'superset' | 'giant_set' | 'drop_set' | 'rest_pause' | 'amrap' | 'warmup_protocol';
      config?: Record<string, any>;
      planDayId?: string;
    }) => updatePlanDayBlock(input.blockId, input),
    onSuccess: (_, vars) => {
      if (vars.planDayId) {
        queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.day(vars.planDayId) });
      }
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useRemovePlanDayBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removePlanDayBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useMovePlanDayBlock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { blockId: string; direction: 'up' | 'down' }) =>
      movePlanDayBlock(input.blockId, input.direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useMovePlanDayExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { planDayId: string; planExerciseId: string; direction: 'up' | 'down' }) =>
      movePlanDayExercise(input.planDayId, input.planExerciseId, input.direction),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.day(vars.planDayId) });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useAddBlockExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planDayId: string;
      input: {
        blockId?: string | null;
        exerciseId: string;
        setsTarget?: number;
        repsMin?: number;
        repsMax?: number;
        restSeconds?: number;
        tempo?: string | null;
        techniqueType?: string | null;
        notes?: string | null;
      };
    }) => addBlockExercise(input.planDayId, input.input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.day(vars.planDayId) });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useUpdateBlockExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      planExerciseId: string;
      updates: Partial<{
        block_id: string | null;
        sets_target: number;
        reps_min: number;
        reps_max: number;
        rest_seconds: number;
        tempo: string | null;
        technique_type: string | null;
        rir_target_min: number | null;
        rir_target_max: number | null;
        rpe_target_min: number | null;
        rpe_target_max: number | null;
        pause_seconds: number | null;
        set_style: string | null;
        user_notes: string | null;
      }>;
      planDayId?: string;
    }) => updateBlockExercise(input.planExerciseId, input.updates),
    onSuccess: (_, vars) => {
      if (vars.planDayId) {
        queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.day(vars.planDayId) });
      }
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function useRemoveBlockExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeBlockExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
      queryClient.invalidateQueries({ queryKey: ['plan'] });
    },
  });
}

export function usePublishWorkoutProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (planId: string) => {
      if (!user) throw new Error('Authentication required');
      return publishWorkoutProgram(user.id, planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: ['workout'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}

export function useSaveWorkoutPlanWeeklyLayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; layout: Parameters<typeof saveWorkoutPlanWeeklyLayout>[1] }) =>
      saveWorkoutPlanWeeklyLayout(input.planId, input.layout),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan'] });
      queryClient.invalidateQueries({ queryKey: workoutBuilderKeys.all });
    },
  });
}
