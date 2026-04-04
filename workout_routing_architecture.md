# MetriqFit Workout Routing & Progression Architecture

This document defines the production-ready engine for onboarding, plan assignment, and ongoing coach-like progression. We do not generate random workouts from scratch; we map users into scientifically sound **Plan Families**, apply controlled substitutions, and govern their week-over-week journey through strict adaptation rules.

---

## 1. Explicit Goal Routing Buckets

Goal buckets determine volume, intensity, and progression constraints:
* **Build Muscle (Hypertrophy):** Volume-centric, aesthetically balanced, higher proximity to failure.
* **Lose Fat:** Preserves lean mass via strength training while supporting an energy deficit. Volume is dynamically managed downward if recovery drops.
* **Gain Strength:** Heavier loads (4-6 rep ranges), high fatigue demand. Focus on absolute force production.
* **General Fitness:** Moderate volume, moderate intensity. Emphasizes basic movement pattern balance, accessibility, and general capacity.
* **Body Recomposition:** Balanced mix for newer trainees or returning lifters.
* **Athletic Fitness / Work Capacity:** Multi-planar movement, conditioning hybrids, and functional strength intervals. *(Routes to Athletic Hybrid Upper/Lower or Strength + Conditioning families).*

---

## 2. The Plan Families

The system groups workouts into mainstream, highly scalable **Plan Families**.

### Foundational Plan Families
* **Beginner Full Body** — Linear progression, tier-1 foundational lifts.
* **Beginner Machine/Dumbbell Full Body** — Low barrier to entry.
* **General Fitness Upper/Lower** — Balanced, medium-frequency, health & longevity.
* **Hypertrophy Upper/Lower** — Volume-driven aesthetics.
* **Hypertrophy Push/Pull/Legs (PPL)** — Movement-function frequency (5-6 days/week).
* **Hypertrophy Body-Part Focus (Bro Split)** — One/two muscle groups per day. *Restricted to Adv/Intermediate; beginners locked out.*
* **Strength-Biased Upper/Lower** — Geared toward absolute strength improvement.

### Fat-Loss Specific Families
* **Fat Loss Strength Full Body** — Normal rest periods, volume scaled down to preserve lean mass.
* **Fat Loss General Fitness Full Body** — Low-barrier resistance layered with light cardiovascular work.
* **Fat Loss Circuit / Conditioning (Opt-in)** — Dense circuits, lower rest times.

### Constraint-Based & Emphasis Families
* **Glute/Lower Emphasis** | **Upper Emphasis** 
* **Minimal Equipment (DB Only)** | **At-Home / Bodyweight** 

---

## 3. Updated Onboarding Inputs

1. **"How do you prefer to train?" (Training Style & Split)**
   * *Full-body sessions*, *Upper/Lower split*, *Movement-based days (Push/Pull/Legs)*, *Muscle-focused days (Body-Part/Bro Split)*, *Let the app choose.*
2. **"How comfortable are you with heavy barbells?" (Lift Comfort & Skill)**
   * *Very comfortable*, *I know the basics*, *Prefer machines and dumbbells*, *Avoid barbells entirely.*
3. **Session Environment**
   * *Commercial Gym* (Allows full substitution matrix).
   * *Apartment/Hotel Gym* (Restricts mostly to DBs/Machines).
   * *Home Gym* (May have a rack, but lacks deep machine substitutions).
   * *Bodyweight Only.*
4. **Movement Aversion & Profiling (The "Don't Give Me X" check)**
   * *Exercises I want to avoid (e.g., "I hate pull-ups").*
   * *Specific body part priorities.*

---

## 4. The 4-Layer Matching System

### Layer 1: Plan Family Selection (The Librarian)
* **Action:** Assigns the **Family**. 
* **Fallback Rule:** If constraints are messy or perfectly matched plans don't exist, route to the safest nearest-fit (e.g., General Fitness Upper/Lower), reduce specialization, and simplify to foundational patterns to preserve adherence.

### Layer 2: Exact Template Selection (The Guide)
* **Action:** Pulls the specific length/frequency version of the family.

### Layer 3: Controlled Exercise Substitution (The Mechanic)
* **Action:** Swaps unviable exercises purely from substitution replacement groups.

### Layer 4: Final Verification Check (The Validator)
* **Action:** 1. *Slot Integrity*, 2. *Movement Balance*, 3. *Fatigue & Redundancy*, 4. *Equipment Rules*, 5. *Duration Reality*.

---

## 5. Context-Aware Tiers

Tiers contextualize exercises to user experience (e.g., Machine Chest Press is Tier 1 for a beginner, but Barbell Bench is Tier 1 for an intermediate).

| Tier | Category | AI Substitution Rule |
| :--- | :--- | :--- | 
| **Tier 1** | **Foundational** | **Primary Default.** High stimulus-to-fatigue ratio, easy progression tracking. |
| **Tier 2** | **Alternatives** | **Backup Options.** Great variations for specific equipment or aversion limits. |
| **Tier 3** | **Specialty / Niche** | **Opt-in Only.** Advanced movements (Deficit Deadlifts). Allowed only if running a specialty plan. |
| **Tier 4A** | **Not For Default** | **Restricted.** Technique-sensitive (Behind-the-neck press). |
| **Tier 4B** | **Hard Banned** | **Strictly Forbidden.** Dangerous gimmick exercises. |

---

## 6. Template Construction Rules

How templates are built under the hood. 

### Sequence Examples by Template Type
* **Lower Hypertrophy:** `Primary Knee-Dominant Compound` → `Primary Hip Hinge` → `Unilateral Lower` → `Hamstring Isolation` → `Calf` → `Trunk`.
* **Upper Strength:** `Primary Horizontal Press (Heavy)` → `Primary Vertical Pull` → `Secondary Horizontal Press` → `Horizontal Pull` → `Bicep Isolation`.
* **Beginner Full Body:** `Primary Lower Compound` → `Horizontal Press` → `Horizontal Pull` → `Trunk`.
* **Fat Loss Full Body:** `Primary Lower Compound` → `Vertical Press` → `Vertical Pull` → `Metabolic Finisher`.

### Base Weekly Volume Targets & Adjustments
Volume is mathematically derived, rather than static:
* **Base Set Targets (Per Muscle / Week):** Beginners (8-10 sets), Intermediates (12-16 sets), Advanced (15-20+ sets).
* **Goal Multiplier:** Hypertrophy (1.0x), Strength (0.8x - heavier loads), Fat Loss (0.7x - recovery deficit).
* **Length Caps:** 30 min (Max 4 slots, compounds only), 45 min (Max 5-6 slots), 60+ min (6-8 slots).

---

## 7. Exercise Taxonomy Rules (Metadata)

Exercises must carry strict metadata bridging substitutions:
* **Movement Pattern:** `Horizontal Push`, `Vertical Pull`, `Knee Dominant`, `Hip Hinge`, `Core Anti-Rotation`.
* **Muscle Emphasis:** Primary, Secondary, Stabilizer mappings.
* **Equipment Type Requirement.**
* **Fatigue Cost & Technical Demand:** High, Medium, Low (replaces strict CNS labeling).
* **Joint / Injury Sensitivity Flags.** 
* **Replacement Group & Compatibility Level:** Exercises must have a `slot_role` and `replacement_group` (e.g., Barbell Bench, DB Bench, and Machine Chest Press are all inside the `Horizontal_Press_Bilateral_Primary` group. A push-up is assigned a lower compatibility match for this specific strength slot).

---

## 8. Progression & Adaptation Rules

The app must behave like an ongoing coach. Assigning the program is Day 1; managing the program over 12 weeks is the core engine.

### Progression Models by Experience & Goal
* **Beginners (Linear Progression):** 
  * The goal is simple load addition. If the user hits their rep target for all sets (e.g., 3x8 at 100lbs), the system prompts a load increase for the next session (e.g., 3x8 at 105lbs).
* **Intermediates & Hypertrophy (Double Progression):** 
  * Linear load addition fails quickly here. We use rep ranges (e.g., 3 sets of 8-12 reps). The user aims to increase *reps* until they hit the top of the range (3x12) across all sets. Only then do they increase load and drop back to the bottom of the rep range (3x8).
* **Strength Focus (Step Loading / Percentages):** 
  * Progression ignores rep maximums and relies on calculated percentages of an estimated 1RM, cycling intensity over 3-4 week waves.
* **Minimal Equipment / Bodyweight:** 
  * Load is fixed. Progression is driven by *mechanical iterations* (pauses, tempo manipulation, 1.5 reps) or volume scaling (adding reps/sets) before moving to a harder taxonomic variation (e.g., Push-up → Decline Push-up).
* **Fat Loss Phases:** 
  * The primary goal is *load maintenance* to preserve muscle. Progression is slow to stagnant. If performance drops heavily, the system reduces volume (cuts a set) *before* cutting load intensity.

### Stalls, Deloads, and Continuity
* **Stall Handling:** If a user fails to progress (misses rep targets) on a primary compound lift for **2 consecutive weeks**, the engine forces a 10% load reduction (micro-cycle reset) on that specific lift to rebuild momentum.
* **Fatigue / Systemic Deloads:** If the user logs high session-RPE or severe fatigue for 2 weeks straight, the system triggers a 1-week volume deload (cutting total tracked working sets by 30-40% while maintaining load).
* **Exercise Substitution Continuity:** If a user swaps an exercise mid-program (e.g., Barbell Bench to DB Bench), the system does not randomly guess the DB weight. It prompts the user for an RPE-based calibration set, drops the estimated equivalent load by 15% to adjust for novel coordination, and treats it as a brand new progression track.

### Plan Graduation Rules
When does a user "finish" a plan family?
* **Beginner Graduation:** A Beginner moves to an Intermediate template once they systematically stall and reset 3 times on their primary compound lifts, or they have maintained flawless adherence for 12-16 weeks. 
* **Objective Completion:** If a user was on a Recomp or Fat Loss plan and updates their weight/bodyfat to reflect goal achievement, the engine runs a Graduation prompt, allowing them to shift to a Hypertrophy or Strength maintenance family.
