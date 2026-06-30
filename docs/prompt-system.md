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

The loader lives at `xiaoqi/src/prompts/loader.ts`.

## Kernel Contract

The kernel prompt defines Xiaoqi as My Stand's real-estate creative director Agent. It requires the state machine:

`Intake -> Clarify -> Spec -> SourceBrief -> PromptPackage -> ToolPlan -> Confirm -> Execute -> Inspect -> Revise -> Artifact -> SkillCandidate -> SkillSave`

High-cost actions, external CLI, real Provider work, batch generation, long video, and M-dou charging must stop at `Confirm` until the My Stand backend authorizes execution.

## Mode Contract

Each mode prompt describes the required output structure and quality checks for one publishable work type:

- WeChat article
- Xiaohongshu note
- PPT
- PDF report
- Image
- Video
- Podcast
- Voice script

Mode prompts are planning instructions only. They do not contain credentials, local paths, Provider login state, or executable commands.

## Inspection Contract

The inspection prompts check PromptPackage completeness and artifact quality. The v0.4 mock runtime does not read real files and does not write real assets; it only returns structures that the My Stand backend can later connect to controlled storage.
