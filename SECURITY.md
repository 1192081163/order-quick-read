# Security Policy

## Supported Versions

Security updates are provided for the latest commit on the `main` branch and
the latest GitHub Release build.

## Reporting a Vulnerability

Please report security issues privately through GitHub Security Advisories when
available. If advisories are not enabled for your fork, open a minimal issue
that says you have a security report without posting exploit details.

Include:

- Affected platform and app version.
- Steps to reproduce.
- Expected and actual impact.
- Whether the issue requires a malicious email, attachment, local user, or
  network attacker.

## Credential Storage

The app stores the configured email address and mailbox authorization code in
the local application data directory as JSON. It does not currently store the
authorization code in macOS Keychain or Windows Credential Manager.

Do not commit local `settings.json`, `order_cache.json`, downloaded
attachments, packaged installers, or generated build output.
