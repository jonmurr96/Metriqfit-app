import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgressDailyReviewSnapshot,
  buildProgressWeeklyReviewSnapshot,
} from "./review-insights.ts";

test("daily review returns quiet state when there is no same-day activity", () => {
  const snapshot = buildProgressDailyReviewSnapshot({
    date: "2026-03-15",
    calories: 0,
    calorieTarget: 2200,
    protein: 0,
    proteinTarget: 180,
    hydrationScore: null,
    workoutStatus: "none",
    workoutName: null,
    bodyCheckInDaysAgo: 4,
  });

  assert.equal(snapshot.status, "quiet");
  assert.match(snapshot.headline, /quiet/i);
  assert.equal(snapshot.primaryAction.id, "review_progress");
});

test("daily review returns watch state and workout action when a workout is still planned", () => {
  const snapshot = buildProgressDailyReviewSnapshot({
    date: "2026-03-15",
    calories: 1100,
    calorieTarget: 2400,
    protein: 72,
    proteinTarget: 200,
    hydrationScore: 54,
    workoutStatus: "planned",
    workoutName: "Push Day",
    bodyCheckInDaysAgo: 19,
  });

  assert.equal(snapshot.status, "watch");
  assert.equal(snapshot.primaryAction.id, "open_workout");
  assert.equal(snapshot.misses[0]?.id, "calories_low");
  assert.ok(snapshot.misses.some((miss) => miss.id === "stale_checkin"));
});

test("weekly review marks strong training and consistency as on pace", () => {
  const snapshot = buildProgressWeeklyReviewSnapshot({
    sessionsCompleted: 4,
    volumeChangePercent: 9,
    consistencyAverage: 83,
    calorieHitRate: 78,
    proteinHitRate: 81,
    weightDeltaKg: -0.8,
    bodyFatDelta: -0.4,
    circumferenceDelta: {
      waistCm: -1.2,
      hipsCm: -0.3,
      chestCm: 0,
      armsCm: 0.2,
      thighsCm: -0.1,
    },
    bodyConfidence: "high",
    latestCheckInDaysAgo: 5,
    checkpointCount: 3,
  });

  assert.equal(snapshot.status, "on_pace");
  assert.equal(snapshot.training.volumeDirection, "up");
  assert.equal(snapshot.checkInStatus.state, "fresh");
  assert.match(snapshot.headline, /solid week/i);
});
