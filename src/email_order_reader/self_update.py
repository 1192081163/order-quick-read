from __future__ import annotations

import os
import stat
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable


OpenDownloadedUpdate = Callable[[Path, str], None]
LaunchCleanupScript = Callable[[Path, str], None]


@dataclass(frozen=True)
class UpdateInstallPlan:
    update_path: Path
    old_app_path: Path | None
    cleanup_script: Path | None


def install_downloaded_update(
    update_path: Path,
    platform_name: str = sys.platform,
    current_executable: Path | None = None,
    is_frozen: bool | None = None,
    temp_dir: Path | None = None,
    opener: OpenDownloadedUpdate | None = None,
    launcher: LaunchCleanupScript | None = None,
) -> UpdateInstallPlan:
    update_path = Path(update_path)
    executable = Path(current_executable or sys.executable)
    frozen = bool(getattr(sys, "frozen", False)) if is_frozen is None else is_frozen
    open_update = opener or open_downloaded_update
    launch_script = launcher or launch_cleanup_script

    open_update(update_path, platform_name)

    old_app_path = old_app_path_for_executable(executable, platform_name, frozen)
    if old_app_path is None or _same_path(old_app_path, update_path):
        return UpdateInstallPlan(update_path=update_path, old_app_path=None, cleanup_script=None)

    cleanup_script = write_cleanup_script(old_app_path, platform_name, temp_dir=temp_dir)
    if cleanup_script is None:
        return UpdateInstallPlan(update_path=update_path, old_app_path=None, cleanup_script=None)

    launch_script(cleanup_script, platform_name)
    return UpdateInstallPlan(update_path=update_path, old_app_path=old_app_path, cleanup_script=cleanup_script)


def old_app_path_for_executable(executable: Path, platform_name: str = sys.platform, is_frozen: bool = False) -> Path | None:
    if not is_frozen:
        return None

    executable = Path(executable)
    if platform_name.startswith("win"):
        return executable if executable.suffix.lower() == ".exe" else None

    if platform_name == "darwin":
        for path in (executable, *executable.parents):
            if path.suffix == ".app":
                return path

    return None


def open_downloaded_update(update_path: Path, platform_name: str = sys.platform) -> None:
    update_path = Path(update_path)
    if platform_name.startswith("win") and hasattr(os, "startfile"):
        os.startfile(str(update_path))  # type: ignore[attr-defined]
        return

    command = ["open", str(update_path)] if platform_name == "darwin" else ["xdg-open", str(update_path)]
    subprocess.Popen(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def write_cleanup_script(old_app_path: Path, platform_name: str = sys.platform, temp_dir: Path | None = None) -> Path | None:
    if platform_name.startswith("win"):
        return _write_windows_cleanup_script(old_app_path, temp_dir=temp_dir)
    if platform_name == "darwin":
        return _write_macos_cleanup_script(old_app_path, temp_dir=temp_dir)
    return None


def launch_cleanup_script(script_path: Path, platform_name: str = sys.platform) -> None:
    if platform_name.startswith("win"):
        creationflags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0) | getattr(subprocess, "DETACHED_PROCESS", 0)
        subprocess.Popen(
            ["cmd", "/c", str(script_path)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=creationflags,
        )
        return

    subprocess.Popen(
        ["/bin/sh", str(script_path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
    )


def _write_windows_cleanup_script(old_app_path: Path, temp_dir: Path | None = None) -> Path:
    script_path = _cleanup_script_dir(temp_dir) / "cleanup_order_quick_read.cmd"
    script_path.write_text(
        "\n".join(
            [
                "@echo off",
                f'set "OLD_PATH={old_app_path}"',
                "for /l %%i in (1,1,60) do (",
                '  del /f /q "%OLD_PATH%" >nul 2>nul',
                '  if not exist "%OLD_PATH%" goto done',
                "  timeout /t 1 /nobreak >nul",
                ")",
                ":done",
                'del "%~f0" >nul 2>nul',
                "",
            ]
        ),
        encoding="utf-8",
    )
    return script_path


def _write_macos_cleanup_script(old_app_path: Path, temp_dir: Path | None = None) -> Path:
    script_path = _cleanup_script_dir(temp_dir) / "cleanup_order_quick_read.sh"
    script_path.write_text(
        "\n".join(
            [
                "#!/bin/sh",
                f"OLD_PATH={_shell_quote(str(old_app_path))}",
                "i=0",
                'while [ "$i" -lt 60 ]; do',
                '  rm -rf "$OLD_PATH" 2>/dev/null',
                '  [ ! -e "$OLD_PATH" ] && break',
                "  sleep 1",
                "  i=$((i + 1))",
                "done",
                'rm -f "$0" 2>/dev/null',
                "",
            ]
        ),
        encoding="utf-8",
    )
    script_path.chmod(script_path.stat().st_mode | stat.S_IXUSR)
    return script_path


def _cleanup_script_dir(temp_dir: Path | None = None) -> Path:
    base_dir = Path(temp_dir or tempfile.gettempdir()) / "OrderQuickReadUpdate"
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def _same_path(left: Path, right: Path) -> bool:
    try:
        return left.resolve(strict=False) == right.resolve(strict=False)
    except OSError:
        return left.absolute() == right.absolute()


def _shell_quote(value: str) -> str:
    return "'" + value.replace("'", "'\"'\"'") + "'"
