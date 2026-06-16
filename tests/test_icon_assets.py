from pathlib import Path


def test_packaging_icon_assets_exist():
    assert Path("assets/app_icon.png").is_file()
    assert Path("assets/app_icon.ico").is_file()
    assert Path("assets/app_icon.icns").is_file()


def test_packaging_icon_assets_are_not_empty():
    assert Path("assets/app_icon.png").stat().st_size > 1000
    assert Path("assets/app_icon.ico").stat().st_size > 1000
    assert Path("assets/app_icon.icns").stat().st_size > 1000
