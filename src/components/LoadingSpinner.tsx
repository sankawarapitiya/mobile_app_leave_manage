import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | number;
  color?: string;
  secondaryColor?: string;
  label?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color,
  secondaryColor,
  label,
  overlay = false,
  style,
}) => {
  const { colors, typography } = useTheme();

  const spinnerColor = color || colors.primary;
  const trackColor = secondaryColor || colors.primary + '25';

  const numericSize =
    typeof size === 'number'
      ? size
      : size === 'sm'
      ? 20
      : size === 'lg'
      ? 54
      : 36;

  const borderWidth = Math.max(2, Math.round(numericSize / 9));

  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 900,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    pulseScale.value = withRepeat(
      withTiming(1.08, {
        duration: 900,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedSpinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  const animatedPulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: pulseScale.value }],
    };
  });

  const content = (
    <View style={[styles.wrapper, style]}>
      <Animated.View style={animatedPulseStyle}>
        <View
          style={[
            styles.baseRing,
            {
              width: numericSize,
              height: numericSize,
              borderRadius: numericSize / 2,
              borderColor: trackColor,
              borderWidth,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.spinArc,
              animatedSpinStyle,
              {
                width: numericSize,
                height: numericSize,
                borderRadius: numericSize / 2,
                borderWidth,
                borderTopColor: spinnerColor,
                borderRightColor: spinnerColor + '80',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
              },
            ]}
          />
        </View>
      </Animated.View>

      {Boolean(label) && (
        <Text
          style={[
            typography.caption,
            styles.labelText,
            { color: colors.textSecondary, marginTop: numericSize > 30 ? 10 : 6 },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );

  if (overlay) {
    return (
      <View
        style={[
          styles.overlayContainer,
          { backgroundColor: colors.isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)' },
        ]}
      >
        <View
          style={[
            styles.overlayBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {content}
        </View>
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseRing: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  spinArc: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  labelText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  overlayBox: {
    paddingVertical: 20,
    paddingHorizontal: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
});
