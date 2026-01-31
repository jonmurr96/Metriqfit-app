import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

export interface UserTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface TodayProgress {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

const DEFAULT_TARGETS: UserTargets = {
  calories: 2000,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 65,
  water_ml: 2500,
};

const EMPTY_PROGRESS: TodayProgress = {
  calories: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  water_ml: 0,
};

export function useTargets() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<UserTargets>(DEFAULT_TARGETS);
  const [progress, setProgress] = useState<TodayProgress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTargets = useCallback(async () => {
    if (!user?.id) {
      setTargets(DEFAULT_TARGETS);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_targets')
        .select('calories, protein_g, carbs_g, fat_g, water_ml')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setTargets(DEFAULT_TARGETS);
        } else {
          throw fetchError;
        }
      } else if (data) {
        setTargets({
          calories: (data as any).calories,
          protein_g: (data as any).protein_g,
          carbs_g: (data as any).carbs_g,
          fat_g: (data as any).fat_g,
          water_ml: (data as any).water_ml,
        });
      }
    } catch (err) {
      console.error('[useTargets] Error fetching targets:', err);
      setError('Failed to load targets');
      setTargets(DEFAULT_TARGETS);
    }
  }, [user?.id]);

  const fetchTodayProgress = useCallback(async () => {
    if (!user?.id) {
      setProgress(EMPTY_PROGRESS);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString();

      const { data: waterData, error: waterError } = await supabase
        .from('water_logs')
        .select('amount_ml')
        .eq('user_id', user.id)
        .gte('logged_at', todayISO)
        .lt('logged_at', tomorrowISO);

      if (waterError) throw waterError;

      const logs = (waterData || []) as any[];
      const totalWater = logs.reduce((sum, log) => sum + log.amount_ml, 0);

      setProgress((prev) => ({
        ...prev,
        water_ml: totalWater,
      }));
    } catch (err) {
      console.error('[useTargets] Error fetching progress:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchTargets(), fetchTodayProgress()]);
      setLoading(false);
    };
    load();
  }, [fetchTargets, fetchTodayProgress]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchTargets(), fetchTodayProgress()]);
  }, [fetchTargets, fetchTodayProgress]);

  return {
    targets,
    progress,
    loading,
    error,
    refetch,
    remaining: {
      calories: Math.max(0, targets.calories - progress.calories),
      protein_g: Math.max(0, targets.protein_g - progress.protein_g),
      carbs_g: Math.max(0, targets.carbs_g - progress.carbs_g),
      fat_g: Math.max(0, targets.fat_g - progress.fat_g),
      water_ml: Math.max(0, targets.water_ml - progress.water_ml),
    },
  };
}
