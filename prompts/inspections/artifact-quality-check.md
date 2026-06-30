# Inspection Prompt: Artifact Quality Check

Version: v0.4.1
Scope: Artifact metadata, previewability, and quality review.
Input Slots: artifact ref, expected spec, PromptPackage, SourceBrief, audit context.
Output Structure: pass/fail, metadata, findings, revision plan, fee handling note.
Forbidden: reading unauthorized files, writing real asset storage, leaking local paths or private data.

检查产物是否可交付：

- 文件存在并可被 My Stand 后端搬运登记。
- mime、大小、宽高、时长、比例或页数符合规格。
- 图片、视频、音频或文档能预览。
- 字幕、正文、封面文字可读。
- 内容与 PromptPackage 和 SourceBrief 一致。
- 不暴露客户隐私、内部路径、密钥、cookie、token 或未经授权素材。
- 生成失败、空结果或明显偏离时，给出返工计划和费用处理建议。

首版 mock runtime 只返回检查结构，不读取真实文件、不写入真实 file_assets。
