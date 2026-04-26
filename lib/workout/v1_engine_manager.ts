import { Database, Q } from '@nozbe/watermelondb';
import { OnboardingProfileInput, routeUserToPlan } from './v1_librarian_router';
import { resolveTemplateSlot } from './v1_mechanic';
import { isExerciseAllowed, V1UserValidationProfile } from './v1_validator';
import { V1AdaptationManager } from './v1_adaptation_manager';
import V1Exercise from '../database/models/V1Exercise';
import V1PlanFamily from '../database/models/V1PlanFamily';
import V1Template from '../database/models/V1Template';
import V1WorkoutDay from '../database/models/V1WorkoutDay';
import V1TemplateSlot from '../database/models/V1TemplateSlot';
import { V1TrackingManager } from './v1_tracking_manager';

/**
 * High-level orchestration manager for the V1 Workout Engine.
 */
export class V1WorkoutEngineManager {
  private db: Database;
  private adaptationManager: V1AdaptationManager;
  private trackingManager: V1TrackingManager;

  constructor(db: Database) {
    this.db = db;
    this.adaptationManager = new V1AdaptationManager(db);
    this.trackingManager = new V1TrackingManager(db);
  }


  /**
   * Generates a fully populated one-time workout plan (session) 
   * for a user based on their onboarding profile.
   */
  async generateV1WorkoutSession(profileInput: OnboardingProfileInput) {
    // 1. Identify the Plan Family (The Librarian)
    const { familyIdRef } = routeUserToPlan(profileInput);
    
    const families = await this.db.get<V1PlanFamily>('v1_plan_families')
      .query(Q.where('family_id_ref', familyIdRef))
      .fetch();
      
    if (families.length === 0) {
      throw new Error(`Plan family not found for reference: ${familyIdRef}`);
    }
    const family = families[0];

    // 2. Select the Template (For V1 we pick the first one)
    const templates = await this.db.get<V1Template>('v1_templates')
      .query(Q.where('plan_family_id', family.id))
      .fetch();
      
    if (templates.length === 0) {
      throw new Error(`No templates found for family: ${family.id}`);
    }
    // Sort by order_index if it exists, otherwise pick first
    const template = templates[0];

    // 3. Prepare the Validation Profile
    const validationProfile: V1UserValidationProfile = {
      environment: profileInput.environment,
      liftComfort: profileInput.liftComfort,
      contraindications: [], // TODO: map from profile input if exists
    };

    // 4. Fetch the Global Exercise Pool
    const exerciseModels = await this.db.get<V1Exercise>('v1_exercises').query().fetch();
    const exercisePool = exerciseModels.map((m: V1Exercise) => ({
      id: m.id,
      name: m.name,
      movementPattern: m.movementPattern,
      architecturalGroup: m.architecturalGroup,
      equipmentCategory: m.equipmentCategory,
      setupComplexity: m.setupComplexity,
      contraindications: (m as any).contraindications || [],
      tier: m.tier,
    }));


    // 5. Build the Days and Slots
    const days = await this.db.get<V1WorkoutDay>('v1_workout_days')
      .query(Q.where('template_id', template.id))
      .fetch();

    const resultDays = [];

    for (const day of days) {
      const slots = await (day as any).slots.fetch();

      const resolvedExercises = await Promise.all(slots.map(async (slot: any) => {
        const defaultExercise = resolveTemplateSlot(
          {
            id: slot.id,
            architecturalGroup: slot.architecturalGroup,
            archetype: slot.archetype,
          },
          validationProfile,
          exercisePool
        );

        let finalExercise = defaultExercise;

        // Implementation of "Sticky Substitutions"
        if (defaultExercise && profileInput.userId) {
          const substituteId = await this.adaptationManager.getUserSubstitution(
            profileInput.userId, 
            defaultExercise.id
          );

          if (substituteId) {
            const substituteModel = exercisePool.find((ex: any) => ex.id === substituteId);
            // Re-validate the substitution in the current environment
            if (substituteModel && isExerciseAllowed(substituteModel, validationProfile)) {
              finalExercise = substituteModel;
            }
          }
        }
        
        return {
          slotId: slot.id,
          orderIndex: slot.orderIndex,
          sets: slot.sets,
          repsMin: slot.repsMin,
          repsMax: slot.repsMax,
          exercise: finalExercise ? {
            id: finalExercise.id,
            name: finalExercise.name,
          } : null,
          historicalContext: (finalExercise && profileInput.userId) 
            ? await this.trackingManager.getMovementTrack(profileInput.userId, finalExercise.id)
            : null,
        };
      }));

      resultDays.push({
        id: day.id,
        dayNumber: day.dayNumber,
        dayType: day.dayType,
        exercises: resolvedExercises.sort((a: any, b: any) => a.orderIndex - b.orderIndex),
      });
    }

    return {
      templateId: template.id,
      familyName: family.name,
      days: resultDays.sort((a, b) => a.dayNumber - b.dayNumber),
    };

  }
}
