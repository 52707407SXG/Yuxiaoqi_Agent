import assert from "node:assert/strict";
import test from "node:test";
import {
  getToolDefinition,
  listToolDefinitions,
  validateToolInput,
  type ToolName,
} from "../src/contracts/toolRegistry.ts";
import { planFfmpegInvocation } from "../src/providers/ffmpeg/ffmpegAdapter.ts";
import { executeJimengCliDryRun } from "../src/providers/jimeng/jimengCliAdapter.ts";
import { toArtifactRegistrationRequest } from "../src/storage/artifactBridge.ts";
import { createToolPlan } from "../src/tools/invocation.ts";

const expectedToolNames: ToolName[] = [
  "source.read",
  "source.index",
  "prompt.compose",
  "image.generate",
  "video.generate",
  "audio.tts",
  "audio.asr",
  "transcode.ffmpeg",
  "artifact.inspect",
  "skill.save",
];

test("ToolRegistry contains the v0.4 first batch tools", () => {
  const names = listToolDefinitions()
    .map((tool) => tool.name)
    .sort();
  assert.deepEqual(names, [...expectedToolNames].sort());

  for (const name of expectedToolNames) {
    const definition = getToolDefinition(name);
    assert.ok(definition, `${name} should be registered`);
    assert.ok(definition.inputSchema);
    assert.ok(definition.outputSchema);
    assert.equal(typeof definition.timeoutMs, "number");
    assert.equal(typeof definition.maxConcurrency, "number");
  }
});

test("high-cost and external generation tools require confirmation", () => {
  for (const name of [
    "image.generate",
    "video.generate",
    "audio.tts",
    "audio.asr",
    "transcode.ffmpeg",
  ] as const) {
    const plan = createToolPlan(name);
    assert.equal(plan.confirmRequired, true);
    assert.equal(plan.dryRunOnly, true);
    assert.ok(plan.risk.some((item) => item.includes("confirmation")));
  }
});

test("tool input schema rejects missing required fields", () => {
  assert.deepEqual(validateToolInput("source.read", { projectId: "p1" }), {
    ok: false,
    errors: ["input.sourceBriefId is required"],
  });

  assert.deepEqual(
    validateToolInput("prompt.compose", {
      mode: "video",
      workSpec: { platform: "video" },
    }),
    { ok: true },
  );

  assert.deepEqual(
    validateToolInput("image.generate", {
      promptPackage: { title: "楼盘封面" },
      aspectRatio: "3:4",
      unexpected: true,
    }),
    { ok: false, errors: ["input.unexpected is not allowed"] },
  );
});

test("provider adapters are dry-run only", () => {
  const jimengResult = executeJimengCliDryRun({
    toolName: "image.generate",
    input: {
      promptPackage: { title: "楼盘封面" },
      aspectRatio: "3:4",
      count: 1,
    },
    confirmed: false,
  });
  assert.equal(jimengResult.providerCalled, false);
  assert.equal(jimengResult.status, "awaiting_confirmation");
  assert.equal(jimengResult.plan.adapter, "jimeng-cli");

  const ffmpegPlan = planFfmpegInvocation({
    operation: "extract-frame",
    inputAssetRefs: ["asset_1"],
    outputFormat: "jpg",
  });
  assert.equal(ffmpegPlan.adapter, "ffmpeg");
  assert.equal(ffmpegPlan.confirmRequired, true);
});

test("artifact bridge returns backend registration payload only", () => {
  const registration = toArtifactRegistrationRequest({
    projectId: "project_1",
    userId: "user_1",
    companyId: "company_1",
    artifact: {
      artifactTempPath: "tmp://xiaoqi/mock/image.png",
      mimeType: "image/png",
      sizeBytes: 1234,
      sha256: "abc",
      previewKind: "image",
      safeTitle: "楼盘封面",
      sourceInvocationId: "invocation_1",
    },
  });

  assert.equal(registration.storagePolicy, "backend-registers-file_assets");
  assert.equal(registration.projectId, "project_1");
});
