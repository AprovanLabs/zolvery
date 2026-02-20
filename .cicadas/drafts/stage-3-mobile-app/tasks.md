# Tasks: Stage 3 - Mobile App

## Mode B: Feature (Vertical Slices)

### Feature: Capacitor Shell
- [x] Add Capacitor deps and init Android project in `apps/mobile` <!-- id: 10 -->
- [x] Add `capacitor.config.ts` with `appId`, `appName`, and `webDir` pointing to the web build output <!-- id: 11 -->
- [x] Mirror Lahilo defaults in `android/app/build.gradle` (namespace/applicationId, versioning) <!-- id: 12 -->
- [x] Mirror Lahilo defaults in `AndroidManifest.xml` (deep link scheme, FileProvider, INTERNET) <!-- id: 13 -->
- [x] Add scripts: `mobile:build`, `mobile:sync`, `mobile:run`, `mobile:android:regen` (move `android/`, `cap add android`, restore) <!-- id: 14 -->
- [x] Verify the app loads and can play a bundled game on emulator <!-- id: 15 -->

### Feature: Mobile Runtime Hardening
- [x] Implement mobile login flow using Lahilo patterns (Capacitor Browser + App redirect handling) <!-- id: 20 -->
- [x] Store auth tokens using Capacitor Preferences or Secure Storage <!-- id: 21 -->
- [x] Add native icon/splash and status bar config <!-- id: 22 -->
- [x] Validate Peer.js public config for mobile builds <!-- id: 23 -->

### Feature: Android CI
- [x] Add GitHub Actions workflow to build signed AAB (Java 17, Node 20, `cap add android` regen) <!-- id: 30 -->
- [x] Generate `.env` from GitHub vars and run `capacitor-assets`, `build:android`, `sync:android` <!-- id: 31 -->
- [x] Decrypt keystore and run `npx cap build --androidreleasetype AAB` <!-- id: 32 -->
- [x] Rename and upload AAB artifact, document local build steps <!-- id: 33 -->

---

## Local Build Steps

### Prerequisites
- Node.js 20+
- pnpm 9+
- Java 17 (for Android builds)
- Android Studio (for emulator testing)

### Debug Build
```bash
# Install dependencies
pnpm install

# Build and sync
pnpm mobile:sync

# Run on emulator or connected device
pnpm mobile:run
```

### Release Build (Local)
```bash
# Set up keystore environment variables
export KEYSTORE_FILE=/path/to/keystore.jks
export KEYSTORE_PASSWORD=your_password
export KEY_ALIAS=your_alias
export KEY_PASSWORD=your_key_password

# Build client
pnpm --filter @kossabos/client run build

# Sync to Android
cd apps/mobile && pnpm exec cap sync android

# Generate assets
pnpm run assets

# Build release AAB
cd android && ./gradlew bundleRelease
```

### Regenerating Android Project
If you need to regenerate the Android project (e.g., after Capacitor updates):
```bash
pnpm mobile:android:regen
```
This will backup customizations, regenerate the project, and restore them.

### CI/CD
The GitHub Actions workflow (`.github/workflows/build-android.yml`) handles automated builds:
- **Debug builds**: Triggered on push to `main` or manually
- **Release builds**: Triggered manually with `build_type: release`

Required secrets for release builds:
- `ANDROID_KEYSTORE_BASE64`: Base64-encoded keystore file
- `ANDROID_KEYSTORE_PASSWORD`: Keystore password
- `ANDROID_KEY_ALIAS`: Key alias
- `ANDROID_KEY_PASSWORD`: Key password
