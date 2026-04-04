import { Database, Q } from '@nozbe/watermelondb';
import V1AdaptationHistory from '../database/models/V1AdaptationHistory';

export enum BlockStatus {
  Active = 'active',
  Completed = 'completed',
  Abandoned = 'abandoned',
}

/**
 * V1 Session State Manager
 * Handles the high-level lifecycle of a user's training block.
 */
export class V1SessionStateManager {
  constructor(private db: Database) {}

  /**
   * Initializes a new training block for a user.
   */
  async initializeUserBlock(userId: string, templateId: string): Promise<V1AdaptationHistory> {
    const historyCollection = this.db.get<V1AdaptationHistory>('v1_adaptation_history');
    
    // Check for existing active blocks
    const activeBlocks = await historyCollection
      .query(Q.where('user_id', userId), Q.where('completion_status', BlockStatus.Active))
      .fetch();

    // If there's an active block, we could either return it or close it. 
    // For V1, we'll return the existing one if it's the same template, otherwise close and start new.
    const currentBlock = activeBlocks[0];
    if (currentBlock && currentBlock.templateId === templateId) {
      return currentBlock;
    }

    if (currentBlock) {
      await this.db.write(async () => {
        await currentBlock.update((record) => {
          record.completionStatus = BlockStatus.Abandoned;
          record.completedAt = new Date();
        });
      });
    }

    return await this.db.write(async () => {
      return await historyCollection.create((record) => {
        record.userId = userId;
        record.templateId = templateId;
        record.blockNumber = 1;
        record.startedAt = new Date();
        record.completionStatus = BlockStatus.Active;
      });
    });
  }

  /**
   * Records the completion of a session and increments the block progress.
   */
  async completeUserSession(userId: string, templateId: string): Promise<V1AdaptationHistory | null> {
    const historyCollection = this.db.get<V1AdaptationHistory>('v1_adaptation_history');
    const activeBlocks = await historyCollection
      .query(
        Q.where('user_id', userId), 
        Q.where('template_id', templateId), 
        Q.where('completion_status', BlockStatus.Active)
      )
      .fetch();

    const block = activeBlocks[0];
    if (!block) return null;

    return await this.db.write(async () => {
      return await block.update((record) => {
        // In V1, we just increment the block number (representing total sessions completed in this block)
        record.blockNumber += 1;
        // If block reaches a certain threshold (e.g. 4-6 weeks), we might mark it as completed.
        // For now, it stays active until explicitly finished.
      });
    });
  }

  /**
   * Marks a block as finished.
   */
  async finishBlock(userId: string, templateId: string): Promise<void> {
    const historyCollection = this.db.get<V1AdaptationHistory>('v1_adaptation_history');
    const activeBlocks = await historyCollection
      .query(Q.where('user_id', userId), Q.where('template_id', templateId), Q.where('completion_status', BlockStatus.Active))
      .fetch();

    for (const block of activeBlocks) {
      await this.db.write(async () => {
        await block.update((record) => {
          record.completionStatus = BlockStatus.Completed;
          record.completedAt = new Date();
        });
      });
    }
  }
}
