import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = readFileSync(path.join(repoRoot, ".github/workflows/build.yml"), "utf-8");

describe("GitHub Actions packaging workflow", () => {
  it("builds only the Windows Electron installer for now", () => {
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run electron:typecheck");
    expect(workflow).toContain("npm run electron:test");
    expect(workflow).toContain("npm run electron:build -- --win nsis --publish never");
    expect(workflow).not.toContain("npm run electron:build -- --mac");
    expect(workflow).not.toContain("build-macos");
    expect(workflow).not.toContain("macos-latest");
    expect(workflow).not.toContain("macos-15-intel");
    expect(workflow).not.toContain("scripts/build_windows.ps1");
    expect(workflow).not.toContain("scripts/build_macos.sh");
  });

  it("publishes the direct Windows installer release asset", () => {
    expect(workflow).toContain("dist-electron-packages/OrderQuickReadSetup.exe");
    expect(workflow).toContain("release-assets/OrderQuickReadSetup.exe#OrderQuickReadSetup.exe");
    expect(workflow).not.toContain(".dmg");
  });
});
