import assert from "node:assert/strict";
import { type Server } from "node:http";
import test from "node:test";
import { createXiaoqiServer } from "../src/runtime/server.ts";

test("mock runtime exposes health, plan, chat, execute, and status endpoints", async (t) => {
  const runtime = await listen(createXiaoqiServer({ version: "0.4.0-test" }));
  t.after(async () => {
    await runtime.close();
  });

  const health = await getJson(`${runtime.url}/health`);
  assert.equal(health.agent, "Xiaoqi Agent");
  assert.equal(health.displayName, "余小柒");
  assert.equal(health.providerCalls, "disabled");
  assert.deepEqual(health.bind, { host: "127.0.0.1", port: 8788 });
  assert.equal(health.prompt.modeCount, 8);
  assert.equal(health.tools.registered, 10);

  const planRequest = {
    messageId: "message-1",
    workType: "video",
    platform: "抖音",
    goal: "楼盘讲解获客",
    materials: [{ assetRef: "asset_1" }],
  };
  const firstPlan = await postJson(`${runtime.url}/plan`, planRequest);
  const secondPlan = await postJson(`${runtime.url}/plan`, planRequest);
  assert.equal(firstPlan.planId, secondPlan.planId);
  assert.equal(secondPlan.reused, true);
  assert.equal(firstPlan.nextAction, "wait_for_backend_confirmation");

  const chat = await postJson(`${runtime.url}/chat`, {
    messageId: "message-2",
    message: "帮我做一条短视频",
  });
  assert.equal(chat.state, "Clarify");
  assert.match(chat.reply, /作品/);

  const execute = await postJson(
    `${runtime.url}/execute`,
    {
      toolName: "image.generate",
      input: {
        promptPackage: { title: "楼盘封面", prompt: "清爽明亮的社区入口" },
        aspectRatio: "3:4",
        count: 1,
      },
      confirmed: false,
    },
    202,
  );
  assert.equal(execute.providerCalled, false);
  assert.equal(execute.status, "awaiting_confirmation");
  assert.equal(execute.billing.status, "estimate");
  assert.equal(execute.billing.realCharge, false);

  const executeDraft = await postJson(`${runtime.url}/execute`, {
    projectId: "project_1",
    sessionId: "session_1",
    idempotencyKey: "same-execute",
    toolName: "image.generate",
    input: {
      promptPackage: { title: "楼盘封面", prompt: "清爽明亮的社区入口" },
      aspectRatio: "3:4",
      count: 1,
    },
    confirmed: false,
  }, 202);
  assert.equal(executeDraft.status, "awaiting_confirmation");
  assert.equal(executeDraft.billing.status, "estimate");

  const executeConfirmed = await postJson(`${runtime.url}/execute`, {
    projectId: "project_1",
    sessionId: "session_1",
    idempotencyKey: "same-execute",
    toolName: "image.generate",
    input: {
      promptPackage: { title: "楼盘封面", prompt: "清爽明亮的社区入口" },
      aspectRatio: "3:4",
      count: 1,
    },
    confirmed: true,
  });
  assert.equal(executeConfirmed.taskId, executeDraft.taskId);
  assert.equal(executeConfirmed.reused, true);
  assert.equal(executeConfirmed.status, "dry_run_completed");
  assert.equal(executeConfirmed.providerCalled, false);
  assert.equal(executeConfirmed.billing.status, "reserve");
  assert.equal(executeConfirmed.billing.realCharge, false);

  const executeConfirmedAgain = await postJson(`${runtime.url}/execute`, {
    projectId: "project_1",
    sessionId: "session_1",
    idempotencyKey: "same-execute",
    toolName: "image.generate",
    input: {
      promptPackage: { title: "楼盘封面", prompt: "清爽明亮的社区入口" },
      aspectRatio: "3:4",
      count: 1,
    },
    confirmed: true,
  });
  assert.equal(executeConfirmedAgain.taskId, executeDraft.taskId);
  assert.equal(executeConfirmedAgain.reused, true);
  assert.equal(executeConfirmedAgain.status, "dry_run_completed");
  assert.equal(executeConfirmedAgain.billing.billingId, executeConfirmed.billing.billingId);

  const status = await getJson(`${runtime.url}/status?taskId=${execute.taskId}`);
  assert.equal(status.taskId, execute.taskId);
  assert.equal(status.status, "awaiting_confirmation");

  const confirmedStatus = await getJson(`${runtime.url}/status?taskId=${executeDraft.taskId}`);
  assert.equal(confirmedStatus.taskId, executeDraft.taskId);
  assert.equal(confirmedStatus.status, "dry_run_completed");
  assert.equal(confirmedStatus.billing.billingId, executeConfirmed.billing.billingId);

  for (const action of ["estimate", "reserve", "settle", "refund", "cancel"]) {
    const billing = await postJson(`${runtime.url}/billing`, {
      action,
      idempotencyKey: `billing-${action}`,
      amount: action === "estimate" ? 0 : 1,
    });
    assert.equal(billing.status, action);
    assert.equal(billing.realCharge, false);
  }

  const invalidJson = await fetch(`${runtime.url}/plan`, {
    method: "POST",
    body: "{",
  });
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error, "invalid_json");

  const tooLarge = await fetch(`${runtime.url}/plan`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(140 * 1024) }),
  });
  assert.equal(tooLarge.status, 413);

  const wrongMethod = await fetch(`${runtime.url}/health`, {
    method: "POST",
  });
  assert.equal(wrongMethod.status, 405);
  const wrongMethodPayload = await wrongMethod.json();
  assert.equal(wrongMethodPayload.error, "method_not_allowed");
});

async function listen(server: Server): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.equal(typeof address, "object");
  assert.ok(address);

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }),
  };
}

async function getJson(url: string): Promise<any> {
  const response = await fetch(url);
  if (!response.ok) {
    assert.fail(await response.text());
  }
  return response.json();
}

async function postJson(url: string, body: unknown, status = 200): Promise<any> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status !== status) {
    assert.fail(await response.text());
  }
  return response.json();
}
