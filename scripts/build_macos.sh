#!/usr/bin/env bash
set -euo pipefail

python3 -m PyInstaller \
  --name "Order Quick Read" \
  --windowed \
  --icon assets/app_icon.icns \
  --clean \
  --noconfirm \
  --hidden-import openpyxl \
  --hidden-import xlrd \
  src/email_order_reader/app.py

APP_PATH="dist/Order Quick Read.app"
DMG_ROOT="dist/dmg-root"
DMG_PATH="dist/OrderQuickRead.dmg"

rm -rf "$DMG_ROOT" "$DMG_PATH"
mkdir -p "$DMG_ROOT"
ditto "$APP_PATH" "$DMG_ROOT/Order Quick Read.app"
hdiutil create \
  -volname "Order Quick Read" \
  -srcfolder "$DMG_ROOT" \
  -ov \
  -format UDZO "$DMG_PATH"
