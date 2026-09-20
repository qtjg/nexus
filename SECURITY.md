# Security policy

## Reporting a vulnerability

Use GitHub's private vulnerability reporting:
[Report a vulnerability](https://github.com/qtjg/nexus/security/advisories/new).

Please do not open a public issue for anything that could put users at risk
before a fix ships.

## Scope

In scope:

- The CLI and its command surface
- Any path that could leak secrets, tokens, or source code
- Dependency resolution and package handling

Out of scope:

- Behavior of third-party packages consumed by nexus

## Supported versions

Fixes ship to `main` and the latest release. Older releases are not patched.
