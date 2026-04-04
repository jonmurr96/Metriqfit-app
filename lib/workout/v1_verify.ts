import { routeUserToPlan } from './v1_librarian_router';
import { GoalBucket, LiftComfort, ExperienceLevel, SessionEnvironment, TrainingStyle } from '../../types/v1_engine';
import { coreFamilies } from '../../loaders/seeds/templates';
import * as fs from 'fs';

// 1. Run profile simulation
const profile = {
  experienceLevel: ExperienceLevel.Intermediate,
  primaryGoal: GoalBucket.Hypertrophy,
  daysPerWeek: 4,
  liftComfort: LiftComfort.BarbellAdv,
  environment: SessionEnvironment.Commercial,
};

const recommendation = routeUserToPlan(profile);
console.log(`Librarian Recommended Family: ${recommendation.familyIdRef}`);

// 2. Find Family and hydrate
const family = coreFamilies.find(f => f.external_id === recommendation.familyIdRef);
if (!family) {
  console.error("Family not found! Check your routing IDs.");
  process.exit(1);
}

fs.writeFileSync('fully_hydrated_template.json', JSON.stringify(family, null, 2), 'utf-8');
console.log("Output fully hydrated template to: fully_hydrated_template.json");
