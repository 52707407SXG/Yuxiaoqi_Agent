export type ToolCategory =
  | "source"
  | "planning"
  | "generation"
  | "transcode"
  | "inspection"
  | "skill"
  | "memory";

export type BillingMode = "none" | "estimate" | "reserve" | "settle";

export type ToolName =
  | "source.read"
  | "source.index"
  | "prompt.compose"
  | "image.generate"
  | "video.generate"
  | "audio.tts"
  | "audio.asr"
  | "transcode.ffmpeg"
  | "artifact.inspect"
  | "skill.save";

export type JsonSchema = {
  type: "object" | "string" | "number" | "integer" | "boolean" | "array";
  description?: string;
  enum?: readonly string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean;
};

export type ToolDefinition = {
  name: ToolName;
  category: ToolCategory;
  description: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  requiresCredential: boolean;
  billingMode: BillingMode;
  producesArtifact: boolean;
  allowedCwd: string | null;
  timeoutMs: number;
  maxConcurrency: number;
  redactionRules: readonly string[];
  confirmRequired: boolean;
};

const stringField = (description: string): JsonSchema => ({
  type: "string",
  description,
});

const objectSchema = (
  properties: Record<string, JsonSchema>,
  required: readonly string[] = [],
): JsonSchema => ({
  type: "object",
  additionalProperties: false,
  properties,
  required,
});

const artifactOutputSchema = objectSchema(
  {
    artifactTempPath: stringField("Controlled temporary path or opaque reference."),
    mimeType: stringField("Result MIME type."),
    sizeBytes: { type: "integer", description: "Result size in bytes." },
    sha256: stringField("Result checksum."),
    previewKind: stringField("My Stand preview kind."),
    safeTitle: stringField("Safe title for asset registration."),
    sourceInvocationId: stringField("Invocation that produced the artifact."),
  },
  ["mimeType", "previewKind", "safeTitle", "sourceInvocationId"],
);

export const toolDefinitions = [
  {
    name: "source.read",
    category: "source",
    description: "Read only the authorized SourceBrief and asset references supplied by My Stand.",
    inputSchema: objectSchema(
      {
        projectId: stringField("My Stand project id."),
        sourceBriefId: stringField("Authorized SourceBrief id."),
      },
      ["projectId", "sourceBriefId"],
    ),
    outputSchema: objectSchema({
      sourceBrief: { type: "object", description: "Authorized material summary." },
      assetRefs: { type: "array", items: stringField("Authorized asset ref.") },
    }),
    requiresCredential: false,
    billingMode: "none",
    producesArtifact: false,
    allowedCwd: null,
    timeoutMs: 5_000,
    maxConcurrency: 16,
    redactionRules: ["userId", "companyId", "assetRef"],
    confirmRequired: false,
  },
  {
    name: "source.index",
    category: "source",
    description:
      "Build a scoped retrieval index for project materials while preserving source positions.",
    inputSchema: objectSchema(
      {
        projectId: stringField("My Stand project id."),
        sourceBriefId: stringField("Authorized SourceBrief id."),
        indexScope: stringField("Scoped retrieval purpose."),
      },
      ["projectId", "sourceBriefId"],
    ),
    outputSchema: objectSchema({
      indexId: stringField("Scoped index id."),
      citations: {
        type: "array",
        items: objectSchema({
          assetId: stringField("Asset id."),
          locator: stringField("Page, paragraph, or timecode locator."),
        }),
      },
    }),
    requiresCredential: false,
    billingMode: "estimate",
    producesArtifact: false,
    allowedCwd: null,
    timeoutMs: 20_000,
    maxConcurrency: 4,
    redactionRules: ["rawText", "customerName", "phone", "address"],
    confirmRequired: false,
  },
  {
    name: "prompt.compose",
    category: "planning",
    description: "Compose a structured PromptPackage from work spec, SourceBrief, and mode prompt.",
    inputSchema: objectSchema(
      {
        mode: {
          type: "string",
          enum: [
            "wechat-article",
            "xiaohongshu",
            "ppt",
            "pdf-report",
            "image",
            "video",
            "podcast",
            "voice-script",
          ],
          description: "Work mode prompt slug.",
        },
        workSpec: { type: "object", description: "Structured work specification." },
        sourceBrief: { type: "object", description: "Authorized material summary." },
      },
      ["mode", "workSpec"],
    ),
    outputSchema: objectSchema({
      promptPackage: { type: "object", description: "Script, storyboard, prompts, checks." },
      checkpoints: { type: "array", items: stringField("Quality checkpoint.") },
    }),
    requiresCredential: false,
    billingMode: "none",
    producesArtifact: false,
    allowedCwd: null,
    timeoutMs: 8_000,
    maxConcurrency: 8,
    redactionRules: ["customerName", "phone", "address", "rawAssetText"],
    confirmRequired: false,
  },
  {
    name: "image.generate",
    category: "generation",
    description:
      "Plan or execute an image generation request through the registered Jimeng adapter.",
    inputSchema: objectSchema(
      {
        promptPackage: { type: "object", description: "Approved PromptPackage." },
        aspectRatio: stringField("Target aspect ratio, such as 3:4 or 16:9."),
        count: { type: "integer", description: "Number of images." },
      },
      ["promptPackage", "aspectRatio"],
    ),
    outputSchema: artifactOutputSchema,
    requiresCredential: true,
    billingMode: "reserve",
    producesArtifact: true,
    allowedCwd: ".xiaoqi/runtime/tools/jimeng",
    timeoutMs: 180_000,
    maxConcurrency: 1,
    redactionRules: ["cookie", "token", "authorization", "promptPackage.privateNotes"],
    confirmRequired: true,
  },
  {
    name: "video.generate",
    category: "generation",
    description:
      "Plan or execute a short video generation request through the registered Jimeng adapter.",
    inputSchema: objectSchema(
      {
        storyboard: { type: "array", items: { type: "object" } },
        durationSeconds: { type: "number", description: "Target duration in seconds." },
        aspectRatio: stringField("Target aspect ratio."),
        subtitleStyle: stringField("Subtitle style name."),
      },
      ["storyboard", "durationSeconds", "aspectRatio"],
    ),
    outputSchema: artifactOutputSchema,
    requiresCredential: true,
    billingMode: "reserve",
    producesArtifact: true,
    allowedCwd: ".xiaoqi/runtime/tools/jimeng",
    timeoutMs: 600_000,
    maxConcurrency: 1,
    redactionRules: ["cookie", "token", "authorization", "referenceAssetPrivateUrl"],
    confirmRequired: true,
  },
  {
    name: "audio.tts",
    category: "generation",
    description: "Plan or execute text-to-speech generation through a registered voice adapter.",
    inputSchema: objectSchema(
      {
        script: stringField("Approved voice script."),
        voice: stringField("Approved voice id or style."),
        format: stringField("Output audio format."),
      },
      ["script", "voice", "format"],
    ),
    outputSchema: artifactOutputSchema,
    requiresCredential: true,
    billingMode: "reserve",
    producesArtifact: true,
    allowedCwd: ".xiaoqi/runtime/tools/audio",
    timeoutMs: 180_000,
    maxConcurrency: 2,
    redactionRules: ["token", "authorization", "privateVoiceId"],
    confirmRequired: true,
  },
  {
    name: "audio.asr",
    category: "generation",
    description: "Plan or execute speech-to-text with timestamps and confidence scores.",
    inputSchema: objectSchema(
      {
        assetRef: stringField("Authorized audio asset ref."),
        language: stringField("Expected language."),
      },
      ["assetRef"],
    ),
    outputSchema: objectSchema({
      transcript: stringField("Transcript text."),
      segments: { type: "array", items: { type: "object" } },
      confidence: { type: "number", description: "Overall confidence." },
    }),
    requiresCredential: true,
    billingMode: "reserve",
    producesArtifact: false,
    allowedCwd: ".xiaoqi/runtime/tools/audio",
    timeoutMs: 240_000,
    maxConcurrency: 2,
    redactionRules: ["token", "authorization", "speakerPrivateData"],
    confirmRequired: true,
  },
  {
    name: "transcode.ffmpeg",
    category: "transcode",
    description:
      "Plan or execute a whitelist-only media transcode, crop, frame extraction, merge, subtitle, or mux operation.",
    inputSchema: objectSchema(
      {
        operation: {
          type: "string",
          enum: ["transcode", "crop", "extract-frame", "merge", "subtitle", "mux"],
          description: "Whitelisted ffmpeg operation.",
        },
        inputAssetRefs: {
          type: "array",
          items: stringField("Authorized input asset ref."),
        },
        outputFormat: stringField("Target output format."),
      },
      ["operation", "inputAssetRefs", "outputFormat"],
    ),
    outputSchema: artifactOutputSchema,
    requiresCredential: false,
    billingMode: "estimate",
    producesArtifact: true,
    allowedCwd: ".xiaoqi/runtime/tools/ffmpeg",
    timeoutMs: 300_000,
    maxConcurrency: 1,
    redactionRules: ["privateUrl", "localPath", "subtitleRawText"],
    confirmRequired: true,
  },
  {
    name: "artifact.inspect",
    category: "inspection",
    description: "Inspect artifact metadata, previewability, and fit against the PromptPackage.",
    inputSchema: objectSchema(
      {
        artifactRef: stringField("Controlled temporary or My Stand asset ref."),
        expectedSpec: { type: "object", description: "Expected artifact requirements." },
      },
      ["artifactRef"],
    ),
    outputSchema: objectSchema({
      ok: { type: "boolean", description: "Whether the artifact passes inspection." },
      findings: { type: "array", items: stringField("Inspection finding.") },
      metadata: { type: "object", description: "Safe metadata summary." },
    }),
    requiresCredential: false,
    billingMode: "none",
    producesArtifact: false,
    allowedCwd: null,
    timeoutMs: 20_000,
    maxConcurrency: 8,
    redactionRules: ["localPath", "privateUrl"],
    confirmRequired: false,
  },
  {
    name: "skill.save",
    category: "skill",
    description:
      "Save a user-approved repeatable workflow as structured skill data, not executable code.",
    inputSchema: objectSchema(
      {
        title: stringField("Skill candidate title."),
        scenario: stringField("Applicable business scenario."),
        inputSlots: { type: "array", items: stringField("Required input slot.") },
        toolDependencies: { type: "array", items: stringField("Tool dependency.") },
        disabledWhen: { type: "array", items: stringField("Disable condition.") },
      },
      ["title", "scenario", "inputSlots"],
    ),
    outputSchema: objectSchema({
      skillCandidateId: stringField("Saved skill candidate id."),
      version: stringField("Skill candidate version."),
    }),
    requiresCredential: false,
    billingMode: "none",
    producesArtifact: false,
    allowedCwd: null,
    timeoutMs: 10_000,
    maxConcurrency: 4,
    redactionRules: ["privateAssetText", "customerName", "phone"],
    confirmRequired: false,
  },
] as const satisfies readonly ToolDefinition[];

const registry = new Map<string, ToolDefinition>(
  toolDefinitions.map((definition) => [definition.name, definition]),
);

export function listToolDefinitions(): readonly ToolDefinition[] {
  return toolDefinitions;
}

export function getToolDefinition(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function validateToolInput(
  name: string,
  input: unknown,
): { ok: true } | { ok: false; errors: string[] } {
  const definition = getToolDefinition(name);
  if (!definition) {
    return { ok: false, errors: [`Unknown tool: ${name}`] };
  }

  const errors = validateSchema(definition.inputSchema, input, "input");
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateSchema(schema: JsonSchema, value: unknown, path: string): string[] {
  const errors: string[] = [];

  if (!matchesType(schema.type, value)) {
    errors.push(`${path} must be ${schema.type}`);
    return errors;
  }

  if (schema.enum && typeof value === "string" && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of ${schema.enum.join(", ")}`);
  }

  if (schema.type === "object" && schema.properties) {
    const record = value as Record<string, unknown>;
    for (const key of schema.required ?? []) {
      if (!(key in record)) {
        errors.push(`${path}.${key} is required`);
      }
    }

    for (const [key, childSchema] of Object.entries(schema.properties)) {
      if (key in record && record[key] !== undefined) {
        errors.push(...validateSchema(childSchema, record[key], `${path}.${key}`));
      }
    }
  }

  if (schema.type === "array" && schema.items) {
    for (const [index, item] of (value as unknown[]).entries()) {
      errors.push(...validateSchema(schema.items, item, `${path}[${index}]`));
    }
  }

  return errors;
}

function matchesType(type: JsonSchema["type"], value: unknown): boolean {
  switch (type) {
    case "array":
      return Array.isArray(value);
    case "boolean":
      return typeof value === "boolean";
    case "integer":
      return Number.isInteger(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "object":
      return typeof value === "object" && value !== null && !Array.isArray(value);
    case "string":
      return typeof value === "string";
  }
}
