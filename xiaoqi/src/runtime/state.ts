import { randomUUID } from "node:crypto";
import {
  type MdouBillingEntry,
  type MdouBillingRequest,
  type PlanResponse,
  type RuntimeTask,
} from "./types.ts";

export class XiaoqiRuntimeState {
  readonly startedAt = new Date().toISOString();
  readonly plansByKey = new Map<string, PlanResponse>();
  readonly tasks = new Map<string, RuntimeTask>();
  readonly tasksByKey = new Map<string, RuntimeTask>();
  readonly billing = new Map<string, MdouBillingEntry>();
  readonly billingByKey = new Map<string, MdouBillingEntry>();

  getOrCreatePlan(key: string, create: () => PlanResponse): PlanResponse {
    const existing = this.plansByKey.get(key);
    if (existing) {
      return { ...existing, reused: true };
    }

    const created = create();
    this.plansByKey.set(key, created);
    return created;
  }

  getOrCreateTask(
    key: string,
    create: () => Omit<RuntimeTask, "taskId" | "createdAt" | "reused">,
  ): RuntimeTask {
    const existing = this.tasksByKey.get(key);
    if (existing) {
      return { ...existing, reused: true };
    }

    const created = this.createTask({ ...create(), reused: false });
    this.tasksByKey.set(key, created);
    return created;
  }

  createTask(task: Omit<RuntimeTask, "taskId" | "createdAt">): RuntimeTask {
    const created: RuntimeTask = {
      ...task,
      taskId: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(created.taskId, created);
    return created;
  }

  getTask(taskId: string): RuntimeTask | undefined {
    return this.tasks.get(taskId);
  }

  getOrCreateBilling(request: MdouBillingRequest): MdouBillingEntry {
    const key = `${request.action}:${request.idempotencyKey}`;
    const existing = this.billingByKey.get(key);
    if (existing) {
      return existing;
    }

    const created: MdouBillingEntry = {
      billingId: randomUUID(),
      action: request.action,
      status: request.action,
      idempotencyKey: request.idempotencyKey,
      toolName: request.toolName,
      taskId: request.taskId,
      amount: request.amount ?? 0,
      currency: "mdou",
      realCharge: false,
      createdAt: new Date().toISOString(),
      auditSummary:
        "M-dou mock contract recorded locally; no real balance reserve, settle, refund, or cancel occurred.",
    };
    this.billing.set(created.billingId, created);
    this.billingByKey.set(key, created);
    return created;
  }

  getBilling(billingId: string): MdouBillingEntry | undefined {
    return this.billing.get(billingId);
  }
}

export function createXiaoqiRuntimeState(): XiaoqiRuntimeState {
  return new XiaoqiRuntimeState();
}
