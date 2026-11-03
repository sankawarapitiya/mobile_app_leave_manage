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
  User,
  Mail,
  Lock,
  Building,
  BadgeCheck,
  ShieldAlert,
  Shield,
  UserCheck,
  Fingerprint,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { CustomButton } from '../../components/CustomButton';
import { triggerHaptic } from '../../utils/haptics';
import { UserRole } from '../../types';

const registerSchema = z.object({
  fingerprintId: z.string().min(1, 'Biometric Fingerprint ID is required to link attendance'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z
    .string()
    .min(1, 'Please enter a work email or username')
    .refine((val) => val.trim().length >= 2, {
      message: 'Email or username must be at least 2 characters',
    }),
  password: z.string().min(6, 'Password / PIN must be at least 6 characters'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius } = useTheme();
  const {
    signup,
    error,
    clearError,
    currentOrgId,
    currentOrgName,
    lookupTerminalEmployee,
  } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [terminalEmployee, setTerminalEmployee] = useState<{
    name: string;
    department: string;
    employeeServiceId: string;
    role: string;
    userId: string;
  } | null>(null);
  const [isSearchingTerminal, setIsSearchingTerminal] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fingerprintId: '',
      fullName: '',
      email: '',
      password: '',
      department: 'General',
      designation: 'Staff Member',
    },
  });

  const watchFingerprintId = watch('fingerprintId');

  useEffect(() => {
    let isCancelled = false;
    const lookup = async () => {
      const cleanId = (watchFingerprintId || '').trim();
      if (!cleanId) {
        setTerminalEmployee(null);
        return;
      }
      setIsSearchingTerminal(true);
      try {
        const emp = await lookupTerminalEmployee(currentOrgId, cleanId);
        if (!isCancelled) {
          setTerminalEmployee(emp);
          if (emp) {
            triggerHaptic.selection();
            if (emp.name && !watch('fullName')) {
              setValue('fullName', emp.name, { shouldValidate: true });
            }
            if (emp.department) {
              setValue('department', emp.department, { shouldValidate: true });
            }
            if (emp.role) {
              setValue('designation', emp.role, { shouldValidate: true });
            }
            if (!watch('email')) {
              const safeSlug = (emp.name || '')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '')
                .slice(0, 15) || `emp${emp.userId}`;
              setValue('email', `${safeSlug}@lunugamwehera.gov.lk`, { shouldValidate: true });
            }
            if (!watch('password')) {
              setValue('password', '123456', { shouldValidate: true });
            }
          }
        }
      } catch {
        if (!isCancelled) setTerminalEmployee(null);
      } finally {
        if (!isCancelled) setIsSearchingTerminal(false);
      }
    };

    const timer = setTimeout(lookup, 350);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [watchFingerprintId, currentOrgId]);

  const onInvalid = (formErrors: any) => {
    triggerHaptic.error();
    const firstErr = Object.values(formErrors)[0] as any;
    if (firstErr?.message) {
      setLocalError(firstErr.message);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setLocalError(null);
    clearError();
    try {
      let finalEmail = data.email.trim().toLowerCase();
      if (!finalEmail.includes('@')) {
        finalEmail = `${finalEmail}@lunugamwehera.gov.lk`;
      }

      await signup(
        finalEmail,
        data.password.trim(),
        data.fullName.trim(),
        data.fingerprintId.trim(),
        selectedRole,
        data.department.trim(),
        data.designation.trim(),
        currentOrgId
      );
      triggerHaptic.success();
    } catch (err: any) {
      triggerHaptic.error();
      setLocalError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
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
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.textPrimary }]}>
            Create Account
          </Text>
          <Text style={[typography.body1, { color: colors.textSecondary, marginTop: 4 }]}>
            Join your organization leave portal
          </Text>
        </View>

        {(localError || error) ? (
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
            <ShieldAlert size={16} color={colors.danger} />
            <Text style={[typography.caption, { color: colors.danger, flex: 1, fontWeight: '600' }]}>
              {localError || error}
            </Text>
          </View>
        ) : null}

        {/* Organization Partition Badge */}
        <View
          style={[
            styles.orgNoticeBanner,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Building size={16} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
              {currentOrgName || 'DS Office Lunugamwehera'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Registering profile into Cloud Partition: {currentOrgId}
            </Text>
          </View>
        </View>

        {/* Role Selector Pill */}
        <View style={styles.inputGroup}>
          <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 8 }]}>
            Select Your Role
          </Text>
          <View style={styles.roleTabs}>
            <Pressable
              onPress={() => {
                triggerHaptic.selection();
                setSelectedRole('employee');
              }}
              style={[
                styles.roleTab,
                {
                  backgroundColor:
                    selectedRole === 'employee' ? colors.primary : colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <UserCheck
                size={16}
                color={selectedRole === 'employee' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  typography.subtitle2,
                  {
                    color: selectedRole === 'employee' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                Employee
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                triggerHaptic.selection();
                setSelectedRole('manager');
              }}
              style={[
                styles.roleTab,
                {
                  backgroundColor:
                    selectedRole === 'manager' ? colors.primary : colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Shield
                size={16}
                color={selectedRole === 'manager' ? '#FFFFFF' : colors.textSecondary}
              />
              <Text
                style={[
                  typography.subtitle2,
                  {
                    color: selectedRole === 'manager' ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                Manager
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.form}>
          {/* Fingerprint ID / Terminal Biometric ID */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Fingerprint size={16} color={colors.primary} />
              <Text style={[typography.subtitle2, { color: colors.textPrimary, fontWeight: '700' }]}>
                Fingerprint ID (Terminal Biometric User ID) *
              </Text>
            </View>
            <Controller
              control={control}
              name="fingerprintId"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: errors.fingerprintId ? colors.danger : colors.inputBorder,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Fingerprint size={18} color={colors.primary} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. 10 (Your SpeedFace Punch ID)"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="none"
                    style={[styles.textInput, { color: colors.textPrimary, fontWeight: '700' }]}
                  />
                  {isSearchingTerminal && <ActivityIndicator size="small" color={colors.primary} />}
                </View>
              )}
            />
            {errors.fingerprintId && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                {errors.fingerprintId.message}
              </Text>
            )}

            {/* Terminal Auto-Link Status Badge */}
            {terminalEmployee ? (
              <View
                style={[
                  styles.linkedTerminalBadge,
                  {
                    backgroundColor: colors.successBg,
                    borderColor: colors.success + '44',
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <BadgeCheck size={18} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.subtitle2, { color: colors.success, fontWeight: '800' }]}>
                    SpeedFace Staff Linked: {terminalEmployee.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                    Dept: {terminalEmployee.department} • Service ID: {terminalEmployee.employeeServiceId || 'EMP' + terminalEmployee.userId} • Attendance Linked
                  </Text>
                </View>
              </View>
            ) : watchFingerprintId ? (
              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]}>
                Biometric attendance punches matching ID "{watchFingerprintId}" will automatically link to this account
              </Text>
            ) : null}
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 6 }]}>
              Full Name
            </Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: errors.fullName ? colors.danger : colors.inputBorder,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <User size={18} color={colors.textTertiary} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Enter full name"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
              )}
            />
            {errors.fullName && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                {errors.fullName.message}
              </Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 6 }]}>
              Work Email
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: errors.email ? colors.danger : colors.inputBorder,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Mail size={18} color={colors.textTertiary} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="sarah@acme.corp"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
              )}
            />
            {errors.email && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                {errors.email.message}
              </Text>
            )}
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 6 }]}>
              Password
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: errors.password ? colors.danger : colors.inputBorder,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Lock size={18} color={colors.textTertiary} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Min 6 characters"
                    placeholderTextColor={colors.textTertiary}
                    secureTextEntry
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
              )}
            />
            {errors.password && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                {errors.password.message}
              </Text>
            )}
          </View>

          {/* Department */}
          <View style={styles.inputGroup}>
            <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 6 }]}>
              Department
            </Text>
            <Controller
              control={control}
              name="department"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: errors.department ? colors.danger : colors.inputBorder,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Building size={18} color={colors.textTertiary} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Engineering / Design / Sales"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
              )}
            />
            {errors.department && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                {errors.department.message}
              </Text>
            )}
          </View>

          {/* Designation */}
          <View style={styles.inputGroup}>
            <Text style={[typography.subtitle2, { color: colors.textSecondary, marginBottom: 6 }]}>
              Designation / Job Title
            </Text>
            <Controller
              control={control}
              name="designation"
              render={({ field: { onChange, onBlur, value } }) => (
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: errors.designation ? colors.danger : colors.inputBorder,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <BadgeCheck size={18} color={colors.textTertiary} />
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Senior Mobile Architect"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.textInput, { color: colors.textPrimary }]}
                  />
                </View>
              )}
            />
            {errors.designation && (
              <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>
                {errors.designation.message}
              </Text>
            )}
          </View>

          <CustomButton
            title="Create Account"
            size="lg"
            loading={isSubmitting}
            onPress={handleSubmit(onSubmit, onInvalid)}
            style={{ marginTop: 8 }}
          />
        </View>

        <View style={styles.footerRow}>
          <Text style={[typography.body2, { color: colors.textSecondary }]}>
            Already have an account?{' '}
          </Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={[typography.body2, { color: colors.primary, fontWeight: '700' }]}>
              Sign In
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
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 20,
  },
  orgNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  roleTabs: {
    flexDirection: 'row',
    gap: 12,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
  },
  form: {
    gap: 14,
  },
  inputGroup: {},
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  linkedTerminalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
});
