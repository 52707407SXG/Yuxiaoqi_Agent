import { type ToolName } from "../contracts/toolRegistry.ts";
import { type ToolPlan } from "../tools/invocation.ts";

export type XiaoqiRuntimeMode = "local-mock";

export type XiaoqiStateName =
  | "Intake"
  | "Clarify"
  | "Spec"
  | "SourceBrief"
  | "PromptPackage"
  | "ToolPlan"
  | "Confirm"
  | "Execute"
  | "Inspect"
  | "Revise"
  | "Artifact"
  | "SkillCandidate"
  | "SkillSave";

export type HealthResponse = {
  ok: true;
  agent: "Xiaoqi Agent";
  displayName: "余小柒";
  shortName: "小七";
  version: string;
  mode: XiaoqiRuntimeMode;
  providerCalls: "disabled";
  directorChat: {
    provider: "mock" | "deepseek";
    model: string;
    configured: boolean;
  };
  bind: {
    host: "127.0.0.1";
    port: 8788;
  };
  prompt: {
    kernelLoaded: boolean;
    modeCount: number;
  };
  tools: {
    registered: number;
    confirmRequired: number;
  };
};

export type MdouBillingAction = "estimate" | "reserve" | "settle" | "refund" | "cancel";

export type MdouBillingRequest = {
  action: MdouBillingAction;
  idempotencyKey: string;
  toolName?: ToolName;
  taskId?: string;
  amount?: number;
  reason?: string;
};

export type MdouBillingEntry = {
  billingId: string;
  action: MdouBillingAction;
  status: MdouBillingAction;
  idempotencyKey: string;
  toolName?: ToolName;
  taskId?: string;
  amount: number;
  currency: "mdou";
  realCharge: false;
  createdAt: string;
  auditSummary: string;
};

export type PlanRequest = {
  projectId?: string;
  sessionId?: string;
  messageId?: string;
  idempotencyKey?: string;
  workType?: string;
  platform?: string;
  goal?: string;
  audience?: string;
  materials?: unknown[];
  sourceContext?: unknown;
  constraints?: Record<string, unknown>;
};

export type PlanResponse = {
  planId: string;
  reused: boolean;
  state: XiaoqiStateName;
  currentUnderstanding: string;
  missingQuestions: string[];
  workSpecDraft: Record<string, unknown>;
  sourceUsePlan: string[];
  toolPlan: ToolPlan[];
  nextAction: "ask_clarifying_question" | "wait_for_backend_confirmation";
};

export type ChatRequest = PlanRequest & {
  message?: string;
};

export type ChatResponse = {
  reply: string;
  state: XiaoqiStateName;
  plan?: PlanResponse;
  directorChat?: {
    provider: "mock" | "deepseek";
    model: string;
    called: boolean;
  };
};

export type ExecuteRequest = {
  projectId?: string;
  sessionId?: string;
  messageId?: string;
  idempotencyKey?: string;
  userId?: string;
  companyId?: string;
  toolName: ToolName;
  input: unknown;
  confirmed?: boolean;
};

export type ExecuteResponse = {
  taskId: string;
  reused: boolean;
  status: "awaiting_confirmation" | "dry_run_completed";
  providerCalled: false;
  toolName: ToolName;
  billing: MdouBillingEntry;
  result: unknown;
};

export type RuntimeTask = ExecuteResponse & {
  createdAt: string;
};
