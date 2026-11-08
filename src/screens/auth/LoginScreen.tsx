import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  Fingerprint,
  CheckCircle2,
  ShieldAlert,
  ChevronDown,
  User,
  Sparkles,
  ArrowRight,
  Database,
  Building,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { CustomButton } from '../../components/CustomButton';
import { triggerHaptic } from '../../utils/haptics';
import { OrganizationInfo } from '../../types';

const portalSchema = z.object({
  orgId: z.string().min(2, 'Organization ID / Code is required'),
  identifier: z.string().min(1, 'Please enter your work email, user ID, or service ID'),
  password: z.string().min(3, 'Password or PIN is required'),
});

type PortalFormData = z.infer<typeof portalSchema>;

export const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius, isDark, elevation } = useTheme();
  const {
    login,
    error,
    clearError,
    currentOrgId,
    availableOrganizations,
    loadAvailableOrganizations,
    verifyOrg,
  } = useAuthStore();

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [verifiedOrg, setVerifiedOrg] = useState<OrganizationInfo | null>(null);
  const [isVerifyingOrg, setIsVerifyingOrg] = useState(false);
  const [focusedField, setFocusedField] = useState<'identifier' | 'password' | 'orgId' | null>(
    null
  );

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PortalFormData>({
    resolver: zodResolver(portalSchema),
    defaultValues: {
      orgId: currentOrgId || 'DSOFFICE_LUNUGAMWEHERA',
      identifier: '',
      password: '',
    },
  });

  const watchOrgId = watch('orgId');

  useEffect(() => {
    loadAvailableOrganizations();
  }, []);

  // Verify organization whenever orgId changes
  useEffect(() => {
    let isCancelled = false;
    const checkOrg = async () => {
      if (!watchOrgId || watchOrgId.trim().length < 2) {
        setVerifiedOrg(null);
        return;
      }
      setIsVerifyingOrg(true);
      try {
        const found = await verifyOrg(watchOrgId.trim());
        if (!isCancelled) {
          setVerifiedOrg(found);
        }
      } catch {
        if (!isCancelled) setVerifiedOrg(null);
      } finally {
        if (!isCancelled) setIsVerifyingOrg(false);
      }
    };

    const timer = setTimeout(checkOrg, 300);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [watchOrgId]);

  const onSubmit = async (data: PortalFormData) => {
    setIsSubmitting(true);
    clearError();
    try {
      await login(data.identifier, data.password, data.orgId.trim());
      triggerHaptic.success();
    } catch {
      triggerHaptic.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOrg = (orgId: string) => {
    triggerHaptic.selection();
    setValue('orgId', orgId, { shouldValidate: true });
    setShowOrgPicker(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Portal Brand Header */}
        <View style={styles.portalHeader}>
          <View
            style={[
              styles.portalBadgeWrap,
              {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.xl,
              },
            ]}
          >
            <View style={styles.badgeIconsRow}>
              <Building2 size={24} color="#FFFFFF" />
              <Fingerprint size={24} color="#FFFFFF" />
            </View>
          </View>

          <Text style={[typography.h1, { color: colors.textPrimary, marginTop: 14, textAlign: 'center' }]}>
            Attendance Access Portal
          </Text>
          <Text style={[typography.body2, { color: colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 16 }]}>
            Enter organization details to access real-time biometric attendance and leave management
          </Text>

          {/* Cloud Backend Live Tag */}
          <View
            style={[
              styles.cloudTag,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
            <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
              Cloud Firestore: <Text style={{ color: colors.primary, fontWeight: '700' }}>officeattendancesystem-ddae3</Text>
            </Text>
          </View>
        </View>

        {/* Global Error Notice */}
        {error ? (
          <View
            style={[
              styles.errorBanner,
              {
                backgroundColor: colors.dangerBg,
                borderColor: colors.danger,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <ShieldAlert size={18} color={colors.danger} />
            <Text style={[typography.caption, { color: colors.danger, flex: 1, fontWeight: '600' }]}>
              {error}
            </Text>
          </View>
        ) : null}

        {/* Form Container */}
        <View style={styles.formContent}>
          {/* STEP 1: ORGANIZATION DETAILS CARD */}
          <View
            style={[
              styles.stepCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                ...elevation.sm,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <View style={styles.stepCardHeader}>
              <View
                style={[
                  styles.stepNumberBadge,
                  { backgroundColor: colors.primaryLight + '22', borderRadius: borderRadius.full },
                ]}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>
                  1
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
                  Organization Details
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Specify your office partition code or select a registered office
                </Text>
              </View>
            </View>

            {/* Organization Code Input */}
            <View style={styles.inputWrapper}>
              <Controller
                control={control}
                name="orgId"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor:
                          errors.orgId
                            ? colors.danger
                            : focusedField === 'orgId'
                            ? colors.inputFocusBorder
                            : colors.inputBorder,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Building2
                      size={18}
                      color={focusedField === 'orgId' ? colors.primary : colors.textTertiary}
                    />
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField('orgId')}
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                      placeholder="e.g. DSOFFICE_LUNUGAMWEHERA"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      style={[styles.textInput, { color: colors.textPrimary, fontWeight: '600' }]}
                    />

                    {isVerifyingOrg ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Pressable
                        onPress={() => setShowOrgPicker(!showOrgPicker)}
                        style={[
                          styles.browseBtn,
                          {
                            backgroundColor: colors.surfaceSubtle,
                            borderRadius: borderRadius.sm,
                          },
                        ]}
                      >
                        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                          Browse
                        </Text>
                        <ChevronDown size={14} color={colors.primary} />
                      </Pressable>
                    )}
                  </View>
                )}
              />
              {errors.orgId && (
                <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                  {errors.orgId.message}
                </Text>
              )}
            </View>

            {/* Fast Quick-Select Chips */}
            <View style={styles.orgChipsRow}>
              <Pressable
                onPress={() => handleSelectOrg('DSOFFICE_LUNUGAMWEHERA')}
                style={[
                  styles.orgChip,
                  {
                    backgroundColor:
                      watchOrgId === 'DSOFFICE_LUNUGAMWEHERA'
                        ? colors.primaryLight + '22'
                        : colors.surfaceSubtle,
                    borderColor:
                      watchOrgId === 'DSOFFICE_LUNUGAMWEHERA' ? colors.primary : colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Building size={12} color={colors.primary} />
                <Text
                  style={[
                    typography.caption,
                    {
                      color:
                        watchOrgId === 'DSOFFICE_LUNUGAMWEHERA'
                          ? colors.primary
                          : colors.textSecondary,
                      fontWeight: '700',
                    },
                  ]}
                >
                  DS Office Lunugamwehera
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleSelectOrg('DSOFFICE_TISSAMAHARAMA')}
                style={[
                  styles.orgChip,
                  {
                    backgroundColor:
                      watchOrgId === 'DSOFFICE_TISSAMAHARAMA'
                        ? colors.primaryLight + '22'
                        : colors.surfaceSubtle,
                    borderColor:
                      watchOrgId === 'DSOFFICE_TISSAMAHARAMA' ? colors.primary : colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Building size={12} color={colors.textSecondary} />
                <Text
                  style={[
                    typography.caption,
                    {
                      color:
                        watchOrgId === 'DSOFFICE_TISSAMAHARAMA'
                          ? colors.primary
                          : colors.textSecondary,
                      fontWeight: '600',
                    },
                  ]}
                >
                  DS Office Tissamaharama
                </Text>
              </Pressable>
            </View>

            {/* Dropdown Menu for Browse */}
            {showOrgPicker && (
              <View
                style={[
                  styles.orgDropdown,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textTertiary, padding: 8, fontWeight: '700' },
                  ]}
                >
                  SELECT REGISTERED CLOUD PARTITION:
                </Text>
                {availableOrganizations.map((org) => (
                  <Pressable
                    key={org.orgId}
                    onPress={() => handleSelectOrg(org.orgId)}
                    style={[
                      styles.dropdownItem,
                      {
                        backgroundColor:
                          watchOrgId === org.orgId ? colors.surfaceSubtle : 'transparent',
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                        {org.organizationName}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        Partition Code: {org.orgId} {org.totalEmployees ? `• ${org.totalEmployees} staff` : ''}
                      </Text>
                    </View>
                    {watchOrgId === org.orgId && (
                      <CheckCircle2 size={16} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Dynamic Organization Status Box */}
            {verifiedOrg ? (
              <View
                style={[
                  styles.verifiedCard,
                  {
                    backgroundColor: colors.successBg,
                    borderColor: colors.success + '44',
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <View style={styles.verifiedHeader}>
                  <CheckCircle2 size={16} color={colors.success} />
                  <Text style={[typography.subtitle2, { color: colors.success, fontWeight: '700' }]}>
                    Verified Cloud Organization
                  </Text>
                </View>
                <Text style={[typography.subtitle1, { color: colors.textPrimary, marginTop: 2 }]}>
                  {verifiedOrg.organizationName}
                </Text>
                <View style={styles.verifiedMetaRow}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Partition: <Text style={{ fontWeight: '700' }}>{verifiedOrg.orgId}</Text>
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    • 202 Registered Employees
                  </Text>
                </View>
              </View>
            ) : watchOrgId ? (
              <View
                style={[
                  styles.unverifiedNotice,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Connecting to partition: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{watchOrgId}</Text>
                </Text>
              </View>
            ) : null}
          </View>

          {/* STEP 2: STAFF CREDENTIALS CARD */}
          <View
            style={[
              styles.stepCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                ...elevation.sm,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <View style={styles.stepCardHeader}>
              <View
                style={[
                  styles.stepNumberBadge,
                  { backgroundColor: colors.primaryLight + '22', borderRadius: borderRadius.full },
                ]}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '800' }]}>
                  2
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
                  Staff Authentication
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  Enter your biometric user ID, service ID, or work email
                </Text>
              </View>
            </View>

            {/* User ID / Work Email */}
            <View style={styles.inputWrapper}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '600' }]}>
                Biometric ID / Service ID / Work Email
              </Text>
              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor:
                          errors.identifier
                            ? colors.danger
                            : focusedField === 'identifier'
                            ? colors.inputFocusBorder
                            : colors.inputBorder,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <User
                      size={18}
                      color={focusedField === 'identifier' ? colors.primary : colors.textTertiary}
                    />
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField('identifier')}
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                      placeholder="e.g. 2, 43, EMP003, or admin"
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                      style={[styles.textInput, { color: colors.textPrimary }]}
                    />
                  </View>
                )}
              />
              {errors.identifier && (
                <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                  {errors.identifier.message}
                </Text>
              )}
            </View>

            {/* Password or Terminal PIN */}
            <View style={styles.inputWrapper}>
              <View style={styles.passwordLabelRow}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                  Mobile PIN or Password
                </Text>
                <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                    Forgot?
                  </Text>
                </Pressable>
              </View>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputContainer,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor:
                          errors.password
                            ? colors.danger
                            : focusedField === 'password'
                            ? colors.inputFocusBorder
                            : colors.inputBorder,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Lock
                      size={18}
                      color={focusedField === 'password' ? colors.primary : colors.textTertiary}
                    />
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => {
                        onBlur();
                        setFocusedField(null);
                      }}
                      placeholder="Enter 4-6 digit PIN or password"
                      placeholderTextColor={colors.textTertiary}
                      secureTextEntry={!showPassword}
                      style={[styles.textInput, { color: colors.textPrimary }]}
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color={colors.textTertiary} />
                      ) : (
                        <Eye size={18} color={colors.textTertiary} />
                      )}
                    </Pressable>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Connect & Access Attendance Button */}
            <CustomButton
              title="Access Attendance & Leaves"
              size="lg"
              loading={isSubmitting}
              icon={<Fingerprint size={18} color="#FFFFFF" />}
              onPress={handleSubmit(onSubmit)}
              style={{ marginTop: 8 }}
            />
          </View>
        </View>

        {/* Footer Link */}
        <View style={styles.footerRow}>
          <Text style={[typography.body2, { color: colors.textSecondary }]}>
            New staff member?{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={[typography.body2, { color: colors.primary, fontWeight: '700' }]}>
              Register Profile
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
  },
  portalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  portalBadgeWrap: {
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cloudTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    marginTop: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  formContent: {
    gap: 16,
  },
  stepCard: {
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {},
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 48,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
  },
  browseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  orgChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  orgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  orgDropdown: {
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  verifiedCard: {
    padding: 12,
    borderWidth: 1,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  verifiedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  unverifiedNotice: {
    padding: 10,
    borderWidth: 1,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  eyeBtn: {
    padding: 6,
  },
  presetsCard: {
    marginTop: 4,
  },
  presetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
  },
  presetAvatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
});
