import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  Users,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import { DashboardScreen } from '../screens/main/DashboardScreen';
import { ApplyLeaveScreen } from '../screens/main/ApplyLeaveScreen';
import { LeaveHistoryScreen } from '../screens/main/LeaveHistoryScreen';
import { TeamCalendarScreen } from '../screens/main/TeamCalendarScreen';
import { ManagerApprovalsScreen } from '../screens/main/ManagerApprovalsScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { triggerHaptic } from '../utils/haptics';

export type MainTabParamList = {
  Dashboard: undefined;
  Apply: undefined;
  Leaves: undefined;
  TeamCalendar: undefined;
  Approvals: { initialTab?: 'approvals' | 'users' } | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { activeRole, user } = useAuthStore();

  const isUserAdmin =
    (user?.designation || '').toLowerCase().includes('admin') ||
    (user?.role || '').toLowerCase() === 'manager' ||
    (user?.designation || '').toLowerCase().includes('manager');

  const isAndroid = Platform.OS === 'android';
  const isIos = Platform.OS === 'ios';

  // Dynamic bottom padding ensuring Android system navigation bar (3-button / gesture) & iOS Home Indicator never overlap tab items
  const bottomInset = insets.bottom;
  const paddingBottom = isIos
    ? (bottomInset > 0 ? bottomInset : 8)
    : Math.max(bottomInset, 12);

  const tabBarHeight = isIos
    ? (bottomInset > 0 ? 56 + bottomInset : 64)
    : 58 + paddingBottom;

  return (
    <Tab.Navigator
      safeAreaInsets={{ bottom: insets.bottom }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          height: tabBarHeight,
          paddingBottom: paddingBottom,
          paddingTop: 6,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
      screenListeners={{
        tabPress: () => {
          triggerHaptic.selection();
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Apply"
        component={ApplyLeaveScreen}
        options={{
          tabBarLabel: 'Apply',
          tabBarIcon: ({ color, size }) => (
            <CalendarPlus size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Leaves"
        component={LeaveHistoryScreen}
        options={{
          tabBarLabel: 'My Leaves',
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
      />

      <Tab.Screen
        name="TeamCalendar"
        component={TeamCalendarScreen}
        options={{
          tabBarLabel: 'Team',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />

      {/* Conditionally show Approvals / Management Tab if Manager Role */}
      {activeRole === 'manager' && (
        <Tab.Screen
          name="Approvals"
          component={ManagerApprovalsScreen}
          options={{
            tabBarLabel: isUserAdmin ? 'Management' : 'Approvals',
            tabBarIcon: ({ color, size }) => (
              <ShieldCheck size={size} color={color} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};
