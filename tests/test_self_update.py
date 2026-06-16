from __future__ import annotations

from pathlib import Path

from email_order_reader.self_update import (
    install_downloaded_update,
    old_app_path_for_executable,
)


def test_windows_install_opens_new_exe_and_schedules_old_exe_cleanup(tmp_path):
    old_exe = tmp_path / "old" / "OrderQuickRead.exe"
    new_exe = tmp_path / "downloads" / "OrderQuickRead-1.exe"
    old_exe.parent.mkdir()
    new_exe.parent.mkdir()
    old_exe.write_bytes(b"old")
    new_exe.write_bytes(b"new")
    opened = []
    launched = []

    plan = install_downloaded_update(
        new_exe,
        platform_name="win32",
        current_executable=old_exe,
        is_frozen=True,
        temp_dir=tmp_path,
        opener=lambda path, platform_name: opened.append((path, platform_name)),
        launcher=lambda script_path, platform_name: launched.append((script_path, platform_name)),
    )

    assert opened == [(new_exe, "win32")]
    assert len(launched) == 1
    assert launched[0][1] == "win32"
    assert plan.old_app_path == old_exe
    assert plan.cleanup_script is not None
    assert plan.cleanup_script.suffix == ".cmd"
    script = plan.cleanup_script.read_text(encoding="utf-8")
    assert str(old_exe) in script
    assert "del /f /q" in script


def test_install_does_not_delete_current_file_when_download_path_matches_old_exe(tmp_path):
    current_exe = tmp_path / "OrderQuickRead.exe"
    current_exe.write_bytes(b"same")
    launched = []

    plan = install_downloaded_update(
        current_exe,
        platform_name="win32",
        current_executable=current_exe,
        is_frozen=True,
        temp_dir=tmp_path,
        opener=lambda _path, _platform_name: None,
        launcher=lambda script_path, platform_name: launched.append((script_path, platform_name)),
    )

    assert plan.old_app_path is None
    assert plan.cleanup_script is None
    assert launched == []


def test_macos_old_app_path_is_top_level_app_bundle():
    executable = Path("/Applications/Order Quick Read.app/Contents/MacOS/Order Quick Read")

    assert old_app_path_for_executable(executable, platform_name="darwin", is_frozen=True) == Path(
        "/Applications/Order Quick Read.app"
    )


def test_development_install_opens_update_without_cleanup(tmp_path):
    downloaded = tmp_path / "OrderQuickRead.exe"
    downloaded.write_bytes(b"new")
    opened = []
    launched = []

    plan = install_downloaded_update(
        downloaded,
        platform_name="win32",
        current_executable=Path("/usr/bin/python"),
        is_frozen=False,
        temp_dir=tmp_path,
        opener=lambda path, platform_name: opened.append((path, platform_name)),
        launcher=lambda script_path, platform_name: launched.append((script_path, platform_name)),
    )

    assert opened == [(downloaded, "win32")]
    assert plan.old_app_path is None
    assert plan.cleanup_script is None
    assert launched == []
