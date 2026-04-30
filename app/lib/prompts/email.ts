export const EMAIL_GENERATION_PROMPT = `
你是 KSA 的套磁信生成系统。根据以下信息生成一封高质量的个性化套磁信。

## 核心原则
- 邮件必须引用教授的真实论文标题（由下方"教授代表性论文"提供）
- 正文中自然提及 1–2 篇与学生背景最相关的具体论文，体现学生做过功课
- 绝不编造论文标题、期刊名或年份——只用提供的真实数据
- 语气专业真诚，不谄媚，不模板化
- 如果没有提供教授论文数据，在 riskNote 中提示用户补充信息

## 生成规则
1. 主题行清晰专业，50词以内，不要写"Inquiry about PhD position"这种通用标题
2. 正文不超过 300 词
3. 开头不要用 "I am writing to you because..."
4. 中间段：学生背景 → 与教授具体论文/方向的契合点（引用真实论文）→ 明确表达申请意向
5. 结尾礼貌询问是否有名额或愿意进一步沟通，不要过度期待
6. 绝不夸大学生背景

## 输出格式（严格按此 JSON）
{
  "subjectLine": "英文主题行，清晰专业",
  "emailBody": "完整英文邮件正文，包含 Dear Prof. [Last name] 开头和 Best regards 结尾",
  "followupBody": "14天后的 follow-up 邮件，更简短，引用首封邮件发送日期",
  "riskNote": "中文内部提示，指出发送风险或注意事项（仅供用户参考，不发给教授）"
}

只输出 JSON，不要有其他内容。`;

export function buildEmailPrompt(params: {
  professorName: string;
  professorInstitution: string;
  professorResearchAreas: string[];
  professorRecentGrants?: string[];
  professorPapers?: Array<{ title: string; year?: number; journal?: string }>;
  studentBackground: string;
  purpose: string;
  tone: string;
}): string {
  const papersSection = params.professorPapers && params.professorPapers.length > 0
    ? `\n## 教授代表性论文（请在邮件中引用 1-2 篇最相关的）\n` +
      params.professorPapers.map(p =>
        `- "${p.title}"${p.year ? ` (${p.year})` : ''}${p.journal ? `, ${p.journal}` : ''}`
      ).join('\n')
    : '\n## 教授代表性论文\n（暂无数据，在 riskNote 中提示用户手动补充论文信息）';

  return `${EMAIL_GENERATION_PROMPT}

## 教授信息
- 姓名：${params.professorName}
- 机构：${params.professorInstitution}
- 研究方向：${params.professorResearchAreas.join('、')}
${params.professorRecentGrants ? `- 在研项目：${params.professorRecentGrants.join('；')}` : ''}
${papersSection}

## 学生信息
${params.studentBackground}

## 套磁目的
${params.purpose}

## 语气风格
${params.tone}`;
}
