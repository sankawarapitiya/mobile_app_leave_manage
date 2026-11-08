import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Shield,
  Briefcase,
  Moon,
  Sun,
  Database,
  LogOut,
  RefreshCw,
  Mail,
  Building,
  Building2,
  CheckCircle2,
  Fingerprint,
  Users,
  ChevronRight,
} from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { leaveService } from '../../services/firebase/leaveService';
import { CustomButton } from '../../components/CustomButton';
import { triggerHaptic } from '../../utils/haptics';

export const ProfileScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius, isDark, colorSchemeMode, setColorSchemeMode, elevation } =
    useTheme();
  const {
    user,
    activeRole,
    switchRole,
    logout,
    currentOrgId,
    currentOrgName,
    availableOrganizations,
    switchOrganization,
  } = useAuthStore();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const isUserAdmin =
    (user?.designation || '').toLowerCase().includes('admin') ||
    (user?.role || '').toLowerCase() === 'manager' ||
    (user?.designation || '').toLowerCase().includes('manager');

  const handleRoleToggle = (role: 'employee' | 'manager') => {
    if (isUserAdmin) return;
    triggerHaptic.medium();
    switchRole(role);
  };

  const handleSignOut = () => {
    triggerHaptic.medium();
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = async () => {
    triggerHaptic.selection();
    setShowSignOutConfirm(false);
    await logout();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Math.max(insets.top, 16) + 12,
        },
      ]}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Profile Card Header */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.xl,
            },
          ]}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.largeAvatar} />
          ) : (
            <View style={[styles.largeAvatarFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.largeAvatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
            </View>
          )}

          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: 12 }]}>
            {user?.fullName}
          </Text>

          <View style={styles.metaRow}>
            <Mail size={13} color={colors.textSecondary} />
            <Text style={[typography.body2, { color: colors.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Building size={13} color={colors.textSecondary} />
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {user?.department} • {user?.designation}
            </Text>
          </View>

          {/* Current Role Indicator Badge */}
          <View
            style={[
              styles.currentRoleBadge,
              {
                backgroundColor:
                  activeRole === 'manager' ? colors.primaryLight : colors.secondary,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            {activeRole === 'manager' ? (
              <Shield size={13} color="#FFFFFF" />
            ) : (
              <User size={13} color="#FFFFFF" />
            )}
            <Text style={[typography.caption, { color: '#FFFFFF', fontWeight: '700' }]}>
              ACTIVE ROLE: {String(activeRole || 'USER').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Organization & Cloud Sync Section */}
        <View
          style={[
            styles.orgDetailCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <View style={styles.orgHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Building2 size={18} color={colors.primary} />
              <Text style={[typography.subtitle1, { color: colors.textPrimary }]}>
                Organization Partition
              </Text>
            </View>
            <View
              style={[
                styles.cloudActivePill,
                { backgroundColor: colors.successBg, borderRadius: borderRadius.full },
              ]}
            >
              <CheckCircle2 size={11} color={colors.success} />
              <Text style={[typography.caption, { color: colors.success, fontWeight: '700', fontSize: 10 }]}>
                Cloud Synced
              </Text>
            </View>
          </View>

          <View style={styles.orgInfoGrid}>
            <View style={styles.orgInfoItem}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Organization</Text>
              <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                {user?.orgName || currentOrgName || 'DS Office Lunugamwehera'}
              </Text>
            </View>

            <View style={styles.orgInfoItem}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Partition ID</Text>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                {user?.orgId || currentOrgId}
              </Text>
            </View>

            {(user?.fingerprintId || user?.fingerprint_id || user?.rawUserId || user?.employeeServiceId) && (
              <View style={styles.orgInfoItem}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>Biometric Fingerprint ID</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[typography.subtitle2, { color: colors.primary, fontWeight: '700' }]}>
                    #{user.fingerprintId || user.fingerprint_id || user.rawUserId}
                  </Text>
                  {user.attendanceLinked && (
                    <Text style={[typography.caption, { color: colors.success, fontWeight: '600', fontSize: 10 }]}>
                      • Attendance Linked ✓
                    </Text>
                  )}
                </View>
                {user.employeeServiceId && (
                  <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 11 }]}>
                    Service ID: {user.employeeServiceId}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.orgInfoItem}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>Cloud Project</Text>
              <Text style={[typography.caption, { color: colors.textTertiary }]}>
                officeattendancesystem-ddae3
              </Text>
            </View>
          </View>

          {availableOrganizations.length > 1 && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 }}>
              <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6 }]}>
                Switch Organization:
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {availableOrganizations.map((org) => (
                  <Pressable
                    key={org.orgId}
                    onPress={() => {
                      triggerHaptic.selection();
                      switchOrganization(org.orgId, org.organizationName);
                    }}
                    style={[
                      styles.orgSwitchBtn,
                      {
                        backgroundColor:
                          currentOrgId === org.orgId ? colors.primary : colors.surfaceSubtle,
                        borderColor: colors.border,
                        borderRadius: borderRadius.sm,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: currentOrgId === org.orgId ? '#FFFFFF' : colors.textPrimary,
                          fontWeight: '600',
                          fontSize: 11,
                        },
                      ]}
                    >
                      {org.organizationName}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Setting 1: Switch Active Role */}
        {/* Role View Status */}
        <View style={styles.section}>
          <Text style={[typography.subtitle1, { color: colors.textPrimary, marginBottom: 8 }]}>
            Active Role View
          </Text>
          {isUserAdmin ? (
            <View style={{ gap: 10 }}>
              <View
                style={[
                  styles.roleToggleBtn,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                    borderRadius: borderRadius.md,
                    width: '100%',
                  },
                ]}
              >
                <Shield size={16} color="#FFFFFF" />
                <Text
                  style={[
                    typography.subtitle2,
                    { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  Administrator Access • Locked to Manager View
                </Text>
              </View>

              {/* Quick shortcut to Mobile App User Management */}
              <Pressable
                onPress={() => {
                  triggerHaptic.selection();
                  if (navigation) {
                    navigation.navigate('Approvals', { initialTab: 'users' });
                  }
                }}
                style={[
                  styles.adminShortcutBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View
                    style={[
                      styles.adminShortcutIcon,
                      {
                        backgroundColor: colors.primaryLight + '20',
                        borderRadius: borderRadius.sm,
                      },
                    ]}
                  >
                    <Users size={18} color={colors.primaryLight} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        typography.subtitle2,
                        { color: colors.textPrimary, fontWeight: '700' },
                      ]}
                    >
                      Manage Employees & Mobile Access
                    </Text>
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textSecondary },
                      ]}
                    >
                      View all staff, enable mobile login, set PINs, or edit roles
                    </Text>
                  </View>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={styles.roleToggleRow}>
              <Pressable
                onPress={() => handleRoleToggle('employee')}
                style={[
                  styles.roleToggleBtn,
                  {
                    backgroundColor:
                      activeRole === 'employee' ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <User size={16} color={activeRole === 'employee' ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[
                    typography.subtitle2,
                    { color: activeRole === 'employee' ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  Employee View
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleRoleToggle('manager')}
                style={[
                  styles.roleToggleBtn,
                  {
                    backgroundColor:
                      activeRole === 'manager' ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Shield size={16} color={activeRole === 'manager' ? '#FFFFFF' : colors.textSecondary} />
                <Text
                  style={[
                    typography.subtitle2,
                    { color: activeRole === 'manager' ? '#FFFFFF' : colors.textPrimary },
                  ]}
                >
                  Manager View
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Theme Appearance */}
        <View style={styles.section}>
          <Text style={[typography.subtitle1, { color: colors.textPrimary, marginBottom: 8 }]}>
            Theme & Appearance
          </Text>
          <View style={styles.themeToggleRow}>
            {(['system', 'light', 'dark'] as const).map((mode) => {
              const isSelected = colorSchemeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    triggerHaptic.selection();
                    setColorSchemeMode(mode);
                  }}
                  style={[
                    styles.themeModeBtn,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.card,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isSelected ? '#FFFFFF' : colors.textPrimary,
                        fontWeight: '700',
                        textTransform: 'capitalize',
                      },
                    ]}
                  >
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <CustomButton
            title="Sign Out"
            variant="danger"
            icon={<LogOut size={16} color="#FFFFFF" />}
            onPress={handleSignOut}
          />
        </View>
      </ScrollView>

      {/* Cross-Platform Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.xl,
                ...elevation.lg,
                shadowColor: colors.shadowColor,
              },
            ]}
          >
            <View
              style={[
                styles.modalIconWrap,
                { backgroundColor: colors.dangerBg, borderRadius: borderRadius.full },
              ]}
            >
              <LogOut size={24} color={colors.danger} />
            </View>

            <Text
              style={[
                typography.h3,
                { color: colors.textPrimary, marginTop: 12, textAlign: 'center' },
              ]}
            >
              Sign Out
            </Text>
            <Text
              style={[
                typography.body2,
                { color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
              ]}
            >
              Are you sure you want to sign out of {user?.orgName || currentOrgName || 'the attendance system'}?
            </Text>

            <View style={styles.modalActionsRow}>
              <Pressable
                onPress={() => setShowSignOutConfirm(false)}
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.surfaceSubtle,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                onPress={confirmSignOut}
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: colors.danger,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Text style={[typography.subtitle2, { color: '#FFFFFF', fontWeight: '700' }]}>
                  Yes, Sign Out
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  largeAvatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeAvatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  currentRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
  },
  section: {
    marginBottom: 24,
  },
  roleToggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
  },
  personaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  personaBtn: {
    flex: 1,
    padding: 12,
    gap: 2,
  },
  themeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  themeModeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
  },
  orgDetailCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  orgHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cloudActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  orgInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  orgInfoItem: {
    minWidth: '45%',
    flex: 1,
    gap: 2,
  },
  orgSwitchBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  modalConfirmBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  adminShortcutBtn: {
    padding: 12,
    borderWidth: 1,
  },
  adminShortcutIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
