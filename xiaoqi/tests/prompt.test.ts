import assert from "node:assert/strict";
import test from "node:test";
import { loadPromptBundle, modePromptSlugs } from "../src/prompts/loader.ts";

test("kernel and mode prompts load as Xiaoqi runtime prompts", async () => {
  const bundle = await loadPromptBundle();

  assert.match(bundle.kernel, /余小柒/);
  assert.match(bundle.kernel, /Xiaoqi Agent/);
  assert.match(bundle.kernel, /ToolRegistry/);
  assert.equal(Object.keys(bundle.modes).length, 8);

  for (const slug of modePromptSlugs) {
    assert.match(bundle.modes[slug], /目标/);
  }
});

test("runtime prompts do not expose legacy brand names", async () => {
  const bundle = await loadPromptBundle();
  const allPromptText = [
    bundle.kernel,
    ...Object.values(bundle.modes),
    bundle.inspections.promptPackageCheck,
    bundle.inspections.artifactQualityCheck,
  ].join("\n");

  const forbiddenNames = ["Her" + "mes", "Lu" + "can", "Xiao" + "ban", "Open" + "Claw"];

  for (const forbidden of forbiddenNames) {
    assert.equal(allPromptText.includes(forbidden), false, `prompt should not expose ${forbidden}`);
  }
});
