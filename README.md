# 🏖️ Mobile Leave Management System

A production-ready, cross-platform Mobile Leave Management application built for Android and iOS using **React Native (Expo SDK 58, TypeScript)** and **Firebase (Authentication, Cloud Firestore & Cloud Storage)**. Designed with an ultra-fluid Modern Indigo & Slate design language, high contrast Light/Dark modes, and smooth 60fps micro-interactions powered by `react-native-reanimated` and `react-native-svg`.

---

## 🚀 Key Features

### 1. Dual-Role Experience (Stored in Firestore User Profiles)
- **Employee Experience (`role: 'employee'`)**:
  - **Animated Home Dashboard**: Circular SVG progress rings showing remaining vs. used leave balances for Annual, Sick, Casual, and Unpaid leave.
  - **Upcoming Time Off Banner & Company Holidays Strip**: Real-time listing of scheduled corporate holidays and the user's next approved time off.
  - **Quick Apply Leave Modal/Screen**:
    - Interactive leave type selection cards.
    - Range picker powered by `react-native-calendars`.
    - **Automatic Working-Days Calculation**: Automatically excludes weekends (Saturdays & Sundays) and official company holidays.
    - **Half-Day Toggle**: Supports 1st Half (Morning) and 2nd Half (Afternoon) requests (0.5 day).
    - **Real-Time Balance Guard**: Blocks submission if requested days exceed remaining balance.
    - Supporting document attachment picker (`expo-document-picker`).
  - **Leave History & Detailed Tracking**: Segmented filter tabs (`All`, `Pending`, `Approved`, `Rejected`) with full approval timeline, manager remarks, and cancel option for pending requests.
  - **Team Availability Calendar**: Interactive monthly schedule displaying colleagues from the same department on leave.

- **Manager Experience (`role: 'manager'`)**:
  - **Approval Queue Tab**: Live feed of pending team leave requests sorted by urgency.
  - **Smart Conflict Detection**: Highlights requests where 2 or more team members from the same department have overlapping leave dates.
  - **Atomic Firestore Transactions**: One-tap Approve or Reject actions with custom remarks. Deducts used days and clears pending counts atomically in `leave_balances`.

### 2. Multi-Mode Architecture (Production Firebase + Instant Demo Fallback)
- **Production Mode**: Seamlessly binds to Firebase Auth & Cloud Firestore with real-time `onSnapshot` listeners and `runTransaction` safety.
- **Out-of-the-Box Demo Mode**: If Firebase keys are not provided (or `EXPO_PUBLIC_DEMO_MODE=true`), the app automatically boots with seeded local state:
  - 1-Tap Login as **Sarah Connor** (Employee, Senior Mobile Engineer).
  - 1-Tap Login as **Alex Vance** (Manager, VP of Engineering).
  - Pre-seeded leave requests with built-in scheduling conflicts.
  - Live "Reset Demo Data / Seed Cloud Firestore" button in Profile settings.

---

## 📱 Tech Stack & Libraries

- **Core Framework**: React Native (Expo SDK 58, React 19, TypeScript)
- **Navigation**: React Navigation v7 Native Stack + Bottom Tabs
- **Backend & Auth**: Firebase JS SDK v10+ (Firebase Auth & Cloud Firestore)
- **Animations & UI**:
  - `react-native-reanimated` (Fluid spring physics, staggered entry transitions)
  - `react-native-svg` (Animated circular balance KPI rings)
  - `lucide-react-native` (Modern icon set)
  - `expo-linear-gradient` & `expo-blur`
  - `expo-haptics` (Tactile feedback on date selections, submissions, and approvals)
  - `react-native-calendars` (Range selection and team availability marks)
- **Forms & State**:
  - `zustand` (User session & active role store)
  - `react-hook-form` + `zod` (Strict schema validation)

---

## 🗄️ Cloud Firestore Data Schema

```
users/{uid}
├── uid: string
├── fullName: string
├── email: string
├── role: 'employee' | 'manager'
├── department: string
├── designation: string
├── avatarUrl?: string
├── managerId?: string
└── createdAt: string (ISO)

leave_balances/{uid}
├── userId: string
├── year: number
├── annual: { total: number, used: number, pending: number }
├── sick: { total: number, used: number, pending: number }
├── casual: { total: number, used: number, pending: number }
├── unpaid: { used: number }
└── updatedAt: string (ISO)

leave_requests/{requestId}
├── id: string
├── userId: string
├── userName: string
├── userAvatar?: string
├── department: string
├── leaveType: 'annual' | 'sick' | 'casual' | 'unpaid'
├── startDate: string (YYYY-MM-DD)
├── endDate: string (YYYY-MM-DD)
├── isHalfDay: boolean
├── halfDayPeriod?: 'first_half' | 'second_half'
├── totalDays: number
├── reason: string
├── attachmentUrl?: string
├── attachmentName?: string
├── status: 'pending' | 'approved' | 'rejected' | 'cancelled'
├── managerId?: string
├── managerName?: string
├── managerComment?: string
├── hasConflict?: boolean
├── conflictingUsers?: string[]
├── createdAt: string (ISO)
└── reviewedAt?: string (ISO)

company_holidays/{holidayId}
├── id: string
├── title: string
├── date: string (YYYY-MM-DD)
├── isOptional?: boolean
└── description?: string
```

---

## ⚙️ Setup & Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase (Optional - Demo mode works out-of-the-box)
Create a `.env` file in the project root:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_DEMO_MODE=false
```

### 3. Deploy Security Rules
Deploy the included [`firestore.rules`](./firestore.rules) using the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Run the Application
```bash
# Start development server
npx expo start

# Run directly on Android Emulator / Device
npx expo start --android

# Run directly on iOS Simulator (macOS only)
npx expo start --ios

# Run on Web browser
npx expo start --web
```

---

## 🧪 Verification & Diagnostics

- **Type Check**: `npx tsc --noEmit` (Verified: 0 errors)
- **Expo Diagnostics**: `npx expo-doctor` (Verified: 20/20 checks passed)
