/**
 * MetriqFit Theme v1 (Dark-first) — derived from your logo (neon aqua → sky → indigo on deep ink)
 *
 * Usage (Expo Web / React Native Web):
 *   import { metriqfitTheme as t } from "./theme/metriqfit_theme_v1";
 *
 * Fonts (Option B):
 *   Headings: Unbounded
 *   Body: Sora
 *   Numbers/Code: JetBrains Mono
 *
 * NOTE: The font family names below match Expo Google Fonts naming. If you use a different
 * font loader, update the `type.*` family strings accordingly.
 */

export type Hex = `#${string}`;

export const metriqfitTheme = {
  name: "MetriqFit",
  mode: "dark" as const,

  // --- Color Tokens (Neon-Glow Aesthetic) ---
  colors: {
    // Base - Deeper ink backgrounds per design.md
    bg: "#050510" as Hex,        // deep void black
    surface: "#0A1128" as Hex,   // dark navy surface
    surface2: "#152040" as Hex,  // secondary surfaces
    surface3: "#1E3060" as Hex,  // hover/tertiary states
    surfaceSubtle: "rgba(255, 255, 255, 0.06)",
    surfaceActive: "rgba(34, 211, 238, 0.12)",

    // Text - High Contrast Premium
    text: "#FFFFFF" as Hex,
    textMuted: "#A1A1AA" as Hex,   // Zinc-400
    textSubtle: "#71717A" as Hex,  // Zinc-500

    // Brand accents - Vibrant neon glow per design.md
    primary: "#22D3EE" as Hex,   // vibrant cyan-400 (main accent)
    primaryDark: "#0891B2" as Hex, // cyan-600 (pressed state)
    primaryActive: "#0891B2" as Hex,
    accent: "#22D3EE" as Hex,    // blue-500 (secondary) -> Cyan to match primary
    accent2: "#22D3EE" as Hex,   // violet-500 (tertiary) -> Cyan to match primary

    // Supporting
    border: "#27272A" as Hex,
    borderStrong: "rgba(255, 255, 255, 0.2)",

    success: "#2EE59D" as Hex,     // Neon Green
    warning: "#EAB308" as Hex,     // Yellow-500
    danger: "#EF4444" as Hex,      // Red-500
    error: "#EF4444" as Hex,

    // For charts / rings
    chart: {
      c1: "#22D3EE" as Hex, // Teal
      c2: "#22D3EE" as Hex, // Cyan
      c3: "#22D3EE" as Hex, // Cyan
      c4: "#EC4899" as Hex, // Pink
      c5: "#F97316" as Hex, // Orange
    },

    // Meal timeline colors
    meals: {
      breakfast: "#F97316" as Hex, // Orange
      lunch: "#22D3EE" as Hex,     // Cyan (matching primary)
      dinner: "#A855F7" as Hex,    // Purple
      snack: "#71717A" as Hex,     // Zinc-500 (subtle)
    },

    // Macro nutrient colors (Neon/Vibrant)
    macros: {
      protein: "#22D3EE" as Hex,      // Cyan (was Blue)
      proteinDark: "#0891B2" as Hex,  // Cyan dark
      carbs: "#F97316" as Hex,        // Orange
      carbsDark: "#C2410C" as Hex,
      fat: "#A855F7" as Hex,          // Purple
      fatDark: "#7E22CE" as Hex,
    },

    // Opacity variants for badges and backgrounds
    opacity: {
      primaryLight: "rgba(34, 211, 238, 0.15)",
      primaryMedium: "rgba(34, 211, 238, 0.25)",
      successLight: "rgba(46, 229, 157, 0.15)",
      successMedium: "rgba(46, 229, 157, 0.25)",
      warningLight: "rgba(234, 179, 8, 0.15)",
      warningMedium: "rgba(234, 179, 8, 0.25)",
      warningBorder: "rgba(234, 179, 8, 0.40)",
      dangerLight: "rgba(239, 68, 68, 0.15)",
      accentLight: "rgba(59, 130, 246, 0.20)",
    },
  },

  // --- Gradient presets ---
  gradients: {
    // Primary CTA / progress ring (Cyan -> Cyan Dark -> Teal)
    brand: ["#22D3EE", "#06B6D4", "#22D3EE"] as Hex[],

    // Subtle panel glow (Deep)
    glowOverlayCSS:
      "radial-gradient(60% 50% at 20% 10%, rgba(34,211,238,.15), transparent 60%)," +
      "radial-gradient(60% 50% at 80% 30%, rgba(6,182,212,.15), transparent 65%)," +
      "linear-gradient(180deg, #050505, #0A0A0A)",

    // Premium shimmer
    shimmer: ["#22D3EE", "#22D3EE", "#0891B2", "#22D3EE", "#22D3EE"] as Hex[],

    // Animated background (Deep Void)
    animatedBg: ["#050505", "#0F172A", "#1e293b", "#0F172A", "#050505"] as Hex[],

    onboardingTitle: ["#22d3ee", "#22d3ee"] as Hex[],
    purpleBlue: ["#22d3ee", "#8b5cf6"] as Hex[],
  },

  // --- Onboarding Tokens (DEPRECATED - Use Main Tokens) ---
  // Keeping for backward compatibility during refactor
  onboarding: {
    bg: "#050505" as Hex,
    surface: "#121212" as Hex,
    surfaceLight: "#1a1a1a" as Hex,
    surfaceInput: "#0e0e10" as Hex,
    // ... (rest kept for safety until full transition)
    border: "#27272a" as Hex,
    borderLight: "rgba(255, 255, 255, 0.05)",
    borderMedium: "rgba(255, 255, 255, 0.10)",
    borderStrong: "rgba(255, 255, 255, 0.20)",
    progressGlow: "0 0 12px rgba(34, 211, 238, 0.6)",
    primaryGlow: "0 0 20px rgba(6, 182, 212, 0.4)",
    buttonGlow: "0 0 25px rgba(34, 211, 238, 0.4)",
    iconColors: {
      cyan: "#06b6d4" as Hex,
      teal: "#22d3ee" as Hex,
      green: "#22c55e" as Hex,
      yellow: "#eab308" as Hex,
      orange: "#f97316" as Hex,
      red: "#ef4444" as Hex,
      purple: "#a855f7" as Hex,
      blue: "#3b82f6" as Hex,
      pink: "#ec4899" as Hex,
    },
    cardSelected: { bg: "rgba(6, 182, 212, 0.05)", border: "#22d3ee" as Hex },
    buttonPrimary: "#22d3ee" as Hex,
    buttonPrimaryGlow: "0 0 20px rgba(34, 211, 238, 0.3)",
    buttonText: "#000000" as Hex,
    text: "#ffffff" as Hex,
    textMuted: "#a1a1aa" as Hex,
    textSubtle: "#71717a" as Hex,
  },

  // --- Glassmorphism tokens (Deep Dark Premium) ---
  glass: {
    // Background with transparency (Stealth Mode)
    background: "rgba(18, 18, 18, 0.65)",     // Zinc-900 @ 65%
    backgroundLight: "rgba(39, 39, 42, 0.45)", // Zinc-800 @ 45%
    backgroundDark: "rgba(5, 5, 5, 0.85)",     // Deepest Black @ 85%

    // Blur intensity
    blur: {
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
    },

    // Border for glass cards (Subtle White/Zinc)
    border: "rgba(255, 255, 255, 0.08)",
    borderGlow: "rgba(34, 211, 238, 0.3)", // Teal glow on active

    // Inner shadow for depth
    innerShadow: "inset 0 1px 1px rgba(255,255,255,0.05)",
  },

  // --- Animation tokens (NEW) ---
  animation: {
    // Timing
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
      verySlow: 1000,
    },

    // Spring configs for moti/reanimated
    spring: {
      gentle: { damping: 15, stiffness: 100 },
      bouncy: { damping: 10, stiffness: 180 },
      stiff: { damping: 20, stiffness: 300 },
    },

    // Easing curves (for CSS)
    easing: {
      easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
      easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    },
  },

  // --- Typography (Option B) ---
  type: {
    // Expo Google Fonts naming:
    // Unbounded: @expo-google-fonts/unbounded
    // Sora: @expo-google-fonts/sora
    // JetBrains Mono: @expo-google-fonts/jetbrains-mono
    heading: {
      family: "Unbounded_700Bold",
      familySemibold: "Unbounded_600SemiBold",
      familyRegular: "Unbounded_500Medium",
      letterSpacing: -0.3,
    },
    body: {
      family: "Sora_400Regular",
      familyMedium: "Sora_500Medium",
      familySemibold: "Sora_600SemiBold",
      familyBold: "Sora_600SemiBold",
      lineHeightMultiplier: 1.35,
    },
    mono: {
      family: "JetBrainsMono_500Medium",
      familyRegular: "JetBrainsMono_400Regular",
      letterSpacing: 0.2,
    },

    // Standardized sizing scale (use everywhere for consistency)
    sizes: {
      xs: 12,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 20,
      xxl: 32,
      h3: 24,
      h2: 28,
      h1: 34,
    },
  },

  // --- Layout tokens ---
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    pill: 999,
    full: 999,
  },

  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    xxl: 32,
  },

  auth: {
    maxWidth: 460,
    panelOpacity: "D6",
    panelBorderOpacity: "33",
    inputBorderOpacity: "44",
    dividerOpacity: "33",
  },

  // --- Shadows (Unified Premium Glows) ---
  shadow: {
    soft: {
      shadowColor: "#000000",
      shadowOpacity: 0.55,
      shadowRadius: 30,
      shadowOffset: { width: 0, height: 18 },
      elevation: 18,
    },
    // The Standard "Metriq Glow" (Teal)
    glow: {
      shadowColor: "#22D3EE", // Teal-400
      shadowOpacity: 0.25,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 0 }, // Center glow
      elevation: 12,
    },
    // Stronger Premium Glow (for Primary Buttons/Cards)
    premium: {
      shadowColor: "#22D3EE",
      shadowOpacity: 0.40,
      shadowRadius: 35,
      shadowOffset: { width: 0, height: 0 },
      elevation: 24,
    },
    // Subtle surface separation
    subtle: {
      shadowColor: "#000000",
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
  },

  // --- Component defaults (helps eliminate random one-offs) ---
  components: {
    button: {
      height: 52,
      radius: 16,
      // Use gradient brand on primary CTA; use surface+border on secondary
      primaryTextColor: "#03060D" as Hex,
    },
    card: {
      radius: 24,
      padding: 18,
      borderWidth: 1,
    },
    input: {
      height: 52,
      radius: 16,
      borderWidth: 1,
    },
  },

  // --- Optional helper: derived "state" colors for UI elements ---
  state: {
    hover: "rgba(136,230,234,0.08)",
    pressed: "rgba(136,230,234,0.12)",
    focusRing: "rgba(136,230,234,0.28)",
  },
};

export type MetriqfitTheme = typeof metriqfitTheme;

export function createMetriqfitTheme(options?: {
  highContrast?: boolean;
  reduceMotion?: boolean;
}): MetriqfitTheme {
  const highContrast = Boolean(options?.highContrast);
  const reduceMotion = Boolean(options?.reduceMotion);

  return {
    ...metriqfitTheme,
    colors: {
      ...metriqfitTheme.colors,
      textMuted: highContrast ? "#D4D4D8" : metriqfitTheme.colors.textMuted,
      textSubtle: highContrast ? "#A1A1AA" : metriqfitTheme.colors.textSubtle,
      border: highContrast ? "#52525B" : metriqfitTheme.colors.border,
      borderStrong: highContrast ? "rgba(255, 255, 255, 0.35)" : metriqfitTheme.colors.borderStrong,
      opacity: {
        ...metriqfitTheme.colors.opacity,
        primaryMedium: highContrast
          ? "rgba(34, 211, 238, 0.4)"
          : metriqfitTheme.colors.opacity.primaryMedium,
      },
    },
    animation: reduceMotion
      ? {
          ...metriqfitTheme.animation,
          duration: {
            fast: 0,
            normal: 0,
            slow: 0,
            verySlow: 0,
          },
        }
      : metriqfitTheme.animation,
  };
}

/**
 * Utility: convert a hex color to rgba string.
 * Works for both #RRGGBB and #RGB.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
