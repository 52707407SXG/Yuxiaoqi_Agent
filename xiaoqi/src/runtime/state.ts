import { randomUUID } from "node:crypto";
import { type PlanResponse, type RuntimeTask } from "./types.ts";

export class XiaoqiRuntimeState {
  readonly startedAt = new Date().toISOString();
  readonly plansByKey = new Map<string, PlanResponse>();
  readonly tasks = new Map<string, RuntimeTask>();

  getOrCreatePlan(key: string, create: () => PlanResponse): PlanResponse {
    const existing = this.plansByKey.get(key);
    if (existing) {
      return { ...existing, reused: true };
    }

    const created = create();
    this.plansByKey.set(key, created);
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
}

export function createXiaoqiRuntimeState(): XiaoqiRuntimeState {
  return new XiaoqiRuntimeState();
}
