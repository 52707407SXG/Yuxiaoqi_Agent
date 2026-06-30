import {
  getToolDefinition,
  listToolDefinitions,
  type ToolDefinition,
  type ToolName,
} from "../contracts/toolRegistry.ts";
import { createToolPlan, type ToolPlan } from "./invocation.ts";

export function getRegisteredTools(): readonly ToolDefinition[] {
  return listToolDefinitions();
}

export function requireRegisteredTool(name: string): ToolDefinition {
  const definition = getToolDefinition(name);
  if (!definition) {
    throw new Error(`Xiaoqi ToolRegistry rejected unregistered tool: ${name}`);
  }
  return definition;
}

export function planRegisteredTool(name: ToolName): ToolPlan {
  requireRegisteredTool(name);
  return createToolPlan(name);
}
