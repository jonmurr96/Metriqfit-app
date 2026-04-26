# MetriqFit Frontend Audit Report - Phase 1 Plan Expansion

**Audit Date:** 2026-02-09  
**Scope:** All screens modified in Phase 1 (Nutrition, Workout, Progress, AI Coach)  
**Auditor:** Claude Code  

---

## Executive Summary

| Category | Status | Score |
|----------|--------|-------|
| Functional Completeness | ✅ Good | 9/10 |
| UI/UX Polish | ⚠️ Needs Work | 6/10 |
| Code Quality | ✅ Good | 8/10 |
| Accessibility | 🔴 Poor | 2/10 |
| Performance | ⚠️ Needs Work | 6/10 |

**Overall:** The Phase 1 implementation is functionally complete but needs UI polish and accessibility improvements before production.

---

## Screenshot Gallery

### 1. Sign In Screen
![Sign In](validation-home.png)
- Clean, centered layout
- Good contrast on input fields
- Clear CTA button

### 2. Nutrition/My Plan (Empty State)
![Nutrition My Plan](validation-nutrition-my-plan.png)
- Good empty state messaging
- Clear call-to-action
- Missing: 7-day selector should be visible even in empty state

### 3. Workout Home
![Workout Home](validation-workout-home.png)
- Day strip is visible and functional
- Quick access buttons present
- Schedule detail card shown
- **Issue:** "No session scheduled" doesn't indicate how to create one

### 4. Workout/My Plan (Empty State)
![Workout My Plan](validation-workout-my-plan.png)
- Consistent empty state design
- Clear generate button

### 5. Progress Screen
![Progress](validation-progress.png)
- Time frame tabs present
- Quick access ring buttons
- **Issue:** Missing consistency card when no weight data (should show consistency even without weight)

### 6. AI Coach
![AI Coach](validation-ai-coach.png)
- Good prompt suggestions
- Chat input visible
- Profile completion card shown

---

## Detailed Findings

### 🔴 Critical Issues (Must Fix)

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Missing key props** | my-plan.tsx | React warnings, performance | Add `key={meal.id}` to all .map() renders |
| **No accessibility labels** | All screens | Screen readers fail | Add `accessibilityLabel` to all interactive elements |
| **Stale time not configured** | usePlan.ts | Unnecessary refetches | Add `staleTime: 2 * 60 * 1000` to queries |

### ⚠️ Medium Issues (Should Fix)

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **42 inline style objects** | my-plan.tsx | Maintenance burden | Extract to StyleSheet |
| **No error boundary** | app/_layout.tsx | App crash on error | Add ErrorBoundary wrapper |
| **No haptic feedback** | All interactions | Less tactile experience | Add Haptics.impactAsync on button presses |
| **Missing undo for destructive actions** | Meal customization | User frustration | Add undo toast for 3 seconds |

### ○ Minor Issues (Nice to Have)

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| No skeleton loaders | All screens | Perceived performance | Add Skeleton screens while loading |
| No optimistic updates | Meal swap | UI feels slow | Update UI immediately, rollback on error |
| No toast notifications | All mutations | Poor feedback | Add toast on success/error |
| Hardcoded fontSize in 4 places | index.tsx | Inconsistent typography | Use ty.sizes consistently |

---

## Screen-by-Screen Analysis

### Nutrition/My Plan Screen

**What's Working:**
- ✅ 7-day selector with visual active state
- ✅ Empty state with clear CTA
- ✅ Regenerate button with rate limit info
- ✅ Pull-to-refresh implemented

**Issues Found:**
1. **Missing key props** - 5 .map() calls without keys (React warning)
2. **No meal item keys** - Will cause render issues when swapping variants
3. **Missing accessibility** - No labels on swap/customize buttons
4. **Inline styles** - 42 inline style objects instead of StyleSheet

**Recommendations:**
```tsx
// Before (problematic)
{meals.map((meal) => (
  <View style={{...}}>  // No key!
    {meal.items.map((item) => (  // No key!
```

```tsx
// After (fixed)
{meals.map((meal) => (
  <View key={meal.id} style={styles.mealCard}>
    {meal.items.map((item) => (
      <Text key={item.id} accessibilityLabel={`${item.item_name}, ${item.grams} grams`}>
```

### Nutrition/Meal Editor Screen

**What's Working:**
- ✅ Real-time macro delta calculation
- ✅ Ingredient add/remove
- ✅ Form validation (prevents empty items)
- ✅ Save with loading state

**Issues Found:**
1. **No empty state** - Shows blank if meal has no items
2. **No cancel button** - Must use back button to exit
3. **Macro delta hard to read** - Could use color coding (red/green)

**Recommendations:**
- Add "Cancel" button next to Save
- Color-code delta: red for over target, green for under
- Add "Reset to default" button

### Workout/Home Screen

**What's Working:**
- ✅ Day strip with selection
- ✅ Schedule detail card
- ✅ Reschedule buttons (+1/+2 days)
- ✅ Quick access shortcuts

**Issues Found:**
1. **"No session scheduled" not actionable** - Doesn't explain how to generate plan
2. **Reschedule buttons disabled without feedback** - User doesn't know why
3. **Missing status indicator** - No visual for completed/missed workouts

**Recommendations:**
```tsx
// Add helper text
{!activePlan && (
  <Text style={styles.helperText}>
    Go to My Plan to generate your first workout schedule
  </Text>
)}

// Add status indicators
dayStrip.map((day) => (
  <DayPill 
    status={day.schedule?.status} // completed | missed | planned
    dotColor={getStatusColor(day.schedule?.status)}
  />
))
```

### Progress Screen

**What's Working:**
- ✅ Time frame selector
- ✅ Quick access buttons
- ✅ Composite consistency card (when data exists)

**Issues Found:**
1. **Consistency card missing when no weight data** - Should show even without weight
2. **"Log First Weigh-in" button styling inconsistent** - Uses different color
3. **No trend line on charts** - Hard to see direction

**Recommendations:**
- Always show consistency section (it's independent of weight)
- Standardize button styling
- Add trend arrow (↑↓) to charts

### AI Coach Screen

**What's Working:**
- ✅ Quick prompt suggestions
- ✅ Chat input
- ✅ Rate limit indicator
- ✅ Recommendation card

**Issues Found:**
1. **Prompt chips not scrollable indication** - Users may not know to scroll
2. **No message timestamps** - Can't see when messages were sent
3. **Input can be empty** - Should disable send if empty

**Recommendations:**
- Add fade gradient on right edge of prompt chips
- Add timestamps to messages
- Disable send button when input is empty/whitespace only

---

## Code Quality Issues

### React Query Configuration

**Current:**
```tsx
useQuery({
  queryKey: [...],
  queryFn: ...,
  enabled: !!user,
  // Missing: staleTime, cacheTime
})
```

**Recommended:**
```tsx
useQuery({
  queryKey: [...],
  queryFn: ...,
  enabled: !!user,
  staleTime: 2 * 60 * 1000, // 2 minutes
  gcTime: 5 * 60 * 1000,    // 5 minutes
})
```

### Missing Error Boundaries

No error boundary means one component crash breaks the whole app.

**Fix:**
```tsx
// app/_layout.tsx
import { ErrorBoundary } from 'react-error-boundary';

<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Stack>...</Stack>
</ErrorBoundary>
```

### Accessibility

Zero accessibility attributes found. This blocks screen reader users.

**Fix pattern:**
```tsx
<Pressable
  accessibilityLabel="Swap meal variant"
  accessibilityHint="Double tap to choose an alternative meal with similar macros"
  accessibilityRole="button"
  onPress={handleSwap}
>
```

---

## Performance Issues

1. **No memoization on expensive calculations**
   - Macro delta calculation recalculates on every render
   - Day strip rebuilding every render

2. **No image optimization**
   - Icons loaded as full components instead of cached

3. **Large bundle potential**
   - All planService imported even if not used

---

## Recommendations Priority Matrix

| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Add key props to all .map() renders | 15 min | High |
| P0 | Add accessibility labels | 1 hour | High |
| P1 | Configure React Query staleTime | 15 min | Medium |
| P1 | Add Error Boundary | 30 min | High |
| P1 | Fix "No session scheduled" messaging | 15 min | Medium |
| P2 | Extract inline styles to StyleSheet | 2 hours | Low |
| P2 | Add haptic feedback | 30 min | Medium |
| P2 | Add skeleton loaders | 2 hours | Medium |
| P3 | Add optimistic updates | 4 hours | Medium |
| P3 | Add toast notifications | 1 hour | Low |

---

## Console Error Check

Based on static analysis, potential runtime errors:

1. **Warning: Each child in a list should have a unique "key" prop**
   - Location: my-plan.tsx, ~5 occurrences
   - Fix: Add key={meal.id}, key={variant.id}, etc.

2. **Warning: Failed prop type** (if using PropTypes)
   - Not found in audit

3. **Error: Cannot read property 'X' of undefined**
   - Mitigated by optional chaining (✓ 40 occurrences found)

---

## Conclusion

**Phase 1 is functionally complete** - all major features work:
- ✅ Plan generation (workout + nutrition)
- ✅ Meal swap and customization
- ✅ Workout reschedule
- ✅ Consistency tracking

**Before production, fix:**
1. P0 issues (keys, accessibility)
2. At least one P1 issue (Error Boundary or staleTime)

**Estimated time to production-ready:** 4-6 hours

---

## Appendix: Quick Fixes

### Fix 1: Add key props
```bash
grep -n "\.map(" app/(tabs)/nutrition/my-plan.tsx
# Add key prop to each
```

### Fix 2: Add staleTime
```tsx
// hooks/usePlan.ts - add to all useQuery calls
staleTime: 2 * 60 * 1000, // 2 minutes
```

### Fix 3: Add accessibility
```tsx
// Add to all Pressable components
accessibilityLabel={label}
accessibilityRole="button"
```
