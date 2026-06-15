# Email Order Reader

Minimal desktop app for scanning recent IMAP email attachments and showing order deadlines.

## Development

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python -m pytest
```

## Run

```bash
email-order-reader
```

## Package

macOS:

```bash
bash scripts/build_macos.sh
```

Windows PowerShell:

```powershell
.\scripts\build_windows.ps1
```
