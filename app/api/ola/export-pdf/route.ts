import ReactPDF from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 10, color: '#888', marginBottom: 20 },
  msgRow: { marginBottom: 10 },
  roleLabel: { fontSize: 9, fontWeight: 'bold', color: '#555', marginBottom: 2 },
  userBubble: { backgroundColor: '#f0f0f0', borderRadius: 6, padding: 8 },
  assistantBubble: { backgroundColor: '#e8f5e9', borderRadius: 6, padding: 8 },
  msgText: { fontSize: 10, lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#aaa' },
});

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

function ChatPDF({ messages, date }: { messages: ChatMsg[]; date: string }) {
  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(Text, { style: styles.title }, 'Ola AI 对话记录 — Koala PhD'),
      React.createElement(Text, { style: styles.subtitle }, date),
      ...messages.map((msg, i) =>
        React.createElement(View, { key: i, style: styles.msgRow },
          React.createElement(Text, { style: styles.roleLabel }, msg.role === 'user' ? '你' : '小欧 Ola'),
          React.createElement(View, { style: msg.role === 'user' ? styles.userBubble : styles.assistantBubble },
            React.createElement(Text, { style: styles.msgText }, msg.content)
          )
        )
      ),
      React.createElement(Text, { style: styles.footer, fixed: true }, 'Koala PhD · koalaphd.com')
    )
  );
}

export async function POST(req: Request) {
  try {
    const { getServerUser } = await import('../../../lib/auth');
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { supabaseAdmin } = await import('../../../lib/supabase/server');
    const { getUserTier } = await import('../../../lib/services/usageTracker');
    const tier = await getUserTier(supabaseAdmin, user.id);
    if (tier === 'free') {
      return Response.json({ error: 'PDF 导出为付费功能，请升级订阅', upgrade: true }, { status: 403 });
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    const chatMessages: ChatMsg[] = messages
      .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
      .map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    const date = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    const element = React.createElement(ChatPDF, { messages: chatMessages, date });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfStream = await ReactPDF.renderToStream(element as any);

    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ola-chat-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    console.error('[ola/export-pdf]', e);
    return Response.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
