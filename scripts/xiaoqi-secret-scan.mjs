#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const patterns = [
  { label: "private key", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { label: "github token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g },
  { label: "github pat", pattern: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/g },
  { label: "provider key", pattern: /\bsk-[A-Za-z0-9_-]{24,}\b/g },
  {
    label: "cookie assignment",
    pattern: /\b[cC]ookie\s*[:=]\s*["']?[A-Za-z0-9._%+-]{24,}/g,
  },
  {
    label: "token assignment",
    pattern: /\b(?:token|secret|api[_-]?key)\s*[:=]\s*["']?[A-Za-z0-9._%+-]{24,}/gi,
  },
];

const files = listGitDeliveryFiles();
const findings = [];

for (const file of files) {
  const text = await readFile(file, "utf8").catch(() => "");
  for (const item of patterns) {
    for (const match of text.matchAll(item.pattern)) {
      findings.push(`${file}: ${item.label}`);
    }
  }
}

if (findings.length) {
  console.error("Xiaoqi secret scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Xiaoqi secret scan passed: ${files.length} tracked delivery files checked.`);

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
    .filter(Boolean);
}
