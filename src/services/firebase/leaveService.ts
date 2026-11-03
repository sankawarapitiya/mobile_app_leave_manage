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
   * Subscribe to employee's leave balance
   */
  subscribeToUserBalances: (
    userId: string,
    onData: (balances: UserLeaveBalances) => void
  ): Unsubscribe => {
    const defaultBalance: UserLeaveBalances = {
      userId,
      year: new Date().getFullYear(),
      annual: { total: 20, used: 0, pending: 0 },
      sick: { total: 10, used: 0, pending: 0 },
      casual: { total: 5, used: 0, pending: 0 },
      unpaid: { used: 0 },
      updatedAt: new Date().toISOString(),
    };

    if (!isFirebaseConfigured || !db) {
      const emit = () => {
        const bal = localBalances[userId] || defaultBalance;
        onData(bal);
      };
      emit();
      listeners.add(emit);
      return () => listeners.delete(emit);
    }

    try {
      const docRef = doc(db, 'leave_balances', userId);
      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            onData(snapshot.data() as UserLeaveBalances);
          } else {
            onData(defaultBalance);
          }
        },
        (error) => {
          console.warn('[Firestore] subscribeToUserBalances fallback:', error);
          onData(localBalances[userId] || defaultBalance);
        }
      );
    } catch {
      onData(localBalances[userId] || defaultBalance);
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
        const balanceDocRef = doc(firestore, 'leave_balances', reqData.userId);
        const balanceSnap = await transaction.get(balanceDocRef);

        if (!balanceSnap.exists()) {
          throw new Error('Leave balance profile not found.');
        }

        const balanceData = balanceSnap.data() as UserLeaveBalances;

        if (reqData.leaveType !== 'unpaid') {
          const category = balanceData[reqData.leaveType];
          const available = category.total - category.used - category.pending;

          if (reqData.totalDays > available) {
            throw new Error(
              `Insufficient ${reqData.leaveType} balance. Available: ${available} days, Requested: ${reqData.totalDays} days.`
            );
          }

          category.pending += reqData.totalDays;
          balanceData.updatedAt = new Date().toISOString();
          transaction.set(balanceDocRef, balanceData);
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
          cat.pending = Math.max(0, cat.pending - target.totalDays);
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
        if (req.leaveType !== 'unpaid') {
          const balanceDocRef = doc(firestore, 'leave_balances', userId);
          const balSnap = await transaction.get(balanceDocRef);
          if (balSnap.exists()) {
            const bal = balSnap.data() as UserLeaveBalances;
            bal[req.leaveType].pending = Math.max(0, bal[req.leaveType].pending - req.totalDays);
            bal.updatedAt = new Date().toISOString();
            transaction.set(balanceDocRef, bal);
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
          cat.pending = Math.max(0, cat.pending - target.totalDays);
          if (decision === 'approved') {
            cat.used += target.totalDays;
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

        const balanceDocRef = doc(firestore, 'leave_balances', reqData.userId);
        const balanceSnap = await transaction.get(balanceDocRef);

        if (balanceSnap.exists()) {
          const bal = balanceSnap.data() as UserLeaveBalances;

          if (reqData.leaveType === 'unpaid') {
            if (decision === 'approved') {
              bal.unpaid.used += reqData.totalDays;
            }
          } else {
            const cat = bal[reqData.leaveType];
            cat.pending = Math.max(0, cat.pending - reqData.totalDays);
            if (decision === 'approved') {
              cat.used += reqData.totalDays;
            }
          }

          bal.updatedAt = new Date().toISOString();
          transaction.set(balanceDocRef, bal);
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
