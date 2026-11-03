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
      bg: colors.warningBg,
      color: colors.warning,
      Icon: Clock,
    },
    approved: {
      label: 'Approved',
      bg: colors.successBg,
      color: colors.success,
      Icon: CheckCircle2,
    },
    rejected: {
      label: 'Rejected',
      bg: colors.dangerBg,
      color: colors.danger,
      Icon: XCircle,
    },
    cancelled: {
      label: 'Cancelled',
      bg: colors.isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(100, 116, 139, 0.12)',
      color: colors.textSecondary,
      Icon: Ban,
    },
  }[status] || {
    label: status,
    bg: colors.surfaceSubtle,
    color: colors.textSecondary,
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
