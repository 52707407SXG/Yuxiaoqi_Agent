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

My Stand should use one business `idempotencyKey` for the complete confirmation flow:

1. First call with `confirmed:false` creates one task in `awaiting_confirmation` and returns `billing.status=estimate`.
2. A later call with the same key and `confirmed:true` upgrades the same task to `dry_run_completed`, returns HTTP 200, keeps `providerCalled=false`, and returns `billing.status=reserve`.
3. Repeating the confirmed call with the same key returns the same `taskId`, sets `reused:true`, and reuses the existing reserve billing entry.
4. `/status` returns the upgraded final task state.

This lets the backend complete `wait for confirmation -> confirmed dry run` with the same business idempotency key. Xiaoqi never calls a real Provider in this flow.

## Billing

M-dou mock billing supports:

- `estimate`
- `reserve`
- `settle`
- `refund`
- `cancel`

Every billing entry has `realCharge: false`. v0.4.2 never touches real balances.

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
