from email_order_reader.settings import AppSettings, load_settings, save_settings


def test_save_and_load_settings_round_trip(tmp_path):
    path = tmp_path / "settings.json"
    settings = AppSettings(email="buyer@example.com", auth_code="secret")

    save_settings(settings, path)
    loaded = load_settings(path)

    assert loaded == settings


def test_load_settings_returns_empty_for_missing_file(tmp_path):
    loaded = load_settings(tmp_path / "missing.json")

    assert loaded == AppSettings()


def test_load_settings_ignores_invalid_json(tmp_path):
    path = tmp_path / "settings.json"
    path.write_text("{bad json", encoding="utf-8")

    loaded = load_settings(path)

    assert loaded == AppSettings()
