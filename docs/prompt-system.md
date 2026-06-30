# Xiaoqi Prompt System

## Runtime Files

- `prompts/kernel.system.md`
- `prompts/modes/wechat-article.md`
- `prompts/modes/xiaohongshu.md`
- `prompts/modes/ppt.md`
- `prompts/modes/pdf-report.md`
- `prompts/modes/image.md`
- `prompts/modes/video.md`
- `prompts/modes/podcast.md`
- `prompts/modes/voice-script.md`
- `prompts/inspections/prompt-package-check.md`
- `prompts/inspections/artifact-quality-check.md`

The loader is `xiaoqi/src/prompts/loader.ts`.

## Metadata Requirement

Each prompt carries:

- version
- scope
- input slots
- output structure
- forbidden items

The kernel prompt defines Xiaoqi as My Stand's real-estate creative director Agent and keeps the state machine:

`Intake -> Clarify -> Spec -> SourceBrief -> PromptPackage -> ToolPlan -> Confirm -> Execute -> Inspect -> Revise -> Artifact -> SkillCandidate -> SkillSave`

## Safety

Mode prompts can add format-specific technique, but cannot override the kernel identity, confirmation boundary, tool boundary, source boundary, or Provider boundary.

High-cost actions, external CLI, real Provider work, batch generation, long video, and M-dou charging must stop at confirmation until the My Stand backend authorizes execution.
