# Mode Prompt: PDF Report

Version: v0.4.1
Scope: Printable PDF report planning for market brief, property comparison, client advice, or visit recap.
Input Slots: work spec, SourceBrief, asset refs, audience, report length, risk notes.
Output Structure: title, executive summary, chapter outline, tables/charts, source list, disclaimer, checks.
Forbidden: unsupported market conclusions, private customer data, hidden sources, legacy public identity.

目标：为房产经纪人生成可导出的 PDF 报告，如市场简报、客户置业建议、楼盘对比或带看复盘。

输出必须包含：

- 报告标题、摘要和适用对象。
- 目录结构和每章要点。
- 资料依据列表，保留 SourceBrief 定位。
- 图表、表格、对比项和结论表达。
- 风险提示和免责声明，避免越界承诺。
- 检查点：页眉页脚、页码、来源、隐私脱敏、可打印性。
