# Xiaoqi Agent Work Log

## 2026-06-30 v0.4.1 Local Agent Repair

Status: implemented locally for review.

Scope:

- Cleaned main branch to a Xiaoqi-only delivery surface.
- Kept source baseline, license, and notices in dedicated provenance files.
- Standardized local runtime port to `127.0.0.1:8788`.
- Added safe HTTP body handling, invalid JSON handling, oversized request handling, method handling, and stack-free errors.
- Added ToolRegistry unknown-field rejection.
- Added execute idempotency and stable status readback.
- Added M-dou mock `estimate/reserve/settle/refund/cancel` contract with `realCharge: false`.
- Added build, HTTP smoke, fresh clone, brand scan, secret scan, and verify scripts.
- Expanded README and runbook for third-party installation, build, start, verification, systemd template, My Stand bridge, rollback, and Provider boundaries.

Not touched:

- No server deployment.
- No server runtime directory creation.
- No service creation or restart.
- No real Provider configuration.
- No real Provider call.
- No real generated asset.
- No real M-dou charge.
- No My Stand database or asset write.
