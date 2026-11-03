import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CustomButton } from '../../components/CustomButton';
import { authService } from '../../services/firebase/authService';
import { triggerHaptic } from '../../utils/haptics';

export const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async () => {
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await authService.sendPasswordReset(email);
      triggerHaptic.success();
      setIsSent(true);
    } catch (err: any) {
      triggerHaptic.error();
      setErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <View style={styles.topNav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.content}>
        {isSent ? (
          <View style={styles.successState}>
            <View
              style={[
                styles.successIconWrapper,
                {
                  backgroundColor: colors.successBg,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <CheckCircle2 size={54} color={colors.success} />
            </View>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              Check Your Inbox
            </Text>
            <Text
              style={[
                typography.body1,
                { color: colors.textSecondary, textAlign: 'center', marginTop: 8 },
              ]}
            >
              A password reset link has been dispatched to {email}. Follow the instructions to reset your password.
            </Text>
            <CustomButton
              title="Return to Sign In"
              onPress={() => navigation.navigate('Login')}
              style={{ marginTop: 24, width: '100%' }}
            />
          </View>
        ) : (
          <>
            <Text style={[typography.h1, { color: colors.textPrimary }]}>
              Reset Password
            </Text>
            <Text
              style={[typography.body1, { color: colors.textSecondary, marginTop: 8, marginBottom: 24 }]}
            >
              Enter your work email address and we'll send you a link to reset your credentials.
            </Text>

            {errorMsg ? (
              <Text style={[typography.caption, { color: colors.danger, marginBottom: 12 }]}>
                {errorMsg}
              </Text>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 6 }]}>
                Work Email
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Mail size={18} color={colors.textTertiary} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="sarah@acme.corp"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.textInput, { color: colors.textPrimary }]}
                />
              </View>
            </View>

            <CustomButton
              title="Send Reset Instructions"
              size="lg"
              loading={loading}
              onPress={handleReset}
              style={{ marginTop: 20 }}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topNav: {
    marginBottom: 20,
  },
  backBtn: {
    padding: 6,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  successState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  successIconWrapper: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },
});
