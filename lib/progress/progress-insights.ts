export type ProgressTimeframe = 'week' | 'month' | 'year';
export type ProgressRangeOption = '7D' | '14D' | '1M' | '3M' | '6M' | '12M';
export type ProgressSummaryStatus = 'on_track' | 'watch' | 'stale' | 'insufficient_data';
export type ProgressBucketSize = 'day' | 'week' | 'month';
export type MetricQualityStatus = 'good' | 'warn' | 'missing';

export interface ProgressRangeConfig {
  label: ProgressRangeOption;
  days: number;
  timeframe: ProgressTimeframe;
  bucketSize: ProgressBucketSize;
}

export interface ProgressQualityFlagLike {
  key: string;
  status: MetricQualityStatus;
}

export interface ProgressFreshnessLike {
  weightLastLoggedAt: string | null;
  consistencyLastLoggedAt: string | null;
  workoutLastSessionAt: string | null;
}

export interface ProgressSummaryInput {
  goalBenchmarkStatus: 'on_track' | 'off_track' | 'insufficient_data' | null;
  consistencyAverage: number;
  weightChangePercent: number;
  sessionsPerWeek: number;
  volumeChangePercent: number | null;
  prCount30d: number;
  qualityFlags: ProgressQualityFlagLike[];
  dataFreshness: ProgressFreshnessLike;
}

export interface ProgressSummaryOutput {
  status: ProgressSummaryStatus;
  headline: string;
  subheadline: string;
  primaryDriver: 'weight' | 'consistency' | 'performance' | 'mixed';
}

export interface ProgressRecordLike {
  id: string;
  weight_lb: number | null;
  reps: number | null;
  estimated_1rm: number | null;
  achieved_at: string;
  exercise?: {
    id?: string | null;
    name?: string | null;
    category?: string | null;
    primary_muscle?: string | null;
  } | null;
}

export interface ProgressRecordHighlight {
  id: string;
  exercise: string;
  value: number;
  unit: string;
  previousBest: number | null;
  improvementPercent: number | null;
  date: string;
  isNew: boolean;
}

export interface ProgressRecordRow {
  id: string;
  exercise: string;
  date: string;
  weightLb: number;
  reps: number;
  estimated1Rm: number;
  movementFamily: string | null;
}

export interface ProgressTopLiftRow {
  exercise: string;
  estimated1Rm: number;
  achievedAt: string;
}

export interface ProgressMovementFamilyRow {
  family: string;
  count: number;
  maxEstimated1Rm: number;
}

export interface ProgressRecordSummaryOutput {
  highlight: ProgressRecordHighlight | null;
  recentRecords: ProgressRecordRow[];
  topEstimated1Rm: ProgressTopLiftRow[];
  movementFamilies: ProgressMovementFamilyRow[];
}

export interface DatedValuePoint {
  date: string;
  value: number;
}

export interface BucketedTrendPoint {
  day: string;
  value: number;
  isToday?: boolean;
}

const RANGE_CONFIGS: Record<ProgressRangeOption, ProgressRangeConfig> = {
  '7D': { label: '7D', days: 7, timeframe: 'week', bucketSize: 'day' },
  '14D': { label: '14D', days: 14, timeframe: 'week', bucketSize: 'day' },
  '1M': { label: '1M', days: 30, timeframe: 'month', bucketSize: 'week' },
  '3M': { label: '3M', days: 90, timeframe: 'month', bucketSize: 'week' },
  '6M': { label: '6M', days: 180, timeframe: 'year', bucketSize: 'month' },
  '12M': { label: '12M', days: 365, timeframe: 'year', bucketSize: 'month' },
};

export function getProgressRangeConfig(range: ProgressRangeOption): ProgressRangeConfig {
  return RANGE_CONFIGS[range];
}

function toIsoDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function titleCase(value: string) {
  return value
    .split(/[\s_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}

function formatWeightTrend(changePercent: number) {
  if (Math.abs(changePercent) < 0.35) return 'Weight trend steady';
  const direction = changePercent < 0 ? 'down' : 'up';
  return `Weight ${direction} ${Math.abs(changePercent).toFixed(1)}%`;
}

function formatConsistency(consistencyAverage: number) {
  if (consistencyAverage >= 80) return 'consistency holding';
  if (consistencyAverage >= 65) return 'consistency steady';
  if (consistencyAverage > 0) return 'consistency needs attention';
  return 'consistency data thin';
}

function formatPerformance(volumeChangePercent: number | null, sessionsPerWeek: number, prCount30d: number) {
  if (volumeChangePercent != null && Math.abs(volumeChangePercent) >= 1) {
    return `training volume ${volumeChangePercent >= 0 ? 'up' : 'down'} ${Math.abs(volumeChangePercent)}%`;
  }
  if (prCount30d > 0) {
    return `${prCount30d} PR${prCount30d === 1 ? '' : 's'} in the last 30 days`;
  }
  if (sessionsPerWeek > 0) {
    return `${sessionsPerWeek.toFixed(1)} sessions/week`;
  }
  return 'training data thin';
}

function resolvePrimaryDriver(input: ProgressSummaryInput): ProgressSummaryOutput['primaryDriver'] {
  if ((input.volumeChangePercent ?? 0) >= 3 || input.prCount30d > 0 || input.sessionsPerWeek >= 3) {
    return 'performance';
  }
  if (input.consistencyAverage >= 78) return 'consistency';
  if (Math.abs(input.weightChangePercent) >= 0.6) return 'weight';
  return 'mixed';
}

export function buildProgressSummary(input: ProgressSummaryInput): ProgressSummaryOutput {
  const freshnessDays = [
    daysSince(input.dataFreshness.weightLastLoggedAt),
    daysSince(input.dataFreshness.consistencyLastLoggedAt),
    daysSince(input.dataFreshness.workoutLastSessionAt),
  ];
  const staleSignals = freshnessDays.filter((days) => days == null || days > 10).length;
  const missingSignals = input.qualityFlags.filter((flag) => flag.status === 'missing').length;
  const goodSignals = input.qualityFlags.filter((flag) => flag.status === 'good').length;
  const primaryDriver = resolvePrimaryDriver(input);

  const fragments = [
    formatWeightTrend(input.weightChangePercent),
    formatConsistency(input.consistencyAverage),
    formatPerformance(input.volumeChangePercent, input.sessionsPerWeek, input.prCount30d),
  ];

  if (staleSignals >= 2) {
    return {
      status: 'stale',
      headline: 'Needs fresh check-ins',
      subheadline: `${fragments[0]}, ${fragments[1]}, and fresh check-ins will improve confidence.`,
      primaryDriver: 'mixed',
    };
  }

  if (missingSignals >= 2 && goodSignals === 0) {
    return {
      status: 'insufficient_data',
      headline: 'Need more data',
      subheadline: 'Log a few weigh-ins, workouts, and consistency days to make Progress more reliable.',
      primaryDriver: 'mixed',
    };
  }

  const positivePerformance = (input.volumeChangePercent ?? 0) >= 3 || input.prCount30d > 0 || input.sessionsPerWeek >= 2.5;
  const healthyConsistency = input.consistencyAverage >= 72;

  if (input.goalBenchmarkStatus === 'on_track' || (positivePerformance && healthyConsistency)) {
    return {
      status: 'on_track',
      headline: 'On track',
      subheadline: `${fragments[0]}, ${fragments[1]}, ${fragments[2]}.`,
      primaryDriver,
    };
  }

  return {
    status: 'watch',
    headline: 'Watch this week',
    subheadline: `${fragments[0]}, ${fragments[1]}, ${fragments[2]}.`,
    primaryDriver,
  };
}

function inferMovementFamily(record: ProgressRecordLike) {
  const category = String(record.exercise?.category || '').toLowerCase();
  const primaryMuscle = String(record.exercise?.primary_muscle || '').toLowerCase();
  const exerciseName = String(record.exercise?.name || '').toLowerCase();

  if (category.includes('lower') || /(squat|deadlift|leg|calf|glute|hamstring|quad)/.test(exerciseName) || /(quads|glutes|hamstrings|calves)/.test(primaryMuscle)) {
    return 'Lower Body';
  }
  if (category.includes('back') || category.includes('pull') || /(row|pull|lat)/.test(exerciseName) || /(lats|upper_back|rear_delts)/.test(primaryMuscle)) {
    return 'Pull';
  }
  if (category.includes('chest') || category.includes('push') || /(bench|press|fly|dip)/.test(exerciseName) || primaryMuscle === 'chest') {
    return 'Push';
  }
  if (category.includes('arm') || /(curl|extension|triceps|biceps)/.test(exerciseName) || /(triceps|biceps|forearms)/.test(primaryMuscle)) {
    return 'Arms';
  }
  if (category.includes('shoulder') || /(raise|shoulder|delt)/.test(exerciseName) || /(shoulders|front_delts|lateral_delts)/.test(primaryMuscle)) {
    return 'Shoulders';
  }
  if (record.exercise?.category) return titleCase(String(record.exercise.category));
  if (record.exercise?.primary_muscle) return titleCase(String(record.exercise.primary_muscle));
  return null;
}

export function buildProgressRecordSummary(records: ProgressRecordLike[]): ProgressRecordSummaryOutput {
  const sorted = [...records].sort((a, b) => Date.parse(b.achieved_at) - Date.parse(a.achieved_at));
  const highlightSource = sorted[0] || null;
  const previousBest = highlightSource
    ? sorted.find((record) => record.id !== highlightSource.id && record.exercise?.name === highlightSource.exercise?.name)
    : null;

  const highlight = highlightSource
    ? {
        id: highlightSource.id,
        exercise: highlightSource.exercise?.name || 'Unknown Exercise',
        value: Number(highlightSource.weight_lb || 0),
        unit: 'lb',
        previousBest: previousBest ? Number(previousBest.weight_lb || previousBest.estimated_1rm || 0) : null,
        improvementPercent: previousBest?.estimated_1rm
          ? Math.round((((Number(highlightSource.estimated_1rm || 0) - Number(previousBest.estimated_1rm || 0)) / Number(previousBest.estimated_1rm || 1)) * 100) * 10) / 10
          : null,
        date: highlightSource.achieved_at,
        isNew: true,
      }
    : null;

  const recentRecords = sorted.slice(0, 6).map((record) => ({
    id: record.id,
    exercise: record.exercise?.name || 'Unknown Exercise',
    date: record.achieved_at,
    weightLb: Number(record.weight_lb || 0),
    reps: Number(record.reps || 0),
    estimated1Rm: Number(record.estimated_1rm || 0),
    movementFamily: inferMovementFamily(record),
  }));

  const topEstimated1Rm = [...sorted]
    .sort((a, b) => Number(b.estimated_1rm || 0) - Number(a.estimated_1rm || 0))
    .slice(0, 3)
    .map((record) => ({
      exercise: record.exercise?.name || 'Unknown Exercise',
      estimated1Rm: Number(record.estimated_1rm || 0),
      achievedAt: record.achieved_at,
    }));

  const familyMap = new Map<string, { count: number; maxEstimated1Rm: number }>();
  sorted.forEach((record) => {
    const family = inferMovementFamily(record);
    if (!family) return;
    const current = familyMap.get(family) || { count: 0, maxEstimated1Rm: 0 };
    current.count += 1;
    current.maxEstimated1Rm = Math.max(current.maxEstimated1Rm, Number(record.estimated_1rm || 0));
    familyMap.set(family, current);
  });

  const movementFamilies = Array.from(familyMap.entries())
    .map(([family, value]) => ({
      family,
      count: value.count,
      maxEstimated1Rm: value.maxEstimated1Rm,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.maxEstimated1Rm - a.maxEstimated1Rm;
    });

  return {
    highlight,
    recentRecords,
    topEstimated1Rm,
    movementFamilies,
  };
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function bucketTrendSeries(
  range: ProgressRangeOption,
  points: DatedValuePoint[],
  mode: 'sum' | 'average' = 'average',
): BucketedTrendPoint[] {
  const config = getProgressRangeConfig(range);
  const today = startOfDay(new Date());
  const start = startOfDay(new Date(today));
  start.setDate(today.getDate() - (config.days - 1));
  const pointMap = new Map<string, number[]>();

  points.forEach((point) => {
    const date = point.date.length > 10 ? point.date.split('T')[0] : point.date;
    const bucketKey = resolveBucketKey(config.bucketSize, date, start);
    const existing = pointMap.get(bucketKey) || [];
    existing.push(point.value);
    pointMap.set(bucketKey, existing);
  });

  const buckets = buildBucketSequence(config.bucketSize, start, today);
  return buckets.map((bucket) => {
    const bucketValues = pointMap.get(bucket.key) || [];
    const value = bucketValues.length === 0
      ? 0
      : mode === 'sum'
        ? Math.round(bucketValues.reduce((sum, current) => sum + current, 0))
        : Math.round((bucketValues.reduce((sum, current) => sum + current, 0) / bucketValues.length) * 10) / 10;

    return {
      day: bucket.label,
      value,
      isToday: bucket.isToday,
    };
  });
}

function resolveBucketKey(bucketSize: ProgressBucketSize, isoDate: string, rangeStart: Date) {
  if (bucketSize === 'day') return isoDate;
  if (bucketSize === 'month') return isoDate.slice(0, 7);
  const date = startOfDay(new Date(isoDate));
  const diffDays = Math.floor((date.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
  const bucketIndex = Math.max(0, Math.floor(diffDays / 7));
  return `week-${bucketIndex + 1}`;
}

function buildBucketSequence(bucketSize: ProgressBucketSize, rangeStart: Date, today: Date) {
  if (bucketSize === 'day') {
    const days = Math.floor((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Array.from({ length: days }, (_, index) => {
      const date = startOfDay(new Date(rangeStart));
      date.setDate(rangeStart.getDate() + index);
      const iso = toIsoDate(date);
      return {
        key: iso,
        label: `${date.getMonth() + 1}/${date.getDate()}`,
        isToday: iso === toIsoDate(today),
      };
    });
  }

  if (bucketSize === 'week') {
    const totalDays = Math.floor((today.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const bucketCount = Math.ceil(totalDays / 7);
    return Array.from({ length: bucketCount }, (_, index) => {
      const bucketStart = startOfDay(new Date(rangeStart));
      bucketStart.setDate(rangeStart.getDate() + index * 7);
      const bucketEnd = startOfDay(new Date(bucketStart));
      bucketEnd.setDate(bucketStart.getDate() + 6);
      return {
        key: `week-${index + 1}`,
        label: `W${index + 1}`,
        isToday: today >= bucketStart && today <= bucketEnd,
      };
    });
  }

  const monthKeys: string[] = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  const finalMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  while (cursor <= finalMonth) {
    monthKeys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return monthKeys.map((key) => {
    const [year, month] = key.split('-').map(Number);
    return {
      key,
      label: new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
      isToday: today.getFullYear() === year && today.getMonth() === month - 1,
    };
  });
}
