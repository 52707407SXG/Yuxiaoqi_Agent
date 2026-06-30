# 余小柒 / Xiaoqi Agent

小七，正式中文名“余小柒”，工程名 `Xiaoqi Agent`，是面向 My Stand 的房产内容作品导演 Agent。

当前仓库是 v0.4 本地首版改造：基于固定上游源码 baseline 建立独立仓库身份，落地 runtime 可加载 prompt、工具契约、mock runtime、mock HTTP 接口、测试、扫描和审查文档。首版只做本地 mock，不部署服务，不配置 Provider，不调用真实生成工具，不写 My Stand SQLite 或真实 `file_assets`。

## 本地使用

```bash
pnpm xiaoqi --version
pnpm xiaoqi health
pnpm xiaoqi:serve
pnpm xiaoqi:verify
```

本地 mock server 默认监听 `127.0.0.1:3417`，提供：

- `GET /health`
- `POST /plan`
- `POST /chat`
- `POST /execute`
- `GET /status?taskId=...`

所有高成本工具、真实 Provider、外部 CLI 和扣 M豆动作都会停在 ToolPlan 或 dry-run，不会真实执行。

## 首版落地范围

- 品牌：根包名、二进制入口、README、runtime health、prompt 和文档使用小七 / 余小柒 / Xiaoqi Agent。
- Prompt：`prompts/kernel.system.md`、8 个 mode prompt、2 个 inspection prompt，由 `xiaoqi/src/prompts/loader.ts` 加载。
- 工具契约：`xiaoqi/src/contracts/toolRegistry.ts` 定义工具类型、schema 和注册信息。
- Adapter：`xiaoqi/src/providers/` 提供即梦 CLI 与 ffmpeg 的 dry-run 骨架。
- Runtime：`xiaoqi/src/runtime/server.ts` 提供 health / plan / chat / execute / status mock 接口。
- 测试：`xiaoqi/tests/` 覆盖 prompt、tool contract 和 mock runtime。
- 扫描：`scripts/xiaoqi-brand-scan.mjs`、`scripts/xiaoqi-secret-scan.mjs`。

## 上游来源

本仓库 baseline 来自 OpenClaw 的固定 commit：

- source commit: `738b2be4b49b0182788e70abb5454faf82407a2d`
- package version: `2026.6.10`
- license: MIT
- baseline commit in this repository: `bec7f82900d2052b2098b5b8f1eb1e4191d1b612`
- baseline branch/tag: `xiaoqi-openclaw-baseline-2026-06-30-738b2be`

`LICENSE` 和 `THIRD_PARTY_NOTICES.md` 保留在仓库根目录，用于审查上游 license 和第三方 notices。

## 禁止边界

v0.4 本地首版禁止：

- 创建 `/opt/xiaoqi-agent` 或 `/var/lib/xiaoqi`。
- 创建或启动 `xiaoqi-agent.service`。
- 配置 DeepSeek、百炼、即梦 CLI、ComfyUI、ffmpeg、TTS、ASR 或任何 Provider 密钥/登录态。
- 调用真实 Provider。
- 写 My Stand SQLite、WAL、SHM、附件目录或真实 `file_assets`。
- 发布 dev-preview 或 production。
- 携带旧本地目录、旧 key、旧 cookie、旧记忆或旧配置进入小七。

## 审查文档

- [Baseline](XIAOQI-BASELINE.md)
- [Prompt System](docs/prompt-system.md)
- [Tool Contract](docs/tool-contract.md)
- [Operation Runbook](docs/operation-runbook.md)
