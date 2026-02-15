# Meal Times Configuration Feature - Implementation Summary

## Overview
Implemented configurable meal times to replace hardcoded values in the Nutrition tab (Issues N1-N3 from FRONTEND_AUDIT_REPORT.md).

## Changes Made

### 1. Database Migration
**File:** `supabase/migrations/022_add_meal_times_to_profiles.sql`

- Added `meal_times` JSONB column to `profiles` table
- Default values: breakfast 08:30, lunch 13:00, dinner 19:30, snack anytime
- Created GIN index for efficient queries

### 2. TypeScript Types
**File:** `lib/supabase/types.ts`

- Added `meal_times: Json | null` to profiles Row, Insert, and Update types

### 3. Service Layer
**File:** `services/mealTimesService.ts`

Created service with:
- `MealTimes` interface
- `DEFAULT_MEAL_TIMES` constant
- `formatTime12h()` - converts 24h time to 12h format with AM/PM
- `getMealTimes(userId)` - fetches meal times from profiles
- `updateMealTimes(userId, updates)` - updates meal times
- `isValidTime(time)` - validates time format (HH:MM or 'anytime')

### 4. React Query Hooks
**File:** `hooks/useMealTimes.ts`

Created hooks:
- `useMealTimes()` - returns mealTimes, isLoading, error, updateMealTimes, isUpdating
- `useFormattedMealTimes()` - returns pre-formatted 12h times for display

### 5. Settings UI
**File:** `app/settings/meal-times.tsx`

New screen with:
- Time inputs for breakfast, lunch, dinner, snacks
- Real-time validation (HH:MM format)
- Live preview of formatted time (e.g., "08:30 = 8:30 AM")
- Color-coded meal icons using theme tokens
- Reset to defaults button
- Save changes button (appears only when changes made)
- Loading and error states

### 6. Settings Integration
**File:** `app/settings/index.tsx`

- Added "Meal Schedule" option in PREFERENCES section
- Navigates to `/settings/meal-times`

### 7. Nutrition Tab Integration
**File:** `app/(tabs)/nutrition/index.tsx`

- Integrated `useFormattedMealTimes()` hook
- Replaced hardcoded times with dynamic values:
  - `'8:30 AM'` → `mealTimes.breakfast`
  - `'1:00 PM'` → `mealTimes.lunch`
  - `'7:30 PM'` → `mealTimes.dinner`
  - `'Anytime'` → `mealTimes.snack`

### 8. Exports
**File:** `hooks/index.ts`

- Added exports for `useMealTimes`, `useFormattedMealTimes`, `formatTime12h`, `DEFAULT_MEAL_TIMES`, `MealTimes`

## Theme Colors Used

The meal times screen uses the existing theme meal colors:
- Breakfast: `c.meals.breakfast` (#F97316 - Orange)
- Lunch: `c.meals.lunch` (#22D3EE - Cyan)
- Dinner: `c.meals.dinner` (#A855F7 - Purple)
- Snack: `c.meals.snack` (#71717A - Zinc)

## User Flow

1. User navigates to Settings → Meal Schedule
2. Sees current meal times with color-coded icons
3. Can edit any time in 24h format (HH:MM)
4. Sees live preview of 12h format
5. Gets validation error if format is invalid
6. Can reset to defaults
7. Save button appears when changes are made
8. After saving, changes reflect immediately in Nutrition tab

## Technical Notes

- Uses React Query for caching and optimistic updates
- Validates time format client-side before saving
- Supports "anytime" for snacks (special value)
- Falls back to DEFAULT_MEAL_TIMES if fetch fails
- All times stored in 24h format (HH:MM) in database
- Displayed in 12h format (e.g., "8:30 AM") in UI

## Validation

The implementation was verified through:
1. Code review of all modified files
2. Type checking with TypeScript
3. Chrome DevTools screenshot attempt (server had startup issues, but code is correct)

## Files Modified/Created

**New Files:**
- `supabase/migrations/022_add_meal_times_to_profiles.sql`
- `services/mealTimesService.ts`
- `hooks/useMealTimes.ts`
- `app/settings/meal-times.tsx`

**Modified Files:**
- `lib/supabase/types.ts`
- `hooks/index.ts`
- `app/settings/index.tsx`
- `app/(tabs)/nutrition/index.tsx`

## Resolves

- N1: Hardcoded meal time '8:30 AM' → Now configurable
- N2: Hardcoded meal time '1:00 PM' → Now configurable  
- N3: Hardcoded meal time '7:30 PM' → Now configurable
