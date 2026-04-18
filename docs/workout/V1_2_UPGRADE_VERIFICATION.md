# V1.2 Workout Engine Upgrade — Verification & Comparison

This document summarizes the core logic refinements applied to the MetriqFit V1.2 Workout Engine. These changes balance intensity for advanced trainees while maintaining safety and accessibility for beginners.

## 🛠 Core Heuristic Refinements (The "After")

| Goal / Context | Heuristic Change | Rationale |
| :--- | :--- | :--- |
| **Hypertrophy** | Barbell penalty reduced to **-10** (from broad deprioritization). Machine bonus increased to **+20**. | Keeps high-SFR machines as favorites but preserves Barbells as viable T1 options for advanced users. |
| **GenFitness** | Complexity penalty scaled by experience: **-50** for Beginners, **-20** for Advanced. | Hard-steers beginners to machines (safety) but allows advanced users to enjoy technical movements. |
| **Recomposition** | Balanced mapping: Strength anchors + Stability volume bias. | Bridges the gap between "Build Muscle" and "Fat Loss" without over-penalizing load. |
| **2-Day Stability** | Prioritizing compounds and "Prime" slots in limited frequency templates. | Ensures movement pattern coverage even when sessions are short or infrequent. |

---

## 📊 Before & After Comparison

We simulated the hydration scores for 4 representative personas across a sample of common exercises.

### Persona 1: Beginner General Fitness (2-Day Full-Body)
*Focus: Safety, accessibility, and form mastery.*

| Exercise | V1.1 (Before) | V1.2 (After) | Impact |
| :--- | :---: | :---: | :--- |
| **Barbell Squat** | 50 (Neutral) | **0** (Penalty) | **SUCCESS**: Hard-steers beginner to safer machine/DB variants. |
| **Leg Press** | 50 (Neutral) | **90** (Bonus) | **SUCCESS**: High-compatibility machine becomes the top pick. |

### Persona 2: Advanced Hypertrophy (5-Day PPL)
*Focus: Stimulus-to-fatigue ratio (SFR) and volume quality.*

| Exercise | V1.1 (Before) | V1.2 (After) | Impact |
| :--- | :---: | :---: | :--- |
| **Barbell Bench Press**| 65 (T1 Bonus) | **40** (Nudge) | **SUCCESS**: Barbells are viable but Machine Chest Press (+70) is favored. |
| **Machine Chest Press**| 50 (Neutral) | **70** (Bonus) | **SUCCESS**: Favoring stable machines for better mind-muscle connection. |

### Persona 3: Intermediate Recomposition (Upper/Lower)
*Focus: Muscle retention + steady performance.*

| Exercise | V1.1 (Before) | V1.2 (After) | Impact |
| :--- | :---: | :---: | :--- |
| **Barbell RDL** | 50 (Neutral) | **50** (Neutral) | **STABLE**: Keeps strength anchors while accessory work shifts. |
| **Seated Leg Curl** | 50 (Neutral) | **65** (Machine) | **SUCCESS**: Shifts accessory volume toward stable machine options. |

---

## ✅ Implementation Status (V1.2)

- [x] **2-Day GenFitness Support**: Created A/B templates with compound priority (W1.2).
- [x] **Recomposition Mediator**: Implemented 2.5-3.0 min rests for compounds, 60s for isolations.
- [x] **Experience-Scaled Complexity**: Fixed beginner/advanced complexity divergence.
- [x] **Hypertrophy SFR Optimization**: Favoring machines/cables (T2/T3) without killing Barbells (T1).
- [x] **Architect Loop Fix**: Fixed fatal hydration error in Unilateral groups.
- [x] **Slot-Aware Tweaks**: Volume landmarking (W1.2 landmarks) in isolation slots.

---

> [!TIP]
> **Next Steps**: Focus on "Week 1.3" which introduces the **User Swap Engine**, allowing manual overrides that the engine learns from over time.
