import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Moon, Sun, Bell, Shield, User, LogOut } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { triggerHaptic } from '../utils/haptics';

export const AnimatedHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, typography, isDark, toggleTheme, borderRadius, elevation } = useTheme();
  const { user, activeRole, switchRole, logout, currentOrgName } = useAuthStore();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const isUserAdmin =
    (user?.designation || '').toLowerCase().includes('admin') ||
    (user?.role || '').toLowerCase() === 'manager' ||
    (user?.designation || '').toLowerCase().includes('manager');

  const handleRoleToggle = () => {
    if (isUserAdmin) {
      // Admin is strictly locked to Manager view
      return;
    }
    triggerHaptic.medium();
    const nextRole = activeRole === 'employee' ? 'manager' : 'employee';
    switchRole(nextRole);
  };

  const handleThemeToggle = () => {
    triggerHaptic.selection();
    toggleTheme();
  };

  const handleLogoutPress = () => {
    triggerHaptic.medium();
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    triggerHaptic.selection();
    setShowLogoutModal(false);
    await logout();
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 12) + 8,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        {/* User Info Left */}
        <View style={styles.userProfile}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitials}>
                {user?.fullName?.charAt(0) || 'U'}
              </Text>
            </View>
          )}

          <View style={styles.nameBlock}>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {getGreeting()},
            </Text>
            <Text
              numberOfLines={1}
              style={[typography.h3, { color: colors.textPrimary }]}
            >
              {user?.fullName || 'Colleague'}
            </Text>
            <View
              style={[
                styles.deptBadge,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderRadius: borderRadius.sm,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10 }]}>
                {user?.department || 'Engineering'} • {user?.designation || 'Specialist'}
              </Text>
            </View>
          </View>
        </View>

        {/* Right Controls: Role Badge & Theme Switch */}
        <View style={styles.controlsRow}>
          {/* Role Badge (Locked to Manager View for Admin) */}
          <Pressable
            onPress={handleRoleToggle}
            disabled={isUserAdmin}
            style={[
              styles.rolePill,
              {
                backgroundColor:
                  activeRole === 'manager' || isUserAdmin
                    ? colors.primaryLight
                    : colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.full,
                opacity: isUserAdmin ? 0.95 : 1,
              },
            ]}
          >
            {activeRole === 'manager' || isUserAdmin ? (
              <Shield size={12} color="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <User size={12} color={colors.textSecondary} strokeWidth={2.5} />
            )}
            <Text
              style={[
                typography.caption,
                {
                  color:
                    activeRole === 'manager' || isUserAdmin
                      ? '#FFFFFF'
                      : colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 11,
                  textTransform: 'capitalize',
                },
              ]}
            >
              {isUserAdmin ? 'Admin View' : activeRole}
            </Text>
          </Pressable>

          {/* Theme Toggle Button */}
          <Pressable
            onPress={handleThemeToggle}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            {isDark ? (
              <Sun size={17} color={colors.warning} />
            ) : (
              <Moon size={17} color={colors.textSecondary} />
            )}
          </Pressable>

          {/* Quick Logout Button */}
          <Pressable
            onPress={handleLogoutPress}
            style={[
              styles.iconBtn,
              {
                backgroundColor: colors.surfaceSubtle,
                borderRadius: borderRadius.full,
              },
            ]}
          >
            <LogOut size={16} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
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
                onPress={() => setShowLogoutModal(false)}
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
                onPress={handleConfirmLogout}
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
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  nameBlock: {
    flex: 1,
  },
  deptBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
});
