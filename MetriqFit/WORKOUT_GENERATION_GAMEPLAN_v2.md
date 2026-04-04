# MetriqFit — Workout Generation System Gameplan v2.1
**Exercise Science × Mobile Architecture — Final Implementation Plan**
*Authored: March 28, 2026 | Supersedes v2.0*

---

## CHANGELOG v2.0 → v2.1

1. **Warm-ups removed as structural program components** — Warm-ups are now optional coaching notes attached to the first exercise of each day, not required JSON blocks. This keeps the program schema lean and lets the UI decide how/whether to surface them.
2. **Dynamic scheduling fully explicit** — Weekly schedule is generated programmatically from the user's exact selected training days and rest days, not a hardcoded template. Supports any combination (Mon/Wed/Fri, Tue/Thu/Sat/Sun, etc.).
3. **Free/premium generation logic removed** — Plan is always fully generated before the paywall is shown. Every user gets the same AI-quality generation. Paywall gates access to the app, not the plan itself.

---

## AUDIT FINDINGS — Current State

### What Exists in DB
- `exercises` table: Schema present, **0 rows** — completely empty. Missing: difficulty, primary_muscles, secondary_muscles, split_tags, equipment_options, technique_compatibility, alternative_exercise_ids, experience_min, popularity_score
- `program_templates` table: Schema present, **0 rows**
- `user_programs` / `user_profiles` tables: **Do not exist** — need to be created
- `client_onboarding` table: Built for coach clients (competition data, judge feedback, etc.) — not suitable for self-serve users

### Root Causes
1. Empty exercise database — AI hallucinates exercises like "Cable Supine Reverse Fly" (popularity ≈ 8) because no curated pool exists to select from
2. No split selection logic — nothing maps (goal + experience + days + equipment) → correct split
3. No exercise ordering rules — no compound-first, no rear-delt mandate, no muscle group balance check
4. No user_profiles table for self-serve onboarding data
5. No generation engine — no edge function converts onboarding inputs into a program

---

## ARCHITECTURE OVERVIEW

```
ONBOARDING INPUTS (user_profiles table)
  goal + experience + training_days + rest_days + equipment + injuries + body_stats
           │
           ▼ (triggered at onboarding Step 5 — Equipment screen)
  GENERATION ENGINE (single edge function: generate-program)
           │
  ┌────────────────────────────────────────────┐
  │ Layer 1: Profile + Recovery Modifier        │
  │ Layer 2: Split Selection (deterministic)    │
  │ Layer 3: Dynamic Schedule Builder           │
  │          (maps user's exact days → day types│
  │           in logical order)                 │
  │ Layer 4: Exercise Pool (DB query)           │
  │ Layer 5: Exercise Selector (rules-based)    │
  │ Layer 6: Technique + Progression Injector   │
  │ Layer 7: AI Refinement (Claude Sonnet)      │
  │ Layer 8: Quality Gate Validator             │
  └────────────────────────────────────────────┘
           │
           ▼
  user_programs.full_program_json
           │
           ▼
  Plan shown on Plan Review screen → Paywall
```

---

## SECTION 1 — Dynamic Day/Rest Scheduling (Corrected)

### How It Works

The user selects their available training days during onboarding (e.g., "I can train Monday, Tuesday, Thursday, Friday, Saturday"). The generation engine maps those exact days to the correct day types for the chosen split — it does NOT assume a standard Mon/Wed/Fri or Mon-Sat pattern.

### Dynamic Schedule Builder

```typescript
// lib/workout/schedule-builder.ts

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleInput {
  training_days: DayOfWeek[];  // exact days user selected
  rest_days: DayOfWeek[];       // derived: all days NOT in training_days
  split: SplitType;
}

export function buildWeeklySchedule(input: ScheduleInput): Record<DayOfWeek, DayType> {
  const { training_days, split } = input;
  const all_days: DayOfWeek[] = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const schedule: Record<DayOfWeek, DayType> = {} as any;

  // Mark all days as rest first
  all_days.forEach(d => { schedule[d] = 'rest'; });

  // Get the ordered sequence of day types for this split
  const day_type_sequence = getDayTypeSequence(split, training_days.length);

  // Assign day types to the user's actual selected days IN ORDER
  training_days.forEach((day, index) => {
    schedule[day] = day_type_sequence[index] ?? 'full_body';
  });

  return schedule;
}

function getDayTypeSequence(split: SplitType, num_days: number): DayType[] {
  const sequences: Record<SplitType, DayType[][]> = {
    full_body: {
      2: ['full_body', 'full_body'],
      3: ['full_body_a', 'full_body_b', 'full_body_a'],
      4: ['full_body_a', 'full_body_b', 'full_body_a', 'full_body_b'],
    },
    upper_lower: {
      3: ['upper_a', 'lower_a', 'upper_b'],
      4: ['upper_a', 'lower_a', 'upper_b', 'lower_b'],
      5: ['upper_a', 'lower_a', 'upper_b', 'lower_b', 'full_body'],
    },
    ppl: {
      3: ['push', 'pull', 'legs'],
      5: ['push', 'pull', 'legs', 'push', 'pull'],
      6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
    },
    bro_split: {
      4: ['chest', 'back', 'shoulders_arms', 'legs'],
      5: ['chest', 'back', 'shoulders', 'arms', 'legs'],
    },
    arnold: {
      6: ['chest_back', 'shoulders_arms', 'legs', 'chest_back', 'shoulders_arms', 'legs'],
    },
  };

  return sequences[split]?.[num_days] ?? sequences[split]?.[Object.keys(sequences[split])[0]] ?? ['full_body'];
}
```

### Example: User selects Tue, Thu, Sat (3 days, intermediate, build muscle)

```
Split selected: PPL (3-day)

Schedule output:
  monday:    rest
  tuesday:   push
  wednesday: rest
  thursday:  pull
  friday:    rest
  saturday:  legs
  sunday:    rest
```

### Example: User selects Mon, Tue, Thu, Fri, Sat (5 days, intermediate)

```
Split selected: PPL (5-day)

Schedule output:
  monday:    push
  tuesday:   pull
  wednesday: rest
  thursday:  legs
  friday:    push
  saturday:  pull
  sunday:    rest
```

### Rest Day Logic

- Consecutive rest days between sessions are preserved exactly as the user set them
- The engine respects the user's schedule — it never moves a session to a day they didn't select
- If the user selects consecutive days (Mon/Tue/Wed), the engine inserts a coaching note: "Consider spacing sessions for better recovery. Your current schedule has back-to-back training days."
- Deload weeks maintain the same day structure — just reduced volume

---

## SECTION 2 — Warm-Up Approach (Revised)

### V2.0 Problem
Warm-ups were structural blocks (`warmup: WarmupBlockSchema`) required on every day. This added schema complexity, made the program JSON heavier, and forced the UI to render them as a mandatory component.

### V2.1 Solution
Warm-ups are **coaching notes** — a plain string attached to the first exercise of each day. The UI can display them as a collapsible tip or pre-session card. They are never required for program validity.

```typescript
// First exercise of each day gets an optional coaching_note field
{
  order: 1,
  exercise_id: "uuid-bench-press",
  exercise_name: "Barbell Bench Press",
  sets: 4,
  rep_range: "8-12",
  rest_seconds: 120,
  rpe_target: 8,
  technique: null,
  coaching_cue: "Drive feet into floor, retract scapula. Bar touches nipple line.",
  pre_session_note: "Before starting: 5 min light cardio, 2x15 band pull-aparts, warmup sets (50%×10, 75%×5) before your working sets."
}
```

### Day-Type Specific Warm-Up Notes (injected into first exercise)

| Day Type | Pre-Session Note |
|----------|-----------------|
| push / upper_a | "5 min cardio, 2×15 band pull-aparts, wall slides 1×10, warmup sets on first compound (50%×10, 75%×5)" |
| pull / upper_b | "5 min cardio, dead hang 2×20s, band pull-aparts 2×15, warmup sets on first compound" |
| legs / lower | "5 min bike/treadmill, hip 90/90 stretch 5/side, glute bridge 2×12, warmup sets on squat/deadlift (50%×10, 75%×5)" |
| full_body | "5 min cardio, band pull-aparts 2×15, glute bridge 1×12, warmup sets on each compound" |

---

## SECTION 3 — Plan Generated Before Paywall (Revised)

### V2.0 Problem
V2.0 had a free vs. premium tiered generation system where free users got templates and Premium users got AI generation. This is wrong — the paywall screen comes AFTER plan generation in the onboarding flow.

### V2.1 Solution
**Every user gets full generation.** The paywall gates app access, not plan quality. The generation cost ($0.02/user) is a customer acquisition cost, not a per-subscriber cost.

```
Onboarding flow:
  Screen 5 (Equipment) → TRIGGER generation (background)
  Screen 6-8 (Experience, Activity, Stats) → user continues while plan generates
  Screen 9 (Plan Review) → show generated plan
  Screen 10 (Paywall) → gate app access
  [Pay or skip] → enter app with plan already ready
```

### Generation Strategy (Single-Tier)

```typescript
// Every user gets the same generation pipeline:
// Layer 1-6: Rule-based (< 500ms, always runs)
// Layer 7: AI refinement (Claude Sonnet, 10-30s, always runs)
// Layer 8: Validation + quality gates

// Timeout: 45 seconds
// Fallback: if AI times out → serve rule-based output directly (still good quality)
// Never: show a degraded or template-only plan
```

---

## SECTION 4 — Exercise Science Framework

### 4.1 The Three Phases of Training Development

#### Phase 1: Neural Adaptation (Beginner, Months 0–6)
Gains come from the nervous system learning motor unit recruitment — NOT from muscle damage. Programming implications:
- Full Body 3×/week for maximum frequency (each pattern trained 3×/week)
- 2–3 sets max per exercise — more sets add DOMS, not gains at this phase
- Compound movements ONLY until movement quality is established
- Movement progression model: start at Tier 1 (Goblet Squat), not Barbell Squat
- Straight sets only — zero advanced techniques
- RIR 3 as stopping criterion (form-based, not feel-based)

#### Phase 2: Hypertrophic Adaptation (Intermediate, Months 6–36)
Mechanical tension and metabolic stress now drive growth:
- 2×/week frequency per muscle remains optimal
- Volume can increase: 10–15 sets/muscle/week
- Isolation work becomes productive (motor patterns established)
- Antagonist supersets, occasional drop sets unlock
- RPE calibration begins (enough sessions to gauge effort accurately)

#### Phase 3: Specialization (Advanced, 3+ Years)
- Higher volume with strategic variation
- Full periodization essential (can't just add weight every session)
- Lagging muscle specialization blocks
- Full technique toolkit available

### 4.2 Movement Progression Model (Beginners)

```
SQUAT PATTERN:
  Tier 1 (Beginner 0–2 mo):  Goblet Squat, Box Squat
  Tier 2 (Beginner 2–6 mo):  Smith Machine Squat, Barbell Front Squat
  Tier 3 (Intermediate+):     Barbell Back Squat, Hack Squat

HINGE PATTERN:
  Tier 1: DB Romanian Deadlift, Trap Bar Deadlift
  Tier 2: BB Romanian Deadlift, Sumo Deadlift
  Tier 3: Conventional Deadlift, Good Morning

HORIZONTAL PUSH:
  Tier 1: Push-Up, Machine Chest Press, DB Bench Press
  Tier 2: BB Bench Press (light), Incline DB Press
  Tier 3: All barbell variations, advanced angles

VERTICAL PULL:
  Tier 1: Assisted Pull-Up Machine, Lat Pulldown
  Tier 2: Band-Assisted Pull-Up, Neutral Grip Pulldown
  Tier 3: Pull-Up, Weighted Pull-Up
```

### 4.3 Gender Modifiers

| Factor | Male Default | Female Default |
|--------|-------------|----------------|
| Rep ranges | 6–12 primary | 10–20 primary |
| Glute exercises per leg day | 1 | 2–3 |
| Load progression (upper) | +5lbs/session | +2.5lbs/session |
| Posterior chain emphasis | Moderate | High |
| Volume tolerance | Moderate-High | Higher |

### 4.4 Recovery Modifiers

```
recovery_capacity = base(10) - sleep_penalty - stress_penalty - job_penalty

sleep < 6 hrs:      -3
sleep 6–7 hrs:      -1
sleep > 8 hrs:      +1

stress >= 8/10:     -2
stress 6–7:         -1

job = 'heavy':      -2
job = 'moderate':   -1

IF recovery_capacity <= 4:
  → Cap training at 3–4 days regardless of preference
  → Reduce set count by 20%
  → Add coaching note: "Your recovery factors suggest lower frequency. Quality > quantity."
```

### 4.5 Introductory Ramp-Up (Weeks 1–2)

For beginners and users returning after 3+ months off:
```
Week 1: 40% of prescribed volume (1 set where 3 prescribed)
Week 2: 70% of prescribed volume (2 sets where 3 prescribed)
Week 3+: Full volume, progressive overload begins
```

---

## SECTION 5 — Split Selection Engine

### Decision Matrix

```
PRIMARY: experience_level + days_per_week + goal + equipment + recovery_score
OVERRIDE: bodyweight/travel → force Full Body or Upper/Lower
OVERRIDE: recovery_score ≤ 4 → cap at 3–4 days
OVERRIDE: session_length < 45min → max 4 exercises, Full Body or Upper/Lower only
OVERRIDE: goal = wellness → force Full Body 2–3×/week
```

### Split Rules

| Experience | Days | Recommended Split |
|-----------|------|-------------------|
| Beginner | 2 | Full Body A/B |
| Beginner | 3 | Full Body A/B/A |
| Beginner | 4 | Upper/Lower |
| Beginner | 5+ | Cap at 4, flag overtraining risk |
| Intermediate | 3 | Full Body or PPL-3day |
| Intermediate | 4 | Upper/Lower or Bro Split (if preferred) |
| Intermediate | 5 | PPL + Upper or Full Body |
| Intermediate | 6 | PPL ×2 |
| Advanced | 3 | Full Body (strength) or PHUL |
| Advanced | 4 | Upper/Lower, Arnold, Bro Split, PHUL |
| Advanced | 5 | PPL + Specialization, PHAT |
| Advanced | 6 | PPL ×2, Arnold ×2, Full Bro Split |

**Beginner NEVER gets:** PPL, Bro Split, Arnold, PHUL, PHAT

**Bro Split note for Intermediate:** Only if user explicitly selects it OR hypertrophy goal + 4–5 days. Flag: "Bro Split hits each muscle once/week. Research suggests 2×/week may produce better hypertrophy. Consider PPL if open to it."

---

## SECTION 6 — Exercise Day Blueprints

### Non-Negotiable Rules Across All Day Types
1. Compound before isolation — always
2. Rear delts on every push, upper, and full body session — non-negotiable
3. Never two exercises for the same muscle consecutively (except pre-exhaust, advanced only)
4. Popularity floor: Beginner ≥ 65, Intermediate ≥ 55, Advanced ≥ 45
5. Equipment filter applied before any exercise is selected
6. Never barbell squat + conventional deadlift heavy on the same day

### Push Day Blueprint

```
1. CHEST COMPOUND (horizontal push, primary)
   Full gym (Int+): Barbell Bench Press
   Full gym (Beg):  Machine Chest Press or DB Bench Press
   Home:            Dumbbell Bench Press
   Sets: 4 | Reps: 8–12 | Rest: 120–180s

2. INCLINE CHEST COMPOUND (upper chest)
   Full gym:  Incline Dumbbell Press (most accessible)
              Incline Barbell Press (intermediate+)
   Home:      Incline Dumbbell Press (if adjustable bench)
   Sets: 3 | Reps: 8–12 | Rest: 90–120s

3. REAR DELT (MANDATORY)
   Full gym:  Face Pull (cable) ← default
              Rear Delt Fly Machine (pec deck reversed)
   Home:      Prone Dumbbell Rear Delt Fly
   Sets: 3 | Reps: 15–20 | Rest: 60s

4. LATERAL RAISE
   Full gym:  Cable Lateral Raise or Dumbbell Lateral Raise
   Home:      Dumbbell Lateral Raise
   Sets: 3–4 | Reps: 15–20 | Rest: 60s

5. CHEST ISOLATION (Intermediate+)
   Full gym:  Cable Fly Low-to-High or Pec Deck
   Home:      Dumbbell Fly
   Sets: 3 | Reps: 12–15 | Rest: 60s

6. TRICEP PRIMARY
   Full gym (Int+): Skull Crushers EZ Bar
   Full gym (Beg):  Overhead Tricep Extension (cable or DB)
   Home:            Overhead DB Tricep Extension
   Sets: 3 | Reps: 8–12 | Rest: 90s

7. TRICEP SECONDARY
   Full gym:  Tricep Pushdown (rope)
   Home:      Diamond Push-Up
   Sets: 2–3 | Reps: 12–15 | Rest: 60s

BEGINNER: Exercises 1, 3, 4, 7 only (4 exercises)
INTERMEDIATE: All 7 (add 1 technique max)
ADVANCED: All 7 + techniques
```

### Pull Day Blueprint

```
1. VERTICAL PULL (lat width)
   Full gym (Beg):  Lat Pulldown Wide Grip
   Full gym (Int+): Pull-Up / Chin-Up
   Home (w/bar):    Pull-Up or Chin-Up
   Home (no bar):   Inverted Row
   Sets: 4 | Reps: 8–12 | Rest: 120s

2. HORIZONTAL PULL (thickness)
   Full gym:  Cable Row Seated Close Grip, Barbell Row (Int+), Machine Row (Beg)
   Home:      Dumbbell Row Single Arm
   Sets: 4 | Reps: 8–12 | Rest: 90–120s

3. SECONDARY PULL (upper back detail)
   Full gym:  Lat Pulldown Close/Neutral Grip, Chest-Supported Row
   Home:      DB Row variation (different angle)
   Sets: 3 | Reps: 10–15 | Rest: 90s

4. REAR DELT / FACE PULL (MANDATORY)
   Full gym:  Face Pull (cable) ← default
   Home:      Prone DB Rear Delt Fly, Band Face Pull
   Sets: 3 | Reps: 15–20 | Rest: 60s

5. BICEP COMPOUND
   Full gym:  Barbell Curl or EZ Bar Curl
   Home:      Dumbbell Curl Alternating
   Sets: 3 | Reps: 8–12 | Rest: 90s

6. BICEP VARIATION
   Full gym:  Hammer Curl, Incline DB Curl, Cable Curl, Preacher Curl
   Home:      Hammer Curl or Concentration Curl
   Sets: 3 | Reps: 12–15 | Rest: 60s

BEGINNER: Exercises 1, 2, 4, 5 only
INTERMEDIATE: All 6
ADVANCED: All 6 + techniques (superset 2+3 or 5+6)
```

### Leg Day Blueprint

```
1. PRIMARY QUAD COMPOUND (neural demand highest → always first)
   Full gym (Int+): Barbell Back Squat
   Full gym (Beg):  Goblet Squat or Leg Press
   Home:            Goblet Squat or Bulgarian Split Squat
   Sets: 4 | Reps: 6–10 (strength) / 8–15 (hypertrophy) | Rest: 2–3 min

2. SECONDARY QUAD / UNILATERAL
   Full gym:  Bulgarian Split Squat, Hack Squat, Leg Press
   Home:      Lunges DB, Step-Ups
   Sets: 3 | Reps: 10–12 each leg | Rest: 90s

3. HAMSTRING COMPOUND (hinge — never skip)
   Full gym:  Romanian Deadlift BB or DB
   Home:      Romanian Deadlift DB or Single-Leg RDL
   Sets: 3–4 | Reps: 10–12 | Rest: 90s

4. QUAD ISOLATION
   Full gym:  Leg Extension Machine
   Home:      Wall Sit or Sissy Squat progression
   Sets: 3 | Reps: 12–15 | Rest: 60s

5. HAMSTRING ISOLATION
   Full gym:  Lying Leg Curl Machine, Seated Leg Curl
   Home:      Glute Bridge Curl
   Sets: 3 | Reps: 12–15 | Rest: 60s

6. GLUTE (mandatory in female-default programs, optional for male)
   Full gym:  Hip Thrust Barbell or Machine, Cable Glute Kickback
   Home:      Hip Thrust DB or Banded Glute Bridge
   Sets: 3 | Reps: 12–15 | Rest: 60–90s

7. CALVES (never skip)
   Full gym:  Standing Calf Raise Machine (gastrocnemius)
              Seated Calf Raise Machine (soleus)
   Home:      Single-Leg Calf Raise on step
   Sets: 3–4 | Reps: 12–20 | Rest: 60s

BEGINNER: Exercises 1, 3, 5, 7 (pattern > volume)
INTERMEDIATE: 1, 2, 3, 4, 5, 7
ADVANCED: All 7 + techniques
```

---

## SECTION 7 — Volume, Intensity & Progression

### Weekly Volume Targets

| Muscle Group | Beginner (sets/wk) | Intermediate (sets/wk) | Advanced (sets/wk) |
|-------------|-------------------|----------------------|-------------------|
| Chest | 6–8 | 10–15 | 15–22 |
| Back | 8–10 | 12–18 | 16–25 |
| Shoulders | 6–8 | 10–15 | 14–20 |
| Rear Delts | 4–6 | 6–10 | 8–15 |
| Triceps | 4–6 | 8–12 | 10–16 |
| Biceps | 4–6 | 8–12 | 10–16 |
| Quads | 6–8 | 10–16 | 14–20 |
| Hamstrings | 4–6 | 8–12 | 10–16 |
| Glutes | 4–6 | 6–12 | 10–16 |
| Calves | 6–8 | 8–12 | 10–16 |

### Sets/Reps/Rest by Goal

| Goal | Compounds | Isolation | Rest |
|------|-----------|-----------|------|
| Build Muscle | 4×6–12 | 3×10–20 | 90–180s / 60–90s |
| Lose Fat | 3–4×10–15 | 2–3×15–20 | 60–90s / 45–60s |
| Strength | 4–6×1–5 | 3–4×5–8 | 3–5min / 2–3min |
| Maintenance | 3×8–12 | 2–3×12–15 | 90s / 60s |

### Progressive Overload by Experience

**Beginner — Linear:** Add reps until top of range → add weight (+5lbs lower, +2.5lbs upper)

**Intermediate — Double Progression:** Hit full rep range 2 sessions in a row → increase weight next session, reset to bottom of rep range

**Advanced — DUP:**
```
Heavy day:   4×5 @ ~85% 1RM
Moderate day: 3×10 @ ~70% 1RM
Light day:   2×15 @ ~60% 1RM
Progress heavy day +2.5–5lbs/week
Every 4 weeks: recalculate from performance data
```

### Deload (Every 4th Week)

```
Same exercises, same relative intensity (% of 1RM unchanged)
Volume drops 40–50% (2–3 sets where 4–5 prescribed)
No advanced techniques during deload
Reps at top of range, never approaching failure
```

---

## SECTION 8 — Training Techniques by Level

### Beginner: Straight Sets Only
No exceptions. Focus: form, progressive overload, consistency.

### Intermediate: 3 Unlocked Techniques

**Antagonist Superset** — Exercise A → Exercise B (opposing muscle) → rest 90s
- Bench Press + Cable Row, Bicep Curl + Tricep Pushdown
- Saves 15–20% session time with no quality loss

**Drop Set** — Final set only, isolation only, 1 per session max
- Reduce weight 20–25% immediately after last set → continue to failure

**Myo-Reps** — Activation set (12–15 reps, RPE 9) → rest 5 breaths → 5 reps → repeat ×3
- Best for: lateral raises, cable curls, tricep pushdowns

### Advanced: Full Toolkit
Antagonist supersets, drop sets, myo-reps, rest-pause, giant sets, mechanical drop sets, pre-exhaust, tempo manipulation (3-1-2 or 4-1-1-0), BFR, cluster sets

---

## SECTION 9 — Equipment Substitution Matrix

| Full Gym | Home (DB+Bench) | Bodyweight |
|----------|-----------------|------------|
| Barbell Bench Press | DB Bench Press | Push-Up → Archer Push-Up |
| Cable Fly | DB Fly | Slow push-up (pause at bottom) |
| Pec Deck | DB Fly | Same |
| Cable Row | DB Row (single arm) | Inverted Row |
| Lat Pulldown | DB Row + Pull-Up | Pull-Up or Inverted Row |
| Face Pull | Prone Rear Delt Fly | Band Face Pull |
| Tricep Pushdown | Overhead DB Tricep Ext | Diamond Push-Up |
| Leg Press | Goblet Squat + Split Squat | Bulgarian Split Squat |
| Leg Curl Machine | RDL + Nordic Curl progression | Nordic Curl |
| Hip Thrust Machine | Hip Thrust DB on hips | Banded Glute Bridge |
| Calf Raise Machine | Single-Leg Calf Raise on step | Same |

---

## SECTION 10 — Program JSON Schema

```typescript
// Zod schema — runtime validated on both server and client

const ExerciseTechniqueSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('drop_set'), drops: z.number().min(1).max(3), reduction_percent: z.number(), note: z.string() }),
  z.object({ type: z.literal('superset'), paired_with_order: z.number(), superset_type: z.enum(['antagonist','agonist']), note: z.string() }),
  z.object({ type: z.literal('tempo'), eccentric: z.number(), pause: z.number(), concentric: z.number(), note: z.string() }),
  z.object({ type: z.literal('myo_rep'), activation_reps: z.number(), mini_set_reps: z.number(), mini_set_count: z.number(), note: z.string() }),
  z.object({ type: z.literal('rest_pause'), pause_seconds: z.number(), additional_reps: z.number(), note: z.string() }),
]);

const ProgramExerciseSchema = z.object({
  order: z.number().min(1).max(10),
  exercise_id: z.string().uuid(),
  exercise_name: z.string(),          // snapshot — never rely on DB join alone
  primary_muscles: z.array(z.string()),
  sets: z.number().min(1).max(8),
  rep_range: z.string(),              // "8-12" or "AMRAP"
  rest_seconds: z.number().min(30).max(360),
  rpe_target: z.number().min(5).max(10).nullable(),
  rir_target: z.number().min(0).max(4).nullable(),
  technique: ExerciseTechniqueSchema.nullable(),
  coaching_cue: z.string().max(300),
  pre_session_note: z.string().optional(),  // warm-up guidance on first exercise only
});

const WorkoutDaySchema = z.object({
  day_type: z.enum(['push','pull','legs','upper_a','upper_b','lower_a','lower_b',
                    'full_body_a','full_body_b','chest','back','shoulders','arms',
                    'shoulders_arms','chest_back','legs_core','rest']),
  label: z.string(),                   // "Push Day A", "Pull Day", "Leg Day"
  day_of_week: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
  block: z.enum(['foundation','intensification','peak','deload']),
  is_deload: z.boolean(),
  estimated_duration_min: z.number(),
  exercises: z.array(ProgramExerciseSchema).min(0).max(10),
  notes: z.string().optional(),
});

const FullProgramSchema = z.object({
  meta: z.object({
    name: z.string(),
    split: z.enum(['full_body','upper_lower','ppl','bro_split','arnold','phul','phat']),
    goal: z.enum(['lose_fat','build_muscle','maintain','performance','wellness']),
    experience_level: z.enum(['beginner','intermediate','advanced']),
    days_per_week: z.number(),
    training_days: z.array(z.string()),   // the actual days user selected
    rest_days: z.array(z.string()),       // derived rest days
    total_weeks: z.number(),
    schema_version: z.literal('v2.1'),
    generation_method: z.enum(['ai_refined','rule_based']),
    push_pull_ratio: z.number(),          // quality gate output
    generated_at: z.string().datetime(),
  }),
  weekly_schedule: z.record(
    z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday']),
    z.string()  // day_type
  ),
  days: z.array(WorkoutDaySchema),
  progressive_overload_notes: z.string(),
  deload_instructions: z.string(),
  ramp_up_weeks: z.number().default(2),   // weeks before hitting full volume
});
```

---

## SECTION 11 — Quality Gates (Pre-Save)

```typescript
function validateProgramQuality(program, profile): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Popularity floor
  const floor = profile.experience_level === 'beginner' ? 65 : profile.experience_level === 'intermediate' ? 55 : 45;
  for (const day of program.days) {
    for (const ex of day.exercises) {
      if ((ex.popularity_score ?? 0) < floor) errors.push(`${ex.exercise_name} below popularity floor`);
    }
  }

  // 2. Push:Pull ratio (0.85–1.15)
  const pushSets = countSets(program, ['chest','front_delts','triceps']);
  const pullSets = countSets(program, ['lats','rhomboids','rear_delts','biceps']);
  const ratio = pushSets / (pullSets || 1);
  if (ratio > 1.20) errors.push(`Push:Pull ratio ${ratio.toFixed(2)} — too push-dominant`);
  program.meta.push_pull_ratio = ratio;

  // 3. Rear delt on every push/upper/full_body day
  for (const day of program.days.filter(d => ['push','upper_a','upper_b','full_body_a','full_body_b','chest_back','shoulders_arms'].includes(d.day_type))) {
    const hasRearDelt = day.exercises.some(ex =>
      ex.primary_muscles?.includes('rear_delts') || ex.exercise_name.toLowerCase().includes('face pull') || ex.exercise_name.toLowerCase().includes('rear delt')
    );
    if (!hasRearDelt) errors.push(`${day.label} missing rear delt work`);
  }

  // 4. No heavy squat + conventional deadlift same day
  for (const day of program.days) {
    const hasSquat = day.exercises.some(ex => ex.exercise_name.toLowerCase().includes('back squat'));
    const hasDeadlift = day.exercises.some(ex => ex.exercise_name.toLowerCase().includes('conventional deadlift'));
    if (hasSquat && hasDeadlift) errors.push(`${day.label}: heavy squat + deadlift same day — excessive spinal load`);
  }

  // 5. No advanced techniques for beginners
  if (profile.experience_level === 'beginner') {
    for (const day of program.days) {
      for (const ex of day.exercises) {
        if (ex.technique !== null) errors.push(`Beginner has technique on ${ex.exercise_name}`);
      }
    }
  }

  // 6. Calves on all leg/lower days
  for (const day of program.days.filter(d => ['legs','lower_a','lower_b'].includes(d.day_type))) {
    if (!day.exercises.some(ex => ex.primary_muscles?.includes('calves')))
      warnings.push(`${day.label} missing calf work`);
  }

  // 7. Dynamic schedule matches user's actual training days
  const scheduled_training_days = Object.entries(program.weekly_schedule)
    .filter(([_, type]) => type !== 'rest')
    .map(([day]) => day);
  for (const day of scheduled_training_days) {
    if (!program.meta.training_days.includes(day))
      errors.push(`Session scheduled on ${day} but user didn't select this day`);
  }

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## SECTION 12 — DB Schema (Migration Plan)

### New migration: `064_workout_generation_v2.sql`

```sql
-- Add missing columns to exercises table
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS primary_muscles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS split_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment_options TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technique_compatibility TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternative_exercise_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS experience_min TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 50 CHECK (popularity_score BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS force_type TEXT,
  ADD COLUMN IF NOT EXISTS is_unilateral BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS requires_spotter BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS joint_stress_level INTEGER DEFAULT 2 CHECK (joint_stress_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS beginner_progression_of UUID REFERENCES exercises(id),
  ADD COLUMN IF NOT EXISTS is_system_exercise BOOLEAN DEFAULT TRUE;

-- GIN indexes (critical for array query performance)
CREATE INDEX IF NOT EXISTS idx_exercises_split_tags ON exercises USING GIN(split_tags);
CREATE INDEX IF NOT EXISTS idx_exercises_equipment_options ON exercises USING GIN(equipment_options);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscles ON exercises USING GIN(primary_muscles);
CREATE INDEX IF NOT EXISTS idx_exercises_technique_compatibility ON exercises USING GIN(technique_compatibility);
CREATE INDEX IF NOT EXISTS idx_exercises_popularity ON exercises (popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_exercises_experience ON exercises (experience_min, difficulty);

-- user_profiles table (self-serve onboarding — separate from client_onboarding)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  primary_goal TEXT,
  experience_level TEXT,
  days_per_week INTEGER,
  training_days TEXT[],
  rest_days TEXT[],
  session_length_min INTEGER,
  preferred_split TEXT,
  equipment_type TEXT,
  specific_equipment TEXT[],
  age INTEGER,
  biological_sex TEXT,
  height_cm NUMERIC(5,1),
  weight_kg NUMERIC(5,1),
  goal_weight_kg NUMERIC(5,1),
  activity_level TEXT,
  avg_sleep_hours NUMERIC(3,1),
  stress_level INTEGER,
  job_physical_demand TEXT,
  priority_muscles TEXT[],
  lagging_muscles TEXT[],
  exercises_to_avoid TEXT[],
  preferred_exercises TEXT[],
  injuries TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);

-- user_programs table (self-serve — separate from client_programs)
CREATE TABLE IF NOT EXISTS user_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  split_type TEXT NOT NULL,
  goal TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  training_days TEXT[],
  total_weeks INTEGER DEFAULT 12,
  current_week INTEGER DEFAULT 1,
  started_at DATE,
  full_program_json JSONB NOT NULL,
  generation_profile_snapshot JSONB,
  schema_version TEXT DEFAULT 'v2.1',
  generation_method TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  substitution_count INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their programs" ON user_programs FOR ALL USING (auth.uid() = user_id);

-- workout_sessions table (drives auto-progression)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  program_id UUID REFERENCES user_programs(id),
  day_type TEXT,
  week_number INTEGER,
  day_of_week TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_min INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  completion_percent INTEGER,
  rpe_overall INTEGER,
  sets_log JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id, program_id);

ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their sessions" ON workout_sessions FOR ALL USING (auth.uid() = user_id);

-- exercise_progressions table
CREATE TABLE IF NOT EXISTS exercise_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  exercise_id UUID REFERENCES exercises(id),
  best_weight_kg NUMERIC(6,2),
  best_reps INTEGER,
  estimated_1rm NUMERIC(6,2),
  current_working_weight_kg NUMERIC(6,2),
  current_rep_range TEXT,
  sessions_at_current_weight INTEGER DEFAULT 0,
  ready_for_progression BOOLEAN DEFAULT FALSE,
  last_performed_at TIMESTAMPTZ,
  total_sessions INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

ALTER TABLE exercise_progressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their progressions" ON exercise_progressions FOR ALL USING (auth.uid() = user_id);
```

---

## SECTION 13 — Implementation Roadmap

### Sprint 1 (Week 1): Database Foundation
- [x] Migration 064: exercises columns + GIN indexes + user_profiles + user_programs + workout_sessions + exercise_progressions
- [ ] Migration 065: Seed 150 core exercises with all fields

### Sprint 2 (Week 2): TypeScript Generation Engine
- [ ] `lib/workout/schedule-builder.ts` — dynamic schedule from user's exact days
- [ ] `lib/workout/split-selector.ts` — deterministic rules engine
- [ ] `lib/workout/exercise-pool.ts` — DB query with filters
- [ ] `lib/workout/program-builder.ts` — blueprint-based exercise selection
- [ ] `lib/workout/technique-injector.ts` — sets/reps/rest/techniques by level
- [ ] `lib/workout/quality-gates.ts` — pre-save validation

### Sprint 3 (Week 3): Edge Function
- [ ] `supabase/functions/generate-program/index.ts` — single function, all layers
- [ ] Claude prompt v2.1 with exercise pool input
- [ ] Fallback: rule-based output if AI times out at 45s

### Sprint 4 (Week 4): Onboarding Integration
- [ ] Wire onboarding training screen to save training_days + rest_days to user_profiles
- [ ] Trigger generation at Equipment screen (background)
- [ ] Plan Review screen polls for completion
- [ ] Remove all "Cable Supine Reverse Fly" era exercises

### Sprint 5 (Week 5): Progression + Substitution
- [ ] Auto-progression trigger (2 sessions at top of rep range → notify)
- [ ] Substitution engine using alternative_exercise_ids
- [ ] Deload week auto-generation (weeks 4, 8, 12)

---

## Quality Standards — Non-Negotiable

| Standard | Rule |
|---------|------|
| Popularity floor | Beginner ≥ 65, Intermediate ≥ 55, Advanced ≥ 45 |
| Rear delt | Every push, upper, full_body session |
| Push:Pull ratio | 0.85–1.15 |
| Beginner techniques | Straight sets ONLY |
| Beginner exercise count | Max 4/session |
| Calves | Every leg/lower session |
| Squat + Deadlift same day | NEVER |
| Schedule accuracy | Only scheduled on user's selected days |
| AI output | Zod-validated before saving |
| Generation timing | Starts at Equipment screen, done by Plan Review |
| Paywall | Gates app access — NOT plan quality. Everyone gets full generation. |
