#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";

const checkFiles = listGitFiles().filter((file) =>
  file.endsWith(".ts") || file.endsWith(".mjs"),
);

for (const file of checkFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}

const distEntry = "dist/xiaoqi/cli.mjs";
await mkdir(dirname(distEntry), { recursive: true });
await writeFile(
  distEntry,
  `#!/usr/bin/env node\nawait import("../../xiaoqi/src/cli.ts");\n`,
  { mode: 0o755 },
);
await writeFile(
  "dist/xiaoqi/build-manifest.json",
  `${JSON.stringify(
    {
      name: "Xiaoqi Agent",
      version: readPackageVersion(),
      entry: distEntry,
      runtime: "node-native-typescript",
      providerCalls: "disabled",
    },
    null,
    2,
  )}\n`,
);

console.log(`Xiaoqi build passed: ${checkFiles.length} JS/TS files checked, ${distEntry} generated.`);

function listGitFiles() {
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git ls-files failed");
  }
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

function readPackageVersion() {
  const result = spawnSync(process.execPath, ["-e", "console.log(require('./package.json').version)"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "package version read failed");
  }
  return result.stdout.trim();
}
