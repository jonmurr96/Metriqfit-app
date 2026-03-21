import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProgressBodyTimelineSnapshot,
  buildProgressPhotoCompareSnapshot,
} from "./body-insights.ts";

function isoDaysAgo(days, hour = 12) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

test("timeline groups photos by measurement id and date fallback", () => {
  const snapshot = buildProgressBodyTimelineSnapshot(
    [
      {
        id: "front-a",
        measurement_id: "m1",
        angle: "front",
        captured_at: isoDaysAgo(2, 9),
        signed_url: "front-a",
      },
      {
        id: "side-a",
        measurement_id: "m1",
        angle: "side",
        captured_at: isoDaysAgo(2, 10),
        signed_url: "side-a",
      },
      {
        id: "front-b",
        measurement_id: null,
        angle: "front",
        captured_at: isoDaysAgo(8, 11),
        signed_url: "front-b",
      },
      {
        id: "back-b",
        measurement_id: null,
        angle: "back",
        captured_at: isoDaysAgo(8, 14),
        signed_url: "back-b",
      },
    ],
    {
      m1: {
        id: "m1",
        logged_at: isoDaysAgo(2, 8),
        weight_kg: 84.5,
        body_fat_percentage: 15.2,
        waist_cm: 82,
        chest_cm: 103,
        arms_cm: 38,
        thighs_cm: 58,
        hips_cm: 95,
      },
    },
  );

  assert.equal(snapshot.totalCheckpoints, 2);
  assert.equal(snapshot.checkpoints[0]?.measurementId, "m1");
  assert.deepEqual(snapshot.checkpoints[0]?.angles, ["front", "side"]);
  assert.equal(snapshot.checkpoints[0]?.weightKg, 84.5);
  assert.equal(snapshot.checkpoints[1]?.measurementId, null);
  assert.deepEqual(snapshot.checkpoints[1]?.angles, ["front", "back"]);
});

test("compare snapshot selects latest valid angle pair and computes deltas", () => {
  const timeline = buildProgressBodyTimelineSnapshot(
    [
      {
        id: "front-latest",
        measurement_id: "m2",
        angle: "front",
        captured_at: isoDaysAgo(1),
        signed_url: "front-latest",
      },
      {
        id: "front-prev",
        measurement_id: "m1",
        angle: "front",
        captured_at: isoDaysAgo(12),
        signed_url: "front-prev",
      },
      {
        id: "side-prev",
        measurement_id: "m1",
        angle: "side",
        captured_at: isoDaysAgo(12, 13),
        signed_url: "side-prev",
      },
    ],
    {
      m1: {
        id: "m1",
        logged_at: isoDaysAgo(12),
        weight_kg: 87.2,
        body_fat_percentage: 18.4,
        waist_cm: 86,
        chest_cm: 104,
        arms_cm: 38,
        thighs_cm: 58,
        hips_cm: 96,
      },
      m2: {
        id: "m2",
        logged_at: isoDaysAgo(1),
        weight_kg: 84.9,
        body_fat_percentage: 16.9,
        waist_cm: 83,
        chest_cm: 103,
        arms_cm: 38,
        thighs_cm: 57,
        hips_cm: 95,
      },
    },
  );

  const compare = buildProgressPhotoCompareSnapshot({
    checkpoints: timeline.checkpoints,
    angle: "front",
  });

  assert.equal(compare.sparseState, null);
  assert.equal(compare.afterCheckpoint?.checkpointId, "measurement:m2");
  assert.equal(compare.beforeCheckpoint?.checkpointId, "measurement:m1");
  assert.equal(compare.daysBetween, 12);
  assert.equal(compare.weightDeltaKg, -2.3);
  assert.equal(compare.bodyFatDelta, -1.5);
});

test("compare snapshot reports sparse state when only one checkpoint exists for an angle", () => {
  const timeline = buildProgressBodyTimelineSnapshot([
    {
      id: "side-only",
      measurement_id: "m1",
      angle: "side",
      captured_at: isoDaysAgo(5),
      signed_url: "side-only",
    },
  ]);

  const compare = buildProgressPhotoCompareSnapshot({
    checkpoints: timeline.checkpoints,
    angle: "side",
  });

  assert.equal(compare.sparseState, "one_checkpoint");
  assert.equal(compare.availableAngles[0], "side");
});
