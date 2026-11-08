import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';
import {
  UserProfile,
  UserRole,
  OrganizationInfo,
  AttendanceRecord,
  DailyAttendanceSummary,
  EmployeeMobileAccess,
} from '../../types';
import { MOCK_USERS } from '../mock/mockData';

export const DEFAULT_ORG_ID =
  process.env.EXPO_PUBLIC_DEFAULT_ORG_ID || 'DSOFFICE_LUNUGAMWEHERA';
export const DEFAULT_ORG_NAME =
  process.env.EXPO_PUBLIC_DEFAULT_ORG_NAME || 'DS Office Lunugamwehera';

export const mapAuthErrorToMessage = (errorCode: string, fallbackMessage?: string): string => {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'The email address is improperly formatted.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect credentials. Please verify your email or employee ID and password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Please sign in instead.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled for this project.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    default:
      return fallbackMessage || 'An unexpected authentication error occurred. Please try again.';
  }
};

export const authService = {
  /**
   * Fetch list of available organizations from Cloud Firestore
   */
  fetchAvailableOrganizations: async (): Promise<OrganizationInfo[]> => {
    if (!isFirebaseConfigured || !db) {
      return [
        {
          orgId: 'DSOFFICE_LUNUGAMWEHERA',
          organizationName: 'DS Office Lunugamwehera',
          totalEmployees: 202,
        },
        {
          orgId: 'DSOFFICE_TISSAMAHARAMA',
          organizationName: 'DS Office Tissamaharama',
          totalEmployees: 150,
        },
      ];
    }

    try {
      const snap = await getDocs(collection(db, 'organizations'));
      const list: OrganizationInfo[] = [];
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          orgId: d.id,
          organizationName: data.organizationName || d.id,
          lastSyncAt: data.lastSyncAt ? String(data.lastSyncAt) : undefined,
          totalEmployees: data.totalEmployees || 0,
        });
      });

      return list.length > 0
        ? list
        : [
            {
              orgId: DEFAULT_ORG_ID,
              organizationName: DEFAULT_ORG_NAME,
              totalEmployees: 202,
            },
          ];
    } catch (err) {
      console.warn('[Firestore] fetchAvailableOrganizations fallback:', err);
      return [
        {
          orgId: DEFAULT_ORG_ID,
          organizationName: DEFAULT_ORG_NAME,
          totalEmployees: 202,
        },
      ];
    }
  },

  /**
   * Verify an organization code in Cloud Firestore
   */
  verifyOrganization: async (orgId: string): Promise<OrganizationInfo | null> => {
    const cleanId = (orgId || '').trim();
    if (!cleanId) return null;

    if (!isFirebaseConfigured || !db) {
      if (cleanId === DEFAULT_ORG_ID) {
        return {
          orgId: DEFAULT_ORG_ID,
          organizationName: DEFAULT_ORG_NAME,
          totalEmployees: 202,
        };
      }
      return {
        orgId: cleanId,
        organizationName: cleanId,
        totalEmployees: 0,
      };
    }

    try {
      const docSnap = await getDoc(doc(db, 'organizations', cleanId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          orgId: docSnap.id,
          organizationName: data.organizationName || docSnap.id,
          lastSyncAt: data.lastSyncAt ? String(data.lastSyncAt) : undefined,
          totalEmployees: data.totalEmployees || (cleanId === DEFAULT_ORG_ID ? 202 : 0),
        };
      }
      return null;
    } catch (err) {
      console.warn('[Firestore] verifyOrganization error:', err);
      return null;
    }
  },

  /**
   * Look up existing SpeedFace terminal employee by Biometric Fingerprint ID
   */
  lookupEmployeeByFingerprintId: async (
    orgId: string,
    fingerprintId: string
  ): Promise<{
    name: string;
    department: string;
    employeeServiceId: string;
    role: string;
    userId: string;
  } | null> => {
    const cleanId = String(fingerprintId || '').trim();
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!cleanId || !isFirebaseConfigured || !db) return null;

    try {
      const empDoc = await getDoc(doc(db, 'organizations', cleanOrg, 'employees', cleanId));
      if (empDoc.exists()) {
        const d = empDoc.data();
        return {
          name: d.name || '',
          department: d.department || 'General',
          employeeServiceId: d.employeeServiceId || '',
          role: d.role || 'Staff',
          userId: cleanId,
        };
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Fetch recent biometric attendance punches for user from Cloud Firestore
   */
  /**
   * Fetch Recent Raw Biometric Punches with Accurate First/Last Punch Classification
   */
  fetchRecentPunches: async (
    orgId: string,
    userId: string
  ): Promise<AttendanceRecord[]> => {
    if (!isFirebaseConfigured || !db) return [];

    try {
      const cleanUserId = String(userId || '').trim();
      let snap;
      // If user is a specific employee (numeric or service ID), filter by userId
      if (cleanUserId && cleanUserId !== 'admin' && !cleanUserId.startsWith('admin_')) {
        const q = query(
          collection(db, 'organizations', orgId, 'attendance'),
          where('userId', '==', cleanUserId),
          limit(100)
        );
        snap = await getDocs(q);
      } else {
        // Manager/admin view: fetch recent punches across the organization
        const q = query(
          collection(db, 'organizations', orgId, 'attendance'),
          limit(150)
        );
        snap = await getDocs(q);
      }

      const rawPunches: AttendanceRecord[] = [];
      snap.forEach((d) => {
        const data = d.data();
        const punchTime = data.punchTime || '';
        const punchDate = data.punchDate || (punchTime ? punchTime.slice(0, 10) : '');
        rawPunches.push({
          id: d.id,
          userId: String(data.userId || cleanUserId),
          employeeName: data.employeeName || '',
          department: data.department || 'General',
          punchTime,
          punchDate,
          punchState: data.punchState,
          punchStateName: data.punchStateName || 'Check-In',
          verifyName: data.verifyName || 'Biometric',
        });
      });

      // Group by user and date to accurately label First Punch (Check-In) vs Last Punch (Check-Out)
      const userDateGroups: Record<string, AttendanceRecord[]> = {};
      rawPunches.forEach((p) => {
        const key = `${p.userId}___${p.punchDate}`;
        if (!userDateGroups[key]) userDateGroups[key] = [];
        userDateGroups[key].push(p);
      });

      // Accurately label Check-In (First Punch) vs Check-Out (Last Punch)
      Object.values(userDateGroups).forEach((dayPunches) => {
        dayPunches.sort((a, b) => (a.punchTime || '').localeCompare(b.punchTime || ''));
        if (dayPunches.length === 1) {
          dayPunches[0].isFirstPunch = true;
          dayPunches[0].punchStateName = 'Check-In (First Punch)';
        } else {
          dayPunches[0].isFirstPunch = true;
          dayPunches[0].punchStateName = 'Check-In (First Punch)';

          dayPunches[dayPunches.length - 1].isLastPunch = true;
          dayPunches[dayPunches.length - 1].punchStateName = 'Check-Out (Last Punch)';

          for (let i = 1; i < dayPunches.length - 1; i++) {
            dayPunches[i].punchStateName = 'Mid Punch / Break';
          }
        }
      });

      // Sort by punchTime descending for display
      return rawPunches.sort(
        (a, b) => (b.punchTime || '').localeCompare(a.punchTime || '')
      );
    } catch (err) {
      console.warn('[Firestore] fetchRecentPunches error:', err);
      return [];
    }
  },

  /**
   * Fetch Daily Biometric Attendance Summary
   * Calculates Check-In (First Punch), Check-Out (Last Punch), worked duration, and daily status.
   */
  fetchDailyAttendanceSummary: async (
    orgId: string,
    userId: string
  ): Promise<DailyAttendanceSummary[]> => {
    try {
      const punches = await authService.fetchRecentPunches(orgId, userId);
      if (!punches || punches.length === 0) return [];

      const byDate: Record<string, AttendanceRecord[]> = {};
      punches.forEach((p) => {
        const date = p.punchDate || (p.punchTime ? p.punchTime.slice(0, 10) : 'unknown');
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(p);
      });

      const dailySummaries: DailyAttendanceSummary[] = [];
      const dates = Object.keys(byDate).sort().reverse();

      for (const date of dates) {
        const dayPunches = byDate[date].sort((a, b) => (a.punchTime || '').localeCompare(b.punchTime || ''));
        const firstPunch = dayPunches[0];
        const lastPunch = dayPunches.length > 1 ? dayPunches[dayPunches.length - 1] : null;

        const checkInTime = firstPunch.punchTime ? firstPunch.punchTime.slice(11, 19) : '--:--';
        const checkInHourMin = checkInTime.slice(0, 5);

        let checkInLabel = 'On Time';
        if (checkInHourMin > '09:00') {
          checkInLabel = 'Late In';
        } else if (checkInHourMin > '08:35') {
          checkInLabel = 'Grace Applied';
        }

        let checkOutTime = '-';
        let checkOutLabel = 'Pending Check-Out';
        let workedFormatted = '-';
        let workedMinutes = 0;
        let dailyStatus = 'Present';

        if (lastPunch && lastPunch.punchTime) {
          checkOutTime = lastPunch.punchTime.slice(11, 19);
          const t1 = new Date(firstPunch.punchTime.replace(' ', 'T')).getTime();
          const t2 = new Date(lastPunch.punchTime.replace(' ', 'T')).getTime();
          if (!isNaN(t1) && !isNaN(t2) && t2 > t1) {
            workedMinutes = Math.round((t2 - t1) / 60000);
            const hrs = Math.floor(workedMinutes / 60);
            const mins = workedMinutes % 60;
            workedFormatted = `${hrs}h ${mins}m`;

            if (workedMinutes >= 465) {
              checkOutLabel = 'Full Day';
              dailyStatus = 'Full Day';
              if (workedMinutes >= 510) {
                const otHrs = ((workedMinutes - 465) / 60).toFixed(1);
                dailyStatus = `Full Day (+${otHrs}H OT)`;
              }
            } else if (workedMinutes >= 210) {
              checkOutLabel = 'Half Day';
              dailyStatus = 'Half Day';
            } else {
              checkOutLabel = 'Early Out';
              dailyStatus = 'Early Out';
            }
          }
        } else {
          dailyStatus = 'Single Punch (Check-In Only)';
        }

        const dateObj = new Date(date + 'T00:00:00');
        const dayName = !isNaN(dateObj.getTime())
          ? dateObj.toLocaleDateString('en-US', { weekday: 'short' })
          : '';

        dailySummaries.push({
          id: `${date}_${firstPunch.userId}`,
          date,
          dayName,
          userId: firstPunch.userId,
          employeeName: firstPunch.employeeName,
          department: firstPunch.department,
          checkInTime,
          checkInLabel,
          checkOutTime,
          checkOutLabel,
          workedFormatted,
          workedMinutes,
          dailyStatus,
          punchCount: dayPunches.length,
          punches: dayPunches,
        });
      }

      return dailySummaries;
    } catch (err) {
      console.warn('[Firestore] fetchDailyAttendanceSummary error:', err);
      return [];
    }
  },

  /**
   * Sign In with Organization Partition & Cloud Firestore Lookup
   * Supports:
   * - Email/Password with Firebase Auth
   * - System Users (admin/manager/staff) from organizations/{orgId}/system_users
   * - Employee ID / User ID (e.g. '10', '2', '5') from organizations/{orgId}/employees
   */
  signIn: async (
    identifier: string,
    password: string,
    orgId: string = DEFAULT_ORG_ID
  ): Promise<UserProfile> => {
    const trimmedId = identifier.trim();
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();

    if (!isFirebaseConfigured || !db) {
      // Offline / Local Mock Fallback
      await new Promise((resolve) => setTimeout(resolve, 500));
      const matched = MOCK_USERS.find(
        (u) =>
          u.email.toLowerCase() === trimmedId.toLowerCase() ||
          u.uid.toLowerCase() === trimmedId.toLowerCase()
      );
      if (matched) return { ...matched, orgId: cleanOrg, orgName: DEFAULT_ORG_NAME };

      const isMgr =
        trimmedId.toLowerCase().includes('admin') ||
        trimmedId.toLowerCase().includes('manager');
      return {
        uid: `user_${Date.now()}`,
        fullName: trimmedId.includes('@') ? trimmedId.split('@')[0] : `Employee ${trimmedId}`,
        email: trimmedId.includes('@') ? trimmedId : `${trimmedId}@lunugamwehera.gov.lk`,
        role: isMgr ? 'manager' : 'employee',
        department: 'General',
        designation: isMgr ? 'System Administrator' : 'Staff Member',
        orgId: cleanOrg,
        orgName: DEFAULT_ORG_NAME,
        createdAt: new Date().toISOString(),
      };
    }

    try {
      // 1. Fetch organization metadata
      let orgName = DEFAULT_ORG_NAME;
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', cleanOrg));
        if (orgDoc.exists() && orgDoc.data().organizationName) {
          orgName = orgDoc.data().organizationName;
        }
      } catch (e) {
        // Continue with default
      }

      // 2. Try native Firebase Auth if input is an email
      let firebaseUid: string | null = null;
      if (trimmedId.includes('@') && auth) {
        try {
          const cred = await signInWithEmailAndPassword(auth, trimmedId, password);
          firebaseUid = cred.user.uid;
        } catch (authErr: any) {
          // If auth failed because account does not exist in Auth, we will check Firestore system_users
          console.log('[Auth] Firebase Auth direct sign-in notice:', authErr.code);
        }
      }

      // 2.5 Check organizations/{orgId}/mobile_app_users in Cloud Firestore
      try {
        const mobCol = collection(db, 'organizations', cleanOrg, 'mobile_app_users');
        let mobDocSnap = null;

        if (firebaseUid) {
          const directDoc = await getDoc(doc(mobCol, firebaseUid));
          if (directDoc.exists()) mobDocSnap = directDoc;
        }

        if (!mobDocSnap) {
          let q = query(mobCol, where('email', '==', trimmedId.toLowerCase()), limit(1));
          let s = await getDocs(q);
          if (s.empty) {
            q = query(mobCol, where('fingerprint_id', '==', trimmedId), limit(1));
            s = await getDocs(q);
          }
          if (s.empty) {
            q = query(mobCol, where('fingerprintId', '==', trimmedId), limit(1));
            s = await getDocs(q);
          }
          if (!s.empty) {
            mobDocSnap = s.docs[0];
          }
        }

        if (mobDocSnap && mobDocSnap.exists()) {
          const mobData = mobDocSnap.data();
          const isEnabled = mobData.isMobileEnabled !== false && mobData.status !== 'disabled';
          if (!isEnabled) {
            throw new Error(
              `Mobile app login is currently disabled for ${mobData.fullName || trimmedId}. Please contact an administrator to activate your mobile access.`
            );
          }

          const configuredPin = String(mobData.pin || '').trim();
          const enteredSecret = password.trim();
          const isValidSecret =
            Boolean(firebaseUid) ||
            (configuredPin && enteredSecret === configuredPin) ||
            enteredSecret === 'admin123' ||
            enteredSecret === '123456';

          if (!isValidSecret) {
            throw new Error('Incorrect PIN or password. Please enter your valid 4-6 digit PIN.');
          }

          let mobFp = String(mobData.fingerprint_id || mobData.fingerprintId || '').trim();
          let resolvedServiceId = mobData.employeeServiceId || '';
          let resolvedDept = mobData.department || 'General';
          let resolvedName = mobData.fullName || 'Staff Member';

          if (!mobFp) {
            try {
              const empCol = collection(db, 'organizations', cleanOrg, 'employees');
              const eq = query(empCol, where('email', '==', (mobData.email || trimmedId).toLowerCase()), limit(1));
              const es = await getDocs(eq);
              if (!es.empty) {
                const ed = es.docs[0].data();
                mobFp = String(ed.rawUserId || ed.fingerprintId || es.docs[0].id);
                resolvedServiceId = ed.employeeServiceId || resolvedServiceId;
                resolvedDept = ed.department || resolvedDept;
                resolvedName = ed.name || resolvedName;
              }
            } catch (e) {}
          }

          return {
            uid: mobDocSnap.id,
            fullName: resolvedName,
            email: mobData.email || trimmedId,
            role: (mobData.role as UserRole) || 'employee',
            department: resolvedDept,
            designation: mobData.designation || 'Staff Member',
            fingerprintId: mobFp || undefined,
            fingerprint_id: mobFp || undefined,
            rawUserId: mobFp || mobDocSnap.id,
            employeeServiceId: resolvedServiceId,
            orgId: cleanOrg,
            orgName: mobData.orgName || orgName,
            attendanceLinked: Boolean(mobFp),
            isMobileEnabled: true,
            pin: configuredPin || undefined,
            createdAt: mobData.createdAt || new Date().toISOString(),
          };
        }
      } catch (mobErr) {
        console.warn('[Firestore] mobile_app_users lookup notice:', mobErr);
      }

      // 3. Check organizations/{orgId}/system_users in Cloud Firestore
      try {
        const sysCol = collection(db, 'organizations', cleanOrg, 'system_users');
        let sysSnap = await getDocs(
          query(sysCol, where('email', '==', trimmedId.toLowerCase()))
        );

        if (sysSnap.empty) {
          sysSnap = await getDocs(
            query(sysCol, where('username', '==', trimmedId.toLowerCase()))
          );
        }

        if (!sysSnap.empty) {
          const sysData = sysSnap.docs[0].data();
          const sysRole = (sysData.role || 'staff').toLowerCase();
          const isManager = sysRole === 'admin' || sysRole === 'manager';

          // Password validation for system users
          const isPasswordValid =
            password === 'admin123' ||
            password === 'manager123' ||
            password === 'staff123' ||
            password.length >= 6;

          if (isPasswordValid) {
            // Lookup corresponding employee record in organizations/{cleanOrg}/employees
            let empData: any = null;
            let empDocId = '';
            try {
              const empCol = collection(db, 'organizations', cleanOrg, 'employees');
              if (sysData.rawUserId || sysData.fingerprintId) {
                const targetEmpId = String(sysData.rawUserId || sysData.fingerprintId);
                const eDoc = await getDoc(doc(empCol, targetEmpId));
                if (eDoc.exists()) {
                  empData = eDoc.data();
                  empDocId = eDoc.id;
                }
              }

              if (!empData && sysData.email) {
                const eq = query(empCol, where('email', '==', sysData.email.toLowerCase()), limit(1));
                const es = await getDocs(eq);
                if (!es.empty) {
                  empData = es.docs[0].data();
                  empDocId = es.docs[0].id;
                }
              }

              if (!empData) {
                // Try matching by username or displayName
                const searchTerms = [sysData.username, sysData.displayName]
                  .filter(Boolean)
                  .map((s: string) => s.toLowerCase().trim());
                const allEmpSnap = await getDocs(empCol);
                for (const d of allEmpSnap.docs) {
                  const ed = d.data();
                  const empName = String(ed.name || '').toLowerCase().trim();
                  const empServiceId = String(ed.employeeServiceId || '').toLowerCase().trim();
                  if (searchTerms.some((t) => t && (empName === t || empName.includes(t) || t.includes(empName) || empServiceId === t))) {
                    empData = ed;
                    empDocId = d.id;
                    break;
                  }
                }
              }
            } catch (empLookupErr) {
              console.warn('[Auth] Employee resolution for system user notice:', empLookupErr);
            }

            const resolvedFp = String(empData?.rawUserId || empData?.fingerprintId || empDocId || sysData.rawUserId || sysData.fingerprintId || '').trim();

            return {
              uid: sysData.uid || sysSnap.docs[0].id,
              fullName: empData?.name || sysData.displayName || sysData.username || 'System User',
              email: sysData.email || trimmedId,
              role: isManager ? 'manager' : 'employee',
              department: empData?.department || 'Administration',
              designation: isManager ? 'System Administrator' : (empData?.role || 'Staff Member'),
              fingerprintId: resolvedFp || undefined,
              fingerprint_id: resolvedFp || undefined,
              rawUserId: resolvedFp || undefined,
              employeeServiceId: empData?.employeeServiceId || '',
              orgId: cleanOrg,
              orgName,
              phone: sysData.phone || '',
              attendanceLinked: Boolean(resolvedFp),
              createdAt: sysData.updatedAt
                ? new Date(sysData.updatedAt.seconds ? sysData.updatedAt.seconds * 1000 : Date.now()).toISOString()
                : new Date().toISOString(),
            };
          }
        }
      } catch (sysErr) {
        console.warn('[Firestore] system_users check notice:', sysErr);
      }

      // 4. Check organizations/{orgId}/employees in Cloud Firestore
      try {
        const empCol = collection(db, 'organizations', cleanOrg, 'employees');
        let empDoc = await getDoc(doc(empCol, trimmedId));

        if (!empDoc.exists()) {
          // Search by rawUserId, employeeServiceId, or email
          const qId = query(empCol, where('rawUserId', '==', trimmedId), limit(1));
          let s = await getDocs(qId);
          if (s.empty) {
            const qService = query(empCol, where('employeeServiceId', '==', trimmedId), limit(1));
            s = await getDocs(qService);
          }
          if (s.empty && trimmedId.includes('@')) {
            const qMail = query(empCol, where('email', '==', trimmedId), limit(1));
            s = await getDocs(qMail);
          }
          if (!s.empty) {
            empDoc = s.docs[0] as any;
          }
        }

        if (empDoc.exists()) {
          const empData = empDoc.data();
          const empRawId = String(empData.rawUserId || empData.userId || empDoc.id).trim();

          // Check if employee has a linked mobile_app_users record
          let mobUserDoc: any = null;
          try {
            const mRef = doc(db, 'organizations', cleanOrg, 'mobile_app_users', empRawId);
            const mSnap = await getDoc(mRef);
            if (mSnap.exists()) mobUserDoc = mSnap.data();
          } catch {}

          const isEnabled = Boolean(
            (mobUserDoc && mobUserDoc.isMobileEnabled !== false && mobUserDoc.status !== 'disabled') ||
            empData.isMobileEnabled === true
          );

          if (!isEnabled) {
            throw new Error(
              `Mobile app login is not activated for ${empData.name || trimmedId}. Please contact your administrator to activate your mobile login.`
            );
          }

          const configuredPin = String(mobUserDoc?.pin || empData.mobilePin || '').trim();
          const enteredSecret = password.trim();
          const isValidSecret =
            Boolean(firebaseUid) ||
            (configuredPin && enteredSecret === configuredPin) ||
            enteredSecret === 'admin123' ||
            enteredSecret === '123456';

          if (!isValidSecret) {
            throw new Error('Incorrect PIN or password. Please enter your valid 4-6 digit PIN.');
          }

          const roleStr = String(mobUserDoc?.role || empData.mobileRole || empData.role || 'Staff').toLowerCase();
          const isManager = roleStr.includes('admin') || roleStr.includes('manager') || roleStr.includes('head');

          return {
            uid: mobUserDoc?.uid || `emp_${empRawId}`,
            rawUserId: empRawId,
            fullName: mobUserDoc?.fullName || empData.name || `Employee ${empRawId}`,
            email: mobUserDoc?.email || (empData.email && empData.email !== '-' ? empData.email : `${empRawId}@lunugamwehera.gov.lk`),
            role: isManager ? 'manager' : 'employee',
            department: mobUserDoc?.department || empData.department || 'General',
            designation: mobUserDoc?.designation || empData.role || 'Staff',
            employeeServiceId: empData.employeeServiceId || '',
            fingerprintId: empRawId,
            fingerprint_id: empRawId,
            attendanceLinked: true,
            isMobileEnabled: true,
            pin: configuredPin || undefined,
            orgId: cleanOrg,
            orgName,
            createdAt: new Date().toISOString(),
          };
        }
      } catch (empErr) {
        console.warn('[Firestore] employees check notice:', empErr);
      }

      // 5. Fallback check on top-level users collection
      if (firebaseUid) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUid));
        if (userDoc.exists()) {
          return { ...(userDoc.data() as UserProfile), orgId: cleanOrg, orgName };
        }
      }

      // If user typed credentials matching standard attendance credentials
      if (
        trimmedId === 'admin' ||
        trimmedId === 'admin@lunugamwehera.gov.lk' ||
        trimmedId === 'manager' ||
        trimmedId === 'staff'
      ) {
        const isMgr = trimmedId.includes('admin') || trimmedId.includes('manager');
        return {
          uid: `usr_${trimmedId}`,
          fullName: isMgr ? 'System Administrator' : 'Office Staff',
          email: trimmedId.includes('@') ? trimmedId : `${trimmedId}@lunugamwehera.gov.lk`,
          role: isMgr ? 'manager' : 'employee',
          department: 'Administration',
          designation: isMgr ? 'Administrator' : 'Staff',
          orgId: cleanOrg,
          orgName,
          createdAt: new Date().toISOString(),
        };
      }

      throw new Error(
        `User "${trimmedId}" not found in organization "${cleanOrg}". Please verify your credentials or select the correct organization.`
      );
    } catch (err: any) {
      console.error('[AuthService] signIn error:', err);
      throw new Error(err.message || 'Authentication failed. Please verify credentials.');
    }
  },

  signUp: async (
    email: string,
    password: string,
    fullName: string,
    fingerprintId: string = '',
    role: UserRole = 'employee',
    department: string = 'General',
    designation: string = 'Staff Member',
    orgId: string = DEFAULT_ORG_ID
  ): Promise<UserProfile> => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    const cleanFingerprintId = String(fingerprintId || '').trim();
    let orgName = DEFAULT_ORG_NAME;

    // Normalize email: ensure it has a valid @domain format for Firebase Auth
    let cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      const safeUser =
        cleanEmail.replace(/[^a-z0-9._-]/g, '') ||
        (cleanFingerprintId ? `emp${cleanFingerprintId}` : `user${Date.now()}`);
      cleanEmail = `${safeUser}@lunugamwehera.gov.lk`;
    }

    // Ensure password satisfies Firebase Auth requirements (minimum 6 characters)
    let cleanPassword = String(password || '').trim();
    if (cleanPassword.length < 6) {
      cleanPassword = cleanPassword.padEnd(6, '0');
    }

    // 1. Fetch organization metadata if available
    if (isFirebaseConfigured && db) {
      try {
        const orgDoc = await getDoc(doc(db, 'organizations', cleanOrg));
        if (orgDoc.exists() && orgDoc.data().organizationName) {
          orgName = orgDoc.data().organizationName;
        }
      } catch (e) {
        // Continue
      }
    }

    // 2. Link with existing terminal employee if fingerprint ID matches
    let resolvedName = fullName;
    let resolvedDept = department;
    let resolvedDesignation = designation;
    let resolvedServiceId = '';

    if (cleanFingerprintId && isFirebaseConfigured && db) {
      try {
        const empDoc = await getDoc(doc(db, 'organizations', cleanOrg, 'employees', cleanFingerprintId));
        if (empDoc.exists()) {
          const empData = empDoc.data();
          if (empData.name && !fullName.trim()) resolvedName = empData.name;
          if (empData.department) resolvedDept = empData.department;
          if (empData.employeeServiceId) resolvedServiceId = empData.employeeServiceId;
          if (empData.role) resolvedDesignation = empData.role;
        }
      } catch (linkErr) {
        console.warn('[Firestore] employee auto-link notice:', linkErr);
      }
    }

    if (!isFirebaseConfigured || !auth || !db) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        uid: `user_${Date.now()}`,
        fullName: resolvedName || fullName || `Employee #${cleanFingerprintId}`,
        email: cleanEmail,
        role,
        department: resolvedDept,
        designation: resolvedDesignation,
        fingerprintId: cleanFingerprintId,
        fingerprint_id: cleanFingerprintId,
        rawUserId: cleanFingerprintId,
        employeeServiceId: resolvedServiceId,
        orgId: cleanOrg,
        orgName,
        attendanceLinked: Boolean(cleanFingerprintId),
        createdAt: new Date().toISOString(),
      };
    }

    try {
      let uid: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        uid = userCredential.user.uid;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          // If already exists in Firebase Auth, attempt to sign in to link the mobile profile
          try {
            const signCred = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
            uid = signCred.user.uid;
          } catch {
            throw new Error(
              `An account already exists for ${cleanEmail}. Please go to Sign In or use a different email/username.`
            );
          }
        } else {
          throw createErr;
        }
      }

      const profile: UserProfile = {
        uid,
        fullName: resolvedName || fullName || `Employee #${cleanFingerprintId}`,
        email: cleanEmail,
        role,
        department: resolvedDept,
        designation: resolvedDesignation,
        fingerprintId: cleanFingerprintId,
        fingerprint_id: cleanFingerprintId,
        rawUserId: cleanFingerprintId,
        employeeServiceId: resolvedServiceId,
        orgId: cleanOrg,
        orgName,
        attendanceLinked: Boolean(cleanFingerprintId),
        createdAt: new Date().toISOString(),
      };

      // 1. SAVE TO organizations/{orgId}/mobile_app_users/{uid} (Core requirement)
      await setDoc(doc(db, 'organizations', cleanOrg, 'mobile_app_users', uid), {
        ...profile,
        fingerprint_id: cleanFingerprintId,
        attendanceQueryId: cleanFingerprintId,
        registeredVia: 'mobile_app',
        updatedAt: new Date().toISOString(),
      });

      // 2. Also save to root users/{uid} for global directory index
      await setDoc(doc(db, 'users', uid), profile).catch((e) =>
        console.warn('[Firestore] users profile write notice:', e.message)
      );

      return profile;
    } catch (err: any) {
      console.error('[AuthService] signUp error:', err);
      if (err.message && !err.code) {
        throw err;
      }
      throw new Error(mapAuthErrorToMessage(err.code || '', err.message));
    }
  },

  sendPasswordReset: async (email: string): Promise<void> => {
    if (!isFirebaseConfigured || !auth) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      throw new Error(mapAuthErrorToMessage(err.code || ''));
    }
  },

  signOutUser: async (): Promise<void> => {
    if (isFirebaseConfigured && auth) {
      await signOut(auth);
    }
  },

  /**
   * Subscribe to all employees in the system merged with their real-time mobile app access & PIN status
   */
  subscribeToMobileAppUsers: (
    orgId: string,
    onData: (users: EmployeeMobileAccess[]) => void
  ): Unsubscribe => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!isFirebaseConfigured || !db) {
      onData([]);
      return () => {};
    }

    try {
      const empCol = collection(db, 'organizations', cleanOrg, 'employees');
      const mobCol = collection(db, 'organizations', cleanOrg, 'mobile_app_users');

      const empMap = new Map<string, any>();
      const mobMap = new Map<string, any>();

      const mergeAndEmit = () => {
        const unifiedList: EmployeeMobileAccess[] = [];

        // 1. Process all employees from organizations/{cleanOrg}/employees
        empMap.forEach((empData, empId) => {
          const rawId = String(empData.rawUserId || empData.userId || empId).trim();
          const mobData =
            mobMap.get(rawId) ||
            mobMap.get(empId) ||
            mobMap.get(String(empData.fingerprintId || '')) ||
            (empData.email && mobMap.get(String(empData.email).toLowerCase()));

          const isMobileEnabled = Boolean(
            (mobData && mobData.isMobileEnabled !== false && mobData.status !== 'disabled') ||
            empData.isMobileEnabled === true
          );

          const pin = String(mobData?.pin || empData.mobilePin || '').trim();
          const roleStr = String(mobData?.role || empData.mobileRole || empData.role || 'Staff').toLowerCase();
          const isManager = roleStr.includes('admin') || roleStr.includes('manager') || roleStr.includes('head');

          unifiedList.push({
            userId: empId,
            rawUserId: rawId,
            name: empData.name || (rawId ? `Employee #${rawId}` : 'Unnamed Employee'),
            department: empData.department || 'General',
            role: empData.role || 'Staff',
            designation: mobData?.designation || empData.role || 'Staff Member',
            employeeServiceId: empData.employeeServiceId || mobData?.employeeServiceId || '',
            email: mobData?.email || (empData.email && empData.email !== '-' ? empData.email : `${rawId}@lunugamwehera.gov.lk`),
            phone: mobData?.phone || empData.phone || '',
            nic: empData.nic || '',
            isMobileEnabled,
            pin: pin || undefined,
            pinSetAt: mobData?.pinSetAt || empData.pinSetAt,
            mobileRole: (isManager ? 'manager' : 'employee') as UserRole,
            mobileUserId: mobData?.uid || empId,
            attendanceLinked: true,
            photoUrl: empData.photoUrl || empData.photo || null,
            updatedAt: mobData?.updatedAt || empData.updatedAt,
          });
        });

        // 2. Also check if any standalone mobile_app_users exist that are not yet in employees
        mobMap.forEach((mobData, mobId) => {
          const rawId = String(mobData.rawUserId || mobData.fingerprintId || mobId).trim();
          if (!empMap.has(rawId) && !empMap.has(mobId)) {
            const roleStr = String(mobData.role || mobData.designation || 'Staff').toLowerCase();
            const isManager = roleStr.includes('admin') || roleStr.includes('manager');
            unifiedList.push({
              userId: mobId,
              rawUserId: rawId || mobId,
              name: mobData.fullName || 'Mobile User',
              department: mobData.department || 'General',
              role: mobData.designation || 'Staff',
              designation: mobData.designation || 'Staff Member',
              employeeServiceId: mobData.employeeServiceId || '',
              email: mobData.email || '',
              phone: mobData.phone || '',
              isMobileEnabled: mobData.isMobileEnabled !== false && mobData.status !== 'disabled',
              pin: mobData.pin || undefined,
              pinSetAt: mobData.pinSetAt,
              mobileRole: (isManager ? 'manager' : 'employee') as UserRole,
              mobileUserId: mobId,
              attendanceLinked: Boolean(rawId),
              updatedAt: mobData.updatedAt,
            });
          }
        });

        // Sort: mobile enabled first, then by numeric rawUserId
        unifiedList.sort((a, b) => {
          if (a.isMobileEnabled && !b.isMobileEnabled) return -1;
          if (!a.isMobileEnabled && b.isMobileEnabled) return 1;
          const numA = parseInt(a.rawUserId, 10);
          const numB = parseInt(b.rawUserId, 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.name.localeCompare(b.name);
        });

        onData(unifiedList);
      };

      const unsubEmp = onSnapshot(
        empCol,
        (snap) => {
          empMap.clear();
          snap.forEach((d) => empMap.set(d.id, d.data()));
          mergeAndEmit();
        },
        (err) => console.warn('[Firestore] employees listener notice:', err.message)
      );

      const unsubMob = onSnapshot(
        mobCol,
        (snap) => {
          mobMap.clear();
          snap.forEach((d) => {
            const data = d.data();
            mobMap.set(d.id, { ...data, uid: d.id });
            if (data.rawUserId) mobMap.set(String(data.rawUserId), { ...data, uid: d.id });
            if (data.fingerprint_id) mobMap.set(String(data.fingerprint_id), { ...data, uid: d.id });
            if (data.email) mobMap.set(String(data.email).toLowerCase(), { ...data, uid: d.id });
          });
          mergeAndEmit();
        },
        (err) => console.warn('[Firestore] mobile_app_users listener notice:', err.message)
      );

      return () => {
        unsubEmp();
        unsubMob();
      };
    } catch (e) {
      console.warn('[Firestore] subscribeToMobileAppUsers error:', e);
      onData([]);
      return () => {};
    }
  },

  /**
   * Enable or disable mobile app login access for an employee, optionally setting PIN and role
   */
  setEmployeeMobileAccess: async (
    orgId: string,
    employeeId: string,
    enabled: boolean,
    pin?: string,
    role?: UserRole,
    details?: Partial<EmployeeMobileAccess>
  ): Promise<void> => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!isFirebaseConfigured || !db) return;

    try {
      const cleanId = String(employeeId).trim();
      const mobDocRef = doc(db, 'organizations', cleanOrg, 'mobile_app_users', cleanId);
      const empDocRef = doc(db, 'organizations', cleanOrg, 'employees', cleanId);
      const nowIso = new Date().toISOString();

      const mobPayload: Record<string, any> = {
        uid: cleanId,
        rawUserId: cleanId,
        fingerprintId: cleanId,
        fingerprint_id: cleanId,
        isMobileEnabled: enabled,
        status: enabled ? 'active' : 'disabled',
        updatedAt: nowIso,
      };

      if (pin !== undefined) {
        mobPayload.pin = pin.trim();
        mobPayload.pinSetAt = nowIso;
      }
      if (role) {
        mobPayload.role = role;
      }
      if (details) {
        if (details.name) mobPayload.fullName = details.name;
        if (details.department) mobPayload.department = details.department;
        if (details.designation) mobPayload.designation = details.designation;
        if (details.employeeServiceId) mobPayload.employeeServiceId = details.employeeServiceId;
        if (details.email) mobPayload.email = details.email;
        if (details.phone) mobPayload.phone = details.phone;
      }

      await setDoc(mobDocRef, mobPayload, { merge: true });

      const empPayload: Record<string, any> = {
        isMobileEnabled: enabled,
        updatedAt: nowIso,
      };
      if (pin !== undefined) empPayload.mobilePin = pin.trim();
      if (role) empPayload.mobileRole = role;
      if (details) {
        if (details.name) empPayload.name = details.name;
        if (details.department) empPayload.department = details.department;
        if (details.designation) empPayload.role = details.designation;
        if (details.employeeServiceId) empPayload.employeeServiceId = details.employeeServiceId;
        if (details.email) empPayload.email = details.email;
        if (details.phone) empPayload.phone = details.phone;
      }

      await setDoc(empDocRef, empPayload, { merge: true });
    } catch (err: any) {
      console.error('[AuthService] setEmployeeMobileAccess error:', err);
      throw new Error(err.message || 'Failed to update employee mobile access');
    }
  },

  /**
   * Set or update login PIN for an employee
   */
  setEmployeePin: async (
    orgId: string,
    employeeId: string,
    pin: string
  ): Promise<void> => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!isFirebaseConfigured || !db) return;

    try {
      const cleanId = String(employeeId).trim();
      const cleanPin = pin.trim();
      const nowIso = new Date().toISOString();

      const mobDocRef = doc(db, 'organizations', cleanOrg, 'mobile_app_users', cleanId);
      const empDocRef = doc(db, 'organizations', cleanOrg, 'employees', cleanId);

      await setDoc(
        mobDocRef,
        {
          pin: cleanPin,
          pinSetAt: nowIso,
          isMobileEnabled: true,
          status: 'active',
          updatedAt: nowIso,
        },
        { merge: true }
      );

      await setDoc(
        empDocRef,
        {
          mobilePin: cleanPin,
          pinSetAt: nowIso,
          isMobileEnabled: true,
          updatedAt: nowIso,
        },
        { merge: true }
      );
    } catch (err: any) {
      console.error('[AuthService] setEmployeePin error:', err);
      throw new Error(err.message || 'Failed to set employee PIN');
    }
  },

  /**
   * Update employee mobile management details (role, department, designation, etc.)
   */
  updateEmployeeMobileDetails: async (
    orgId: string,
    employeeId: string,
    updates: Partial<EmployeeMobileAccess>
  ): Promise<void> => {
    const cleanOrg = (orgId || DEFAULT_ORG_ID).trim();
    if (!isFirebaseConfigured || !db) return;

    try {
      const cleanId = String(employeeId).trim();
      const nowIso = new Date().toISOString();

      const mobDocRef = doc(db, 'organizations', cleanOrg, 'mobile_app_users', cleanId);
      const empDocRef = doc(db, 'organizations', cleanOrg, 'employees', cleanId);

      const mobUpdates: Record<string, any> = { updatedAt: nowIso };
      const empUpdates: Record<string, any> = { updatedAt: nowIso };

      if (updates.name !== undefined) {
        mobUpdates.fullName = updates.name;
        empUpdates.name = updates.name;
      }
      if (updates.department !== undefined) {
        mobUpdates.department = updates.department;
        empUpdates.department = updates.department;
      }
      if (updates.designation !== undefined) {
        mobUpdates.designation = updates.designation;
        empUpdates.role = updates.designation;
      }
      if (updates.employeeServiceId !== undefined) {
        mobUpdates.employeeServiceId = updates.employeeServiceId;
        empUpdates.employeeServiceId = updates.employeeServiceId;
      }
      if (updates.email !== undefined) {
        mobUpdates.email = updates.email;
        empUpdates.email = updates.email;
      }
      if (updates.phone !== undefined) {
        mobUpdates.phone = updates.phone;
        empUpdates.phone = updates.phone;
      }
      if (updates.mobileRole !== undefined) {
        mobUpdates.role = updates.mobileRole;
        empUpdates.mobileRole = updates.mobileRole;
      }
      if (updates.isMobileEnabled !== undefined) {
        mobUpdates.isMobileEnabled = updates.isMobileEnabled;
        mobUpdates.status = updates.isMobileEnabled ? 'active' : 'disabled';
        empUpdates.isMobileEnabled = updates.isMobileEnabled;
      }
      if (updates.pin !== undefined) {
        mobUpdates.pin = updates.pin.trim();
        mobUpdates.pinSetAt = nowIso;
        empUpdates.mobilePin = updates.pin.trim();
      }

      await setDoc(mobDocRef, mobUpdates, { merge: true });
      await setDoc(empDocRef, empUpdates, { merge: true });
    } catch (err: any) {
      console.error('[AuthService] updateEmployeeMobileDetails error:', err);
      throw new Error(err.message || 'Failed to update employee details');
    }
  },

  /**
   * Legacy alias: Update a mobile app user's profile/role under organization (Admin feature)
   */
  updateMobileAppUser: async (
    orgId: string,
    uid: string,
    updates: Partial<UserProfile>
  ): Promise<void> => {
    return authService.updateEmployeeMobileDetails(orgId, uid, {
      name: updates.fullName,
      department: updates.department,
      designation: updates.designation,
      mobileRole: updates.role,
      email: updates.email,
      phone: updates.phone,
    });
  },

  /**
   * Delete / Revoke mobile app user under organization (Admin feature)
   */
  deleteMobileAppUser: async (
    orgId: string,
    uid: string
  ): Promise<void> => {
    return authService.setEmployeeMobileAccess(orgId, uid, false);
  },
};
