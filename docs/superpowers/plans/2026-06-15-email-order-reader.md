# Email Order Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal Windows/macOS Python desktop app that scans recent IMAP emails, parses Excel attachments, and displays `订单号` plus `截至时间`.

**Architecture:** Use a small PySide6 desktop UI on top of testable core modules. Keep email access, Excel parsing, scan orchestration, and UI rendering separate so the parser and scan logic can be tested without a real mailbox.

**Tech Stack:** Python 3.11+, PySide6, imaplib/email from the standard library, openpyxl for `.xlsx` and `.xlsm`, xlrd for `.xls`, pytest, pytest-qt, PyInstaller.

---

## Scope Check

The approved spec is one cohesive first version: a single-account manual-refresh desktop app with no persistence. It does not need separate sub-project specs.

## File Structure

- Create `pyproject.toml`: package metadata, runtime dependencies, dev dependencies, pytest settings.
- Create `README.md`: run, test, and package commands for Windows and macOS.
- Create `src/email_order_reader/__init__.py`: package marker and version.
- Create `src/email_order_reader/app.py`: application entry point.
- Create `src/email_order_reader/models.py`: dataclasses shared across parser, email client, service, and UI.
- Create `src/email_order_reader/excel_parser.py`: workbook reading, column detection, and date normalization.
- Create `src/email_order_reader/email_client.py`: IMAP connection, recent message search, attachment extraction.
- Create `src/email_order_reader/scan_service.py`: orchestrates email attachment fetch and Excel parsing.
- Create `src/email_order_reader/ui/__init__.py`: UI package marker.
- Create `src/email_order_reader/ui/main_window.py`: PySide6 window, collapsible settings, hidden alias controls, worker thread, two-column table.
- Create `tests/test_models.py`: model defaults and small invariants.
- Create `tests/test_excel_parser.py`: alias detection, date normalization, `.xls` support, heuristic detection, missing-column warnings.
- Create `tests/test_email_client.py`: cutoff calculation and Excel attachment extraction from email messages.
- Create `tests/test_scan_service.py`: orchestration with fake email client.
- Create `tests/test_main_window.py`: UI collapse and table rendering with pytest-qt.
- Create `scripts/build_macos.sh`: macOS PyInstaller build command.
- Create `scripts/build_windows.ps1`: Windows PyInstaller build command.

---

### Task 1: Project Scaffold

**Files:**
- Create: `pyproject.toml`
- Create: `README.md`
- Create: `src/email_order_reader/__init__.py`
- Create: `tests/test_package_import.py`

- [ ] **Step 1: Write the failing import test**

Create `tests/test_package_import.py`:

```python
import email_order_reader


def test_package_has_version():
    assert isinstance(email_order_reader.__version__, str)
    assert email_order_reader.__version__
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m pytest tests/test_package_import.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader'`.

- [ ] **Step 3: Create package configuration**

Create `pyproject.toml`:

```toml
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "email-order-reader"
version = "0.1.0"
description = "Desktop app for reading IMAP email Excel order attachments."
requires-python = ">=3.11"
dependencies = [
  "PySide6>=6.7,<7",
  "openpyxl>=3.1,<4",
  "xlrd>=2.0,<3",
]

[project.optional-dependencies]
dev = [
  "pytest>=8,<9",
  "pytest-qt>=4.4,<5",
  "xlwt>=1.3,<2",
  "pyinstaller>=6,<7",
]

[project.scripts]
email-order-reader = "email_order_reader.app:main"

[tool.setuptools.packages.find]
where = ["src"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["src"]
```

Create `src/email_order_reader/__init__.py`:

```python
__version__ = "0.1.0"
```

Create `README.md`:

````markdown
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
````

- [ ] **Step 4: Install dependencies and run test**

Run:

```bash
python3 -m pip install -e ".[dev]"
python3 -m pytest tests/test_package_import.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml README.md src/email_order_reader/__init__.py tests/test_package_import.py
git commit -m "chore: scaffold email order reader project"
```

---

### Task 2: Shared Models

**Files:**
- Create: `src/email_order_reader/models.py`
- Create: `tests/test_models.py`

- [ ] **Step 1: Write failing model tests**

Create `tests/test_models.py`:

```python
from datetime import datetime, timezone

from email_order_reader.models import (
    AttachmentParseResult,
    ColumnAliases,
    EmailAttachment,
    ImapConfig,
    OrderRow,
    ScanResult,
)


def test_order_row_strips_whitespace():
    row = OrderRow(order_number="  PO-1001  ", deadline=" 2026-06-20 ")

    assert row.order_number == "PO-1001"
    assert row.deadline == "2026-06-20"


def test_default_aliases_include_chinese_and_english_names():
    aliases = ColumnAliases.default()

    assert "订单号" in aliases.order_number
    assert "Order Number" in aliases.order_number
    assert "交单日期" in aliases.deadline
    assert "Due Date" in aliases.deadline


def test_scan_result_counts_rows_and_warnings():
    result = ScanResult(
        rows=[OrderRow("A1", "2026-06-20")],
        warnings=["未识别列：orders.xlsx"],
        scanned_messages=3,
        parsed_attachments=1,
    )

    assert result.row_count == 1
    assert result.warning_count == 1


def test_email_attachment_keeps_source_metadata():
    message_time = datetime(2026, 6, 15, 8, 30, tzinfo=timezone.utc)
    attachment = EmailAttachment(
        filename="orders.xlsx",
        content=b"content",
        message_subject="供应商订单",
        message_date=message_time,
    )

    assert attachment.filename == "orders.xlsx"
    assert attachment.message_subject == "供应商订单"
    assert attachment.message_date == message_time


def test_imap_config_defaults_to_ssl_port():
    config = ImapConfig(server="imap.example.com", email="a@example.com", auth_code="secret")

    assert config.port == 993
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m pytest tests/test_models.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader.models'`.

- [ ] **Step 3: Implement models**

Create `src/email_order_reader/models.py`:

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True)
class OrderRow:
    order_number: str
    deadline: str
    source_file: str = ""
    message_subject: str = ""

    def __post_init__(self) -> None:
        object.__setattr__(self, "order_number", str(self.order_number).strip())
        object.__setattr__(self, "deadline", str(self.deadline).strip())
        object.__setattr__(self, "source_file", str(self.source_file).strip())
        object.__setattr__(self, "message_subject", str(self.message_subject).strip())


@dataclass(frozen=True)
class ColumnAliases:
    order_number: tuple[str, ...]
    deadline: tuple[str, ...]

    @classmethod
    def default(cls) -> "ColumnAliases":
        return cls(
            order_number=(
                "订单号",
                "订单编号",
                "客户订单号",
                "Order No",
                "Order Number",
                "PO",
                "PO Number",
            ),
            deadline=(
                "交单日期",
                "截至时间",
                "截止时间",
                "交货日期",
                "Delivery Date",
                "Due Date",
            ),
        )


@dataclass(frozen=True)
class EmailAttachment:
    filename: str
    content: bytes
    message_subject: str = ""
    message_date: datetime | None = None


@dataclass(frozen=True)
class AttachmentParseResult:
    filename: str
    rows: list[OrderRow] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ScanResult:
    rows: list[OrderRow] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    scanned_messages: int = 0
    parsed_attachments: int = 0

    @property
    def row_count(self) -> int:
        return len(self.rows)

    @property
    def warning_count(self) -> int:
        return len(self.warnings)


@dataclass(frozen=True)
class ImapConfig:
    server: str
    email: str
    auth_code: str
    port: int = 993
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m pytest tests/test_models.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email_order_reader/models.py tests/test_models.py
git commit -m "feat: add shared scan models"
```

---

### Task 3: Excel Parser for Header-Based `.xlsx` and `.xlsm`

**Files:**
- Create: `src/email_order_reader/excel_parser.py`
- Create: `tests/test_excel_parser.py`

- [ ] **Step 1: Write failing parser tests**

Create `tests/test_excel_parser.py`:

```python
from datetime import date, datetime
from io import BytesIO

from openpyxl import Workbook

from email_order_reader.excel_parser import parse_excel_attachment
from email_order_reader.models import ColumnAliases


def make_xlsx(headers, rows, suffix="xlsx"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Orders"
    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    stream = BytesIO()
    workbook.save(stream)
    return f"orders.{suffix}", stream.getvalue()


def test_parse_xlsx_with_chinese_headers():
    filename, content = make_xlsx(
        ["订单号", "交单日期", "备注"],
        [["PO-1001", date(2026, 6, 20), "加急"]],
    )

    result = parse_excel_attachment(filename, content, ColumnAliases.default())

    assert result.warnings == []
    assert [(row.order_number, row.deadline) for row in result.rows] == [("PO-1001", "2026-06-20")]


def test_parse_xlsm_with_english_headers_and_datetime_cell():
    filename, content = make_xlsx(
        ["Order Number", "Due Date"],
        [["PO-2002", datetime(2026, 7, 3, 9, 15)]],
        suffix="xlsm",
    )

    result = parse_excel_attachment(filename, content, ColumnAliases.default())

    assert result.warnings == []
    assert [(row.order_number, row.deadline) for row in result.rows] == [("PO-2002", "2026-07-03")]


def test_parse_skips_empty_order_rows():
    filename, content = make_xlsx(
        ["订单编号", "截止时间"],
        [[None, date(2026, 6, 20)], ["PO-3003", "2026/06/21"]],
    )

    result = parse_excel_attachment(filename, content, ColumnAliases.default())

    assert result.warnings == []
    assert [(row.order_number, row.deadline) for row in result.rows] == [("PO-3003", "2026-06-21")]


def test_parse_reports_missing_columns():
    filename, content = make_xlsx(
        ["客户", "金额"],
        [["ACME", 100]],
    )

    result = parse_excel_attachment(filename, content, ColumnAliases.default())

    assert result.rows == []
    assert result.warnings == ["orders.xlsx：未识别订单号列或截至时间列"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m pytest tests/test_excel_parser.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader.excel_parser'`.

- [ ] **Step 3: Implement `.xlsx` and `.xlsm` parsing**

Create `src/email_order_reader/excel_parser.py`:

```python
from __future__ import annotations

import re
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Iterable, Sequence

from openpyxl import load_workbook

from email_order_reader.models import AttachmentParseResult, ColumnAliases, OrderRow


HEADER_SCAN_LIMIT = 20


def parse_excel_attachment(
    filename: str,
    content: bytes,
    aliases: ColumnAliases | None = None,
    message_subject: str = "",
) -> AttachmentParseResult:
    aliases = aliases or ColumnAliases.default()

    try:
        rows = _read_rows(filename, content)
    except Exception as exc:
        return AttachmentParseResult(filename=filename, warnings=[f"{filename}：无法读取Excel附件：{exc}"])

    parsed_rows = _parse_rows(filename, rows, aliases, message_subject)
    return parsed_rows


def _read_rows(filename: str, content: bytes) -> list[list[object]]:
    suffix = Path(filename).suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        return _read_openpyxl_rows(content)
    return []


def _read_openpyxl_rows(content: bytes) -> list[list[object]]:
    workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    all_rows: list[list[object]] = []
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows(values_only=True):
            all_rows.append(list(row))
    return all_rows


def _parse_rows(
    filename: str,
    rows: Sequence[Sequence[object]],
    aliases: ColumnAliases,
    message_subject: str,
) -> AttachmentParseResult:
    header_match = _find_header(rows, aliases)
    if header_match is None:
        return AttachmentParseResult(filename=filename, warnings=[f"{filename}：未识别订单号列或截至时间列"])

    header_index, order_col, deadline_col = header_match
    parsed: list[OrderRow] = []

    for row in rows[header_index + 1 :]:
        order_number = _cell_to_text(_get_cell(row, order_col))
        deadline = _normalize_deadline(_get_cell(row, deadline_col))
        if not order_number or not deadline:
            continue
        parsed.append(
            OrderRow(
                order_number=order_number,
                deadline=deadline,
                source_file=filename,
                message_subject=message_subject,
            )
        )

    return AttachmentParseResult(filename=filename, rows=parsed)


def _find_header(
    rows: Sequence[Sequence[object]],
    aliases: ColumnAliases,
) -> tuple[int, int, int] | None:
    order_aliases = {_normalize_header(value) for value in aliases.order_number}
    deadline_aliases = {_normalize_header(value) for value in aliases.deadline}

    for index, row in enumerate(rows[:HEADER_SCAN_LIMIT]):
        normalized = [_normalize_header(_cell_to_text(cell)) for cell in row]
        order_col = _find_first_index(normalized, order_aliases)
        deadline_col = _find_first_index(normalized, deadline_aliases)
        if order_col is not None and deadline_col is not None:
            return index, order_col, deadline_col
    return None


def _find_first_index(values: Iterable[str], targets: set[str]) -> int | None:
    for index, value in enumerate(values):
        if value in targets:
            return index
    return None


def _normalize_header(value: object) -> str:
    text = _cell_to_text(value).lower()
    return re.sub(r"[\s_\-:/：（）()]+", "", text)


def _get_cell(row: Sequence[object], index: int) -> object:
    if index >= len(row):
        return None
    return row[index]


def _cell_to_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _normalize_deadline(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    text = _cell_to_text(value)
    if not text:
        return ""

    patterns = (
        r"^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$",
        r"^(\d{4})年(\d{1,2})月(\d{1,2})日$",
    )
    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            year, month, day = (int(part) for part in match.groups())
            return date(year, month, day).isoformat()

    return text
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m pytest tests/test_excel_parser.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email_order_reader/excel_parser.py tests/test_excel_parser.py
git commit -m "feat: parse Excel order attachments"
```

---

### Task 4: `.xls` Support and Heuristic Column Detection

**Files:**
- Modify: `src/email_order_reader/excel_parser.py`
- Modify: `tests/test_excel_parser.py`

- [ ] **Step 1: Add failing tests for `.xls` and no-header heuristic**

Append to `tests/test_excel_parser.py`:

```python
import xlwt


def make_xls(headers, rows):
    workbook = xlwt.Workbook()
    sheet = workbook.add_sheet("Orders")
    for column, value in enumerate(headers):
        sheet.write(0, column, value)
    for row_index, row in enumerate(rows, start=1):
        for column, value in enumerate(row):
            sheet.write(row_index, column, value)

    stream = BytesIO()
    workbook.save(stream)
    return "orders.xls", stream.getvalue()


def test_parse_xls_with_chinese_headers():
    filename, content = make_xls(
        ["客户订单号", "交货日期"],
        [["PO-4004", "2026-08-09"]],
    )

    result = parse_excel_attachment(filename, content, ColumnAliases.default())

    assert result.warnings == []
    assert [(row.order_number, row.deadline) for row in result.rows] == [("PO-4004", "2026-08-09")]


def test_parse_detects_columns_without_alias_headers():
    filename, content = make_xlsx(
        ["编号", "时间"],
        [["PO-5005", "2026-09-01"], ["PO-5006", "2026-09-02"]],
    )

    result = parse_excel_attachment(filename, content, ColumnAliases.default())

    assert result.warnings == []
    assert [(row.order_number, row.deadline) for row in result.rows] == [
        ("PO-5005", "2026-09-01"),
        ("PO-5006", "2026-09-02"),
    ]
```

- [ ] **Step 2: Run tests to verify new cases fail**

Run:

```bash
python3 -m pytest tests/test_excel_parser.py::test_parse_xls_with_chinese_headers tests/test_excel_parser.py::test_parse_detects_columns_without_alias_headers -v
```

Expected: FAIL. The `.xls` case returns a missing-column warning, and the heuristic case returns a missing-column warning.

- [ ] **Step 3: Extend parser implementation**

Replace `src/email_order_reader/excel_parser.py` with:

```python
from __future__ import annotations

import re
from datetime import date, datetime
from io import BytesIO
from pathlib import Path
from typing import Iterable, Sequence

import xlrd
from openpyxl import load_workbook

from email_order_reader.models import AttachmentParseResult, ColumnAliases, OrderRow


HEADER_SCAN_LIMIT = 20


def parse_excel_attachment(
    filename: str,
    content: bytes,
    aliases: ColumnAliases | None = None,
    message_subject: str = "",
) -> AttachmentParseResult:
    aliases = aliases or ColumnAliases.default()

    try:
        rows = _read_rows(filename, content)
    except Exception as exc:
        return AttachmentParseResult(filename=filename, warnings=[f"{filename}：无法读取Excel附件：{exc}"])

    parsed_rows = _parse_rows(filename, rows, aliases, message_subject)
    return parsed_rows


def _read_rows(filename: str, content: bytes) -> list[list[object]]:
    suffix = Path(filename).suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        return _read_openpyxl_rows(content)
    if suffix == ".xls":
        return _read_xlrd_rows(content)
    raise ValueError(f"不支持的附件格式：{suffix}")


def _read_openpyxl_rows(content: bytes) -> list[list[object]]:
    workbook = load_workbook(BytesIO(content), read_only=True, data_only=True)
    all_rows: list[list[object]] = []
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows(values_only=True):
            all_rows.append(list(row))
    return all_rows


def _read_xlrd_rows(content: bytes) -> list[list[object]]:
    workbook = xlrd.open_workbook(file_contents=content)
    all_rows: list[list[object]] = []
    for sheet in workbook.sheets():
        for row_index in range(sheet.nrows):
            values: list[object] = []
            for column_index in range(sheet.ncols):
                cell = sheet.cell(row_index, column_index)
                if cell.ctype == xlrd.XL_CELL_DATE:
                    values.append(xlrd.xldate_as_datetime(cell.value, workbook.datemode))
                else:
                    values.append(cell.value)
            all_rows.append(values)
    return all_rows


def _parse_rows(
    filename: str,
    rows: Sequence[Sequence[object]],
    aliases: ColumnAliases,
    message_subject: str,
) -> AttachmentParseResult:
    column_match = _find_header(rows, aliases) or _guess_columns(rows)
    if column_match is None:
        return AttachmentParseResult(filename=filename, warnings=[f"{filename}：未识别订单号列或截至时间列"])

    header_index, order_col, deadline_col = column_match
    parsed: list[OrderRow] = []

    for row in rows[header_index + 1 :]:
        order_number = _cell_to_text(_get_cell(row, order_col))
        deadline = _normalize_deadline(_get_cell(row, deadline_col))
        if not order_number or not deadline:
            continue
        parsed.append(
            OrderRow(
                order_number=order_number,
                deadline=deadline,
                source_file=filename,
                message_subject=message_subject,
            )
        )

    return AttachmentParseResult(filename=filename, rows=parsed)


def _find_header(
    rows: Sequence[Sequence[object]],
    aliases: ColumnAliases,
) -> tuple[int, int, int] | None:
    order_aliases = {_normalize_header(value) for value in aliases.order_number}
    deadline_aliases = {_normalize_header(value) for value in aliases.deadline}

    for index, row in enumerate(rows[:HEADER_SCAN_LIMIT]):
        normalized = [_normalize_header(_cell_to_text(cell)) for cell in row]
        order_col = _find_first_index(normalized, order_aliases)
        deadline_col = _find_first_index(normalized, deadline_aliases)
        if order_col is not None and deadline_col is not None:
            return index, order_col, deadline_col
    return None


def _guess_columns(rows: Sequence[Sequence[object]]) -> tuple[int, int, int] | None:
    if len(rows) < 2:
        return None

    max_columns = max((len(row) for row in rows), default=0)
    scores: list[tuple[int, int, int]] = []
    sample_rows = rows[1:HEADER_SCAN_LIMIT]

    for column_index in range(max_columns):
        order_score = 0
        date_score = 0
        for row in sample_rows:
            value = _get_cell(row, column_index)
            text = _cell_to_text(value)
            if _looks_like_order_number(text):
                order_score += 1
            if _normalize_deadline(value):
                date_score += 1
        scores.append((column_index, order_score, date_score))

    order_column = max(scores, key=lambda item: item[1], default=(0, 0, 0))
    deadline_column = max(scores, key=lambda item: item[2], default=(0, 0, 0))

    if order_column[1] == 0 or deadline_column[2] == 0 or order_column[0] == deadline_column[0]:
        return None
    return 0, order_column[0], deadline_column[0]


def _looks_like_order_number(text: str) -> bool:
    if not text:
        return False
    if len(text) < 3:
        return False
    return bool(re.search(r"[A-Za-z]", text) and re.search(r"\d", text))


def _find_first_index(values: Iterable[str], targets: set[str]) -> int | None:
    for index, value in enumerate(values):
        if value in targets:
            return index
    return None


def _normalize_header(value: object) -> str:
    text = _cell_to_text(value).lower()
    return re.sub(r"[\s_\-:/：（）()]+", "", text)


def _get_cell(row: Sequence[object], index: int) -> object:
    if index >= len(row):
        return None
    return row[index]


def _cell_to_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _normalize_deadline(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    text = _cell_to_text(value)
    if not text:
        return ""

    patterns = (
        r"^(\d{4})[-/\.](\d{1,2})[-/\.](\d{1,2})$",
        r"^(\d{4})年(\d{1,2})月(\d{1,2})日$",
    )
    for pattern in patterns:
        match = re.match(pattern, text)
        if match:
            year, month, day = (int(part) for part in match.groups())
            return date(year, month, day).isoformat()

    return ""
```

- [ ] **Step 4: Run all parser tests**

Run:

```bash
python3 -m pytest tests/test_excel_parser.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email_order_reader/excel_parser.py tests/test_excel_parser.py
git commit -m "feat: support xls and inferred Excel columns"
```

---

### Task 5: IMAP Email Client

**Files:**
- Create: `src/email_order_reader/email_client.py`
- Create: `tests/test_email_client.py`

- [ ] **Step 1: Write failing email client tests**

Create `tests/test_email_client.py`:

```python
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from email_order_reader.email_client import (
    extract_excel_attachments,
    imap_since_date,
    is_excel_filename,
    parse_message_date,
)


def test_imap_since_date_uses_cutoff_calendar_date():
    now = datetime(2026, 6, 15, 10, 30, tzinfo=timezone.utc)

    assert imap_since_date(now - timedelta(hours=24)) == "14-Jun-2026"


def test_is_excel_filename_accepts_supported_formats():
    assert is_excel_filename("orders.xlsx")
    assert is_excel_filename("orders.xlsm")
    assert is_excel_filename("orders.xls")
    assert not is_excel_filename("orders.csv")


def test_extract_excel_attachments_decodes_filename_and_payload():
    message = EmailMessage()
    message["Subject"] = "供应商订单"
    message["Date"] = "Mon, 15 Jun 2026 10:00:00 +0000"
    message.set_content("see attachment")
    message.add_attachment(
        b"excel-bytes",
        maintype="application",
        subtype="vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="orders.xlsx",
    )
    message.add_attachment(
        b"text-bytes",
        maintype="text",
        subtype="plain",
        filename="notes.txt",
    )

    attachments = extract_excel_attachments(message)

    assert len(attachments) == 1
    assert attachments[0].filename == "orders.xlsx"
    assert attachments[0].content == b"excel-bytes"
    assert attachments[0].message_subject == "供应商订单"
    assert attachments[0].message_date == datetime(2026, 6, 15, 10, 0, tzinfo=timezone.utc)


def test_parse_message_date_returns_none_for_missing_date():
    message = EmailMessage()

    assert parse_message_date(message) is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m pytest tests/test_email_client.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader.email_client'`.

- [ ] **Step 3: Implement email client**

Create `src/email_order_reader/email_client.py`:

```python
from __future__ import annotations

import imaplib
from datetime import datetime, timedelta, timezone
from email import message_from_bytes
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.policy import default
from email.utils import parsedate_to_datetime
from pathlib import Path

from email_order_reader.models import EmailAttachment, ImapConfig


SUPPORTED_EXCEL_SUFFIXES = {".xlsx", ".xlsm", ".xls"}


def imap_since_date(cutoff: datetime) -> str:
    return cutoff.strftime("%d-%b-%Y")


def is_excel_filename(filename: str) -> bool:
    return Path(filename).suffix.lower() in SUPPORTED_EXCEL_SUFFIXES


def parse_message_date(message: Message) -> datetime | None:
    raw_date = message.get("Date")
    if not raw_date:
        return None
    parsed = parsedate_to_datetime(raw_date)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def decode_mime_text(value: str | None) -> str:
    if not value:
        return ""
    return str(make_header(decode_header(value)))


def extract_excel_attachments(message: Message) -> list[EmailAttachment]:
    subject = decode_mime_text(message.get("Subject"))
    message_date = parse_message_date(message)
    attachments: list[EmailAttachment] = []

    for part in message.walk():
        filename = part.get_filename()
        if not filename:
            continue
        decoded_filename = decode_mime_text(filename)
        if not is_excel_filename(decoded_filename):
            continue
        payload = part.get_payload(decode=True)
        if payload is None:
            continue
        attachments.append(
            EmailAttachment(
                filename=decoded_filename,
                content=payload,
                message_subject=subject,
                message_date=message_date,
            )
        )

    return attachments


class ImapEmailClient:
    def __init__(self, config: ImapConfig, timeout_seconds: int = 30) -> None:
        self.config = config
        self.timeout_seconds = timeout_seconds

    def fetch_recent_excel_attachments(self, hours: int = 24) -> tuple[list[EmailAttachment], int]:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        attachments: list[EmailAttachment] = []
        scanned_messages = 0

        with imaplib.IMAP4_SSL(
            self.config.server,
            self.config.port,
            timeout=self.timeout_seconds,
        ) as mailbox:
            mailbox.login(self.config.email, self.config.auth_code)
            mailbox.select("INBOX")
            status, data = mailbox.search(None, "SINCE", imap_since_date(cutoff))
            if status != "OK":
                raise RuntimeError("邮箱搜索失败")

            message_ids = data[0].split() if data and data[0] else []
            for message_id in message_ids:
                status, fetch_data = mailbox.fetch(message_id, "(RFC822)")
                if status != "OK":
                    continue
                for item in fetch_data:
                    if not isinstance(item, tuple):
                        continue
                    message = message_from_bytes(item[1], policy=default)
                    message_date = parse_message_date(message)
                    if message_date is not None and message_date < cutoff:
                        continue
                    scanned_messages += 1
                    attachments.extend(extract_excel_attachments(message))

        return attachments, scanned_messages
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m pytest tests/test_email_client.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email_order_reader/email_client.py tests/test_email_client.py
git commit -m "feat: fetch Excel attachments from IMAP emails"
```

---

### Task 6: Scan Service

**Files:**
- Create: `src/email_order_reader/scan_service.py`
- Create: `tests/test_scan_service.py`

- [ ] **Step 1: Write failing scan service tests**

Create `tests/test_scan_service.py`:

```python
from datetime import date
from io import BytesIO

from openpyxl import Workbook

from email_order_reader.models import ColumnAliases, EmailAttachment
from email_order_reader.scan_service import OrderScanService


class FakeClient:
    def __init__(self, attachments, scanned_messages):
        self.attachments = attachments
        self.scanned_messages = scanned_messages
        self.hours = None

    def fetch_recent_excel_attachments(self, hours=24):
        self.hours = hours
        return self.attachments, self.scanned_messages


def make_attachment(filename="orders.xlsx"):
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["订单号", "交单日期"])
    sheet.append(["PO-6006", date(2026, 10, 1)])
    stream = BytesIO()
    workbook.save(stream)
    return EmailAttachment(
        filename=filename,
        content=stream.getvalue(),
        message_subject="供应商订单",
    )


def test_scan_service_replaces_current_results_from_attachments():
    client = FakeClient([make_attachment()], scanned_messages=2)
    service = OrderScanService(client=client, aliases=ColumnAliases.default())

    result = service.scan_recent_orders(hours=24)

    assert client.hours == 24
    assert result.scanned_messages == 2
    assert result.parsed_attachments == 1
    assert [(row.order_number, row.deadline) for row in result.rows] == [("PO-6006", "2026-10-01")]
    assert result.warnings == []


def test_scan_service_keeps_attachment_warnings():
    client = FakeClient([EmailAttachment(filename="bad.xlsx", content=b"bad")], scanned_messages=1)
    service = OrderScanService(client=client, aliases=ColumnAliases.default())

    result = service.scan_recent_orders(hours=24)

    assert result.rows == []
    assert result.parsed_attachments == 1
    assert result.warnings
    assert result.warnings[0].startswith("bad.xlsx：无法读取Excel附件")
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m pytest tests/test_scan_service.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader.scan_service'`.

- [ ] **Step 3: Implement scan service**

Create `src/email_order_reader/scan_service.py`:

```python
from __future__ import annotations

from typing import Protocol

from email_order_reader.excel_parser import parse_excel_attachment
from email_order_reader.models import ColumnAliases, EmailAttachment, ScanResult


class RecentAttachmentClient(Protocol):
    def fetch_recent_excel_attachments(self, hours: int = 24) -> tuple[list[EmailAttachment], int]:
        pass


class OrderScanService:
    def __init__(self, client: RecentAttachmentClient, aliases: ColumnAliases | None = None) -> None:
        self.client = client
        self.aliases = aliases or ColumnAliases.default()

    def scan_recent_orders(self, hours: int = 24) -> ScanResult:
        attachments, scanned_messages = self.client.fetch_recent_excel_attachments(hours=hours)

        rows = []
        warnings = []
        for attachment in attachments:
            parse_result = parse_excel_attachment(
                attachment.filename,
                attachment.content,
                self.aliases,
                message_subject=attachment.message_subject,
            )
            rows.extend(parse_result.rows)
            warnings.extend(parse_result.warnings)

        return ScanResult(
            rows=rows,
            warnings=warnings,
            scanned_messages=scanned_messages,
            parsed_attachments=len(attachments),
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m pytest tests/test_scan_service.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email_order_reader/scan_service.py tests/test_scan_service.py
git commit -m "feat: combine email and Excel scanning"
```

---

### Task 7: Minimal PySide6 Window

**Files:**
- Create: `src/email_order_reader/ui/__init__.py`
- Create: `src/email_order_reader/ui/main_window.py`
- Create: `tests/test_main_window.py`

- [ ] **Step 1: Write failing UI tests**

Create `tests/test_main_window.py`:

```python
from email_order_reader.models import OrderRow, ScanResult
from email_order_reader.ui.main_window import MainWindow


def test_settings_collapse_after_required_fields_are_filled(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    window.server_input.setText("imap.example.com")
    window.port_input.setText("993")
    window.email_input.setText("buyer@example.com")
    window.auth_code_input.setText("secret")

    assert window.settings_panel.isHidden()
    assert not window.summary_panel.isHidden()
    assert "buyer@example.com" in window.summary_label.text()


def test_edit_settings_expands_inputs(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    window.server_input.setText("imap.example.com")
    window.port_input.setText("993")
    window.email_input.setText("buyer@example.com")
    window.auth_code_input.setText("secret")
    window.edit_settings_button.click()

    assert not window.settings_panel.isHidden()
    assert window.summary_panel.isHidden()


def test_hidden_alias_controls_build_session_aliases(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    assert window.advanced_panel.isHidden()

    window.advanced_toggle_button.click()
    window.order_alias_input.setText("编号, 采购单号")
    window.deadline_alias_input.setText("时间, 最晚日期")
    aliases = window.build_aliases()

    assert "编号" in aliases.order_number
    assert "采购单号" in aliases.order_number
    assert "时间" in aliases.deadline
    assert "最晚日期" in aliases.deadline


def test_table_renders_order_rows(qtbot):
    window = MainWindow()
    qtbot.addWidget(window)

    window.apply_scan_result(
        ScanResult(
            rows=[OrderRow(order_number="PO-7007", deadline="2026-11-02")],
            scanned_messages=1,
            parsed_attachments=1,
        )
    )

    assert window.table.rowCount() == 1
    assert window.table.item(0, 0).text() == "PO-7007"
    assert window.table.item(0, 1).text() == "2026-11-02"
    assert "读取 1 条订单" in window.status_label.text()
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
QT_QPA_PLATFORM=offscreen python3 -m pytest tests/test_main_window.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader.ui'`.

- [ ] **Step 3: Implement UI**

Create `src/email_order_reader/ui/__init__.py`:

```python
"""PySide6 user interface package."""
```

Create `src/email_order_reader/ui/main_window.py`:

```python
from __future__ import annotations

from PySide6.QtCore import QObject, QThread, Signal
from PySide6.QtWidgets import (
    QAbstractItemView,
    QFormLayout,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QMainWindow,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from email_order_reader.email_client import ImapEmailClient
from email_order_reader.models import ColumnAliases, ImapConfig, ScanResult
from email_order_reader.scan_service import OrderScanService


class ScanWorker(QObject):
    finished = Signal(object)
    failed = Signal(str)

    def __init__(self, config: ImapConfig, aliases: ColumnAliases) -> None:
        super().__init__()
        self.config = config
        self.aliases = aliases

    def run(self) -> None:
        try:
            client = ImapEmailClient(self.config)
            service = OrderScanService(client=client, aliases=self.aliases)
            self.finished.emit(service.scan_recent_orders(hours=24))
        except Exception as exc:
            self.failed.emit(str(exc))


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("邮件订单读取")
        self.resize(760, 520)
        self.thread: QThread | None = None
        self.worker: ScanWorker | None = None

        root = QWidget()
        self.setCentralWidget(root)
        self.root_layout = QVBoxLayout(root)

        self.settings_panel = QWidget()
        settings_layout = QFormLayout(self.settings_panel)
        self.server_input = QLineEdit()
        self.port_input = QLineEdit("993")
        self.email_input = QLineEdit()
        self.auth_code_input = QLineEdit()
        self.auth_code_input.setEchoMode(QLineEdit.Password)
        self.advanced_toggle_button = QPushButton("高级列名")
        self.advanced_panel = QWidget()
        advanced_layout = QFormLayout(self.advanced_panel)
        self.order_alias_input = QLineEdit()
        self.order_alias_input.setPlaceholderText("额外订单号列名，用逗号分隔")
        self.deadline_alias_input = QLineEdit()
        self.deadline_alias_input.setPlaceholderText("额外截至时间列名，用逗号分隔")
        advanced_layout.addRow("订单号别名", self.order_alias_input)
        advanced_layout.addRow("截至时间别名", self.deadline_alias_input)
        self.advanced_panel.hide()
        settings_layout.addRow("IMAP服务器", self.server_input)
        settings_layout.addRow("端口", self.port_input)
        settings_layout.addRow("邮箱", self.email_input)
        settings_layout.addRow("授权码", self.auth_code_input)
        settings_layout.addRow(self.advanced_toggle_button)
        settings_layout.addRow(self.advanced_panel)

        settings_button_row = QHBoxLayout()
        settings_button_row.addStretch()
        self.refresh_button = QPushButton("刷新最近24小时")
        settings_button_row.addWidget(self.refresh_button)
        settings_layout.addRow(settings_button_row)

        self.summary_panel = QWidget()
        summary_layout = QHBoxLayout(self.summary_panel)
        self.summary_label = QLabel("")
        self.summary_refresh_button = QPushButton("刷新")
        self.edit_settings_button = QPushButton("修改邮箱设置")
        summary_layout.addWidget(self.summary_label)
        summary_layout.addStretch()
        summary_layout.addWidget(self.summary_refresh_button)
        summary_layout.addWidget(self.edit_settings_button)
        self.summary_panel.hide()

        self.table = QTableWidget(0, 2)
        self.table.setHorizontalHeaderLabels(["订单号", "截至时间"])
        self.table.horizontalHeader().setSectionResizeMode(QHeaderView.Stretch)
        self.table.verticalHeader().setVisible(False)
        self.table.setAlternatingRowColors(True)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)

        self.status_label = QLabel("请填写邮箱信息后刷新。")
        self.status_label.setWordWrap(True)

        self.root_layout.addWidget(self.settings_panel)
        self.root_layout.addWidget(self.summary_panel)
        self.root_layout.addWidget(self.table)
        self.root_layout.addWidget(self.status_label)

        for input_widget in (self.server_input, self.port_input, self.email_input, self.auth_code_input):
            input_widget.textChanged.connect(self.update_settings_visibility)
        self.advanced_toggle_button.clicked.connect(self.toggle_advanced_panel)
        self.edit_settings_button.clicked.connect(self.expand_settings)
        self.refresh_button.clicked.connect(self.start_scan)
        self.summary_refresh_button.clicked.connect(self.start_scan)

    def required_fields_present(self) -> bool:
        return all(
            field.text().strip()
            for field in (self.server_input, self.port_input, self.email_input, self.auth_code_input)
        )

    def update_settings_visibility(self) -> None:
        if self.required_fields_present():
            self.collapse_settings()

    def collapse_settings(self) -> None:
        self.summary_label.setText(f"{self.email_input.text().strip()} / {self.server_input.text().strip()}")
        self.settings_panel.hide()
        self.summary_panel.show()

    def expand_settings(self) -> None:
        self.summary_panel.hide()
        self.settings_panel.show()

    def toggle_advanced_panel(self) -> None:
        self.advanced_panel.setHidden(not self.advanced_panel.isHidden())

    def build_aliases(self) -> ColumnAliases:
        defaults = ColumnAliases.default()
        return ColumnAliases(
            order_number=_merge_aliases(defaults.order_number, self.order_alias_input.text()),
            deadline=_merge_aliases(defaults.deadline, self.deadline_alias_input.text()),
        )

    def build_config(self) -> ImapConfig | None:
        if not self.required_fields_present():
            QMessageBox.warning(self, "缺少邮箱信息", "请填写IMAP服务器、端口、邮箱和授权码。")
            return None
        try:
            port = int(self.port_input.text().strip())
        except ValueError:
            QMessageBox.warning(self, "端口错误", "端口必须是数字。")
            return None
        return ImapConfig(
            server=self.server_input.text().strip(),
            port=port,
            email=self.email_input.text().strip(),
            auth_code=self.auth_code_input.text(),
        )

    def start_scan(self) -> None:
        config = self.build_config()
        if config is None:
            return

        self.refresh_button.setEnabled(False)
        self.summary_refresh_button.setEnabled(False)
        self.status_label.setText("正在扫描最近24小时邮件...")

        self.thread = QThread()
        self.worker = ScanWorker(config=config, aliases=self.build_aliases())
        self.worker.moveToThread(self.thread)
        self.thread.started.connect(self.worker.run)
        self.worker.finished.connect(self.apply_scan_result)
        self.worker.failed.connect(self.apply_scan_error)
        self.worker.finished.connect(self.thread.quit)
        self.worker.failed.connect(self.thread.quit)
        self.worker.finished.connect(self.worker.deleteLater)
        self.worker.failed.connect(self.worker.deleteLater)
        self.thread.finished.connect(self.thread.deleteLater)
        self.thread.finished.connect(self._scan_finished)
        self.thread.start()

    def _scan_finished(self) -> None:
        self.refresh_button.setEnabled(True)
        self.summary_refresh_button.setEnabled(True)
        self.thread = None
        self.worker = None

    def apply_scan_result(self, result: ScanResult) -> None:
        self.table.setRowCount(0)
        for row in result.rows:
            row_index = self.table.rowCount()
            self.table.insertRow(row_index)
            self.table.setItem(row_index, 0, QTableWidgetItem(row.order_number))
            self.table.setItem(row_index, 1, QTableWidgetItem(row.deadline))

        status = f"已解析 {result.parsed_attachments} 个附件，读取 {result.row_count} 条订单。"
        if result.warnings:
            status = f"{status} {'；'.join(result.warnings)}"
        self.status_label.setText(status)

    def apply_scan_error(self, message: str) -> None:
        self.status_label.setText(f"扫描失败：{message}")


def _merge_aliases(defaults: tuple[str, ...], extra_text: str) -> tuple[str, ...]:
    values = list(defaults)
    normalized_text = extra_text.replace("，", ",").replace("；", ",").replace(";", ",")
    for item in normalized_text.split(","):
        value = item.strip()
        if value and value not in values:
            values.append(value)
    return tuple(values)
```

- [ ] **Step 4: Run UI tests**

Run:

```bash
QT_QPA_PLATFORM=offscreen python3 -m pytest tests/test_main_window.py -v
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email_order_reader/ui/__init__.py src/email_order_reader/ui/main_window.py tests/test_main_window.py
git commit -m "feat: add minimal desktop order table"
```

---

### Task 8: App Entry Point and Packaging Scripts

**Files:**
- Create: `src/email_order_reader/app.py`
- Create: `scripts/build_macos.sh`
- Create: `scripts/build_windows.ps1`

- [ ] **Step 1: Write failing entry point smoke test**

Append to `tests/test_package_import.py`:

```python
def test_app_main_is_importable():
    from email_order_reader.app import main

    assert callable(main)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m pytest tests/test_package_import.py::test_app_main_is_importable -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'email_order_reader.app'`.

- [ ] **Step 3: Create entry point and build scripts**

Create `src/email_order_reader/app.py`:

```python
from __future__ import annotations

import sys

from PySide6.QtWidgets import QApplication

from email_order_reader.ui.main_window import MainWindow


def main() -> int:
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    return app.exec()


if __name__ == "__main__":
    raise SystemExit(main())
```

Create `scripts/build_macos.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

python3 -m PyInstaller \
  --name "Email Order Reader" \
  --windowed \
  --clean \
  --noconfirm \
  src/email_order_reader/app.py
```

Create `scripts/build_windows.ps1`:

```powershell
$ErrorActionPreference = "Stop"

python -m PyInstaller `
  --name "Email Order Reader" `
  --windowed `
  --clean `
  --noconfirm `
  src/email_order_reader/app.py
```

- [ ] **Step 4: Make macOS build script executable**

Run:

```bash
chmod +x scripts/build_macos.sh
```

Expected: command exits with status 0.

- [ ] **Step 5: Run import test**

Run:

```bash
QT_QPA_PLATFORM=offscreen python3 -m pytest tests/test_package_import.py -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/email_order_reader/app.py scripts/build_macos.sh scripts/build_windows.ps1 tests/test_package_import.py
git commit -m "feat: add app entry point and packaging scripts"
```

---

### Task 9: Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run all tests**

Run:

```bash
QT_QPA_PLATFORM=offscreen python3 -m pytest -v
```

Expected: PASS for all tests.

- [ ] **Step 2: Run the app import entry point without opening the event loop**

Run:

```bash
python3 -c "from email_order_reader.app import main; print(callable(main))"
```

Expected:

```text
True
```

- [ ] **Step 3: Update README with credential and privacy behavior**

Modify `README.md` so it contains:

````markdown
# Email Order Reader

Minimal desktop app for scanning recent IMAP email attachments and showing order deadlines.

## Behavior

- Scans the inbox for email from the latest 24 hours.
- Reads Excel attachments with `.xlsx`, `.xlsm`, or `.xls` extensions.
- Shows only two columns: `订单号` and `截至时间`.
- Does not save mailbox credentials.
- Does not save scan history.

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

Unsigned internal builds may show Windows SmartScreen or macOS Gatekeeper warnings.
````

- [ ] **Step 4: Run README-adjacent smoke checks**

Run:

```bash
test -x scripts/build_macos.sh
test -f scripts/build_windows.ps1
python3 -m pytest -q
```

Expected: both `test` commands exit with status 0, and pytest prints all tests passing.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: document order reader behavior"
```

---

## Final Manual Verification

After all tasks pass:

- Run `email-order-reader`.
- Confirm the window title is `邮件订单读取`.
- Confirm the default port is `993`.
- Fill `IMAP服务器`, `端口`, `邮箱`, and `授权码`.
- Confirm the settings region collapses and the compact row shows the mailbox summary.
- Click `修改邮箱设置` and confirm the fields reappear.
- With invalid credentials, click refresh and confirm the status line shows a scan failure without crashing.
- With a test mailbox containing an Excel order attachment from the latest 24 hours, click refresh and confirm the table shows only `订单号` and `截至时间`.

## Plan Self-Review

- Spec coverage: every first-version requirement maps to a task: dependencies and package scaffold in Task 1; no credential persistence in Task 7 and README in Task 9; recent 24-hour IMAP scanning in Task 5 and Task 6; Excel parsing for `.xlsx`, `.xlsm`, and `.xls` in Tasks 3 and 4; custom session aliases in Task 7; two-column table and collapsed settings in Task 7; packaging scripts in Task 8.
- Red-flag scan: this plan contains no unresolved sections or vague task descriptions.
- Type consistency: `OrderRow`, `ColumnAliases`, `EmailAttachment`, `ImapConfig`, `AttachmentParseResult`, and `ScanResult` are defined in Task 2 and used consistently by later tasks.
