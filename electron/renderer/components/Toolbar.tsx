import {
  Badge,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Text,
  Title3,
} from "@fluentui/react-components";

type Props = {
  disabled: boolean;
  email: string;
  onRefresh(): void;
  onScanAll(): void;
  onClearCache(): void;
  onCheckUpdate(): void;
  onEditSettings(): void;
};

export function Toolbar({ disabled, email, onRefresh, onScanAll, onClearCache, onCheckUpdate, onEditSettings }: Props) {
  return (
    <section className="panel toolbar" role="region" aria-label="邮箱工具栏">
      <div className="toolbar-title">
        <Title3 as="h1">订单快读</Title3>
        <div className="account-line">
          <Badge appearance="tint" color="brand">
            已连接
          </Badge>
          <Text className="account-email">{email}</Text>
        </div>
      </div>
      <div className="toolbar-actions">
        <Button appearance="primary" disabled={disabled} onClick={onRefresh}>
          刷新
        </Button>
        <Button disabled={disabled} onClick={onScanAll}>
          同步近一个月
        </Button>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <MenuButton disabled={disabled}>更多操作</MenuButton>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem disabled={disabled} onClick={onClearCache}>
                清空缓存
              </MenuItem>
              <MenuItem disabled={disabled} onClick={onCheckUpdate}>
                检查更新
              </MenuItem>
              <MenuItem disabled={disabled} onClick={onEditSettings}>
                修改邮箱设置
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </section>
  );
}
