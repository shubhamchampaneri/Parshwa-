# Parshwa Platinum Security - Production Build & Deployment Guide

This guide provides end-to-end instructions for configuring Supabase, Google OAuth, Firebase Cloud Messaging, and generating signed release APKs and App Bundles (AAB) for Android and iOS.

---

## 1. Supabase Project Setup

1. **Create Supabase Project:**
   - Log into [Supabase Dashboard](https://supabase.com/dashboard).
   - Create a new project: `parshwa-platinum-security`.
2. **Execute Database Migrations:**
   - Go to **SQL Editor** $\rightarrow$ **New Query**.
   - Copy the entire contents of [`database/complete_migration.sql`](file:///C:/Users/BL0080/.gemini/antigravity/scratch/parshwa_platinum_security/database/complete_migration.sql).
   - Click **Run**. This provisions all 12 tables, indexes, RLS policies, trigger rules, and seeds the 28 flats.
3. **Provision Storage Buckets:**
   - Go to **Storage** $\rightarrow$ **New Bucket**.
   - Create bucket: `visitor_photos` (Public: false, File size limit: 2MB, Allowed MIME: `image/jpeg, image/png`).
   - Create bucket: `complaint_photos` (Public: false, File size limit: 5MB, Allowed MIME: `image/jpeg, image/png`).
   - Add storage RLS policy allowing authenticated guards/residents to upload and read photos.
4. **Retrieve API Keys:**
   - Go to **Project Settings** $\rightarrow$ **API**.
   - Copy **Project URL** and **`anon` `public` key**.
   - Paste into `.env`:
     ```env
     SUPABASE_URL=https://<your-project>.supabase.co
     SUPABASE_ANON_KEY=eyJhbGciOi...
     ```

---

## 2. Google OAuth & Supabase Auth Setup

1. **Google Cloud Console:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create OAuth 2.0 Credentials:
     - **Web Client ID** (Needed for Supabase OAuth callback).
     - **Android Client ID** (Package Name: `com.parshwaplatinum.security`, paste SHA-1 fingerprint).
     - **iOS Client ID** (Bundle ID: `com.parshwaplatinum.security`).
2. **Configure Supabase Auth Provider:**
   - In Supabase Dashboard: **Authentication** $\rightarrow$ **Providers** $\rightarrow$ **Google**.
   - Enable Google provider, paste Google **Client ID** and **Client Secret**.
   - Add redirect URL: `https://<your-project>.supabase.co/auth/v1/callback`.
3. **Mobile Deep Linking:**
   - Supabase Dashboard $\rightarrow$ **Authentication** $\rightarrow$ **URL Configuration** $\rightarrow$ Add `parshwaplatinum://login-callback`.

---

## 3. Firebase Cloud Messaging (FCM) Setup

1. **Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com/) and create `parshwa-platinum-security`.
   - Add Android App with package: `com.parshwaplatinum.security`.
   - Download `google-services.json` $\rightarrow$ place in `android/app/google-services.json`.
   - Add iOS App with bundle ID: `com.parshwaplatinum.security`.
   - Download `GoogleService-Info.plist` $\rightarrow$ place in `ios/Runner/GoogleService-Info.plist`.
2. **Database Webhook Trigger for Push Notifications:**
   - In Supabase: Enable `pg_net` or create an Edge Function (`send-fcm`) triggered on `INSERT` to `visitor_logs` and `sos_alerts`.
   - When a walk-in visitor is logged for Flat 302, the Edge Function fetches device tokens for Flat 302 from `device_tokens` and dispatches high-priority FCM payload with sound `doorbell.mp3`.

---

## 4. Android Keystore Signing Configuration

1. **Generate Release Keystore:**
   Open terminal and run:
   ```powershell
   keytool -genkey -v -keystore C:\Users\BL0080\.gemini\antigravity\scratch\parshwa_platinum_security\android\app\parshwa-upload-key.jks `
     -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 -alias parshwa-key
   ```
2. **Create `key.properties`:**
   In `android/key.properties`:
   ```properties
   storePassword=<your-keystore-password>
   keyPassword=<your-key-password>
   keyAlias=parshwa-key
   storeFile=parshwa-upload-key.jks
   ```
3. **Configure `android/app/build.gradle`:**
   Ensure signing configuration references `key.properties`:
   ```groovy
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }

   android {
       signingConfigs {
           release {
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
           }
       }
       buildTypes {
           release {
               signingConfig signingConfigs.release
               minifyEnabled true
               shrinkResources true
               proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
           }
       }
   }
   ```

---

## 5. Build Commands

### Clean Workspace
```bash
flutter clean
flutter pub get
```

### Run Static Analysis & Verification
```bash
flutter analyze
flutter test
```

### 1. Build Standalone Universal APK (For Internal Gate Sideloading)
```bash
flutter build apk --release --dart-define=ENVIRONMENT=production
```
*Output Path:* `build/app/outputs/flutter-apk/app-release.apk`

### 2. Build Split-per-ABI APKs (Optimized for Guard Devices)
```bash
flutter build apk --release --split-per-abi
```
*Output Path:* `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk` ($\approx 18\text{–}22\text{ MB}$)

### 3. Build Production Android App Bundle (Google Play Store)
```bash
flutter build appbundle --release
```
*Output Path:* `build/app/outputs/bundle/release/app-release.aab`

### 4. Build iOS Archive (Apple App Store / TestFlight)
```bash
flutter build ipa --release
```

---

## 6. ProGuard Obfuscation Rules (`android/app/proguard-rules.pro`)

```proguard
# Flutter & Platform Wrappers
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }

# Security & Biometrics
-keep class androidx.biometric.** { *; }
-keep class com.it_nomads.fluttersecurestorage.** { *; }

# Supabase & Realtime
-keepattributes *Annotation*,EnclosingMethod,Signature,InnerClasses
-dontwarn okio.**
-dontwarn retrofit2.**
```
