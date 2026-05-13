import type { NextRequest } from 'next/server';
import type { AIMode } from '../../../lib/constants';
import type { ChatMessage } from '../../../lib/types';
import { getServerUser } from '../../../lib/auth';

interface EmailResultForExport {
  professorName: string;
  professorInstitution?: string;
  professorEmail?: string;
  researchAreas?: string[];
  subjectLine: string;
  emailBody: string;
  followupBody?: string;
  riskNote?: string;
}

async function buildBatchDocx(emails: EmailResultForExport[], title: string): Promise<Buffer> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel,
    AlignmentType, PageBreak, TableOfContents,
  } = await import('docx');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: any[] = [];

  // Cover page
  sections.push(
    new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 48, color: '1a2332' })], alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 400 } }),
    new Paragraph({ children: [new TextRun({ text: `Koala PhD`, size: 28, color: 'c4a050' })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: `生成日期：${new Date().toLocaleDateString('zh-CN')}`, size: 24, color: '907858' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    new Paragraph({ children: [new TextRun({ text: `共 ${emails.length} 封申请信`, size: 24, color: '584838' })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // TOC heading
  sections.push(
    new Paragraph({ text: '目录', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
    new TableOfContents('目录', { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // One section per email
  for (let i = 0; i < emails.length; i++) {
    const e = emails[i];
    const sectionNum = i + 1;

    sections.push(
      new Paragraph({
        text: `${sectionNum}. ${e.professorName}${e.professorInstitution ? ` — ${e.professorInstitution}` : ''}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
    );

    if (e.professorEmail) {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: '📧 邮箱：', bold: true, size: 22 }), new TextRun({ text: e.professorEmail, size: 22 })], spacing: { after: 80 } }),
      );
    } else {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: '📧 邮箱：需手动查找（格式提示：首字母.姓氏@university.edu.au）', size: 22, color: '907858' })], spacing: { after: 80 } }),
      );
    }

    if (e.researchAreas?.length) {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: '🔬 研究方向：', bold: true, size: 22 }), new TextRun({ text: e.researchAreas.join('、'), size: 22 })], spacing: { after: 160 } }),
      );
    }

    sections.push(
      new Paragraph({ children: [new TextRun({ text: '主题行', bold: true, size: 24 })], spacing: { after: 80 } }),
      new Paragraph({ children: [new TextRun({ text: e.subjectLine, size: 22, italics: true })], spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: '邮件正文', bold: true, size: 24 })], spacing: { after: 80 } }),
    );

    // Split body into paragraphs
    for (const line of e.emailBody.split('\n')) {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 80 } }),
      );
    }

    if (e.followupBody) {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: '14天后 Follow-up 邮件', bold: true, size: 24 })], spacing: { before: 240, after: 80 } }),
      );
      for (const line of e.followupBody.split('\n')) {
        sections.push(new Paragraph({ children: [new TextRun({ text: line, size: 22 })], spacing: { after: 80 } }));
      }
    }

    if (e.riskNote) {
      sections.push(
        new Paragraph({ children: [new TextRun({ text: '⚠ 内部提醒', bold: true, size: 22, color: 'b06040' })], spacing: { before: 160, after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: e.riskNote, size: 20, color: '7d4820' })], spacing: { after: 200 } }),
      );
    }

    if (i < emails.length - 1) {
      sections.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  // Sending tips page
  sections.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ text: '发送建议', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: '📧 邮箱格式', bold: true, size: 24 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: '澳洲教授邮箱常见格式：首字母.姓氏@university.edu.au（如 j.smith@unsw.edu.au）。你也可以在教授的大学官网主页找到联系方式。', size: 22 })], spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: '⏰ 发送节奏', bold: true, size: 24 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: '建议每封间隔 1-2 天发送，不要同一天批量发出。教授会看发送时间，过于密集会显得不够用心。', size: 22 })], spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: '📅 最佳时间', bold: true, size: 24 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: '周二至周四上午 9-11 点（教授当地时间）是最佳发送时段。避免周末和节假日。', size: 22 })], spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: '✅ 发送前检查', bold: true, size: 24 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: '1. 确认邮箱地址正确（查教授官网主页）', size: 22 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '2. 核对教授名字拼写无误', size: 22 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '3. 确认学校和研究方向信息准确', size: 22 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '4. 用学校邮箱发送（而非 QQ / 163 邮箱）', size: 22 })], spacing: { after: 60 } }),
    new Paragraph({ children: [new TextRun({ text: '5. 附上 CV（PDF 格式，英文）', size: 22 })], spacing: { after: 200 } }),
    new Paragraph({ children: [new TextRun({ text: '📩 跟进策略', bold: true, size: 24 })], spacing: { after: 80 } }),
    new Paragraph({ children: [new TextRun({ text: '如果 14 天未回复，发一封简短的 follow-up 邮件（已在每封信后附上参考文本）。如果仍无回复，不建议再追。', size: 22 })], spacing: { after: 200 } }),
  );

  // Disclaimer
  sections.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [new TextRun({ text: '免责声明', bold: true, size: 24 })], spacing: { after: 120 } }),
    new Paragraph({
      children: [new TextRun({ text: '本申请信由 Koala PhD AI 系统生成，仅供参考。发送前请仔细核对教授信息，确认邮箱地址，并根据实际情况调整内容。KSA 不承担因申请信内容引起的任何责任。', size: 20, color: '584838' })],
      spacing: { after: 80 },
    }),
    new Paragraph({ children: [new TextRun({ text: 'Koala PhD · Suite 22/26A Lime St, Sydney NSW 2000 · info@koalaphd.com', size: 18, color: '907858' })] }),
  );

  const doc = new Document({ sections: [{ children: sections }] });
  return Packer.toBuffer(doc);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Batch emails export (docx)
    if (body.exportType === 'batch-emails') {
      const { emails, title } = body as { emails: EmailResultForExport[]; title?: string };
      if (!emails?.length) {
        return Response.json({ error: 'No emails provided' }, { status: 400 });
      }
      const docTitle = title ?? `申请信打包 · ${new Date().toLocaleDateString('zh-CN')}`;
      const buffer = await buildBatchDocx(emails, docTitle);
      const uint8 = new Uint8Array(buffer);

      return new Response(uint8, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="koala-emails-${Date.now()}.docx"`,
        },
      });
    }

    // Default: chat export as markdown
    const { messages, mode, title }: { messages: ChatMessage[]; mode: AIMode; title?: string } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const modeLabel: Record<AIMode, string> = {
      path: '路径评估',
      research: '科研深潜',
      chat: '聊天陪伴',
      write: '文案撰写',
      rp: 'RP 助手',
      interview: '模拟面试',
    };

    const exportTitle = title ?? `考拉学长对话记录 — ${modeLabel[mode] ?? mode}`;
    const timestamp = new Date().toLocaleDateString('zh-CN');

    let md = `# ${exportTitle}\n\n`;
    md += `**导出时间：** ${timestamp}\n`;
    md += `**对话模式：** ${modeLabel[mode] ?? mode}\n`;
    md += `**来源：** Koala PhD · koalaphd.com\n\n`;
    md += `---\n\n`;
    md += `> ⚠ 本记录由 AI 生成，仅供参考。重要决策请咨询 KSA 学术顾问团队。\n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? '**你**' : '**考拉学长**';
      md += `${role}\n\n${msg.content}\n\n---\n\n`;
    }

    md += `\n*Koala PhD · Suite 22/26A Lime St, Sydney NSW 2000 · info@koalaphd.com*\n`;

    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="koala-chat-${Date.now()}.md"`,
      },
    });
  } catch (e) {
    console.error('[Export]', e);
    return Response.json({ error: 'Export failed' }, { status: 500 });
  }
}
