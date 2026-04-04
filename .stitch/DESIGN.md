# MetriqFit Nutrition Meal Display - Design System

## Component: MealCard

### Purpose
Display a single meal with exact food portions, macros, and timing information.

### Layout
```
┌─────────────────────────────────────┐
│  🕐 7:00 AM      Pre-Workout        │
├─────────────────────────────────────┤
│  200g Chicken Breast                │
│  150g White Rice                    │
│  5g Olive Oil                       │
├─────────────────────────────────────┤
│  520 cal  ·  46P  ·  65C  ·  8F     │
└─────────────────────────────────────┘
```

### Design Tokens

**Colors:**
- Background: `#FFFFFF` (light) / `#1C1C1E` (dark)
- Border: `#E5E5EA` (light) / `#2C2C2E` (dark)
- Text Primary: `#000000` (light) / `#FFFFFF` (dark)
- Text Secondary: `#8E8E93` (light) / `#8E8E93` (dark)
- Training Accent: `#34C759` (green indicator for training meals)
- Protein: `#FF3B30` (red tint)
- Carbs: `#FF9500` (orange tint)
- Fat: `#5856D6` (purple tint)

**Typography:**
- Time: 14px, Medium (500)
- Meal Label: 16px, Semibold (600)
- Food Items: 15px, Regular (400)
- Macros: 13px, Medium (500)

**Spacing:**
- Card padding: 16px
- Section gap: 12px
- Food item gap: 8px

### States

**Default:**
- White/light gray background
- Subtle border

**Training Meal:**
- Left border accent (4px green)
- Training icon indicator

**Pressed:**
- Scale 0.98
- Opacity 0.9

### Interactions
- Tap to view meal details
- Long press or swipe for swap options
- Swipe left to reveal "Swap" action

---

## Component: FoodItemRow

### Purpose
Display a single food with portion size.

### Layout
```
┌─────────────────────────────────────┐
│  🍗   200g Chicken Breast           │
└─────────────────────────────────────┘
```

### Design Tokens
- Icon: 24px, emoji or SVG
- Portion: 15px, Semibold
- Food Name: 15px, Regular
- Gap between elements: 12px

---

## Component: MealTimeHeader

### Purpose
Show meal time and type (breakfast, pre-workout, etc.)

### Layout
```
┌─────────────────────────────────────┐
│  🕐 7:00 AM    │    Pre-Workout 🏋️  │
└─────────────────────────────────────┘
```

### Design Tokens
- Time: 14px, Medium, Secondary color
- Label: 14px, Semibold, Training accent (if training meal)
- Divider: 1px vertical line

---

## Component: MacroSummary

### Purpose
Display macro totals for a meal.

### Layout
```
520 cal  ·  46P  ·  65C  ·  8F
```

### Design Tokens
- Size: 13px
- Weight: Medium (500)
- Color: Secondary
- Separator: Middle dot (·)

---

## Component: SwapButton

### Purpose
Allow users to swap a meal or food item.

### Layout
```
┌─────────┐
│  ⟳ Swap │
└─────────┘
```

### Design Tokens
- Background: Transparent
- Text: Primary color
- Icon: Refresh or swap icon
- Touch target: 44x44pt minimum

---

## Component: MealPlanDayView

### Purpose
Display all meals for a single day.

### Layout
```
┌─────────────────────────────────────┐
│  Monday, Jan 15    Training Day 💪  │
├─────────────────────────────────────┤
│  [MealCard: Breakfast]              │
│  [MealCard: Pre-Workout]            │
│  [MealCard: Post-Workout]           │
│  [MealCard: Dinner]                 │
├─────────────────────────────────────┤
│  Daily Totals: 2400 cal             │
│  180P · 240C · 80F                  │
└─────────────────────────────────────┘
```

### Design Tokens
- Day header: 18px, Bold
- Date: 14px, Secondary
- Training badge: Green background, white text
- Meal cards gap: 12px

---

## Platform Guidelines

### iOS (React Native)
- Use iOS-style cards with rounded corners (12px)
- System font (San Francisco)
- Support Dynamic Type
- Respect safe areas
- Use iOS-style swipe actions

### Accessibility
- All touch targets ≥44x44pt
- High contrast text (4.5:1 minimum)
- Screen reader labels for all interactive elements
- Support reduced motion

### Dark Mode
- Use system background colors
- Adjust text colors for contrast
- Maintain training accent visibility
