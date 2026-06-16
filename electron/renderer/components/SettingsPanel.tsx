import type { AppSettings } from "../../shared/types";

type Props = {
  disabled: boolean;
  settings: AppSettings;
  onChange(settings: AppSettings): void;
  onSave(): void;
  onScanAll(): void;
};

export function SettingsPanel({ disabled, settings, onChange, onSave, onScanAll }: Props) {
  return (
    <section className="panel settings-panel">
      <label>
        邮箱
        <input
          autoComplete="username"
          disabled={disabled}
          value={settings.email}
          onChange={(event) => onChange({ ...settings, email: event.target.value })}
        />
      </label>
      <label>
        授权码
        <input
          autoComplete="current-password"
          disabled={disabled}
          type="password"
          value={settings.authCode}
          onChange={(event) => onChange({ ...settings, authCode: event.target.value })}
        />
      </label>
      <div className="button-row">
        <button type="button" disabled={disabled} onClick={onSave}>
          保存设置
        </button>
        <button type="button" className="primary" disabled={disabled} onClick={onScanAll}>
          扫描全部邮件
        </button>
      </div>
    </section>
  );
}
