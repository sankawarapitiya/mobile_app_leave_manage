import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: isDark ? colors.surfaceElevated : colors.skeletonBg,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

export const DashboardSkeleton: React.FC = () => {
  const { colors, borderRadius, spacing } = useTheme();

  return (
    <View style={{ padding: spacing.base, gap: 16 }}>
      {/* 2x2 grid skeleton */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton height={110} borderRadius={borderRadius.lg} style={{ flex: 1 }} />
        <Skeleton height={110} borderRadius={borderRadius.lg} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton height={110} borderRadius={borderRadius.lg} style={{ flex: 1 }} />
        <Skeleton height={110} borderRadius={borderRadius.lg} style={{ flex: 1 }} />
      </View>
      {/* Banner Skeleton */}
      <Skeleton height={80} borderRadius={borderRadius.lg} />
      {/* Feed Skeletons */}
      <Skeleton height={120} borderRadius={borderRadius.lg} />
      <Skeleton height={120} borderRadius={borderRadius.lg} />
    </View>
  );
};
