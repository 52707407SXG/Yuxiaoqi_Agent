#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const allowedAttributionFiles = new Set([
  "LICENSE",
  "THIRD_PARTY_NOTICES.md",
  "XIAOQI-BASELINE.md",
]);

const forbiddenTerms = [
  "Her" + "mes",
  "her" + "mes",
  "Lu" + "can",
  "lu" + "can",
  "Xiao" + "ban",
  "xiao" + "ban",
  "Open" + "Claw",
  "open" + "claw",
  "OPEN" + "CLAW_",
  "open" + "claw.mjs",
];

const files = listGitDeliveryFiles();
const findings = [];

for (const file of files) {
  if (!allowedAttributionFiles.has(file)) {
    for (const term of forbiddenTerms) {
      if (file.includes(term)) {
        findings.push(`${file}: forbidden term in filename: ${term}`);
      }
    }
  }

  const text = await readFile(file, "utf8").catch(() => "");
  if (allowedAttributionFiles.has(file)) {
    continue;
  }
  for (const term of forbiddenTerms) {
    if (text.includes(term)) {
      findings.push(`${file}: forbidden term in public content: ${term}`);
    }
  }
}

if (findings.length) {
  console.error("Xiaoqi brand scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Xiaoqi brand scan passed: ${files.length} tracked delivery files and filenames checked.`);

function listGitDeliveryFiles() {
  const result = spawnSync("git", ["ls-files"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "git ls-files failed");
  }
  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((file) => !file.startsWith(".git/"));
}
