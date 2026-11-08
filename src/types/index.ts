export type UserRole = 'employee' | 'manager';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  designation: string;
  avatarUrl?: string;
  managerId?: string;
  orgId?: string;
  orgName?: string;
  fingerprintId?: string;
  fingerprint_id?: string;
  employeeServiceId?: string;
  rawUserId?: string;
  phone?: string;
  attendanceLinked?: boolean;
  isMobileEnabled?: boolean;
  pin?: string;
  pinSetAt?: string;
  createdAt: string;
}

export interface EmployeeMobileAccess {
  userId: string;
  rawUserId: string;
  name: string;
  department: string;
  role: string;
  designation: string;
  employeeServiceId: string;
  email: string;
  phone: string;
  nic?: string;
  isMobileEnabled: boolean;
  pin?: string;
  pinSetAt?: string;
  mobileRole: UserRole;
  mobileUserId?: string;
  lastLoginAt?: string;
  attendanceLinked?: boolean;
  photoUrl?: string | null;
  updatedAt?: string;
}

export interface OrganizationInfo {
  orgId: string;
  organizationName: string;
  lastSyncAt?: string;
  totalEmployees?: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  employeeName: string;
  department: string;
  punchTime: string;
  punchDate: string;
  punchState?: number;
  punchStateName: string;
  verifyName: string;
  isFirstPunch?: boolean;
  isLastPunch?: boolean;
}

export interface DailyAttendanceSummary {
  id: string;
  date: string;
  dayName: string;
  userId: string;
  employeeName: string;
  department: string;
  checkInTime: string;
  checkInLabel: string;
  checkOutTime: string;
  checkOutLabel: string;
  workedFormatted: string;
  workedMinutes: number;
  dailyStatus: string;
  punchCount: number;
  punches: AttendanceRecord[];
}

export interface LeaveBalanceCategory {
  total: number;
  used: number;
  pending: number;
}

export interface EmployeeLeaveBalanceItem {
  leaveTypeId: number | string;
  leaveTypeName: string;
  code: string;
  allocatedDays: number;
  carriedForwardDays?: number;
  usedDays: number;
  remainingDays: number;
  notes?: string;
  color?: string;
  isPaid?: boolean;
  pendingDays?: number;
}

export interface CloudLeaveType {
  id: number | string;
  name: string;
  code: string;
  daysAllowed: number;
  carryForwardDays?: number;
  isPaid: boolean;
  color: string;
  description?: string;
}

export interface CloudLeaveCategory {
  id: number | string;
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  organizationId?: string;
  leaveTypes: CloudLeaveType[];
  syncedAt?: any;
}

export interface UserLeaveBalances {
  userId: string;
  rawUserId?: string;
  name?: string;
  department?: string;
  organizationId?: string;
  year: number;
  leaveCategoryId?: number | string;
  leaveCategoryName?: string;
  leaveCategoryColor?: string;
  balances?: EmployeeLeaveBalanceItem[];
  annual: LeaveBalanceCategory;
  sick: LeaveBalanceCategory;
  casual: LeaveBalanceCategory;
  unpaid: {
    used: number;
  };
  updatedAt: string;
  [key: string]: any;
}

export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid' | string;

export type HalfDayPeriod = 'first_half' | 'second_half';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  requestId?: number;
  numericId?: number;
  cloudDocId?: string;
  userId: string;
  user_id?: string;
  authUid?: string;
  rawUserId?: string;
  fingerprintId?: string;
  organizationId?: string;
  org_id?: string;
  userName: string;
  employeeName?: string;
  userAvatar?: string;
  department: string;
  leaveType: LeaveType;
  leaveTypeId?: number | string;
  leave_type_id?: number | string;
  leaveTypeCode?: string;
  leave_type_code?: string;
  leaveTypeName?: string;
  leave_type_name?: string;
  leaveColor?: string;
  startDate: string; // YYYY-MM-DD
  start_date?: string;
  endDate: string;   // YYYY-MM-DD
  end_date?: string;
  isHalfDay: boolean;
  dayType?: string;
  day_type?: string;
  halfDayPeriod?: HalfDayPeriod;
  totalDays: number;
  daysRequested?: number;
  days_requested?: number;
  reason: string;
  emergencyContact?: string;
  emergency_contact?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: LeaveRequestStatus;
  status_upper?: string;
  managerId?: string;
  managerName?: string;
  managerComment?: string;
  actionBy?: string;
  action_by?: string;
  actionRemarks?: string;
  action_remarks?: string;
  actionAt?: string;
  action_at?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedAt?: string;
  hasConflict?: boolean;
  conflictingUsers?: string[];
  [key: string]: any;
}

export interface CompanyHoliday {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  isOptional?: boolean;
  description?: string;
}

export interface TeamMemberLeaveSummary {
  userId: string;
  userName: string;
  avatarUrl?: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  isHalfDay: boolean;
  status: LeaveRequestStatus;
}
