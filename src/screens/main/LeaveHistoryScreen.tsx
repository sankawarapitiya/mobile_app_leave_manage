import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Calendar, Filter, Clock } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { leaveService } from '../../services/firebase/leaveService';
import { LeaveRequest, LeaveRequestStatus } from '../../types';
import { LeaveRequestCard } from '../../components/LeaveRequestCard';
import { triggerHaptic } from '../../utils/haptics';

type FilterTab = 'all' | LeaveRequestStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

export const LeaveHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, typography, borderRadius } = useTheme();
  const { user } = useAuthStore();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = leaveService.subscribeToUserRequests(user.uid, setRequests);
    return () => unsub();
  }, [user]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') return requests;
    return requests.filter((r) => r.status === activeTab);
  }, [requests, activeTab]);

  const handleCancelRequest = (requestId: string) => {
    triggerHaptic.warning();
    Alert.alert(
      'Cancel Leave Request',
      'Are you sure you want to cancel this pending leave request? Your balance will be restored.',
      [
        { text: 'Keep It', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await leaveService.cancelLeaveRequest(requestId, user.uid);
              triggerHaptic.success();
            }
          },
        },
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 500));
    setRefreshing(false);
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
      {/* Screen Title */}
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.textPrimary }]}>
          My Leave History
        </Text>
        <Text style={[typography.body1, { color: colors.textSecondary, marginTop: 2 }]}>
          Track your requests, manager approvals, and cancellation history
        </Text>
      </View>

      {/* Segmented Filter Tabs */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colors.surfaceSubtle,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count =
            tab.key === 'all'
              ? requests.length
              : requests.filter((r) => r.status === tab.key).length;

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                triggerHaptic.selection();
                setActiveTab(tab.key);
              }}
              style={[
                styles.tabItem,
                {
                  backgroundColor: isActive ? colors.card : 'transparent',
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <Text
                style={[
                  typography.subtitle2,
                  {
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontSize: 13,
                  },
                ]}
              >
                {tab.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.countPill,
                    {
                      backgroundColor: isActive ? colors.primaryLight : colors.border,
                      borderRadius: borderRadius.full,
                    },
                  ]}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: isActive ? '#FFFFFF' : colors.textSecondary, fontSize: 10 },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Requests Feed */}
      <ScrollView
        contentContainerStyle={[styles.feedContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {filteredRequests.map((req, idx) => (
          <LeaveRequestCard
            key={req.id}
            request={req}
            index={idx}
            onCancel={handleCancelRequest}
          />
        ))}

        {filteredRequests.length === 0 && (
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
            <Clock size={36} color={colors.textTertiary} />
            <Text style={[typography.subtitle1, { color: colors.textPrimary, marginTop: 8 }]}>
              No {activeTab !== 'all' ? activeTab : ''} requests found
            </Text>
            <Text style={[typography.body2, { color: colors.textSecondary, textAlign: 'center' }]}>
              Leave applications in this category will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    padding: 4,
    marginBottom: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  feedContent: {
    gap: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderWidth: 1,
    marginTop: 20,
    gap: 6,
  },
});
