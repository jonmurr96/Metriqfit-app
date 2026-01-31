# MetriqFit Design System — "Neon Void Mastery"

> **Design Philosophy**: A retro-futuristic aesthetic where vibrant neon light emerges from infinite darkness. Every element appears meticulously crafted, as if labored over with painstaking care by someone at the absolute top of their field.

---

## 1. Visual Theme & Atmosphere

**The Void Awakens** — MetriqFit's visual language draws from the intersection of cyberpunk energy and premium fitness culture. The interface exists in a state of controlled darkness, punctuated by electric neon accents that pulse with life.

The mood is **atmospheric, premium, and alive**. Imagine a high-end fitness studio at midnight, illuminated only by carefully placed accent lights. Every surface absorbs light, creating a sense of infinite depth. This isn't minimal emptiness — it's purposeful void that makes every glowing element feel intentional and precious.

Craftsmanship is paramount. Each gradient, glow, and shadow appears hand-calibrated. The result must feel like an artifact that took countless hours to perfect.

---

## 2. Color Palette & Roles

### Primary Surfaces
| Name | Hex | Role |
|------|-----|------|
| **Void Black** | `#050510` | Primary background — the infinite canvas |
| **Midnight Navy** | `#0A1128` | Elevated surfaces, glass card foundations |
| **Deep Ocean** | `#152040` | Secondary panels, hover states |
| **Steel Dusk** | `#1E3060` | Tertiary elevation, borders on active |

### Neon Accent System
| Name | Hex | Role |
|------|-----|------|
| **Electric Cyan** | `#22D3EE` | Primary accent — CTAs, active states, glows |
| **Cyan Pressed** | `#0891B2` | Pressed/active state for primary |
| **Digital Blue** | `#3B82F6` | Secondary accent — charts, links |
| **Ultraviolet** | `#8B5CF6` | Tertiary accent — special highlights |

### Macro Nutrition Colors
| Name | Hex | Role |
|------|-----|------|
| **Protein Blue** | `#3B82F6` | Protein indicators |
| **Carb Blaze** | `#F97316` | Carbohydrate indicators |
| **Fat Violet** | `#A855F7` | Fat indicators |

### Text Hierarchy
| Name | Hex | Role |
|------|-----|------|
| **Pure White** | `#FFFFFF` | Headlines, key metrics |
| **Silver Mist** | `#94A3B8` | Body text, labels |
| **Fog Gray** | `#64748B` | Placeholder, disabled |

---

## 3. Typography Rules

### Font Families
- **Headlines**: Unbounded (700 Bold) — Futuristic, geometric, commanding
- **Body**: Sora (400/500/600) — Humanist sans with tech precision
- **Numbers/Data**: JetBrains Mono — Clinical precision for metrics

### Type Character
Headlines demand attention with tight letter-spacing (−0.3px) and bold weight. Body text maintains readability with generous line-height (1.35×). Data displays in monospace for scanability and scientific credibility.

---

## 4. Component Stylings

### Buttons
- **Primary**: Gradient background (Cyan→Blue→Violet), 52px height, generously rounded corners (16px). Bathed in a soft cyan glow (shadow radius 35px, 40% opacity) that pulses with premium energy.
- **Secondary**: Surface background with subtle border, no glow. Clean and quiet.
- **Ghost**: Transparent with cyan text on hover.

### Cards/Containers
- **Glass Cards**: Semi-transparent Midnight Navy (`rgba(10, 17, 40, 0.7)`) with backdrop blur (16px). Single-pixel border in whisper-white (`rgba(255,255,255,0.08)`). When active, border glows cyan.
- **Corner Roundness**: Generously curved (24px) for cards, moderately curved (16px) for buttons.
- **Shadow Depth**: Soft black shadows (55% opacity, 30px radius) create floating effect.

### Inputs/Forms
- **Height**: 52px for comfortable touch targets
- **Background**: Midnight Navy with single-pixel border
- **Focus State**: Border transforms to glowing cyan aura

### Chips/Pills
- **Pill-shaped** (rounded-full) with surface background
- **Icon badges** have subtle cyan glow (4px radius, 30% opacity)

---

## 5. Layout Principles

**Breathing Room**: Generous padding (16-24px) creates premium feel. Content never crowds edges.

**Vertical Rhythm**: Consistent spacing scale (6→10→14→18→24→32px) maintains visual harmony.

**Animation Philosophy**: Elements enter with spring physics (damping 15, stiffness 100-180). Staggered delays (50-80ms) create choreographed reveals. Motion feels organic, never robotic.

**Glow Effects**: Neon glows use multiple shadow layers for depth:
```
0 0 20px rgba(34,211,238,0.40),
0 0 40px rgba(34,211,238,0.20),
0 0 60px rgba(34,211,238,0.10)
```

---

## 6. Iconography

**Library**: Ionicons (Outline variant for inactive, Filled for active)

| Concept | Icon Name |
|---------|-----------|
| Water/Hydration | `water` |
| Steps/Walking | `walk` |
| Exercise/Gym | `fitness` |
| Weight/Scale | `scale` |
| Food/Nutrition | `nutrition` or `fast-food` |

---

## 7. Motion & Micro-Interactions

| Interaction | Duration | Feel |
|-------------|----------|------|
| Button press | 100ms | Scale 0.96, spring return |
| Card entry | 400ms | Fade + slide + scale, staggered |
| Glow pulse | 600ms | Opacity oscillation |
| Tab switch | 200ms | Underline slide, content fade |

---

> **Remember**: Every pixel must feel intentional. This is the product of a master craftsman, not generated content. The design should evoke the feeling of a premium fitness brand — exclusive, powerful, and alive.
