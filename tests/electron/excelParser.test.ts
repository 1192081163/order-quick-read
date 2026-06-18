import { describe, expect, it } from "vitest";
import * as XLSX from "@e965/xlsx";

import { parseExcelAttachment } from "../../electron/main/services/excelParser";

type SheetFixture = {
  name: string;
  rows: unknown[][];
};

function workbookBuffer(rows: unknown[][], bookType: XLSX.BookType = "xlsx"): Buffer {
  return workbookBufferWithSheets([{ name: "Orders", rows }], bookType);
}

function workbookBufferWithSheets(
  sheets: SheetFixture[],
  bookType: XLSX.BookType = "xlsx",
  date1904 = false,
): Buffer {
  const workbook = XLSX.utils.book_new();
  workbook.Workbook = { WBProps: { date1904 } };
  for (const { name, rows } of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType }));
}

function excelDate(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month - 1, day, hour, minute);
}

function excelSerialDate(serial: number): XLSX.CellObject {
  return { t: "n", v: serial, z: "m/d/yy" };
}

describe("Excel parser", () => {
  it("parses xlsx files with Chinese headers and local Date cells", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["订单号", "交单日期", "备注"],
        ["PO-1001", excelDate(2026, 6, 20), "加急"],
      ]),
      "订单邮件",
      "2026-06-16T09:00:00.000Z",
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows).toEqual([
      {
        orderNumber: "PO-1001",
        deadline: "2026-06-20",
        sourceFile: "orders.xlsx",
        messageSubject: "订单邮件",
        messageDate: "2026-06-16T09:00:00.000Z",
      },
    ]);
  });

  it("parses xlsm files with English headers and datetime cells", () => {
    const result = parseExcelAttachment(
      "orders.xlsm",
      workbookBuffer(
        [
          ["Order Number", "Due Date"],
          ["PO-2002", excelDate(2026, 7, 3, 9, 15)],
        ],
        "xlsm",
      ),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-2002", "2026-07-03"],
    ]);
  });

  it("skips empty order rows", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["订单编号", "截止时间"],
        [null, excelDate(2026, 6, 20)],
        ["PO-3003", "2026/06/21"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-3003", "2026-06-21"],
    ]);
  });

  it("reports missing order or deadline columns", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["客户", "金额"],
        ["ACME", 100],
      ]),
    );

    expect(result.rows).toEqual([]);
    expect(result.warnings).toEqual(["orders.xlsx：未识别订单号列或截至时间列"]);
  });

  it("detects headers per sheet without treating later headers as rows", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBufferWithSheets([
        {
          name: "Orders A",
          rows: [
            ["订单号", "交单日期"],
            ["PO-4004", excelDate(2026, 8, 1)],
          ],
        },
        {
          name: "Orders B",
          rows: [
            ["订单号", "交单日期"],
            ["PO-5005", excelDate(2026, 8, 2)],
          ],
        },
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-4004", "2026-08-01"],
      ["PO-5005", "2026-08-02"],
    ]);
  });

  it("detects headers after leading blank rows", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        [],
        [],
        ["订单号", "交单日期"],
        ["PO-4100", "2026-08-03"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-4100", "2026-08-03"],
    ]);
  });

  it("skips invalid date-shaped text and keeps valid rows", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["订单号", "交单日期"],
        ["PO-BAD", "2026/02/30"],
        ["PO-6006", "2026/03/01"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-6006", "2026-03-01"],
    ]);
  });

  it("normalizes deadline text with time suffixes", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["订单号", "交单日期"],
        ["PO-6100", "2026/6/20 00:00:00"],
        ["PO-6101", "2026年6月19日 18:30"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-6100", "2026-06-20"],
      ["PO-6101", "2026-06-19"],
    ]);
  });

  it("parses xls files with Chinese headers", () => {
    const result = parseExcelAttachment(
      "orders.xls",
      workbookBuffer(
        [
          ["客户订单号", "交货日期"],
          ["PO-4004", "2026-08-09"],
        ],
        "biff8",
      ),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-4004", "2026-08-09"],
    ]);
  });

  it("detects columns without alias headers only when there are two matches and no tie", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["编号", "时间"],
        ["PO-5005", "2026-09-01"],
        ["PO-5006", "2026-09-02"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-5005", "2026-09-01"],
      ["PO-5006", "2026-09-02"],
    ]);

    const unrelated = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["Customer ID", "Last Contact"],
        ["A123", "2026-01-15"],
      ]),
    );
    expect(unrelated.rows).toEqual([]);
    expect(unrelated.warnings).toEqual(["orders.xlsx：未识别订单号列或截至时间列"]);

    const tied = parseExcelAttachment(
      "orders.xlsx",
      workbookBuffer([
        ["First", "Second", "Deadline"],
        ["PO-1001", "PO-2001", "2026-06-20"],
        ["PO-1002", "PO-2002", "2026-06-21"],
      ]),
    );
    expect(tied.rows).toEqual([]);
    expect(tied.warnings).toEqual(["orders.xlsx：未识别订单号列或截至时间列"]);
  });

  it("parses xls native date cells and rejects time-only cells", () => {
    const result = parseExcelAttachment(
      "orders.xls",
      workbookBuffer(
        [
          ["编号", "时间"],
          ["PO-7007", excelDate(2026, 8, 9)],
          ["PO-TIME", excelDate(1899, 12, 31, 8, 30)],
          ["PO-8008", excelDate(2026, 8, 10)],
        ],
        "biff8",
      ),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-7007", "2026-08-09"],
      ["PO-8008", "2026-08-10"],
    ]);
  });

  it("parses 1904 date system workbooks", () => {
    const result = parseExcelAttachment(
      "orders.xlsx",
      workbookBufferWithSheets(
        [
          {
            name: "Orders",
            rows: [
              ["订单号", "交单日期"],
              ["PO-1904", excelSerialDate(44731)],
            ],
          },
        ],
        "xlsx",
        true,
      ),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["PO-1904", "2026-06-20"],
    ]);
  });

  it("parses Ausmet job templates from label cells", () => {
    const result = parseExcelAttachment(
      "job.xlsx",
      workbookBuffer([
        ["Ausmet Job #", null, 29912],
        ["Builder:", null, "Coastal Design & Construction Pty Ltd"],
        [],
        [],
        ["Delivery Date:", null, excelDate(2026, 5, 26)],
        ["PO No:", null, "4507277735"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["29912", "2026-05-26"],
    ]);
  });

  it("parses Aumset job templates from inline job numbers", () => {
    const result = parseExcelAttachment(
      "job.xlsx",
      workbookBuffer([
        ["AUMSET JOB # 29923 REV00"],
        ["Builder:", "Danze Mining & Building Products"],
        [],
        [],
        ["Delivery Date:", excelDate(2026, 5, 28)],
        ["Purchase Order:", "6512"],
      ]),
    );

    expect(result.warnings).toEqual([]);
    expect(result.rows.map((row) => [row.orderNumber, row.deadline])).toEqual([
      ["29923", "2026-05-28"],
    ]);
  });
});
