import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightColors, darkColors, ThemeColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, elevation } from './spacing';

export type ColorSchemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
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

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{
        colors,
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
