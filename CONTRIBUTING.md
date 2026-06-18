# Contributing

Thanks for helping improve Order Quick Read.

## Development Setup

```bash
npm ci
npm run electron:dev
```

## Checks

Run these before opening a pull request:

```bash
npm run electron:typecheck
npm run electron:test
npm audit
```

For packaging checks:

```bash
npm run electron:pack
```

## Pull Requests

- Keep changes focused.
- Add or update tests for behavior changes.
- Do not commit local email credentials, caches, downloaded attachments, or
  generated build output.
- Keep Electron publishing separated from packaging; CI builds installers with
  `--publish never` and publishes releases in a later step.
