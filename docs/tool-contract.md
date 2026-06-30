# Xiaoqi Tool Contract

## Registry

The runtime registry is `xiaoqi/src/contracts/toolRegistry.ts`.

Each tool declares:

- `name`
- `category`
- `description`
- `inputSchema`
- `outputSchema`
- `requiresCredential`
- `billingMode`
- `producesArtifact`
- `allowedCwd`
- `timeoutMs`
- `maxConcurrency`
- `redactionRules`
- `confirmRequired`

Unknown tools and unknown input fields are rejected before planning or execution.

## First Batch Tools

- `source.read`
- `source.index`
- `prompt.compose`
- `image.generate`
- `video.generate`
- `audio.tts`
- `audio.asr`
- `transcode.ffmpeg`
- `artifact.inspect`
- `skill.save`

## Invocation And Idempotency

`/execute` deduplicates by:

`projectId + sessionId + toolName + idempotencyKey`

Duplicate calls return the same `taskId` and set `reused: true`. `/status` returns the same in-memory mock task.

## Billing

M-dou mock billing supports:

- `estimate`
- `reserve`
- `settle`
- `refund`
- `cancel`

Every billing entry has `realCharge: false`. v0.4.1 never touches real balances.

## Asset Return

Generated artifacts must return a temporary artifact contract:

- `artifactTempPath`
- `mimeType`
- `sizeBytes`
- `sha256`
- `durationMs` or `width/height`
- `previewKind`
- `safeTitle`
- `sourceInvocationId`

The backend is responsible for final asset registration.
