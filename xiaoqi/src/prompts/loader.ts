import { readFile } from "node:fs/promises";

export const modePromptSlugs = [
  "wechat-article",
  "xiaohongshu",
  "ppt",
  "pdf-report",
  "image",
  "video",
  "podcast",
  "voice-script",
] as const;

export type ModePromptSlug = (typeof modePromptSlugs)[number];

export type PromptBundle = {
  kernel: string;
  modes: Record<ModePromptSlug, string>;
  inspections: {
    promptPackageCheck: string;
    artifactQualityCheck: string;
  };
};

export async function loadKernelPrompt(): Promise<string> {
  return readPrompt("prompts/kernel.system.md");
}

export async function loadModePrompt(slug: ModePromptSlug): Promise<string> {
  return readPrompt(`prompts/modes/${slug}.md`);
}

export async function loadPromptBundle(): Promise<PromptBundle> {
  const modeEntries = await Promise.all(
    modePromptSlugs.map(async (slug) => [slug, await loadModePrompt(slug)] as const),
  );

  return {
    kernel: await loadKernelPrompt(),
    modes: Object.fromEntries(modeEntries) as Record<ModePromptSlug, string>,
    inspections: {
      promptPackageCheck: await readPrompt("prompts/inspections/prompt-package-check.md"),
      artifactQualityCheck: await readPrompt("prompts/inspections/artifact-quality-check.md"),
    },
  };
}

async function readPrompt(relativePath: string): Promise<string> {
  const url = new URL(`../../../${relativePath}`, import.meta.url);
  return readFile(url, "utf8");
}
