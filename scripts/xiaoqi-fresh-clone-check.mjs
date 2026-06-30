#!/usr/bin/env node
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const tempRoot = await mkdtemp(join(tmpdir(), "xiaoqi-fresh-clone-"));
const cloneDir = join(tempRoot, "repo");

try {
  run("git", ["clone", "--local", "--no-hardlinks", root, cloneDir], root);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], cloneDir);
  run("npm", ["run", "build"], cloneDir);
  run(process.execPath, ["xiaoqi.mjs", "--version"], cloneDir);
  run(process.execPath, ["xiaoqi.mjs", "health"], cloneDir);
  run(process.execPath, ["scripts/xiaoqi-brand-scan.mjs"], cloneDir);
  run(process.execPath, ["scripts/xiaoqi-secret-scan.mjs"], cloneDir);
  console.log("Xiaoqi fresh clone check passed.");
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}
