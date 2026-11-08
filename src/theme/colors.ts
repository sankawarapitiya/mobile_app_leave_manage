/**
 * Enterprise Design Token System & WCAG 2.1 AA Palette
 * Employee Leave Management & Office Operations System
 */

export const palette = {
  // Executive Cobalt Primary
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  primaryDark: '#1E40AF',
  primaryGradient: ['#1D4ED8', '#3B82F6'] as const,

  // Technical Sky Secondary
  secondary: '#0369A1',
  secondaryLight: '#38BDF8',
  secondaryDark: '#075985',

  // Status Standards
  success: '#047857', // Emerald
  successLight: '#34D399',
  successBackground: '#ECFDF5',

  warning: '#B45309', // Amber
  warningLight: '#FBBF24',
  warningBackground: '#FFFBEB',

  danger: '#BE123C', // Rose / Red
  dangerLight: '#F87171',
  dangerBackground: '#FFF1F2',

  info: '#1D4ED8',
  infoBackground: '#EFF6FF',

  // Leave Type Specific Categorization (Light & Dark calibrated)
  leaveTypes: {
    annual: {
      color: '#1D4ED8',
      lightBg: '#EFF6FF',
      darkColor: '#93C5FD',
      darkBg: '#172554',
      label: 'Annual Leave',
    },
    sick: {
      color: '#BE123C',
      lightBg: '#FFF1F2',
      darkColor: '#FCA5A5',
      darkBg: '#4C0519',
      label: 'Sick Leave',
    },
    casual: {
      color: '#0369A1',
      lightBg: '#F0F9FF',
      darkColor: '#7DD3FC',
      darkBg: '#082F49',
      label: 'Casual Leave',
    },
    unpaid: {
      color: '#475569',
      lightBg: '#F1F5F9',
      darkColor: '#E2E8F0',
      darkBg: '#334155',
      label: 'Unpaid Leave',
    },
    duty: {
      color: '#6D28D9',
      lightBg: '#F5F3FF',
      darkColor: '#C4B5FD',
      darkBg: '#2E1065',
      label: 'Official Duty',
    },
  } as Record<
    string,
    {
      color: string;
      lightBg: string;
      darkColor?: string;
      darkBg?: string;
      label: string;
    }
  >,
};

/**
 * Enterprise Light Theme Tokens
 * Strict 60-30-10 distribution; High-contrast text (>4.5:1 WCAG AA)
 */
export const lightTheme = {
  isDark: false,

  // 1. Surface Hierarchy
  surfaceCanvas: '#F8FAFC', // Slate 50 base canvas (60% volume)
  surfaceCard: '#FFFFFF', // White card surface (30% volume)
  surfaceElevated: '#FFFFFF', // Elevated modals & sheets
  surfaceSubtle: '#F1F5F9', // Slate 100 subtle fills, counters, chips
  surfaceOverlay: 'rgba(15, 23, 42, 0.5)', // Modal backdrop

  // 2. Hairlines & Borders
  borderSubtle: '#E2E8F0', // Slate 200 hairline borders
  borderStrong: '#CBD5E1', // Slate 300 active input border
  borderFocus: '#1D4ED8', // Executive Cobalt 2px focus ring

  // 3. High-Contrast Typography vs Card (#FFFFFF)
  textPrimary: '#0F172A', // Slate 900 (17.8:1 contrast - AAA)
  textSecondary: '#475569', // Slate 600 (7.6:1 contrast - AA)
  textTertiary: '#64748B', // Slate 500 (4.8:1 contrast - AA)
  textInverse: '#FFFFFF', // Pure white on primary actions (6.7:1)
  textDisabled: '#94A3B8', // Slate 400

  // 4. Brand & Actions (10% Focus Volume)
  brandPrimary: '#1D4ED8', // Executive Cobalt (6.7:1 contrast)
  brandPrimaryLight: '#3B82F6',
  brandPrimaryDark: '#1E40AF',
  brandPressed: '#1E40AF', // Active pressed state
  actionSecondary: '#334155', // Slate 700 neutral secondary action
  actionSecondaryPressed: '#1E293B',
  actionDisabled: '#94A3B8',
  actionDisabledBg: '#E2E8F0',

  // 5. Workflow Statuses (Text, Subtle Fill, Hairline Border)
  statusApprovedText: '#047857', // Emerald 700 (5.2:1 vs fill, 5.5:1 vs Card)
  statusApprovedBg: '#ECFDF5', // Emerald 50
  statusApprovedBorder: '#A7F3D0', // Emerald 200

  statusPendingText: '#B45309', // Amber 700 (4.8:1 vs fill, 5.0:1 vs Card)
  statusPendingBg: '#FFFBEB', // Amber 50
  statusPendingBorder: '#FDE68A', // Amber 200

  statusRejectedText: '#BE123C', // Rose 700 (5.7:1 vs fill, 6.3:1 vs Card)
  statusRejectedBg: '#FFF1F2', // Rose 50
  statusRejectedBorder: '#FECDD3', // Rose 200

  statusDraftText: '#475569', // Slate 600 (6.9:1 vs fill, 7.6:1 vs Card)
  statusDraftBg: '#F1F5F9', // Slate 100
  statusDraftBorder: '#CBD5E1', // Slate 300

  // 6. Leave Category Indicators
  leaveAnnualText: '#1D4ED8', // Cobalt
  leaveAnnualBg: '#EFF6FF', // Blue 50
  leaveAnnualBorder: '#BFDBFE', // Blue 200

  leaveMedicalText: '#BE123C', // Crimson
  leaveMedicalBg: '#FFF1F2', // Rose 50
  leaveMedicalBorder: '#FECDD3', // Rose 200

  leaveCasualText: '#0369A1', // Sky Teal
  leaveCasualBg: '#F0F9FF', // Sky 50
  leaveCasualBorder: '#BAE6FD', // Sky 200

  leaveDutyText: '#6D28D9', // Violet
  leaveDutyBg: '#F5F3FF', // Violet 50
  leaveDutyBorder: '#DDD6FE', // Violet 200

  // 7. Navigation & Chrome
  tabBarBg: 'rgba(255, 255, 255, 0.94)',
  tabBarBorder: '#E2E8F0',
  tabBarActive: '#1D4ED8',
  tabBarInactive: '#64748B',

  // 8. Form Inputs
  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputFocusBorder: '#1D4ED8',
  inputErrorBorder: '#BE123C',

  // 9. Shadows & Skeletons
  shadowColor: '#0F172A',
  skeletonBg: '#E2E8F0',
  skeletonHighlight: '#F1F5F9',

  // 10. Backward Compatibility Aliases for Active Components
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E2E8F0',
  divider: '#E2E8F0',
  primary: '#1D4ED8',
  primaryLight: '#3B82F6',
  secondary: '#0369A1',
  success: '#047857',
  warning: '#B45309',
  danger: '#BE123C',
  info: '#1D4ED8',
  successBg: '#ECFDF5',
  warningBg: '#FFFBEB',
  dangerBg: '#FFF1F2',
  infoBg: '#EFF6FF',
} as const;

/**
 * Enterprise Dark Theme Tokens
 * OLED Surface Hierarchy: #0B0F17 Canvas with #1E293B Cards (Prevents OLED Motion Smear)
 * Desaturated status fills & high-luminance text (>4.5:1 WCAG AA)
 */
export const darkTheme = {
  isDark: true,

  // 1. Surface Hierarchy
  surfaceCanvas: '#0B0F17', // OLED Deep Slate Canvas (60% volume)
  surfaceCard: '#1E293B', // Slate 800 Card Surface (30% volume - zero OLED smear)
  surfaceElevated: '#243247', // Elevated Bottom Sheets & Modals
  surfaceSubtle: '#172033', // Deep slate input & counter fills
  surfaceOverlay: 'rgba(3, 7, 18, 0.75)', // Modal backdrop

  // 2. Hairlines & Borders
  borderSubtle: '#334155', // Slate 700 hairline borders
  borderStrong: '#475569', // Slate 600 active input border
  borderFocus: '#60A5FA', // Blue 400 focus ring

  // 3. High-Contrast Typography vs Card (#1E293B)
  textPrimary: '#F8FAFC', // Slate 50 (14.0:1 contrast - AAA)
  textSecondary: '#94A3B8', // Slate 400 (5.7:1 contrast - AA)
  textTertiary: '#CBD5E1', // Slate 300 (9.8:1 contrast - AA)
  textInverse: '#0B0F17', // Deep slate on brand actions (7.0:1)
  textDisabled: '#64748B', // Slate 500

  // 4. Brand & Actions (10% Focus Volume)
  brandPrimary: '#60A5FA', // Blue 400 (5.8:1 contrast - AA)
  brandPrimaryLight: '#93C5FD',
  brandPrimaryDark: '#3B82F6',
  brandPressed: '#3B82F6',
  actionSecondary: '#E2E8F0', // Slate 200 (11.9:1 contrast - AAA)
  actionSecondaryPressed: '#CBD5E1',
  actionDisabled: '#64748B',
  actionDisabledBg: '#1E293B',

  // 5. Workflow Statuses (Desaturated containers, high-luminance text)
  statusApprovedText: '#34D399', // Emerald 400 (5.1:1 vs fill, 7.6:1 vs Card)
  statusApprovedBg: '#064E3B', // Emerald 900
  statusApprovedBorder: '#047857', // Emerald 700

  statusPendingText: '#FBBF24', // Amber 400 (9.0:1 vs fill, 8.8:1 vs Card)
  statusPendingBg: '#451A03', // Amber 950
  statusPendingBorder: '#92400E', // Amber 800

  statusRejectedText: '#F87171', // Rose 400 (5.6:1 vs fill, 5.3:1 vs Card)
  statusRejectedBg: '#4C0519', // Rose 950
  statusRejectedBorder: '#9F1239', // Rose 800

  statusDraftText: '#E2E8F0', // Slate 200 (8.4:1 vs fill, 11.9:1 vs Card)
  statusDraftBg: '#334155', // Slate 700
  statusDraftBorder: '#475569', // Slate 600

  // 6. Leave Category Indicators
  leaveAnnualText: '#93C5FD', // Blue 300 (8.1:1 vs fill, 9.8:1 vs Card)
  leaveAnnualBg: '#172554', // Blue 950
  leaveAnnualBorder: '#1E40AF', // Blue 800

  leaveMedicalText: '#FCA5A5', // Rose 300 (8.2:1 vs fill, 9.5:1 vs Card)
  leaveMedicalBg: '#4C0519', // Rose 950
  leaveMedicalBorder: '#9F1239', // Rose 800

  leaveCasualText: '#7DD3FC', // Sky 300 (8.3:1 vs fill, 8.8:1 vs Card)
  leaveCasualBg: '#082F49', // Sky 950
  leaveCasualBorder: '#0369A1', // Sky 700

  leaveDutyText: '#C4B5FD', // Purple 300 (8.2:1 vs fill, 8.2:1 vs Card)
  leaveDutyBg: '#2E1065', // Purple 950
  leaveDutyBorder: '#5B21B6', // Purple 800

  // 7. Navigation & Chrome
  tabBarBg: 'rgba(11, 15, 23, 0.94)',
  tabBarBorder: '#1E293B',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#94A3B8',

  // 8. Form Inputs
  inputBg: '#172033',
  inputBorder: '#334155',
  inputFocusBorder: '#60A5FA',
  inputErrorBorder: '#F87171',

  // 9. Shadows & Skeletons
  shadowColor: '#000000',
  skeletonBg: '#243247',
  skeletonHighlight: '#334155',

  // 10. Backward Compatibility Aliases for Active Components
  background: '#0B0F17',
  surface: '#1E293B',
  card: '#1E293B',
  border: '#334155',
  divider: '#334155',
  primary: '#60A5FA',
  primaryLight: '#93C5FD',
  secondary: '#7DD3FC',
  success: '#34D399',
  warning: '#FBBF24',
  danger: '#F87171',
  info: '#60A5FA',
  successBg: 'rgba(16, 185, 129, 0.2)',
  warningBg: 'rgba(245, 158, 11, 0.2)',
  dangerBg: 'rgba(239, 68, 68, 0.2)',
  infoBg: 'rgba(59, 130, 246, 0.2)',
} as const;

export type Theme = { [K in keyof typeof lightTheme]: K extends 'isDark' ? boolean : string };
export type ColorToken = keyof typeof lightTheme;

export const lightColors: Theme = lightTheme;
export const darkColors: Theme = darkTheme;
export type ThemeColors = Theme;
