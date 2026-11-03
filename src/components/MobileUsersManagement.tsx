import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  Users,
  Search,
  Shield,
  User,
  Fingerprint,
  Mail,
  Building,
  BadgeCheck,
  Edit2,
  Trash2,
  X,
  Check,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { UserProfile, UserRole } from '../types';
import { CustomButton } from './CustomButton';
import { triggerHaptic } from '../utils/haptics';

export const MobileUsersManagement: React.FC = () => {
  const { colors, typography, borderRadius, elevation } = useTheme();
  const {
    user: currentUser,
    currentOrgId,
    currentOrgName,
    mobileAppUsers,
    loadMobileAppUsers,
    updateMobileAppUser,
    deleteMobileAppUser,
    lookupTerminalEmployee,
  } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'employee' | 'manager'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Edit Modal State
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editFingerprintId, setEditFingerprintId] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [isSaving, setIsSaving] = useState(false);

  // Delete Confirm State
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadMobileAppUsers();
  }, [currentOrgId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    triggerHaptic.selection();
    await loadMobileAppUsers();
    setRefreshing(false);
  };

  const handleOpenEdit = (targetUser: UserProfile) => {
    triggerHaptic.selection();
    setSelectedUser(targetUser);
    setEditFullName(targetUser.fullName || '');
    setEditDepartment(targetUser.department || 'General');
    setEditDesignation(targetUser.designation || 'Staff Member');
    setEditFingerprintId(targetUser.fingerprintId || targetUser.fingerprint_id || '');
    setEditRole(targetUser.role || 'employee');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await updateMobileAppUser(selectedUser.uid, {
        fullName: editFullName.trim(),
        department: editDepartment.trim(),
        designation: editDesignation.trim(),
        fingerprintId: editFingerprintId.trim(),
        role: editRole,
      });
      triggerHaptic.success();
      setEditModalVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      triggerHaptic.error();
      Alert.alert('Update Error', err.message || 'Failed to update user profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptDelete = (targetUser: UserProfile) => {
    triggerHaptic.warning();
    setUserToDelete(targetUser);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMobileAppUser(userToDelete.uid);
      triggerHaptic.success();
      setDeleteModalVisible(false);
      setUserToDelete(null);
    } catch (err: any) {
      triggerHaptic.error();
      Alert.alert('Delete Error', err.message || 'Failed to remove user');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = mobileAppUsers.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.fingerprintId || u.fingerprint_id || '').toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q) ||
      u.designation.toLowerCase().includes(q);

    const matchRole =
      roleFilter === 'all' ||
      (roleFilter === 'manager' && (u.role === 'manager' || u.designation.toLowerCase().includes('admin'))) ||
      (roleFilter === 'employee' && u.role === 'employee' && !u.designation.toLowerCase().includes('admin'));

    return matchQuery && matchRole;
  });

  const employeeCount = mobileAppUsers.filter(
    (u) => u.role === 'employee' && !u.designation.toLowerCase().includes('admin')
  ).length;
  const managerCount = mobileAppUsers.filter(
    (u) => u.role === 'manager' || u.designation.toLowerCase().includes('admin')
  ).length;

  return (
    <View style={styles.container}>
      {/* Search & Statistics Bar */}
      <View style={styles.topBar}>
        <View
          style={[
            styles.searchContainer,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <Search size={16} color={colors.textTertiary} />
          <TextInput
            placeholder="Search by name, ID, email, or dept..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={16} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={handleRefresh}
          style={[
            styles.refreshBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          <RefreshCw size={15} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Role Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setRoleFilter('all')}
          style={[
            styles.filterChip,
            {
              backgroundColor: roleFilter === 'all' ? colors.primary : colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: roleFilter === 'all' ? '#FFFFFF' : colors.textSecondary,
                fontWeight: '700',
              },
            ]}
          >
            All Users ({mobileAppUsers.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setRoleFilter('employee')}
          style={[
            styles.filterChip,
            {
              backgroundColor: roleFilter === 'employee' ? colors.primary : colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: roleFilter === 'employee' ? '#FFFFFF' : colors.textSecondary,
                fontWeight: '700',
              },
            ]}
          >
            Staff ({employeeCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setRoleFilter('manager')}
          style={[
            styles.filterChip,
            {
              backgroundColor: roleFilter === 'manager' ? colors.primary : colors.card,
              borderColor: colors.border,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color: roleFilter === 'manager' ? '#FFFFFF' : colors.textSecondary,
                fontWeight: '700',
              },
            ]}
          >
            Admins / Managers ({managerCount})
          </Text>
        </Pressable>
      </View>

      {/* Users List */}
      <ScrollView
        contentContainerStyle={{ gap: 10, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredUsers.map((u) => {
          const isManager =
            u.role === 'manager' || u.designation.toLowerCase().includes('admin');
          const fpId = u.fingerprintId || u.fingerprint_id || '';
          const isSelf = currentUser?.uid === u.uid;

          return (
            <View
              key={u.uid}
              style={[
                styles.userCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                  ...elevation.sm,
                },
              ]}
            >
              {/* Card Top: Avatar, Name, Designation & Role */}
              <View style={styles.cardHeader}>
                <View
                  style={[
                    styles.avatar,
                    {
                      backgroundColor: isManager ? colors.primaryLight : colors.secondary,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    {u.fullName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text
                      style={[
                        typography.subtitle1,
                        { color: colors.textPrimary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
                    >
                      {u.fullName}
                    </Text>
                    {isSelf && (
                      <View
                        style={[
                          styles.selfTag,
                          { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.xs },
                        ]}
                      >
                        <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 9, fontWeight: '700' }]}>
                          YOU
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {u.designation} • {u.department}
                  </Text>
                </View>

                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: isManager ? colors.primaryLight + '22' : colors.surfaceSubtle,
                      borderColor: isManager ? colors.primaryLight : colors.border,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  {isManager ? (
                    <Shield size={11} color={colors.primaryLight} />
                  ) : (
                    <User size={11} color={colors.textSecondary} />
                  )}
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isManager ? colors.primaryLight : colors.textSecondary,
                        fontWeight: '700',
                        fontSize: 10,
                        textTransform: 'capitalize',
                      },
                    ]}
                  >
                    {u.role}
                  </Text>
                </View>
              </View>

              {/* Card Details: Biometric ID & Email */}
              <View style={styles.cardDetails}>
                <View
                  style={[
                    styles.infoPill,
                    {
                      backgroundColor: fpId ? colors.successBg : colors.surfaceSubtle,
                      borderRadius: borderRadius.sm,
                    },
                  ]}
                >
                  <Fingerprint size={12} color={fpId ? colors.success : colors.textTertiary} />
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: fpId ? colors.success : colors.textSecondary,
                        fontWeight: '600',
                        fontSize: 11,
                      },
                    ]}
                  >
                    {fpId ? `Biometric ID #${fpId} (Attendance Linked)` : 'No Biometric ID Linked'}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Mail size={12} color={colors.textTertiary} />
                  <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                    {u.email}
                  </Text>
                </View>
              </View>

              {/* Card Actions: Edit & Revoke */}
              <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
                <Pressable
                  onPress={() => handleOpenEdit(u)}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: colors.surfaceSubtle,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  <Edit2 size={13} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                    Edit Role & Profile
                  </Text>
                </Pressable>

                {!isSelf && (
                  <Pressable
                    onPress={() => handlePromptDelete(u)}
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: colors.dangerBg,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Trash2 size={13} color={colors.danger} />
                    <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>
                      Revoke Access
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {filteredUsers.length === 0 && (
          <View
            style={[
              styles.emptyState,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <Users size={32} color={colors.textTertiary} />
            <Text style={[typography.subtitle1, { color: colors.textPrimary, marginTop: 8 }]}>
              No Mobile Users Found
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
              {searchQuery
                ? 'No users match your search query.'
                : 'No mobile app accounts registered yet in this organization.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* EDIT USER MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.xl,
                ...elevation.md,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[typography.h3, { color: colors.textPrimary }]}>
                  Edit User Account
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {selectedUser?.email}
                </Text>
              </View>
              <Pressable onPress={() => setEditModalVisible(false)}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Role Selector */}
              <View style={styles.inputField}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, fontWeight: '700' }]}>
                  USER ROLE & PERMISSIONS
                </Text>
                <View style={styles.rolePickerRow}>
                  <Pressable
                    onPress={() => setEditRole('employee')}
                    style={[
                      styles.rolePickerOption,
                      {
                        backgroundColor: editRole === 'employee' ? colors.primary : colors.surfaceSubtle,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <User size={14} color={editRole === 'employee' ? '#FFFFFF' : colors.textSecondary} />
                    <Text
                      style={[
                        typography.subtitle2,
                        { color: editRole === 'employee' ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      Employee
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setEditRole('manager')}
                    style={[
                      styles.rolePickerOption,
                      {
                        backgroundColor: editRole === 'manager' ? colors.primary : colors.surfaceSubtle,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <Shield size={14} color={editRole === 'manager' ? '#FFFFFF' : colors.textSecondary} />
                    <Text
                      style={[
                        typography.subtitle2,
                        { color: editRole === 'manager' ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      Manager / Admin
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Full Name */}
              <View style={styles.inputField}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                  FULL NAME
                </Text>
                <TextInput
                  value={editFullName}
                  onChangeText={setEditFullName}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                />
              </View>

              {/* Biometric Fingerprint ID */}
              <View style={styles.inputField}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                  BIOMETRIC FINGERPRINT ID
                </Text>
                <TextInput
                  value={editFingerprintId}
                  onChangeText={setEditFingerprintId}
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                />
                <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 2, fontSize: 10 }]}>
                  Links to SpeedFace terminal punches matching this ID
                </Text>
              </View>

              {/* Department */}
              <View style={styles.inputField}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                  DEPARTMENT
                </Text>
                <TextInput
                  value={editDepartment}
                  onChangeText={setEditDepartment}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                />
              </View>

              {/* Designation */}
              <View style={styles.inputField}>
                <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                  DESIGNATION / TITLE
                </Text>
                <TextInput
                  value={editDesignation}
                  onChangeText={setEditDesignation}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                />
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <CustomButton
                title="Cancel"
                variant="outline"
                onPress={() => setEditModalVisible(false)}
                style={{ flex: 1 }}
              />
              <CustomButton
                title="Save Changes"
                variant="primary"
                loading={isSaving}
                onPress={handleSaveEdit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRM MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.xl,
                ...elevation.md,
              },
            ]}
          >
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <View
                style={[
                  styles.deleteIconWrap,
                  { backgroundColor: colors.dangerBg, borderRadius: borderRadius.full },
                ]}
              >
                <AlertTriangle size={28} color={colors.danger} />
              </View>
              <Text style={[typography.h3, { color: colors.textPrimary, textAlign: 'center' }]}>
                Revoke User Access?
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center' }]}>
                Are you sure you want to remove <Text style={{ fontWeight: '700' }}>{userToDelete?.fullName}</Text> from mobile portal access in {currentOrgName}?
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <CustomButton
                title="Keep Account"
                variant="outline"
                onPress={() => setDeleteModalVisible(false)}
                style={{ flex: 1 }}
              />
              <CustomButton
                title="Revoke & Delete"
                variant="danger"
                loading={isDeleting}
                onPress={handleConfirmDelete}
                style={{ flex: 1 }}
              />
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
    gap: 12,
  },
  topBar: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  refreshBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  userCard: {
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  cardDetails: {
    gap: 4,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderWidth: 1,
    gap: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputField: {
    marginBottom: 12,
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rolePickerOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  deleteIconWrap: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
