export const palette = {
  primary: '#4F46E5', // Indigo
  primaryLight: '#6366F1',
  primaryDark: '#4338CA',
  primaryGradient: ['#4F46E5', '#6366F1'] as const,
  
  secondary: '#0EA5E9', // Sky
  secondaryLight: '#38BDF8',
  secondaryDark: '#0284C7',

  success: '#10B981', // Emerald
  successLight: '#34D399',
  successBackground: 'rgba(16, 185, 129, 0.12)',

  warning: '#F59E0B', // Amber
  warningLight: '#FBBF24',
  warningBackground: 'rgba(245, 158, 11, 0.12)',

  danger: '#EF4444', // Red
  dangerLight: '#F87171',
  dangerBackground: 'rgba(239, 68, 68, 0.12)',

  info: '#3B82F6',
  infoBackground: 'rgba(59, 130, 246, 0.12)',

  // Leave Type Specific Colors
  leaveTypes: {
    annual: {
      color: '#4F46E5',
      lightBg: 'rgba(79, 70, 229, 0.12)',
      label: 'Annual Leave',
    },
    sick: {
      color: '#EF4444',
      lightBg: 'rgba(239, 68, 68, 0.12)',
      label: 'Sick Leave',
    },
    casual: {
      color: '#0EA5E9',
      lightBg: 'rgba(14, 165, 233, 0.12)',
      label: 'Casual Leave',
    },
    unpaid: {
      color: '#8B5CF6',
      lightBg: 'rgba(139, 92, 246, 0.12)',
      label: 'Unpaid Leave',
    },
  } as Record<string, { color: string; lightBg: string; label: string }>,
};

export const lightColors = {
  isDark: false,
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceSubtle: '#F1F5F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  divider: '#E2E8F0',

  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  textInverse: '#FFFFFF',

  primary: palette.primary,
  primaryLight: palette.primaryLight,
  secondary: palette.secondary,
  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,
  info: palette.info,

  successBg: palette.successBackground,
  warningBg: palette.warningBackground,
  dangerBg: palette.dangerBackground,
  infoBg: palette.infoBackground,

  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputFocusBorder: palette.primary,

  tabBarBg: 'rgba(255, 255, 255, 0.94)',
  tabBarBorder: '#E2E8F0',
  tabBarActive: palette.primary,
  tabBarInactive: '#94A3B8',

  shadowColor: '#0F172A',
  skeletonBg: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',
};

export const darkColors = {
  isDark: true,
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  surfaceSubtle: '#1E293B',
  card: '#1E293B',
  border: '#334155',
  borderSubtle: '#1E293B',
  divider: '#334155',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',

  primary: palette.primaryLight,
  primaryLight: '#818CF8',
  secondary: palette.secondaryLight,
  success: palette.successLight,
  warning: palette.warningLight,
  danger: palette.dangerLight,
  info: '#60A5FA',

  successBg: 'rgba(16, 185, 129, 0.2)',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  dangerBg: 'rgba(239, 68, 68, 0.2)',
  infoBg: 'rgba(59, 130, 246, 0.2)',

  inputBg: '#1E293B',
  inputBorder: '#334155',
  inputFocusBorder: palette.primaryLight,

  tabBarBg: 'rgba(15, 23, 42, 0.94)',
  tabBarBorder: '#334155',
  tabBarActive: palette.primaryLight,
  tabBarInactive: '#64748B',

  shadowColor: '#000000',
  skeletonBg: '#334155',
  skeletonHighlight: '#475569',
};

export type ThemeColors = typeof lightColors;
