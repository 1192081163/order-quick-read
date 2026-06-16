# Order Quick Read Branding Design

## Goal

Rename the desktop app to `订单快读` and add a real application icon while keeping the app simple and compatible with existing saved mailbox settings.

## Approved Direction

- Display name: `订单快读`
- Release file names:
  - Windows: `OrderQuickRead.exe`
  - macOS: `OrderQuickRead.dmg`
- macOS app bundle path: `Order Quick Read.app`
- Icon direction: a clean rounded-square icon with an envelope plus a spreadsheet sheet, using restrained teal/green colors.
- Existing saved settings must continue to load by keeping the current internal settings directory name.

## Scope

The change covers visible app branding and packaged artifact naming:

- Window title and tray tooltip.
- Windows `.exe` name.
- macOS `.app` and `.dmg` name.
- GitHub Actions artifact and Release asset names.
- README download instructions.
- App icon files for Windows and macOS packaging.
- Tests that assert branding, build output names, update asset selection, and settings compatibility.

The change does not rename the GitHub repository, Python package, command-line entry point, or IMAP parsing behavior.

## Data Flow

At runtime, branding is read from a small shared constant so the UI and tray use the same display name. Packaging scripts use explicit artifact names so GitHub Release downloads are predictable. The update checker continues to pick the correct asset by platform suffix, so renamed assets still work as long as the Release contains `.exe` for Windows and `.dmg` for macOS.

## Compatibility

Settings compatibility is required because users have already saved mailbox credentials locally. The implementation keeps the existing settings directory name `EmailOrderReader` invisible to users and only changes visible branding.

## Testing

Tests should cover:

- New visible display name in the main window and tray tooltip.
- Windows build script output includes `OrderQuickRead.exe`.
- macOS build script output includes `OrderQuickRead.dmg` and `Order Quick Read.app`.
- GitHub Actions uploads the renamed Release assets.
- Existing settings path behavior remains compatible.
- Update checks still select the current platform asset after the rename.
