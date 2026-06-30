#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const testFiles = listFiles().filter(
  (file) => file.startsWith("xiaoqi/tests/") && file.endsWith(".test.ts"),
);

const steps = [
  ["build", process.execPath, ["scripts/xiaoqi-build.mjs"]],
  ["unit tests", process.execPath, ["--test", ...testFiles]],
  ["brand scan", process.execPath, ["scripts/xiaoqi-brand-scan.mjs"]],
  ["secret scan", process.execPath, ["scripts/xiaoqi-secret-scan.mjs"]],
  ["cli version", process.execPath, ["xiaoqi.mjs", "--version"]],
  ["cli health", process.execPath, ["xiaoqi.mjs", "health"]],
  ["http smoke", process.execPath, ["scripts/xiaoqi-http-smoke.mjs"]],
  ["fresh clone", process.execPath, ["scripts/xiaoqi-fresh-clone-check.mjs"]],
];

for (const [label, command, args] of steps) {
  console.log(`\n[xiaoqi:verify] ${label}`);
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nXiaoqi verify passed.");

function listFiles() {
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git ls-files failed");
  }
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}
