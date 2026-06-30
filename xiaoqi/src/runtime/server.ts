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
  type MdouBillingEntry,
  type MdouBillingRequest,
  type PlanRequest,
  type PlanResponse,
} from "./types.ts";

export const XIAOQI_DEFAULT_HOST = "127.0.0.1" as const;
export const XIAOQI_DEFAULT_PORT = 8788 as const;
export const XIAOQI_MAX_BODY_BYTES = 128 * 1024;

export type XiaoqiServerOptions = {
  version?: string;
  state?: XiaoqiRuntimeState;
  maxBodyBytes?: number;
};

class HttpError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly headers: Record<string, string>;

  constructor(
    statusCode: number,
    errorCode: string,
    message: string,
    headers: Record<string, string> = {},
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.headers = headers;
  }
}

export function createXiaoqiServer(options: XiaoqiServerOptions = {}): Server {
  const state = options.state ?? createXiaoqiRuntimeState();
  const version = options.version ?? "0.4.1";
  const maxBodyBytes = options.maxBodyBytes ?? XIAOQI_MAX_BODY_BYTES;

  return createServer(async (request, response) => {
    try {
      await routeRequest({ request, response, state, version, maxBodyBytes });
    } catch (error) {
      const httpError =
        error instanceof HttpError
          ? error
          : new HttpError(500, "xiaoqi_internal_error", "Xiaoqi runtime failed safely.");
      writeJson(
        response,
        httpError.statusCode,
        {
          error: httpError.errorCode,
          message: httpError.message,
        },
        httpError.headers,
      );
    }
  });
}

async function routeRequest(args: {
  request: IncomingMessage;
  response: ServerResponse;
  state: XiaoqiRuntimeState;
  version: string;
  maxBodyBytes: number;
}): Promise<void> {
  const url = new URL(args.request.url ?? "/", `http://${XIAOQI_DEFAULT_HOST}`);

  if (url.pathname === "/health") {
    requireMethod(args.request, "GET");
    writeJson(args.response, 200, await buildHealth(args.version));
    return;
  }

  if (url.pathname === "/plan") {
    requireMethod(args.request, "POST");
    const body = await readJson<PlanRequest>(args.request, args.maxBodyBytes);
    writeJson(args.response, 200, buildPlan(body, args.state));
    return;
  }

  if (url.pathname === "/chat") {
    requireMethod(args.request, "POST");
    const body = await readJson<ChatRequest>(args.request, args.maxBodyBytes);
    writeJson(args.response, 200, buildChat(body, args.state));
    return;
  }

  if (url.pathname === "/execute") {
    requireMethod(args.request, "POST");
    const body = await readJson<ExecuteRequest>(args.request, args.maxBodyBytes);
    const result = buildExecute(body, args.state);
    writeJson(args.response, result.status === "awaiting_confirmation" ? 202 : 200, result);
    return;
  }

  if (url.pathname === "/billing") {
    requireMethod(args.request, "POST");
    const body = await readJson<MdouBillingRequest>(args.request, args.maxBodyBytes);
    writeJson(args.response, 200, buildBilling(body, args.state));
    return;
  }

  if (url.pathname === "/billing/status") {
    requireMethod(args.request, "GET");
    const billingId = url.searchParams.get("billingId");
    if (!billingId) {
      throw new HttpError(400, "billingId_required", "billingId is required.");
    }
    const billing = args.state.getBilling(billingId);
    writeJson(args.response, billing ? 200 : 404, billing ?? { error: "billing_not_found" });
    return;
  }

  if (url.pathname === "/status") {
    requireMethod(args.request, "GET");
    const taskId = url.searchParams.get("taskId");
    if (!taskId) {
      throw new HttpError(400, "taskId_required", "taskId is required.");
    }

    const task = args.state.getTask(taskId);
    writeJson(args.response, task ? 200 : 404, task ?? { error: "task_not_found" });
    return;
  }

  if (url.pathname.startsWith("/status/")) {
    requireMethod(args.request, "GET");
    const taskId = decodeURIComponent(url.pathname.slice("/status/".length));
    const task = args.state.getTask(taskId);
    writeJson(args.response, task ? 200 : 404, task ?? { error: "task_not_found" });
    return;
  }

  if (knownPath(url.pathname)) {
    throw new HttpError(405, "method_not_allowed", "HTTP method is not supported.", {
      allow: allowedMethod(url.pathname),
    });
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
    bind: {
      host: XIAOQI_DEFAULT_HOST,
      port: XIAOQI_DEFAULT_PORT,
    },
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
  if (!request || typeof request !== "object") {
    throw new HttpError(400, "invalid_execute_request", "Execute request must be an object.");
  }
  const validation = validateToolInput(request.toolName, request.input);
  if (!validation.ok) {
    throw new HttpError(400, "invalid_tool_input", validation.errors.join("; "));
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
  const taskKey = `execute:${context.projectId}:${context.sessionId}:${request.toolName}:${context.idempotencyKey}`;

  const task = state.getOrCreateTask(taskKey, () => {
    const billing = buildBilling(
      {
        action: request.confirmed ? "reserve" : "estimate",
        idempotencyKey: `execute:${context.idempotencyKey}`,
        toolName: request.toolName,
        amount: request.confirmed ? 1 : 0,
        reason: "execute mock billing boundary",
      },
      state,
    );
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
    return {
      status,
      providerCalled: false,
      toolName: request.toolName,
      billing,
      result: {
        invocation,
        adapterResult,
      },
    };
  });

  return {
    taskId: task.taskId,
    reused: task.reused,
    status: task.status,
    providerCalled: false,
    toolName: request.toolName,
    billing: task.billing,
    result: task.result,
  };
}

export function buildBilling(
  request: MdouBillingRequest,
  state: XiaoqiRuntimeState,
): MdouBillingEntry {
  const allowedActions = ["estimate", "reserve", "settle", "refund", "cancel"];
  if (!request || typeof request !== "object") {
    throw new HttpError(400, "invalid_billing_request", "Billing request must be an object.");
  }
  if (!allowedActions.includes(request.action)) {
    throw new HttpError(400, "invalid_billing_action", "Billing action is not supported.");
  }
  if (!request.idempotencyKey) {
    throw new HttpError(400, "billing_idempotency_required", "Billing idempotencyKey is required.");
  }
  if (request.amount !== undefined && (!Number.isFinite(request.amount) || request.amount < 0)) {
    throw new HttpError(400, "invalid_billing_amount", "Billing amount must be a non-negative number.");
  }
  return state.getOrCreateBilling(request);
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

function requireMethod(request: IncomingMessage, method: string): void {
  if (request.method !== method) {
    throw new HttpError(405, "method_not_allowed", "HTTP method is not supported.", {
      allow: method,
    });
  }
}

async function readJson<T>(request: IncomingMessage, maxBodyBytes: number): Promise<T> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.byteLength;
    if (totalBytes > maxBodyBytes) {
      throw new HttpError(413, "request_too_large", "Request body is too large.");
    }
    chunks.push(buffer);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function knownPath(pathname: string): boolean {
  return [
    "/health",
    "/plan",
    "/chat",
    "/execute",
    "/billing",
    "/billing/status",
    "/status",
  ].some((path) => pathname === path || pathname.startsWith("/status/"));
}

function allowedMethod(pathname: string): string {
  if (pathname === "/health" || pathname === "/status" || pathname.startsWith("/status/")) {
    return "GET";
  }
  if (pathname === "/billing/status") {
    return "GET";
  }
  return "POST";
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
  headers: Record<string, string> = {},
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...headers,
  });
  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}
