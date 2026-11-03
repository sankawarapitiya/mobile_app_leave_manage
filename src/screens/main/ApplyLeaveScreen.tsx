import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar as CalendarPicker } from 'react-native-calendars';
import * as DocumentPicker from 'expo-document-picker';
import {
  Calendar as CalendarIcon,
  Clock,
  FileText,
  Paperclip,
  Check,
  AlertCircle,
  X,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { leaveService } from '../../services/firebase/leaveService';
import {
  LeaveType,
  HalfDayPeriod,
  UserLeaveBalances,
  CompanyHoliday,
} from '../../types';
import { CustomButton } from '../../components/CustomButton';
import {
  calculateWorkingDays,
  getMarkedRange,
  formatDate,
} from '../../utils/dateUtils';
import { triggerHaptic } from '../../utils/haptics';
import { palette } from '../../theme/colors';

const LEAVE_TYPES: { type: LeaveType; label: string; desc: string }[] = [
  { type: 'annual', label: 'Annual', desc: 'Paid vacation & rest' },
  { type: 'sick', label: 'Sick', desc: 'Health & recovery' },
  { type: 'casual', label: 'Casual', desc: 'Personal errands' },
  { type: 'unpaid', label: 'Unpaid', desc: 'Extended absence' },
];

export const ApplyLeaveScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius, isDark } = useTheme();
  const { user } = useAuthStore();

  const [balances, setBalances] = useState<UserLeaveBalances | null>(null);
  const [holidays, setHolidays] = useState<CompanyHoliday[]>([]);
  const [selectedType, setSelectedType] = useState<LeaveType>('annual');

  // Dates
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  // Half Day
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayPeriod, setHalfDayPeriod] = useState<HalfDayPeriod>('first_half');

  // Reason & Attachment
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; uri: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    const unsubBal = leaveService.subscribeToUserBalances(user.uid, setBalances);
    const unsubHol = leaveService.subscribeToCompanyHolidays(setHolidays, user.orgId);
    return () => {
      unsubBal();
      unsubHol();
    };
  }, [user]);

  // Holiday date list for working day exclusions
  const holidayDateStrings = useMemo(() => holidays.map((h) => h.date), [holidays]);

  // Working days count
  const calculatedWorkingDays = useMemo(() => {
    if (!startDate) return 0;
    if (isHalfDay) return 0.5;
    const end = endDate || startDate;
    return calculateWorkingDays(startDate, end, holidayDateStrings);
  }, [startDate, endDate, isHalfDay, holidayDateStrings]);

  // Balance Check
  const availableBalance = useMemo(() => {
    if (!balances) return 0;
    if (selectedType === 'unpaid') return 999;
    const cat = balances[selectedType];
    return Math.max(0, cat.total - cat.used - cat.pending);
  }, [balances, selectedType]);

  const hasExceededBalance =
    selectedType !== 'unpaid' && calculatedWorkingDays > availableBalance;

  // Calendar Day Press Handler
  const handleDayPress = (day: { dateString: string }) => {
    triggerHaptic.selection();
    setErrorMessage('');

    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (day.dateString < startDate) {
        setStartDate(day.dateString);
        setEndDate(null);
      } else {
        setEndDate(day.dateString);
      }
    }
  };

  // Pick Document
  const handlePickDocument = async () => {
    try {
      triggerHaptic.light();
      const res = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        setAttachment({ name: file.name, uri: file.uri });
      }
    } catch {
      // Pick cancelled
    }
  };

  // Submit Application
  const handleSubmit = async () => {
    if (!user) return;
    if (!startDate) {
      setErrorMessage('Please select leave start and end dates from the calendar.');
      triggerHaptic.error();
      return;
    }
    if (calculatedWorkingDays <= 0) {
      setErrorMessage('Selected dates have 0 working days (weekends or company holidays).');
      triggerHaptic.error();
      return;
    }
    if (hasExceededBalance) {
      setErrorMessage(
        `Insufficient ${selectedType} balance. You have ${availableBalance} day(s) available, but requested ${calculatedWorkingDays} day(s).`
      );
      triggerHaptic.error();
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for your leave request.');
      triggerHaptic.error();
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await leaveService.applyForLeave({
        userId: user.uid,
        userName: user.fullName,
        userAvatar: user.avatarUrl,
        department: user.department,
        leaveType: selectedType,
        startDate,
        endDate: endDate || startDate,
        isHalfDay,
        halfDayPeriod: isHalfDay ? halfDayPeriod : undefined,
        totalDays: calculatedWorkingDays,
        reason: reason.trim(),
        attachmentName: attachment?.name,
        attachmentUrl: attachment?.uri,
      });

      triggerHaptic.success();
      Alert.alert(
        'Leave Request Submitted',
        `Your request for ${calculatedWorkingDays} day(s) of ${selectedType} leave has been submitted for manager approval.`,
        [
          {
            text: 'View Requests',
            onPress: () => navigation.navigate('Leaves'),
          },
        ]
      );

      // Reset Form
      setStartDate(null);
      setEndDate(null);
      setIsHalfDay(false);
      setReason('');
      setAttachment(null);
    } catch (err: any) {
      triggerHaptic.error();
      setErrorMessage(err.message || 'Failed to submit leave request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const markedDates = useMemo(() => {
    const primary = palette.leaveTypes[selectedType].color;
    return getMarkedRange(startDate, endDate, primary);
  }, [startDate, endDate, selectedType]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 12,
            paddingBottom: insets.bottom + 100,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>
            Apply for Leave
          </Text>
          <Text style={[typography.body1, { color: colors.textSecondary, marginTop: 2 }]}>
            Submit time-off requests for manager review
          </Text>
        </View>

        {/* Error Notification Banner */}
        {errorMessage ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerBg,
                borderColor: colors.danger,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <AlertCircle size={16} color={colors.danger} />
            <Text style={[typography.caption, { color: colors.danger, flex: 1, fontWeight: '600' }]}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* 1. Leave Type Pills */}
        <View style={styles.section}>
          <Text style={[typography.subtitle1, { color: colors.textPrimary, marginBottom: 10 }]}>
            1. Select Leave Category
          </Text>
          <View style={styles.typeGrid}>
            {LEAVE_TYPES.map((item) => {
              const isSelected = selectedType === item.type;
              const typeCfg = palette.leaveTypes[item.type];
              return (
                <Pressable
                  key={item.type}
                  onPress={() => {
                    triggerHaptic.selection();
                    setSelectedType(item.type);
                    setErrorMessage('');
                  }}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: isSelected ? typeCfg.lightBg : colors.card,
                      borderColor: isSelected ? typeCfg.color : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <View style={styles.typeCardTop}>
                    <Text
                      style={[
                        typography.subtitle2,
                        { color: isSelected ? typeCfg.color : colors.textPrimary },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <View
                        style={[
                          styles.checkBadge,
                          { backgroundColor: typeCfg.color, borderRadius: borderRadius.full },
                        ]}
                      >
                        <Check size={11} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      typography.caption,
                      { color: isSelected ? typeCfg.color : colors.textSecondary, fontSize: 11 },
                    ]}
                  >
                    {item.desc}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Balance Pill Preview */}
          <View
            style={[
              styles.balancePill,
              {
                backgroundColor: colors.surfaceSubtle,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Text style={[typography.body2, { color: colors.textSecondary }]}>
              Available balance:{' '}
              <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
                {selectedType === 'unpaid' ? 'Unlimited' : `${availableBalance} days`}
              </Text>
            </Text>
          </View>
        </View>

        {/* 2. Calendar Range Picker */}
        <View style={styles.section}>
          <Text style={[typography.subtitle1, { color: colors.textPrimary, marginBottom: 10 }]}>
            2. Choose Date Range
          </Text>
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
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              minDate="2026-01-01"
              maxDate="2026-12-31"
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

          {/* Range & Working Days Pill */}
          <View
            style={[
              styles.calculationBox,
              {
                backgroundColor: hasExceededBalance ? colors.dangerBg : colors.surfaceSubtle,
                borderColor: hasExceededBalance ? colors.danger : colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              <CalendarIcon
                size={16}
                color={hasExceededBalance ? colors.danger : colors.primary}
              />
              <Text
                style={[
                  typography.subtitle2,
                  { color: hasExceededBalance ? colors.danger : colors.textPrimary },
                ]}
              >
                {startDate
                  ? `${formatDate(startDate)} ${endDate ? `→ ${formatDate(endDate)}` : ''}`
                  : 'Tap dates above to select range'}
              </Text>
            </View>

            <View
              style={[
                styles.totalDaysBadge,
                {
                  backgroundColor: hasExceededBalance ? colors.danger : colors.primary,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                {calculatedWorkingDays} {calculatedWorkingDays === 1 ? 'Working Day' : 'Working Days'}
              </Text>
            </View>
          </View>

          {hasExceededBalance && (
            <Text style={[typography.caption, { color: colors.danger, marginTop: 6 }]}>
              Requested days ({calculatedWorkingDays}) exceed your remaining balance ({availableBalance}).
            </Text>
          )}
        </View>

        {/* 3. Half-Day Toggle */}
        <View
          style={[
            styles.halfDaySection,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View style={styles.halfDayTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Clock size={16} color={colors.primary} />
              <View>
                <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                  Half-Day Leave
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Count as 0.5 working day
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => {
                triggerHaptic.selection();
                setIsHalfDay(!isHalfDay);
              }}
              style={[
                styles.toggleSwitch,
                {
                  backgroundColor: isHalfDay ? colors.primary : colors.surfaceSubtle,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  {
                    backgroundColor: '#FFFFFF',
                    transform: [{ translateX: isHalfDay ? 18 : 2 }],
                  },
                ]}
              />
            </Pressable>
          </View>

          {isHalfDay && (
            <View style={styles.periodRow}>
              <Pressable
                onPress={() => setHalfDayPeriod('first_half')}
                style={[
                  styles.periodTab,
                  {
                    backgroundColor:
                      halfDayPeriod === 'first_half' ? colors.primaryLight : colors.surfaceSubtle,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: halfDayPeriod === 'first_half' ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: '700',
                    },
                  ]}
                >
                  1st Half (Morning)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHalfDayPeriod('second_half')}
                style={[
                  styles.periodTab,
                  {
                    backgroundColor:
                      halfDayPeriod === 'second_half' ? colors.primaryLight : colors.surfaceSubtle,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    {
                      color: halfDayPeriod === 'second_half' ? '#FFFFFF' : colors.textSecondary,
                      fontWeight: '700',
                    },
                  ]}
                >
                  2nd Half (Afternoon)
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 4. Reason Text Area */}
        <View style={styles.section}>
          <View style={styles.labelWithCounter}>
            <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
              3. Reason for Absence
            </Text>
            <Text style={[typography.caption, { color: colors.textTertiary }]}>
              {reason.length}/200
            </Text>
          </View>
          <TextInput
            value={reason}
            onChangeText={(t) => setReason(t.slice(0, 200))}
            placeholder="e.g. Attending a family milestone. Handover documentation shared on Slack."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            style={[
              styles.reasonArea,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
                borderRadius: borderRadius.md,
              },
            ]}
          />
        </View>

        {/* 5. Supporting Document Picker */}
        <View style={styles.section}>
          <Text style={[typography.subtitle1, { color: colors.textPrimary, marginBottom: 8 }]}>
            4. Supporting Document (Optional)
          </Text>
          {attachment ? (
            <View
              style={[
                styles.attachedFileBox,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <FileText size={18} color={colors.primary} />
              <Text
                numberOfLines={1}
                style={[typography.subtitle2, { color: colors.textPrimary, flex: 1 }]}
              >
                {attachment.name}
              </Text>
              <Pressable onPress={() => setAttachment(null)} style={styles.removeFileBtn}>
                <X size={16} color={colors.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickDocument}
              style={[
                styles.attachmentBtn,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Paperclip size={16} color={colors.primary} />
              <Text style={[typography.subtitle2, { color: colors.primary }]}>
                Attach Medical Note / Flight Ticket
              </Text>
            </Pressable>
          )}
        </View>

        {/* Submit Button */}
        <CustomButton
          title="Submit Leave Request"
          size="lg"
          loading={isSubmitting}
          disabled={hasExceededBalance || calculatedWorkingDays === 0}
          onPress={handleSubmit}
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    marginBottom: 4,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
  },
  section: {},
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    minWidth: '46%',
    padding: 12,
    gap: 4,
  },
  typeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkBadge: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balancePill: {
    padding: 10,
    marginTop: 10,
    alignItems: 'center',
  },
  calendarCard: {
    borderWidth: 1,
    padding: 8,
  },
  calculationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  totalDaysBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  halfDaySection: {
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  halfDayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  periodTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reasonArea: {
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  attachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  attachedFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
  },
  removeFileBtn: {
    padding: 4,
  },
});
