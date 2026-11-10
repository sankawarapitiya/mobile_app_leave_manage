import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import {
  Users,
  Search,
  Shield,
  User,
  Fingerprint,
  Mail,
  Building,
  Edit2,
  X,
  Check,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Key,
  Eye,
  EyeOff,
  Sliders,
  CheckCircle,
  XCircle,
  Phone,
  Sparkles,
} from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { EmployeeMobileAccess, UserRole } from '../types';
import { CustomButton } from './CustomButton';
import { triggerHaptic } from '../utils/haptics';

export interface MobileUsersManagementProps {
  headerPrefix?: React.ReactNode;
  contentContainerStyle?: any;
}

export const MobileUsersManagement: React.FC<MobileUsersManagementProps> = ({
  headerPrefix,
  contentContainerStyle,
}) => {
  const { colors, typography, borderRadius, elevation, isDark } = useTheme();
  const {
    user: currentUser,
    currentOrgId,
    currentOrgName,
    mobileAppUsers,
    loadMobileAppUsers,
    setEmployeeMobileAccess,
    setEmployeePin,
    updateEmployeeMobileDetails,
  } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled' | 'managers'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Revealed PIN map: { [rawUserId]: boolean }
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  // Set PIN Modal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [targetEmployee, setTargetEmployee] = useState<EmployeeMobileAccess | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [showPinSecret, setShowPinSecret] = useState(false);
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Manage / Edit Modal State
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeMobileAccess | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editServiceId, setEditServiceId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editMobileEnabled, setEditMobileEnabled] = useState(false);
  const [editPin, setEditPin] = useState('');
  const [isSavingManage, setIsSavingManage] = useState(false);

  useEffect(() => {
    loadMobileAppUsers();
  }, [currentOrgId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    triggerHaptic.selection();
    await loadMobileAppUsers();
    setRefreshing(false);
  };

  const togglePinReveal = (id: string) => {
    triggerHaptic.selection();
    setRevealedPins((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Quick Toggle Access on Card
  const handleQuickToggleAccess = async (emp: EmployeeMobileAccess) => {
    triggerHaptic.medium();
    const nextState = !emp.isMobileEnabled;

    if (nextState && !emp.pin) {
      // If turning on and no PIN set yet, open Set PIN modal with preset
      setTargetEmployee(emp);
      setPinValue('1234');
      setShowPinSecret(true);
      setPinModalVisible(true);
      return;
    }

    try {
      await setEmployeeMobileAccess(emp.rawUserId, nextState, emp.pin || '1234', emp.mobileRole, {
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        employeeServiceId: emp.employeeServiceId,
        email: emp.email,
        phone: emp.phone,
      });
      triggerHaptic.success();
    } catch (err: any) {
      triggerHaptic.error();
      Alert.alert('Error', err.message || 'Failed to update mobile login access');
    }
  };

  // Open PIN Modal
  const handleOpenPinModal = (emp: EmployeeMobileAccess) => {
    triggerHaptic.selection();
    setTargetEmployee(emp);
    setPinValue(emp.pin || '1234');
    setShowPinSecret(true);
    setPinModalVisible(true);
  };

  // Save PIN
  const handleSavePin = async () => {
    if (!targetEmployee) return;
    const cleanPin = pinValue.trim();
    if (cleanPin.length < 3 || cleanPin.length > 8) {
      Alert.alert('Invalid PIN', 'Please enter a 4-8 digit numeric PIN for mobile login.');
      return;
    }

    setIsSavingPin(true);
    try {
      await setEmployeePin(targetEmployee.rawUserId, cleanPin);
      triggerHaptic.success();
      setPinModalVisible(false);
      setTargetEmployee(null);
      Alert.alert(
        'PIN Saved Successfully',
        `Mobile login is now activated for ${targetEmployee.name}.\n\nLogin Identifier: ${targetEmployee.rawUserId} (or ${targetEmployee.employeeServiceId || targetEmployee.email})\nLogin PIN: ${cleanPin}`
      );
    } catch (err: any) {
      triggerHaptic.error();
      Alert.alert('PIN Error', err.message || 'Failed to save employee PIN');
    } finally {
      setIsSavingPin(false);
    }
  };

  // Open Manage Modal
  const handleOpenManageModal = (emp: EmployeeMobileAccess) => {
    triggerHaptic.selection();
    setEditingEmployee(emp);
    setEditName(emp.name || '');
    setEditDepartment(emp.department || 'General');
    setEditDesignation(emp.designation || 'Staff Member');
    setEditServiceId(emp.employeeServiceId || '');
    setEditPhone(emp.phone || '');
    setEditEmail(emp.email || '');
    setEditRole(emp.mobileRole || 'employee');
    setEditMobileEnabled(Boolean(emp.isMobileEnabled));
    setEditPin(emp.pin || '');
    setManageModalVisible(true);
  };

  // Save Manage Details
  const handleSaveManage = async () => {
    if (!editingEmployee) return;
    setIsSavingManage(true);
    try {
      await updateEmployeeMobileDetails(editingEmployee.rawUserId, {
        name: editName.trim(),
        department: editDepartment.trim(),
        designation: editDesignation.trim(),
        employeeServiceId: editServiceId.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        mobileRole: editRole,
        isMobileEnabled: editMobileEnabled,
        pin: editPin.trim() || undefined,
      });
      triggerHaptic.success();
      setManageModalVisible(false);
      setEditingEmployee(null);
    } catch (err: any) {
      triggerHaptic.error();
      Alert.alert('Update Error', err.message || 'Failed to update employee details');
    } finally {
      setIsSavingManage(false);
    }
  };

  // Filtered Employees List
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return mobileAppUsers.filter((emp) => {
      const matchQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.rawUserId.toLowerCase().includes(q) ||
        emp.employeeServiceId.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.designation.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.includes(q)) ||
        (emp.nic && emp.nic.toLowerCase().includes(q));

      const matchFilter =
        filterMode === 'all' ||
        (filterMode === 'enabled' && emp.isMobileEnabled) ||
        (filterMode === 'disabled' && !emp.isMobileEnabled) ||
        (filterMode === 'managers' && (emp.mobileRole === 'manager' || emp.role.toLowerCase().includes('admin')));

      return matchQuery && matchFilter;
    });
  }, [mobileAppUsers, searchQuery, filterMode]);

  // Statistics
  const totalCount = mobileAppUsers.length;
  const enabledCount = useMemo(
    () => mobileAppUsers.filter((u) => u.isMobileEnabled).length,
    [mobileAppUsers]
  );
  const disabledCount = totalCount - enabledCount;
  const managerCount = useMemo(
    () =>
      mobileAppUsers.filter(
        (u) => u.mobileRole === 'manager' || u.role.toLowerCase().includes('admin')
      ).length,
    [mobileAppUsers]
  );

  const renderEmployeeCard = useCallback(
    ({ item }: { item: EmployeeMobileAccess }) => {
      const isManager = item.mobileRole === 'manager' || item.role.toLowerCase().includes('admin');
      const isSelf =
        currentUser?.uid === item.userId ||
        currentUser?.rawUserId === item.rawUserId ||
        currentUser?.fingerprintId === item.rawUserId;
      const isPinRevealed = Boolean(revealedPins[item.rawUserId]);

      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: item.isMobileEnabled ? colors.border : colors.border + '60',
              borderRadius: borderRadius.lg,
              ...elevation.sm,
              shadowColor: colors.shadowColor,
            },
          ]}
        >
          {/* Card Header: Avatar, Name, Biometric ID, Service ID */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: item.isMobileEnabled
                    ? isManager
                      ? colors.primary
                      : colors.secondary
                    : colors.surfaceSubtle,
                  borderColor: item.isMobileEnabled ? colors.primary + '40' : colors.border,
                  borderRadius: borderRadius.full,
                },
              ]}
            >
              <Text
                style={{
                  color: item.isMobileEnabled ? '#FFFFFF' : colors.textTertiary,
                  fontWeight: '800',
                  fontSize: 14,
                }}
              >
                {(item.name || 'E').charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text
                  style={[
                    typography.subtitle1,
                    { color: colors.textPrimary, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>

                {isSelf && (
                  <View
                    style={[
                      styles.selfBadge,
                      { backgroundColor: colors.primary + '18', borderRadius: borderRadius.xs },
                    ]}
                  >
                    <Text style={[typography.caption, { color: colors.primary, fontSize: 9, fontWeight: '800' }]}>
                      YOU
                    </Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                {/* Biometric ID Badge */}
                <View
                  style={[
                    styles.idBadge,
                    { backgroundColor: colors.primaryLight + '15', borderRadius: borderRadius.xs },
                  ]}
                >
                  <Fingerprint size={10} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.primary, fontSize: 10, fontWeight: '700' }]}>
                    ID: #{item.rawUserId}
                  </Text>
                </View>

                {/* Service ID Badge */}
                {item.employeeServiceId ? (
                  <View
                    style={[
                      styles.idBadge,
                      { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.xs },
                    ]}
                  >
                    <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 10, fontWeight: '600' }]}>
                      {item.employeeServiceId}
                    </Text>
                  </View>
                ) : null}

                {/* Role Badge */}
                <View
                  style={[
                    styles.idBadge,
                    {
                      backgroundColor: isManager ? '#f59e0b18' : colors.surfaceSubtle,
                      borderRadius: borderRadius.xs,
                    },
                  ]}
                >
                  {isManager ? <Shield size={10} color="#d97706" /> : <User size={10} color={colors.textTertiary} />}
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: isManager ? '#d97706' : colors.textSecondary,
                        fontSize: 10,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {isManager ? 'Supervisor' : 'Staff'}
                  </Text>
                </View>
              </View>

              <Text style={[typography.caption, { color: colors.textTertiary, marginTop: 4 }]} numberOfLines={1}>
                {item.designation || 'Staff'} • {item.department || 'General'}
              </Text>
            </View>

            {/* Quick Toggle Switch */}
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Switch
                value={item.isMobileEnabled}
                onValueChange={() => handleQuickToggleAccess(item)}
                trackColor={{ false: colors.surfaceSubtle, true: colors.primaryLight }}
                thumbColor={item.isMobileEnabled ? colors.primary : colors.textTertiary}
                ios_backgroundColor={colors.surfaceSubtle}
              />
              <Text
                style={[
                  typography.caption,
                  {
                    color: item.isMobileEnabled ? colors.success : colors.textTertiary,
                    fontSize: 10,
                    fontWeight: '700',
                  },
                ]}
              >
                {item.isMobileEnabled ? 'ACTIVE' : 'OFF'}
              </Text>
            </View>
          </View>

          {/* Status & PIN Row */}
          <View
            style={[
              styles.infoStrip,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surfaceSubtle,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            {/* Login Access Status Indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
              {item.isMobileEnabled ? (
                <>
                  <CheckCircle size={14} color={colors.success} />
                  <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>
                    Login Enabled
                  </Text>
                </>
              ) : (
                <>
                  <XCircle size={14} color={colors.textTertiary} />
                  <Text style={[typography.caption, { color: colors.textTertiary, fontWeight: '600' }]}>
                    Not Activated
                  </Text>
                </>
              )}
            </View>

            {/* PIN Indicator & Reveal Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.pin ? (
                <Pressable
                  onPress={() => togglePinReveal(item.rawUserId)}
                  style={[
                    styles.pinDisplayBadge,
                    { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.sm },
                  ]}
                >
                  <Key size={11} color={colors.primary} />
                  <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '700', fontSize: 11 }]}>
                    PIN: {isPinRevealed ? item.pin : '••••'}
                  </Text>
                  {isPinRevealed ? (
                    <EyeOff size={11} color={colors.textTertiary} />
                  ) : (
                    <Eye size={11} color={colors.textTertiary} />
                  )}
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.pinDisplayBadge,
                    { backgroundColor: '#fef3c7', borderColor: '#fde68a', borderRadius: borderRadius.sm },
                  ]}
                >
                  <AlertTriangle size={11} color="#d97706" />
                  <Text style={[typography.caption, { color: '#b45309', fontWeight: '700', fontSize: 10 }]}>
                    No PIN
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Targets Bar */}
          <View style={styles.cardActionsRow}>
            {/* Button 1: Set / Change PIN */}
            <Pressable
              onPress={() => handleOpenPinModal(item)}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Key size={13} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                {item.pin ? 'Change PIN' : 'Set PIN'}
              </Text>
            </Pressable>

            {/* Button 2: Manage Profile & Roles */}
            <Pressable
              onPress={() => handleOpenManageModal(item)}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Sliders size={13} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600' }]}>
                Manage
              </Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [colors, typography, borderRadius, elevation, isDark, currentUser, revealedPins]
  );

  return (
    <View style={styles.container}>
      {/* Virtualized Employees List with Integrated Scrolling Header */}
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeCard}
        keyExtractor={(item) => String(item.userId || item.rawUserId)}
        contentContainerStyle={[
          styles.listContent,
          contentContainerStyle || { paddingBottom: 80, paddingHorizontal: 20 },
        ]}
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={20}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.listHeaderWrapper}>
            {headerPrefix}

            {/* Top Summary Statistics Strip */}
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md, ...elevation.sm },
                ]}
              >
                <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10, fontWeight: '700' }]}>
                  TOTAL STAFF
                </Text>
                <Text style={[typography.h2, { color: colors.textPrimary, fontWeight: '800' }]}>
                  {totalCount}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md, ...elevation.sm },
                ]}
              >
                <Text style={[typography.caption, { color: colors.success, fontSize: 10, fontWeight: '700' }]}>
                  LOGIN ACTIVE
                </Text>
                <Text style={[typography.h2, { color: colors.success, fontWeight: '800' }]}>
                  {enabledCount}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md, ...elevation.sm },
                ]}
              >
                <Text style={[typography.caption, { color: colors.textTertiary, fontSize: 10, fontWeight: '700' }]}>
                  INACTIVE
                </Text>
                <Text style={[typography.h2, { color: colors.textSecondary, fontWeight: '800' }]}>
                  {disabledCount}
                </Text>
              </View>

              <View
                style={[
                  styles.statCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderRadius: borderRadius.md, ...elevation.sm },
                ]}
              >
                <Text style={[typography.caption, { color: '#d97706', fontSize: 10, fontWeight: '700' }]}>
                  MANAGERS
                </Text>
                <Text style={[typography.h2, { color: '#d97706', fontWeight: '800' }]}>
                  {managerCount}
                </Text>
              </View>
            </View>

            {/* Search Input Bar */}
            <View style={styles.searchBarRow}>
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
                  placeholder="Search by name, ID (#2), service ID, or dept..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
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
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <RefreshCw size={16} color={colors.primary} />
              </Pressable>
            </View>

            {/* Filter Chips Bar */}
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setFilterMode('all')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterMode === 'all' ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: filterMode === 'all' ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' },
                  ]}
                >
                  All Staff ({totalCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFilterMode('enabled')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterMode === 'enabled' ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: filterMode === 'enabled' ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' },
                  ]}
                >
                  Active Login ({enabledCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFilterMode('disabled')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterMode === 'disabled' ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: filterMode === 'disabled' ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' },
                  ]}
                >
                  Inactive ({disabledCount})
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setFilterMode('managers')}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: filterMode === 'managers' ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderRadius: borderRadius.full,
                  },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: filterMode === 'managers' ? '#FFFFFF' : colors.textSecondary, fontWeight: '700' },
                  ]}
                >
                  Managers ({managerCount})
                </Text>
              </Pressable>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { borderColor: colors.border, borderRadius: borderRadius.lg }]}>
            <Users size={32} color={colors.textTertiary} />
            <Text style={[typography.subtitle1, { color: colors.textPrimary, marginTop: 8 }]}>
              No Employees Found
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
              {searchQuery
                ? `No employees match "${searchQuery}". Try searching by ID or name.`
                : 'No employees recorded under this organization.'}
            </Text>
          </View>
        }
      />

      {/* ============================================================ */}
      {/* 1. SET / CHANGE PIN MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPinModalVisible(false)}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.modalIconWrap,
                    { backgroundColor: colors.primary + '18', borderRadius: borderRadius.full },
                  ]}
                >
                  <Key size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    Set Mobile Login PIN
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    {targetEmployee?.name} (ID: #{targetEmployee?.rawUserId})
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => setPinModalVisible(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <View style={{ paddingVertical: 12, gap: 14 }}>
              <Text style={[typography.body2, { color: colors.textSecondary }]}>
                Assign a 4 to 6 digit security PIN that this employee will enter on the mobile app login screen:
              </Text>

              {/* PIN Input Box */}
              <View
                style={[
                  styles.pinInputContainer,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    borderRadius: borderRadius.md,
                  },
                ]}
              >
                <Key size={20} color={colors.primary} />
                <TextInput
                  value={pinValue}
                  onChangeText={setPinValue}
                  placeholder="Enter 4-6 digit PIN (e.g. 1234)"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                  maxLength={8}
                  secureTextEntry={!showPinSecret}
                  style={[styles.pinTextInput, { color: colors.textPrimary }]}
                  autoFocus
                />
                <Pressable onPress={() => setShowPinSecret(!showPinSecret)} hitSlop={8}>
                  {showPinSecret ? (
                    <EyeOff size={18} color={colors.textTertiary} />
                  ) : (
                    <Eye size={18} color={colors.textTertiary} />
                  )}
                </Pressable>
              </View>

              {/* Fast Preset Buttons */}
              <View>
                <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: 6, fontWeight: '700' }]}>
                  QUICK PRESETS:
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  {['1234', '0000', '9999'].map((preset) => (
                    <Pressable
                      key={preset}
                      onPress={() => {
                        triggerHaptic.selection();
                        setPinValue(preset);
                      }}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: pinValue === preset ? colors.primary : colors.surfaceSubtle,
                          borderColor: colors.border,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          typography.caption,
                          {
                            color: pinValue === preset ? '#FFFFFF' : colors.textPrimary,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {preset}
                      </Text>
                    </Pressable>
                  ))}

                  {targetEmployee?.rawUserId && (
                    <Pressable
                      onPress={() => {
                        triggerHaptic.selection();
                        const id = targetEmployee.rawUserId.padStart(4, '0');
                        setPinValue(id);
                      }}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: colors.surfaceSubtle,
                          borderColor: colors.border,
                          borderRadius: borderRadius.sm,
                        },
                      ]}
                    >
                      <Sparkles size={11} color={colors.primary} />
                      <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                        Use ID ({targetEmployee.rawUserId.padStart(4, '0')})
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.loginHintBox,
                  { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', borderRadius: borderRadius.md },
                ]}
              >
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>
                  ✓ The employee can log in immediately by selecting {currentOrgName || 'organization'} and entering their ID ({targetEmployee?.rawUserId}) and this PIN.
                </Text>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <CustomButton
                title="Cancel"
                variant="outline"
                onPress={() => setPinModalVisible(false)}
                style={{ flex: 1 }}
              />
              <CustomButton
                title="Save PIN & Enable"
                variant="primary"
                loading={isSavingPin}
                onPress={handleSavePin}
                style={{ flex: 1.5 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* 2. MANAGE EMPLOYEE PROFILE & ROLE MODAL */}
      {/* ============================================================ */}
      <Modal
        visible={manageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManageModalVisible(false)}
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
                maxHeight: '90%',
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[
                    styles.modalIconWrap,
                    { backgroundColor: colors.secondary + '20', borderRadius: borderRadius.full },
                  ]}
                >
                  <Sliders size={18} color={colors.secondary} />
                </View>
                <View>
                  <Text style={[typography.h3, { color: colors.textPrimary }]}>
                    Manage Employee Portal
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Biometric ID #{editingEmployee?.rawUserId}
                  </Text>
                </View>
              </View>

              <Pressable onPress={() => setManageModalVisible(false)} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <FlatList
              data={[1]}
              keyExtractor={() => 'form'}
              renderItem={() => (
                <View style={{ gap: 12, paddingVertical: 10 }}>
                  {/* Access Toggle Row */}
                  <View
                    style={[
                      styles.toggleCardRow,
                      {
                        backgroundColor: colors.surfaceSubtle,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.subtitle2, { color: colors.textPrimary }]}>
                        Mobile App Login Access
                      </Text>
                      <Text style={[typography.caption, { color: colors.textSecondary }]}>
                        Enable or revoke permission to log into the mobile app
                      </Text>
                    </View>
                    <Switch
                      value={editMobileEnabled}
                      onValueChange={setEditMobileEnabled}
                      trackColor={{ false: colors.border, true: colors.primaryLight }}
                      thumbColor={editMobileEnabled ? colors.primary : colors.textTertiary}
                    />
                  </View>

                  {/* Role Selector */}
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 6, fontWeight: '700' }]}>
                      MOBILE APP ROLE PERMISSION
                    </Text>
                    <View style={styles.roleBtnGroup}>
                      <Pressable
                        onPress={() => setEditRole('employee')}
                        style={[
                          styles.roleSelectBtn,
                          {
                            backgroundColor: editRole === 'employee' ? colors.primary : colors.inputBg,
                            borderColor: colors.border,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      >
                        <User size={15} color={editRole === 'employee' ? '#FFFFFF' : colors.textSecondary} />
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: editRole === 'employee' ? '#FFFFFF' : colors.textPrimary,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          Employee (Staff)
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setEditRole('manager')}
                        style={[
                          styles.roleSelectBtn,
                          {
                            backgroundColor: editRole === 'manager' ? '#d97706' : colors.inputBg,
                            borderColor: colors.border,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      >
                        <Shield size={15} color={editRole === 'manager' ? '#FFFFFF' : colors.textSecondary} />
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: editRole === 'manager' ? '#FFFFFF' : colors.textPrimary,
                              fontWeight: '700',
                            },
                          ]}
                        >
                          Manager (Approver)
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* PIN Field */}
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                      LOGIN PIN (4-8 DIGITS)
                    </Text>
                    <TextInput
                      value={editPin}
                      onChangeText={setEditPin}
                      placeholder="e.g. 1234"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="numeric"
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                    />
                  </View>

                  {/* Full Name */}
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                      EMPLOYEE FULL NAME
                    </Text>
                    <TextInput
                      value={editName}
                      onChangeText={setEditName}
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                    />
                  </View>

                  {/* Service ID */}
                  <View>
                    <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                      EMPLOYEE SERVICE ID
                    </Text>
                    <TextInput
                      value={editServiceId}
                      onChangeText={setEditServiceId}
                      placeholder="e.g. EMP003"
                      placeholderTextColor={colors.textTertiary}
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          borderRadius: borderRadius.md,
                        },
                      ]}
                    />
                  </View>

                  {/* Department & Designation */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                        DEPARTMENT
                      </Text>
                      <TextInput
                        value={editDepartment}
                        onChangeText={setEditDepartment}
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.inputBorder,
                            color: colors.textPrimary,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                        DESIGNATION
                      </Text>
                      <TextInput
                        value={editDesignation}
                        onChangeText={setEditDesignation}
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.inputBorder,
                            color: colors.textPrimary,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Email & Phone */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                        WORK EMAIL
                      </Text>
                      <TextInput
                        value={editEmail}
                        onChangeText={setEditEmail}
                        placeholder="name@lunugamwehera.gov.lk"
                        placeholderTextColor={colors.textTertiary}
                        autoCapitalize="none"
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.inputBorder,
                            color: colors.textPrimary,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: 4, fontWeight: '700' }]}>
                        PHONE NUMBER
                      </Text>
                      <TextInput
                        value={editPhone}
                        onChangeText={setEditPhone}
                        placeholder="0771234567"
                        placeholderTextColor={colors.textTertiary}
                        keyboardType="phone-pad"
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: colors.inputBg,
                            borderColor: colors.inputBorder,
                            color: colors.textPrimary,
                            borderRadius: borderRadius.md,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}
            />

            <View style={styles.modalBtnRow}>
              <CustomButton
                title="Cancel"
                variant="outline"
                onPress={() => setManageModalVisible(false)}
                style={{ flex: 1 }}
              />
              <CustomButton
                title="Save Changes"
                variant="primary"
                loading={isSavingManage}
                onPress={handleSaveManage}
                style={{ flex: 1.5 }}
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
  },
  listContent: {
    gap: 10,
  },
  listHeaderWrapper: {
    gap: 10,
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBarRow: {
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
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  selfBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  idBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  pinDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderWidth: 1,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    padding: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.2)',
    paddingBottom: 12,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
  },
  pinTextInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  loginHintBox: {
    padding: 10,
    borderWidth: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  toggleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
  },
  roleBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  roleSelectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderWidth: 1,
  },
  inputBox: {
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
  },
});
