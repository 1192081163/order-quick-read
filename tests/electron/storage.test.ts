import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { clearOrderCache, loadOrderCache, mergeOrderRows, saveOrderCache } from "../../electron/main/services/orderCache";
import { loadSettings, saveSettings } from "../../electron/main/services/settingsStore";
import type { OrderRow } from "../../electron/shared/types";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "order-storage-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function row(orderNumber: string, deadline: string): OrderRow {
  return {
    orderNumber,
    deadline,
    sourceFile: `${orderNumber}.xlsx`,
    messageSubject: `subject ${orderNumber}`,
    messageDate: "2026-06-16T09:00:00.000Z",
  };
}

describe("settings store", () => {
  it("imports legacy Python settings when Electron settings are missing", async () => {
    const settingsPath = path.join(tempDir, "electron", "settings.json");
    const legacyPath = path.join(tempDir, "python", "settings.json");
    await mkdir(path.dirname(legacyPath), { recursive: true });
    await writeFile(
      legacyPath,
      JSON.stringify({ email: " user@example.com ", auth_code: "legacy-auth" }),
      "utf-8",
    );

    const settings = await loadSettings({ settingsPath, legacySettingsPath: legacyPath });

    expect(settings).toEqual({ email: "user@example.com", authCode: "legacy-auth" });
    await expect(readFile(settingsPath, "utf-8").then(JSON.parse)).resolves.toEqual({
      email: "user@example.com",
      authCode: "legacy-auth",
    });
  });

  it("saves settings in the Electron shape", async () => {
    const settingsPath = path.join(tempDir, "settings.json");

    await saveSettings({ settingsPath }, { email: "buyer@example.com", authCode: "new-auth" });

    await expect(readFile(settingsPath, "utf-8").then(JSON.parse)).resolves.toEqual({
      email: "buyer@example.com",
      authCode: "new-auth",
    });
  });

  it("returns empty settings for missing or invalid JSON files", async () => {
    const missingPath = path.join(tempDir, "missing.json");
    const invalidPath = path.join(tempDir, "invalid.json");
    await writeFile(invalidPath, "{", "utf-8");

    await expect(loadSettings({ settingsPath: missingPath })).resolves.toEqual({ email: "", authCode: "" });
    await expect(loadSettings({ settingsPath: invalidPath })).resolves.toEqual({ email: "", authCode: "" });
  });
});

describe("order cache", () => {
  it("updates existing rows by order number and preserves their order", () => {
    const existingRows = [row("A-1", "2026-06-20"), row("A-2", "2026-06-21")];
    const updatedRow = {
      ...row("A-1", "2026-06-25"),
      sourceFile: "updated.xlsx",
    };
    const newRow = row("A-3", "2026-06-22");

    expect(mergeOrderRows(existingRows, [updatedRow, newRow])).toEqual([
      updatedRow,
      existingRows[1],
      newRow,
    ]);
  });

  it("loads legacy Python snake_case cache fields and saves metadata", async () => {
    const cachePath = path.join(tempDir, "cache.json");
    await writeFile(
      cachePath,
      JSON.stringify({
        email: " buyer@example.com ",
        uidvalidity: "42",
        last_uid: 100,
        rows: [
          {
            order_number: "PO-1",
            deadline: "2026-06-18",
            source_file: "legacy.xlsx",
            message_subject: "legacy subject",
            message_date: "2026-06-16T09:00:00.000Z",
          },
        ],
        warnings: ["legacy warning"],
        scanned_messages: 7,
        parsed_attachments: 2,
      }),
      "utf-8",
    );

    const loaded = await loadOrderCache(cachePath);

    expect(loaded).toEqual({
      email: "buyer@example.com",
      uidvalidity: "42",
      lastUid: 100,
      rows: [
        {
          orderNumber: "PO-1",
          deadline: "2026-06-18",
          sourceFile: "legacy.xlsx",
          messageSubject: "legacy subject",
          messageDate: "2026-06-16T09:00:00.000Z",
        },
      ],
      warnings: ["legacy warning"],
      scannedMessages: 7,
      parsedAttachments: 2,
    });

    await saveOrderCache(
      cachePath,
      {
        ...loaded,
        lastUid: 101,
        scannedMessages: 8,
        parsedAttachments: 3,
      },
    );

    await expect(readFile(cachePath, "utf-8").then(JSON.parse)).resolves.toEqual({
      email: "buyer@example.com",
      uidvalidity: "42",
      lastUid: 101,
      rows: loaded.rows,
      warnings: ["legacy warning"],
      scannedMessages: 8,
      parsedAttachments: 3,
    });
  });

  it("returns an empty cache for missing or invalid JSON files", async () => {
    const missingPath = path.join(tempDir, "missing-cache.json");
    const invalidPath = path.join(tempDir, "invalid-cache.json");
    await writeFile(invalidPath, "[", "utf-8");

    const emptyCache = {
      email: "",
      uidvalidity: "",
      lastUid: 0,
      rows: [],
      warnings: [],
      scannedMessages: 0,
      parsedAttachments: 0,
    };

    await expect(loadOrderCache(missingPath)).resolves.toEqual(emptyCache);
    await expect(loadOrderCache(invalidPath)).resolves.toEqual(emptyCache);
  });

  it("clears saved order cache", async () => {
    const cachePath = path.join(tempDir, "order-cache.json");
    await saveOrderCache(cachePath, {
      email: "buyer@example.com",
      uidvalidity: "42",
      lastUid: 100,
      rows: [row("PO-1", "2026-06-18")],
      warnings: [],
      scannedMessages: 1,
      parsedAttachments: 1,
    });

    await clearOrderCache(cachePath);

    await expect(loadOrderCache(cachePath)).resolves.toMatchObject({
      email: "",
      lastUid: 0,
      rows: [],
    });
  });
});
