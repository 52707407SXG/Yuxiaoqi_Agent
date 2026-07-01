import { loadPromptBundle, type PromptBundle } from "../../prompts/loader.ts";
import { type ChatRequest, type PlanResponse } from "../../runtime/types.ts";

export type XiaoqiLlmProvider = "mock" | "deepseek";

export type XiaoqiLlmConfig = {
  provider: XiaoqiLlmProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
};

export type XiaoqiDirectorChatResult = {
  ok: boolean;
  skipped?: boolean;
  provider: XiaoqiLlmProvider;
  model: string;
  content?: string;
  error?: string;
};

export function resolveXiaoqiLlmConfig(env: NodeJS.ProcessEnv = process.env): XiaoqiLlmConfig {
  const provider = String(env.XIAOQI_LLM_PROVIDER || env.XIAOQI_CHAT_PROVIDER || "mock")
    .trim()
    .toLowerCase();
  return {
    provider: provider === "deepseek" ? "deepseek" : "mock",
    baseUrl: String(env.XIAOQI_LLM_BASE_URL || "https://api.deepseek.com/v1").trim(),
    apiKey: String(env.XIAOQI_LLM_API_KEY || "").trim(),
    model: String(env.XIAOQI_LLM_MODEL || "deepseek-v4-pro").trim() || "deepseek-v4-pro",
    maxTokens: parsePositiveInteger(env.XIAOQI_LLM_MAX_TOKENS, 900),
    timeoutMs: parsePositiveInteger(env.XIAOQI_LLM_TIMEOUT_MS, 45000),
  };
}

export async function runXiaoqiDirectorChat(args: {
  request: ChatRequest;
  plan: PlanResponse;
  promptBundle?: PromptBundle;
  config?: XiaoqiLlmConfig;
  fetchImpl?: typeof fetch;
}): Promise<XiaoqiDirectorChatResult> {
  const config = args.config ?? resolveXiaoqiLlmConfig();
  if (config.provider !== "deepseek") {
    return { ok: false, skipped: true, provider: config.provider, model: config.model };
  }
  if (!config.apiKey) {
    return {
      ok: false,
      skipped: true,
      provider: config.provider,
      model: config.model,
      error: "missing_api_key",
    };
  }

  const promptBundle = args.promptBundle ?? (await loadPromptBundle());
  const response = await callDeepseekChat({
    config,
    fetchImpl: args.fetchImpl ?? fetch,
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(promptBundle, args.request),
      },
      {
        role: "user",
        content: buildUserPrompt(args.request, args.plan),
      },
    ],
  });

  return response;
}

async function callDeepseekChat(args: {
  config: XiaoqiLlmConfig;
  fetchImpl: typeof fetch;
  messages: Array<{ role: "system" | "user"; content: string }>;
}): Promise<XiaoqiDirectorChatResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.config.timeoutMs);
  try {
    const response = await args.fetchImpl(`${args.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${args.config.apiKey}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        model: args.config.model,
        messages: args.messages,
        temperature: 0.45,
        max_tokens: args.config.maxTokens,
      }),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ok: false,
        provider: args.config.provider,
        model: args.config.model,
        error: providerErrorMessage(response.status, payload),
      };
    }

    const content = String(payload?.choices?.[0]?.message?.content || "").trim();
    if (!content) {
      return {
        ok: false,
        provider: args.config.provider,
        model: args.config.model,
        error: "empty_model_response",
      };
    }

    return {
      ok: true,
      provider: args.config.provider,
      model: args.config.model,
      content,
    };
  } catch (error) {
    return {
      ok: false,
      provider: args.config.provider,
      model: args.config.model,
      error: error instanceof Error ? error.message : "model_request_failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildSystemPrompt(promptBundle: PromptBundle, request: ChatRequest): string {
  const modePrompt = selectModePrompt(promptBundle, request.workType, request.platform);
  return [
    promptBundle.kernel,
    modePrompt,
    "本轮你只负责作品导演对话、资料理解、追问和规格整理。",
    "不要声称已经执行生图、视频、TTS、扣费或文件写入。",
    "如果 My Stand 传入了 SourceBrief 或资料员确认上下文，先明确说资料已经读到，再按作品类型追问风格、受众、用途、平台限制和成品标准。",
    "追问要具体，优先给 3-5 个可选方向；不要一次抛出太多问题。",
    "输出中文，面向房产经纪人，保持专业、克制、可执行。",
  ].join("\n\n");
}

function buildUserPrompt(request: ChatRequest, plan: PlanResponse): string {
  const sourceContext = (request as { sourceContext?: unknown }).sourceContext;
  const payload = {
    userMessage: request.message || "",
    workType: request.workType || "",
    platform: request.platform || "",
    goal: request.goal || "",
    audience: request.audience || "",
    materials: request.materials || [],
    sourceContext: sourceContext || null,
    plan,
  };
  return `My Stand 后端传入的作品上下文如下，只能使用这些资料作答：\n${JSON.stringify(payload, null, 2)}`;
}

function selectModePrompt(
  promptBundle: PromptBundle,
  workType?: string,
  platform?: string,
): string {
  const hint = `${workType || ""} ${platform || ""}`.toLowerCase();
  if (hint.includes("小红书") || hint.includes("xiaohongshu")) return promptBundle.modes["xiaohongshu"];
  if (hint.includes("公众号") || hint.includes("wechat") || hint.includes("article")) {
    return promptBundle.modes["wechat-article"];
  }
  if (hint.includes("ppt")) return promptBundle.modes.ppt;
  if (hint.includes("播客") || hint.includes("podcast")) return promptBundle.modes.podcast;
  if (hint.includes("口播") || hint.includes("script")) return promptBundle.modes["voice-script"];
  if (hint.includes("video") || hint.includes("视频") || hint.includes("抖音")) return promptBundle.modes.video;
  if (hint.includes("image") || hint.includes("图片") || hint.includes("海报")) return promptBundle.modes.image;
  return promptBundle.modes["wechat-article"];
}

function parsePositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function providerErrorMessage(status: number, payload: any): string {
  const message = payload?.error?.message || payload?.message || payload?.error || "";
  return `provider_http_${status}${message ? `:${String(message).slice(0, 240)}` : ""}`;
}
