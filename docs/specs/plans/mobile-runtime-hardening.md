---
feature: .cicadas/drafts/stage-3-mobile-app/approach.md
status: draft
---

# Mobile Runtime Hardening

## Goal
Harden the Capacitor runtime with mobile auth flow, secure token storage, and native polish aligned to Lahilo patterns.

## Tasks
- [ ] Implement mobile login flow using Lahilo patterns (Capacitor Browser + App redirect handling).
- [ ] Store auth tokens using Capacitor Preferences or Secure Storage.
- [ ] Add native icon/splash assets and status bar configuration.
- [ ] Validate Peer.js public configuration for mobile builds.

## Files
- `apps/client/src/` — mobile auth flow and redirect handling.
- `apps/mobile/android/` — native resources and status bar configuration.
- `apps/mobile/capacitor.config.ts` — platform-specific config updates if needed.

## Dependencies
- `mobile-capacitor-shell.md`

## Notes
- Prefer Lahilo auth flow patterns and test on emulator early.
