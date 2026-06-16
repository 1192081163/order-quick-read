# Order Quick Read Electron Rewrite Design

## Goal

Rewrite Order Quick Read as a full Electron desktop app using TypeScript. The Electron version should preserve the current PySide6 app behavior first, then become the main implementation once feature parity is verified.

The rewrite will not add new product features during the first pass. It will reproduce the existing workflow:

- Save Enterprise WeChat mailbox email and authorization code locally.
- Scan the inbox through IMAP.
- Read Excel attachments from order emails.
- Extract order number and deadline.
- Track the email sent time for filtering.
- Show only `订单号` and `截至时间`.
- Sort orders by deadline with nearest deadlines first.
- Filter by order number and email sent date range.
- Auto-refresh for new or updated orders.
- Notify on new or updated orders.
- Check GitHub Releases for updates.
- Download an update, ask before installing, then open the new package and close the old app.

## Non-Goals

- No cloud service.
- No multi-user account system.
- No silent background self-replacement.
- No new business fields beyond the current order number and deadline.
- No redesign beyond a clean equivalent of the current simple UI.
- No macOS Gatekeeper bypass. macOS double-click trust still requires Apple Developer ID signing and notarization.

## Recommended Stack

- Runtime: Electron.
- Language: TypeScript.
- Renderer UI: React with plain CSS.
- Main process services: TypeScript modules running in Electron main.
- IMAP: `imapflow`.
- MIME parsing: `mailparser`.
- Excel parsing: `xlsx`, because it can cover `.xlsx`, `.xlsm`, and `.xls` parity.
- Local settings: Electron app data directory, with auth code encrypted through Electron `safeStorage` when available.
- Packaging: `electron-builder`.
- Updates: `electron-updater` with GitHub Releases.
- Tests: Vitest for pure logic, plus Playwright or Electron smoke tests for the packaged UI.

React is chosen even though the UI is simple because it keeps the table, settings panel, date filters, update state, and future filter additions easier to maintain than hand-written DOM updates.

## Architecture

The app will use a strict Electron split:

- Main process owns system access: IMAP, file parsing, settings, cache, notifications, update checks, downloads, installer handoff.
- Renderer process owns the UI: settings form, toolbar, date filters, order table, status text, and user actions.
- Preload exposes a narrow typed API through `contextBridge`.
- Renderer never receives Node privileges directly.

Proposed top-level structure:

```text
electron/
  main/
    app.ts
    ipc.ts
    services/
      mailClient.ts
      orderScanner.ts
      excelParser.ts
      settingsStore.ts
      orderCache.ts
      updater.ts
      notifier.ts
  preload/
    index.ts
  renderer/
    App.tsx
    components/
      SettingsPanel.tsx
      Toolbar.tsx
      FilterBar.tsx
      OrderTable.tsx
      StatusBar.tsx
    styles.css
  shared/
    types.ts
    date.ts
    sorting.ts
```

## IPC Contract

Renderer calls:

- `settings.load()`
- `settings.save({ email, authCode })`
- `orders.scan({ fullScan })`
- `orders.getCached()`
- `updates.check()`
- `updates.downloadAndPrompt()`
- `updates.installDownloaded(path)`

Main emits:

- `orders.scanStarted`
- `orders.scanFinished`
- `orders.scanFailed`
- `orders.changed`
- `updates.available`
- `updates.none`
- `updates.failed`
- `updates.downloaded`

The IPC payloads must be JSON-serializable and defined in `electron/shared/types.ts`.

## Data Flow

1. App starts.
2. Main loads saved settings and cached orders.
3. Renderer shows settings if credentials are missing; otherwise the settings panel auto-collapses.
4. Renderer requests an incremental scan when auto-refresh fires or the user clicks refresh.
5. Main connects to Enterprise WeChat IMAP using `imap.exmail.qq.com:993`.
6. Main fetches new mail and Excel attachments.
7. Main parses each attachment and returns normalized order rows.
8. Main merges cached rows with new rows by order number.
9. Renderer sorts and filters rows for display.
10. Main triggers system notification when new or updated orders are detected.

## Excel Parsing Parity

The Electron parser must preserve current behavior:

- Recognize Chinese and English aliases for order number and deadline columns.
- Support `.xlsx`, `.xlsm`, and `.xls`.
- Skip empty order rows.
- Normalize deadline text formats like `2026/6/20 00:00:00` and `2026年6月19日 18:30`.
- Support the known Ausmet/AUMSET job templates where the order number and delivery date are label-based rather than a normal table.
- Keep warnings when attachments are readable but do not contain recognizable order fields.

Existing Python parser tests are the migration checklist. Equivalent TypeScript tests must be added before replacing the Python app.

## Settings And Cache

Settings move from Python JSON paths to Electron app data:

- Windows: `%APPDATA%/Order Quick Read`
- macOS: `~/Library/Application Support/Order Quick Read`

The first Electron release should try to import the existing Python settings file if Electron settings are missing:

- Windows old path: `%APPDATA%/EmailOrderReader/settings.json`
- macOS old path: `~/.email-order-reader/settings.json`

After import, Electron writes its own settings and keeps using the new app data location.

The order cache stores:

- email
- uidvalidity
- last uid
- order rows
- warnings
- scanned message count
- parsed attachment count

## Updates

Use `electron-builder` and `electron-updater`.

Windows target:

- NSIS installer for normal installs.
- GitHub Release asset for direct download.
- Update flow can download installer and ask the user before installing.

macOS targets:

- DMG for Intel and Apple Silicon if separate builds remain simpler.
- Auto-update requires signing and notarization for a fully trusted macOS experience.
- Without signing, keep the current manual download and right-click-open guidance.

The UI behavior remains B:

1. Check for update.
2. Download update package.
3. Ask user before installation.
4. If confirmed, open installer/package and quit current app.

## Packaging And Release

GitHub Actions should be replaced with Electron jobs:

- Windows build on `windows-latest`.
- macOS Intel build on Intel runner if available.
- macOS Apple Silicon build on Apple Silicon runner.
- Publish GitHub Release assets:
  - `OrderQuickReadSetup.exe` or equivalent NSIS installer.
  - `OrderQuickRead-macos-x64.dmg`.
  - `OrderQuickRead-macos-arm64.dmg`.

The current PyInstaller scripts can remain until Electron reaches parity, then be removed.

## Migration Strategy

Phase 1: Add Electron app beside the Python app.

- Do not delete PySide6 code.
- Keep Python tests running.
- Add TypeScript tests for migrated logic.
- Add a local Electron dev command.

Phase 2: Port pure logic.

- Settings import.
- Sorting and filtering.
- Excel parsing.
- IMAP fetching.
- Cache merge.
- Update metadata selection.

Phase 3: Build UI parity.

- Settings panel.
- Toolbar.
- Date filters.
- Order table.
- Status and warnings.
- Notifications.

Phase 4: Packaging parity.

- Build Windows installer.
- Build macOS DMGs.
- Publish releases.
- Verify update check and download.

Phase 5: Retire PySide6.

- Remove PySide6 UI and PyInstaller packaging after Electron release passes parity checks.
- Keep any useful parser fixture data.

## Testing

Required tests before Electron becomes the main app:

- Unit tests for date parsing and deadline sorting.
- Unit tests for sent-date filtering.
- Unit tests for Excel parser aliases and known templates.
- Unit tests for IMAP attachment filtering using mocked messages.
- Unit tests for cache merge and settings import.
- Unit tests for update asset selection.
- Renderer tests for settings collapse, filter behavior, and update prompts.
- Packaged smoke test that starts the Electron app and verifies the main window renders.

## Risks

- `.xls` support must be verified carefully because many JavaScript Excel libraries only fully support `.xlsx`.
- IMAP behavior can differ from the Python client; UID and UIDVALIDITY handling must be tested.
- macOS signing and notarization remain separate operational work.
- Electron packages are larger than PyInstaller packages.
- A full rewrite can temporarily duplicate code. The Python app remains the fallback until parity is confirmed.

## Acceptance Criteria

The Electron rewrite is ready to replace the PySide6 app when:

- It scans the same mailbox and extracts the same order rows from the same sample emails and attachments.
- It preserves saved credentials through automatic import or explicit re-entry.
- It supports the same filters and sorting behavior.
- It auto-refreshes and notifies on new or updated orders.
- It checks and downloads GitHub Release updates.
- Windows and macOS packages are published from GitHub Actions.
- The old Python app can remain available as a fallback release until the Electron release is verified on at least one Windows machine and one Mac.
