import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AlertTriangle, Check, X, MessageSquare } from 'lucide-react-native';
import { LeaveRequest } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { CustomButton } from './CustomButton';
import { formatDateRange } from '../utils/dateUtils';

interface ManagerReviewModalProps {
  visible: boolean;
  request: LeaveRequest | null;
  decision: 'approved' | 'rejected' | null;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
}

export const ManagerReviewModal: React.FC<ManagerReviewModalProps> = ({
  visible,
  request,
  decision,
  onClose,
  onSubmit,
}) => {
  const { colors, typography, borderRadius } = useTheme();
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!request || !decision) return null;

  const isApprove = decision === 'approved';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(comment);
      setComment('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.contentCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.xl,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View
              style={[
                styles.iconBubble,
                {
                  backgroundColor: isApprove ? colors.successBg : colors.dangerBg,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              {isApprove ? (
                <Check size={20} color={colors.success} strokeWidth={2.5} />
              ) : (
                <X size={20} color={colors.danger} strokeWidth={2.5} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h3, { color: colors.textPrimary }]}>
                {isApprove ? 'Approve Leave Request' : 'Reject Leave Request'}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {request.userName} • {request.department}
              </Text>
            </View>
          </View>

          {/* Request Quick Summary */}
          <View
            style={[
              styles.summaryBox,
              {
                backgroundColor: colors.surfaceSubtle,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
              {formatDateRange(request.startDate, request.endDate, request.isHalfDay, request.halfDayPeriod)}
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 2 }]}>
              {request.totalDays ?? (request as any).daysRequested ?? 1} {(request.totalDays ?? (request as any).daysRequested ?? 1) === 1 ? 'day' : 'days'} ({String(request.leaveTypeName || request.leaveType || 'General').toUpperCase()} LEAVE)
            </Text>
          </View>

          {/* Conflict Warning */}
          {request.hasConflict && (
            <View
              style={[
                styles.conflictWarning,
                {
                  backgroundColor: colors.warningBg,
                  borderColor: colors.warning,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AlertTriangle size={16} color={colors.warning} />
              <Text style={[typography.caption, { color: colors.warning, flex: 1, fontWeight: '600' }]}>
                Attention: This request overlaps with {request.conflictingUsers?.join(', ')}.
              </Text>
            </View>
          )}

          {/* Comment input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <MessageSquare size={14} color={colors.textSecondary} />
              <Text style={[typography.subtitle2, { color: colors.textSecondary }]}>
                Manager Note / Remarks {isApprove ? '(Optional)' : '(Recommended)'}
              </Text>
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={
                isApprove
                  ? 'e.g. Approved. Please ensure handover is complete.'
                  : 'e.g. Due to product launch, please reschedule.'
              }
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.textPrimary,
                  borderRadius: borderRadius.md,
                },
              ]}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <CustomButton
              title="Cancel"
              variant="secondary"
              onPress={onClose}
              style={{ flex: 1 }}
            />
            <CustomButton
              title={isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
              variant={isApprove ? 'primary' : 'danger'}
              loading={isSubmitting}
              onPress={handleConfirm}
              style={{ flex: 1.5 }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  contentCard: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderWidth: 1,
    elevation: 10,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBubble: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryBox: {
    padding: 12,
    marginBottom: 12,
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 18,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1,
    padding: 12,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
