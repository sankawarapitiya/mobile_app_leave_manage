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
  createdAt: string;
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

export interface UserLeaveBalances {
  userId: string;
  year: number;
  annual: LeaveBalanceCategory;
  sick: LeaveBalanceCategory;
  casual: LeaveBalanceCategory;
  unpaid: {
    used: number;
  };
  updatedAt: string;
}

export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid';

export type HalfDayPeriod = 'first_half' | 'second_half';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  department: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  isHalfDay: boolean;
  halfDayPeriod?: HalfDayPeriod;
  totalDays: number;
  reason: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: LeaveRequestStatus;
  managerId?: string;
  managerName?: string;
  managerComment?: string;
  createdAt: string;
  reviewedAt?: string;
  hasConflict?: boolean;
  conflictingUsers?: string[];
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
