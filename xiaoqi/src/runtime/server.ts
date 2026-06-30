import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  listToolDefinitions,
  type ToolName,
  validateToolInput,
} from "../contracts/toolRegistry.ts";
import { loadPromptBundle } from "../prompts/loader.ts";
import { planFfmpegInvocation, type FfmpegOperation } from "../providers/ffmpeg/ffmpegAdapter.ts";
import { executeJimengCliDryRun } from "../providers/jimeng/jimengCliAdapter.ts";
import { createToolInvocationRecord, createToolPlan } from "../tools/invocation.ts";
import { createXiaoqiRuntimeState, type XiaoqiRuntimeState } from "./state.ts";
import {
  type ChatRequest,
  type ChatResponse,
  type ExecuteRequest,
  type ExecuteResponse,
  type HealthResponse,
  type PlanRequest,
  type PlanResponse,
} from "./types.ts";

export type XiaoqiServerOptions = {
  version?: string;
  state?: XiaoqiRuntimeState;
};

export function createXiaoqiServer(options: XiaoqiServerOptions = {}): Server {
  const state = options.state ?? createXiaoqiRuntimeState();
  const version = options.version ?? "0.4.0";

  return createServer(async (request, response) => {
    try {
      await routeRequest({ request, response, state, version });
    } catch (error) {
      writeJson(response, 500, {
        error: "xiaoqi_internal_error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}

async function routeRequest(args: {
  request: IncomingMessage;
  response: ServerResponse;
  state: XiaoqiRuntimeState;
  version: string;
}): Promise<void> {
  const url = new URL(args.request.url ?? "/", "http://127.0.0.1");

  if (args.request.method === "GET" && url.pathname === "/health") {
    writeJson(args.response, 200, await buildHealth(args.version));
    return;
  }

  if (args.request.method === "POST" && url.pathname === "/plan") {
    const body = await readJson<PlanRequest>(args.request);
    writeJson(args.response, 200, buildPlan(body, args.state));
    return;
  }

  if (args.request.method === "POST" && url.pathname === "/chat") {
    const body = await readJson<ChatRequest>(args.request);
    writeJson(args.response, 200, buildChat(body, args.state));
    return;
  }

  if (args.request.method === "POST" && url.pathname === "/execute") {
    const body = await readJson<ExecuteRequest>(args.request);
    const result = buildExecute(body, args.state);
    writeJson(args.response, result.status === "awaiting_confirmation" ? 202 : 200, result);
    return;
  }

  if (args.request.method === "GET" && url.pathname === "/status") {
    const taskId = url.searchParams.get("taskId");
    if (!taskId) {
      writeJson(args.response, 400, { error: "taskId_required" });
      return;
    }

    const task = args.state.getTask(taskId);
    writeJson(args.response, task ? 200 : 404, task ?? { error: "task_not_found" });
    return;
  }

  if (args.request.method === "GET" && url.pathname.startsWith("/status/")) {
    const taskId = decodeURIComponent(url.pathname.slice("/status/".length));
    const task = args.state.getTask(taskId);
    writeJson(args.response, task ? 200 : 404, task ?? { error: "task_not_found" });
    return;
  }

  writeJson(args.response, 404, { error: "not_found" });
}

export async function buildHealth(version: string): Promise<HealthResponse> {
  const prompts = await loadPromptBundle();
  const tools = listToolDefinitions();
  return {
    ok: true,
    agent: "Xiaoqi Agent",
    displayName: "余小柒",
    shortName: "小七",
    version,
    mode: "local-mock",
    providerCalls: "disabled",
    prompt: {
      kernelLoaded: prompts.kernel.includes("Xiaoqi Agent"),
      modeCount: Object.keys(prompts.modes).length,
    },
    tools: {
      registered: tools.length,
      confirmRequired: tools.filter((tool) => tool.confirmRequired).length,
    },
  };
}

export function buildPlan(request: PlanRequest, state: XiaoqiRuntimeState): PlanResponse {
  const idempotencyKey = request.idempotencyKey ?? request.messageId ?? JSON.stringify(request);
  return state.getOrCreatePlan(`plan:${idempotencyKey}`, () => {
    const missingQuestions = [
      request.workType ? null : "这次要做哪一种作品：图文、短视频、PPT、报告、播客还是口播稿？",
      request.platform ? null : "目标发布平台和尺寸规格是什么？",
      request.goal
        ? null
        : "作品要达成的核心目标是什么：获客、成交复盘、楼盘讲解、培训还是品牌展示？",
      request.materials?.length ? null : "有哪些已授权素材或资料摘要可以使用？",
    ].filter((item): item is string => Boolean(item));

    return {
      planId: randomUUID(),
      reused: false,
      state: missingQuestions.length ? "Clarify" : "ToolPlan",
      currentUnderstanding: [
        "小七将以房产内容作品导演身份处理本次需求。",
        request.workType ? `作品类型：${request.workType}` : "作品类型待确认。",
        request.platform ? `平台：${request.platform}` : "平台待确认。",
        request.goal ? `目标：${request.goal}` : "目标待确认。",
      ].join(" "),
      missingQuestions,
      workSpecDraft: {
        workType: request.workType ?? "pending",
        platform: request.platform ?? "pending",
        goal: request.goal ?? "pending",
        audience: request.audience ?? "real-estate-clients",
        constraints: request.constraints ?? {},
      },
      sourceUsePlan: [
        "只使用 My Stand 后端传入的 SourceBrief 和授权 asset ref。",
        "不扫描服务器目录，不读取 SQLite，不读取 cookie、token 或旧记忆。",
        "所有生成产物只返回受控临时引用，最终由 My Stand 后端登记资产。",
      ],
      toolPlan: [
        createToolPlan("source.read"),
        createToolPlan("prompt.compose"),
        createToolPlan(request.workType === "video" ? "video.generate" : "image.generate"),
        createToolPlan("artifact.inspect"),
      ],
      nextAction: missingQuestions.length
        ? "ask_clarifying_question"
        : "wait_for_backend_confirmation",
    };
  });
}

export function buildChat(request: ChatRequest, state: XiaoqiRuntimeState): ChatResponse {
  const plan = buildPlan(request, state);
  if (plan.missingQuestions.length) {
    return {
      state: "Clarify",
      reply: `我先把作品方向收束一下：${plan.missingQuestions[0]}`,
      plan,
    };
  }

  return {
    state: "ToolPlan",
    reply:
      "我已形成首版作品规格和工具计划。真实生成、外部 CLI、扣 M豆或批量动作都需要 My Stand 后端确认后才会继续。",
    plan,
  };
}

export function buildExecute(request: ExecuteRequest, state: XiaoqiRuntimeState): ExecuteResponse {
  const validation = validateToolInput(request.toolName, request.input);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  const context = {
    projectId: request.projectId ?? "local-project",
    sessionId: request.sessionId ?? "local-session",
    messageId: request.messageId ?? randomUUID(),
    idempotencyKey: request.idempotencyKey ?? randomUUID(),
    userId: request.userId ?? "local-user",
    companyId: request.companyId ?? "local-company",
  };
  const definition = listToolDefinitions().find((tool) => tool.name === request.toolName);
  const status =
    definition?.confirmRequired && !request.confirmed
      ? "awaiting_confirmation"
      : "dry_run_completed";
  const invocation = createToolInvocationRecord({
    context,
    toolName: request.toolName,
    input: request.input,
    status,
  });

  const adapterResult = buildAdapterResult(
    request.toolName,
    request.input,
    Boolean(request.confirmed),
  );
  const task = state.createTask({
    status,
    providerCalled: false,
    toolName: request.toolName,
    result: {
      invocation,
      adapterResult,
    },
  });

  return {
    taskId: task.taskId,
    status: task.status,
    providerCalled: false,
    toolName: request.toolName,
    result: task.result,
  };
}

function buildAdapterResult(toolName: ToolName, input: unknown, confirmed: boolean): unknown {
  if (toolName === "image.generate" || toolName === "video.generate") {
    return executeJimengCliDryRun({ toolName, input, confirmed });
  }

  if (toolName === "transcode.ffmpeg") {
    const ffmpegInput = input as {
      operation: FfmpegOperation;
      inputAssetRefs: string[];
      outputFormat: string;
    };
    return {
      status: confirmed ? "dry_run_completed" : "awaiting_confirmation",
      adapter: "ffmpeg",
      providerCalled: false,
      plan: planFfmpegInvocation(ffmpegInput),
    };
  }

  return {
    status: "dry_run_completed",
    adapter: "local-mock",
    providerCalled: false,
    plan: createToolPlan(toolName),
  };
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function writeJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}
