import { createToolPlan, type ToolPlan } from "../../tools/invocation.ts";

export const allowedFfmpegOperations = [
  "transcode",
  "crop",
  "extract-frame",
  "merge",
  "subtitle",
  "mux",
] as const;

export type FfmpegOperation = (typeof allowedFfmpegOperations)[number];

export type FfmpegDryRunPlan = ToolPlan & {
  adapter: "ffmpeg";
  operation: FfmpegOperation;
  commandPreview: readonly string[];
};

export function planFfmpegInvocation(input: {
  operation: FfmpegOperation;
  inputAssetRefs: string[];
  outputFormat: string;
}): FfmpegDryRunPlan {
  if (!allowedFfmpegOperations.includes(input.operation)) {
    throw new Error(`ffmpeg operation is not whitelisted: ${input.operation}`);
  }

  return {
    ...createToolPlan("transcode.ffmpeg"),
    adapter: "ffmpeg",
    operation: input.operation,
    commandPreview: [
      "ffmpeg",
      "-i",
      "<backend-materialized-input>",
      "<whitelisted-args-only>",
      `<controlled-temp-artifact.${input.outputFormat}>`,
    ],
  };
}

export function executeFfmpegDryRun(input: {
  operation: FfmpegOperation;
  inputAssetRefs: string[];
  outputFormat: string;
  confirmed: boolean;
}): {
  status: "awaiting_confirmation" | "dry_run_completed";
  adapter: "ffmpeg";
  providerCalled: false;
  plan: FfmpegDryRunPlan;
} {
  return {
    status: input.confirmed ? "dry_run_completed" : "awaiting_confirmation",
    adapter: "ffmpeg",
    providerCalled: false,
    plan: planFfmpegInvocation(input),
  };
}
