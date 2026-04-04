import { V1TrackingManager } from './v1_tracking_manager';

async function testTracking() {
  console.log("--- V1 TRACKING VERIFICATION ---");

  // 1. Test 1RM Calculation (Epley)
  // 100 * (1 + 10/30) = 133.33
  const epley = V1TrackingManager.calculateEpley1RM(100, 10);
  console.log(`Epley 1RM for 100x10: ${epley.toFixed(2)}`);
  if (Math.abs(epley - 133.33) < 0.1) {
    console.log("PASS: Epley calculation is correct.");
  } else {
    console.log("FAIL: Epley calculation is incorrect.");
  }

  // 2. Test Metric Derivation logic (Simple Simulation)
  const performance = [
    { load: 100, reps: 10 }, // 133.33
    { load: 110, reps: 5 },  // 110 * (1 + 5/30) = 128.33
    { load: 90, reps: 15 }   // 90 * (1 + 15/30) = 135.0
  ];

  let max1RM = 0;
  let bestSet = performance[0];

  for (const set of performance) {
    const current1RM = V1TrackingManager.calculateEpley1RM(set.load, set.reps);
    if (current1RM > max1RM) {
      max1RM = current1RM;
      bestSet = set;
    }
  }

  console.log(`Peak 1RM from set: ${max1RM.toFixed(2)} (Set: ${bestSet.load}x${bestSet.reps})`);
  if (Math.abs(max1RM - 135.0) < 0.1) {
    console.log("PASS: Peak metric selection is correct.");
  } else {
    console.log("FAIL: Peak metric selection is incorrect.");
  }
}

testTracking().catch(console.error);
