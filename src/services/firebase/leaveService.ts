import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  getDocs,
  setDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { DEFAULT_ORG_ID } from './authService';
import {
  LeaveRequest,
  UserLeaveBalances,
  EmployeeLeaveBalanceItem,
  CloudLeaveType,
  CloudLeaveCategory,
  CompanyHoliday,
  LeaveType,
} from '../../types';
import {
  MOCK_LEAVE_BALANCES,
  MOCK_LEAVE_REQUESTS,
  MOCK_COMPANY_HOLIDAYS,
  MOCK_USERS,
} from '../mock/mockData';
import { checkDateOverlap } from '../../utils/dateUtils';

// In-Memory fallback store for seamless interactive demo / offline mode
let localRequests: LeaveRequest[] = [...MOCK_LEAVE_REQUESTS];
let localBalances: Record<string, UserLeaveBalances> = JSON.parse(
  JSON.stringify(MOCK_LEAVE_BALANCES)
);
let localHolidays: CompanyHoliday[] = [...MOCK_COMPANY_HOLIDAYS];

const listeners: Set<() => void> = new Set();
const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

/**
 * Normalizes cloud leave balance document from organizations/{orgId}/leave_balances or leave_balances
 */
export function normalizeCloudLeaveBalances(data: any, fallbackUserId: string): UserLeaveBalances {
  const year = data.year || new Date().getFullYear();
  const balancesArray: EmployeeLeaveBalanceItem[] = Array.isArray(data.balances)
    ? data.balances.map((b: any) => ({
        leaveTypeId: b.leaveTypeId ?? b.id ?? b.leave_type_id ?? '',
        leaveTypeName: b.leaveTypeName || b.name || b.leave_type_name || 'Leave',
        code: (b.code || b.leave_type_code || '').toUpperCase(),
        allocatedDays: Number(b.allocatedDays ?? b.allocated_days ?? b.daysAllowed ?? 0),
        carriedForwardDays: Number(b.carriedForwardDays ?? b.carried_forward_days ?? 0),
        usedDays: Number(b.usedDays ?? b.used_days ?? 0),
        remainingDays: Number(b.remainingDays ?? b.remaining_days ?? 0),
        notes: b.notes || '',
        color: b.color || b.leave_type_color || '#2563eb',
        isPaid: Boolean(b.isPaid ?? b.is_paid ?? true),
        pendingDays: Number(b.pendingDays ?? 0),
      }))
    : [];

  // Match items for standard categories
  const casualItem = balancesArray.find(
    (b) => b.code === 'CAS' || b.leaveTypeName.toLowerCase().includes('casual')
  );
  const sickItem = balancesArray.find(
    (b) =>
      b.code === 'MED' ||
      b.code === 'SICK' ||
      b.leaveTypeName.toLowerCase().includes('sick') ||
      b.leaveTypeName.toLowerCase().includes('medical')
  );
  const annualItem = balancesArray.find(
    (b) =>
      b.code === 'VAC' ||
      b.code === 'ANNUAL' ||
      b.leaveTypeName.toLowerCase().includes('annual') ||
      b.leaveTypeName.toLowerCase().includes('vacation')
  );
  const unpaidItem = balancesArray.find(
    (b) => b.code === 'UNPAID' || b.leaveTypeName.toLowerCase().includes('unpaid')
  );

  const casualTotal = casualItem
    ? casualItem.allocatedDays + (casualItem.carriedForwardDays || 0)
    : data.casual?.total ?? 5;
  const casualUsed = casualItem ? casualItem.usedDays : data.casual?.used ?? 0;
  const casualPending = casualItem ? (casualItem.pendingDays || 0) : data.casual?.pending ?? 0;

  const sickTotal = sickItem
    ? sickItem.allocatedDays + (sickItem.carriedForwardDays || 0)
    : data.sick?.total ?? 10;
  const sickUsed = sickItem ? sickItem.usedDays : data.sick?.used ?? 0;
  const sickPending = sickItem ? (sickItem.pendingDays || 0) : data.sick?.pending ?? 0;

  const annualTotal = annualItem
    ? annualItem.allocatedDays + (annualItem.carriedForwardDays || 0)
    : data.annual?.total ?? 20;
  const annualUsed = annualItem ? annualItem.usedDays : data.annual?.used ?? 0;
  const annualPending = annualItem ? (annualItem.pendingDays || 0) : data.annual?.pending ?? 0;

  const unpaidUsed = unpaidItem ? unpaidItem.usedDays : data.unpaid?.used ?? 0;

  return {
    userId: data.userId || fallbackUserId,
    rawUserId: data.rawUserId || data.userId || fallbackUserId,
    name: data.name,
    department: data.department,
    organizationId: data.organizationId,
    year,
    leaveCategoryId: data.leaveCategoryId,
    leaveCategoryName: data.leaveCategoryName,
    leaveCategoryColor: data.leaveCategoryColor,
    balances: balancesArray.length > 0 ? balancesArray : undefined,
    annual: {
      total: annualTotal,
      used: annualUsed,
      pending: annualPending,
    },
    sick: {
      total: sickTotal,
      used: sickUsed,
      pending: sickPending,
    },
    casual: {
      total: casualTotal,
      used: casualUsed,
      pending: casualPending,
    },
    unpaid: {
      used: unpaidUsed,
    },
    updatedAt: data.updatedAt
      ? typeof data.updatedAt === 'object' && data.updatedAt.toDate
        ? data.updatedAt.toDate().toISOString()
        : String(data.updatedAt)
      : new Date().toISOString(),
  };
}

export const leaveService = {
  /**
   * Conflict Detection Helper:
   * Checks if any other approved/pending request in the same department overlaps.
   */
  checkTeamConflict: (
    newReq: { department: string; startDate: string; endDate: string; userId: string; id?: string },
    allRequests: LeaveRequest[]
  ): { hasConflict: boolean; conflictingUsers: string[] } => {
    const conflictingUsers: string[] = [];
    allRequests.forEach((req) => {
      if (
        req.id !== newReq.id &&
        req.userId !== newReq.userId &&
        req.department.toLowerCase() === newReq.department.toLowerCase() &&
        (req.status === 'approved' || req.status === 'pending')
      ) {
        if (checkDateOverlap(newReq.startDate, newReq.endDate, req.startDate, req.endDate)) {
          if (!conflictingUsers.includes(req.userName)) {
            conflictingUsers.push(req.userName);
          }
        }
      }
    });

    return {
      hasConflict: conflictingUsers.length > 0,
      conflictingUsers,
    };
  },

  /**
   * Subscribe to employee's own leave requests
   */
  subscribeToUserRequests: (
    userId: string,
    onData: (requests: LeaveRequest[]) => void
  ): Unsubscribe => {
    if (!isFirebaseConfigured || !db) {
      const emit = () => {
        const userReqs = localRequests
          .filter((r) => r.userId === userId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        onData(userReqs);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    try {
      const q = query(
        collection(db, 'leave_requests'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const list: LeaveRequest[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          onData(list);
        },
        (error) => {
          console.warn('[Firestore] subscribeToUserRequests fallback:', error);
          const userReqs = localRequests
            .filter((r) => r.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          onData(userReqs);
        }
      );
    } catch {
      onData(localRequests.filter((r) => r.userId === userId));
      return () => {};
    }
  },

  /**
   * Subscribe to employee's real-time leave balance and leave types from Cloud Firestore
   */
  subscribeToUserBalances: (
    userId: string,
    onData: (balances: UserLeaveBalances) => void,
    orgId?: string,
    fingerprintId?: string
  ): Unsubscribe => {
    const primaryId = String(fingerprintId || '').trim();
    const fallbackId = String(userId || '').trim().replace('emp_', '');
    const targetId = primaryId || fallbackId;
    const targetOrg = (orgId || DEFAULT_ORG_ID).trim().toUpperCase();

    const defaultBalance: UserLeaveBalances = {
      userId: targetId,
      rawUserId: targetId,
      year: new Date().getFullYear(),
      annual: { total: 20, used: 0, pending: 0 },
      sick: { total: 10, used: 0, pending: 0 },
      casual: { total: 5, used: 0, pending: 0 },
      unpaid: { used: 0 },
      updatedAt: new Date().toISOString(),
    };

    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      const emit = () => {
        const bal = localBalances[targetId] || localBalances[userId] || defaultBalance;
        onData(bal);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    try {
      // First try root leave_balances/{targetId}
      const rootDocRef = doc(firestore, 'leave_balances', targetId);
      const unsubRoot = onSnapshot(
        rootDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const normalized = normalizeCloudLeaveBalances(snapshot.data(), targetId);
            onData(normalized);
          } else {
            // Check organization partitioned collection: organizations/{orgId}/leave_balances/{targetId}
            getDocs(query(collection(firestore, 'organizations', targetOrg, 'leave_balances'), where('rawUserId', '==', targetId), limit(1)))
              .then((qSnap) => {
                if (!qSnap.empty) {
                  onData(normalizeCloudLeaveBalances(qSnap.docs[0].data(), targetId));
                } else {
                  onData(defaultBalance);
                }
              })
              .catch(() => {
                onData(defaultBalance);
              });
          }
        },
        (error) => {
          console.warn('[Firestore] subscribeToUserBalances root fallback, trying org path:', error.message);
          // Fallback to org partitioned path
          try {
            const orgDocRef = doc(firestore, 'organizations', targetOrg, 'leave_balances', targetId);
            onSnapshot(
              orgDocRef,
              (orgSnap) => {
                if (orgSnap.exists()) {
                  onData(normalizeCloudLeaveBalances(orgSnap.data(), targetId));
                } else {
                  onData(localBalances[targetId] || defaultBalance);
                }
              },
              () => onData(localBalances[targetId] || defaultBalance)
            );
          } catch {
            onData(localBalances[targetId] || defaultBalance);
          }
        }
      );

      return unsubRoot;
    } catch (err) {
      console.warn('[Firestore] subscribeToUserBalances failed:', err);
      onData(localBalances[targetId] || defaultBalance);
      return () => {};
    }
  },

  /**
   * Subscribe to organization leave categories and configured leave types from Cloud Firestore
   */
  subscribeToLeaveCategories: (
    orgId: string,
    onData: (categories: CloudLeaveCategory[]) => void
  ): Unsubscribe => {
    const targetOrg = (orgId || DEFAULT_ORG_ID).trim().toUpperCase();
    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      onData([]);
      return () => {};
    }

    try {
      const colRef = collection(firestore, 'organizations', targetOrg, 'leave_categories');
      return onSnapshot(
        colRef,
        (snapshot) => {
          const list: CloudLeaveCategory[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: data.id ?? docSnap.id,
              name: data.name || '',
              description: data.description || '',
              color: data.color || '#2563eb',
              isDefault: Boolean(data.isDefault),
              organizationId: targetOrg,
              leaveTypes: Array.isArray(data.leaveTypes)
                ? data.leaveTypes.map((t: any) => ({
                    id: t.id ?? '',
                    name: t.name || '',
                    code: (t.code || '').toUpperCase(),
                    daysAllowed: Number(t.daysAllowed ?? t.days_allowed ?? 0),
                    carryForwardDays: Number(t.carryForwardDays ?? t.carry_forward_days ?? 0),
                    isPaid: Boolean(t.isPaid ?? t.is_paid ?? true),
                    color: t.color || '#2563eb',
                    description: t.description || '',
                  }))
                : [],
              syncedAt: data.syncedAt,
            });
          });
          onData(list);
        },
        (err) => {
          console.warn('[Firestore] subscribeToLeaveCategories notice:', err.message);
          onData([]);
        }
      );
    } catch {
      onData([]);
      return () => {};
    }
  },

  /**
   * Subscribe to Manager Approval Queue (pending requests for team or all)
   */
  subscribeToManagerQueue: (
    managerId: string,
    onData: (requests: LeaveRequest[]) => void
  ): Unsubscribe => {
    if (!isFirebaseConfigured || !db) {
      const emit = () => {
        const queue = localRequests
          .filter((r) => r.status === 'pending')
          .map((r) => {
            const conflict = leaveService.checkTeamConflict(r, localRequests);
            return {
              ...r,
              hasConflict: conflict.hasConflict,
              conflictingUsers: conflict.conflictingUsers,
            };
          })
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        onData(queue);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    try {
      const q = query(
        collection(db, 'leave_requests'),
        where('status', '==', 'pending'),
        orderBy('startDate', 'asc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const list: LeaveRequest[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          onData(list);
        },
        (error) => {
          console.warn('[Firestore] subscribeToManagerQueue fallback:', error);
          const queue = localRequests.filter((r) => r.status === 'pending');
          onData(queue);
        }
      );
    } catch {
      onData(localRequests.filter((r) => r.status === 'pending'));
      return () => {};
    }
  },

  /**
   * Subscribe to Company Holidays directly from organizations/{orgId}/holidays in Firestore
   */
  subscribeToCompanyHolidays: (
    onData: (holidays: CompanyHoliday[]) => void,
    orgId?: string
  ): Unsubscribe => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!isFirebaseConfigured || !db) {
      onData(localHolidays);
      return () => {};
    }

    try {
      const orgHolidaysCol = collection(db, 'organizations', cleanOrg, 'holidays');
      return onSnapshot(
        orgHolidaysCol,
        (snapshot) => {
          const list: CompanyHoliday[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              title: data.name || data.title || 'Holiday',
              date: data.holidayDate || data.date || '',
              description: data.holidayType || data.description || 'Public Holiday',
              isOptional: Boolean(data.mercantileHoliday && !data.publicHoliday),
            });
          });

          // Sort chronologically ascending
          list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

          if (list.length > 0) {
            onData(list);
          } else {
            // Fallback to localHolidays if organization has no holidays
            onData(localHolidays);
          }
        },
        (err) => {
          console.warn('[Firestore] subscribeToCompanyHolidays error, fallback to local:', err.message);
          onData(localHolidays);
        }
      );
    } catch {
      onData(localHolidays);
      return () => {};
    }
  },

  /**
   * Get Company Holidays as Promise from organizations/{orgId}/holidays
   */
  getCompanyHolidays: async (orgId?: string): Promise<CompanyHoliday[]> => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!isFirebaseConfigured || !db) return localHolidays;

    try {
      const snap = await getDocs(collection(db, 'organizations', cleanOrg, 'holidays'));
      const list: CompanyHoliday[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.name || data.title || 'Holiday',
          date: data.holidayDate || data.date || '',
          description: data.holidayType || data.description || 'Public Holiday',
          isOptional: Boolean(data.mercantileHoliday && !data.publicHoliday),
        });
      });
      list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return list.length > 0 ? list : localHolidays;
    } catch (err) {
      console.warn('[Firestore] getCompanyHolidays error:', err);
      return localHolidays;
    }
  },

  /**
   * Subscribe to Organization Employees directly from Cloud Firestore
   */
  subscribeToOrganizationEmployees: (
    orgId: string,
    onData: (employees: any[]) => void
  ): Unsubscribe => {
    if (!isFirebaseConfigured || !db) {
      onData(MOCK_USERS);
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'organizations', orgId || 'DSOFFICE_LUNUGAMWEHERA', 'employees'),
        limit(100)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          onData(list.length > 0 ? list : MOCK_USERS);
        },
        (error) => {
          console.warn('[Firestore] subscribeToOrganizationEmployees error:', error);
          onData(MOCK_USERS);
        }
      );
    } catch {
      onData(MOCK_USERS);
      return () => {};
    }
  },

  /**
   * Subscribe to Team Leaves for Calendar overview
   */
  subscribeToTeamLeaves: (
    department: string,
    onData: (requests: LeaveRequest[]) => void
  ): Unsubscribe => {
    if (!isFirebaseConfigured || !db) {
      const emit = () => {
        const approvedAndPending = localRequests.filter(
          (r) =>
            r.department.toLowerCase() === department.toLowerCase() &&
            (r.status === 'approved' || r.status === 'pending')
        );
        onData(approvedAndPending);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    try {
      const q = query(
        collection(db, 'leave_requests'),
        where('department', '==', department)
      );
      return onSnapshot(
        q,
        (snapshot) => {
          const list: LeaveRequest[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as LeaveRequest;
            if (data.status === 'approved' || data.status === 'pending') {
              list.push({ ...data, id: docSnap.id });
            }
          });
          onData(list);
        },
        () => {
          onData(
            localRequests.filter(
              (r) =>
                r.department.toLowerCase() === department.toLowerCase() &&
                (r.status === 'approved' || r.status === 'pending')
            )
          );
        }
      );
    } catch {
      onData(localRequests);
      return () => {};
    }
  },

  /**
   * Apply for Leave with Real-Time Balance Validation & Transaction
   */
  applyForLeave: async (
    reqData: Omit<LeaveRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<string> => {
    const newId = `req_${Date.now()}`;
    const newRequest: LeaveRequest = {
      ...reqData,
      id: newId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Calculate Conflict
    const conflict = leaveService.checkTeamConflict(newRequest, localRequests);
    newRequest.hasConflict = conflict.hasConflict;
    newRequest.conflictingUsers = conflict.conflictingUsers;

    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      await new Promise((res) => setTimeout(res, 400));
      // Local balance check
      const userBal = localBalances[reqData.userId] || {
        userId: reqData.userId,
        year: 2026,
        annual: { total: 20, used: 0, pending: 0 },
        sick: { total: 10, used: 0, pending: 0 },
        casual: { total: 5, used: 0, pending: 0 },
        unpaid: { used: 0 },
        updatedAt: new Date().toISOString(),
      };

      if (reqData.leaveType !== 'unpaid') {
        const cat = userBal[reqData.leaveType];
        const available = cat.total - cat.used - cat.pending;
        if (reqData.totalDays > available) {
          throw new Error(
            `Insufficient ${reqData.leaveType} leave balance. Available: ${available} days, Requested: ${reqData.totalDays} days.`
          );
        }
        cat.pending += reqData.totalDays;
      }

      localRequests.unshift(newRequest);
      notifyListeners();
      return newId;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const targetBalId = String(reqData.fingerprintId || reqData.rawUserId || reqData.userId).trim();
        const targetOrg = (reqData.organizationId || DEFAULT_ORG_ID).trim().toUpperCase();

        const rootBalRef = doc(firestore, 'leave_balances', targetBalId);
        const orgBalRef = doc(firestore, 'organizations', targetOrg, 'leave_balances', targetBalId);

        let balanceSnap = await transaction.get(rootBalRef);
        let activeBalRef = rootBalRef;
        if (!balanceSnap.exists()) {
          balanceSnap = await transaction.get(orgBalRef);
          activeBalRef = orgBalRef;
        }

        if (balanceSnap.exists()) {
          const balanceData = balanceSnap.data() as any;

          // If structured balances array exists, check quota & add to pendingDays
          if (Array.isArray(balanceData.balances)) {
            const item = balanceData.balances.find(
              (b: any) =>
                (reqData.leaveTypeId && String(b.leaveTypeId) === String(reqData.leaveTypeId)) ||
                (reqData.leaveTypeCode && b.code === reqData.leaveTypeCode) ||
                (reqData.leaveType && (b.code === reqData.leaveType.toUpperCase() || b.leaveTypeName.toLowerCase() === reqData.leaveType.toLowerCase()))
            );
            if (item) {
              const totalDays = item.allocatedDays + (item.carriedForwardDays || 0);
              const available = totalDays > 0 ? Math.max(0, item.remainingDays - (item.pendingDays || 0)) : 999;
              if (totalDays > 0 && reqData.totalDays > available) {
                throw new Error(
                  `Insufficient ${item.leaveTypeName} balance. Available: ${available} days, Requested: ${reqData.totalDays} days.`
                );
              }
              item.pendingDays = (item.pendingDays || 0) + reqData.totalDays;
            }
          }

          if (reqData.leaveType !== 'unpaid' && balanceData[reqData.leaveType]) {
            const category = balanceData[reqData.leaveType];
            const available = category.total - category.used - category.pending;
            if (reqData.totalDays > available && category.total > 0) {
              throw new Error(
                `Insufficient ${reqData.leaveType} balance. Available: ${available} days, Requested: ${reqData.totalDays} days.`
              );
            }
            category.pending = (category.pending || 0) + reqData.totalDays;
          }

          balanceData.updatedAt = new Date().toISOString();
          transaction.set(activeBalRef, balanceData, { merge: true });
          if (activeBalRef === rootBalRef) {
            transaction.set(orgBalRef, balanceData, { merge: true });
          }
        }

        const requestDocRef = doc(collection(firestore, 'leave_requests'));
        const requestPayload = { ...newRequest };
        requestPayload.id = requestDocRef.id;
        transaction.set(requestDocRef, requestPayload);
      });

      return newId;
    } catch (err: any) {
      console.error('[Firestore] applyForLeave error:', err);
      throw new Error(err.message || 'Failed to submit leave request');
    }
  },

  /**
   * Cancel pending leave request
   */
  cancelLeaveRequest: async (requestId: string, userId: string): Promise<void> => {
    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      await new Promise((res) => setTimeout(res, 300));
      const target = localRequests.find((r) => r.id === requestId);
      if (target && target.status === 'pending') {
        target.status = 'cancelled';
        if (target.leaveType !== 'unpaid' && localBalances[userId]) {
          const cat = localBalances[userId][target.leaveType];
          if (cat) cat.pending = Math.max(0, cat.pending - target.totalDays);
        }
      }
      notifyListeners();
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const reqDocRef = doc(firestore, 'leave_requests', requestId);
        const reqSnap = await transaction.get(reqDocRef);

        if (!reqSnap.exists()) throw new Error('Request not found');
        const req = reqSnap.data() as LeaveRequest;

        if (req.status !== 'pending') {
          throw new Error('Only pending requests can be cancelled.');
        }

        // Restore pending balance
        const targetBalId = String(req.fingerprintId || req.rawUserId || req.userId).trim();
        const targetOrg = (req.organizationId || DEFAULT_ORG_ID).trim().toUpperCase();

        const rootBalRef = doc(firestore, 'leave_balances', targetBalId);
        const orgBalRef = doc(firestore, 'organizations', targetOrg, 'leave_balances', targetBalId);

        let balanceSnap = await transaction.get(rootBalRef);
        let activeBalRef = rootBalRef;
        if (!balanceSnap.exists()) {
          balanceSnap = await transaction.get(orgBalRef);
          activeBalRef = orgBalRef;
        }

        if (balanceSnap.exists()) {
          const bal = balanceSnap.data() as any;
          if (Array.isArray(bal.balances)) {
            const item = bal.balances.find(
              (b: any) =>
                (req.leaveTypeId && String(b.leaveTypeId) === String(req.leaveTypeId)) ||
                (req.leaveTypeCode && b.code === req.leaveTypeCode) ||
                (req.leaveType && (b.code === req.leaveType.toUpperCase() || b.leaveTypeName.toLowerCase() === req.leaveType.toLowerCase()))
            );
            if (item) {
              item.pendingDays = Math.max(0, (item.pendingDays || 0) - req.totalDays);
            }
          }
          if (req.leaveType !== 'unpaid' && bal[req.leaveType]) {
            bal[req.leaveType].pending = Math.max(0, (bal[req.leaveType].pending || 0) - req.totalDays);
          }
          bal.updatedAt = new Date().toISOString();
          transaction.set(activeBalRef, bal, { merge: true });
          if (activeBalRef === rootBalRef) {
            transaction.set(orgBalRef, bal, { merge: true });
          }
        }

        transaction.update(reqDocRef, {
          status: 'cancelled',
          reviewedAt: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      throw new Error(err.message || 'Failed to cancel leave request');
    }
  },

  /**
   * Manager Atomic Review (Approve or Reject)
   */
  reviewLeaveRequest: async (
    requestId: string,
    managerId: string,
    managerName: string,
    decision: 'approved' | 'rejected',
    comment: string = ''
  ): Promise<void> => {
    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      await new Promise((res) => setTimeout(res, 400));
      const target = localRequests.find((r) => r.id === requestId);
      if (!target) throw new Error('Request not found');

      target.status = decision;
      target.managerId = managerId;
      target.managerName = managerName;
      target.managerComment = comment;
      target.reviewedAt = new Date().toISOString();

      const userBal = localBalances[target.userId];
      if (userBal) {
        if (target.leaveType === 'unpaid') {
          if (decision === 'approved') {
            userBal.unpaid.used += target.totalDays;
          }
        } else {
          const cat = userBal[target.leaveType];
          if (cat) {
            cat.pending = Math.max(0, cat.pending - target.totalDays);
            if (decision === 'approved') {
              cat.used += target.totalDays;
            }
          }
        }
        userBal.updatedAt = new Date().toISOString();
      }

      notifyListeners();
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const reqDocRef = doc(firestore, 'leave_requests', requestId);
        const reqSnap = await transaction.get(reqDocRef);

        if (!reqSnap.exists()) throw new Error('Leave request not found.');
        const reqData = reqSnap.data() as LeaveRequest;

        if (reqData.status !== 'pending') {
          throw new Error('This request has already been reviewed.');
        }

        const targetBalId = String(reqData.fingerprintId || reqData.rawUserId || reqData.userId).trim();
        const targetOrg = (reqData.organizationId || DEFAULT_ORG_ID).trim().toUpperCase();

        const rootBalRef = doc(firestore, 'leave_balances', targetBalId);
        const orgBalRef = doc(firestore, 'organizations', targetOrg, 'leave_balances', targetBalId);

        let balanceSnap = await transaction.get(rootBalRef);
        let activeBalRef = rootBalRef;
        if (!balanceSnap.exists()) {
          balanceSnap = await transaction.get(orgBalRef);
          activeBalRef = orgBalRef;
        }

        if (balanceSnap.exists()) {
          const bal = balanceSnap.data() as any;

          // Update dynamic balances array
          if (Array.isArray(bal.balances)) {
            const item = bal.balances.find(
              (b: any) =>
                (reqData.leaveTypeId && String(b.leaveTypeId) === String(reqData.leaveTypeId)) ||
                (reqData.leaveTypeCode && b.code === reqData.leaveTypeCode) ||
                (reqData.leaveType && (b.code === reqData.leaveType.toUpperCase() || b.leaveTypeName.toLowerCase() === reqData.leaveType.toLowerCase()))
            );
            if (item) {
              item.pendingDays = Math.max(0, (item.pendingDays || 0) - reqData.totalDays);
              if (decision === 'approved') {
                item.usedDays = (item.usedDays || 0) + reqData.totalDays;
                item.remainingDays = Math.max(0, (item.remainingDays || 0) - reqData.totalDays);
              }
            }
          }

          // Update legacy categories
          if (reqData.leaveType === 'unpaid') {
            if (decision === 'approved' && bal.unpaid) {
              bal.unpaid.used = (bal.unpaid.used || 0) + reqData.totalDays;
            }
          } else if (bal[reqData.leaveType]) {
            const cat = bal[reqData.leaveType];
            cat.pending = Math.max(0, (cat.pending || 0) - reqData.totalDays);
            if (decision === 'approved') {
              cat.used = (cat.used || 0) + reqData.totalDays;
            }
          }

          bal.updatedAt = new Date().toISOString();
          transaction.set(activeBalRef, bal, { merge: true });
          if (activeBalRef === rootBalRef) {
            transaction.set(orgBalRef, bal, { merge: true });
          }
        }

        transaction.update(reqDocRef, {
          status: decision,
          managerId,
          managerName,
          managerComment: comment,
          reviewedAt: new Date().toISOString(),
        });
      });
    } catch (err: any) {
      console.error('[Firestore] reviewLeaveRequest error:', err);
      throw new Error(err.message || 'Failed to review request');
    }
  },

  /**
   * Seed Mock / Initial Data into Firestore (or reset local demo store)
   */
  seedDatabase: async (): Promise<string> => {
    // Reset local memory store
    localRequests = JSON.parse(JSON.stringify(MOCK_LEAVE_REQUESTS));
    localBalances = JSON.parse(JSON.stringify(MOCK_LEAVE_BALANCES));
    localHolidays = JSON.parse(JSON.stringify(MOCK_COMPANY_HOLIDAYS));
    notifyListeners();

    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      return 'Demo store reset successfully to initial factory state!';
    }

    try {
      // Seed users
      for (const user of MOCK_USERS) {
        await setDoc(doc(firestore, 'users', user.uid), user, { merge: true });
      }

      // Seed leave balances
      for (const [uid, bal] of Object.entries(MOCK_LEAVE_BALANCES)) {
        await setDoc(doc(firestore, 'leave_balances', uid), bal, { merge: true });
      }

      // Seed holidays
      for (const hol of MOCK_COMPANY_HOLIDAYS) {
        await setDoc(doc(firestore, 'company_holidays', hol.id), hol, { merge: true });
      }

      // Seed requests
      for (const req of MOCK_LEAVE_REQUESTS) {
        await setDoc(doc(firestore, 'leave_requests', req.id), req, { merge: true });
      }

      return 'Cloud Firestore seeded with Demo Users, Balances, Holidays, and Requests!';
    } catch (err: any) {
      console.error('[Firestore] Seeding error:', err);
      return `Seeding failed: ${err.message}`;
    }
  },
};
