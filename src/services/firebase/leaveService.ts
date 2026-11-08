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
  LeaveRequestStatus,
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
 * Recursively removes all `undefined` fields from an object so Firestore accepts it without error
 */
export function cleanFirestorePayload<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestorePayload(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanFirestorePayload(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned as T;
}

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
    : data.casual?.total ?? 21;
  const casualUsed = casualItem ? casualItem.usedDays : data.casual?.used ?? 0;
  const casualPending = casualItem ? (casualItem.pendingDays || 0) : data.casual?.pending ?? 0;

  const sickTotal = sickItem
    ? sickItem.allocatedDays + (sickItem.carriedForwardDays || 0)
    : data.sick?.total ?? 24;
  const sickUsed = sickItem ? sickItem.usedDays : data.sick?.used ?? 0;
  const sickPending = sickItem ? (sickItem.pendingDays || 0) : data.sick?.pending ?? 0;

  const annualTotal = annualItem
    ? annualItem.allocatedDays + (annualItem.carriedForwardDays || 0)
    : balancesArray.length > 0
    ? 0
    : data.annual?.total ?? 0;
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

/**
 * Normalizes cloud leave request document to guarantee all required fields exist
 */
export function normalizeLeaveRequest(data: any, fallbackId?: string): LeaveRequest {
  if (!data) {
    return {
      id: fallbackId || String(Date.now()),
      userId: '',
      userName: 'Employee',
      department: 'General',
      leaveType: 'casual',
      leaveTypeName: 'Casual Leave',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      totalDays: 1,
      isHalfDay: false,
      status: 'pending',
      reason: '',
      appliedOn: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  const rawId = String(
    data.rawUserId ||
    data.fingerprintId ||
    data.fingerprint_id ||
    data.user_id ||
    data.userId ||
    ''
  ).replace(/^emp_/, '').trim();

  const rawStatus = String(data.status || data.status_upper || 'pending').toLowerCase();
  const validStatus: LeaveRequestStatus = (['approved', 'rejected', 'cancelled', 'pending'].includes(rawStatus)
    ? rawStatus
    : 'pending') as LeaveRequestStatus;

  const rawTypeName = String(data.leaveTypeName || data.leave_type_name || data.leaveType || data.leave_type || '').trim();
  const rawTypeCode = String(data.leaveTypeCode || data.leave_type_code || data.code || '').trim().toUpperCase();

  let resolvedLeaveType = 'casual';
  if (rawTypeName) {
    const lower = rawTypeName.toLowerCase();
    if (lower.includes('annual')) resolvedLeaveType = 'annual';
    else if (lower.includes('sick') || lower.includes('med')) resolvedLeaveType = 'sick';
    else if (lower.includes('cas')) resolvedLeaveType = 'casual';
    else if (lower.includes('unpaid') || lower.includes('nopay')) resolvedLeaveType = 'unpaid';
    else resolvedLeaveType = rawTypeName.toLowerCase().replace(/\s+/g, '_');
  } else if (rawTypeCode) {
    if (rawTypeCode === 'ANN' || rawTypeCode === 'AL') resolvedLeaveType = 'annual';
    else if (rawTypeCode === 'MED' || rawTypeCode === 'SL') resolvedLeaveType = 'sick';
    else if (rawTypeCode === 'CAS' || rawTypeCode === 'CL') resolvedLeaveType = 'casual';
    else if (rawTypeCode === 'NOPAY' || rawTypeCode === 'UL') resolvedLeaveType = 'unpaid';
    else resolvedLeaveType = rawTypeCode.toLowerCase();
  }

  const startDate = String(data.startDate || data.start_date || new Date().toISOString().slice(0, 10));
  const endDate = String(data.endDate || data.end_date || startDate);
  const totalDays = Number(data.totalDays ?? data.daysRequested ?? data.days_requested ?? data.days ?? 1) || 1;
  const numIdMatch = String(data.numericId || data.requestId || fallbackId || data.id || '').match(/\d+/);
  const numericId = numIdMatch ? parseInt(numIdMatch[0], 10) : undefined;
  const finalId = String(data.id || fallbackId || (numericId ? `req_${numericId}` : `req_${Date.now()}`));

  const displayName = data.employeeName || data.userName || (rawId ? `Employee #${rawId}` : 'Employee');
  const displayTypeName = rawTypeName || (resolvedLeaveType ? resolvedLeaveType.charAt(0).toUpperCase() + resolvedLeaveType.slice(1) + ' Leave' : 'Leave');

  return {
    ...data,
    id: finalId,
    cloudDocId: finalId,
    numericId,
    requestId: numericId,
    userId: String(data.userId || data.user_id || (rawId ? `emp_${rawId}` : 'emp_user')),
    user_id: rawId || String(data.user_id || data.userId || ''),
    rawUserId: rawId,
    fingerprintId: rawId,
    authUid: data.authUid || (data.userId && String(data.userId).startsWith('emp_') ? data.userId : undefined),
    organizationId: data.organizationId || data.orgId || data.org_id || DEFAULT_ORG_ID,
    org_id: data.org_id || data.orgId || data.organizationId || DEFAULT_ORG_ID,
    userName: displayName,
    employeeName: displayName,
    department: data.department || data.employee_department || 'General',
    leaveType: resolvedLeaveType,
    leaveTypeName: displayTypeName,
    leaveTypeCode: rawTypeCode,
    startDate,
    start_date: startDate,
    endDate,
    end_date: endDate,
    totalDays,
    daysRequested: totalDays,
    days_requested: totalDays,
    isHalfDay: Boolean(data.isHalfDay ?? data.is_half_day ?? false),
    halfDayPeriod: data.halfDayPeriod || data.half_day_period,
    status: validStatus,
    status_upper: validStatus.toUpperCase(),
    reason: data.reason || '',
    appliedOn: data.appliedOn || data.createdAt || data.created_at || new Date().toISOString(),
    createdAt: data.createdAt || data.created_at || data.appliedOn || new Date().toISOString(),
    updatedAt: data.updatedAt || data.updated_at || new Date().toISOString(),
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
    onData: (requests: LeaveRequest[]) => void,
    orgId?: string,
    rawUserId?: string
  ): Unsubscribe => {
    const rawId = String(rawUserId || userId || '').replace(/^emp_/, '').trim();
    const cleanAuthUid = String(userId || '').trim();
    const targetOrg = (orgId || DEFAULT_ORG_ID).trim().toUpperCase();

    if (!isFirebaseConfigured || !db) {
      const emit = () => {
        const userReqs = localRequests
          .filter((r) => r.userId === cleanAuthUid || r.userId === rawId || r.rawUserId === rawId)
          .sort((a, b) => new Date(b.createdAt || b.startDate || '').getTime() - new Date(a.createdAt || a.startDate || '').getTime());
        onData(userReqs);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    const firestore = db;
    let rootList: LeaveRequest[] = [];
    let orgList: LeaveRequest[] = [];

    const mergeAndEmit = () => {
      const map = new Map<string, LeaveRequest>();
      [...rootList, ...orgList].forEach((req) => {
        const numId = req.requestId || req.numericId || (typeof req.id === 'string' && req.id.startsWith('req_') ? req.id.replace('req_', '') : req.id);
        const key = String(numId || `${req.userId}_${req.startDate}_${req.leaveTypeId}`);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, req);
        } else {
          const existingStatus = String(existing.status || '').toLowerCase();
          const incomingStatus = String(req.status || '').toLowerCase();
          const existingPending = existingStatus === 'pending';
          const incomingPending = incomingStatus === 'pending';

          if (existingPending && !incomingPending) {
            // Incoming is decisive (approved/rejected/cancelled) -> update!
            map.set(key, req);
          } else if (!existingPending && incomingPending) {
            // Existing is decisive, ignore incoming stale pending
          } else {
            // Same status priority, pick newest timestamp
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const incomingTime = new Date(req.updatedAt || req.createdAt || 0).getTime();
            if (incomingTime >= existingTime) {
              map.set(key, req);
            }
          }
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt || b.startDate || '').getTime() - new Date(a.createdAt || a.startDate || '').getTime()
      );
      onData(merged);
    };

    let unsubRoot: Unsubscribe = () => {};
    try {
      unsubRoot = onSnapshot(
        collection(firestore, 'leave_requests'),
        (snapshot) => {
          rootList = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const docUserId = String(data.userId || '').replace(/^emp_/, '').trim();
            const docRawId = String(data.rawUserId || data.fingerprintId || data.fingerprint_id || data.user_id || '').trim();
            const docAuthUid = String(data.authUid || data.userId || '').trim();
            const matchesUser =
              (rawId && (docRawId === rawId || docUserId === rawId)) ||
              (cleanAuthUid && (docAuthUid === cleanAuthUid || docUserId === cleanAuthUid));
            if (matchesUser) {
              rootList.push(normalizeLeaveRequest(data, docSnap.id));
            }
          });
          mergeAndEmit();
        },
        (error) => {
          console.warn('[Firestore] subscribeToUserRequests root error:', error.message);
        }
      );
    } catch (e) {
      console.warn('[Firestore] subscribeToUserRequests root failed to attach:', e);
    }

    let unsubOrg: Unsubscribe = () => {};
    try {
      unsubOrg = onSnapshot(
        collection(firestore, 'organizations', targetOrg, 'leave_requests'),
        (snapshot) => {
          orgList = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const docUserId = String(data.userId || '').replace(/^emp_/, '').trim();
            const docRawId = String(data.rawUserId || data.fingerprintId || data.fingerprint_id || data.user_id || '').trim();
            const docAuthUid = String(data.authUid || data.userId || '').trim();
            const matchesUser =
              (rawId && (docRawId === rawId || docUserId === rawId)) ||
              (cleanAuthUid && (docAuthUid === cleanAuthUid || docUserId === cleanAuthUid));
            if (matchesUser) {
              orgList.push(normalizeLeaveRequest(data, docSnap.id));
            }
          });
          mergeAndEmit();
        },
        (error) => {
          console.warn('[Firestore] subscribeToUserRequests org error:', error.message);
        }
      );
    } catch (e) {
      console.warn('[Firestore] subscribeToUserRequests org failed to attach:', e);
    }

    return () => {
      unsubRoot();
      unsubOrg();
    };
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
    const fallbackId = String(userId || '').trim().replace(/^emp_/, '');
    const targetId = primaryId || fallbackId;
    const targetOrg = (orgId || DEFAULT_ORG_ID).trim().toUpperCase();

    const candidateIds = Array.from(
      new Set(
        [
          primaryId,
          fallbackId,
          String(userId || '').trim(),
          String(userId || '').replace(/^usr_/, '').replace(/^emp_/, '').trim(),
        ].filter(Boolean)
      )
    );

    const defaultBalance: UserLeaveBalances = {
      userId: targetId,
      rawUserId: targetId,
      year: new Date().getFullYear(),
      annual: { total: 0, used: 0, pending: 0 },
      sick: { total: 24, used: 0, pending: 0 },
      casual: { total: 21, used: 0, pending: 0 },
      unpaid: { used: 0 },
      updatedAt: new Date().toISOString(),
      balances: [
        {
          leaveTypeId: 1,
          leaveTypeName: 'Casual Leave',
          code: 'CAS',
          allocatedDays: 21,
          carriedForwardDays: 0,
          usedDays: 0,
          remainingDays: 21,
          pendingDays: 0,
          notes: 'Standard Quota',
          color: '#10b981',
          isPaid: true,
        },
        {
          leaveTypeId: 3,
          leaveTypeName: 'Medical / Sick Leave',
          code: 'MED',
          allocatedDays: 24,
          carriedForwardDays: 0,
          usedDays: 0,
          remainingDays: 24,
          pendingDays: 0,
          notes: 'Standard Quota',
          color: '#ef4444',
          isPaid: true,
        },
        {
          leaveTypeId: 18,
          leaveTypeName: 'Duty Leave',
          code: 'DL',
          allocatedDays: 0,
          carriedForwardDays: 0,
          usedDays: 0,
          remainingDays: 0,
          pendingDays: 0,
          notes: 'Official Duty • Quota-Free',
          color: '#6366f1',
          isPaid: true,
        },
        {
          leaveTypeId: 20,
          leaveTypeName: 'Comp-Off',
          code: 'CO',
          allocatedDays: 0,
          carriedForwardDays: 0,
          usedDays: 0,
          remainingDays: 0,
          pendingDays: 0,
          notes: 'Compensatory • Quota-Free',
          color: '#0284c7',
          isPaid: true,
        },
      ],
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
      let hasEmittedData = false;
      let lastEmittedUpdatedAt = 0;

      const handleBalanceSnap = (snapshot: any) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const updatedTime = new Date(data.updatedAt || 0).getTime();
          if (updatedTime >= lastEmittedUpdatedAt || !hasEmittedData) {
            lastEmittedUpdatedAt = updatedTime;
            hasEmittedData = true;
            const normalized = normalizeCloudLeaveBalances(data, targetId);
            onData(normalized);
          }
        }
      };

      const unsubList: Unsubscribe[] = [];
      const listenedDocIds = new Set<string>();

      candidateIds.forEach((id) => {
        if (!id || listenedDocIds.has(id)) return;
        listenedDocIds.add(id);

        const orgDocRef = doc(firestore, 'organizations', targetOrg, 'leave_balances', id);
        const uOrg = onSnapshot(
          orgDocRef,
          handleBalanceSnap,
          (err) => console.warn(`[Firestore] org leave_balance listener notice (${id}):`, err.message)
        );
        unsubList.push(uOrg);

        const rootDocRef = doc(firestore, 'leave_balances', id);
        const uRoot = onSnapshot(
          rootDocRef,
          handleBalanceSnap,
          (err) => console.warn(`[Firestore] root leave_balance listener notice (${id}):`, err.message)
        );
        unsubList.push(uRoot);
      });

      // Targeted query fallback if direct doc listeners don't find document within 500ms
      const fallbackTimer = setTimeout(async () => {
        if (hasEmittedData) return;
        try {
          const colRef = collection(firestore, 'organizations', targetOrg, 'leave_balances');
          let foundDoc: any = null;

          for (const cand of candidateIds) {
            const q = query(colRef, where('rawUserId', '==', cand), limit(1));
            const snap = await getDocs(q);
            if (!snap.empty) {
              foundDoc = snap.docs[0];
              break;
            }
          }

          if (!foundDoc) {
            for (const cand of candidateIds) {
              const q = query(colRef, where('userId', '==', cand), limit(1));
              const snap = await getDocs(q);
              if (!snap.empty) {
                foundDoc = snap.docs[0];
                break;
              }
            }
          }

          if (foundDoc && !hasEmittedData) {
            hasEmittedData = true;
            onData(normalizeCloudLeaveBalances(foundDoc.data(), targetId));
          } else if (!hasEmittedData) {
            hasEmittedData = true;
            onData(defaultBalance);
          }
        } catch (e) {
          if (!hasEmittedData) {
            hasEmittedData = true;
            onData(defaultBalance);
          }
        }
      }, 500);

      return () => {
        clearTimeout(fallbackTimer);
        unsubList.forEach((u) => u());
      };
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
    onData: (requests: LeaveRequest[]) => void,
    orgId?: string
  ): Unsubscribe => {
    const targetOrg = (orgId || DEFAULT_ORG_ID).trim().toUpperCase();

    if (!isFirebaseConfigured || !db) {
      const emit = () => {
        const queue = localRequests
          .filter((r) => String(r.status || r.status_upper || '').toLowerCase() === 'pending')
          .map((r) => {
            const conflict = leaveService.checkTeamConflict(r, localRequests);
            return {
              ...r,
              hasConflict: conflict.hasConflict,
              conflictingUsers: conflict.conflictingUsers,
            };
          })
          .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime());
        onData(queue);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    const firestore = db;
    let rootList: LeaveRequest[] = [];
    let orgList: LeaveRequest[] = [];

    const mergeAndEmit = () => {
      const map = new Map<string, LeaveRequest>();
      const allRequests = [...rootList, ...orgList];

      allRequests.forEach((req) => {
        const numId = req.requestId || req.numericId || (typeof req.id === 'string' && req.id.startsWith('req_') ? req.id.replace('req_', '') : req.id);
        const key = String(numId || `${req.userId}_${req.startDate}_${req.leaveTypeId}`);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, req);
        } else {
          const existingStatus = String(existing.status || '').toLowerCase();
          const incomingStatus = String(req.status || '').toLowerCase();
          const existingPending = existingStatus === 'pending';
          const incomingPending = incomingStatus === 'pending';

          if (existingPending && !incomingPending) {
            // Incoming is decisive (approved/rejected/cancelled) -> overwrite pending!
            map.set(key, req);
          } else if (!existingPending && incomingPending) {
            // Existing is decisive, ignore incoming stale pending
          } else {
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const incomingTime = new Date(req.updatedAt || req.createdAt || 0).getTime();
            if (incomingTime >= existingTime) {
              map.set(key, req);
            }
          }
        }
      });

      // Only requests that are strictly pending belong in the manager approval queue
      const queue = Array.from(map.values())
        .filter((r) => String(r.status || '').toLowerCase() === 'pending')
        .map((r) => {
          const conflict = leaveService.checkTeamConflict(r, allRequests);
          return {
            ...r,
            hasConflict: conflict.hasConflict,
            conflictingUsers: conflict.conflictingUsers,
          };
        })
        .sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime());

      onData(queue);
    };

    let unsubRoot: Unsubscribe = () => {};
    try {
      unsubRoot = onSnapshot(
        collection(firestore, 'leave_requests'),
        (snapshot) => {
          rootList = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            rootList.push(normalizeLeaveRequest(data, docSnap.id));
          });
          mergeAndEmit();
        },
        (error) => {
          console.warn('[Firestore] subscribeToManagerQueue root error:', error.message);
        }
      );
    } catch (e) {
      console.warn('[Firestore] subscribeToManagerQueue root failed to attach:', e);
    }

    let unsubOrg: Unsubscribe = () => {};
    try {
      unsubOrg = onSnapshot(
        collection(firestore, 'organizations', targetOrg, 'leave_requests'),
        (snapshot) => {
          orgList = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            orgList.push(normalizeLeaveRequest(data, docSnap.id));
          });
          mergeAndEmit();
        },
        (error) => {
          console.warn('[Firestore] subscribeToManagerQueue org error:', error.message);
        }
      );
    } catch (e) {
      console.warn('[Firestore] subscribeToManagerQueue org failed to attach:', e);
    }

    return () => {
      unsubRoot();
      unsubOrg();
    };
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
            if (data.status === 'approved' || data.status === 'pending' || (data as any).status_upper === 'APPROVED') {
              list.push(normalizeLeaveRequest(data, docSnap.id));
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
    const numericId = Math.floor(Date.now() / 1000);
    const rawId = String(reqData.fingerprintId || reqData.rawUserId || reqData.userId || '').replace(/^emp_/, '').trim();
    const targetOrg = (reqData.organizationId || DEFAULT_ORG_ID).trim().toUpperCase();
    const newId = `req_${numericId}`;

    const newRequest: LeaveRequest = {
      ...reqData,
      id: newId,
      requestId: numericId,
      numericId: numericId,
      userId: rawId,
      user_id: rawId,
      authUid: reqData.userId,
      rawUserId: rawId,
      fingerprintId: rawId,
      userName: reqData.userName || 'Employee',
      employeeName: reqData.userName || 'Employee',
      department: reqData.department || 'General',
      leaveType: reqData.leaveType || 'casual',
      leaveTypeId: Number(reqData.leaveTypeId) || 1,
      leave_type_id: Number(reqData.leaveTypeId) || 1,
      leaveTypeCode: reqData.leaveTypeCode || 'CAS',
      leave_type_code: reqData.leaveTypeCode || 'CAS',
      leaveTypeName: reqData.leaveTypeName || 'Casual Leave',
      leave_type_name: reqData.leaveTypeName || 'Casual Leave',
      leaveColor: reqData.leaveColor || '#2563eb',
      startDate: reqData.startDate,
      start_date: reqData.startDate,
      endDate: reqData.endDate || reqData.startDate,
      end_date: reqData.endDate || reqData.startDate,
      totalDays: reqData.totalDays,
      daysRequested: reqData.totalDays,
      days_requested: reqData.totalDays,
      reason: reqData.reason || '',
      isHalfDay: Boolean(reqData.isHalfDay),
      dayType: reqData.isHalfDay ? 'HALF_DAY' : 'FULL_DAY',
      day_type: reqData.isHalfDay ? 'HALF_DAY' : 'FULL_DAY',
      status: 'pending',
      status_upper: 'PENDING',
      organizationId: targetOrg,
      org_id: targetOrg,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Calculate Conflict
    const conflict = leaveService.checkTeamConflict(newRequest, localRequests);
    newRequest.hasConflict = conflict.hasConflict;
    newRequest.conflictingUsers = conflict.conflictingUsers;

    const firestore = db;
    if (!isFirebaseConfigured || !firestore) {
      await new Promise((res) => setTimeout(res, 400));
      // Local balance check
      const userBal = localBalances[rawId] || localBalances[reqData.userId] || {
        userId: rawId,
        year: 2026,
        annual: { total: 20, used: 0, pending: 0 },
        sick: { total: 10, used: 0, pending: 0 },
        casual: { total: 5, used: 0, pending: 0 },
        unpaid: { used: 0 },
        updatedAt: new Date().toISOString(),
      };

      if (reqData.leaveType !== 'unpaid') {
        const cat = userBal[reqData.leaveType];
        if (cat) {
          const available = cat.total - cat.used - cat.pending;
          if (reqData.totalDays > available) {
            throw new Error(
              `Insufficient ${reqData.leaveType} leave balance. Available: ${available} days, Requested: ${reqData.totalDays} days.`
            );
          }
          cat.pending += reqData.totalDays;
        }
      }

      localRequests.unshift(newRequest);
      notifyListeners();
      return newId;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        const rootBalRef = doc(firestore, 'leave_balances', rawId);
        const orgBalRef = doc(firestore, 'organizations', targetOrg, 'leave_balances', rawId);

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
                (reqData.leaveType && (b.code === reqData.leaveType.toUpperCase() || b.leaveTypeName?.toLowerCase() === reqData.leaveType.toLowerCase()))
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
          transaction.set(activeBalRef, cleanFirestorePayload(balanceData), { merge: true });
          if (activeBalRef === rootBalRef) {
            transaction.set(orgBalRef, cleanFirestorePayload(balanceData), { merge: true });
          }
        }

        // Set in root leave_requests AND organizations/{orgId}/leave_requests using identical unified req_${numericId}
        const unifiedDocId = `req_${numericId}`;
        const requestDocRef = doc(firestore, 'leave_requests', unifiedDocId);
        const orgDocRef = doc(firestore, 'organizations', targetOrg, 'leave_requests', unifiedDocId);

        const unifiedPayload = {
          ...newRequest,
          id: unifiedDocId,
          cloudDocId: unifiedDocId,
          requestId: numericId,
          numericId: numericId,
        };

        transaction.set(requestDocRef, cleanFirestorePayload(unifiedPayload));
        transaction.set(orgDocRef, cleanFirestorePayload({ ...unifiedPayload, id: numericId }));
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
        let reqSnap = await transaction.get(reqDocRef);
        let reqData: any = null;
        let isRootDoc = true;

        if (reqSnap.exists()) {
          reqData = reqSnap.data();
        } else {
          const targetOrg = DEFAULT_ORG_ID.trim().toUpperCase();
          const orgRef = doc(firestore, 'organizations', targetOrg, 'leave_requests', requestId);
          const orgSnap = await transaction.get(orgRef);
          if (orgSnap.exists()) {
            reqData = orgSnap.data();
            isRootDoc = false;
          }
        }

        if (!reqData) throw new Error('Request not found');

        const curStatus = String(reqData.status || reqData.status_upper || '').toLowerCase();
        if (curStatus !== 'pending') {
          throw new Error('Only pending requests can be cancelled.');
        }

        // Restore pending balance
        const targetBalId = String(reqData.fingerprintId || reqData.rawUserId || reqData.userId || '').replace(/^emp_/, '').trim();
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
          if (Array.isArray(bal.balances)) {
            const item = bal.balances.find(
              (b: any) =>
                (reqData.leaveTypeId && String(b.leaveTypeId) === String(reqData.leaveTypeId)) ||
                (reqData.leaveTypeCode && b.code === reqData.leaveTypeCode) ||
                (reqData.leaveType && (b.code === reqData.leaveType.toUpperCase() || b.leaveTypeName?.toLowerCase() === reqData.leaveType.toLowerCase()))
            );
            if (item) {
              item.pendingDays = Math.max(0, (item.pendingDays || 0) - reqData.totalDays);
            }
          }
          if (reqData.leaveType !== 'unpaid' && bal[reqData.leaveType]) {
            bal[reqData.leaveType].pending = Math.max(0, (bal[reqData.leaveType].pending || 0) - reqData.totalDays);
          }
          bal.updatedAt = new Date().toISOString();
          transaction.set(activeBalRef, cleanFirestorePayload(bal), { merge: true });
          if (activeBalRef === rootBalRef) {
            transaction.set(orgBalRef, cleanFirestorePayload(bal), { merge: true });
          }
        }

        const cancelUpdates = {
          status: 'cancelled',
          status_upper: 'CANCELLED',
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const numId = reqData.requestId || reqData.numericId;
        const cleanDocId = numId ? `req_${numId}` : requestId;
        const rootReqRef = doc(firestore, 'leave_requests', cleanDocId);
        const orgReqRef = doc(firestore, 'organizations', targetOrg, 'leave_requests', cleanDocId);
        transaction.set(rootReqRef, cleanFirestorePayload(cancelUpdates), { merge: true });
        transaction.set(orgReqRef, cleanFirestorePayload(cancelUpdates), { merge: true });
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
        let reqSnap = await transaction.get(reqDocRef);
        let reqData: any = null;

        if (reqSnap.exists()) {
          reqData = reqSnap.data();
        } else {
          const targetOrg = DEFAULT_ORG_ID.trim().toUpperCase();
          const fallbackOrgDocRef = doc(firestore, 'organizations', targetOrg, 'leave_requests', requestId);
          const fallbackSnap = await transaction.get(fallbackOrgDocRef);
          if (fallbackSnap.exists()) {
            reqData = fallbackSnap.data();
          }
        }

        if (!reqData) throw new Error('Leave request not found.');

        const curStatus = String(reqData.status || reqData.status_upper || '').toLowerCase();
        if (curStatus !== 'pending') {
          throw new Error('This request has already been reviewed.');
        }

        const targetBalId = String(reqData.fingerprintId || reqData.rawUserId || reqData.userId || '').replace(/^emp_/, '').trim();
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
                (reqData.leaveType && (b.code === reqData.leaveType.toUpperCase() || b.leaveTypeName?.toLowerCase() === reqData.leaveType.toLowerCase()))
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
          transaction.set(activeBalRef, cleanFirestorePayload(bal), { merge: true });
          if (activeBalRef === rootBalRef) {
            transaction.set(orgBalRef, cleanFirestorePayload(bal), { merge: true });
          }
        }

        const reviewUpdates = {
          status: decision,
          status_upper: decision.toUpperCase(),
          managerId: managerId || '',
          managerName: managerName || '',
          actionBy: managerName || '',
          action_by: managerName || '',
          managerComment: comment || '',
          actionRemarks: comment || '',
          action_remarks: comment || '',
          actionAt: new Date().toISOString(),
          action_at: new Date().toISOString(),
          reviewedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const numId = reqData.requestId || reqData.numericId;
        const cleanDocId = numId ? `req_${numId}` : requestId;
        const rootReqRef = doc(firestore, 'leave_requests', cleanDocId);
        const orgReqRef = doc(firestore, 'organizations', targetOrg, 'leave_requests', cleanDocId);
        transaction.set(rootReqRef, cleanFirestorePayload(reviewUpdates), { merge: true });
        transaction.set(orgReqRef, cleanFirestorePayload(reviewUpdates), { merge: true });
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
