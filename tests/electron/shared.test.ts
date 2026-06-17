import { describe, expect, it } from "vitest";

import { normalizeDeadlineDate, sentDateFromMessageDate } from "../../electron/shared/date";
import { filterOrderRows } from "../../electron/shared/filtering";
import { sortOrderRows } from "../../electron/shared/sorting";
import type { OrderRow } from "../../electron/shared/types";

const rows: OrderRow[] = [
  {
    orderNumber: "29988",
    deadline: "2026-06-20",
    sourceFile: "",
    messageSubject: "",
    messageDate: "2026-06-22T09:00:00.000Z",
  },
  {
    orderNumber: "29904",
    deadline: "2026/6/16 00:00:00",
    sourceFile: "",
    messageSubject: "",
    messageDate: "2026-06-16T09:00:00.000Z",
  },
  {
    orderNumber: "29912",
    deadline: "2026年6月16日 18:30",
    sourceFile: "",
    messageSubject: "",
    messageDate: "2026-06-16T10:00:00.000Z",
  },
  {
    orderNumber: "UNKNOWN",
    deadline: "待确认",
    sourceFile: "",
    messageSubject: "",
    messageDate: "",
  },
];

describe("shared date helpers", () => {
  it("normalizes deadline date text", () => {
    expect(normalizeDeadlineDate("2026/6/20 00:00:00")).toBe("2026-06-20");
    expect(normalizeDeadlineDate("2026年6月19日 18:30")).toBe("2026-06-19");
    expect(normalizeDeadlineDate("2026-02-03")).toBe("2026-02-03");
    expect(normalizeDeadlineDate("待确认")).toBeNull();
  });

  it("rejects impossible deadline dates", () => {
    expect(normalizeDeadlineDate("2026/02/30")).toBeNull();
    expect(normalizeDeadlineDate("2026-13-01")).toBeNull();
  });

  it("extracts email sent date from ISO message date", () => {
    expect(sentDateFromMessageDate("2026-06-16T09:00:00.000Z")).toBe("2026-06-16");
    expect(sentDateFromMessageDate("2026-06-16T00:30:00+08:00")).toBe("2026-06-16");
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
        sentPreset: "custom",
        sentStartDate: "2026-06-15",
        sentEndDate: "2026-06-21",
        deadlinePreset: "all",
        deadlineStartDate: "",
        deadlineEndDate: "",
      }).map((row) => row.orderNumber),
    ).toEqual(["29904", "29912"]);
  });

  it("does not match a previous month email when sent date is a single day this month", () => {
    const mixedMonthRows: OrderRow[] = [
      {
        orderNumber: "MAY-18",
        deadline: "2026-06-20",
        sourceFile: "",
        messageSubject: "",
        messageDate: "2026-05-18T09:00:00.000Z",
      },
      {
        orderNumber: "JUNE-18",
        deadline: "2026-06-20",
        sourceFile: "",
        messageSubject: "",
        messageDate: "2026-06-18T09:00:00.000Z",
      },
    ];

    expect(
      filterOrderRows(mixedMonthRows, {
        searchText: "",
        sentPreset: "custom",
        sentStartDate: "2026-06-18",
        sentEndDate: "2026-06-18",
        deadlinePreset: "all",
        deadlineStartDate: "",
        deadlineEndDate: "",
      }).map((row) => row.orderNumber),
    ).toEqual(["JUNE-18"]);
  });

  it("filters by sent-date and deadline presets independently", () => {
    const baseFilter = {
      searchText: "",
      sentPreset: "thisWeek" as const,
      sentStartDate: "",
      sentEndDate: "",
      deadlinePreset: "thisWeek" as const,
      deadlineStartDate: "",
      deadlineEndDate: "",
    };

    expect(filterOrderRows(rows, baseFilter, { today: "2026-06-17" }).map((row) => row.orderNumber)).toEqual([
      "29904",
      "29912",
    ]);

    expect(
      filterOrderRows(rows, { ...baseFilter, deadlinePreset: "overdue" }, { today: "2026-06-17" }).map(
        (row) => row.orderNumber,
      ),
    ).toEqual(["29904", "29912"]);
  });
});
