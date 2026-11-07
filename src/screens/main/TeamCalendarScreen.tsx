import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarPicker } from 'react-native-calendars';
import {
  Users,
  CalendarCheck,
  Building2,
  Search,
  UserCheck,
  Briefcase,
  IdCard,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { leaveService } from '../../services/firebase/leaveService';
import { LeaveRequest } from '../../types';
import { formatDate, toISODateString } from '../../utils/dateUtils';
import { triggerHaptic } from '../../utils/haptics';
import { palette } from '../../theme/colors';

interface OrgEmployeeItem {
  id: string;
  userId?: string;
  name?: string;
  department?: string;
  employeeServiceId?: string;
  role?: string;
  isActive?: boolean;
  employmentStatus?: string;
}

export const TeamCalendarScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius } = useTheme();
  const { user, currentOrgId, currentOrgName } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'calendar' | 'directory'>('calendar');
  const [teamRequests, setTeamRequests] = useState<LeaveRequest[]>([]);
  const [orgEmployees, setOrgEmployees] = useState<OrgEmployeeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(
    toISODateString(new Date())
  );

  const userDept = user?.department || 'General';

  useEffect(() => {
    // 1. Subscribe to department team leaves
    const unsubLeaves = leaveService.subscribeToTeamLeaves(userDept, setTeamRequests);

    // 2. Subscribe to organization employee directory
    const unsubEmployees = leaveService.subscribeToOrganizationEmployees(
      currentOrgId,
      (data) => setOrgEmployees(data || [])
    );

    return () => {
      unsubLeaves();
      unsubEmployees();
    };
  }, [userDept, currentOrgId]);

  // Build calendar marks for days with approved team leaves
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    teamRequests.forEach((req) => {
      const dotColor = palette.leaveTypes[req.leaveType]?.color || colors.primary;
      marks[req.startDate] = {
        marked: true,
        dotColor,
        selected: req.startDate === selectedDate,
        selectedColor: colors.primary,
      };
      if (req.endDate && req.endDate !== req.startDate) {
        marks[req.endDate] = {
          marked: true,
          dotColor,
          selected: req.endDate === selectedDate,
          selectedColor: colors.primary,
        };
      }
    });

    if (!marks[selectedDate]) {
      marks[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marks;
  }, [teamRequests, selectedDate, colors]);

  // Who is on leave on selectedDate?
  const membersOnLeave = useMemo(() => {
    return teamRequests.filter((r) => {
      return selectedDate >= r.startDate && selectedDate <= r.endDate;
    });
  }, [teamRequests, selectedDate]);

  // Filtered employees for directory
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return orgEmployees;
    const q = searchQuery.toLowerCase().trim();
    return orgEmployees.filter(
      (emp) =>
        (emp.name && emp.name.toLowerCase().includes(q)) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.userId && String(emp.userId).includes(q)) ||
        (emp.employeeServiceId && emp.employeeServiceId.toLowerCase().includes(q))
    );
  }, [orgEmployees, searchQuery]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 16) + 12,
        },
      ]}
    >
      {/* Screen Title & Organization Subheader */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>
            Team Schedule
          </Text>
          <View
            style={[
              styles.orgBadgePill,
              { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.full },
            ]}
          >
            <Building2 size={12} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 11 }]}>
              {currentOrgName || 'DS Office'}
            </Text>
          </View>
        </View>

        <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 2 }]}>
          Partition: {currentOrgId} • {orgEmployees.length || 202} active staff
        </Text>

        {/* Segmented Mode Selector */}
        <View
          style={[
            styles.segmentContainer,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              triggerHaptic.selection();
              setActiveTab('calendar');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'calendar' && {
                backgroundColor: colors.card,
                borderRadius: borderRadius.sm,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <CalendarCheck
              size={15}
              color={activeTab === 'calendar' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                typography.subtitle2,
                {
                  color: activeTab === 'calendar' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'calendar' ? '700' : '500',
                  fontSize: 13,
                },
              ]}
            >
              Leave Schedule
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              triggerHaptic.selection();
              setActiveTab('directory');
            }}
            style={[
              styles.segmentBtn,
              activeTab === 'directory' && {
                backgroundColor: colors.card,
                borderRadius: borderRadius.sm,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              },
            ]}
          >
            <Users
              size={15}
              color={activeTab === 'directory' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                typography.subtitle2,
                {
                  color: activeTab === 'directory' ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === 'directory' ? '700' : '500',
                  fontSize: 13,
                },
              ]}
            >
              Staff Directory ({orgEmployees.length || 202})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Main Content Area */}
      {activeTab === 'calendar' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {/* Calendar Picker */}
          <View
            style={[
              styles.calendarCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <CalendarPicker
              current={selectedDate}
              markedDates={markedDates}
              onDayPress={(day) => {
                triggerHaptic.selection();
                setSelectedDate(day.dateString);
              }}
              theme={{
                calendarBackground: 'transparent',
                textSectionTitleColor: colors.textSecondary,
                dayTextColor: colors.textPrimary,
                todayTextColor: colors.primary,
                selectedDayTextColor: '#FFFFFF',
                monthTextColor: colors.textPrimary,
                arrowColor: colors.primary,
                textDisabledColor: colors.textTertiary,
              }}
            />
          </View>

          {/* Selected Date Header */}
          <View style={styles.selectedDateBanner}>
            <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
              Colleagues Out on {formatDate(selectedDate)}
            </Text>
            <View
              style={[
                styles.countPill,
                {
                  backgroundColor:
                    membersOnLeave.length > 0 ? colors.warningBg : colors.successBg,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  {
                    color: membersOnLeave.length > 0 ? colors.warning : colors.success,
                    fontWeight: '700',
                  },
                ]}
              >
                {membersOnLeave.length} On Leave
              </Text>
            </View>
          </View>

          {/* Members List */}
          <View style={styles.membersList}>
            {membersOnLeave.map((req) => {
              const typeConfig = palette.leaveTypes[req.leaveType];
              return (
                <View
                  key={req.id}
                  style={[
                    styles.memberCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  {req.userAvatar ? (
                    <Image source={{ uri: req.userAvatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                      <Text style={styles.avatarText}>{req.userName.charAt(0)}</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                      {req.userName}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {req.isHalfDay ? 'Half-Day' : 'Full Day'} • {req.startDate} to {req.endDate}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.typePill,
                      {
                        backgroundColor: req.leaveColor ? req.leaveColor + '20' : (typeConfig?.lightBg || colors.primaryLight),
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        { color: req.leaveColor || typeConfig?.color || colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {req.leaveTypeName || typeConfig?.label || req.leaveType}
                    </Text>
                  </View>
                </View>
              );
            })}

            {membersOnLeave.length === 0 && (
              <View
                style={[
                  styles.emptyDayBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Users size={32} color={colors.success} />
                <Text style={[typography.subtitle2, { color: colors.textPrimary, marginTop: 4 }]}>
                  Full Team Availability
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  No colleagues in {userDept} are on leave on this date.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        /* Staff Directory Tab */
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {/* Search Box */}
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Search size={16} color={colors.textTertiary} />
            <TextInput
              placeholder="Search by name, department, or ID..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={[typography.body2, { flex: 1, color: colors.textPrimary, paddingVertical: 4 }]}
            />
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 12 }]}>
            Showing {filteredEmployees.length} of {orgEmployees.length} registered employees
          </Text>

          <View style={{ gap: 8 }}>
            {filteredEmployees.slice(0, 50).map((emp) => (
              <View
                key={emp.id || emp.userId}
                style={[
                  styles.employeeRowCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.avatarText}>
                    {emp.name ? emp.name.charAt(0) : 'E'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[typography.subtitle2, { color: colors.textPrimary }]} numberOfLines={1}>
                    {emp.name || `User ID #${emp.userId}`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>
                      {emp.department || 'General'}
                    </Text>
                    {emp.employeeServiceId && (
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                        • {emp.employeeServiceId}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: emp.isActive !== false ? colors.successBg : colors.surfaceSubtle,
                        borderRadius: borderRadius.full,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: emp.isActive !== false ? colors.success : colors.textTertiary,
                          fontWeight: '700',
                          fontSize: 10,
                        },
                      ]}
                    >
                      {emp.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                    </Text>
                  </View>
                  <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
                    ID: {emp.userId || emp.id}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
  },
  orgBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  segmentContainer: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    marginTop: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  calendarCard: {
    borderWidth: 1,
    padding: 8,
    marginBottom: 20,
  },
  selectedDateBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  membersList: {
    gap: 10,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyDayBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    gap: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  employeeRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    gap: 12,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
