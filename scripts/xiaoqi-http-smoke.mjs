#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  createXiaoqiServer,
  XIAOQI_DEFAULT_HOST,
  XIAOQI_DEFAULT_PORT,
} from "../xiaoqi/src/runtime/server.ts";

const port = Number(process.env.XIAOQI_SMOKE_PORT ?? 0);
const host = process.env.XIAOQI_SMOKE_HOST ?? XIAOQI_DEFAULT_HOST;
const server = createXiaoqiServer({ version: "0.4.2-smoke" });

await new Promise((resolve) => server.listen(port, host, resolve));
const address = server.address();
const resolvedPort = typeof address === "object" && address ? address.port : port;
const baseUrl = `http://${host}:${resolvedPort}`;

try {
  const health = await getJson("/health");
  assert.equal(health.agent, "Xiaoqi Agent");
  assert.deepEqual(health.bind, { host: "127.0.0.1", port: 8788 });
  assert.equal(health.providerCalls, "disabled");

  const plan = await postJson("/plan", {
    idempotencyKey: "smoke-plan",
    workType: "video",
    platform: "抖音",
    goal: "楼盘讲解获客",
    materials: [{ assetRef: "asset_mock" }],
  });
  assert.equal(plan.nextAction, "wait_for_backend_confirmation");

  const executeBody = {
    projectId: "project_smoke",
    sessionId: "session_smoke",
    idempotencyKey: "execute-smoke",
    toolName: "image.generate",
    input: {
      promptPackage: { title: "楼盘封面" },
      aspectRatio: "3:4",
      count: 1,
    },
    confirmed: false,
  };
  const executeA = await postJson("/execute", executeBody, 202);
  assert.equal(executeA.status, "awaiting_confirmation");
  assert.equal(executeA.billing.status, "estimate");

  const executeB = await postJson("/execute", { ...executeBody, confirmed: true });
  assert.equal(executeA.taskId, executeB.taskId);
  assert.equal(executeB.reused, true);
  assert.equal(executeB.status, "dry_run_completed");
  assert.equal(executeB.providerCalled, false);
  assert.equal(executeB.billing.status, "reserve");
  assert.equal(executeB.billing.realCharge, false);

  const executeC = await postJson("/execute", { ...executeBody, confirmed: true });
  assert.equal(executeC.taskId, executeB.taskId);
  assert.equal(executeC.reused, true);
  assert.equal(executeC.status, "dry_run_completed");
  assert.equal(executeC.billing.billingId, executeB.billing.billingId);

  const status = await getJson(`/status?taskId=${encodeURIComponent(executeA.taskId)}`);
  assert.equal(status.taskId, executeA.taskId);
  assert.equal(status.status, "dry_run_completed");

  for (const action of ["estimate", "reserve", "settle", "refund", "cancel"]) {
    const billing = await postJson("/billing", {
      action,
      idempotencyKey: `billing-${action}`,
      amount: action === "estimate" ? 0 : 1,
      reason: "smoke",
    });
    assert.equal(billing.status, action);
    assert.equal(billing.realCharge, false);
  }

  await postRaw("/plan", "{", 400);
  await postRaw("/plan", JSON.stringify({ payload: "x".repeat(140 * 1024) }), 413);
  await request("/health", { method: "POST" }, 405);

  console.log(`Xiaoqi HTTP smoke passed on ${baseUrl}`);
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function getJson(path) {
  const response = await request(path);
  if (!response.ok) {
    assert.fail(await response.text());
  }
  return response.json();
}

async function postJson(path, body, expectedStatus = 200) {
  const response = await request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status !== expectedStatus) {
    assert.fail(await response.text());
  }
  return response.json();
}

async function postRaw(path, body, expectedStatus) {
  const response = await request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  if (response.status !== expectedStatus) {
    assert.fail(await response.text());
  }
}

async function request(path, init = {}, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (expectedStatus !== undefined) {
    if (response.status !== expectedStatus) {
      assert.fail(await response.text());
    }
  }
  return response;
}
