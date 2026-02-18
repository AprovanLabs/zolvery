---
feature: .cicadas/drafts/stage-3-mobile-app/approach.md
status: draft
---

# Mobile Capacitor Shell

## Goal
Deliver an Android-capable Capacitor shell wired to the web build output with Lahilo-aligned Android defaults.

## Tasks
- [ ] Add Capacitor dependencies and initialize the Android project in `apps/mobile`.
- [ ] Create `capacitor.config.ts` with `appId`, `appName`, and `webDir` pointing to the web build output.
- [ ] Mirror Lahilo defaults in `apps/mobile/android/app/build.gradle` (namespace/applicationId, versioning).
- [ ] Mirror Lahilo defaults in `apps/mobile/android/app/src/main/AndroidManifest.xml` (deep link scheme, FileProvider, INTERNET).
- [ ] Add scripts: `mobile:build`, `mobile:sync`, `mobile:run`, `mobile:android:regen` (move `android/`, `cap add android`, restore).
- [ ] Verify the app loads and can play a bundled game on emulator.

## Files
- `apps/mobile/` — Capacitor project and Android platform output.
- `apps/mobile/capacitor.config.ts` — Capacitor app metadata and `webDir`.
- `apps/mobile/android/app/build.gradle` — Android namespace/applicationId/versioning defaults.
- `apps/mobile/android/app/src/main/AndroidManifest.xml` — deep links, FileProvider, permissions.
- `package.json` — mobile scripts.

## Dependencies
- None (requires stable Stage 2 web build output).

## Notes
- Follow Lahilo defaults and treat Android regeneration as destructive (move/regenerate/restore).
