import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHomeDashboardState,
  getDayPart,
} from './dashboard-state.ts';

const mealTimes = {
  breakfast: '08:30',
  lunch: '13:00',
  dinner: '19:30',
  snack: 'anytime',
};

test('getDayPart maps morning and evening windows correctly', () => {
  assert.equal(getDayPart(new Date('2026-03-13T08:15:00')), 'morning');
  assert.equal(getDayPart(new Date('2026-03-13T12:30:00')), 'midday');
  assert.equal(getDayPart(new Date('2026-03-13T19:45:00')), 'evening');
});

test('uses a recovery-first focus when the first unlogged meal missed its window', () => {
  const state = buildHomeDashboardState({
    now: new Date('2026-03-13T15:10:00'),
    meals: [
      {
        slot: 'breakfast',
        label: 'Breakfast',
        plannedName: 'Greek Yogurt Bowl',
        targetCalories: 420,
        targetProtein: 35,
        loggedCalories: 0,
        loggedItemCount: 0,
        isLogged: false,
      },
      {
        slot: 'lunch',
        label: 'Lunch',
        plannedName: 'Chicken Rice Bowl',
        targetCalories: 610,
        targetProtein: 48,
        loggedCalories: 0,
        loggedItemCount: 0,
        isLogged: false,
      },
    ],
    mealTimes,
    workoutStatus: 'planned',
    proteinRemaining: 74,
    caloriesRemaining: 1680,
    waterPercent: 58,
    waterRemainingMl: 1300,
    consistencyScore: 81,
    sessionsThisWeek: 4,
    tomorrow: {
      sessionType: 'workout',
      planName: 'Pull Day',
      focus: 'Back and biceps',
    },
  });

  assert.equal(state.activeMeal?.timingStatus, 'missed');
  assert.equal(state.focus.action, 'meal');
  assert.match(state.focus.title, /Breakfast/i);
  assert.match(state.focus.subtitle, /Lunch/i);
  assert.equal(state.showMealFirst, true);
});

test('promotes the workout card first in the afternoon when the next meal is still later today', () => {
  const state = buildHomeDashboardState({
    now: new Date('2026-03-13T16:30:00'),
    meals: [
      {
        slot: 'breakfast',
        label: 'Breakfast',
        plannedName: 'Egg Scramble',
        targetCalories: 410,
        targetProtein: 30,
        loggedCalories: 410,
        loggedItemCount: 1,
        isLogged: true,
      },
      {
        slot: 'lunch',
        label: 'Lunch',
        plannedName: 'Turkey Wrap',
        targetCalories: 520,
        targetProtein: 42,
        loggedCalories: 520,
        loggedItemCount: 1,
        isLogged: true,
      },
      {
        slot: 'dinner',
        label: 'Dinner',
        plannedName: 'Salmon and Potatoes',
        targetCalories: 700,
        targetProtein: 55,
        loggedCalories: 0,
        loggedItemCount: 0,
        isLogged: false,
      },
    ],
    mealTimes,
    workoutStatus: 'planned',
    proteinRemaining: 55,
    caloriesRemaining: 980,
    waterPercent: 72,
    waterRemainingMl: 700,
    consistencyScore: 84,
    sessionsThisWeek: 3,
    tomorrow: {
      sessionType: 'active_recovery',
      planName: null,
      focus: null,
    },
  });

  assert.equal(state.activeMeal?.timingStatus, 'later_today');
  assert.equal(state.focus.action, 'workout');
  assert.equal(state.showMealFirst, false);
});

test('builds a tomorrow preview with workout name and focus when tomorrow is a training day', () => {
  const state = buildHomeDashboardState({
    now: new Date('2026-03-13T10:15:00'),
    meals: [],
    mealTimes,
    workoutStatus: 'rest',
    proteinRemaining: 0,
    caloriesRemaining: 0,
    waterPercent: 100,
    waterRemainingMl: 0,
    consistencyScore: 88,
    sessionsThisWeek: 5,
    tomorrow: {
      sessionType: 'workout',
      planName: 'Lower Strength',
      focus: 'Posterior chain',
    },
  });

  assert.equal(state.tomorrowPreview.title, 'Tomorrow: Lower Strength');
  assert.match(state.tomorrowPreview.subtitle, /Posterior chain/i);
});

test('marks the day wrapped once meals and training are closed', () => {
  const state = buildHomeDashboardState({
    now: new Date('2026-03-13T20:45:00'),
    meals: [
      {
        slot: 'breakfast',
        label: 'Breakfast',
        plannedName: 'Eggs',
        targetCalories: 400,
        targetProtein: 30,
        loggedCalories: 400,
        loggedItemCount: 1,
        isLogged: true,
      },
      {
        slot: 'lunch',
        label: 'Lunch',
        plannedName: 'Chicken',
        targetCalories: 600,
        targetProtein: 45,
        loggedCalories: 610,
        loggedItemCount: 2,
        isLogged: true,
      },
      {
        slot: 'dinner',
        label: 'Dinner',
        plannedName: 'Steak',
        targetCalories: 750,
        targetProtein: 60,
        loggedCalories: 760,
        loggedItemCount: 2,
        isLogged: true,
      },
    ],
    mealTimes,
    workoutStatus: 'completed',
    proteinRemaining: 0,
    caloriesRemaining: 0,
    waterPercent: 86,
    waterRemainingMl: 300,
    consistencyScore: 91,
    sessionsThisWeek: 5,
    tomorrow: {
      sessionType: 'workout',
      planName: 'Push Hypertrophy',
      focus: 'Chest, shoulders, triceps',
    },
  });

  assert.equal(state.isDayWrapped, true);
  assert.equal(state.focus.action, 'tomorrow');
  assert.match(state.focus.title, /wrapped/i);
  assert.match(state.coachPulse.title, /Tomorrow/i);
});
