# Xiaoqi Operation Runbook

## Install From GitHub

```bash
git clone git@github.com:52707407SXG/Yuxiaoqi_Agent.git
cd Yuxiaoqi_Agent
npm install --ignore-scripts
npm run build
```

## Local Start

```bash
XIAOQI_HOST=127.0.0.1 XIAOQI_PORT=8788 npm start
```

Health check:

```bash
curl -fsS http://127.0.0.1:8788/health
```

## Verify

```bash
npm run verify
```

The verification chain covers:

- syntax/build check
- unit tests
- brand scan
- secret scan
- CLI version
- CLI health
- HTTP smoke
- fresh clone install/build check

## Systemd Template

This template is documentation only. Do not create or start the service before deployment approval.

```ini
[Unit]
Description=Xiaoqi Agent local runtime
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/xiaoqi-agent
Environment=XIAOQI_HOST=127.0.0.1
Environment=XIAOQI_PORT=8788
Environment=XIAOQI_PROVIDER_MODE=mock
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

## Logs

For local foreground runs, logs go to stdout/stderr. For a future systemd deployment:

```bash
journalctl -u xiaoqi-agent.service -n 100 --no-pager
journalctl -u xiaoqi-agent.service -f
```

Logs must not include credentials, cookies, tokens, raw private customer data, local private paths, or Provider login state.

## My Stand Bridge Verification

Backend smoke sequence:

```bash
curl -fsS http://127.0.0.1:8788/health
curl -fsS -X POST http://127.0.0.1:8788/plan \
  -H 'content-type: application/json' \
  --data '{"idempotencyKey":"bridge-plan","workType":"video","platform":"抖音","goal":"楼盘讲解获客","materials":[{"assetRef":"asset_mock"}]}'
```

Rules:

- My Stand backend performs user auth, project permission, audit, M-dou confirmation, and final asset registration.
- Browser UI never calls Xiaoqi directly.
- Xiaoqi never reads My Stand database files or attachment directories.
- Xiaoqi only sees authorized SourceBrief and asset refs supplied by the backend.

## Rollback

1. Stop the foreground process or future service.
2. Check the last known good Git commit.
3. Reset the working checkout to that commit only after review approval.
4. Run `npm run build` and `npm run verify`.
5. Start on `127.0.0.1:8788` and re-check `/health`.

## Forbidden In v0.4.1

- No server deployment.
- No server runtime directory creation.
- No systemd service creation or restart.
- No real Provider credentials.
- No real Provider calls.
- No real generated media.
- No real M-dou charging.
- No My Stand database, WAL, SHM, attachment, or asset writes.
- No dev-preview or production release.
