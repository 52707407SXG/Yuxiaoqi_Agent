#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const scanTargets = [
  "README.md",
  "package.json",
  "XIAOQI-BASELINE.md",
  "xiaoqi",
  "prompts",
  "docs/architecture.md",
  "docs/prompt-system.md",
  "docs/tool-contract.md",
  "docs/operation-runbook.md",
  "scripts/xiaoqi-brand-scan.mjs",
  "scripts/xiaoqi-secret-scan.mjs",
];

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

const files = [];
for (const target of scanTargets) {
  await collect(join(root, target), files);
}

const findings = [];
for (const file of files) {
  const rel = relative(root, file);
  const text = await readFile(file, "utf8");
  for (const item of patterns) {
    for (const match of text.matchAll(item.pattern)) {
      findings.push(`${rel}: ${item.label}`);
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

console.log(`Xiaoqi secret scan passed: ${files.length} files checked.`);

async function collect(path, files) {
  const info = await stat(path).catch(() => null);
  if (!info) {
    return;
  }
  if (info.isFile()) {
    files.push(path);
    return;
  }
  if (!info.isDirectory()) {
    return;
  }
  for (const entry of await readdir(path)) {
    if (entry === "node_modules" || entry === ".git" || entry === "dist") {
      continue;
    }
    await collect(join(path, entry), files);
  }
}
