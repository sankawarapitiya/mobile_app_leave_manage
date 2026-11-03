import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  UserRole,
  OrganizationInfo,
  AttendanceRecord,
  DailyAttendanceSummary,
} from '../types';
import { authService, DEFAULT_ORG_ID, DEFAULT_ORG_NAME } from '../services/firebase/authService';
import { MOCK_USERS } from '../services/mock/mockData';

const AUTH_USER_KEY = '@auth_user_profile';
const ORG_KEY = '@auth_selected_org';

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  activeRole: UserRole;
  currentOrgId: string;
  currentOrgName: string;
  availableOrganizations: OrganizationInfo[];
  recentPunches: AttendanceRecord[];
  dailyAttendance: DailyAttendanceSummary[];
  mobileAppUsers: UserProfile[];

  initialize: () => Promise<void>;
  login: (identifier: string, password: string, orgId?: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    fingerprintId: string,
    role: UserRole,
    department: string,
    designation: string,
    orgId?: string
  ) => Promise<void>;
  lookupTerminalEmployee: (
    orgId: string,
    fingerprintId: string
  ) => Promise<{
    name: string;
    department: string;
    employeeServiceId: string;
    role: string;
    userId: string;
  } | null>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  switchOrganization: (orgId: string, orgName?: string) => Promise<void>;
  verifyOrg: (orgId: string) => Promise<OrganizationInfo | null>;
  loadAvailableOrganizations: () => Promise<void>;
  loadRecentPunches: () => Promise<void>;
  loadMobileAppUsers: () => Promise<void>;
  updateMobileAppUser: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  deleteMobileAppUser: (uid: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  activeRole: 'employee',
  currentOrgId: DEFAULT_ORG_ID,
  currentOrgName: DEFAULT_ORG_NAME,
  availableOrganizations: [],
  recentPunches: [],
  dailyAttendance: [],
  mobileAppUsers: [],

  initialize: async () => {
    set({ isLoading: true });
    try {
      // 1. Fetch available organizations from Cloud Firestore
      const orgs = await authService.fetchAvailableOrganizations();
      const savedOrgId = (await AsyncStorage.getItem(ORG_KEY)) || DEFAULT_ORG_ID;
      const matchedOrg = orgs.find((o) => o.orgId === savedOrgId);

      const currentOrgId = matchedOrg ? matchedOrg.orgId : DEFAULT_ORG_ID;
      const currentOrgName = matchedOrg ? matchedOrg.organizationName : DEFAULT_ORG_NAME;

      // 2. Fetch saved user
      const savedUserStr = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (savedUserStr) {
        const savedUser: UserProfile = JSON.parse(savedUserStr);
        const isUserAdmin =
          (savedUser.designation || '').toLowerCase().includes('admin') ||
          (savedUser.role || '').toLowerCase() === 'manager' ||
          (savedUser.designation || '').toLowerCase().includes('manager');
        const resolvedRole: UserRole = isUserAdmin ? 'manager' : savedUser.role;

        set({
          user: savedUser,
          isAuthenticated: true,
          activeRole: resolvedRole,
          currentOrgId: savedUser.orgId || currentOrgId,
          currentOrgName: savedUser.orgName || currentOrgName,
          availableOrganizations: orgs,
          isLoading: false,
        });

        // Load recent attendance punches in background
        get().loadRecentPunches();
        return;
      }

      set({
        user: null,
        isAuthenticated: false,
        activeRole: 'employee',
        currentOrgId,
        currentOrgName,
        availableOrganizations: orgs,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  loadAvailableOrganizations: async () => {
    try {
      const orgs = await authService.fetchAvailableOrganizations();
      set({ availableOrganizations: orgs });
    } catch (e) {
      // Ignore
    }
  },

  lookupTerminalEmployee: async (orgId: string, fingerprintId: string) => {
    return await authService.lookupEmployeeByFingerprintId(orgId, fingerprintId);
  },

  loadRecentPunches: async () => {
    const user = get().user;
    const orgId = get().currentOrgId;
    if (!user) return;

    try {
      const userId =
        user.fingerprintId ||
        user.fingerprint_id ||
        user.rawUserId ||
        user.uid.replace('emp_', '');
      const [punches, dailySummaries] = await Promise.all([
        authService.fetchRecentPunches(orgId, userId),
        authService.fetchDailyAttendanceSummary(orgId, userId),
      ]);
      set({ recentPunches: punches, dailyAttendance: dailySummaries });
    } catch {
      // Ignore
    }
  },

  switchOrganization: async (orgId: string, orgName?: string) => {
    const name =
      orgName ||
      get().availableOrganizations.find((o) => o.orgId === orgId)?.organizationName ||
      orgId;
    await AsyncStorage.setItem(ORG_KEY, orgId);
    set({ currentOrgId: orgId, currentOrgName: name });
  },

  verifyOrg: async (orgId: string) => {
    return await authService.verifyOrganization(orgId);
  },

  login: async (identifier, password, orgId) => {
    set({ isLoading: true, error: null });
    const targetOrg = orgId || get().currentOrgId || DEFAULT_ORG_ID;

    try {
      const user = await authService.signIn(identifier, password, targetOrg);
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(ORG_KEY, targetOrg);

      const isUserAdmin =
        (user.designation || '').toLowerCase().includes('admin') ||
        (user.role || '').toLowerCase() === 'manager' ||
        (user.designation || '').toLowerCase().includes('manager');
      const resolvedRole: UserRole = isUserAdmin ? 'manager' : user.role;

      set({
        user,
        isAuthenticated: true,
        activeRole: resolvedRole,
        currentOrgId: targetOrg,
        currentOrgName: user.orgName || DEFAULT_ORG_NAME,
        isLoading: false,
      });

      // Load attendance punches
      get().loadRecentPunches();
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Login failed' });
      throw err;
    }
  },

  signup: async (
    email,
    password,
    fullName,
    fingerprintId,
    role,
    department,
    designation,
    orgId
  ) => {
    set({ isLoading: true, error: null });
    const targetOrg = orgId || get().currentOrgId || DEFAULT_ORG_ID;

    try {
      const user = await authService.signUp(
        email,
        password,
        fullName,
        fingerprintId,
        role,
        department,
        designation,
        targetOrg
      );
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(ORG_KEY, targetOrg);

      const isUserAdmin =
        (user.designation || '').toLowerCase().includes('admin') ||
        (user.role || '').toLowerCase() === 'manager' ||
        (user.designation || '').toLowerCase().includes('manager');
      const resolvedRole: UserRole = isUserAdmin ? 'manager' : user.role;

      set({
        user,
        isAuthenticated: true,
        activeRole: resolvedRole,
        currentOrgId: targetOrg,
        currentOrgName: user.orgName || DEFAULT_ORG_NAME,
        isLoading: false,
      });

      // Load attendance punches for the linked fingerprintId
      get().loadRecentPunches();
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Signup failed' });
      throw err;
    }
  },

  logout: async () => {
    try {
      await Promise.race([
        authService.signOutUser().catch((err) => {
          console.warn('[Auth] signOutUser error:', err);
        }),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {
      // Ignore
    }

    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    } catch (err) {
      console.warn('[Auth] removeItem error:', err);
    }

    set({
      user: null,
      isAuthenticated: false,
      recentPunches: [],
      dailyAttendance: [],
      isLoading: false,
      error: null,
    });
  },

  switchRole: (role) => {
    const current = get().user;
    if (current) {
      const isUserAdmin =
        (current.designation || '').toLowerCase().includes('admin') ||
        (current.role || '').toLowerCase() === 'manager' ||
        (current.designation || '').toLowerCase().includes('manager');
      if (isUserAdmin) {
        // Admin user is strictly locked to Manager view
        set({ activeRole: 'manager' });
        return;
      }
      const updated: UserProfile = { ...current, role };
      AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
      set({ user: updated, activeRole: role });
    } else {
      set({ activeRole: role });
    }
  },

  loadMobileAppUsers: async () => {
    const orgId = get().currentOrgId || DEFAULT_ORG_ID;
    try {
      authService.subscribeToMobileAppUsers(orgId, (users) => {
        set({ mobileAppUsers: users });
      });
    } catch {
      // Ignore
    }
  },

  updateMobileAppUser: async (uid, updates) => {
    const orgId = get().currentOrgId || DEFAULT_ORG_ID;
    await authService.updateMobileAppUser(orgId, uid, updates);
  },

  deleteMobileAppUser: async (uid) => {
    const orgId = get().currentOrgId || DEFAULT_ORG_ID;
    await authService.deleteMobileAppUser(orgId, uid);
    set((state) => ({
      mobileAppUsers: state.mobileAppUsers.filter((u) => u.uid !== uid),
    }));
  },

  clearError: () => set({ error: null }),
}));
