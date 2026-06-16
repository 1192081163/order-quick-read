# 订单快读

Order Quick Read is a minimal Electron desktop app for reading Enterprise WeChat/Tencent Exmail order emails and Excel attachments.

## 功能

- 默认使用企业微信邮箱 IMAP：`imap.exmail.qq.com:993`。
- 读取邮件里的 `.xlsx`、`.xlsm`、`.xls` 附件。
- 前台只显示两列：`订单号` 和 `截至时间`。
- 按截止时间排序，并支持按订单号、发送日期筛选。
- 邮箱和授权码保存到本机，启动后自动填入；配置完整后设置区自动收起。
- 每 30 秒自动刷新新邮件，也可以手动刷新或扫描全部邮件。
- 发现新增订单或截止时间变化时发出系统通知。
- 启动时静默检查 GitHub Release，也可以点击 `检查更新`；发现新版后下载到本机并打开安装包。

## 本地数据

Electron 版使用系统应用数据目录：

```text
Windows: %APPDATA%\Order Quick Read\settings.json
macOS: ~/Library/Application Support/Order Quick Read/settings.json
```

订单缓存保存在同一目录的 `order_cache.json`。缓存只保存提取后的订单信息，不保存邮件正文或附件文件。

旧版 Python 应用的配置会自动迁移：

```text
Windows: %APPDATA%\EmailOrderReader\settings.json
macOS/Linux: ~/.email-order-reader/settings.json
```

授权码是本地 JSON 保存，不写入系统钥匙串。

## 开发

```bash
npm ci
npm run electron:dev
```

常用检查：

```bash
npm run electron:test
npm run electron:typecheck
npm run electron:build:main
```

旧版 Python 测试仍可运行：

```bash
python -m pytest -q
```

## 本地打包

```bash
npm run electron:build
```

产物输出到：

```text
dist-electron-packages/
```

## GitHub Release 下载

推送到 `main` 后，GitHub Actions 会构建并发布：

```text
OrderQuickReadSetup.exe
OrderQuickRead-macos-x64.dmg
OrderQuickRead-macos-arm64.dmg
```

Windows 用户下载 `OrderQuickReadSetup.exe`，双击安装。

macOS Intel 下载 `OrderQuickRead-macos-x64.dmg`；Apple Silicon 下载 `OrderQuickRead-macos-arm64.dmg`。

当前内部版本未做 Apple Developer ID 签名和 notarization。macOS 首次打开如果提示无法验证，需要右键 `Order Quick Read.app`，选择 `打开` 后确认。
