# MetriqFit — Workout Generation System Gameplan
**Exercise Science Architecture & Implementation Plan**
*Prepared: March 28, 2026*

---

## AUDIT FINDINGS — Current State

### What Exists
- `exercises` table: Schema present, **0 rows** — completely empty
- `program_templates` table: Schema present, **0 rows** — completely empty
- `client_onboarding` table: Rich intake data (experience level, days available, preferred split, equipment, injuries, priority muscles, exercises loved/hated) — **this data is collected but never used to generate workouts**
- `client_programs` table: Has `full_program_json` JSONB column ready to store output — but nothing is generating into it

### Root Causes
1. **No exercise database.** The exercises table is empty and the schema is incomplete — missing difficulty, primary/secondary muscles, technique compatibility, split tags, and alternative exercise mappings.
2. **No generation engine.** There is no algorithm, AI prompt, or edge function that takes onboarding inputs and produces a real workout program.
3. **No split selection logic.** Nothing maps (goal + experience + days/week + equipment) → correct split type.
4. **No exercise science rules.** No logic for exercise ordering, muscle group pairing, volume landmarks, technique progression by level, or progressive overload cadence.
5. **No quality control layer.** No system to ensure exercises are accessible, appropriate for the user's equipment, or logically paired.

### What the App Showed (The Symptom)
"Cable Supine Reverse Fly" in an Upper Hypertrophy day = AI hallucinating obscure exercises with no grounding in a curated, validated exercise database. The fix is **not** better prompting — it's building a proper exercise database and generation system so the AI selects from a vetted, scientifically organized pool.

---

## THE NEW SYSTEM — Architecture Overview

```
ONBOARDING INPUTS
(goal, experience, days/week, equipment, injuries, preferred split, priority muscles)
         │
         ▼
SPLIT SELECTION ENGINE
(deterministic rules → selects optimal split type)
         │
         ▼
PROGRAM STRUCTURE BUILDER
(maps split → weekly schedule → day types → volume targets)
         │
         ▼
EXERCISE SELECTION ENGINE
(queries curated exercise DB → applies rules: muscle group, equipment, difficulty, ordering)
         │
         ▼
TECHNIQUE + CADENCE LAYER
(applies progressive overload, sets/reps/rest, techniques by experience level)
         │
         ▼
AI REFINEMENT PASS
(Claude reviews for coherence, substitutes if needed, adds coaching cues)
         │
         ▼
FULL_PROGRAM_JSON → client_programs table
```

---

## PHASE 1 — Exercise Database Schema Fix

### Required Changes to `exercises` Table

```sql
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS primary_muscles TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS movement_pattern_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS split_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS equipment_options TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS technique_compatibility TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alternative_exercise_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS common_name TEXT,
  ADD COLUMN IF NOT EXISTS is_compound BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS force_type TEXT,
  ADD COLUMN IF NOT EXISTS mechanic TEXT,
  ADD COLUMN IF NOT EXISTS experience_min TEXT DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 50;
```

### Field Definitions

| Field | Values | Purpose |
|-------|--------|---------|
| `difficulty` | 1–5 | 1=pushup, 5=snatch |
| `primary_muscles` | chest, back, quads, hamstrings, glutes, shoulders, triceps, biceps, core, calves, traps, lats, rhomboids | Exercise selection filter |
| `secondary_muscles` | same list | Volume counting |
| `split_tags` | push, pull, legs, upper, lower, full_body, arms, shoulders | Which day type this belongs to |
| `equipment_options` | barbell, dumbbell, cable, machine, bodyweight, bands, ez_bar, smith | Equipment filter |
| `technique_compatibility` | drop_set, superset, rest_pause, tempo, giant_set, cluster, mechanical_drop | What techniques this exercise supports |
| `experience_min` | beginner, intermediate, advanced | Floor for exercise selection |
| `movement_pattern_tags` | horizontal_push, vertical_push, horizontal_pull, vertical_pull, squat, hinge, lunge, carry, isolation | Ensures balanced programming |
| `force_type` | push, pull, static | |
| `popularity_score` | 1–100 | Prioritize common exercises; bench=95, cable supine reverse fly=8 |

---

## PHASE 2 — Exercise Database Population

### Minimum Viable Database: 150 Core Exercises

Organized by Split Day and Priority (High/Medium/Low access likelihood)

---

### PUSH EXERCISES

#### Chest — Compounds
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Barbell Bench Press (Flat) | barbell | 2 | 98 | beginner |
| Dumbbell Bench Press (Flat) | dumbbell | 1 | 95 | beginner |
| Incline Barbell Bench Press | barbell | 3 | 90 | beginner |
| Incline Dumbbell Press | dumbbell | 2 | 92 | beginner |
| Decline Barbell Bench Press | barbell | 3 | 75 | intermediate |
| Machine Chest Press | machine | 1 | 88 | beginner |
| Cable Chest Press | cable | 2 | 72 | intermediate |
| Push-Up | bodyweight | 1 | 97 | beginner |
| Dips (Chest Focus) | bodyweight | 3 | 82 | intermediate |
| Smith Machine Bench Press | smith | 1 | 78 | beginner |

#### Chest — Isolation
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Dumbbell Fly (Flat) | dumbbell | 2 | 85 | beginner |
| Incline Dumbbell Fly | dumbbell | 2 | 80 | beginner |
| Cable Fly (Low to High) | cable | 2 | 88 | beginner |
| Cable Fly (High to Low) | cable | 2 | 85 | beginner |
| Pec Deck Machine | machine | 1 | 88 | beginner |
| Cable Crossover | cable | 2 | 82 | intermediate |

#### Shoulders — Compounds
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Barbell Overhead Press | barbell | 3 | 92 | beginner |
| Dumbbell Shoulder Press | dumbbell | 2 | 93 | beginner |
| Seated Machine Shoulder Press | machine | 1 | 85 | beginner |
| Arnold Press | dumbbell | 3 | 82 | intermediate |
| Landmine Press | barbell | 3 | 65 | intermediate |
| Push Press | barbell | 4 | 70 | intermediate |

#### Shoulders — Isolation
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Dumbbell Lateral Raise | dumbbell | 1 | 95 | beginner |
| Cable Lateral Raise | cable | 2 | 85 | beginner |
| Machine Lateral Raise | machine | 1 | 82 | beginner |
| Dumbbell Front Raise | dumbbell | 1 | 80 | beginner |
| Cable Front Raise | cable | 2 | 72 | beginner |
| Face Pull | cable | 2 | 88 | beginner |
| Rear Delt Fly (Dumbbell) | dumbbell | 1 | 85 | beginner |
| Rear Delt Fly (Machine/Pec Deck) | machine | 1 | 85 | beginner |
| Cable Rear Delt Fly | cable | 2 | 78 | intermediate |

#### Triceps
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Tricep Pushdown (Rope) | cable | 1 | 95 | beginner |
| Tricep Pushdown (Bar) | cable | 1 | 92 | beginner |
| Overhead Tricep Extension (Cable) | cable | 2 | 88 | beginner |
| Overhead Tricep Extension (DB) | dumbbell | 1 | 85 | beginner |
| Skull Crushers (EZ Bar) | ez_bar | 3 | 82 | intermediate |
| Skull Crushers (Dumbbell) | dumbbell | 2 | 80 | beginner |
| Close-Grip Bench Press | barbell | 3 | 80 | intermediate |
| Tricep Dips (Machine) | machine | 1 | 78 | beginner |
| Diamond Push-Up | bodyweight | 2 | 78 | beginner |
| Cable Kickback | cable | 2 | 72 | beginner |

---

### PULL EXERCISES

#### Back — Compounds
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Barbell Row (Bent Over) | barbell | 3 | 92 | beginner |
| Dumbbell Row (Single Arm) | dumbbell | 1 | 95 | beginner |
| Cable Row (Seated, Close Grip) | cable | 1 | 92 | beginner |
| Cable Row (Seated, Wide Grip) | cable | 2 | 82 | beginner |
| Machine Row | machine | 1 | 88 | beginner |
| T-Bar Row | barbell | 3 | 78 | intermediate |
| Chest-Supported Row (Machine) | machine | 1 | 82 | beginner |
| Pull-Up | bodyweight | 3 | 85 | intermediate |
| Chin-Up | bodyweight | 2 | 85 | beginner |
| Lat Pulldown (Wide Grip) | cable | 1 | 95 | beginner |
| Lat Pulldown (Close Grip) | cable | 1 | 90 | beginner |
| Lat Pulldown (Neutral Grip) | cable | 1 | 85 | beginner |
| Assisted Pull-Up (Machine) | machine | 1 | 82 | beginner |
| Inverted Row | bodyweight | 2 | 78 | beginner |

#### Back — Isolation
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Straight Arm Pulldown | cable | 2 | 80 | intermediate |
| Cable Pullover | cable | 2 | 72 | intermediate |
| Dumbbell Pullover | dumbbell | 2 | 75 | intermediate |
| Shrugs (Barbell) | barbell | 1 | 85 | beginner |
| Shrugs (Dumbbell) | dumbbell | 1 | 88 | beginner |
| Shrugs (Cable) | cable | 1 | 78 | beginner |

#### Biceps
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Barbell Curl | barbell | 1 | 95 | beginner |
| EZ Bar Curl | ez_bar | 1 | 90 | beginner |
| Dumbbell Curl (Alternating) | dumbbell | 1 | 95 | beginner |
| Dumbbell Curl (Bilateral) | dumbbell | 1 | 90 | beginner |
| Hammer Curl | dumbbell | 1 | 90 | beginner |
| Incline Dumbbell Curl | dumbbell | 2 | 80 | beginner |
| Cable Curl (Bar) | cable | 1 | 85 | beginner |
| Cable Curl (Rope) | cable | 2 | 78 | beginner |
| Preacher Curl (Machine) | machine | 1 | 82 | beginner |
| Preacher Curl (EZ Bar) | ez_bar | 2 | 80 | beginner |
| Concentration Curl | dumbbell | 1 | 78 | beginner |

---

### LEG EXERCISES

#### Quads — Compounds
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Barbell Back Squat | barbell | 4 | 92 | beginner |
| Barbell Front Squat | barbell | 4 | 70 | intermediate |
| Goblet Squat | dumbbell | 2 | 88 | beginner |
| Leg Press | machine | 1 | 95 | beginner |
| Hack Squat (Machine) | machine | 2 | 82 | beginner |
| Bulgarian Split Squat | dumbbell | 3 | 85 | beginner |
| Lunges (Dumbbell) | dumbbell | 2 | 88 | beginner |
| Lunges (Barbell) | barbell | 3 | 75 | intermediate |
| Step-Ups | dumbbell | 2 | 80 | beginner |
| Smith Machine Squat | smith | 2 | 78 | beginner |

#### Quads — Isolation
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Leg Extension | machine | 1 | 95 | beginner |
| Sissy Squat | bodyweight | 3 | 55 | intermediate |

#### Hamstrings
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Romanian Deadlift (Barbell) | barbell | 3 | 90 | beginner |
| Romanian Deadlift (Dumbbell) | dumbbell | 2 | 88 | beginner |
| Conventional Deadlift | barbell | 4 | 88 | beginner |
| Sumo Deadlift | barbell | 4 | 80 | intermediate |
| Lying Leg Curl (Machine) | machine | 1 | 92 | beginner |
| Seated Leg Curl (Machine) | machine | 1 | 90 | beginner |
| Nordic Hamstring Curl | bodyweight | 5 | 65 | advanced |
| Good Morning | barbell | 3 | 70 | intermediate |

#### Glutes
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Hip Thrust (Barbell) | barbell | 2 | 88 | beginner |
| Hip Thrust (Dumbbell) | dumbbell | 1 | 85 | beginner |
| Hip Thrust (Machine) | machine | 1 | 82 | beginner |
| Glute Kickback (Cable) | cable | 1 | 80 | beginner |
| Glute Bridge | bodyweight | 1 | 85 | beginner |
| Cable Pull-Through | cable | 2 | 72 | intermediate |
| Sumo Deadlift | barbell | 4 | 80 | intermediate |

#### Calves
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Standing Calf Raise (Machine) | machine | 1 | 92 | beginner |
| Seated Calf Raise (Machine) | machine | 1 | 90 | beginner |
| Leg Press Calf Raise | machine | 1 | 85 | beginner |
| Single-Leg Calf Raise (Bodyweight) | bodyweight | 1 | 82 | beginner |
| Dumbbell Standing Calf Raise | dumbbell | 1 | 80 | beginner |

---

### CORE EXERCISES
| Exercise | Equipment | Difficulty | Popularity | Experience Min |
|----------|-----------|------------|------------|----------------|
| Cable Crunch | cable | 2 | 85 | beginner |
| Plank | bodyweight | 1 | 95 | beginner |
| Ab Wheel Rollout | bodyweight | 4 | 80 | intermediate |
| Hanging Leg Raise | bodyweight | 3 | 82 | intermediate |
| Decline Sit-Up | machine | 2 | 78 | beginner |
| Russian Twist | bodyweight | 2 | 80 | beginner |
| Pallof Press | cable | 2 | 75 | intermediate |

---

## PHASE 3 — Split Selection Engine (Deterministic Rules)

### Input Variables
- `goal`: lose_fat | build_muscle | maintain | performance | wellness
- `experience_level`: beginner | intermediate | advanced
- `days_per_week`: 2 | 3 | 4 | 5 | 6
- `equipment`: full_gym | home | bodyweight | travel
- `preferred_split`: (optional override from onboarding)
- `session_length`: 30min | 45min | 60min | 90min

### Split Selection Decision Tree

```
IF experience = beginner:
  2 days → Full Body A/B
  3 days → Full Body A/B/A
  4 days → Upper/Lower (A/B)
  5+ days → Upper/Lower/Full (don't overload beginners)
  NEVER → PPL, Bro Split, Arnold for beginners

IF experience = intermediate:
  3 days → Full Body OR PPL (condensed 3-day)
  4 days → Upper/Lower OR Bro Split (4-day)
  5 days → PPL + Full Body (P/P/L/U/FB)
  6 days → PPL (x2 weekly)

IF experience = advanced:
  3 days → Full Body (strength focus) OR Power/Hypertrophy split
  4 days → Upper/Lower OR Arnold OR Bro Split
  5 days → PPL + specialization OR PHUL
  6 days → PPL (x2) OR Arnold (x2) OR Bro Split
  6 days + bodybuilding goal → Full Bro Split OR Specialization Block

GOAL MODIFIERS:
  lose_fat → prefer higher frequency, shorter rest, circuit options
  build_muscle → standard splits, all options available
  performance → Full Body, compound-heavy, lower frequency isolation
  wellness → 2-3 days Full Body only, no advanced techniques

EQUIPMENT MODIFIERS:
  bodyweight_only → Full Body regardless of split preference
  home_minimal → Full Body or Upper/Lower with DB substitutions
  full_gym → All splits available
```

### Split Definitions

#### Full Body (A/B alternating)
```
Day A: Squat pattern + Horizontal Push + Vertical Pull + Core
Day B: Hinge pattern + Horizontal Pull + Vertical Push + Core
Frequency: 2-3x/week
Rest: 1 day between sessions
```

#### Upper/Lower (4-day)
```
Upper A: Horizontal Push compound + Vertical Pull + Horizontal Push iso + Vertical Pull iso + Biceps
Upper B: Vertical Push + Horizontal Pull + Rear Delt + Triceps + Biceps
Lower A: Quad dominant (squat) + Hamstring (curl) + Glute + Calves
Lower B: Hinge dominant (RDL/Deadlift) + Quad iso + Hamstring + Glutes + Calves
```

#### Push/Pull/Legs (PPL)
```
Push: Chest compound + Chest iso + Shoulder compound + Lateral raise + Tricep compound + Tricep iso
Pull: Vertical pull + Horizontal pull + Rear delt + Shrug + Bicep compound + Bicep iso
Legs: Quad compound + Quad iso + Hamstring compound + Hamstring iso + Glute + Calves
PPL x2/week (6 days): Monday Push, Tuesday Pull, Wednesday Legs, Thursday Push, Friday Pull, Saturday Legs
```

#### Bro Split (5-day)
```
Monday: Chest (4-5 exercises)
Tuesday: Back (4-5 exercises)
Wednesday: Shoulders + Traps (4-5 exercises)
Thursday: Arms — Biceps + Triceps (4-5 exercises each)
Friday: Legs (5-6 exercises)
```

#### Arnold Split (6-day)
```
Monday/Thursday: Chest + Back (antagonist superset friendly)
Tuesday/Friday: Shoulders + Arms
Wednesday/Saturday: Legs + Abs
```

---

## PHASE 4 — Exercise Selection Rules (Per Day Type)

### Push Day — Exercise Order & Logic

```
1. PRIMARY COMPOUND (chest-dominant, horizontal push)
   → Barbell Bench Press (intermediate/advanced, full gym)
   → Dumbbell Bench Press (beginner or home gym)
   → Machine Chest Press (beginner, equipment filter)
   Sets: 4 | Reps: 6-10 (strength) or 8-12 (hypertrophy)
   RULE: Always first. Heaviest compound when fresh.

2. SECONDARY COMPOUND (incline or shoulder-dominant push)
   → Incline Dumbbell Press (most accessible)
   → Incline Barbell Press (intermediate+)
   → Overhead Press (if shoulder-focus day or no incline)
   Sets: 3-4 | Reps: 8-12
   RULE: Second compound before isolation.

3. CHEST ISOLATION
   → Cable Fly Low-to-High (full gym)
   → Pec Deck Machine (full gym)
   → Dumbbell Fly (home gym)
   Sets: 3 | Reps: 12-15
   RULE: After compounds. Stretch-focused for hypertrophy.

4. SHOULDER ISOLATION (lateral head emphasis)
   → Dumbbell Lateral Raise (universal)
   → Cable Lateral Raise (better tension curve)
   → Machine Lateral Raise (beginner-friendly)
   Sets: 3-4 | Reps: 12-20

5. TRICEP COMPOUND OR HEAVY ISOLATION
   → Skull Crushers (intermediate+)
   → Close-Grip Bench Press (intermediate+)
   → Overhead Tricep Extension (beginner friendly)
   Sets: 3 | Reps: 8-12

6. TRICEP ISOLATION
   → Tricep Pushdown - Rope (universal cable)
   → Tricep Pushdown - Bar (universal cable)
   Sets: 2-3 | Reps: 12-15

TOTAL PUSH: 5-6 exercises, 18-24 working sets
```

### Pull Day — Exercise Order & Logic

```
1. PRIMARY VERTICAL PULL (lat-dominant)
   → Lat Pulldown Wide Grip (beginner, full gym)
   → Pull-Up / Chin-Up (intermediate+, bodyweight)
   → Assisted Pull-Up Machine (beginner with equipment)
   Sets: 4 | Reps: 6-10 (weighted) or 8-12 (bodyweight AMRAP)
   RULE: Biggest back movement first.

2. HORIZONTAL PULL COMPOUND
   → Barbell Row (intermediate+)
   → Dumbbell Row Single-Arm (universal, most popular)
   → Cable Row Seated Close Grip (universal)
   → Machine Row (beginner)
   Sets: 3-4 | Reps: 8-12

3. SECONDARY PULL (lat detail or upper back)
   → Cable Row Wide Grip (upper back emphasis)
   → Lat Pulldown Close/Neutral Grip (lat detail)
   → Chest-Supported Row (remove lower back stress)
   Sets: 3 | Reps: 10-15

4. REAR DELT / UPPER BACK
   → Face Pull (ALWAYS include - universally important, fixes posture)
   → Rear Delt Fly - Machine/Pec Deck
   → Rear Delt Fly - Dumbbell (incline prone)
   Sets: 3 | Reps: 15-20
   RULE: Always include rear delt work on pull day.

5. BICEP COMPOUND
   → Barbell Curl (mass builder, universal)
   → EZ Bar Curl (wrist-friendly alternative)
   → Dumbbell Curl Alternating (beginner, home gym)
   Sets: 3 | Reps: 8-12

6. BICEP ISOLATION / VARIATION
   → Hammer Curl (brachialis, forearm thickness)
   → Incline Dumbbell Curl (peak contraction, stretch)
   → Cable Curl (constant tension)
   → Preacher Curl (machine or EZ bar)
   Sets: 2-3 | Reps: 12-15

TOTAL PULL: 5-6 exercises, 18-24 working sets
```

### Leg Day — Exercise Order & Logic

```
1. PRIMARY QUAD-DOMINANT COMPOUND
   → Barbell Back Squat (intermediate+, full gym)
   → Goblet Squat (beginner, learning squat pattern)
   → Leg Press (beginner, everyone has access)
   → Bulgarian Split Squat (no barbell option)
   Sets: 4 | Reps: 6-10 (strength) or 8-12 (hypertrophy)
   RULE: Heaviest, most neurologically demanding movement first.

2. UNILATERAL OR SECONDARY COMPOUND
   → Bulgarian Split Squat (if squat was done first)
   → Leg Press (if squat done, add volume)
   → Hack Squat Machine (quad isolation compound)
   → Lunges Dumbbell (accessible variation)
   Sets: 3-4 | Reps: 10-12 each leg

3. HAMSTRING COMPOUND (hinge pattern)
   → Romanian Deadlift - Barbell or Dumbbell
   Sets: 3-4 | Reps: 10-12
   RULE: After quads are pre-fatigued. Don't skip — hamstring balance critical.

4. QUAD ISOLATION
   → Leg Extension Machine (universal, beginner-friendly)
   Sets: 3 | Reps: 12-15
   RULE: Always include for knee health and quad definition.

5. HAMSTRING ISOLATION
   → Lying Leg Curl Machine (most popular)
   → Seated Leg Curl Machine (better peak contraction)
   Sets: 3 | Reps: 12-15

6. GLUTE EMPHASIS (if goal = glutes/overall leg development)
   → Hip Thrust - Barbell or Machine
   → Glute Kickback Cable
   Sets: 3 | Reps: 12-15

7. CALVES
   → Standing Calf Raise Machine (gastrocnemius — heavy, lower reps)
   → Seated Calf Raise Machine (soleus — moderate, higher reps)
   Sets: 3-4 | Reps: 12-20
   RULE: Always include calves. Most skipped, most regretted.

TOTAL LEGS: 6-7 exercises, 21-28 working sets
```

---

## PHASE 5 — Sets, Reps, Rest & Volume by Goal

### Volume Landmarks (Sets Per Muscle Group Per Week — Research-Based)

| Muscle Group | Minimum Effective Volume | Maximum Adaptive Volume |
|-------------|--------------------------|------------------------|
| Chest | 10 sets | 20 sets |
| Back | 10 sets | 25 sets |
| Shoulders | 8 sets | 20 sets |
| Triceps | 6 sets | 16 sets |
| Biceps | 6 sets | 16 sets |
| Quads | 8 sets | 20 sets |
| Hamstrings | 6 sets | 16 sets |
| Glutes | 6 sets | 16 sets |
| Calves | 8 sets | 16 sets |

### Prescription by Goal

#### Build Muscle (Hypertrophy)
```
Rep Ranges: 6-12 (compounds), 10-20 (isolation)
Sets: 3-5 per exercise
Rest: 90-120s (compounds), 60-90s (isolation)
Intensity: RPE 7-9 (leave 1-3 reps in tank)
Progressive Overload: Add 2.5-5lbs when top of rep range achieved for 2 consecutive sessions
Tempo: 2-1-2 default (2s eccentric, 1s pause, 2s concentric)
```

#### Lose Fat (Fat Loss + Muscle Retention)
```
Rep Ranges: 10-15 (compounds), 15-20 (isolation)
Sets: 3-4 per exercise
Rest: 45-90s (shorter to maintain heart rate)
Intensity: RPE 7-8
Techniques: Supersets encouraged (time efficiency)
Cardio finisher: 10-15min LISS or HIIT post-weights
Progressive Overload: Maintain weight, prioritize form and volume
```

#### Strength
```
Rep Ranges: 1-6 (main lifts), 6-10 (accessories)
Sets: 4-6 (main), 3-4 (accessories)
Rest: 3-5 minutes (main), 2-3 minutes (accessories)
Intensity: RPE 8-10
Progressive Overload: Linear progression on main lifts (+5lbs/session lower, +2.5lbs/session upper)
Periodization: Week 4 = deload (reduce load 40%, maintain volume)
```

#### General Wellness
```
Rep Ranges: 10-15
Sets: 2-3
Rest: 60-90s
Intensity: RPE 5-7
Focus: Form mastery, movement quality
No advanced techniques
```

---

## PHASE 6 — Training Techniques by Experience Level

### Beginner (0-1 year) — NO Advanced Techniques
```
✅ Straight sets
✅ RPE tracking
✅ Progressive overload (add weight when rep target hit)
✅ Warmup sets (50%, 75%, work weight)
❌ Drop sets
❌ Supersets
❌ Tempo manipulation
❌ Rest-pause
❌ Giant sets
```

### Intermediate (1-3 years) — Selective Use
```
✅ All beginner techniques
✅ Antagonist supersets (chest/back, bicep/tricep, quad/hamstring) — save 15% time
✅ Drop sets (1 per session, last set of isolation exercise only)
✅ Tempo training (3-1-2 or 4-0-1 for time under tension)
✅ Myo-rep finishers (on isolation: do 15, rest 5 breaths, do 5-7, rest 5, do 5-7)
❌ Giant sets (too advanced)
❌ Cluster sets
❌ BFR training
```

### Advanced (3+ years) — Full Toolkit
```
✅ All intermediate techniques
✅ Drop sets (multiple, any exercise)
✅ Giant sets (3-4 exercises in circuit fashion, same muscle)
✅ Mechanical drop sets (change position to extend set)
✅ Rest-pause sets
✅ Pre-exhaust technique (isolation → compound same muscle)
✅ Blood flow restriction (BFR) on isolation
✅ Cluster sets (on compounds)
✅ Specialization blocks (extra volume on lagging muscle)
✅ Intra-workout nutrition timing
✅ Advanced periodization (DUP - daily undulating periodization)
```

### Technique Implementation in Program JSON
```json
{
  "technique": "superset",
  "paired_with": "exercise_id_2",
  "superset_type": "antagonist",
  "note": "Go directly from Bench Press to Cable Row with no rest. Rest 90s after both."
},
{
  "technique": "drop_set",
  "drops": 2,
  "reduction_percent": 20,
  "note": "After final set, immediately reduce weight by 20% and continue to failure. Repeat once more."
},
{
  "technique": "tempo",
  "eccentric": 3,
  "pause": 1,
  "concentric": 2,
  "note": "3 seconds down, 1 second pause at bottom, 2 seconds up."
}
```

---

## PHASE 7 — Progressive Overload Framework (12-Week Block)

### Week-by-Week Structure
```
WEEKS 1-4: Foundation Block (Accumulation)
- Sets: 3 (week 1) → 4 (week 4)
- Reps: Top of range (12 for 8-12 rep range)
- Intensity: RPE 6-7
- Goal: Learn movements, establish baselines

WEEKS 5-8: Intensification Block
- Sets: 4 stable
- Reps: Progress to lower end of range (8 for 8-12)
- Intensity: RPE 7-8
- Technique: Add 1 advanced technique per session (intermediate+)

WEEKS 9-11: Peak Block
- Sets: 4-5
- Reps: Bottom of range + progressive overload weight
- Intensity: RPE 8-9
- Technique: Maintain advanced techniques

WEEK 12: Deload
- Sets: 2-3
- Reps: Top of range
- Intensity: RPE 5-6
- NO advanced techniques
- Purpose: Recovery, supercompensation
```

### Auto-Regulation Rules
```
IF user logs 2 consecutive sessions at top of rep range → prompt to increase weight
IF user misses rep target by >20% for 2 sessions → prompt to decrease weight
IF user reports RPE consistently below 6 → auto-increase intensity next session
IF user reports RPE consistently above 9 → flag for recovery check-in
```

---

## PHASE 8 — Program JSON Structure

### Full Program JSON Schema
```json
{
  "program_meta": {
    "name": "12-Week Hypertrophy Program",
    "split": "PPL",
    "goal": "build_muscle",
    "experience_level": "intermediate",
    "days_per_week": 6,
    "session_duration_min": 60,
    "equipment": ["barbell", "dumbbell", "cable", "machine"],
    "generated_at": "2026-03-28T00:00:00Z",
    "ai_prompt_version": "v2.0"
  },
  "weekly_schedule": {
    "monday": "push",
    "tuesday": "pull",
    "wednesday": "legs",
    "thursday": "push",
    "friday": "pull",
    "saturday": "legs",
    "sunday": "rest"
  },
  "days": [
    {
      "day_type": "push",
      "label": "Push Day A",
      "exercises": [
        {
          "order": 1,
          "exercise_id": "uuid-bench-press",
          "name": "Barbell Bench Press",
          "sets": 4,
          "rep_range": "6-10",
          "rest_seconds": 120,
          "rpe_target": 8,
          "technique": null,
          "coaching_cue": "Drive your feet into the floor, squeeze shoulder blades together. Lower bar to nipple line. Full ROM.",
          "warmup_sets": [
            {"percent_of_working": 50, "reps": 10},
            {"percent_of_working": 75, "reps": 5}
          ]
        },
        {
          "order": 2,
          "exercise_id": "uuid-incline-db-press",
          "name": "Incline Dumbbell Press",
          "sets": 3,
          "rep_range": "8-12",
          "rest_seconds": 90,
          "rpe_target": 8,
          "technique": null,
          "coaching_cue": "Set bench to 30-45 degrees. Control the descent, don't let dumbbells drift too wide."
        },
        {
          "order": 3,
          "exercise_id": "uuid-cable-fly",
          "name": "Cable Fly (Low to High)",
          "sets": 3,
          "rep_range": "12-15",
          "rest_seconds": 60,
          "rpe_target": 8,
          "technique": {
            "type": "drop_set",
            "drops": 1,
            "reduction_percent": 20,
            "note": "On final set only — drop weight immediately and continue to failure."
          },
          "coaching_cue": "Slight forward lean. Bring hands together like hugging a tree. Feel the stretch at full extension."
        },
        {
          "order": 4,
          "exercise_id": "uuid-lateral-raise",
          "name": "Dumbbell Lateral Raise",
          "sets": 4,
          "rep_range": "12-20",
          "rest_seconds": 60,
          "rpe_target": 9,
          "technique": {
            "type": "myo_rep",
            "note": "After target reps, rest 5 breaths, do 5 more, rest 5 breaths, do 5 more."
          },
          "coaching_cue": "Lead with your elbows, not your wrists. Slight forward lean. Don't shrug."
        },
        {
          "order": 5,
          "exercise_id": "uuid-skull-crushers",
          "name": "Skull Crushers (EZ Bar)",
          "sets": 3,
          "rep_range": "8-12",
          "rest_seconds": 90,
          "rpe_target": 8,
          "technique": null,
          "coaching_cue": "Keep upper arms vertical and stationary. Lower to forehead level. Full extension at top."
        },
        {
          "order": 6,
          "exercise_id": "uuid-tricep-pushdown",
          "name": "Tricep Pushdown (Rope)",
          "sets": 3,
          "rep_range": "12-15",
          "rest_seconds": 60,
          "rpe_target": 8,
          "technique": null,
          "coaching_cue": "Spread rope at bottom. Elbows pinned to sides. Don't lean forward to cheat."
        }
      ]
    }
  ]
}
```

---

## PHASE 9 — AI Generation Prompt (v2.0)

### System Prompt for Workout Generation Edge Function

```
You are an expert exercise scientist and strength & conditioning coach with 15+ years of evidence-based programming experience. Your role is to generate workout programs that are:

1. SCIENTIFICALLY SOUND — based on peer-reviewed exercise science
2. PRACTICALLY ACCESSIBLE — exercises that real people in real gyms actually do
3. LOGICALLY STRUCTURED — correct exercise order, muscle group balance, technique progression
4. APPROPRIATELY MATCHED — to the user's exact experience level, equipment, and goal

CRITICAL RULES — Never Break These:
- ONLY select exercises from the provided exercise_pool JSON
- NEVER invent exercises not in the pool
- ALWAYS order exercises: compound movements before isolation
- NEVER pair two exercises that work the exact same muscle in the same way consecutively
- ALWAYS include rear delt/face pull work on push or pull days
- NEVER program advanced techniques (drop sets, supersets, rest-pause) for beginners
- ALWAYS include warm-up set guidance for compound movements
- NEVER put squats AND deadlifts heavy on the same day
- ALWAYS include calves on leg days unless session_length < 45min

SPLIT ALREADY DETERMINED: {split_type}
SCHEDULE: {weekly_schedule}

USER PROFILE:
- Goal: {goal}
- Experience: {experience_level}
- Equipment: {equipment}
- Days/Week: {days_per_week}
- Session Length: {session_length_min} minutes
- Injuries/Limitations: {injuries}
- Priority Muscles: {priority_muscles}
- Exercises to Avoid: {exercises_hate}
- Preferred Exercises: {exercises_love}

EXERCISE POOL (Curated DB — Only Use These):
{exercise_pool_json}

Generate a complete {duration_weeks}-week program following the schema provided. Return valid JSON only.
```

---

## PHASE 10 — Implementation Roadmap

### Sprint 1 (Week 1-2): Database Foundation
- [ ] Run schema migration: add missing columns to `exercises` table
- [ ] Seed 150 core exercises with all fields populated
- [ ] Add `workout_days` lookup table (maps split type to day structures)
- [ ] Add `technique_definitions` table (name, rules, experience_floor)

### Sprint 2 (Week 3): Split Selection Engine
- [ ] Build Supabase Edge Function: `select-workout-split`
- [ ] Input: onboarding fields → Output: split type + weekly schedule
- [ ] Unit test all 40+ input combinations
- [ ] Store selection rationale for AI explainability

### Sprint 3 (Week 4-5): Exercise Selection Engine
- [ ] Build Edge Function: `build-exercise-pool`
- [ ] Filters: equipment match, experience min, injury exclusions
- [ ] Ranks by: popularity_score, goal alignment, movement pattern balance
- [ ] Returns pool of ~30 valid exercises per day type

### Sprint 4 (Week 5-6): Program Generation
- [ ] Build Edge Function: `generate-workout-program`
- [ ] Calls split engine → exercise pool → Claude API with structured prompt
- [ ] Validates output JSON against schema
- [ ] Writes to `client_programs.full_program_json`
- [ ] Fallback: If Claude output fails validation, use template-based fallback

### Sprint 5 (Week 7): Onboarding Integration
- [ ] Hook Plan Generation screen to new edge function
- [ ] Replace "Cable Supine Reverse Fly" era with curated plans
- [ ] Test all 5 goals × 3 experience levels × 4 equipment options = 60 combinations
- [ ] QA: No exercise with popularity_score < 60 in generated plans

### Sprint 6 (Week 8): Progressive Overload & Deload Logic
- [ ] Auto-progression triggers (logged weights → weight increase prompts)
- [ ] Deload week auto-generation (Week 4, Week 8, Week 12)
- [ ] Exercise substitution engine using `alternative_exercise_ids`

---

## Quality Standards — Non-Negotiable

1. **No exercise with popularity_score < 60** appears in auto-generated plans
2. **Every Push day has**: chest compound + chest iso + lateral raise + rear delt + tricep (2 exercises)
3. **Every Pull day has**: vertical pull + horizontal pull + rear delt/face pull + bicep (2 exercises)
4. **Every Leg day has**: quad compound + hamstring + quad iso + hamstring iso + calves
5. **Beginners**: Max 4 exercises/day, straight sets only, compound-focused
6. **Intermediates**: 5-6 exercises/day, 1 superset or 1 drop set per session max
7. **Advanced**: 6-8 exercises/day, full technique toolkit available
8. **Movement balance check**: Every week must have roughly equal push/pull volume (within 20%)
9. **No back-to-back muscle group sessions**: Push/Pull/Rest or Push/Pull/Legs patterns only
10. **AI output always validated against JSON schema before saving** — if validation fails, use rule-based fallback template

---

## Summary of What Changes

| Before | After |
|--------|-------|
| Empty exercise table, AI invents exercises | 150+ curated exercises with popularity, difficulty, equipment fields |
| No split logic | Deterministic split selection engine based on 5 input variables |
| No exercise ordering rules | Science-based ordering: compound first, isolation last, rear delts always included |
| No experience gating | Beginners never see drop sets; advanced users get full technique toolkit |
| No volume targets | MEV/MAV landmarks per muscle group; auto-progression built in |
| No deload logic | Automatic deload every 4th week |
| Random exercise combinations | Muscle group balance validation before plan is saved |
| "Cable Supine Reverse Fly" | Popularity score filter (≥60) eliminates obscure exercises entirely |
