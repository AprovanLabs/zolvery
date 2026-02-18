---
feature: .cicadas/drafts/stage-3-mobile-app/approach.md
status: draft
---

# Mobile Android CI

## Goal
Provide a GitHub Actions workflow to build a signed Android AAB that mirrors Lahilo's build flow.

## Tasks
- [ ] Add GitHub Actions workflow to build signed AAB (Java 17, Node 20, `cap add android` regeneration).
- [ ] Generate `.env` from GitHub vars and run `capacitor-assets`, `build:android`, `sync:android`.
- [ ] Decrypt keystore and run `npx cap build --androidreleasetype AAB`.
- [ ] Rename and upload the AAB artifact, and document local build steps.

## Files
- `.github/workflows/` — Android build workflow.
- `apps/mobile/` — Android build inputs, scripts, and env configuration.
- `docs/` — local build documentation.

## Dependencies
- `mobile-capacitor-shell.md`

## Notes
- Keep secrets in GitHub Actions; avoid committing keystores.
