import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
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
  const { colors, isDark } = useTheme();
  const { activeRole, user } = useAuthStore();

  const isUserAdmin =
    (user?.designation || '').toLowerCase().includes('admin') ||
    (user?.role || '').toLowerCase() === 'manager' ||
    (user?.designation || '').toLowerCase().includes('manager');

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
          position: 'absolute',
          borderTopWidth: 1,
          elevation: 8,
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
