# Parshwa Platinum Security - Comprehensive Manual QA Checklist & Test Matrix

This checklist covers rigorous testing across Android (10 through 15) and iOS (15+), edge cases, concurrency, security boundaries, and gate resilience.

---

## 1. Authentication & Onboarding Test Matrix

| Test ID | Test Scenario | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Resident sign-up with email, phone, and Flat `402`. | Account created with status `PENDING`. UI immediately transitions to `PendingApprovalScreen`. | [ ] |
| **AUTH-02** | Resident attempts to register as 5th member in Flat `402`. | DB trigger `check_max_residents_per_flat` aborts insert. UI displays: *"Flat 402 has reached maximum capacity of 4 registered residents."* | [ ] |
| **AUTH-03** | Guard sign-up with invalid invite code (e.g. `WRONG123`). | Registration rejected with message: *"Invalid or expired security guard invite code."* | [ ] |
| **AUTH-04** | Guard sign-up with valid active code (`PPGUARD2026`). | Account created with role `GUARD` and status `PENDING`. | [ ] |
| **AUTH-05** | Continue with Google OAuth on clean install. | Opens Google Account selector. Profile is mapped with status `PENDING`. | [ ] |
| **AUTH-06** | Google OAuth cancelled by user midway. | App returns gracefully to login screen with no crash or frozen UI. | [ ] |
| **AUTH-07** | Forgot password email request. | Deep link email dispatched via Supabase Auth. Rate limiting prevents spamming. | [ ] |

---

## 2. PIN, Biometrics & Session Security Test Matrix

| Test ID | Test Scenario | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **PIN-01** | Set weak PIN (`1234`, `0000`, `1111`). | Validation blocks entry: *"Please choose a stronger, non-trivial PIN."* | [ ] |
| **PIN-02** | Set valid 4-6 digit PIN (`5829`). | Salted hash saved to `flutter_secure_storage`. Plaintext PIN never saved. | [ ] |
| **PIN-03** | Cold app start with PIN configured. | App routes to `PinUnlockScreen` before revealing any resident/gate data. | [ ] |
| **PIN-04** | App sent to background for $\ge 5$ minutes and resumed. | `WidgetsBindingObserver` detects timeout. Forces immediate PIN lock. | [ ] |
| **PIN-05** | Enter incorrect PIN 4 times consecutively. | Displays remaining attempts counter: *"1 attempt remaining"*. | [ ] |
| **PIN-06** | Enter incorrect PIN for the 5th time. | Keypad disabled for 300 seconds. Live countdown displayed: *"Try again in 04:59"*. | [ ] |
| **PIN-07** | Tap "Forgot PIN?". | Prompts to log out and re-authenticate via Google or Email/Password before PIN reset. | [ ] |
| **PIN-08** | Biometric unlock (Fingerprint / Face ID). | Native `local_auth` prompt opens. Successful scan immediately unlocks app. | [ ] |

---

## 3. Resident Operations & Realtime Concurrency

| Test ID | Test Scenario | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **RES-01** | Guard logs visitor for Flat 302. | Resident receives high-priority push + in-app `VisitorApprovalDialog` appears within $<1$ second. | [ ] |
| **RES-02** | **Race Condition:** Co-residents A and B of Flat 302 tap Approve / Deny at the same time. | Atomic PostgreSQL RPC `respond_to_visitor_request` processes first tap. Second resident's UI receives: *"Request was already updated by another flat resident."* No DB collision. | [ ] |
| **RES-03** | Rapid double-tap on `[Approve Entry]`. | Idempotent execution. Only 1 DB update recorded. Button enters loading state. | [ ] |
| **RES-04** | Generate Pre-Approval Pass. | 6-digit cryptographic OTP generated + dynamic QR rendered. Share button opens WhatsApp invitation with pass details. | [ ] |
| **RES-05** | Update Gate Delivery Preference to "Leave at Gate". | Preference persists in `flats` table. Guard logger immediately reflects green badge. | [ ] |
| **RES-06** | File Maintenance Complaint with camera photo. | Photo compressed to $<100\text{ KB}$ before upload. Status shows `SUBMITTED`. | [ ] |
| **RES-07** | Press and hold Emergency SOS for $<2$ seconds then release. | Progress ring resets to 0. Alarm is NOT triggered (accidental tap protection). | [ ] |
| **RES-08** | Press and hold Emergency SOS for full 2 seconds. | Audible gate siren triggered. Guards receive flashing red emergency screen with Flat Number. | [ ] |

---

## 4. Security Guard Operations & Offline Resilience

| Test ID | Test Scenario | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **GRD-01** | Quick Walk-in Entry: Camera snap + Flat chip select. | Entry completed in $<15$ seconds. Photo compressed; status set to `PENDING`. | [ ] |
| **GRD-02** | Verify Pre-Approved Pass via 6-digit OTP keypad. | RPC `verify_and_checkin_preapproval` validates code. Pass marked `USED`. Visitor marked `INSIDE`. | [ ] |
| **GRD-03** | Verify expired pre-approval pass. | Rejected with clear message: *"Visitor pass has expired."* | [ ] |
| **GRD-04** | Scan pre-approval pass using Camera QR scanner. | QR decoded in $<500\text{ms}$. Visitor checked in immediately. | [ ] |
| **GRD-05** | **Offline Gate Test:** Disconnect gate Wi-Fi / 4G. Log 3 walk-in visitors. | Entries written to local SQLite database (`offline_queue`). Connectivity bar shows: *"Offline Gate Mode (3 entries queued)"*. | [ ] |
| **GRD-06** | **Network Restoration Test:** Reconnect gate Wi-Fi / 4G. | `OfflineSyncController` detects connectivity, flushes 3 queued entries to Supabase, updates status to *"Gate Terminal Connected (Online)"*. | [ ] |
| **GRD-07** | Mark Visitor Check-Out. | Active visitor roster removes visitor. Exit timestamp recorded in database. | [ ] |
| **GRD-08** | Delivery logger: Select flat with "Leave at Gate" preference. | Guard sees green confirmation banner: *"Flat allows parcel at gate. Handover not required."* | [ ] |

---

## 5. Committee Admin Operations & Data Integrity

| Test ID | Test Scenario | Expected Outcome | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **ADM-01** | Admin approves pending resident. | Resident profile status updated to `APPROVED`. Resident app automatically forwards to dashboard in realtime. | [ ] |
| **ADM-02** | Admin rejects pending resident with reason. | Resident status set to `REJECTED` with reason note. | [ ] |
| **ADM-03** | Rotate Guard Invite Code from `PPGUARD2026` to `PPG84920`. | Previous code invalidated immediately. Future guard sign-ups require `PPG84920`. | [ ] |
| **ADM-04** | Inspect Flat Directory (Floors 1-7, 101-704). | All 28 flats visible with resident counts ($0/4$ to $4/4$). | [ ] |
| **ADM-05** | Export Society Audit Logs to CSV. | Generates RFC 4180 CSV file containing all visitor names, phones, flats, and timestamps. Share sheet opens. | [ ] |
| **ADM-06** | Role Escalation Test: Non-admin attempts to update role to ADMIN via Supabase client. | PostgreSQL RLS policy `profiles_update_self` rejects update. Privilege escalation impossible. | [ ] |

---

## 6. Device Compatibility & Stress Testing

- [ ] **Android 10 - 15 Verification:** Back gesture, biometric prompt, permission dialogs (Camera, Notifications).
- [ ] **iOS 15+ Verification:** Face ID, bottom safe area insets, keyboard dismissal, background refresh.
- [ ] **Low-end Device Performance:** Shimmer placeholders render smoothly at 60 FPS; image compression executes off the UI thread.
- [ ] **Storage Free Tier Compliance:** Visitor images confirmed under 100 KB; 90-day pruning function scheduled.
