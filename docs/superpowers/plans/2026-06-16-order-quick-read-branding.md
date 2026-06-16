# Order Quick Read Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rename the desktop app to `订单快读`, add a real app icon, rename release assets, and point update checks at the renamed GitHub repository while preserving saved mailbox settings.

**Architecture:** Keep the Python import package and console entry point stable. Add a small branding module for shared display/repository constants, use committed icon files for PyInstaller packaging, and keep the existing settings directory name for compatibility.

**Tech Stack:** Python 3.11+, PySide6, PyInstaller, GitHub Actions, pytest, CodeGraph.

---

### Task 1: CodeGraph And Repo Hygiene

**Files:**
- Modify: `.gitignore`
- Create: `.codegraph/.gitignore`
- Test: shell verification

- [x] **Step 1: Ignore local brainstorming state and keep CodeGraph data local**

Add these lines to `.gitignore` if absent:

```gitignore
.superpowers/
.codegraph/codegraph.db
.codegraph/*.db
.codegraph/*.db-*
.codegraph/daemon.pid
.codegraph/*.sock
.codegraph/*.log
```

Keep `.codegraph/.gitignore` committed so the repo is initialized for CodeGraph, but do not commit `.codegraph/codegraph.db`.

- [x] **Step 2: Verify CodeGraph status**

Run:

```bash
codegraph status .
```

Expected: output contains `Index is up to date`.

- [x] **Step 3: Verify git only sees intended repo-hygiene files**

Run:

```bash
git status --short
```

Expected: `.codegraph/.gitignore` and `.gitignore` can appear; `.codegraph/codegraph.db` and `.superpowers/` do not appear.

### Task 2: Branding Constants And Runtime Icon

**Files:**
- Create: `src/email_order_reader/branding.py`
- Create: `src/email_order_reader/ui/icons.py`
- Modify: `src/email_order_reader/ui/main_window.py`
- Test: `tests/test_main_window.py`

- [x] **Step 1: Write failing UI branding tests**

Add tests to `tests/test_main_window.py`:

```python
def test_window_uses_order_quick_read_branding(qtbot):
    window = MainWindow(check_updates_on_start=False)
    qtbot.addWidget(window)

    assert window.windowTitle() == "订单快读"
    assert not window.windowIcon().isNull()


def test_tray_icon_uses_order_quick_read_branding(qtbot, monkeypatch):
    monkeypatch.setattr(QSystemTrayIcon, "isSystemTrayAvailable", staticmethod(lambda: True))

    window = MainWindow(check_updates_on_start=False)
    qtbot.addWidget(window)

    assert window.tray_icon is not None
    assert window.tray_icon.toolTip() == "订单快读"
    assert not window.tray_icon.icon().isNull()
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
QT_QPA_PLATFORM=offscreen pytest tests/test_main_window.py::test_window_uses_order_quick_read_branding tests/test_main_window.py::test_tray_icon_uses_order_quick_read_branding -q
```

Expected: FAIL because the title and tray tooltip still use old branding and no custom icon exists.

- [x] **Step 3: Add branding constants**

Create `src/email_order_reader/branding.py`:

```python
from __future__ import annotations

DISPLAY_NAME = "订单快读"
WINDOW_TITLE = DISPLAY_NAME
TRAY_TOOLTIP = DISPLAY_NAME
REPOSITORY = "1192081163/order-quick-read"
WINDOWS_ASSET_NAME = "OrderQuickRead.exe"
MACOS_ASSET_NAME = "OrderQuickRead.dmg"
MACOS_APP_NAME = "Order Quick Read"
```

- [x] **Step 4: Add a runtime Qt icon helper**

Create `src/email_order_reader/ui/icons.py` with a `create_app_icon() -> QIcon` function that draws the approved rounded-square envelope plus spreadsheet icon using `QPixmap` and `QPainter`.

- [x] **Step 5: Apply branding in the main window**

In `src/email_order_reader/ui/main_window.py`, import `WINDOW_TITLE`, `TRAY_TOOLTIP`, and `create_app_icon`. Replace the old hard-coded title and tray tooltip:

```python
self.setWindowTitle(WINDOW_TITLE)
self.setWindowIcon(create_app_icon())
```

and:

```python
icon = self.windowIcon()
self.tray_icon = QSystemTrayIcon(icon, self)
self.tray_icon.setToolTip(TRAY_TOOLTIP)
```

- [x] **Step 6: Run branding tests**

Run:

```bash
QT_QPA_PLATFORM=offscreen pytest tests/test_main_window.py::test_window_uses_order_quick_read_branding tests/test_main_window.py::test_tray_icon_uses_order_quick_read_branding -q
```

Expected: PASS.

### Task 3: Committed Icon Files For Packaging

**Files:**
- Create: `assets/app_icon.png`
- Create: `assets/app_icon.ico`
- Create: `assets/app_icon.icns`
- Create: `scripts/generate_icons.py`
- Test: `tests/test_icon_assets.py`

- [x] **Step 1: Write failing icon asset tests**

Create `tests/test_icon_assets.py`:

```python
from pathlib import Path


def test_packaging_icon_assets_exist():
    assert Path("assets/app_icon.png").is_file()
    assert Path("assets/app_icon.ico").is_file()
    assert Path("assets/app_icon.icns").is_file()


def test_packaging_icon_assets_are_not_empty():
    assert Path("assets/app_icon.png").stat().st_size > 1000
    assert Path("assets/app_icon.ico").stat().st_size > 1000
    assert Path("assets/app_icon.icns").stat().st_size > 1000
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
pytest tests/test_icon_assets.py -q
```

Expected: FAIL because icon files do not exist.

- [x] **Step 3: Generate icon assets**

Create `scripts/generate_icons.py` that uses Pillow to draw the same rounded-square envelope plus spreadsheet icon at 1024px, writes `assets/app_icon.png`, writes multi-size `assets/app_icon.ico`, creates a temporary `.iconset`, and uses macOS `iconutil` to write `assets/app_icon.icns`.

- [x] **Step 4: Run the icon generator**

Run:

```bash
python3 scripts/generate_icons.py
```

Expected: `assets/app_icon.png`, `assets/app_icon.ico`, and `assets/app_icon.icns` exist.

- [x] **Step 5: Run icon asset tests**

Run:

```bash
pytest tests/test_icon_assets.py -q
```

Expected: PASS.

### Task 4: Build Scripts And GitHub Actions Rename

**Files:**
- Modify: `scripts/build_windows.ps1`
- Modify: `scripts/build_macos.sh`
- Modify: `.github/workflows/build.yml`
- Modify: `tests/test_build_windows_script.py`
- Modify: `tests/test_github_actions_workflow.py`

- [x] **Step 1: Update tests for renamed artifacts**

Change old assertions from `EmailOrderReader.exe`, `EmailOrderReader.dmg`, and `Email Order Reader.app` to:

```python
assert "dist/Order Quick Read" in content
assert "dist/OrderQuickRead.exe" in content
assert "dist/OrderQuickRead.dmg" in content
assert "OrderQuickRead.exe#OrderQuickRead.exe" in content
assert "OrderQuickRead.dmg#OrderQuickRead.dmg" in content
```

and:

```python
assert '--name "OrderQuickRead"' in script
assert '--icon "assets/app_icon.ico"' in script
assert "dist\\OrderQuickRead.exe" in script
assert 'APP_PATH="dist/Order Quick Read.app"' in script
assert 'DMG_PATH="dist/OrderQuickRead.dmg"' in script
assert '--icon assets/app_icon.icns' in script
```

- [x] **Step 2: Run affected build config tests to verify failure**

Run:

```bash
pytest tests/test_build_windows_script.py tests/test_github_actions_workflow.py -q
```

Expected: FAIL because scripts and workflow still contain old names.

- [x] **Step 3: Update Windows build script**

In `scripts/build_windows.ps1`, change the PyInstaller names and add the icon:

```powershell
--name "Order Quick Read" `
--icon "assets/app_icon.ico" `
```

and:

```powershell
--name "OrderQuickRead" `
--icon "assets/app_icon.ico" `
```

Update output messages to `dist\Order Quick Read\Order Quick Read.exe` and `dist\OrderQuickRead.exe`.

- [x] **Step 4: Update macOS build script**

In `scripts/build_macos.sh`, use:

```bash
--name "Order Quick Read" \
--icon assets/app_icon.icns \
```

and:

```bash
APP_PATH="dist/Order Quick Read.app"
DMG_PATH="dist/OrderQuickRead.dmg"
ditto "$APP_PATH" "$DMG_ROOT/Order Quick Read.app"
hdiutil create -volname "Order Quick Read" ...
```

- [x] **Step 5: Update GitHub Actions workflow**

Update artifact names and release asset names to:

```yaml
name: order-quick-read-windows
path: dist/Order Quick Read
name: OrderQuickRead.exe
path: dist/OrderQuickRead.exe
name: order-quick-read-macos
path: dist/Order Quick Read.app
name: OrderQuickRead.dmg
path: dist/OrderQuickRead.dmg
```

Update release notes to mention `OrderQuickRead.exe`, `OrderQuickRead.dmg`, and `Order Quick Read.app`.

- [x] **Step 6: Run build config tests**

Run:

```bash
pytest tests/test_build_windows_script.py tests/test_github_actions_workflow.py -q
```

Expected: PASS.

### Task 5: Update Checker And Documentation

**Files:**
- Modify: `src/email_order_reader/updates.py`
- Modify: `tests/test_updates.py`
- Modify: `tests/test_main_window.py`
- Modify: `README.md`

- [x] **Step 1: Write failing update repository test**

In `tests/test_updates.py`, import `GITHUB_RELEASE_API_URL` and add:

```python
def test_update_checker_uses_renamed_repository():
    assert GITHUB_RELEASE_API_URL == "https://api.github.com/repos/1192081163/order-quick-read/releases/latest"
```

Update fake payload URLs and asset names in existing tests to `order-quick-read`, `OrderQuickRead.exe`, and `OrderQuickRead.dmg`.

- [x] **Step 2: Run update tests to verify failure**

Run:

```bash
pytest tests/test_updates.py -q
```

Expected: FAIL because the update API URL still points to `email-order-reader`.

- [x] **Step 3: Update the checker constants**

In `src/email_order_reader/updates.py`, import `REPOSITORY` and use:

```python
GITHUB_RELEASE_API_URL = f"https://api.github.com/repos/{REPOSITORY}/releases/latest"
USER_AGENT = f"OrderQuickRead/{__version__}"
```

- [x] **Step 4: Update main window update test fixtures**

In `tests/test_main_window.py`, change update fixture URLs and download path names to `order-quick-read` and `OrderQuickRead.exe`.

- [x] **Step 5: Update README**

Change the title to `# 订单快读`, add the English repo/download name `Order Quick Read`, and update all download examples to:

```text
OrderQuickRead.exe
OrderQuickRead.dmg
order-quick-read-windows
order-quick-read-macos
dist\Order Quick Read\Order Quick Read.exe
dist/OrderQuickRead.dmg
```

- [x] **Step 6: Run update and README-adjacent tests**

Run:

```bash
pytest tests/test_updates.py tests/test_main_window.py::test_window_prompts_to_download_new_update tests/test_main_window.py::test_window_opens_release_page_when_update_asset_is_missing tests/test_main_window.py::test_window_opens_downloaded_update_file -q
```

Expected: PASS.

### Task 6: Full Verification, Commit, Push, And Repository Rename

**Files:**
- Modify only files changed by prior tasks
- External: GitHub repository metadata

- [x] **Step 1: Re-index CodeGraph after edits**

Run:

```bash
codegraph sync .
codegraph status .
```

Expected: sync completes and status says `Index is up to date`.

- [x] **Step 2: Run the full test suite**

Run:

```bash
QT_QPA_PLATFORM=offscreen pytest -q
```

Expected: all tests pass.

- [x] **Step 3: Inspect git status**

Run:

```bash
git status --short
```

Expected: only branding, icon, build, docs, test, `.gitignore`, and `.codegraph/.gitignore` changes are present.

- [x] **Step 4: Commit implementation**

Run:

```bash
git add .gitignore .codegraph/.gitignore assets scripts src tests README.md .github/workflows/build.yml docs/superpowers/plans/2026-06-16-order-quick-read-branding.md
git commit -m "Rename app to Order Quick Read"
```

- [x] **Step 5: Push main**

Run:

```bash
git push origin main
```

- [x] **Step 6: Rename GitHub repository**

Use GitHub CLI after push:

```bash
gh repo rename order-quick-read --repo 1192081163/email-order-reader --yes
```

Then update the local remote if GitHub does not transparently redirect:

```bash
git remote set-url origin git@github.com:1192081163/order-quick-read.git
```

- [x] **Step 7: Confirm remote and release workflow target**

Run:

```bash
git remote -v
gh repo view 1192081163/order-quick-read --json nameWithOwner,url
```

Expected: output references `1192081163/order-quick-read`.
