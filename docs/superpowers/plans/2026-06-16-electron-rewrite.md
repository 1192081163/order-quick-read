# Electron Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full Electron + TypeScript version of Order Quick Read that reaches feature parity with the current PySide6 app before replacing it.

**Architecture:** Add the Electron app beside the Python app first. Electron main owns IMAP, Excel parsing, settings, cache, updates, and notifications; React renderer owns the two-column order UI and user interactions through a typed preload IPC bridge. Keep the Python app and tests as the parity oracle until Electron packages are verified.

**Tech Stack:** Electron, TypeScript, React, Vite, Vitest, Testing Library, imapflow, mailparser, xlsx, electron-builder, electron-updater.

---

## File Structure

- Create `package.json`: npm scripts, Electron dependencies, test dependencies, electron-builder config entry points.
- Create `tsconfig.json`: strict TypeScript settings for Electron main, preload, renderer, and tests.
- Create `vite.config.ts`: renderer build and Vitest config.
- Create `electron/shared/types.ts`: serializable contracts used by main, preload, renderer, and tests.
- Create `electron/shared/date.ts`: date parsing and ISO normalization helpers.
- Create `electron/shared/sorting.ts`: deadline sort behavior.
- Create `electron/shared/filtering.ts`: order number and sent-date filtering.
- Create `electron/main/services/settingsStore.ts`: settings load/save and Python settings import.
- Create `electron/main/services/orderCache.ts`: cache load/save and row merge behavior.
- Create `electron/main/services/excelParser.ts`: Excel attachment parsing.
- Create `electron/main/services/mailClient.ts`: Enterprise WeChat IMAP attachment fetcher.
- Create `electron/main/services/orderScanner.ts`: mailbox scan orchestration.
- Create `electron/main/services/updater.ts`: update check/download/install prompts using electron-updater.
- Create `electron/main/services/notifier.ts`: system notifications.
- Create `electron/main/ipc.ts`: IPC handler registration.
- Create `electron/main/app.ts`: Electron app startup and BrowserWindow creation.
- Create `electron/preload/index.ts`: typed API exposed through `contextBridge`.
- Create `electron/renderer/App.tsx`: top-level React app.
- Create `electron/renderer/components/SettingsPanel.tsx`: email/auth code settings.
- Create `electron/renderer/components/Toolbar.tsx`: status actions, refresh, update, edit settings.
- Create `electron/renderer/components/FilterBar.tsx`: order search and date range controls.
- Create `electron/renderer/components/OrderTable.tsx`: two-column order table.
- Create `electron/renderer/components/StatusBar.tsx`: scan/update status text.
- Create `electron/renderer/styles.css`: restrained desktop UI styling.
- Create `electron/renderer/main.tsx`: renderer entry point.
- Create `electron/renderer/index.html`: Vite HTML entry.
- Create `tests/electron/*.test.ts`: TypeScript unit and renderer tests.
- Modify `.github/workflows/build.yml`: add Electron builds once packaging parity is ready.
- Modify `README.md`: add Electron local run and packaging instructions after the first runnable Electron build exists.

## Task 1: Electron Toolchain Skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `electron/renderer/index.html`
- Create: `electron/renderer/main.tsx`
- Create: `electron/renderer/App.tsx`
- Create: `electron/renderer/styles.css`
- Create: `tests/electron/tooling.test.ts`

- [ ] **Step 1: Write the failing tooling test**

Create `tests/electron/tooling.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("Electron tooling", () => {
  it("defines the Electron development and test commands", () => {
    expect(packageJson.scripts).toMatchObject({
      "electron:dev": "npm run electron:build:main && concurrently -k \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron dist-electron/main/app.js\"",
      "electron:test": "vitest run",
      "electron:build": "vite build && npm run electron:build:main && electron-builder",
    });
  });

  it("declares the app identity used for packaging", () => {
    expect(packageJson.name).toBe("order-quick-read");
    expect(packageJson.build.productName).toBe("Order Quick Read");
    expect(packageJson.build.appId).toBe("com.orderquickread.desktop");
  });
});
```

- [ ] **Step 2: Run the tooling test to verify it fails**

Run:

```bash
npm run electron:test -- tests/electron/tooling.test.ts
```

Expected: command fails because `package.json` and the Node test toolchain do not exist yet.

- [ ] **Step 3: Create `package.json`**

Create `package.json`:

```json
{
  "name": "order-quick-read",
  "version": "0.1.0",
  "description": "Desktop app for reading IMAP email Excel order attachments.",
  "private": true,
  "type": "module",
  "main": "dist-electron/main/app.js",
  "scripts": {
    "electron:build:main": "tsc -p tsconfig.electron.json",
    "electron:dev": "npm run electron:build:main && concurrently -k \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron dist-electron/main/app.js\"",
    "electron:test": "vitest run",
    "electron:build": "vite build && npm run electron:build:main && electron-builder",
    "electron:typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "electron-log": "^5.0.0",
    "electron-updater": "^6.0.0",
    "imapflow": "^1.0.0",
    "mailparser": "^3.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.0.0",
    "@types/mailparser": "^3.0.0",
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^5.0.0",
    "concurrently": "^9.0.0",
    "cross-env": "^10.0.0",
    "electron": "^37.0.0",
    "electron-builder": "^26.0.0",
    "jsdom": "^26.0.0",
    "typescript": "^5.0.0",
    "vite": "^7.0.0",
    "wait-on": "^8.0.0",
    "vitest": "^3.0.0"
  },
  "build": {
    "productName": "Order Quick Read",
    "appId": "com.orderquickread.desktop",
    "directories": {
      "output": "dist-electron-packages"
    },
    "files": [
      "dist-renderer/**/*",
      "dist-electron/**/*",
      "assets/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis",
      "artifactName": "OrderQuickReadSetup.${ext}"
    },
    "mac": {
      "target": "dmg",
      "artifactName": "OrderQuickRead-macos-${arch}.${ext}",
      "category": "public.app-category.business"
    },
    "publish": {
      "provider": "github",
      "owner": "1192081163",
      "repo": "order-quick-read"
    }
  }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["node", "vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["electron", "tests/electron", "vite.config.ts"]
}
```

- [ ] **Step 5: Create `vite.config.ts`**

Create `vite.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "electron/renderer",
  base: "./",
  build: {
    outDir: "../../dist-renderer",
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["../../tests/electron/**/*.test.ts", "../../tests/electron/**/*.test.tsx"],
  },
});
```

- [ ] **Step 6: Create the first renderer files**

Create `electron/renderer/index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>订单快读</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/main.tsx"></script>
  </body>
</html>
```

Create `electron/renderer/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

Create `electron/renderer/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="panel">
        <h1>订单快读</h1>
        <p>Electron 版本初始化完成。</p>
      </section>
    </main>
  );
}
```

Create `electron/renderer/styles.css`:

```css
:root {
  color: #1f2937;
  background: #f6f7f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

body {
  margin: 0;
}

.app-shell {
  min-height: 100vh;
  padding: 18px;
  box-sizing: border-box;
}

.panel {
  background: #ffffff;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  padding: 16px;
}
```

- [ ] **Step 7: Install dependencies and verify the tooling test passes**

Run:

```bash
npm install
npm run electron:test -- tests/electron/tooling.test.ts
npm run electron:typecheck
```

Expected: the tooling test passes and TypeScript reports no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts electron/renderer tests/electron/tooling.test.ts
git commit -m "Add Electron TypeScript skeleton"
```

## Task 2: Shared Types, Date Parsing, Sorting, And Filtering

**Files:**
- Create: `electron/shared/types.ts`
- Create: `electron/shared/date.ts`
- Create: `electron/shared/sorting.ts`
- Create: `electron/shared/filtering.ts`
- Create: `tests/electron/shared.test.ts`

- [ ] **Step 1: Write failing shared behavior tests**

Create `tests/electron/shared.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { normalizeDeadlineDate, sentDateFromMessageDate } from "../../electron/shared/date";
import { filterOrderRows } from "../../electron/shared/filtering";
import { sortOrderRows } from "../../electron/shared/sorting";
import type { OrderRow } from "../../electron/shared/types";

const rows: OrderRow[] = [
  { orderNumber: "29988", deadline: "2026-06-20", sourceFile: "", messageSubject: "", messageDate: "2026-06-22T09:00:00.000Z" },
  { orderNumber: "29904", deadline: "2026/6/16 00:00:00", sourceFile: "", messageSubject: "", messageDate: "2026-06-16T09:00:00.000Z" },
  { orderNumber: "29912", deadline: "2026年6月16日 18:30", sourceFile: "", messageSubject: "", messageDate: "2026-06-16T10:00:00.000Z" },
  { orderNumber: "UNKNOWN", deadline: "待确认", sourceFile: "", messageSubject: "", messageDate: "" },
];

describe("shared date helpers", () => {
  it("normalizes deadline date text used by current Python app", () => {
    expect(normalizeDeadlineDate("2026/6/20 00:00:00")).toBe("2026-06-20");
    expect(normalizeDeadlineDate("2026年6月19日 18:30")).toBe("2026-06-19");
    expect(normalizeDeadlineDate("待确认")).toBeNull();
  });

  it("extracts the email sent date from an ISO message date", () => {
    expect(sentDateFromMessageDate("2026-06-16T09:00:00.000Z")).toBe("2026-06-16");
    expect(sentDateFromMessageDate("")).toBeNull();
  });
});

describe("shared order sorting and filtering", () => {
  it("sorts orders by deadline with unknown deadlines last", () => {
    expect(sortOrderRows(rows).map((row) => row.orderNumber)).toEqual(["29904", "29912", "29988", "UNKNOWN"]);
  });

  it("filters by order number and email sent date range", () => {
    expect(
      filterOrderRows(rows, {
        searchText: "299",
        startDate: "2026-06-15",
        endDate: "2026-06-21",
      }).map((row) => row.orderNumber),
    ).toEqual(["29904", "29912"]);
  });
});
```

- [ ] **Step 2: Run the shared tests to verify they fail**

Run:

```bash
npm run electron:test -- tests/electron/shared.test.ts
```

Expected: FAIL because `electron/shared/*` modules are not created.

- [ ] **Step 3: Create shared types and helpers**

Create `electron/shared/types.ts`:

```ts
export type OrderRow = {
  orderNumber: string;
  deadline: string;
  sourceFile: string;
  messageSubject: string;
  messageDate: string;
};

export type ScanResult = {
  rows: OrderRow[];
  warnings: string[];
  scannedMessages: number;
  parsedAttachments: number;
  scanMode: "full" | "incremental";
};

export type AppSettings = {
  email: string;
  authCode: string;
};

export type DateFilter = {
  searchText: string;
  startDate: string;
  endDate: string;
};

export type UpdateInfo = {
  tagName: string;
  releaseUrl: string;
  assetName: string;
  assetUrl: string;
};
```

Create `electron/shared/date.ts`:

```ts
const DATE_PATTERNS = [
  /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s*$/,
  /^\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*$/,
];

export function normalizeDeadlineDate(value: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = value.match(pattern);
    if (!match) {
      continue;
    }
    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return null;
    }
    return `${yearText}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

export function sentDateFromMessageDate(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}
```

Create `electron/shared/sorting.ts`:

```ts
import { normalizeDeadlineDate } from "./date";
import type { OrderRow } from "./types";

export function sortOrderRows(rows: OrderRow[]): OrderRow[] {
  return [...rows].sort((left, right) => {
    const leftDeadline = normalizeDeadlineDate(left.deadline);
    const rightDeadline = normalizeDeadlineDate(right.deadline);
    if (leftDeadline && rightDeadline && leftDeadline !== rightDeadline) {
      return leftDeadline.localeCompare(rightDeadline);
    }
    if (leftDeadline && !rightDeadline) {
      return -1;
    }
    if (!leftDeadline && rightDeadline) {
      return 1;
    }
    return left.orderNumber.localeCompare(right.orderNumber);
  });
}
```

Create `electron/shared/filtering.ts`:

```ts
import { sentDateFromMessageDate } from "./date";
import type { DateFilter, OrderRow } from "./types";

export function filterOrderRows(rows: OrderRow[], filter: DateFilter): OrderRow[] {
  const search = filter.searchText.trim().toLowerCase();
  return rows.filter((row) => {
    if (search && !row.orderNumber.toLowerCase().includes(search)) {
      return false;
    }
    if (!filter.startDate && !filter.endDate) {
      return true;
    }
    const sentDate = sentDateFromMessageDate(row.messageDate);
    if (!sentDate) {
      return false;
    }
    if (filter.startDate && sentDate < filter.startDate) {
      return false;
    }
    if (filter.endDate && sentDate > filter.endDate) {
      return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run shared tests and typecheck**

Run:

```bash
npm run electron:test -- tests/electron/shared.test.ts
npm run electron:typecheck
```

Expected: shared tests pass and TypeScript reports no errors.

- [ ] **Step 5: Commit**

```bash
git add electron/shared tests/electron/shared.test.ts
git commit -m "Port shared order sorting and filtering"
```

## Task 3: Settings Store And Order Cache

**Files:**
- Create: `electron/main/services/settingsStore.ts`
- Create: `electron/main/services/orderCache.ts`
- Create: `tests/electron/storage.test.ts`

- [ ] **Step 1: Write failing storage tests**

Create `tests/electron/storage.test.ts`:

```ts
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadOrderCache, mergeOrderRows, saveOrderCache } from "../../electron/main/services/orderCache";
import { loadSettings, saveSettings } from "../../electron/main/services/settingsStore";
import type { OrderRow } from "../../electron/shared/types";

describe("Electron settings store", () => {
  it("imports existing Python settings when Electron settings are missing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oqr-settings-"));
    const oldSettingsPath = join(dir, "old-settings.json");
    const newSettingsPath = join(dir, "settings.json");
    await writeFile(oldSettingsPath, JSON.stringify({ email: "saved@example.com", auth_code: "secret" }), "utf8");

    const settings = await loadSettings({ settingsPath: newSettingsPath, legacySettingsPath: oldSettingsPath });

    expect(settings).toEqual({ email: "saved@example.com", authCode: "secret" });
    expect(JSON.parse(await readFile(newSettingsPath, "utf8"))).toEqual({ email: "saved@example.com", authCode: "secret" });
  });

  it("saves Electron settings in the new shape", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oqr-settings-"));
    const settingsPath = join(dir, "settings.json");

    await saveSettings({ settingsPath }, { email: "buyer@example.com", authCode: "code" });

    expect(JSON.parse(await readFile(settingsPath, "utf8"))).toEqual({ email: "buyer@example.com", authCode: "code" });
  });
});

describe("Electron order cache", () => {
  it("merges updated rows by order number", () => {
    const existing: OrderRow[] = [
      { orderNumber: "PO-1", deadline: "2026-06-20", sourceFile: "old.xlsx", messageSubject: "", messageDate: "" },
    ];
    const incoming: OrderRow[] = [
      { orderNumber: "PO-1", deadline: "2026-06-21", sourceFile: "new.xlsx", messageSubject: "", messageDate: "" },
      { orderNumber: "PO-2", deadline: "2026-06-19", sourceFile: "new.xlsx", messageSubject: "", messageDate: "" },
    ];

    expect(mergeOrderRows(existing, incoming)).toEqual([incoming[0], incoming[1]]);
  });

  it("loads and saves cache metadata", async () => {
    const dir = await mkdtemp(join(tmpdir(), "oqr-cache-"));
    const cachePath = join(dir, "order_cache.json");

    await saveOrderCache(cachePath, {
      email: "buyer@example.com",
      uidvalidity: "123",
      lastUid: 9,
      rows: [],
      warnings: ["one warning"],
      scannedMessages: 2,
      parsedAttachments: 1,
    });

    expect(await loadOrderCache(cachePath)).toMatchObject({
      email: "buyer@example.com",
      uidvalidity: "123",
      lastUid: 9,
      warnings: ["one warning"],
    });
  });
});
```

- [ ] **Step 2: Run storage tests to verify they fail**

Run:

```bash
npm run electron:test -- tests/electron/storage.test.ts
```

Expected: FAIL because storage service modules do not exist.

- [ ] **Step 3: Create `settingsStore.ts`**

Create `electron/main/services/settingsStore.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { AppSettings } from "../../shared/types";

export type SettingsPaths = {
  settingsPath: string;
  legacySettingsPath?: string;
};

export async function loadSettings(paths: SettingsPaths): Promise<AppSettings> {
  const existing = await readJson(paths.settingsPath);
  if (existing) {
    return {
      email: String(existing.email ?? "").trim(),
      authCode: String(existing.authCode ?? ""),
    };
  }

  if (paths.legacySettingsPath) {
    const legacy = await readJson(paths.legacySettingsPath);
    if (legacy) {
      const imported = {
        email: String(legacy.email ?? "").trim(),
        authCode: String(legacy.auth_code ?? legacy.authCode ?? ""),
      };
      if (imported.email || imported.authCode) {
        await saveSettings(paths, imported);
        return imported;
      }
    }
  }

  return { email: "", authCode: "" };
}

export async function saveSettings(paths: SettingsPaths, settings: AppSettings): Promise<void> {
  await mkdir(dirname(paths.settingsPath), { recursive: true });
  await writeFile(paths.settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

async function readJson(path: string): Promise<Record<string, unknown> | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Create `orderCache.ts`**

Create `electron/main/services/orderCache.ts`:

```ts
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { OrderRow } from "../../shared/types";

export type OrderCache = {
  email: string;
  uidvalidity: string;
  lastUid: number;
  rows: OrderRow[];
  warnings: string[];
  scannedMessages: number;
  parsedAttachments: number;
};

export function emptyOrderCache(): OrderCache {
  return {
    email: "",
    uidvalidity: "",
    lastUid: 0,
    rows: [],
    warnings: [],
    scannedMessages: 0,
    parsedAttachments: 0,
  };
}

export async function loadOrderCache(path: string): Promise<OrderCache> {
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
    return {
      email: String(raw.email ?? ""),
      uidvalidity: String(raw.uidvalidity ?? ""),
      lastUid: Number(raw.lastUid ?? raw.last_uid ?? 0),
      rows: Array.isArray(raw.rows) ? raw.rows.map(loadOrderRow).filter(Boolean) as OrderRow[] : [],
      warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String) : [],
      scannedMessages: Number(raw.scannedMessages ?? raw.scanned_messages ?? 0),
      parsedAttachments: Number(raw.parsedAttachments ?? raw.parsed_attachments ?? 0),
    };
  } catch {
    return emptyOrderCache();
  }
}

export async function saveOrderCache(path: string, cache: OrderCache): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(cache, null, 2), "utf8");
}

export function mergeOrderRows(existingRows: OrderRow[], newRows: OrderRow[]): OrderRow[] {
  const byOrderNumber = new Map<string, OrderRow>();
  const orderNumbers: string[] = [];
  for (const row of [...existingRows, ...newRows]) {
    if (!byOrderNumber.has(row.orderNumber)) {
      orderNumbers.push(row.orderNumber);
    }
    byOrderNumber.set(row.orderNumber, row);
  }
  return orderNumbers.map((orderNumber) => byOrderNumber.get(orderNumber) as OrderRow);
}

function loadOrderRow(raw: unknown): OrderRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Record<string, unknown>;
  const orderNumber = String(value.orderNumber ?? value.order_number ?? "").trim();
  const deadline = String(value.deadline ?? "").trim();
  if (!orderNumber || !deadline) {
    return null;
  }
  return {
    orderNumber,
    deadline,
    sourceFile: String(value.sourceFile ?? value.source_file ?? ""),
    messageSubject: String(value.messageSubject ?? value.message_subject ?? ""),
    messageDate: String(value.messageDate ?? value.message_date ?? ""),
  };
}
```

- [ ] **Step 5: Run storage tests**

Run:

```bash
npm run electron:test -- tests/electron/storage.test.ts
npm run electron:typecheck
```

Expected: storage tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```bash
git add electron/main/services/settingsStore.ts electron/main/services/orderCache.ts tests/electron/storage.test.ts
git commit -m "Port settings and cache storage"
```

## Task 4: Excel Parser Parity

**Files:**
- Create: `electron/main/services/excelParser.ts`
- Create: `tests/electron/excelParser.test.ts`

- [ ] **Step 1: Write failing Excel parser tests**

Create `tests/electron/excelParser.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { parseExcelAttachment } from "../../electron/main/services/excelParser";

function workbookBuffer(rows: unknown[][], sheetName = "Orders"): Buffer {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("Excel parser", () => {
  it("parses tabular Chinese order headers", () => {
    const result = parseExcelAttachment("orders.xlsx", workbookBuffer([
      ["订单号", "交单日期", "备注"],
      ["PO-1001", new Date(Date.UTC(2026, 5, 20)), "加急"],
    ]));

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([["PO-1001", "2026-06-20"]]);
  });

  it("normalizes text deadlines with time suffixes", () => {
    const result = parseExcelAttachment("orders.xlsx", workbookBuffer([
      ["订单号", "交单日期"],
      ["PO-6100", "2026/6/20 00:00:00"],
      ["PO-6101", "2026年6月19日 18:30"],
    ]));

    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-6100", "2026-06-20"],
      ["PO-6101", "2026-06-19"],
    ]);
  });

  it("parses Ausmet label-based templates", () => {
    const result = parseExcelAttachment("job.xlsx", workbookBuffer([
      ["Ausmet Job #", null, 29912],
      ["Builder:", null, "Coastal Design & Construction Pty Ltd"],
      [],
      [],
      ["Delivery Date:", null, new Date(Date.UTC(2026, 4, 26))],
      ["PO No:", null, "4507277735"],
    ]));

    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([["29912", "2026-05-26"]]);
  });
});
```

- [ ] **Step 2: Run Excel parser tests to verify they fail**

Run:

```bash
npm run electron:test -- tests/electron/excelParser.test.ts
```

Expected: FAIL because `excelParser.ts` does not exist.

- [ ] **Step 3: Create `excelParser.ts`**

Create `electron/main/services/excelParser.ts`:

```ts
import * as XLSX from "xlsx";

import { normalizeDeadlineDate } from "../../shared/date";
import type { OrderRow } from "../../shared/types";

export type AttachmentParseResult = {
  filename: string;
  rows: OrderRow[];
  warnings: string[];
};

const ORDER_HEADERS = new Set(["订单号", "订单编号", "客户订单号", "ordernumber", "order no", "po no", "pono", "编号"]);
const DEADLINE_HEADERS = new Set(["交单日期", "截止时间", "截至时间", "交货日期", "deliverydate", "duedate", "due date", "时间"]);

export function parseExcelAttachment(
  filename: string,
  content: Buffer,
  messageSubject = "",
  messageDate = "",
): AttachmentParseResult {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(content, { type: "buffer", cellDates: true });
  } catch (error) {
    return { filename, rows: [], warnings: [`${filename}：无法读取Excel附件：${String(error)}`] };
  }

  const rows: OrderRow[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
    rows.push(...parseTabularRows(filename, matrix, messageSubject, messageDate));
    rows.push(...parseLabelRows(filename, matrix, messageSubject, messageDate));
  }

  if (!rows.length) {
    return { filename, rows: [], warnings: [`${filename}：未识别订单号列或截至时间列`] };
  }
  return { filename, rows, warnings: [] };
}

function parseTabularRows(filename: string, matrix: unknown[][], messageSubject: string, messageDate: string): OrderRow[] {
  const header = findHeader(matrix);
  if (!header) {
    return [];
  }
  const rows: OrderRow[] = [];
  for (const row of matrix.slice(header.rowIndex + 1)) {
    const orderNumber = cellText(row[header.orderColumn]).trim();
    const deadline = normalizeCellDate(row[header.deadlineColumn]);
    if (!orderNumber || !deadline || looksLikeHeader(orderNumber)) {
      continue;
    }
    rows.push({ orderNumber, deadline, sourceFile: filename, messageSubject, messageDate });
  }
  return rows;
}

function parseLabelRows(filename: string, matrix: unknown[][], messageSubject: string, messageDate: string): OrderRow[] {
  const flatRows = matrix.map((row) => row.map(cellText));
  const orderNumber = findLabelValue(flatRows, /(?:ausmet|aumset)\s*job\s*#?/i) ?? findInlineJobNumber(flatRows);
  const deadlineRaw = findLabelValue(flatRows, /delivery\s*date|交货日期|交单日期/i);
  const deadline = deadlineRaw ? normalizeDeadlineDate(deadlineRaw) : null;
  if (!orderNumber || !deadline) {
    return [];
  }
  return [{ orderNumber, deadline, sourceFile: filename, messageSubject, messageDate }];
}

function findHeader(matrix: unknown[][]): { rowIndex: number; orderColumn: number; deadlineColumn: number } | null {
  for (let rowIndex = 0; rowIndex < Math.min(matrix.length, 20); rowIndex += 1) {
    const normalized = matrix[rowIndex].map((cell) => normalizeHeader(cellText(cell)));
    const orderColumn = normalized.findIndex((value) => ORDER_HEADERS.has(value));
    const deadlineColumn = normalized.findIndex((value) => DEADLINE_HEADERS.has(value));
    if (orderColumn >= 0 && deadlineColumn >= 0) {
      return { rowIndex, orderColumn, deadlineColumn };
    }
  }
  return null;
}

function findLabelValue(rows: string[][], labelPattern: RegExp): string | null {
  for (const row of rows) {
    for (let index = 0; index < row.length; index += 1) {
      if (!labelPattern.test(row[index])) {
        continue;
      }
      const sameCellMatch = row[index].match(/#\s*(\d{4,})/);
      if (sameCellMatch) {
        return sameCellMatch[1];
      }
      for (const candidate of row.slice(index + 1)) {
        if (candidate.trim()) {
          return candidate.trim();
        }
      }
    }
  }
  return null;
}

function findInlineJobNumber(rows: string[][]): string | null {
  for (const row of rows) {
    const text = row.join(" ");
    const match = text.match(/\bJOB\s*#\s*(\d{4,})\b/i);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function normalizeCellDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return normalizeDeadlineDate(cellText(value));
}

function cellText(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function normalizeHeader(value: string): string {
  return value.replace(/\s+/g, "").replace(/[：:]/g, "").toLowerCase();
}

function looksLikeHeader(value: string): boolean {
  return ORDER_HEADERS.has(normalizeHeader(value));
}
```

- [ ] **Step 4: Run Excel parser tests**

Run:

```bash
npm run electron:test -- tests/electron/excelParser.test.ts
npm run electron:typecheck
```

Expected: Excel parser tests pass and TypeScript reports no errors.

- [ ] **Step 5: Add more parity fixtures from Python tests**

Extend `tests/electron/excelParser.test.ts` with cases from `tests/test_excel_parser.py`:

```ts
it("skips invalid date-shaped text and keeps valid rows", () => {
  const result = parseExcelAttachment("orders.xlsx", workbookBuffer([
    ["订单号", "交单日期"],
    ["PO-BAD", "2026/02/30"],
    ["PO-6006", "2026/03/01"],
  ]));

  expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([["PO-6006", "2026-03-01"]]);
});
```

Run:

```bash
npm run electron:test -- tests/electron/excelParser.test.ts
```

Expected: Excel parser tests pass.

- [ ] **Step 6: Commit**

```bash
git add electron/main/services/excelParser.ts tests/electron/excelParser.test.ts
git commit -m "Port Excel order parser"
```

## Task 5: Mail Client And Scan Service

**Files:**
- Create: `electron/main/services/mailClient.ts`
- Create: `electron/main/services/orderScanner.ts`
- Create: `tests/electron/orderScanner.test.ts`

- [ ] **Step 1: Write failing scanner tests with mocked attachments**

Create `tests/electron/orderScanner.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import { scanOrders } from "../../electron/main/services/orderScanner";
import type { EmailAttachment } from "../../electron/main/services/mailClient";

describe("Electron order scanner", () => {
  it("parses attachments and returns scan metadata", async () => {
    const attachment: EmailAttachment = {
      filename: "orders.xlsx",
      content: Buffer.from("fake"),
      messageSubject: "orders",
      messageDate: "2026-06-16T09:00:00.000Z",
    };
    const client = {
      fetchExcelAttachmentBatch: vi.fn(async () => ({
        attachments: [attachment],
        scannedMessages: 1,
        latestUid: 7,
        uidvalidity: "abc",
      })),
    };
    const parseAttachment = vi.fn(() => ({
      filename: "orders.xlsx",
      rows: [{ orderNumber: "PO-1", deadline: "2026-06-20", sourceFile: "orders.xlsx", messageSubject: "orders", messageDate: "2026-06-16T09:00:00.000Z" }],
      warnings: [],
    }));

    const result = await scanOrders({ client, parseAttachment, fullScan: true });

    expect(client.fetchExcelAttachmentBatch).toHaveBeenCalledWith({ sinceUid: undefined });
    expect(result.rows.map((row) => row.orderNumber)).toEqual(["PO-1"]);
    expect(result.scannedMessages).toBe(1);
    expect(result.parsedAttachments).toBe(1);
    expect(result.scanMode).toBe("full");
  });
});
```

- [ ] **Step 2: Run scanner tests to verify they fail**

Run:

```bash
npm run electron:test -- tests/electron/orderScanner.test.ts
```

Expected: FAIL because scanner modules do not exist.

- [ ] **Step 3: Create `mailClient.ts` interfaces and IMAP implementation**

Create `electron/main/services/mailClient.ts`:

```ts
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export type ImapConfig = {
  host: string;
  port: number;
  email: string;
  authCode: string;
};

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  messageSubject: string;
  messageDate: string;
};

export type AttachmentBatch = {
  attachments: EmailAttachment[];
  scannedMessages: number;
  latestUid: number;
  uidvalidity: string;
};

export type AttachmentClient = {
  fetchExcelAttachmentBatch(options: { sinceUid?: number }): Promise<AttachmentBatch>;
};

export class ImapAttachmentClient implements AttachmentClient {
  constructor(private readonly config: ImapConfig) {}

  async fetchExcelAttachmentBatch(options: { sinceUid?: number }): Promise<AttachmentBatch> {
    const client = new ImapFlow({
      host: this.config.host,
      port: this.config.port,
      secure: true,
      auth: {
        user: this.config.email,
        pass: this.config.authCode,
      },
    });
    const attachments: EmailAttachment[] = [];
    let scannedMessages = 0;
    let latestUid = options.sinceUid ?? 0;
    let uidvalidity = "";

    await client.connect();
    try {
      const lock = await client.getMailboxLock("INBOX");
      try {
        uidvalidity = String(client.mailbox?.uidValidity ?? "");
        const searchQuery = options.sinceUid ? { uid: `${options.sinceUid + 1}:*` } : {};
        for await (const message of client.fetch(searchQuery, { uid: true, envelope: true, source: true })) {
          scannedMessages += 1;
          latestUid = Math.max(latestUid, Number(message.uid ?? 0));
          const parsed = await simpleParser(message.source);
          for (const attachment of parsed.attachments) {
            const filename = attachment.filename ?? "";
            if (!/\.(xlsx|xlsm|xls)$/i.test(filename)) {
              continue;
            }
            attachments.push({
              filename,
              content: attachment.content,
              messageSubject: parsed.subject ?? "",
              messageDate: parsed.date ? parsed.date.toISOString() : "",
            });
          }
        }
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => undefined);
    }

    return { attachments, scannedMessages, latestUid, uidvalidity };
  }
}
```

- [ ] **Step 4: Create `orderScanner.ts`**

Create `electron/main/services/orderScanner.ts`:

```ts
import { parseExcelAttachment, type AttachmentParseResult } from "./excelParser";
import type { AttachmentClient, EmailAttachment } from "./mailClient";
import type { ScanResult } from "../../shared/types";

export type ScanOrdersOptions = {
  client: AttachmentClient;
  fullScan: boolean;
  sinceUid?: number;
  parseAttachment?: (filename: string, content: Buffer, messageSubject: string, messageDate: string) => AttachmentParseResult;
};

export async function scanOrders(options: ScanOrdersOptions): Promise<ScanResult> {
  const batch = await options.client.fetchExcelAttachmentBatch({
    sinceUid: options.fullScan ? undefined : options.sinceUid,
  });
  const rows = [];
  const warnings = [];
  const parser = options.parseAttachment ?? parseExcelAttachment;

  for (const attachment of batch.attachments) {
    const parsed = parseOneAttachment(parser, attachment);
    rows.push(...parsed.rows);
    warnings.push(...parsed.warnings);
  }

  return {
    rows,
    warnings,
    scannedMessages: batch.scannedMessages,
    parsedAttachments: batch.attachments.length,
    scanMode: options.fullScan ? "full" : "incremental",
  };
}

function parseOneAttachment(
  parser: (filename: string, content: Buffer, messageSubject: string, messageDate: string) => AttachmentParseResult,
  attachment: EmailAttachment,
): AttachmentParseResult {
  return parser(attachment.filename, attachment.content, attachment.messageSubject, attachment.messageDate);
}
```

- [ ] **Step 5: Run scanner tests**

Run:

```bash
npm run electron:test -- tests/electron/orderScanner.test.ts
npm run electron:typecheck
```

Expected: scanner tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```bash
git add electron/main/services/mailClient.ts electron/main/services/orderScanner.ts tests/electron/orderScanner.test.ts
git commit -m "Port IMAP scan service"
```

## Task 6: Electron Main Process, Preload API, And IPC

**Files:**
- Create: `electron/main/app.ts`
- Create: `electron/main/ipc.ts`
- Create: `electron/preload/index.ts`
- Create: `tests/electron/ipcContract.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing IPC contract test**

Create `tests/electron/ipcContract.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { IPC_CHANNELS } from "../../electron/shared/types";

describe("IPC contract", () => {
  it("defines stable channels for renderer calls", () => {
    expect(IPC_CHANNELS).toEqual({
      loadSettings: "settings:load",
      saveSettings: "settings:save",
      scanOrders: "orders:scan",
      checkUpdates: "updates:check",
      downloadUpdate: "updates:download",
      installUpdate: "updates:install",
    });
  });
});
```

- [ ] **Step 2: Run IPC contract test to verify it fails**

Run:

```bash
npm run electron:test -- tests/electron/ipcContract.test.ts
```

Expected: FAIL because `IPC_CHANNELS` is not exported.

- [ ] **Step 3: Extend shared types with IPC channels**

Modify `electron/shared/types.ts` by appending:

```ts
export const IPC_CHANNELS = {
  loadSettings: "settings:load",
  saveSettings: "settings:save",
  scanOrders: "orders:scan",
  checkUpdates: "updates:check",
  downloadUpdate: "updates:download",
  installUpdate: "updates:install",
} as const;

export type RendererApi = {
  loadSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<void>;
  scanOrders(options: { fullScan: boolean }): Promise<ScanResult>;
  checkUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(update: UpdateInfo): Promise<string>;
  installUpdate(path: string): Promise<void>;
};
```

- [ ] **Step 4: Create IPC registration and preload**

Create `electron/main/ipc.ts`:

```ts
import { app, ipcMain } from "electron";
import { join } from "node:path";

import { IPC_CHANNELS, type AppSettings } from "../shared/types";
import { loadSettings, saveSettings } from "./services/settingsStore";

function appDataPath(filename: string): string {
  return join(app.getPath("userData"), filename);
}

function legacySettingsPath(): string {
  if (process.platform === "win32") {
    return join(process.env.APPDATA ?? app.getPath("userData"), "EmailOrderReader", "settings.json");
  }
  return join(app.getPath("home"), ".email-order-reader", "settings.json");
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.loadSettings, async () => {
    return loadSettings({ settingsPath: appDataPath("settings.json"), legacySettingsPath: legacySettingsPath() });
  });

  ipcMain.handle(IPC_CHANNELS.saveSettings, async (_event, settings: AppSettings) => {
    await saveSettings({ settingsPath: appDataPath("settings.json") }, settings);
  });
}
```

Create `electron/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from "electron";

import { IPC_CHANNELS, type AppSettings, type RendererApi, type UpdateInfo } from "../shared/types";

const api: RendererApi = {
  loadSettings: () => ipcRenderer.invoke(IPC_CHANNELS.loadSettings),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC_CHANNELS.saveSettings, settings),
  scanOrders: (options: { fullScan: boolean }) => ipcRenderer.invoke(IPC_CHANNELS.scanOrders, options),
  checkUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.checkUpdates),
  downloadUpdate: (update: UpdateInfo) => ipcRenderer.invoke(IPC_CHANNELS.downloadUpdate, update),
  installUpdate: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.installUpdate, path),
};

contextBridge.exposeInMainWorld("orderQuickRead", api);
```

Create `electron/main/app.ts`:

```ts
import { app, BrowserWindow } from "electron";
import { join } from "node:path";
import { registerIpcHandlers } from "./ipc";

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 760,
    height: 520,
    title: "订单快读",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(join(__dirname, "../../dist-renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
```

- [ ] **Step 5: Add a main/preload build script**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "electron:build:main": "tsc -p tsconfig.electron.json",
    "electron:dev": "npm run electron:build:main && concurrently -k \"vite --host 127.0.0.1\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron dist-electron/main/app.js\"",
    "electron:test": "vitest run",
    "electron:build": "vite build && npm run electron:build:main && electron-builder",
    "electron:typecheck": "tsc --noEmit"
  }
}
```

Create `tsconfig.electron.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "dist-electron",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  },
  "include": ["electron/main/**/*.ts", "electron/preload/**/*.ts", "electron/shared/**/*.ts"]
}
```

- [ ] **Step 6: Run IPC tests and typecheck**

Run:

```bash
npm run electron:test -- tests/electron/ipcContract.test.ts
npm run electron:typecheck
```

Expected: IPC contract test passes and TypeScript reports no errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.electron.json electron/main electron/preload electron/shared/types.ts tests/electron/ipcContract.test.ts
git commit -m "Add Electron main and preload IPC"
```

## Task 7: React Renderer Feature Parity

**Files:**
- Create: `electron/renderer/global.d.ts`
- Create: `electron/renderer/components/SettingsPanel.tsx`
- Create: `electron/renderer/components/Toolbar.tsx`
- Create: `electron/renderer/components/FilterBar.tsx`
- Create: `electron/renderer/components/OrderTable.tsx`
- Create: `electron/renderer/components/StatusBar.tsx`
- Modify: `electron/renderer/App.tsx`
- Modify: `electron/renderer/styles.css`
- Create: `tests/electron/renderer.test.tsx`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/electron/renderer.test.tsx`:

```tsx
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../../electron/renderer/App";
import type { RendererApi } from "../../electron/shared/types";

const api: RendererApi = {
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  scanOrders: vi.fn(),
  checkUpdates: vi.fn(),
  downloadUpdate: vi.fn(),
  installUpdate: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  window.orderQuickRead = api;
});

describe("Electron renderer", () => {
  it("collapses settings after saved credentials load", async () => {
    vi.mocked(api.loadSettings).mockResolvedValue({ email: "saved@example.com", authCode: "secret" });
    vi.mocked(api.scanOrders).mockResolvedValue({ rows: [], warnings: [], scannedMessages: 0, parsedAttachments: 0, scanMode: "incremental" });

    render(<App />);

    expect(await screen.findByText("saved@example.com")).toBeInTheDocument();
    expect(screen.queryByLabelText("邮箱")).not.toBeInTheDocument();
  });

  it("filters rendered rows by email sent date range", async () => {
    vi.mocked(api.loadSettings).mockResolvedValue({ email: "saved@example.com", authCode: "secret" });
    vi.mocked(api.scanOrders).mockResolvedValue({
      rows: [
        { orderNumber: "SENT-THIS-WEEK", deadline: "2026-07-10", sourceFile: "", messageSubject: "", messageDate: "2026-06-16T09:00:00.000Z" },
        { orderNumber: "SENT-NEXT-WEEK", deadline: "2026-06-16", sourceFile: "", messageSubject: "", messageDate: "2026-06-22T09:00:00.000Z" },
      ],
      warnings: [],
      scannedMessages: 2,
      parsedAttachments: 2,
      scanMode: "full",
    });

    render(<App />);
    fireEvent.click(await screen.findByText("扫描全部邮件"));
    await screen.findByText("SENT-THIS-WEEK");

    fireEvent.change(screen.getByLabelText("开始日期"), { target: { value: "2026-06-15" } });
    fireEvent.change(screen.getByLabelText("结束日期"), { target: { value: "2026-06-21" } });

    expect(screen.getByText("SENT-THIS-WEEK")).toBeInTheDocument();
    expect(screen.queryByText("SENT-NEXT-WEEK")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run renderer tests to verify they fail**

Run:

```bash
npm run electron:test -- tests/electron/renderer.test.tsx
```

Expected: FAIL because renderer API typing and feature UI are missing.

- [ ] **Step 3: Create global renderer API type**

Create `electron/renderer/global.d.ts`:

```ts
import type { RendererApi } from "../shared/types";

declare global {
  interface Window {
    orderQuickRead: RendererApi;
  }
}
```

- [ ] **Step 4: Create renderer components**

Create `electron/renderer/components/SettingsPanel.tsx`:

```tsx
import type { AppSettings } from "../../shared/types";

type Props = {
  settings: AppSettings;
  onChange(settings: AppSettings): void;
  onSave(): void;
  onScanAll(): void;
};

export function SettingsPanel({ settings, onChange, onSave, onScanAll }: Props) {
  return (
    <section className="panel settings-panel">
      <label>
        邮箱
        <input value={settings.email} onChange={(event) => onChange({ ...settings, email: event.target.value })} />
      </label>
      <label>
        授权码
        <input type="password" value={settings.authCode} onChange={(event) => onChange({ ...settings, authCode: event.target.value })} />
      </label>
      <div className="button-row">
        <button type="button" onClick={onSave}>保存并返回</button>
        <button type="button" className="primary" onClick={onScanAll}>扫描全部邮件</button>
      </div>
    </section>
  );
}
```

Create `electron/renderer/components/Toolbar.tsx`:

```tsx
type Props = {
  email: string;
  onRefresh(): void;
  onCheckUpdate(): void;
  onEditSettings(): void;
};

export function Toolbar({ email, onRefresh, onCheckUpdate, onEditSettings }: Props) {
  return (
    <section className="panel toolbar">
      <strong>{email}</strong>
      <div className="toolbar-actions">
        <button type="button" className="primary" onClick={onRefresh}>刷新</button>
        <button type="button" onClick={onCheckUpdate}>检查更新</button>
        <button type="button" onClick={onEditSettings}>修改邮箱设置</button>
      </div>
    </section>
  );
}
```

Create `electron/renderer/components/FilterBar.tsx`:

```tsx
import type { DateFilter } from "../../shared/types";

type Props = {
  filter: DateFilter;
  onChange(filter: DateFilter): void;
};

export function FilterBar({ filter, onChange }: Props) {
  return (
    <section className="panel filter-bar">
      <label>
        订单号
        <input value={filter.searchText} placeholder="搜索订单号" onChange={(event) => onChange({ ...filter, searchText: event.target.value })} />
      </label>
      <label>
        开始日期
        <input type="date" value={filter.startDate} onChange={(event) => onChange({ ...filter, startDate: event.target.value })} />
      </label>
      <label>
        结束日期
        <input type="date" value={filter.endDate} onChange={(event) => onChange({ ...filter, endDate: event.target.value })} />
      </label>
      <button type="button" onClick={() => onChange({ searchText: filter.searchText, startDate: "", endDate: "" })}>清空日期</button>
    </section>
  );
}
```

Create `electron/renderer/components/OrderTable.tsx`:

```tsx
import type { OrderRow } from "../../shared/types";

type Props = {
  rows: OrderRow[];
};

export function OrderTable({ rows }: Props) {
  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>订单号</th>
          <th>截至时间</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.orderNumber}>
            <td>{row.orderNumber}</td>
            <td>{row.deadline}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

Create `electron/renderer/components/StatusBar.tsx`:

```tsx
type Props = {
  status: string;
};

export function StatusBar({ status }: Props) {
  return <section className="panel status-bar">{status}</section>;
}
```

- [ ] **Step 5: Replace `App.tsx` with feature UI**

Modify `electron/renderer/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";

import { filterOrderRows } from "../shared/filtering";
import { sortOrderRows } from "../shared/sorting";
import type { AppSettings, DateFilter, OrderRow } from "../shared/types";
import { FilterBar } from "./components/FilterBar";
import { OrderTable } from "./components/OrderTable";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatusBar } from "./components/StatusBar";
import { Toolbar } from "./components/Toolbar";

const EMPTY_SETTINGS: AppSettings = { email: "", authCode: "" };
const EMPTY_FILTER: DateFilter = { searchText: "", startDate: "", endDate: "" };

export function App() {
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS);
  const [editingSettings, setEditingSettings] = useState(true);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<DateFilter>(EMPTY_FILTER);
  const [status, setStatus] = useState("请填写邮箱信息后刷新。");

  useEffect(() => {
    void window.orderQuickRead.loadSettings().then((loadedSettings) => {
      setSettings(loadedSettings);
      if (loadedSettings.email && loadedSettings.authCode) {
        setEditingSettings(false);
        setStatus("已加载保存的邮箱，自动刷新中。");
      }
    });
  }, []);

  const displayRows = useMemo(() => filterOrderRows(sortOrderRows(rows), filter), [rows, filter]);

  async function saveAndCollapse() {
    if (!settings.email.trim() || !settings.authCode) {
      setStatus("请填写邮箱和授权码。");
      return;
    }
    await window.orderQuickRead.saveSettings(settings);
    setEditingSettings(false);
    setStatus("已保存邮箱设置。");
  }

  async function scan(fullScan: boolean) {
    await saveAndCollapse();
    setStatus(fullScan ? "正在扫描全部邮件..." : "正在刷新新邮件...");
    const result = await window.orderQuickRead.scanOrders({ fullScan });
    setRows(result.rows);
    setStatus(`扫描到 ${result.scannedMessages} 封邮件，找到 ${result.parsedAttachments} 个 Excel 附件，读取 ${result.rows.length} 条订单。`);
  }

  async function checkUpdate() {
    setStatus("正在检查更新...");
    const update = await window.orderQuickRead.checkUpdates();
    setStatus(update ? `发现新版本 ${update.tagName}` : "当前已是最新版本。");
  }

  return (
    <main className="app-shell">
      {editingSettings ? (
        <SettingsPanel settings={settings} onChange={setSettings} onSave={saveAndCollapse} onScanAll={() => void scan(true)} />
      ) : (
        <Toolbar email={settings.email} onRefresh={() => void scan(false)} onCheckUpdate={() => void checkUpdate()} onEditSettings={() => setEditingSettings(true)} />
      )}
      <FilterBar filter={filter} onChange={setFilter} />
      <OrderTable rows={displayRows} />
      <StatusBar status={status} />
    </main>
  );
}
```

- [ ] **Step 6: Replace `styles.css` with usable desktop styling**

Modify `electron/renderer/styles.css`:

```css
:root {
  color: #1f2937;
  background: #f6f7f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
}

body {
  margin: 0;
}

button,
input {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  background: #ffffff;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  padding: 14px;
}

.settings-panel,
.filter-bar,
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

label {
  display: flex;
  align-items: center;
  gap: 8px;
}

input {
  border: 1px solid #cfd6e0;
  border-radius: 6px;
  padding: 7px 9px;
  min-height: 22px;
}

button {
  border: 1px solid #cfd6e0;
  border-radius: 6px;
  padding: 7px 13px;
  background: #ffffff;
  color: #1f2937;
  cursor: pointer;
}

button.primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.button-row,
.toolbar-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
  border: 1px solid #d8dde6;
  border-radius: 8px;
  overflow: hidden;
}

.orders-table th,
.orders-table td {
  text-align: left;
  padding: 9px 10px;
  border-bottom: 1px solid #edf0f4;
}

.orders-table th {
  background: #eef2f7;
  color: #374151;
  font-weight: 600;
}

.status-bar {
  color: #4b5563;
}
```

- [ ] **Step 7: Run renderer tests**

Run:

```bash
npm run electron:test -- tests/electron/renderer.test.tsx
npm run electron:typecheck
```

Expected: renderer tests pass and TypeScript reports no errors.

- [ ] **Step 8: Commit**

```bash
git add electron/renderer tests/electron/renderer.test.tsx
git commit -m "Build Electron renderer parity UI"
```

## Task 8: Updates, Notifications, And Installer Handoff

**Files:**
- Create: `electron/main/services/updater.ts`
- Create: `electron/main/services/notifier.ts`
- Modify: `electron/main/ipc.ts`
- Create: `tests/electron/updater.test.ts`

- [ ] **Step 1: Write failing updater selection tests**

Create `tests/electron/updater.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { selectReleaseAsset } from "../../electron/main/services/updater";

describe("Electron updater", () => {
  it("selects Windows installer asset", () => {
    expect(selectReleaseAsset(["OrderQuickReadSetup.exe", "OrderQuickRead-macos-arm64.dmg"], "win32", "x64")).toBe("OrderQuickReadSetup.exe");
  });

  it("selects Apple Silicon macOS dmg", () => {
    expect(selectReleaseAsset(["OrderQuickRead-macos-x64.dmg", "OrderQuickRead-macos-arm64.dmg"], "darwin", "arm64")).toBe("OrderQuickRead-macos-arm64.dmg");
  });
});
```

- [ ] **Step 2: Run updater tests to verify they fail**

Run:

```bash
npm run electron:test -- tests/electron/updater.test.ts
```

Expected: FAIL because `updater.ts` does not exist.

- [ ] **Step 3: Create updater and notifier services**

Create `electron/main/services/updater.ts`:

```ts
import { autoUpdater } from "electron-updater";
import type { UpdateInfo } from "../../shared/types";

export function selectReleaseAsset(assetNames: string[], platformName = process.platform, arch = process.arch): string {
  if (platformName === "win32") {
    return assetNames.find((name) => name.toLowerCase().endsWith(".exe")) ?? "";
  }
  if (platformName === "darwin" && arch === "arm64") {
    return assetNames.find((name) => /arm64/i.test(name) && /\.dmg$/i.test(name)) ?? "";
  }
  if (platformName === "darwin") {
    return assetNames.find((name) => /(x64|x86_64|intel)/i.test(name) && /\.dmg$/i.test(name)) ?? "";
  }
  return "";
}

export async function checkForElectronUpdate(): Promise<UpdateInfo | null> {
  const result = await autoUpdater.checkForUpdates();
  const updateInfo = result?.updateInfo;
  if (!updateInfo) {
    return null;
  }
  return {
    tagName: updateInfo.version,
    releaseUrl: "",
    assetName: "",
    assetUrl: "",
  };
}

export async function downloadElectronUpdate(): Promise<string> {
  const paths = await autoUpdater.downloadUpdate();
  return paths[0] ?? "";
}

export function quitAndInstallElectronUpdate(): void {
  autoUpdater.quitAndInstall(false, true);
}
```

Create `electron/main/services/notifier.ts`:

```ts
import { Notification } from "electron";

export function notifyOrderChanges(newCount: number, updatedCount: number): void {
  const parts: string[] = [];
  if (newCount) {
    parts.push(`新增 ${newCount} 条订单`);
  }
  if (updatedCount) {
    parts.push(`更新 ${updatedCount} 条订单`);
  }
  if (!parts.length) {
    return;
  }
  new Notification({
    title: "邮件订单更新",
    body: parts.join("，"),
  }).show();
}
```

- [ ] **Step 4: Wire update IPC**

Modify `electron/main/ipc.ts` by adding handlers:

```ts
import { checkForElectronUpdate, downloadElectronUpdate, quitAndInstallElectronUpdate } from "./services/updater";

ipcMain.handle(IPC_CHANNELS.checkUpdates, async () => {
  return checkForElectronUpdate();
});

ipcMain.handle(IPC_CHANNELS.downloadUpdate, async () => {
  return downloadElectronUpdate();
});

ipcMain.handle(IPC_CHANNELS.installUpdate, async () => {
  quitAndInstallElectronUpdate();
});
```

- [ ] **Step 5: Run updater tests and typecheck**

Run:

```bash
npm run electron:test -- tests/electron/updater.test.ts
npm run electron:typecheck
```

Expected: updater tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```bash
git add electron/main/services/updater.ts electron/main/services/notifier.ts electron/main/ipc.ts tests/electron/updater.test.ts
git commit -m "Add Electron updater and notifications"
```

## Task 9: Build Workflow And Release Assets

**Files:**
- Modify: `.github/workflows/build.yml`
- Modify: `README.md`
- Create: `tests/electron/workflow.test.ts`

- [ ] **Step 1: Write failing workflow test**

Create `tests/electron/workflow.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Electron GitHub Actions workflow", () => {
  it("builds Electron packages and publishes direct downloads", () => {
    const workflow = readFileSync(".github/workflows/build.yml", "utf8");

    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run electron:test");
    expect(workflow).toContain("npm run electron:build");
    expect(workflow).toContain("OrderQuickReadSetup.exe");
    expect(workflow).toContain("OrderQuickRead-macos-x64.dmg");
    expect(workflow).toContain("OrderQuickRead-macos-arm64.dmg");
  });
});
```

- [ ] **Step 2: Run workflow test to verify it fails**

Run:

```bash
npm run electron:test -- tests/electron/workflow.test.ts
```

Expected: FAIL because workflow still uses PyInstaller packaging.

- [ ] **Step 3: Update build workflow to add Electron jobs**

Modify `.github/workflows/build.yml` so each OS job installs Node and runs:

```yaml
- name: Set up Node
  uses: actions/setup-node@v6
  with:
    node-version: "24"
    cache: npm

- name: Install Electron dependencies
  run: npm ci

- name: Run Electron tests
  run: npm run electron:test

- name: Build Electron package
  run: npm run electron:build
```

For the first Electron packaging pass, keep existing PyInstaller jobs in the workflow and add Electron artifacts beside them. Remove PyInstaller jobs only after packaged Electron parity is verified.

- [ ] **Step 4: Update README with Electron commands**

Add to `README.md`:

````markdown
## Electron Development

```bash
npm install
npm run electron:test
npm run electron:typecheck
npm run electron:dev
```

Electron packages are built with:

```bash
npm run electron:build
```
````

- [ ] **Step 5: Run workflow and full local tests**

Run:

```bash
npm run electron:test -- tests/electron/workflow.test.ts
npm run electron:test
python -m pytest -q
```

Expected: Electron tests pass and Python fallback tests still pass.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/build.yml README.md tests/electron/workflow.test.ts
git commit -m "Add Electron packaging workflow"
```

## Task 10: Parity Verification And PySide6 Retirement Gate

**Files:**
- Create: `docs/electron-parity-checklist.md`
- Modify after verification only: `README.md`

- [ ] **Step 1: Create parity checklist**

Create `docs/electron-parity-checklist.md`:

```markdown
# Electron Parity Checklist

## Required Checks

- [ ] Saved mailbox email and auth code load in Electron.
- [ ] Settings panel auto-collapses after credentials are present.
- [ ] Full scan reads Enterprise WeChat inbox.
- [ ] Incremental refresh scans only new messages.
- [ ] Excel `.xlsx` attachment extracts order number and deadline.
- [ ] Excel `.xlsm` attachment extracts order number and deadline.
- [ ] Excel `.xls` attachment extracts order number and deadline.
- [ ] Ausmet/AUMSET label-style attachment extracts job number and delivery date.
- [ ] Orders sort by deadline ascending with unknown dates last.
- [ ] Order search filters order numbers.
- [ ] Calendar date range filters by email sent time.
- [ ] Auto-refresh runs after saved settings load.
- [ ] New or updated orders trigger notification.
- [ ] Check update button reaches GitHub Release update flow.
- [ ] Windows package installs and opens on a Windows machine.
- [ ] macOS arm64 package opens through right-click Open on Apple Silicon.
- [ ] macOS x64 package opens on Intel Mac or under the matching test runner.
```

- [ ] **Step 2: Run all automated tests**

Run:

```bash
npm run electron:test
npm run electron:typecheck
python -m pytest -q
```

Expected: Electron tests pass, TypeScript reports no errors, and Python tests pass.

- [ ] **Step 3: Build local Electron package on the current platform**

Run:

```bash
npm run electron:build
```

Expected: package appears in `dist-electron-packages`.

- [ ] **Step 4: Commit parity checklist**

```bash
git add docs/electron-parity-checklist.md
git commit -m "Add Electron parity checklist"
```

- [ ] **Step 5: Retire PySide6 only after manual parity is checked**

When all checklist boxes are checked on real machines, remove Python UI packaging files in a separate branch:

```bash
git rm order_quick_read.spec scripts/build_macos.sh scripts/build_windows.ps1 src/email_order_reader/app.py src/email_order_reader/ui/main_window.py src/email_order_reader/ui/icons.py
git commit -m "Remove PySide6 desktop packaging"
```

Do not run this removal step before the checklist has been completed.

---

## Plan Self-Review

- Spec coverage: The plan covers Electron scaffold, Node-based domain logic, settings import, Excel parsing, IMAP scanning, renderer UI, update flow, packaging, and PySide6 retirement gate.
- Placeholder scan: The plan contains concrete file paths, test commands, expected outcomes, and code blocks for each implementation task.
- Type consistency: Shared contracts are created in `electron/shared/types.ts` before services, IPC, and renderer use them.
