import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, CheckCircle2, AlertTriangle, Users } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { leaveService } from '../../services/firebase/leaveService';
import { LeaveRequest } from '../../types';
import { LeaveRequestCard } from '../../components/LeaveRequestCard';
import { ManagerReviewModal } from '../../components/ManagerReviewModal';
import { MobileUsersManagement } from '../../components/MobileUsersManagement';
import { triggerHaptic } from '../../utils/haptics';

export const ManagerApprovalsScreen: React.FC<{ route?: any; navigation?: any }> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius, elevation } = useTheme();
  const { user, currentOrgName, mobileAppUsers, loadMobileAppUsers } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'approvals' | 'users'>(
    route?.params?.initialTab || 'approvals'
  );
  const [queue, setQueue] = useState<LeaveRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Review Modal state
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route?.params?.initialTab]);

  useEffect(() => {
    loadMobileAppUsers();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = leaveService.subscribeToManagerQueue(user.uid, setQueue, user.orgId);
    return () => unsub();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      new Promise((r) => setTimeout(r, 500)),
      loadMobileAppUsers(),
    ]);
    setRefreshing(false);
  };

  const handleTriggerReview = (requestId: string, decision: 'approved' | 'rejected') => {
    triggerHaptic.medium();
    const req = queue.find((r) => r.id === requestId);
    if (!req) return;
    setSelectedRequest(req);
    setReviewDecision(decision);
    setModalVisible(true);
  };

  const handleSubmitReview = async (comment: string) => {
    if (!user || !selectedRequest || !reviewDecision) return;

    try {
      await leaveService.reviewLeaveRequest(
        selectedRequest.id,
        user.uid,
        user.fullName,
        reviewDecision,
        comment
      );
      triggerHaptic.success();
      Alert.alert(
        reviewDecision === 'approved' ? 'Request Approved' : 'Request Rejected',
        `The leave request for ${selectedRequest.userName} has been ${reviewDecision}. Balances updated.`
      );
    } catch (err: any) {
      triggerHaptic.error();
      Alert.alert('Review Error', err.message || 'Failed to update request');
    }
  };

  const conflictCount = queue.filter((r) => r.hasConflict).length;

  const renderCommonHeader = (tab: 'approvals' | 'users') => (
    <View style={styles.headerBlock}>
      {/* Title & Badge */}
      <View style={styles.titleRow}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>
          {tab === 'approvals' ? 'Approval Queue' : 'Mobile App Users'}
        </Text>
        <View
          style={[
            styles.queueCountBadge,
            {
              backgroundColor:
                tab === 'approvals'
                  ? queue.length > 0
                    ? colors.primary
                    : colors.surfaceSubtle
                  : colors.primaryLight,
              borderRadius: borderRadius.full,
            },
          ]}
        >
          <Text
            style={[
              typography.caption,
              {
                color:
                  tab === 'approvals'
                    ? queue.length > 0
                      ? '#FFFFFF'
                      : colors.textSecondary
                    : '#FFFFFF',
                fontWeight: '700',
              },
            ]}
          >
            {tab === 'approvals'
              ? `${queue.length} Pending`
              : `${mobileAppUsers.length} Staff (${mobileAppUsers.filter((u) => u.isMobileEnabled).length} Active)`}
          </Text>
        </View>
      </View>

      <Text style={[typography.body1, { color: colors.textSecondary, marginTop: 2, marginBottom: 12 }]}>
        {tab === 'approvals'
          ? 'Review and approve requests with real-time balance deductions'
          : `Manage mobile app login access, security PINs & roles for all staff in ${currentOrgName || 'Organization'}`}
      </Text>

      {/* Segmented Switch: Approvals vs Mobile Users */}
      <View
        style={[
          styles.tabSwitchContainer,
          {
            backgroundColor: colors.surfaceSubtle,
            borderColor: colors.border,
            borderRadius: borderRadius.md,
          },
        ]}
      >
        <Pressable
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('approvals');
          }}
          style={[
            styles.tabSwitchBtn,
            tab === 'approvals' && [
              styles.tabSwitchBtnActive,
              { backgroundColor: colors.card, ...elevation.sm },
            ],
            { borderRadius: borderRadius.sm },
          ]}
        >
          <ShieldCheck
            size={16}
            color={tab === 'approvals' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              typography.subtitle2,
              {
                color: tab === 'approvals' ? colors.textPrimary : colors.textSecondary,
                fontWeight: tab === 'approvals' ? '700' : '600',
                fontSize: 13,
              },
            ]}
          >
            Leave Approvals {queue.length > 0 ? `(${queue.length})` : ''}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => {
            triggerHaptic.selection();
            setActiveTab('users');
          }}
          style={[
            styles.tabSwitchBtn,
            tab === 'users' && [
              styles.tabSwitchBtnActive,
              { backgroundColor: colors.card, ...elevation.sm },
            ],
            { borderRadius: borderRadius.sm },
          ]}
        >
          <Users
            size={16}
            color={tab === 'users' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              typography.subtitle2,
              {
                color: tab === 'users' ? colors.textPrimary : colors.textSecondary,
                fontWeight: tab === 'users' ? '700' : '600',
                fontSize: 13,
              },
            ]}
          >
            Staff & Mobile Users {mobileAppUsers.length > 0 ? `(${mobileAppUsers.length})` : ''}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Active Tab View */}
      {activeTab === 'users' ? (
        <View style={{ flex: 1 }}>
          <MobileUsersManagement
            headerPrefix={renderCommonHeader('users')}
            contentContainerStyle={{
              paddingTop: Math.max(insets.top, 16) + 12,
              paddingBottom: insets.bottom + 90,
              paddingHorizontal: 20,
            }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 16) + 12,
              paddingBottom: insets.bottom + 90,
              paddingHorizontal: 20,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {renderCommonHeader('approvals')}

          {/* Conflict Warning Strip if overlapping leaves exist */}
          {conflictCount > 0 && (
            <View
              style={[
                styles.conflictStrip,
                {
                  backgroundColor: colors.warningBg,
                  borderColor: colors.warning,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <AlertTriangle size={18} color={colors.warning} />
              <Text style={[typography.caption, { color: colors.warning, flex: 1, fontWeight: '600' }]}>
                {conflictCount} pending request(s) have team scheduling overlaps! Inspect highlighted cards.
              </Text>
            </View>
          )}

          {/* Pending Queue List */}
          {queue.map((req, idx) => (
            <LeaveRequestCard
              key={req.id}
              request={req}
              index={idx}
              isManagerView
              onApprove={(id) => handleTriggerReview(id, 'approved')}
              onReject={(id) => handleTriggerReview(id, 'rejected')}
            />
          ))}

          {queue.length === 0 && (
            <View
              style={[
                styles.allClearBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: borderRadius.lg,
                },
              ]}
            >
              <CheckCircle2 size={44} color={colors.success} />
              <Text style={[typography.h3, { color: colors.textPrimary, marginTop: 8 }]}>
                All Caught Up!
              </Text>
              <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center' }]}>
                There are no pending leave requests awaiting your approval right now.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Modal Review */}
      <ManagerReviewModal
        visible={modalVisible}
        request={selectedRequest}
        decision={reviewDecision}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmitReview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBlock: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    marginBottom: 10,
    gap: 4,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  tabSwitchBtnActive: {
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  conflictStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  scrollContent: {
    gap: 6,
  },
  allClearBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderWidth: 1,
    marginTop: 20,
    gap: 6,
  },
});
