import type { NextRequest } from 'next/server';
import type { AIMode } from '../../../lib/constants';
import type { ChatMessage } from '../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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

    // Build markdown content
    let md = `# ${exportTitle}\n\n`;
    md += `**导出时间：** ${timestamp}\n`;
    md += `**对话模式：** ${modeLabel[mode] ?? mode}\n`;
    md += `**来源：** Koala Study Advisors · koalastudyadvisors.net\n\n`;
    md += `---\n\n`;
    md += `> ⚠ 本记录由 AI 生成，仅供参考。重要决策请咨询 KSA 学术顾问团队。\n\n`;
    md += `---\n\n`;

    for (const msg of messages) {
      const role = msg.role === 'user' ? '**你**' : '**考拉学长**';
      md += `${role}\n\n${msg.content}\n\n---\n\n`;
    }

    md += `\n*Koala Study Advisors · Suite 22/26A Lime St, Sydney NSW 2000 · info@koalastudyadvisors.net*\n`;

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
