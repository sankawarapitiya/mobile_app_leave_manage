import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Shield, Fingerprint, Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { LoadingSpinner } from './LoadingSpinner';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
  orgName?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onAnimationComplete,
  orgName = 'Divisional Secretariat Office',
}) => {
  const { colors, typography, isDark } = useTheme();

  const iconScale = useSharedValue(0.4);
  const iconOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0.8);
  const textTranslateY = useSharedValue(25);
  const textOpacity = useSharedValue(0);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Spring-in for main emblem
    iconScale.value = withSpring(1, {
      damping: 12,
      stiffness: 90,
    });
    iconOpacity.value = withTiming(1, { duration: 600 });

    // 2. Continuous pulse for background glowing aura
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 3. Fade and slide in titles
    textTranslateY.value = withTiming(0, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    textOpacity.value = withTiming(1, { duration: 800 });

    // 4. Smooth completion timer (min 1.8s presentation)
    const timer = setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: textTranslateY.value }],
    opacity: textOpacity.value,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background },
        animatedContainerStyle,
      ]}
    >
      {/* Background Subtle Gradient Blobs */}
      <View
        style={[
          styles.ambientCircle,
          {
            backgroundColor: isDark ? 'rgba(2,132,199,0.12)' : 'rgba(2,132,199,0.08)',
            top: -60,
            right: -60,
          },
        ]}
      />
      <View
        style={[
          styles.ambientCircle,
          {
            backgroundColor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
            bottom: -80,
            left: -60,
          },
        ]}
      />

      <View style={styles.centerContent}>
        {/* Animated Emblem with Multi-Layer Glow */}
        <View style={styles.emblemContainer}>
          <Animated.View
            style={[
              styles.glowAura,
              {
                backgroundColor: colors.primary + '18',
                borderColor: colors.primary + '30',
              },
              animatedGlowStyle,
            ]}
          />
          <Animated.View
            style={[
              styles.iconCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                shadowColor: colors.primary,
              },
              animatedIconStyle,
            ]}
          >
            <View
              style={[
                styles.iconBadgeInner,
                { backgroundColor: colors.primary + '15' },
              ]}
            >
              <Fingerprint size={48} color={colors.primary} strokeWidth={2.2} />
            </View>
            <View
              style={[
                styles.floatingSparkle,
                { backgroundColor: colors.primaryLight, borderColor: colors.card },
              ]}
            >
              <Shield size={12} color="#ffffff" />
            </View>
          </Animated.View>
        </View>

        {/* Animated Brand & Government Office Title */}
        <Animated.View style={[styles.titleBlock, animatedTextStyle]}>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: colors.primary + '12', borderColor: colors.primary + '25' },
            ]}
          >
            <Sparkles size={11} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: 11 }]}>
              SpeedFace Cloud System
            </Text>
          </View>

          <Text
            style={[
              typography.h2,
              styles.mainTitle,
              { color: colors.textPrimary },
            ]}
          >
            Leave & Attendance
          </Text>

          <Text
            style={[
              typography.body2,
              styles.subtitle,
              { color: colors.textSecondary },
            ]}
            numberOfLines={2}
          >
            {orgName}
          </Text>
        </Animated.View>
      </View>

      {/* Footer Branded Spinner */}
      <Animated.View style={[styles.footerSpinner, animatedTextStyle]}>
        <LoadingSpinner
          size="md"
          color={colors.primary}
          label="Starting secure partition..."
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  ambientCircle: {
    position: 'absolute',
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emblemContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  glowAura: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
  },
  iconCard: {
    width: 96,
    height: 96,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  iconBadgeInner: {
    width: 74,
    height: 74,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    alignItems: 'center',
    marginTop: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  mainTitle: {
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 280,
  },
  footerSpinner: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
});
