import React from 'react';
import { View, Text, StyleSheet, Image, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Calendar,
  AlertTriangle,
  Paperclip,
  MessageSquare,
  X,
  Check,
} from 'lucide-react-native';
import { LeaveRequest } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { StatusBadge } from './StatusBadge';
import { formatDateRange } from '../utils/dateUtils';
import { palette } from '../theme/colors';

interface LeaveRequestCardProps {
  request: LeaveRequest;
  index: number;
  isManagerView?: boolean;
  onCancel?: (requestId: string) => void;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
}

export const LeaveRequestCard: React.FC<LeaveRequestCardProps> = ({
  request,
  index,
  isManagerView = false,
  onCancel,
  onApprove,
  onReject,
}) => {
  const { colors, typography, borderRadius, elevation } = useTheme();

  const fallbackConfig = palette.leaveTypes[request.leaveType] || palette.leaveTypes.annual;
  const typeConfig = {
    color: request.leaveColor || fallbackConfig.color,
    lightBg: request.leaveColor ? request.leaveColor + '18' : fallbackConfig.lightBg,
    label: request.leaveTypeName || fallbackConfig.label || request.leaveType,
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60).springify()}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: request.hasConflict ? colors.warning : colors.border,
          borderWidth: request.hasConflict ? 1.5 : 1,
          borderRadius: borderRadius.lg,
          ...elevation.sm,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      {/* Top Header: Employee info (if manager) or Leave Type + Status */}
      <View style={styles.headerRow}>
        {isManagerView ? (
          <View style={styles.userInfoRow}>
            {request.userAvatar ? (
              <Image source={{ uri: request.userAvatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarFallbackText}>
                  {request.userName.charAt(0)}
                </Text>
              </View>
            )}
            <View>
              <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                {request.userName}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {request.department}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor: typeConfig.lightBg,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <View style={[styles.typeDot, { backgroundColor: typeConfig.color }]} />
            <Text
              style={[
                typography.caption,
                { color: typeConfig.color, fontWeight: '700' },
              ]}
            >
              {typeConfig.label}
            </Text>
          </View>
        )}

        <StatusBadge status={request.status} size="sm" />
      </View>

      {/* Date Range & Total Days Banner */}
      <View
        style={[
          styles.dateBanner,
          {
            backgroundColor: colors.surfaceSubtle,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        <View style={styles.dateInfo}>
          <Calendar size={15} color={colors.primary} />
          <Text style={[typography.body2, { color: colors.textPrimary, fontWeight: '600' }]}>
            {formatDateRange(
              request.startDate,
              request.endDate,
              request.isHalfDay,
              request.halfDayPeriod
            )}
          </Text>
        </View>

        <View
          style={[
            styles.daysCountPill,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700' }]}>
            {request.totalDays} {request.totalDays === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      {/* Conflict Warning Indicator */}
      {request.hasConflict && (
        <View
          style={[
            styles.conflictBanner,
            {
              backgroundColor: colors.warningBg,
              borderColor: colors.warning,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          <AlertTriangle size={14} color={colors.warning} />
          <Text style={[typography.caption, { color: colors.warning, flex: 1, fontWeight: '600' }]}>
            Team Conflict: Overlaps with {request.conflictingUsers?.join(', ') || 'team member'} leave
          </Text>
        </View>
      )}

      {/* Reason Description */}
      {request.reason ? (
        <Text
          numberOfLines={2}
          style={[
            typography.body2,
            styles.reasonText,
            { color: colors.textSecondary },
          ]}
        >
          "{request.reason}"
        </Text>
      ) : null}

      {/* Attachment info if present */}
      {request.attachmentName && (
        <View style={styles.attachmentRow}>
          <Paperclip size={13} color={colors.textTertiary} />
          <Text
            numberOfLines={1}
            style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}
          >
            {request.attachmentName}
          </Text>
        </View>
      )}

      {/* Manager Review Comments */}
      {request.managerComment ? (
        <View
          style={[
            styles.commentBox,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderRadius: borderRadius.sm,
            },
          ]}
        >
          <MessageSquare size={13} color={colors.textTertiary} />
          <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]}>
            <Text style={{ fontWeight: '700', color: colors.textPrimary }}>
              {request.managerName || 'Manager'}:{' '}
            </Text>
            {request.managerComment}
          </Text>
        </View>
      ) : null}

      {/* Bottom Actions Row */}
      {request.status === 'pending' && (
        <View style={styles.actionsRow}>
          {isManagerView ? (
            <View style={styles.managerButtonsRow}>
              <Pressable
                onPress={() => onReject && onReject(request.id)}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.dangerBg,
                    borderColor: colors.danger,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <X size={14} color={colors.danger} strokeWidth={2.5} />
                <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                  Reject
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onApprove && onApprove(request.id)}
                style={[
                  styles.actionButton,
                  styles.approveBtn,
                  {
                    backgroundColor: colors.success,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Approve
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onCancel && onCancel(request.id)}
              style={[
                styles.cancelBtn,
                {
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.danger, fontWeight: '600' }]}>
                Cancel Request
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  daysCountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  conflictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  reasonText: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 10,
    marginTop: 4,
  },
  managerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
    borderWidth: 1,
  },
  approveBtn: {
    borderWidth: 0,
  },
  cancelBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
});
