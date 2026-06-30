import { createHash, randomUUID } from "node:crypto";
import {
  getToolDefinition,
  type BillingMode,
  type ToolDefinition,
  type ToolName,
  validateToolInput,
} from "../contracts/toolRegistry.ts";

export type ToolInvocationStatus =
  | "planned"
  | "awaiting_confirmation"
  | "dry_run_completed"
  | "failed";

export type ToolInvocationContext = {
  projectId: string;
  sessionId: string;
  messageId: string;
  idempotencyKey: string;
  userId: string;
  companyId: string;
};

export type ToolInvocationRecord = ToolInvocationContext & {
  invocationId: string;
  toolName: ToolName;
  inputHash: string;
  status: ToolInvocationStatus;
  startedAt: string;
  endedAt: string | null;
  costEstimate: CostEstimate;
  costFinal: null;
  artifactIds: string[];
  errorCode: string | null;
  errorMessageSafe: string | null;
  auditSummary: string;
};

export type CostEstimate = {
  billingMode: BillingMode;
  mdouMin: number;
  mdouMax: number;
  note: string;
};

export type ToolPlan = {
  toolName: ToolName;
  category: ToolDefinition["category"];
  confirmRequired: boolean;
  billingMode: BillingMode;
  producesArtifact: boolean;
  dryRunOnly: true;
  costEstimate: CostEstimate;
  expectedArtifacts: string[];
  risk: string[];
};

export function createToolPlan(toolName: ToolName): ToolPlan {
  const definition = mustGetTool(toolName);
  return {
    toolName,
    category: definition.category,
    confirmRequired: definition.confirmRequired,
    billingMode: definition.billingMode,
    producesArtifact: definition.producesArtifact,
    dryRunOnly: true,
    costEstimate: estimateCost(definition),
    expectedArtifacts: definition.producesArtifact
      ? ["artifactTempPath", "mimeType", "sha256", "previewKind", "safeTitle"]
      : [],
    risk: buildRisk(definition),
  };
}

export function createToolInvocationRecord(args: {
  context: ToolInvocationContext;
  toolName: ToolName;
  input: unknown;
  status: ToolInvocationStatus;
}): ToolInvocationRecord {
  const definition = mustGetTool(args.toolName);
  return {
    ...args.context,
    invocationId: randomUUID(),
    toolName: args.toolName,
    inputHash: hashInput(args.input),
    status: args.status,
    startedAt: new Date().toISOString(),
    endedAt:
      args.status === "planned" || args.status === "awaiting_confirmation"
        ? null
        : new Date().toISOString(),
    costEstimate: estimateCost(definition),
    costFinal: null,
    artifactIds: [],
    errorCode: null,
    errorMessageSafe: null,
    auditSummary: `${args.toolName} accepted by Xiaoqi local mock runtime; real provider execution is disabled.`,
  };
}

export function assertValidToolInvocation(
  toolName: string,
  input: unknown,
): asserts toolName is ToolName {
  const result = validateToolInput(toolName, input);
  if (!result.ok) {
    throw new Error(result.errors.join("; "));
  }
}

export function hashInput(input: unknown): string {
  return createHash("sha256").update(stableStringify(input)).digest("hex");
}

function estimateCost(definition: ToolDefinition): CostEstimate {
  if (definition.billingMode === "none") {
    return {
      billingMode: "none",
      mdouMin: 0,
      mdouMax: 0,
      note: "No M-dou reservation is required in local mock mode.",
    };
  }

  if (definition.confirmRequired) {
    return {
      billingMode: definition.billingMode,
      mdouMin: 1,
      mdouMax: definition.category === "generation" ? 80 : 20,
      note: "Estimate only. My Stand must reserve, settle, or refund before real execution.",
    };
  }

  return {
    billingMode: definition.billingMode,
    mdouMin: 0,
    mdouMax: 5,
    note: "Local planning estimate; no provider call is made.",
  };
}

function buildRisk(definition: ToolDefinition): string[] {
  const risk = ["Local mock runtime never calls real providers."];
  if (definition.confirmRequired) {
    risk.push("Requires My Stand backend confirmation before any real execution path.");
  }
  if (definition.producesArtifact) {
    risk.push(
      "Generated files must be returned as temporary artifact references for backend registration.",
    );
  }
  if (definition.requiresCredential) {
    risk.push(
      "Credentials must be supplied by backend adapter scope only and must not enter logs.",
    );
  }
  return risk;
}

function mustGetTool(name: ToolName): ToolDefinition {
  const definition = getToolDefinition(name);
  if (!definition) {
    throw new Error(`Tool is not registered: ${name}`);
  }
  return definition;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
