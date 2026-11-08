import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useColorScheme, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, elevation } from './spacing';

export type ColorSchemeType = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  elevation: typeof elevation;
  isDark: boolean;
  colorSchemeMode: ColorSchemeType;
  setColorSchemeMode: (mode: ColorSchemeType) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = '@app_theme_preference';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [colorSchemeMode, setColorSchemeModeState] = useState<ColorSchemeType>('system');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setColorSchemeModeState(saved);
        }
      } catch {
        // Fallback to default
      }
    })();
  }, []);

  const setColorSchemeMode = async (mode: ColorSchemeType) => {
    setColorSchemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Ignore
    }
  };

  const isDark =
    colorSchemeMode === 'dark' ||
    (colorSchemeMode === 'system' && systemScheme === 'dark');

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark';
    setColorSchemeMode(nextMode);
  };

  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        colors: currentTheme,
        typography,
        spacing,
        borderRadius,
        elevation,
        isDark,
        colorSchemeMode,
        setColorSchemeMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

/**
 * Utility hook to generate memoized StyleSheet styles based on the active theme
 */
export function useThemedStyles<T extends Record<string, any>>(
  styleCreator: (theme: Theme) => T
): T {
  const { theme } = useTheme();
  return useMemo(() => StyleSheet.create(styleCreator(theme)), [theme, styleCreator]);
}
