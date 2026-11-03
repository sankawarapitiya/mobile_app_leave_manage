import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, ShieldCheck, Users, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CustomButton } from '../../components/CustomButton';
import { triggerHaptic } from '../../utils/haptics';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  description: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    title: 'Effortless Leave Tracking',
    description:
      'View your real-time annual, sick, and casual balances with animated progress rings and automated working days calculation.',
    Icon: CalendarCheck,
    color: '#4F46E5',
  },
  {
    id: '2',
    title: 'One-Tap Manager Approvals',
    description:
      'Review pending requests instantly with atomic Firestore updates and smart conflict detection for overlapping team leaves.',
    Icon: ShieldCheck,
    color: '#0EA5E9',
  },
  {
    id: '3',
    title: 'Team Availability at a Glance',
    description:
      'Sync with your department calendar to see who is away before scheduling important sprint releases.',
    Icon: Users,
    color: '#10B981',
  },
];

export const OnboardingScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    triggerHaptic.light();
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    triggerHaptic.light();
    navigation.replace('Login');
  };

  const currentSlide = SLIDES[currentIndex];
  const IconComponent = currentSlide.Icon;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      {/* Top Skip Button */}
      <View style={styles.topBar}>
        <View />
        <Pressable onPress={handleSkip} style={styles.skipBtn}>
          <Text style={[typography.subtitle2, { color: colors.textSecondary }]}>
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Main Slide Content */}
      <View style={styles.slideArea}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: `${currentSlide.color}15`,
              borderRadius: borderRadius.xxl,
            },
          ]}
        >
          <IconComponent size={72} color={currentSlide.color} />
        </View>

        <Text
          style={[
            typography.h1,
            styles.title,
            { color: colors.textPrimary, textAlign: 'center' },
          ]}
        >
          {currentSlide.title}
        </Text>

        <Text
          style={[
            typography.body1,
            styles.description,
            { color: colors.textSecondary, textAlign: 'center' },
          ]}
        >
          {currentSlide.description}
        </Text>

        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? currentSlide.color : colors.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Bottom Action Button */}
      <View style={styles.bottomArea}>
        <CustomButton
          title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          size="lg"
          onPress={handleNext}
          icon={<ArrowRight size={18} color="#FFFFFF" />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipBtn: {
    padding: 8,
  },
  slideArea: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconWrapper: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: {
    marginBottom: 14,
  },
  description: {
    marginBottom: 28,
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomArea: {
    paddingTop: 12,
  },
});
