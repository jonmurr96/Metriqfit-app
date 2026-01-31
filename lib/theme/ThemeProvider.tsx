import React, { createContext, useContext } from 'react';
import { metriqfitTheme, type MetriqfitTheme } from './metriqfit_theme_v1';

const ThemeContext = createContext<MetriqfitTheme>(metriqfitTheme);

export function ThemeProvider({
  value = metriqfitTheme,
  children,
}: {
  value?: MetriqfitTheme;
  children: React.ReactNode;
}) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Shorthand hook for all theme tokens
export function useTokens() {
  const theme = useTheme();
  return {
    c: theme.colors,
    ty: theme.type,
    s: theme.spacing,
    r: theme.radius,
    shadow: theme.shadow,
    glass: theme.glass,
    gradients: theme.gradients,
    components: theme.components,
    animation: theme.animation,
    state: theme.state,
    theme,
  };
}
