import { Database, Q } from '@nozbe/watermelondb';
import V1UserMovementTrack from '../database/models/V1UserMovementTrack';
import V1UserSwap from '../database/models/V1UserSwap';
import { ContinuityMethod, SwapReason } from '../../types/v1_engine';

export interface SetPerformance {
  reps: number;
  load: number;
}

/**
 * V1 Tracking Manager
 * Responsible for maintaining the "User State" regarding specific exercises.
 */
export class V1TrackingManager {
  constructor(private db: Database) {}

  /**
   * Calculates the Estimated 1RM using the Epley Formula:
   * 1RM = weight * (1 + reps/30)
   */
  public static calculateEpley1RM(weight: number, reps: number): number {
    if (reps <= 0) return 0;
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
  }

  /**
   * Updates the movement track for a specific exercise based on new performance data.
   */
  async updateMovementTrack(
    userId: string,
    exerciseId: string,
    performance: SetPerformance[]
  ): Promise<V1UserMovementTrack> {
    if (performance.length === 0) {
      throw new Error("No performance data provided.");
    }

    // 1. Find the best set (highest estimated 1RM)
    let bestSet = performance[0];
    let max1RM = 0;

    for (const set of performance) {
      const current1RM = V1TrackingManager.calculateEpley1RM(set.load, set.reps);
      if (current1RM > max1RM) {
        max1RM = current1RM;
        bestSet = set;
      }
    }

    // 2. Fetch existing track or create new one
    const tracksCollection = this.db.get<V1UserMovementTrack>('v1_user_movement_tracks');
    const existingTracks = await tracksCollection
      .query(Q.where('user_id', userId), Q.where('exercise_id', exerciseId))
      .fetch();

    const existingTrack = existingTracks[0];

    if (existingTrack) {
      return await this.db.write(async () => {
        return await existingTrack.update((record) => {
          record.estimated1Rm = max1RM;
          record.recentMaxReps = bestSet.reps;
          record.recentLoad = bestSet.load;
          record.lastPerformedAt = new Date();
        });
      });
    } else {
      return await this.db.write(async () => {
        return await tracksCollection.create((record) => {
          record.userId = userId;
          record.exerciseId = exerciseId;
          record.estimated1Rm = max1RM;
          record.recentMaxReps = bestSet.reps;
          record.recentLoad = bestSet.load;
          record.lastPerformedAt = new Date();
        });
      });
    }
  }

  /**
   * Fetches the historical context for a specific exercise.
   */
  async getMovementTrack(userId: string, exerciseId: string): Promise<V1UserMovementTrack | null> {
    const tracks = await this.db.get<V1UserMovementTrack>('v1_user_movement_tracks')
      .query(Q.where('user_id', userId), Q.where('exercise_id', exerciseId))
      .fetch();
    
    return tracks[0] || null;
  }

  /**
   * Logs a user-initiated exercise swap.
   */
  async logSwap(params: {
    userId: string;
    originalExerciseId: string;
    newExerciseId: string;
    replacementGroup: string;
    reason: SwapReason;
    continuityMethod: ContinuityMethod;
  }): Promise<V1UserSwap> {
    const swapsCollection = this.db.get<V1UserSwap>('v1_user_swaps');

    return await this.db.write(async () => {
      return await swapsCollection.create((record) => {
        record.userId = params.userId;
        record.originalExerciseId = params.originalExerciseId;
        record.newExerciseId = params.newExerciseId;
        record.replacementGroup = params.replacementGroup;
        record.reason = params.reason;
        record.continuityMethod = params.continuityMethod;
      });
    });
  }

  /**
   * Applies the swap logic to the user's movement tracks.
   * If continuity is requested, it copies the 1RM data from the old exercise to the new one.
   */
  async applySwapToTrack(params: {
    userId: string;
    originalExerciseId: string;
    newExerciseId: string;
    continuityMethod: ContinuityMethod;
  }): Promise<void> {
    if (params.continuityMethod !== ContinuityMethod.Continue) return;

    const oldTrack = await this.getMovementTrack(params.userId, params.originalExerciseId);
    if (!oldTrack) return;

    const tracksCollection = this.db.get<V1UserMovementTrack>('v1_user_movement_tracks');
    const existingNewTracks = await tracksCollection
      .query(Q.where('user_id', params.userId), Q.where('exercise_id', params.newExerciseId))
      .fetch();

    const newTrack = existingNewTracks[0];

    await this.db.write(async () => {
      if (newTrack) {
        await newTrack.update((record) => {
          record.estimated1Rm = oldTrack.estimated1Rm;
          record.recentMaxReps = oldTrack.recentMaxReps;
          record.recentLoad = oldTrack.recentLoad;
          // Note: we don't update lastPerformedAt to keep the "newness" of the exercise
        });
      } else {
        await tracksCollection.create((record) => {
          record.userId = params.userId;
          record.exerciseId = params.newExerciseId;
          record.estimated1Rm = oldTrack.estimated1Rm;
          record.recentMaxReps = oldTrack.recentMaxReps;
          record.recentLoad = oldTrack.recentLoad;
        });
      }
    });
  }
}
