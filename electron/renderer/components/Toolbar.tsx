type Props = {
  disabled: boolean;
  email: string;
  onRefresh(): void;
  onScanAll(): void;
  onCheckUpdate(): void;
  onEditSettings(): void;
};

export function Toolbar({ disabled, email, onRefresh, onScanAll, onCheckUpdate, onEditSettings }: Props) {
  return (
    <section className="panel toolbar">
      <strong className="account-email">{email}</strong>
      <div className="toolbar-actions">
        <button type="button" className="primary" disabled={disabled} onClick={onRefresh}>
          刷新
        </button>
        <button type="button" disabled={disabled} onClick={onScanAll}>
          扫描全部邮件
        </button>
        <button type="button" disabled={disabled} onClick={onCheckUpdate}>
          检查更新
        </button>
        <button type="button" disabled={disabled} onClick={onEditSettings}>
          修改邮箱设置
        </button>
      </div>
    </section>
  );
}
