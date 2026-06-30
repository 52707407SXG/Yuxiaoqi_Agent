# Xiaoqi Operation Runbook

## Local Verification

```bash
pnpm xiaoqi --version
pnpm xiaoqi health
pnpm xiaoqi:test
pnpm xiaoqi:scan:brand
pnpm xiaoqi:scan:secrets
pnpm xiaoqi:verify
```

## Local Mock Server

```bash
pnpm xiaoqi:serve
```

Default URL: `http://127.0.0.1:3417`

This is a local mock runtime only. Do not bind it as a production service.

## Endpoint Checks

- `GET /health`: confirms Xiaoqi brand, prompt loading, registered tools, and provider disabled status.
- `POST /plan`: returns work spec draft, missing questions, source use plan, and ToolPlan.
- `POST /chat`: returns a Xiaoqi planning reply plus plan state.
- `POST /execute`: validates ToolRegistry input and returns confirmation or dry-run result.
- `GET /status?taskId=...`: reads in-memory mock task status.

## Must Not Touch

- `/opt/xiaoqi-agent`
- `/var/lib/xiaoqi`
- `xiaoqi-agent.service`
- Provider credentials or browser login state
- Real Provider APIs or CLIs
- My Stand SQLite, WAL, SHM, attachment directories, or real `file_assets`
- dev-preview or production release channels
- Old local directories, old keys, old cookies, old memories, or old runtime configs

## Source And License

Upstream source attribution is recorded in `XIAOQI-BASELINE.md`. The source is OpenClaw commit `738b2be4b49b0182788e70abb5454faf82407a2d`, package version `2026.6.10`, MIT license, with `LICENSE` and `THIRD_PARTY_NOTICES.md` retained at repository root.

## Failure Handling

Stop and escalate for review if:

- The fixed source commit cannot be fetched.
- License is not MIT or required notice files are missing.
- GitHub permission fails.
- Any key, cookie, token, or private user data appears in the worktree.
- Continuing requires a real Provider call.
- Continuing requires deployment or service installation.
