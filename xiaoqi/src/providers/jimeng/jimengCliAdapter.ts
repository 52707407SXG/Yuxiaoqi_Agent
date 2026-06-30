import { type ToolName } from "../../contracts/toolRegistry.ts";
import { createToolPlan, type ToolPlan } from "../../tools/invocation.ts";

export type JimengDryRunPlan = ToolPlan & {
  adapter: "jimeng-cli";
  commandPreview: readonly string[];
  credentialPolicy: "backend-only";
};

const jimengToolNames = new Set<ToolName>(["image.generate", "video.generate"]);

export function planJimengCliInvocation(args: {
  toolName: ToolName;
  input: unknown;
}): JimengDryRunPlan {
  if (!jimengToolNames.has(args.toolName)) {
    throw new Error(`jimengCliAdapter cannot handle ${args.toolName}`);
  }

  return {
    ...createToolPlan(args.toolName),
    adapter: "jimeng-cli",
    commandPreview: [
      "jimeng",
      args.toolName === "image.generate" ? "image" : "video",
      "--config",
      "<backend-supplied>",
      "--out",
      "<controlled-temp-artifact>",
    ],
    credentialPolicy: "backend-only",
  };
}

export function executeJimengCliDryRun(args: {
  toolName: ToolName;
  input: unknown;
  confirmed: boolean;
}): {
  status: "awaiting_confirmation" | "dry_run_completed";
  adapter: "jimeng-cli";
  providerCalled: false;
  plan: JimengDryRunPlan;
} {
  const plan = planJimengCliInvocation({
    toolName: args.toolName,
    input: args.input,
  });

  return {
    status: args.confirmed ? "dry_run_completed" : "awaiting_confirmation",
    adapter: "jimeng-cli",
    providerCalled: false,
    plan,
  };
}
