# MetriqFit Open Design Mobile Audit

Date: 2026-05-08

Applied skills:
- `mobile-app`
- `mobile-onboarding`
- `gamified-app`
- `critique`

Scope:
- Expo Router mobile app screens
- Canonical theme tokens in `lib/theme/metriqfit_theme_v1.ts`
- Home dashboard, onboarding identity flow, achievements/gamification surfaces

## Verdict

MetriqFit has a strong product direction: dark premium fitness operating system, dense daily dashboard, AI-guided training/nutrition, and gamified progression. The main design risk is not a missing visual identity; it is token drift. Several screens are already styling outside the canonical theme, and some gamification surfaces referenced tokens that did not exist in the theme.

## Scores

| Dimension | Score | Evidence |
| --- | ---: | --- |
| Philosophy consistency | 7/10 | The app consistently aims for dark, premium, glassy, neon-cyan fitness UI. Home uses dashboard density and operational cards well. Onboarding and achievements partially drift through local constants and hardcoded rarity palettes. |
| Visual hierarchy | 7/10 | Home has a clear operational hierarchy: focus strip, workout, meals, actions, week context. Gamification surfaces use strong numbers and badges, but 3-column achievement grids risk becoming visually noisy on narrow screens. |
| Detail execution | 6/10 | Theme tokens are mature, but several screens bypass them. Before this pass, `surfaceSubtle`, `surfaceActive`, `primaryActive`, `familyBold`, `xxl`, and `full` were used by screens without existing in the theme. |
| Functionality | 7/10 | Daily dashboard and onboarding flows are functional and route-driven. The design needs stronger empty/error/loading state consistency across nutrition tools, progress photos, and AI coach actions. |
| Innovation | 7/10 | The AI coach plus workout/nutrition/gamification loop gives the product a memorable system. The visual language should lean into "mission control for fitness" rather than generic glass cards. |

## Keep

- Keep the dark-first premium operating-system direction from `metriqfit_theme_v1.ts`.
- Keep cyan as the primary action and progress accent; it is recognizable and works with the brand.
- Keep Home as a dense working dashboard, not a marketing-like hero screen.
- Keep gamification visible, but tied to completed real activity rather than decorative points.
- Keep Unbounded for decisive headings and Sora for readable body text.

## Fix

1. Replace hardcoded screen colors with theme tokens, starting with onboarding screens that still use literal cyan, white, and rgba values.
2. Normalize gamification rarity colors into theme tokens or a dedicated gamification token group.
3. Reduce nested glass/card patterns where cards sit inside card-like containers.
4. Standardize loading, empty, and permission-denied states for camera, food search, progress photos, AI coach, and subscriptions.
5. Run a mobile screenshot review of Home, Nutrition, AI Coach, Progress Photos, Achievements, and Onboarding on small iPhone and Android widths before release.

## Quick Wins

- Use `c.surfaceSubtle`, `c.surfaceActive`, and `c.primaryActive` instead of ad hoc translucent surfaces.
- Use `ty.body.familyBold` as an alias to the loaded semibold Sora face; avoid unregistered `Sora_700Bold` unless the font is actually loaded.
- Use `r.full` for circular icon buttons and pills instead of one-off `999` values.
- Keep numeric stats in the mono face when they are telemetry, XP, calories, macros, or progress values.
- Add a design lint follow-up that flags raw hex colors in `app/` and `components/`, excluding the theme file and explicit chart palettes.

## Open Design Direction

Product thesis: "A fitness mission-control app that turns daily training, nutrition, recovery, and AI guidance into a clear operating rhythm."

Screen model:
- Home: command center, not a feed.
- Workout: execution cockpit with one clear next action.
- Nutrition: timeline plus fast capture tools.
- Progress: evidence board for body, strength, consistency, and goals.
- AI Coach: action review layer, not a free-form chatbot alone.
- Gamification: achievement ledger and momentum engine, not a separate game.

Design constraints:
- One dominant accent per screen.
- Maximum one primary CTA per viewport.
- Cards should be individual repeated items or functional panels, not nested decorative containers.
- No new colors outside theme tokens without adding them to the theme first.
- No new font family names unless loaded in `app/_layout.tsx`.
