import { afterEach, describe, expect, it, vi } from "vitest";

import { IPC_CHANNELS } from "../../electron/shared/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.doUnmock("electron");
  vi.doUnmock("../../electron/main/services/settingsStore.js");
  vi.doUnmock("../../electron/main/services/orderCache.js");
  vi.doUnmock("../../electron/main/services/orderScanner.js");
  vi.doUnmock("../../electron/main/services/mailClient.js");
  vi.doUnmock("../../electron/main/services/notifier.js");
  vi.doUnmock("../../electron/main/services/updater.js");
});

describe("IPC contract", () => {
  it("defines stable channels for renderer calls", () => {
    expect(IPC_CHANNELS).toEqual({
      loadSettings: "settings:load",
      saveSettings: "settings:save",
      scanOrders: "orders:scan",
      backfillStatus: "orders:backfill:status",
      clearCache: "orders:cache:clear",
      checkUpdates: "updates:check",
      downloadUpdate: "updates:download",
      installUpdate: "updates:install",
    });
  });

  it("forwards scan background backfill requests to the scanner", async () => {
    const handlers = new Map<string, (...args: unknown[]) => unknown>();
    const scanOrders = vi.fn(async () => ({
      rows: [],
      warnings: [],
      scannedMessages: 0,
      parsedAttachments: 0,
      scanMode: "full" as const,
    }));

    vi.doMock("electron", () => ({
      app: { getPath: vi.fn(() => "/tmp/order-quick-read-test") },
      ipcMain: {
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
          handlers.set(channel, handler);
        }),
      },
      shell: {
        showItemInFolder: vi.fn(),
        openPath: vi.fn(async () => ""),
      },
    }));
    vi.doMock("../../electron/main/services/settingsStore.js", () => ({
      loadSettings: vi.fn(async () => ({ email: "buyer@example.com", authCode: "secret" })),
      saveSettings: vi.fn(),
    }));
    vi.doMock("../../electron/main/services/orderCache.js", () => ({
      clearOrderCache: vi.fn(),
      loadOrderCache: vi.fn(async () => ({ rows: [] })),
    }));
    vi.doMock("../../electron/main/services/orderScanner.js", () => ({ scanOrders }));
    vi.doMock("../../electron/main/services/mailClient.js", () => ({
      ImapAttachmentClient: vi.fn(() => ({ close: vi.fn() })),
    }));
    vi.doMock("../../electron/main/services/notifier.js", () => ({
      countOrderChanges: vi.fn(),
      notifyOrderChanges: vi.fn(),
    }));
    vi.doMock("../../electron/main/services/updater.js", () => ({
      checkForElectronUpdate: vi.fn(),
      downloadUpdateAsset: vi.fn(),
    }));

    const { registerIpcHandlers } = await import("../../electron/main/ipc");
    registerIpcHandlers();

    const handler = handlers.get(IPC_CHANNELS.scanOrders);
    expect(handler).toBeDefined();
    const send = vi.fn();
    await handler?.(
      { sender: { send } },
      {
        fullScan: true,
        includeMetrics: true,
        sentStartDate: "2026-06-11",
        sentEndDate: "2026-06-17",
        backgroundBackfill: true,
        backgroundSentStartDate: "2026-05-19",
        backgroundSentEndDate: "2026-06-17",
      },
    );

    expect(scanOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        fullScan: true,
        includeMetrics: true,
        sentStartDate: "2026-06-11",
        sentEndDate: "2026-06-17",
        backgroundBackfill: true,
        backgroundSentStartDate: "2026-05-19",
        backgroundSentEndDate: "2026-06-17",
        accountEmail: "buyer@example.com",
        onBackgroundBackfillStatus: expect.any(Function),
      }),
    );
    const scanOptions = (scanOrders.mock.calls as unknown as [
      [
        {
          onBackgroundBackfillStatus(status: { state: "completed"; message: string }): void;
        },
      ],
    ])[0][0];
    scanOptions.onBackgroundBackfillStatus({
      state: "completed",
      message: "历史邮件同步完成。",
    });
    expect(send).toHaveBeenCalledWith(IPC_CHANNELS.backfillStatus, {
      state: "completed",
      message: "历史邮件同步完成。",
    });
  });
});
