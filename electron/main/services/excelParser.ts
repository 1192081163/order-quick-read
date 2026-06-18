import XLSX, { type CellObject } from "@e965/xlsx";

import type { OrderRow } from "../../shared/types.js";

export type AttachmentParseResult = {
  filename: string;
  rows: OrderRow[];
  warnings: string[];
};

const HEADER_SCAN_LIMIT = 20;
const MIN_HEURISTIC_MATCHES = 2;
const MIN_REASONABLE_YEAR = 2000;
const SUPPORTED_EXTENSIONS = new Set([".xlsx", ".xlsm", ".xls"]);
const DEADLINE_PATTERNS = [
  /^\s*(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\s*$/,
  /^\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日(?:\s*\d{1,2}:\d{2}(?::\d{2})?)?\s*$/,
];
const ORDER_ALIASES = normalizeAliasSet([
  "订单号",
  "订单编号",
  "客户订单号",
  "Order No",
  "Order Number",
  "PO",
  "PO Number",
]);
const DEADLINE_ALIASES = normalizeAliasSet([
  "交单日期",
  "截至时间",
  "截止时间",
  "交货日期",
  "Delivery Date",
  "Due Date",
]);
const DELIVERY_DATE_LABELS = new Set([
  "deliverydate",
  "deldate",
  "交单日期",
  "交货日期",
  "截至时间",
  "截止时间",
]);

type HeaderMatch = {
  rowIndex: number;
  orderColumn: number;
  deadlineColumn: number;
};

type ExcelDateValue = {
  kind: "excelDate";
  serial: number;
  date1904: boolean;
};

export function parseExcelAttachment(
  filename: string,
  content: Buffer,
  messageSubject = "",
  messageDate = "",
): AttachmentParseResult {
  let sheets: unknown[][][];
  try {
    sheets = readSheets(filename, content);
  } catch (error) {
    return {
      filename,
      rows: [],
      warnings: [`${filename}：无法读取Excel附件：${String(error)}`],
    };
  }

  const parsedRows: OrderRow[] = [];
  let foundHeader = false;

  for (const rows of sheets) {
    const sheetRows = parseRows(filename, rows, messageSubject, messageDate);
    if (sheetRows === null) {
      continue;
    }
    foundHeader = true;
    parsedRows.push(...sheetRows);
  }

  if (!foundHeader) {
    return {
      filename,
      rows: [],
      warnings: [`${filename}：未识别订单号列或截至时间列`],
    };
  }

  return { filename, rows: parsedRows, warnings: [] };
}

function readSheets(filename: string, content: Buffer): unknown[][][] {
  if (!SUPPORTED_EXTENSIONS.has(fileExtension(filename))) {
    return [];
  }

  const workbook = XLSX.read(content, { type: "buffer", cellDates: false, cellNF: true });
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904);
  return workbook.SheetNames.map((sheetName) => sheetToRows(workbook.Sheets[sheetName], date1904));
}

function sheetToRows(sheet: XLSX.WorkSheet, date1904: boolean): unknown[][] {
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:A1");
  const rows: unknown[][] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    const row: unknown[] = [];
    for (let columnIndex = range.s.c; columnIndex <= range.e.c; columnIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      row.push(readCellValue(sheet[address] as CellObject | undefined, date1904));
    }
    rows.push(row);
  }

  return rows;
}

function readCellValue(cell: CellObject | undefined, date1904: boolean): unknown {
  if (!cell) {
    return null;
  }

  if (isNumericDateCell(cell)) {
    return { kind: "excelDate", serial: cell.v, date1904 };
  }

  return cell.v ?? null;
}

function isNumericDateCell(cell: CellObject): cell is CellObject & { v: number } {
  return cell.t === "n" && typeof cell.v === "number" && typeof cell.z === "string" && XLSX.SSF.is_date(cell.z);
}

function parseRows(
  filename: string,
  rows: unknown[][],
  messageSubject: string,
  messageDate: string,
): OrderRow[] | null {
  const templateRows = parseJobTemplateRows(filename, rows, messageSubject, messageDate);
  if (templateRows !== null) {
    return templateRows;
  }

  const headerMatch = findHeader(rows) ?? guessColumns(rows);
  if (headerMatch === null) {
    return null;
  }

  const parsedRows: OrderRow[] = [];
  for (const row of rows.slice(headerMatch.rowIndex + 1)) {
    const orderNumber = cellToText(getCell(row, headerMatch.orderColumn));
    const deadline = normalizeDeadline(getCell(row, headerMatch.deadlineColumn));
    if (!orderNumber || !deadline) {
      continue;
    }

    parsedRows.push({
      orderNumber,
      deadline,
      sourceFile: filename,
      messageSubject,
      messageDate,
    });
  }

  return parsedRows;
}

function parseJobTemplateRows(
  filename: string,
  rows: unknown[][],
  messageSubject: string,
  messageDate: string,
): OrderRow[] | null {
  const orderNumber = findTemplateJobNumber(rows);
  const deadline = findTemplateDeliveryDate(rows);
  if (!orderNumber || !deadline) {
    return null;
  }

  return [
    {
      orderNumber,
      deadline,
      sourceFile: filename,
      messageSubject,
      messageDate,
    },
  ];
}

function findTemplateJobNumber(rows: unknown[][]): string {
  for (const row of rows.slice(0, HEADER_SCAN_LIMIT)) {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      const text = cellToText(row[columnIndex]);
      if (!text) {
        continue;
      }

      const inlineJobNumber = extractInlineJobNumber(text);
      if (inlineJobNumber) {
        return inlineJobNumber;
      }

      if (isJobNumberLabel(text)) {
        const value = firstNonEmptyCellToRight(row, columnIndex);
        if (value !== null) {
          return cleanTemplateJobNumber(value);
        }
      }
    }
  }

  return "";
}

function findTemplateDeliveryDate(rows: unknown[][]): string {
  for (const row of rows.slice(0, HEADER_SCAN_LIMIT)) {
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (!isDeliveryDateLabel(cellToText(row[columnIndex]))) {
        continue;
      }

      const value = firstNonEmptyCellToRight(row, columnIndex);
      const deadline = normalizeStrictDeadline(value);
      if (deadline) {
        return deadline;
      }
    }
  }

  return "";
}

function extractInlineJobNumber(value: unknown): string {
  const text = cellToText(value);
  if (!/^\s*(?:ausmet|aumset)?\s*job\s*#?/i.test(text)) {
    return "";
  }

  const match = text.match(/#\s*([A-Za-z0-9-]+)/);
  return match ? cleanTemplateJobNumber(match[1]) : "";
}

function isJobNumberLabel(value: string): boolean {
  return /^\s*(?:ausmet|aumset)?\s*job\s*#?\s*$/i.test(value);
}

function isDeliveryDateLabel(value: string): boolean {
  return DELIVERY_DATE_LABELS.has(normalizeHeader(value));
}

function firstNonEmptyCellToRight(row: unknown[], columnIndex: number): unknown | null {
  for (const cell of row.slice(columnIndex + 1, columnIndex + 6)) {
    if (cellToText(cell)) {
      return cell;
    }
  }
  return null;
}

function cleanTemplateJobNumber(value: unknown): string {
  const text = cellToText(value);
  const match = text.match(/\b\d{4,}\b/);
  return match ? match[0] : text;
}

function normalizeStrictDeadline(value: unknown): string {
  if (isExcelDateValue(value)) {
    return excelSerialToIso(value);
  }
  if (isValidDate(value)) {
    return dateToLocalIso(value);
  }

  const text = cellToText(value);
  if (!text) {
    return "";
  }

  return isDateShapedText(text) ? normalizeDeadline(text) : "";
}

function findHeader(rows: unknown[][]): HeaderMatch | null {
  for (let rowIndex = 0; rowIndex < Math.min(rows.length, HEADER_SCAN_LIMIT); rowIndex += 1) {
    const normalized = rows[rowIndex].map((cell) => normalizeHeader(cellToText(cell)));
    const orderColumn = findFirstIndex(normalized, ORDER_ALIASES);
    const deadlineColumn = findFirstIndex(normalized, DEADLINE_ALIASES);
    if (orderColumn !== null && deadlineColumn !== null) {
      return { rowIndex, orderColumn, deadlineColumn };
    }
  }

  return null;
}

function guessColumns(rows: unknown[][]): HeaderMatch | null {
  const sampleRows = rows.slice(1);
  if (sampleRows.length === 0) {
    return null;
  }

  const maxColumns = Math.max(0, ...sampleRows.map((row) => row.length));
  let bestPair: [number, number] | null = null;
  let bestScore = 0;
  let tied = false;

  for (let orderColumn = 0; orderColumn < maxColumns; orderColumn += 1) {
    for (let deadlineColumn = 0; deadlineColumn < maxColumns; deadlineColumn += 1) {
      if (orderColumn === deadlineColumn) {
        continue;
      }

      const pairedScore = sampleRows.filter(
        (row) => isOrderValue(getCell(row, orderColumn)) && isDeadlineValue(getCell(row, deadlineColumn)),
      ).length;

      if (pairedScore > bestScore) {
        bestPair = [orderColumn, deadlineColumn];
        bestScore = pairedScore;
        tied = false;
      } else if (pairedScore === bestScore && pairedScore >= MIN_HEURISTIC_MATCHES) {
        tied = true;
      }
    }
  }

  if (bestPair === null || bestScore < MIN_HEURISTIC_MATCHES || tied) {
    return null;
  }

  return { rowIndex: 0, orderColumn: bestPair[0], deadlineColumn: bestPair[1] };
}

function isOrderValue(value: unknown): boolean {
  const text = cellToText(value);
  return text.length >= 3 && /\p{L}/u.test(text) && /\d/.test(text);
}

function isDeadlineValue(value: unknown): boolean {
  if (isExcelDateValue(value)) {
    return Boolean(excelSerialToIso(value));
  }
  if (isValidDate(value)) {
    return Boolean(dateToLocalIso(value));
  }

  const text = cellToText(value);
  return Boolean(text && isDateShapedText(text) && normalizeDeadline(text));
}

function findFirstIndex(values: string[], targets: Set<string>): number | null {
  const index = values.findIndex((value) => targets.has(value));
  return index >= 0 ? index : null;
}

function normalizeHeader(value: unknown): string {
  return cellToText(value).toLowerCase().replace(/[\s_\-:/：（）()]+/g, "");
}

function getCell(row: unknown[], index: number): unknown {
  return index >= row.length ? null : row[index];
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (isExcelDateValue(value)) {
    return excelSerialToIso(value);
  }
  if (isValidDate(value)) {
    return dateToLocalIso(value);
  }
  if (typeof value === "number" && Number.isInteger(value)) {
    return String(value);
  }
  return String(value).trim();
}

function normalizeDeadline(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (isExcelDateValue(value)) {
    return excelSerialToIso(value);
  }
  if (isValidDate(value)) {
    return dateToLocalIso(value);
  }

  const text = cellToText(value);
  if (!text) {
    return "";
  }

  const normalizedDate = normalizeDeadlineText(text);
  if (normalizedDate !== null) {
    return normalizedDate;
  }

  return text;
}

function normalizeDeadlineText(text: string): string | null {
  for (const pattern of DEADLINE_PATTERNS) {
    const match = text.match(pattern);
    if (!match) {
      continue;
    }

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (!isValidDateParts(year, month, day) || year < MIN_REASONABLE_YEAR) {
      return "";
    }

    return formatDateParts(year, month, day);
  }

  return null;
}

function isDateShapedText(text: string): boolean {
  return DEADLINE_PATTERNS.some((pattern) => pattern.test(text));
}

function dateToLocalIso(value: Date): string {
  const year = value.getFullYear();
  if (year < MIN_REASONABLE_YEAR) {
    return "";
  }

  return formatDateParts(year, value.getMonth() + 1, value.getDate());
}

function excelSerialToIso(value: ExcelDateValue): string {
  const parsed = XLSX.SSF.parse_date_code(value.serial, { date1904: value.date1904 });
  if (!parsed || parsed.y < MIN_REASONABLE_YEAR || !isValidDateParts(parsed.y, parsed.m, parsed.d)) {
    return "";
  }

  return formatDateParts(parsed.y, parsed.m, parsed.d);
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isExcelDateValue(value: unknown): value is ExcelDateValue {
  return typeof value === "object" && value !== null && (value as ExcelDateValue).kind === "excelDate";
}

function normalizeAliasSet(values: string[]): Set<string> {
  return new Set(values.map((value) => normalizeHeader(value)));
}

function fileExtension(filename: string): string {
  const match = filename.toLowerCase().match(/\.[^.\\/]+$/);
  return match ? match[0] : "";
}
