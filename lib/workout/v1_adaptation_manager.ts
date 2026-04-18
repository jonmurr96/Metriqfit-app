import { Database, Q } from '@nozbe/watermelondb';
import V1ExerciseSubstitution from '../database/models/V1ExerciseSubstitution';
import V1UserSwap from '../database/models/V1UserSwap';
import { ContinuityMethod } from '../../types/v1_engine';

/**
 * Manages user exercise preferences and adaptations.
 */
export class V1AdaptationManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Saves a user's preference to substitute one exercise for another.
   * If a preference already exists for this exercise, it updates it.
   */
  async saveUserSubstitution(
    userId: string,
    originalExerciseId: string,
    replacementExerciseId: string
  ) {
    const existing = await this.db.get<V1ExerciseSubstitution>('v1_exercise_substitutions')
      .query(
        Q.where('user_id', userId),
        Q.where('exercise_id', originalExerciseId)
      )
      .fetch();

    if (existing.length > 0) {
      await this.db.write(async () => {
        await existing[0].update(record => {
          record.substituteExerciseId = replacementExerciseId;
        });
      });
    } else {
      await this.db.write(async () => {
        await this.db.get<V1ExerciseSubstitution>('v1_exercise_substitutions').create(record => {
          record.userId = userId;
          record.exerciseId = originalExerciseId;
          record.substituteExerciseId = replacementExerciseId;
          record.preferenceRank = 1;
          record.isGlobal = true;
        });
      });
    }
  }

  /**
   * Retrieves a saved substitution for a specific exercise.
   */
  async getUserSubstitution(
    userId: string,
    exerciseId: string
  ): Promise<string | null> {
    const results = await this.db.get<V1ExerciseSubstitution>('v1_exercise_substitutions')
      .query(
        Q.where('user_id', userId),
        Q.where('exercise_id', exerciseId)
      )
      .fetch();

    return results.length > 0 ? results[0].substituteExerciseId : null;
  }

  /**
   * Clears a previously saved substitution.
   */
  async clearUserSubstitution(userId: string, exercise_id: string) {
    const results = await this.db.get<V1ExerciseSubstitution>('v1_exercise_substitutions')
      .query(
        Q.where('user_id', userId),
        Q.where('exercise_id', exercise_id)
      )
      .fetch();

    if (results.length > 0) {
      await this.db.write(async () => {
        await results[0].destroyPermanently();
      });
    }
  }

  /**
   * Logs a user swap event.
   */
  async logUserSwap(
    userId: string,
    originalExId: string,
    newExId: string,
    group: string,
    reason: string,
    continuity: ContinuityMethod
  ) {
    await this.db.write(async () => {
      await this.db.get<V1UserSwap>('v1_user_swaps').create(record => {
        record.userId = userId;
        record.originalExerciseId = originalExId;
        record.newExerciseId = newExId;
        record.replacementGroup = group;
        record.reason = reason;
        record.continuityMethod = continuity;
      });
    });
  }
}
