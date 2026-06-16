import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(path.join(repoRoot, ".github/workflows/build.yml"), "utf-8");

describe("GitHub Actions packaging workflow", () => {
  it("builds Electron installers instead of legacy PyInstaller packages", () => {
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run electron:typecheck");
    expect(workflow).toContain("npm run electron:test");
    expect(workflow).toContain("npm run electron:build -- --win nsis --publish never");
    expect(workflow).toContain("npm run electron:build -- --mac dmg --x64 --publish never");
    expect(workflow).toContain("npm run electron:build -- --mac dmg --arm64 --publish never");
    expect(workflow).not.toContain("scripts/build_windows.ps1");
    expect(workflow).not.toContain("scripts/build_macos.sh");
  });

  it("publishes direct installer and dmg release assets", () => {
    expect(workflow).toContain("dist-electron-packages/OrderQuickReadSetup.exe");
    expect(workflow).toContain("dist-electron-packages/OrderQuickRead-macos-x64.dmg");
    expect(workflow).toContain("dist-electron-packages/OrderQuickRead-macos-arm64.dmg");
    expect(workflow).toContain("release-assets/OrderQuickReadSetup.exe#OrderQuickReadSetup.exe");
    expect(workflow).toContain("release-assets/OrderQuickRead-macos-x64.dmg#OrderQuickRead-macos-x64.dmg");
    expect(workflow).toContain("release-assets/OrderQuickRead-macos-arm64.dmg#OrderQuickRead-macos-arm64.dmg");
  });
});
