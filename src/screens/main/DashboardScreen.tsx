import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import {
  Plus,
  Calendar,
  Sparkles,
  ChevronRight,
  Gift,
  Building2,
  Clock,
  Fingerprint,
  RefreshCw,
  CalendarDays,
  LogIn,
  LogOut,
  Timer,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { leaveService } from '../../services/firebase/leaveService';
import {
  LeaveRequest,
  UserLeaveBalances,
  CompanyHoliday,
  DailyAttendanceSummary,
} from '../../types';
import { AnimatedHeader } from '../../components/AnimatedHeader';
import { LeaveBalanceRingCard } from '../../components/LeaveBalanceRingCard';
import { LeaveRequestCard } from '../../components/LeaveRequestCard';
import { DashboardSkeleton } from '../../components/SkeletonLoader';
import { formatDate, formatShortDate } from '../../utils/dateUtils';
import { palette } from '../../theme/colors';
import { triggerHaptic } from '../../utils/haptics';

export const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius, elevation } = useTheme();
  const {
    user,
    currentOrgId,
    currentOrgName,
    recentPunches,
    dailyAttendance,
    loadRecentPunches,
  } = useAuthStore();

  const [balances, setBalances] = useState<UserLeaveBalances | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attendanceViewMode, setAttendanceViewMode] = useState<'daily' | 'raw'>('daily');

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // Subscribe to Balances (resolving cloud leave balances via fingerprintId / rawUserId / uid)
    const fpId = user.fingerprintId || user.fingerprint_id || user.rawUserId;
    const unsubBalances = leaveService.subscribeToUserBalances(
      user.uid,
      (data) => {
        setBalances(data);
      },
      user.orgId || currentOrgId,
      fpId
    );

    // Subscribe to User Leave Requests
    const unsubRequests = leaveService.subscribeToUserRequests(
      user.uid,
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      user.orgId || currentOrgId,
      fpId
    );

    // Subscribe to Company Holidays under organization in Firestore
    const targetOrg = user?.orgId || currentOrgId;
    const unsubHolidays = leaveService.subscribeToCompanyHolidays((data) => {
      setHolidays(data);
    }, targetOrg);

    // Load recent biometric punches
    loadRecentPunches();

    return () => {
      unsubBalances();
      unsubRequests();
      unsubHolidays();
    };
  }, [user, currentOrgId]);

  const onRefresh = async () => {
    setRefreshing(true);
    triggerHaptic.selection();
    await Promise.all([
      loadRecentPunches(),
      new Promise((r) => setTimeout(r, 600)),
    ]);
    setRefreshing(false);
  };

  const upcomingApprovedLeave = requests.find(
    (r) =>
      (r.status === 'approved' || String(r.status || '').toLowerCase() === 'approved') &&
      Boolean(r.startDate || (r as any).start_date) &&
      !isNaN(new Date(r.startDate || (r as any).start_date).getTime()) &&
      new Date(r.startDate || (r as any).start_date) >= new Date(new Date().setHours(0, 0, 0, 0))
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AnimatedHeader />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {loading && !balances ? (
          <DashboardSkeleton />
        ) : (
          <>
            {/* Organization Partition Cloud Badge */}
            <View
              style={[
                styles.orgBanner,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  ...elevation.sm,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.orgBannerLeft}>
                <View
                  style={[
                    styles.orgIconWrap,
                    {
                      backgroundColor: colors.primaryLight + '22',
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Building2 size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.subtitle1, { color: colors.textPrimary }]} numberOfLines={1}>
                    {currentOrgName || 'DS Office Lunugamwehera'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Partition: {currentOrgId || 'DSOFFICE_LUNUGAMWEHERA'}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.syncBadge,
                  {
                    backgroundColor: colors.successBg,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[typography.caption, { color: colors.success, fontWeight: '700', fontSize: 11 }]}>
                  Cloud Active
                </Text>
              </View>
            </View>

            {/* KPI Leave Balance Cards Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    Leave Balances
                  </Text>
                  {balances?.leaveCategoryName ? (
                    <View
                      style={[
                        styles.catBadge,
                        {
                          backgroundColor: (balances.leaveCategoryColor || colors.primary) + '20',
                          borderColor: balances.leaveCategoryColor || colors.primary,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: balances.leaveCategoryColor || colors.primary,
                            fontWeight: '700',
                            fontSize: 10,
                          },
                        ]}
                      >
                        {balances.leaveCategoryName}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Allowance for Year {balances?.year || 2026}
                  {balances?.balances && balances.balances.length > 0
                    ? ` • ${balances.balances.length} Types Active`
                    : ''}
                </Text>
              </View>

              <Pressable
                onPress={() => navigation.navigate('Apply')}
                style={[
                  styles.quickApplyBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Apply
                </Text>
              </Pressable>
            </View>

            {/* Dynamic Leave Balance Grid from Cloud Firestore */}
            {balances?.balances && balances.balances.length > 0 ? (
              <View style={styles.balanceGrid}>
                {(() => {
                  const quotaBalances = balances.balances.filter(
                    (b) => (b.allocatedDays + (b.carriedForwardDays || 0)) > 0 || b.usedDays > 0
                  );
                  const quotaFreeBalances = balances.balances.filter(
                    (b) => (b.allocatedDays + (b.carriedForwardDays || 0)) === 0 && b.usedDays === 0
                  );
                  const displayRings = quotaBalances.length > 0 ? quotaBalances : balances.balances;

                  return (
                    <>
                      {Array.from({ length: Math.ceil(displayRings.length / 2) }).map((_, rowIdx) => {
                        const first = displayRings[rowIdx * 2];
                        const second = displayRings[rowIdx * 2 + 1];
                        return (
                          <View key={`bal_row_${rowIdx}`} style={styles.gridRow}>
                            <LeaveBalanceRingCard
                              title={first.leaveTypeName}
                              code={first.code}
                              total={first.allocatedDays + (first.carriedForwardDays || 0)}
                              used={first.usedDays}
                              pending={first.pendingDays || 0}
                              remaining={first.remainingDays}
                              accentColor={first.color || colors.primary}
                              isPaid={first.isPaid}
                            />
                            {second ? (
                              <LeaveBalanceRingCard
                                title={second.leaveTypeName}
                                code={second.code}
                                total={second.allocatedDays + (second.carriedForwardDays || 0)}
                                used={second.usedDays}
                                pending={second.pendingDays || 0}
                                remaining={second.remainingDays}
                                accentColor={second.color || colors.primary}
                                isPaid={second.isPaid}
                              />
                            ) : (
                              <View style={{ flex: 1, minWidth: 155 }} />
                            )}
                          </View>
                        );
                      })}

                      {/* Quota-Free Entitlements Badge Row */}
                      {quotaFreeBalances.length > 0 && quotaBalances.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                          {quotaFreeBalances.map((qf) => (
                            <View
                              key={`qf_${qf.leaveTypeId}`}
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                                paddingVertical: 5,
                                paddingHorizontal: 10,
                                borderRadius: borderRadius.sm,
                                backgroundColor: (qf.color || colors.primary) + '14',
                                borderWidth: 1,
                                borderColor: (qf.color || colors.primary) + '30',
                              }}
                            >
                              <View
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  backgroundColor: qf.color || colors.primary,
                                }}
                              />
                              <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
                                {qf.leaveTypeName}
                              </Text>
                              <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
                                • Quota-Free
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  );
                })()}
              </View>
            ) : (
              /* Fallback 2x2 Leave Balance Grid (Using Real Org Policy: Casual 21, Medical 24) */
              <View style={styles.balanceGrid}>
                <View style={styles.gridRow}>
                  <LeaveBalanceRingCard
                    type="casual"
                    title="Casual Leave"
                    code="CAS"
                    total={balances?.casual.total || 21}
                    used={balances?.casual.used || 0}
                    pending={balances?.casual.pending || 0}
                    accentColor={palette.leaveTypes.casual.color}
                  />
                  <LeaveBalanceRingCard
                    type="sick"
                    title="Medical / Sick"
                    code="MED"
                    total={balances?.sick.total || 24}
                    used={balances?.sick.used || 0}
                    pending={balances?.sick.pending || 0}
                    accentColor={palette.leaveTypes.sick.color}
                  />
                </View>

                <View style={styles.gridRow}>
                  <LeaveBalanceRingCard
                    type="duty"
                    title="Duty Leave"
                    code="DL"
                    total={0}
                    used={0}
                    pending={0}
                    accentColor={palette.leaveTypes.duty.color}
                  />
                  <LeaveBalanceRingCard
                    type="unpaid"
                    title="Unpaid"
                    code="UNPAID"
                    total={balances?.unpaid.used || 0}
                    used={balances?.unpaid.used || 0}
                    pending={0}
                    accentColor={palette.leaveTypes.unpaid.color}
                  />
                </View>
              </View>
            )}

            {/* Biometric Attendance (SpeedFace) Section */}
            <View style={styles.punchesSection}>
              <View style={styles.sectionTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                  <Fingerprint size={18} color={colors.primary} />
                  <View>
                    <Text style={[typography.subtitle1, { color: colors.textPrimary, fontWeight: '700' }]}>
                      Biometric Attendance
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
                      Check-In (First Punch) • Check-Out (Last Punch)
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {/* View Mode Toggle */}
                  <View
                    style={[
                      styles.toggleTabs,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        borderRadius: borderRadius.sm,
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => {
                        triggerHaptic.selection();
                        setAttendanceViewMode('daily');
                      }}
                      style={[
                        styles.toggleTab,
                        attendanceViewMode === 'daily' && {
                          backgroundColor: colors.card,
                          borderRadius: borderRadius.xs,
                          ...elevation.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: attendanceViewMode === 'daily' ? colors.primary : colors.textTertiary,
                            fontWeight: attendanceViewMode === 'daily' ? '700' : '500',
                            fontSize: 11,
                          },
                        ]}
                      >
                        Daily
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerHaptic.selection();
                        setAttendanceViewMode('raw');
                      }}
                      style={[
                        styles.toggleTab,
                        attendanceViewMode === 'raw' && {
                          backgroundColor: colors.card,
                          borderRadius: borderRadius.xs,
                          ...elevation.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: attendanceViewMode === 'raw' ? colors.primary : colors.textTertiary,
                            fontWeight: attendanceViewMode === 'raw' ? '700' : '500',
                            fontSize: 11,
                          },
                        ]}
                      >
                        Logs
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    onPress={() => {
                      triggerHaptic.selection();
                      loadRecentPunches();
                    }}
                    style={[
                      styles.refreshPunchesBtn,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderRadius: borderRadius.sm,
                      },
                    ]}
                  >
                    <RefreshCw size={13} color={colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              {attendanceViewMode === 'daily' ? (
                dailyAttendance && dailyAttendance.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    {dailyAttendance.slice(0, 10).map((day) => {
                      const statusStr = String(day.dailyStatus || '');
                      const isFullDay = statusStr.includes('Full Day');
                      const isGrace = statusStr.includes('Grace');
                      const isSingle = day.punchCount === 1;

                      const statusBg = isFullDay ? colors.successBg : isGrace ? colors.warningBg : colors.surfaceSubtle;
                      const statusColor = isFullDay ? colors.success : isGrace ? colors.warning : colors.textSecondary;

                      return (
                        <View
                          key={day.id}
                          style={[
                            styles.dailyCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                              borderRadius: borderRadius.lg,
                              ...elevation.sm,
                            },
                          ]}
                        >
                          {/* Card Header: Employee Name, Date & Overall Daily Status */}
                          <View style={styles.dailyCardHeader}>
                            <View style={{ flexDirection: 'column', gap: 2, flex: 1, marginRight: 8 }}>
                              {Boolean(day.employeeName) && (
                                <Text
                                  style={[
                                    typography.subtitle2,
                                    { color: colors.textPrimary, fontWeight: '800', fontSize: 13 },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {day.employeeName}
                                </Text>
                              )}
                              <View style={styles.dailyDatePill}>
                                <CalendarDays size={13} color={colors.primary} />
                                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                                  {day.date}
                                </Text>
                                <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '600' }]}>
                                  • {day.dayName}
                                </Text>
                              </View>
                            </View>

                            <View
                              style={[
                                styles.statusBadgePill,
                                { backgroundColor: statusBg, borderRadius: borderRadius.full },
                              ]}
                            >
                              <Text
                                style={[
                                  typography.caption,
                                  { color: statusColor, fontWeight: '700', fontSize: 11 },
                                ]}
                              >
                                {day.dailyStatus}
                              </Text>
                            </View>
                          </View>

                          {/* Split Row: Check-In (First Punch) vs Check-Out (Last Punch) */}
                          <View style={styles.dailyPunchesSplit}>
                            {/* Check-In (First Punch) Box */}
                            <View
                              style={[
                                styles.punchColumnBox,
                                {
                                  backgroundColor: colors.surfaceSubtle,
                                  borderColor: colors.border,
                                  borderRadius: borderRadius.md,
                                },
                              ]}
                            >
                              <View style={styles.punchBoxHeader}>
                                <View style={[styles.punchIndicatorDot, { backgroundColor: colors.success }]} />
                                <Text
                                  style={[
                                    typography.caption,
                                    { color: colors.textSecondary, fontWeight: '700', fontSize: 11 },
                                  ]}
                                >
                                  Check-In (First Punch)
                                </Text>
                              </View>
                              <Text
                                style={[
                                  typography.subtitle1,
                                  { color: colors.textPrimary, fontWeight: '800', fontSize: 16, marginTop: 2 },
                                ]}
                              >
                                {day.checkInTime}
                              </Text>
                              <View
                                style={[
                                  styles.subPill,
                                  {
                                    backgroundColor:
                                      day.checkInLabel === 'On Time'
                                        ? colors.successBg
                                        : day.checkInLabel === 'Grace Applied'
                                        ? colors.warningBg
                                        : colors.dangerBg,
                                    borderRadius: borderRadius.xs,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    typography.caption,
                                    {
                                      color:
                                        day.checkInLabel === 'On Time'
                                          ? colors.success
                                          : day.checkInLabel === 'Grace Applied'
                                          ? colors.warning
                                          : colors.danger,
                                      fontSize: 10,
                                      fontWeight: '700',
                                    },
                                  ]}
                                >
                                  {day.checkInLabel}
                                </Text>
                              </View>
                            </View>

                            {/* Check-Out (Last Punch) Box */}
                            <View
                              style={[
                                styles.punchColumnBox,
                                {
                                  backgroundColor: colors.surfaceSubtle,
                                  borderColor: colors.border,
                                  borderRadius: borderRadius.md,
                                },
                              ]}
                            >
                              <View style={styles.punchBoxHeader}>
                                <View
                                  style={[
                                    styles.punchIndicatorDot,
                                    { backgroundColor: isSingle ? colors.textTertiary : colors.warning },
                                  ]}
                                />
                                <Text
                                  style={[
                                    typography.caption,
                                    { color: colors.textSecondary, fontWeight: '700', fontSize: 11 },
                                  ]}
                                >
                                  Check-Out (Last Punch)
                                </Text>
                              </View>
                              <Text
                                style={[
                                  typography.subtitle1,
                                  {
                                    color: isSingle ? colors.textTertiary : colors.textPrimary,
                                    fontWeight: '800',
                                    fontSize: 16,
                                    marginTop: 2,
                                  },
                                ]}
                              >
                                {day.checkOutTime}
                              </Text>
                              <View
                                style={[
                                  styles.subPill,
                                  {
                                    backgroundColor: isSingle ? colors.surface : colors.warningBg,
                                    borderRadius: borderRadius.xs,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    typography.caption,
                                    {
                                      color: isSingle ? colors.textTertiary : colors.warning,
                                      fontSize: 10,
                                      fontWeight: '700',
                                    },
                                  ]}
                                >
                                  {day.checkOutLabel}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Card Footer: Worked Duration & Punch Count */}
                          <View style={[styles.dailyCardFooter, { borderTopColor: colors.border }]}>
                            <View style={styles.footerItem}>
                              <Timer size={13} color={colors.textSecondary} />
                              <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                                Worked: {day.workedFormatted}
                              </Text>
                            </View>

                            <View style={styles.footerItem}>
                              <Fingerprint size={13} color={colors.primary} />
                              <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
                                {day.punchCount} {day.punchCount === 1 ? 'Punch' : 'Punches'} • SpeedFace
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.emptyPunchesBox,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Fingerprint size={28} color={colors.textTertiary} />
                    <Text style={[typography.subtitle2, { color: colors.textSecondary, marginTop: 4 }]}>
                      No Daily Attendance Records
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
                      Daily Check-In (First Punch) and Check-Out (Last Punch) will appear here automatically
                    </Text>
                  </View>
                )
              ) : (
                /* Raw Biometric Logs View */
                recentPunches && recentPunches.length > 0 ? (
                  <View style={{ gap: 8 }}>
                    {recentPunches.slice(0, 6).map((punch) => {
                      const stateName = String(punch.punchStateName || '').toLowerCase();
                      const isCheckIn =
                        punch.isFirstPunch ||
                        stateName.includes('first') ||
                        stateName.includes('in');
                      const isCheckOut =
                        punch.isLastPunch ||
                        stateName.includes('last') ||
                        stateName.includes('out');

                      const badgeBg = isCheckIn ? colors.successBg : isCheckOut ? colors.warningBg : colors.surfaceSubtle;
                      const badgeColor = isCheckIn ? colors.success : isCheckOut ? colors.warning : colors.textSecondary;

                      return (
                        <View
                          key={punch.id}
                          style={[
                            styles.punchCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                              borderRadius: borderRadius.md,
                            },
                          ]}
                        >
                          <View style={styles.punchLeftCol}>
                            <View
                              style={[
                                styles.punchStateBadge,
                                { backgroundColor: badgeBg, borderRadius: borderRadius.sm },
                              ]}
                            >
                              <Text
                                style={[
                                  typography.caption,
                                  { color: badgeColor, fontWeight: '700', fontSize: 11 },
                                ]}
                              >
                                {punch.punchStateName}
                              </Text>
                            </View>
                            <Text
                              style={[
                                typography.subtitle2,
                                { color: colors.textPrimary, marginTop: 4 },
                              ]}
                              numberOfLines={1}
                            >
                              {punch.employeeName || user?.fullName || 'Employee'}
                            </Text>
                            <Text style={[typography.caption, { color: colors.textSecondary }]}>
                              {punch.department || user?.department || 'General'}
                            </Text>
                          </View>

                          <View style={styles.punchRightCol}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Clock size={12} color={colors.textTertiary} />
                              <Text
                                style={[
                                  typography.caption,
                                  { color: colors.textPrimary, fontWeight: '600', fontSize: 12 },
                                ]}
                              >
                                {punch.punchTime ? punch.punchTime.slice(11, 19) : '--:--'}
                              </Text>
                            </View>
                            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                              {punch.punchDate || (punch.punchTime ? punch.punchTime.slice(0, 10) : '')}
                            </Text>
                            <View
                              style={[
                                styles.verifyPill,
                                { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.full },
                              ]}
                            >
                              <Text
                                style={[
                                  typography.caption,
                                  { color: colors.textTertiary, fontSize: 10 },
                                ]}
                                numberOfLines={1}
                              >
                                {punch.verifyName || 'Biometric'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.emptyPunchesBox,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Fingerprint size={28} color={colors.textTertiary} />
                    <Text style={[typography.subtitle2, { color: colors.textSecondary, marginTop: 4 }]}>
                      No Biometric Punches Found
                    </Text>
                    <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
                      Attendance logs from SpeedFace biometric terminal will appear here automatically
                    </Text>
                  </View>
                )
              )}
            </View>

            {/* Upcoming Time Off Banner */}
            <View
              style={[
                styles.upcomingBanner,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  ...elevation.sm,
                  shadowColor: colors.shadowColor,
                },
              ]}
            >
              <View style={styles.upcomingHeader}>
                <View
                  style={[
                    styles.sparkleIcon,
                    {
                      backgroundColor: colors.primaryLight + '22',
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Sparkles size={16} color={colors.primary} />
                </View>
                <Text style={[typography.subtitle2, { color: colors.textPrimary, flex: 1 }]}>
                  Upcoming Time Off
                </Text>
              </View>

              {upcomingApprovedLeave ? (
                <View style={styles.upcomingDetails}>
                  <Text style={[typography.h3, { color: colors.primary }]}>
                    {formatDate(upcomingApprovedLeave.startDate || (upcomingApprovedLeave as any).start_date || '')}
                  </Text>
                  <Text style={[typography.body2, { color: colors.textSecondary }]}>
                    {upcomingApprovedLeave.totalDays ?? (upcomingApprovedLeave as any).daysRequested ?? (upcomingApprovedLeave as any).days_requested ?? (upcomingApprovedLeave as any).days ?? 1} day(s) approved for{' '}
                    {String(upcomingApprovedLeave.leaveTypeName || upcomingApprovedLeave.leaveType || (upcomingApprovedLeave as any).leave_type || 'General').toUpperCase()} leave
                  </Text>
                </View>
              ) : (
                <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 4 }]}>
                  No approved leaves upcoming. Need a break? Tap Apply above!
                </Text>
              )}
            </View>

            {/* Company Holidays Strip */}
            <View style={styles.holidaysSection}>
              <View style={styles.sectionTitleRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Gift size={16} color={colors.primary} />
                  <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
                    Company Holidays
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {holidays.length} observed
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingVertical: 4 }}
              >
                {holidays.map((hol) => (
                  <View
                    key={hol.id}
                    style={[
                      styles.holidayChip,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <View style={styles.holidayDatePill}>
                      <Calendar size={13} color={colors.secondary} />
                      <Text style={[typography.caption, { color: colors.secondary, fontWeight: '700' }]}>
                        {formatShortDate(hol.date)}
                      </Text>
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        typography.subtitle2,
                        { color: colors.textPrimary, marginTop: 4 },
                      ]}
                    >
                      {hol.title}
                    </Text>
                    {hol.description ? (
                      <Text
                        numberOfLines={1}
                        style={[
                          typography.caption,
                          { color: colors.textTertiary, fontSize: 10, marginTop: 2 },
                        ]}
                      >
                        {hol.description}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Recent Requests Section */}
            <View style={styles.requestsSection}>
              <View style={styles.sectionTitleRow}>
                <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
                  Recent Leave Requests
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('Leaves')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
                >
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                    View All
                  </Text>
                  <ChevronRight size={14} color={colors.primary} />
                </Pressable>
              </View>

              {requests.slice(0, 3).map((req, index) => (
                <LeaveRequestCard
                  key={req.id}
                  request={req}
                  index={index}
                  onCancel={async (id) => {
                    if (user) await leaveService.cancelLeaveRequest(id, user.uid);
                  }}
                />
              ))}

              {requests.length === 0 && (
                <View
                  style={[
                    styles.emptyBox,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: borderRadius.lg,
                    },
                  ]}
                >
                  <Calendar size={32} color={colors.textTertiary} />
                  <Text style={[typography.subtitle2, { color: colors.textSecondary, marginTop: 8 }]}>
                    No leave requests found
                  </Text>
                  <Text style={[typography.caption, { color: colors.textTertiary, textAlign: 'center' }]}>
                    Plan your vacation or time off by tapping Apply Leave
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  orgBanner: {
    padding: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  orgBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  orgIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  quickApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  balanceGrid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  punchesSection: {
    gap: 10,
  },
  toggleTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2,
    borderWidth: 1,
  },
  toggleTab: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  dailyCard: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  dailyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dailyPunchesSplit: {
    flexDirection: 'row',
    gap: 8,
  },
  punchColumnBox: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    gap: 3,
  },
  punchBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  punchIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  dailyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshPunchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  punchCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  punchLeftCol: {
    flex: 1,
    paddingRight: 8,
  },
  punchRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  punchStateBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifyPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  emptyPunchesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    gap: 4,
  },
  upcomingBanner: {
    padding: 16,
    borderWidth: 1,
  },
  upcomingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sparkleIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upcomingDetails: {
    marginTop: 4,
    gap: 2,
  },
  holidaysSection: {
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  holidayChip: {
    padding: 12,
    borderWidth: 1,
    minWidth: 145,
  },
  holidayDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  requestsSection: {
    gap: 10,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    gap: 4,
  },
});
