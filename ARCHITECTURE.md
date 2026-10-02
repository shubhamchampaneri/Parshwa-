# Parshwa Platinum Security - Architecture & Directory Structure Guide

## 1. Architectural Philosophy: Clean Architecture & Feature-First
The application is structured using **Clean Architecture** principles grouped by **Features**. This guarantees high maintainability, testability, loose coupling, and clear boundaries between business logic and UI.

```
lib/
├── app/                  # Application lifecycle, routing, theme, global providers
│   ├── app.dart          # Root MaterialApp.router with localization & global overlay
│   ├── app_router.dart   # GoRouter with auth-guard, role redirect, and PIN lock
│   └── theme/            # Material 3 design system (light/dark, high contrast)
├── core/                 # Shared system utilities, network, storage, security
│   ├── constants/        # System configs, table names, storage buckets
│   ├── errors/           # Failure & Exception classes with user-friendly mapping
│   ├── network/          # Supabase client wrapper & connectivity watcher
│   ├── security/         # Salted PBKDF2/SHA256 PIN hashing, biometric local_auth
│   ├── storage/          # SecureStorage, shared prefs, and SQLite offline queue
│   ├── utils/            # Image compressor (<100KB), input validators, date formatters
│   └── widgets/          # Reusable UI building blocks (AppButton, TextField, Shimmer)
├── features/             # Feature slices (Data, Domain, Presentation)
│   ├── auth/             # Login, register (role-gated), PIN setup, pending approval
│   ├── resident/         # Pre-approvals, 1-tap visitor actions, SOS, complaints
│   ├── guard/            # Fast walk-in, QR/OTP scanner, checkout, offline queue
│   ├── admin/            # Resident/guard approvals, 28-flat grid, invite code, CSV
│   └── notices/          # Society broadcast board & alerts
└── main.dart             # Entry point initializing Supabase, Firebase, and Storage
```

---

## 2. Layer Responsibilities

### Data Layer (`features/<feature>/data/`)
- **Models (`models/`):** Data Transfer Objects (DTOs) with `fromJson` / `toJson` and copyWith. Extends or maps to Domain Entities.
- **Data Sources:** Direct interaction with Supabase PostgreSQL tables, Realtime streams, and local SQLite cache.
- **Repository Implementations (`repositories/`):** Implements domain repository interfaces, handles error catching, network switching, and local caching.

### Domain Layer (`features/<feature>/domain/`)
- **Entities (`entities/`):** Immutable pure Dart domain models representing business concepts.
- **Repository Contracts (`repositories/`):** Abstract interfaces declaring pure business queries/commands without framework dependencies.

### Presentation Layer (`features/<feature>/presentation/`)
- **Controllers (`controllers/`):** Riverpod `StateNotifier` / `AsyncNotifier` classes managing reactive UI state, user actions, and error handling.
- **Screens (`screens/`):** Material 3 screens designed with oversized tap targets ($\ge 56\,\text{dp}$) for guard quick-action, smooth loading skeletons, and localized text.
- **Widgets (`widgets/`):** Modular sub-widgets (e.g., Realtime approval dialog, QR scanner viewport).

---

## 3. Realtime & Concurrency Architecture

### Multi-Resident Approval Concurrency
When a visitor is registered at the gate for Flat 302:
1. Guard submits log $\rightarrow$ status = `PENDING`.
2. Supabase Realtime emits `INSERT` event to all residents subscribed to `flat_id = '302'`.
3. Resident A and Resident B receive notification and in-app modal simultaneously.
4. When Resident A taps `[Approve]`, the update executes with an atomic SQL condition:
   ```sql
   UPDATE visitor_logs 
   SET status = 'APPROVED', resident_id = auth.uid(), updated_at = NOW() 
   WHERE id = $log_id AND status = 'PENDING';
   ```
5. If Resident B taps `[Deny]` 100ms later, the query affects 0 rows. Resident B's UI receives the realtime update and changes immediately to *"Already approved by [Resident A Name]"*.

---

## 4. Offline Resilience Architecture for Guard Terminal

```
+------------------+         Online?
| Guard Action Log | -----------------------+
+------------------+                        |
         | (No)                             | (Yes)
         v                                  v
+-----------------------+          +-------------------+
| SQLite offline_queue  |          | Supabase Database |
| (status: PENDING_SYNC)|          |   (PostgreSQL)    |
+-----------------------+          +-------------------+
         |                                  ^
         | Network Restored                 |
         +----------------------------------+
             Auto-Sync Engine (FIFO)
```

1. **Gate Network Drop:** If network status is `offline`, all new visitor entries and check-outs are written directly to local SQLite database with a temporary UUID.
2. **Connectivity Listener:** `connectivity_plus` detects when connection returns.
3. **Queue Drain:** `OfflineSyncController` drains queued entries in FIFO order, calls Supabase RPC, updates records, and clears the local queue without blocking guard UI.

---

## 5. Multi-Layer PIN & Biometric Security

1. **PBKDF2 / SHA-256 Salted Hash:** When the user creates their 4-6 digit PIN, a 32-byte cryptographic salt is generated. The hash is saved to `flutter_secure_storage`.
2. **Zero Plaintext:** The PIN is never saved in plaintext or transmitted across the network.
3. **5-Attempt Lockout:** Failed attempts are tracked in secure storage. Upon 5 failures, timestamp is recorded, locking the keypad for 300 seconds.
4. **App Lifecycle Guard:** `WidgetsBindingObserver` monitors `AppLifecycleState`. If the app remains in `paused`/`inactive` for $\ge 5\text{ minutes}$, the session state is locked and user must re-enter PIN or scan biometrics.
