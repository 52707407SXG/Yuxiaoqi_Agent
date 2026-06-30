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
];

const forbidden = [
  { label: "Hermes", pattern: /\bHermes\b/g },
  { label: "Lucan", pattern: /\bLucan\b/g },
  { label: "Xiaoban", pattern: /\bXiaoban\b/g },
  { label: "openclaw.mjs", pattern: /\bopenclaw\.mjs\b/g },
  { label: "OPENCLAW_", pattern: /\bOPENCLAW_/g },
  { label: "OpenClaw", pattern: /\bOpenClaw\b/g },
  { label: "openclaw", pattern: /\bopenclaw\b/g },
];

const files = [];
for (const target of scanTargets) {
  await collect(join(root, target), files);
}

const findings = [];
for (const file of files) {
  const rel = relative(root, file);
  const text = await readFile(file, "utf8");
  for (const item of forbidden) {
    for (const match of text.matchAll(item.pattern)) {
      const index = match.index ?? 0;
      if (!isAllowedAttribution(rel, item.label, text, index)) {
        findings.push(`${rel}: ${item.label}`);
      }
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

console.log(`Xiaoqi brand scan passed: ${files.length} public-surface files checked.`);

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

function isAllowedAttribution(file, label, text, index) {
  if (file === "XIAOQI-BASELINE.md") {
    return label === "OpenClaw" || label === "openclaw";
  }
  if (file === "README.md") {
    return label === "OpenClaw" || label === "openclaw";
  }
  if (file.startsWith("docs/")) {
    return label === "OpenClaw" || label === "openclaw";
  }

  const context = text.slice(Math.max(0, index - 16), index + 32);
  if (file === "package.json" && context.includes("@openclaw/")) {
    return label === "openclaw";
  }

  return false;
}
