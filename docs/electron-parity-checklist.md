# Electron Parity Checklist

## Current State

Electron/TypeScript is now the primary implementation path. The Python app remains in the repository as a parity reference until the Electron build has been verified with a real Enterprise WeChat mailbox and Windows release artifact.

## Automated Verification

- [x] `npm run electron:test` passes.
- [x] `npm run electron:typecheck` passes.
- [x] `npm run electron:build:main` passes.
- [x] `npm run electron:build -- --mac dmg --publish never` builds a local macOS DMG.
- [x] `python -m pytest -q` passes for the legacy parity suite.
- [x] `git diff --check` passes.

## Feature Parity

- [x] Loads and saves mailbox email plus authorization code locally.
- [x] Migrates older Python settings into the Electron settings path.
- [x] Uses Enterprise WeChat/Tencent Exmail IMAP defaults.
- [x] Scans full mailbox and incrementally refreshes new messages.
- [x] Reads `.xlsx`, `.xlsm`, and `.xls` Excel attachments.
- [x] Extracts order number and deadline columns from the known order templates.
- [x] Shows only `订单号` and `截至时间` in the main table.
- [x] Sorts by deadline with nearest dates first.
- [x] Filters by order number and email sent-date range.
- [x] Auto-refreshes every 30 seconds after saved settings are loaded.
- [x] Shows desktop notifications when new orders or deadline changes are detected.
- [x] Checks GitHub Releases on startup and through the `检查更新` button.
- [x] Downloads the matching Windows `.exe` or macOS `.dmg` update asset.
- [x] GitHub Actions builds direct release downloads:
  - `OrderQuickReadSetup.exe`
  - `OrderQuickRead-macos-x64.dmg`
  - `OrderQuickRead-macos-arm64.dmg`

## Manual Gates Before Removing Python

- [ ] Verify `OrderQuickReadSetup.exe` from GitHub Release on a Windows machine.
- [ ] Verify saved settings persist across app restarts on Windows.
- [ ] Verify real Enterprise WeChat mailbox login on Windows with the user's auth code.
- [ ] Verify incremental refresh detects a newly received order email.
- [ ] Verify system notification behavior on a Windows machine without speakers.
- [ ] Verify downloaded update package opens correctly from inside the app.
- [ ] Verify macOS DMG opens with right-click `Open` on unsigned builds.

## Known Packaging Notes

- Local macOS build succeeds, but electron-builder reports no Developer ID signing identity. That is expected for internal unsigned builds.
- Windows installer output must be produced by the GitHub Actions Windows runner or a Windows machine.
- macOS double-click launch without a Gatekeeper warning requires Apple Developer ID signing and notarization.
