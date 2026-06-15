from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AppSettings:
    email: str = ""
    auth_code: str = ""


def default_settings_path() -> Path:
    return Path.home() / ".email-order-reader" / "settings.json"


def load_settings(path: Path | None = None) -> AppSettings:
    settings_path = path or default_settings_path()
    try:
        raw = json.loads(settings_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return AppSettings()

    if not isinstance(raw, dict):
        return AppSettings()

    return AppSettings(
        email=str(raw.get("email") or "").strip(),
        auth_code=str(raw.get("auth_code") or ""),
    )


def save_settings(settings: AppSettings, path: Path | None = None) -> None:
    settings_path = path or default_settings_path()
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(
        json.dumps(
            {
                "email": settings.email,
                "auth_code": settings.auth_code,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
