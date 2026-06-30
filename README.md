# 余小柒 / Xiaoqi Agent

小七，正式中文名“余小柒”，工程名 `Xiaoqi Agent`，是面向 My Stand 的房产内容作品导演 Agent。

v0.4.2 是部署前确认流修复包：仓库 main 已收敛为小七独立交付面，第三方拉取后可以安装、构建、启动、验证、阅读运行说明。当前版本仍是 local mock runtime，不部署服务器、不配置真实 Provider、不调用真实生成、不扣真实 M豆、不写 My Stand SQLite 或真实资产。

## Requirements

- Node.js `>=22.19.0`
- npm `>=11`
- Git

小七 v0.4.2 没有运行时 npm 依赖。Node 负责运行仓库内版本化的 `.ts` 源码，`build` 会做语法检查并生成 `dist/xiaoqi/cli.mjs` 包装入口；`npm start` 使用这个 build 产物启动。

## Install

```bash
git clone git@github.com:52707407SXG/Yuxiaoqi_Agent.git
cd Yuxiaoqi_Agent
npm install --package-lock=false --ignore-scripts
npm run build
```

## Start

默认只绑定本机回环地址：

```bash
npm start
```

`npm start` 依赖 `npm run build` 生成的 `dist/xiaoqi/cli.mjs`。直接开发调试也可以使用 `node xiaoqi.mjs serve --host 127.0.0.1 --port 8788`。

默认监听：

```txt
http://127.0.0.1:8788
```

可选环境变量：

```bash
XIAOQI_HOST=127.0.0.1
XIAOQI_PORT=8788
XIAOQI_LOG_LEVEL=info
XIAOQI_PROVIDER_MODE=mock
```

`XIAOQI_PROVIDER_MODE` 在 v0.4.2 只允许 mock 语义。真实 Provider 需要后续单独授权和审查。

## CLI

```bash
node xiaoqi.mjs --version
node xiaoqi.mjs health
node xiaoqi.mjs plan < request.json
node xiaoqi.mjs serve --host 127.0.0.1 --port 8788
```

## HTTP API

- `GET /health`
- `POST /plan`
- `POST /chat`
- `POST /execute`
- `GET /status?taskId=...`
- `POST /billing`
- `GET /billing/status?billingId=...`

HTTP runtime 行为：

- body 上限：128 KiB
- 非法 JSON：`400 invalid_json`
- 超大请求：`413 request_too_large`
- 不支持方法：`405 method_not_allowed`
- 错误响应不返回堆栈
- `/execute` 使用 `projectId + sessionId + toolName + idempotencyKey` 去重，并允许 My Stand 后端用同一个业务 `idempotencyKey` 完成 `awaiting_confirmation` 到 `dry_run_completed` 的确认推进
- `/status` 稳定读回 mock task
- `/billing` 支持 M豆 mock `estimate/reserve/settle/refund/cancel`，永不真实扣费

`/execute` 确认流：

1. 第一次 `confirmed:false` 返回 `202 awaiting_confirmation`，`billing.status=estimate`。
2. 第二次同 key `confirmed:true` 推进同一个 task，返回 `200 dry_run_completed`，`providerCalled=false`，`billing.status=reserve`。
3. 后续同 key `confirmed:true` 复用已确认 task，不新建 task，不重复 reserve。
4. `/status?taskId=...` 读回推进后的最终状态。

## Verify

```bash
npm run build
npm test
npm run xiaoqi:scan:brand
npm run xiaoqi:scan:secrets
npm run xiaoqi:smoke:http
npm run xiaoqi:fresh-clone
npm run verify
```

`npm run verify` 覆盖 build、单测、品牌扫描、密钥扫描、CLI version、CLI health、HTTP smoke、fresh clone 安装构建检查。

## My Stand Bridge

My Stand 后端应作为唯一调用方：

```txt
My Stand backend
  -> 127.0.0.1:8788 /plan /chat /execute /status /billing
  -> authorization, audit, M-dou confirmation, asset registration
  -> controlled Provider adapter
```

前端不得直连小七。小七不得绕过 My Stand 后端读取用户资料、访问数据库、扫描目录、读取密钥或写真实资产。

## Provider Boundary

v0.4.2 只提供 dry-run adapter 骨架：

- image/video generation adapter plan
- whitelist media transcode adapter plan
- audio TTS/ASR contract plan
- artifact inspection contract

所有真实 Provider、外部 CLI、批量生成、长视频、扣 M豆动作都必须先返回 ToolPlan，等待 My Stand 后端确认。

## Source And License

固定来源、baseline commit/tag、license 和 notice 证明写在 `XIAOQI-BASELINE.md`。根目录保留 `LICENSE` 和 `THIRD_PARTY_NOTICES.md`。

## Runbook

完整运行、systemd 模板、日志、健康检查、回滚、My Stand 桥接验证和禁用边界见 `docs/operation-runbook.md`。
