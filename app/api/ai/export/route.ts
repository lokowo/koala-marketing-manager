import type { NextRequest } from 'next/server';
import type { AIMode } from '../../../lib/constants';
import type { ChatMessage } from '../../../lib/types';

interface EmailResultForExport {
  professorName: string;
  professorInstitution?: string;
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
    new Paragraph({ children: [new TextRun({ text: `Koala Study Advisors`, size: 28, color: 'c4a050' })], alignment: AlignmentType.CENTER }),
    new Paragraph({ children: [new TextRun({ text: `生成日期：${new Date().toLocaleDateString('zh-CN')}`, size: 24, color: '907858' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
    new Paragraph({ children: [new TextRun({ text: `共 ${emails.length} 封套磁信`, size: 24, color: '584838' })], alignment: AlignmentType.CENTER }),
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

  // Disclaimer
  sections.push(
    new Paragraph({ children: [new PageBreak()] }),
    new Paragraph({ children: [new TextRun({ text: '免责声明', bold: true, size: 24 })], spacing: { after: 120 } }),
    new Paragraph({
      children: [new TextRun({ text: '本套磁信由 Koala Study Advisors AI 系统生成，仅供参考。发送前请仔细核对教授信息，确认邮箱地址，并根据实际情况调整内容。KSA 不承担因套磁信内容引起的任何责任。', size: 20, color: '584838' })],
      spacing: { after: 80 },
    }),
    new Paragraph({ children: [new TextRun({ text: 'Koala Study Advisors · Suite 22/26A Lime St, Sydney NSW 2000 · info@koalastudy.net', size: 18, color: '907858' })] }),
  );

  const doc = new Document({ sections: [{ children: sections }] });
  return Packer.toBuffer(doc);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Batch emails export (docx)
    if (body.exportType === 'batch-emails') {
      const { emails, title } = body as { emails: EmailResultForExport[]; title?: string };
      if (!emails?.length) {
        return Response.json({ error: 'No emails provided' }, { status: 400 });
      }
      const docTitle = title ?? `套磁信打包 · ${new Date().toLocaleDateString('zh-CN')}`;
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
    };

    const exportTitle = title ?? `考拉学长对话记录 — ${modeLabel[mode] ?? mode}`;
    const timestamp = new Date().toLocaleDateString('zh-CN');

    let md = `# ${exportTitle}\n\n`;
    md += `**导出时间：** ${timestamp}\n`;
    md += `**对话模式：** ${modeLabel[mode] ?? mode}\n`;
    md += `**来源：** Koala Study Advisors · koalastudy.net\n\n`;
    md += `---\n\n`;
    md += `> ⚠ 本记录由 AI 生成，仅供参考。重要决策请咨询 KSA 学术顾问团队。\n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? '**你**' : '**考拉学长**';
      md += `${role}\n\n${msg.content}\n\n---\n\n`;
    }

    md += `\n*Koala Study Advisors · Suite 22/26A Lime St, Sydney NSW 2000 · info@koalastudy.net*\n`;

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
