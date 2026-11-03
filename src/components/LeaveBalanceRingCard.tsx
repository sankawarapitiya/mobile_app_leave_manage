import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { LeaveType } from '../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface LeaveBalanceRingCardProps {
  type: LeaveType;
  title: string;
  total: number;
  used: number;
  pending: number;
  accentColor: string;
}

export const LeaveBalanceRingCard: React.FC<LeaveBalanceRingCardProps> = ({
  title,
  total,
  used,
  pending,
  accentColor,
}) => {
  const { colors, typography, borderRadius, elevation, isDark } = useTheme();

  const available = Math.max(0, total - used - pending);
  const ratio = total > 0 ? Math.min(1, Math.max(0, available / total)) : 0;

  // SVG circular dimensions
  const size = 76;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(ratio, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
  }, [ratio]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value);
    return {
      strokeDashoffset,
    };
  });

  const percentage = Math.round(ratio * 100);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: borderRadius.lg,
          ...elevation.sm,
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      <View style={styles.content}>
        {/* Left Side: Numbers and Details */}
        <View style={styles.infoCol}>
          <Text
            style={[
              typography.caption,
              styles.categoryTitle,
              { color: accentColor },
            ]}
          >
            {title}
          </Text>
          <View style={styles.daysRow}>
            <Text style={[typography.kpiNumber, { color: colors.textPrimary }]}>
              {available}
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, marginBottom: 2 }]}>
              / {total} days
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <View style={styles.statPill}>
              <View style={[styles.dot, { backgroundColor: colors.textTertiary }]} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {used} used
              </Text>
            </View>
            {pending > 0 && (
              <View style={styles.statPill}>
                <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                <Text style={[typography.caption, { color: colors.warning }]}>
                  {pending} pend
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Right Side: Circular Ring */}
        <View style={styles.ringContainer}>
          <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
            <Svg width={size} height={size}>
              {/* Background Track */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
              {/* Progress Ring */}
              {Platform.OS === 'web' ? (
                <Circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={accentColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  strokeDashoffset={circumference * (1 - ratio)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              ) : (
                <AnimatedCircle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  stroke={accentColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference} ${circumference}`}
                  animatedProps={animatedProps}
                  strokeLinecap="round"
                  fill="transparent"
                />
              )}
            </Svg>
          </View>
          <View style={styles.ringCenterText}>
            <Text
              style={[
                typography.caption,
                { color: colors.textPrimary, fontWeight: '700', fontSize: 13 },
              ]}
            >
              {percentage}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 155,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
    marginBottom: 2,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginVertical: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  ringContainer: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  ringCenterText: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
