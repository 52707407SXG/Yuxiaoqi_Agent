# Xiaoqi Agent Work Log

## 2026-07-02 Creative Studio Material Guidance

Status: deployed on the My Stand server.

Scope:

- Updated Xiaoqi kernel prompt and DeepSeek director chat system prompt for the My Stand Creative Studio handoff.
- When materials or SourceBrief context exists, Xiaoqi should acknowledge the useful material points briefly, then ask what the user wants to make and clarify platform, audience, style, goal, and output standard.
- When no material exists, Xiaoqi should keep the reply short and guide the user to the left-side material assistant/material box to upload files, paste links, or enter a search/organizing request.

Verified:

- `npm test`
- `npm run build`
- My Stand production guest `/api/creative-studio/chat` returns through `mystand-to-xiaoqi / deepseek-v4-pro` and mentions the left-side material box when no source is available.

Not touched:

- No real `/execute` Provider call from Xiaoqi.
- No real M-dou charge from Xiaoqi.
- No My Stand SQLite, attachment, or file asset write from Xiaoqi.
- No API key, cookie, token, or login state committed to Git.

## 2026-07-02 My Stand Director Chat Deployment

Status: deployed on the My Stand server.

Scope:

- Added DeepSeek-backed director chat for `/chat` when `XIAOQI_LLM_PROVIDER=deepseek` and a server-side API key is configured.
- Kept `/execute`, Jimeng/Dreamina, ffmpeg, billing, and artifact writes behind the existing confirmation and dry-run boundaries.
- Added `directorChat` health metadata so My Stand can see whether director chat is configured.
- Changed HTTP smoke to use a random local port by default so verification can run while `xiaoqi-agent.service` owns `127.0.0.1:8788`.
- Updated the Jimeng adapter command preview to the actual Dreamina CLI command name.
- Deployed `xiaoqi-agent.service` bound to `127.0.0.1:8788`.

Verified:

- `npm run verify`
- `GET /health`
- `POST /chat` with confirmed SourceBrief context

Not touched:

- No real `/execute` Provider call from Xiaoqi.
- No real M-dou charge from Xiaoqi.
- No My Stand SQLite, attachment, or file asset write from Xiaoqi.
- No API key, cookie, token, or login state committed to Git.

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
