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

## 2026-07-01 v0.4.2 Execute Confirmation Repair

Status: implemented locally for review.

Scope:

- Fixed `/execute` idempotent confirmation flow for `projectId + sessionId + toolName + idempotencyKey`.
- First `confirmed:false` call returns `awaiting_confirmation` with M-dou mock `estimate`.
- Later same-key `confirmed:true` upgrades the same task to `dry_run_completed`, keeps `providerCalled:false`, and records one mock `reserve`.
- Repeated same-key `confirmed:true` reuses the upgraded task and reserve billing entry.
- `/status` reads back the upgraded final task.
- Added unit and HTTP smoke coverage for the confirmation flow.
- Documented My Stand backend confirmation semantics in README and tool contract docs.
- Fixed install docs and fresh clone check to use `npm install --package-lock=false --ignore-scripts`.
- Clarified that `npm start` uses the build-generated `dist/xiaoqi/cli.mjs` wrapper.

Not touched:

- No server deployment.
- No server runtime directory creation.
- No service creation or restart.
- No real Provider configuration.
- No real Provider call.
- No real generated asset.
- No real M-dou charge.
- No My Stand database, attachment, or asset write.
