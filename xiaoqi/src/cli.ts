import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildHealth,
  buildPlan,
  createXiaoqiServer,
  XIAOQI_DEFAULT_HOST,
  XIAOQI_DEFAULT_PORT,
} from "./runtime/server.ts";
import { createXiaoqiRuntimeState } from "./runtime/state.ts";

const require = createRequire(import.meta.url);
const packageJson = require("../../package.json") as { version: string };

const args = process.argv.slice(2);
const command = args[0] ?? "help";

if (command === "--version" || command === "-v" || command === "version") {
  console.log(packageJson.version);
} else if (command === "health") {
  console.log(JSON.stringify(await buildHealth(packageJson.version), null, 2));
} else if (command === "plan") {
  const input = await readStdinJson();
  const plan = buildPlan(input, createXiaoqiRuntimeState());
  console.log(JSON.stringify(plan, null, 2));
} else if (command === "serve") {
  const port = Number(readFlag("--port") ?? process.env.XIAOQI_PORT ?? XIAOQI_DEFAULT_PORT);
  const host = readFlag("--host") ?? process.env.XIAOQI_HOST ?? XIAOQI_DEFAULT_HOST;
  const server = createXiaoqiServer({ version: packageJson.version });
  server.listen(port, host, () => {
    const address = server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;
    console.log(`Xiaoqi Agent local mock runtime listening on http://${host}:${resolvedPort}`);
  });
} else {
  printHelp();
}

async function readStdinJson(): Promise<Record<string, unknown>> {
  if (process.stdin.isTTY) {
    return {};
  }

  let raw = "";
  for await (const chunk of process.stdin) {
    raw += chunk;
  }
  return raw.trim() ? JSON.parse(raw) : {};
}

function readFlag(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

async function printHelp(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
  const readme = await readFile(resolve(root, "README.md"), "utf8").catch(() => "");
  const summary = readme.split("\n").slice(0, 8).join("\n");
  console.log(`${summary}

Commands:
  xiaoqi --version
  xiaoqi health
  xiaoqi plan < request.json
  xiaoqi serve --host 127.0.0.1 --port 8788
`);
}
