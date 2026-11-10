import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { triggerHaptic } from '../utils/haptics';
import { LoadingSpinner } from './LoadingSpinner';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const { colors, typography, borderRadius, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (disabled || loading) return;
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    if (disabled || loading) return;
    triggerHaptic.light();
    onPress();
  };

  // Dimensions based on size
  const paddingVertical = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const paddingHorizontal = size === 'sm' ? 14 : size === 'lg' ? 24 : 18;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  const isPrimary = variant === 'primary';
  const isOutline = variant === 'outline';
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  const getTextColor = () => {
    if (disabled) return colors.textTertiary;
    if (isPrimary) return colors.textInverse;
    if (isDanger) return '#FFFFFF';
    if (isOutline || isGhost) return colors.brandPrimary;
    if (isSecondary) return colors.textPrimary;
    return colors.textInverse;
  };

  const buttonContent = (
    <>
      {loading ? (
        <LoadingSpinner size="sm" color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              typography.button,
              { color: getTextColor(), fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (isPrimary && !disabled) {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || loading}
        style={[animatedStyle, style]}
      >
        <LinearGradient
          colors={
            isDark
              ? [colors.brandPrimaryDark, colors.brandPrimary]
              : [colors.brandPrimary, colors.brandPrimaryLight]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            {
              paddingVertical,
              paddingHorizontal,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          {buttonContent}
        </LinearGradient>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        animatedStyle,
        {
          paddingVertical,
          paddingHorizontal,
          borderRadius: borderRadius.md,
          backgroundColor: disabled
            ? colors.surfaceSubtle
            : isDanger
            ? colors.danger
            : isSecondary
            ? colors.surfaceElevated
            : isOutline
            ? 'transparent'
            : isGhost
            ? 'transparent'
            : colors.primary,
          borderColor: isOutline ? colors.primary : 'transparent',
          borderWidth: isOutline ? 1.5 : 0,
        },
        style,
      ]}
    >
      {buttonContent}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
