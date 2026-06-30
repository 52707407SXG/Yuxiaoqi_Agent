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

  const status = await getJson(`${runtime.url}/status?taskId=${execute.taskId}`);
  assert.equal(status.taskId, execute.taskId);
  assert.equal(status.status, "awaiting_confirmation");
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
