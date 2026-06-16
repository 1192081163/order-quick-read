import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AppSettings } from "../../shared/types.js";

const emptySettings: AppSettings = {
  email: "",
  authCode: "",
};

export type SettingsPaths = {
  settingsPath: string;
  legacySettingsPath?: string;
};

export async function loadSettings(paths: SettingsPaths): Promise<AppSettings> {
  const { settingsPath, legacySettingsPath } = paths;
  const settings = await readSettingsFile(settingsPath);
  if (settings !== null) {
    return settings;
  }

  if (!legacySettingsPath) {
    return { ...emptySettings };
  }

  const legacySettings = await readSettingsFile(legacySettingsPath);
  if (legacySettings === null) {
    return { ...emptySettings };
  }

  await saveSettings({ settingsPath }, legacySettings);
  return legacySettings;
}

export async function saveSettings(paths: SettingsPaths, settings: AppSettings): Promise<void> {
  const { settingsPath } = paths;
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    JSON.stringify(
      {
        email: settings.email,
        authCode: settings.authCode,
      },
      null,
      2,
    ),
    "utf-8",
  );
}

async function readSettingsFile(settingsPath: string): Promise<AppSettings | null> {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(settingsPath, "utf-8"));
  } catch {
    return null;
  }

  if (!isRecord(raw)) {
    return null;
  }

  return {
    email: stringValue(raw.email).trim(),
    authCode: stringValue(raw.authCode ?? raw.auth_code),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
