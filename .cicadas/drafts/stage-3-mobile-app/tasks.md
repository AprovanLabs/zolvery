# Tasks: Stage 3 - Mobile App

## Mode B: Feature (Vertical Slices)

### Feature: Capacitor Shell
- [ ] Add Capacitor deps and init Android project in `apps/mobile` <!-- id: 10 -->
- [ ] Add `capacitor.config.ts` with `appId`, `appName`, and `webDir` pointing to the web build output <!-- id: 11 -->
- [ ] Mirror Lahilo defaults in `android/app/build.gradle` (namespace/applicationId, versioning) <!-- id: 12 -->
- [ ] Mirror Lahilo defaults in `AndroidManifest.xml` (deep link scheme, FileProvider, INTERNET) <!-- id: 13 -->
- [ ] Add scripts: `mobile:build`, `mobile:sync`, `mobile:run`, `mobile:android:regen` (move `android/`, `cap add android`, restore) <!-- id: 14 -->
- [ ] Verify the app loads and can play a bundled game on emulator <!-- id: 15 -->

### Feature: Mobile Runtime Hardening
- [ ] Implement mobile login flow using Lahilo patterns (Capacitor Browser + App redirect handling) <!-- id: 20 -->
- [ ] Store auth tokens using Capacitor Preferences or Secure Storage <!-- id: 21 -->
- [ ] Add native icon/splash and status bar config <!-- id: 22 -->
- [ ] Validate Peer.js public config for mobile builds <!-- id: 23 -->

### Feature: Android CI
- [ ] Add GitHub Actions workflow to build signed AAB (Java 17, Node 20, `cap add android` regen) <!-- id: 30 -->
- [ ] Generate `.env` from GitHub vars and run `capacitor-assets`, `build:android`, `sync:android` <!-- id: 31 -->
- [ ] Decrypt keystore and run `npx cap build --androidreleasetype AAB` <!-- id: 32 -->
- [ ] Rename and upload AAB artifact, document local build steps <!-- id: 33 -->
