# Xiaoqi Agent v0.4 Baseline

## Fixed Source

- Upstream project: OpenClaw
- Upstream commit: `738b2be4b49b0182788e70abb5454faf82407a2d`
- Upstream package version: `2026.6.10`
- Upstream license: MIT
- Required files present: `LICENSE`, `THIRD_PARTY_NOTICES.md`

## Repository Baseline

- Repository baseline commit: `bec7f82900d2052b2098b5b8f1eb1e4191d1b612`
- Repository baseline branch: `xiaoqi-openclaw-baseline-2026-06-30-738b2be`
- Repository baseline tag: `xiaoqi-openclaw-baseline-2026-06-30-738b2be`
- Baseline tree: exact tree copied from upstream commit `738b2be4b49b0182788e70abb5454faf82407a2d`

## v0.4 Rule

From this baseline forward, Xiaoqi Agent development is pinned to the exact upstream source commit above. Later upstream main changes do not block v0.4 local first-version work.

## First Xiaoqi Delta

The first Xiaoqi delta is intentionally local-only:

- Xiaoqi brand and runtime entry.
- Runtime-loadable prompt package.
- Tool registry, schemas, adapter skeletons, and tests.
- Local mock runtime and mock HTTP endpoints.
- Documentation, brand scan, and secret scan.

No server deployment, real Provider, Provider credential, My Stand SQLite write, real `file_assets` write, systemd service, `/opt/xiaoqi-agent`, or `/var/lib/xiaoqi` path is required for this delta.
