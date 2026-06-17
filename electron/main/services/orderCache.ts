import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type { OrderRow } from "../../shared/types.js";

export type ParsedAttachmentCacheEntry = {
  key: string;
  rows: OrderRow[];
  warnings: string[];
};

export type OrderCache = {
  email: string;
  uidvalidity: string;
  lastUid: number;
  rows: OrderRow[];
  warnings: string[];
  scannedMessages: number;
  parsedAttachments: number;
  parsedAttachmentCache?: ParsedAttachmentCacheEntry[];
};

const emptyCache: OrderCache = {
  email: "",
  uidvalidity: "",
  lastUid: 0,
  rows: [],
  warnings: [],
  scannedMessages: 0,
  parsedAttachments: 0,
};

export async function loadOrderCache(cachePath: string): Promise<OrderCache> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(cachePath, "utf-8"));
  } catch {
    return createEmptyCache();
  }

  if (!isRecord(raw)) {
    return createEmptyCache();
  }

  const parsedAttachmentCache = loadParsedAttachmentCache(raw.parsedAttachmentCache ?? raw.parsed_attachment_cache);
  return {
    email: stringValue(raw.email).trim(),
    uidvalidity: stringValue(raw.uidvalidity),
    lastUid: numberValue(raw.lastUid ?? raw.last_uid),
    rows: loadRows(raw.rows),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map((warning) => String(warning)) : [],
    scannedMessages: numberValue(raw.scannedMessages ?? raw.scanned_messages),
    parsedAttachments: numberValue(raw.parsedAttachments ?? raw.parsed_attachments),
    ...(parsedAttachmentCache.length > 0 ? { parsedAttachmentCache } : {}),
  };
}

export async function saveOrderCache(cachePath: string, cache: OrderCache): Promise<void> {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        email: cache.email,
        uidvalidity: cache.uidvalidity,
        lastUid: cache.lastUid,
        rows: cache.rows,
        warnings: cache.warnings,
        scannedMessages: cache.scannedMessages,
        parsedAttachments: cache.parsedAttachments,
        ...((cache.parsedAttachmentCache?.length ?? 0) > 0
          ? { parsedAttachmentCache: cache.parsedAttachmentCache }
          : {}),
      },
      null,
      2,
    ),
    "utf-8",
  );
}

export async function clearOrderCache(cachePath: string): Promise<void> {
  await rm(cachePath, { force: true });
}

export function mergeOrderRows(existingRows: OrderRow[], newRows: OrderRow[]): OrderRow[] {
  const merged = new Map<string, OrderRow>();
  const orderNumbers: string[] = [];

  for (const row of [...existingRows, ...newRows]) {
    if (!merged.has(row.orderNumber)) {
      orderNumbers.push(row.orderNumber);
    }
    merged.set(row.orderNumber, row);
  }

  return orderNumbers.map((orderNumber) => merged.get(orderNumber)).filter((row): row is OrderRow => row !== undefined);
}

export function mergeParsedAttachmentCache(
  existingEntries: ParsedAttachmentCacheEntry[],
  newEntries: ParsedAttachmentCacheEntry[],
): ParsedAttachmentCacheEntry[] {
  const merged = new Map<string, ParsedAttachmentCacheEntry>();
  for (const entry of [...existingEntries, ...newEntries]) {
    merged.set(entry.key, entry);
  }
  return [...merged.values()];
}

function createEmptyCache(): OrderCache {
  return {
    ...emptyCache,
    rows: [],
    warnings: [],
  };
}

function loadParsedAttachmentCache(rawEntries: unknown): ParsedAttachmentCacheEntry[] {
  if (!Array.isArray(rawEntries)) {
    return [];
  }

  const entries: ParsedAttachmentCacheEntry[] = [];
  for (const rawEntry of rawEntries) {
    if (!isRecord(rawEntry)) {
      continue;
    }

    const key = stringValue(rawEntry.key).trim();
    if (!key) {
      continue;
    }

    entries.push({
      key,
      rows: loadRows(rawEntry.rows),
      warnings: Array.isArray(rawEntry.warnings) ? rawEntry.warnings.map((warning) => String(warning)) : [],
    });
  }

  return entries;
}

function loadRows(rawRows: unknown): OrderRow[] {
  if (!Array.isArray(rawRows)) {
    return [];
  }

  const rows: OrderRow[] = [];
  for (const rawRow of rawRows) {
    if (!isRecord(rawRow)) {
      continue;
    }

    const orderNumber = stringValue(rawRow.orderNumber ?? rawRow.order_number).trim();
    const deadline = stringValue(rawRow.deadline).trim();
    if (!orderNumber || !deadline) {
      continue;
    }

    rows.push({
      orderNumber,
      deadline,
      sourceFile: stringValue(rawRow.sourceFile ?? rawRow.source_file),
      messageSubject: stringValue(rawRow.messageSubject ?? rawRow.message_subject),
      messageDate: stringValue(rawRow.messageDate ?? rawRow.message_date),
    });
  }

  return rows;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
