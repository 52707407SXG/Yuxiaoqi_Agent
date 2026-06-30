# Xiaoqi Tool Contract

## Registry Location

The runtime registry is implemented in `xiaoqi/src/contracts/toolRegistry.ts`.

Every tool declares:

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

## Invocation Shape

`xiaoqi/src/tools/invocation.ts` defines:

- `invocationId`
- `projectId`
- `sessionId`
- `messageId`
- `idempotencyKey`
- `userId`
- `companyId`
- `toolName`
- `inputHash`
- `status`
- `startedAt`
- `endedAt`
- `costEstimate`
- `costFinal`
- `artifactIds`
- `errorCode`
- `errorMessageSafe`
- `auditSummary`

The input hash is stable and deterministic to support idempotency and audit checks.

## Adapter Rules

`image.generate` and `video.generate` plan through the Jimeng CLI adapter skeleton. `transcode.ffmpeg` plans through the ffmpeg adapter skeleton. Both adapters are dry-run only in v0.4 and return `providerCalled: false`.

Allowed ffmpeg operations are:

- `transcode`
- `crop`
- `extract-frame`
- `merge`
- `subtitle`
- `mux`

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

The backend is responsible for final `file_assets` registration.
