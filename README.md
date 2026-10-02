# Parshwa Platinum Security

Production-quality mobile application for the **Parshwa Platinum** apartment security management system (7 Floors, 28 Flats: 101–104 ... 701–704). Built with Flutter, Supabase (Auth, Postgres, Realtime, Storage), and Riverpod state management.

---

## 📁 Repository & Architecture Layout

```
parshwa_platinum_security/
├── database/                       # PostgreSQL migrations & seed data
│   ├── 001_initial_schema.sql      # Core tables, constraints, indexes
│   ├── 002_rls_policies.sql        # Row Level Security for Resident/Guard/Admin
│   ├── 003_functions_triggers.sql  # Max 4 residents trigger, atomic approvals, pruning
│   ├── 004_seed_data.sql           # 28 flats & initial guard invite code
│   └── complete_migration.sql      # Master all-in-one runnable migration
├── lib/
│   ├── app/                        # App theme, lifecycle, GoRouter configuration
│   ├── core/                       # PIN security, biometric auth, SQLite offline queue, utilities
│   └── features/
│       ├── auth/                   # Login, register, PIN setup, pending approval
│       ├── resident/               # 1-tap visitor approvals, pre-approvals (OTP/QR), complaints, SOS
│       ├── guard/                  # Gate dashboard, walk-in logger, pass verification, offline sync
│       ├── admin/                  # Committee approvals, flat directory, invite code rotation, CSV
│       └── notices/                # Society announcements & broadcast notices
├── test/
│   ├── unit/                       # PIN hashing, lockout, input validation tests
│   ├── widget/                     # Keypad, login, approval dialog tests
│   └── integration/                # End-to-end visitor approval flow test
├── ARCHITECTURE.md                 # Detailed architectural guide & concurrency explanation
├── QA_CHECKLIST.md                 # Manual test matrix across Android & iOS
└── BUILD_AND_RELEASE_GUIDE.md      # APK/AAB signing and release instructions
```

---

## 🚀 Quick Start Guide

### 1. Database Setup
1. Open your Supabase Project $\rightarrow$ **SQL Editor**.
2. Paste the entire contents of [`database/complete_migration.sql`](file:///C:/Users/BL0080/.gemini/antigravity/scratch/parshwa_platinum_security/database/complete_migration.sql) and run it.

### 2. Environment Variables
Create or update `.env` in the root directory:
```env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Install & Run
```bash
flutter pub get
flutter run
```

---

## 🧪 Module-by-Module Manual Testing Guide

### 1. Auth & Security Module
- **What to test:**
  - Register as Resident for Flat 101. Confirm account displays "Pending Approval".
  - Attempt to register as Guard using code `PPGUARD2026`. Confirm success.
  - Setup 4-digit PIN. Send app to background for 5 minutes and reopen: confirm PIN prompt appears.
  - Enter wrong PIN 5 times: confirm 5-minute lockout countdown starts.

### 2. Resident Experience Module
- **What to test:**
  - Open Resident Home. Confirm flat number badge shows `Flat 101`.
  - Tap `Pre-Approve`. Enter guest name, generate pass: confirm 6-digit OTP and QR code appear with share button.
  - Tap `Delivery Preference`. Toggle to "Allow delivery to leave at gate": confirm preference saves.
  - Tap `Complaints`. File issue with photo: confirm ticket appears with `SUBMITTED` status.
  - Hold `Emergency SOS` for 2 seconds: confirm broadcast screen triggers.

### 3. Security Guard Module
- **What to test:**
  - Log in with approved guard account.
  - Log walk-in visitor for Flat 101: tap floor chip `F1`, chip `101`, snap photo, and submit.
  - Observe Resident's phone: 1-tap `[Approve]` modal appears in real-time.
  - Verify Pre-approval: switch to Guard $\rightarrow$ Verify Pass $\rightarrow$ enter 6-digit OTP: confirm visitor marked `INSIDE`.
  - Check-out: Go to `Visitors Inside` $\rightarrow$ tap `[Check Out]`: confirm visitor removed.
  - Offline test: disconnect Wi-Fi, log visitor, reconnect Wi-Fi: confirm automatic sync.

### 4. Admin Committee Module
- **What to test:**
  - Log in as Admin.
  - Approve pending resident and guard signups.
  - Inspect `Flats Directory`: confirm all 28 flats visible across 7 floors with occupancy numbers.
  - Rotate Guard Invite Code: confirm code updates and old code stops working.
  - Go to `Audit Logs`: click `Export CSV`: confirm CSV file is generated and shared.
