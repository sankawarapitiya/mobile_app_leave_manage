import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, CheckCircle2, XCircle, Ban } from 'lucide-react-native';
import { LeaveRequestStatus } from '../types';
import { useTheme } from '../theme/ThemeContext';

interface StatusBadgeProps {
  status: LeaveRequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const { colors, typography, borderRadius } = useTheme();

  const config = {
    pending: {
      label: 'Pending',
      bg: colors.statusPendingBg,
      color: colors.statusPendingText,
      border: colors.statusPendingBorder,
      Icon: Clock,
    },
    approved: {
      label: 'Approved',
      bg: colors.statusApprovedBg,
      color: colors.statusApprovedText,
      border: colors.statusApprovedBorder,
      Icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected',
      bg: colors.statusRejectedBg,
      color: colors.statusRejectedText,
      border: colors.statusRejectedBorder,
      Icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      bg: colors.statusDraftBg,
      color: colors.statusDraftText,
      border: colors.statusDraftBorder,
      Icon: Ban,
    },
  }[status] || {
    label: status,
    bg: colors.surfaceSubtle,
    color: colors.textSecondary,
    border: colors.borderSubtle,
    Icon: Clock,
  };

  const IconComponent = config.Icon;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          borderWidth: 1,
          borderRadius: borderRadius.full,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 10,
        },
      ]}
    >
      <IconComponent size={isSmall ? 12 : 14} color={config.color} strokeWidth={2.2} />
      <Text
        style={[
          typography.caption,
          styles.text,
          {
            color: config.color,
            fontSize: isSmall ? 10 : 12,
            fontWeight: '600',
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  text: {
    textTransform: 'capitalize',
  },
});
