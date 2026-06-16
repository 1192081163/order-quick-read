#!/usr/bin/env bash
set -euo pipefail

python3 -m PyInstaller \
  --name "Email Order Reader" \
  --windowed \
  --clean \
  --noconfirm \
  --hidden-import openpyxl \
  --hidden-import xlrd \
  src/email_order_reader/app.py

APP_PATH="dist/Email Order Reader.app"
DMG_ROOT="dist/dmg-root"
DMG_PATH="dist/EmailOrderReader.dmg"

rm -rf "$DMG_ROOT" "$DMG_PATH"
mkdir -p "$DMG_ROOT"
ditto "$APP_PATH" "$DMG_ROOT/Email Order Reader.app"
hdiutil create \
  -volname "Email Order Reader" \
  -srcfolder "$DMG_ROOT" \
  -ov \
  -format UDZO "$DMG_PATH"
