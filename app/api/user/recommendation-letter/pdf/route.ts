import ReactPDF from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getServerUser } from '../../../../lib/auth';
import { registerPdfFonts } from '../../../../lib/server/pdf-fonts';

function createStyles(fontFamily: string) {
  return StyleSheet.create({
    page: {
      padding: 54,
      paddingTop: 50,
      paddingBottom: 50,
      fontFamily,
      fontSize: 11,
      lineHeight: 1.6,
      color: '#1a1a1a',
    },
    header: { marginBottom: 24 },
    date: { fontSize: 11, color: '#333', marginBottom: 18 },
    salutation: { fontSize: 11, marginBottom: 12 },
    paragraph: { fontSize: 11, lineHeight: 1.6, textAlign: 'justify', marginBottom: 10 },
    closing: { marginTop: 24, fontSize: 11, lineHeight: 1.6 },
    signature: { marginTop: 28, fontSize: 11 },
    sigName: { fontFamily, fontWeight: 700, fontSize: 12 },
    sigTitle: { fontSize: 10, color: '#555', marginTop: 2 },
    footer: { position: 'absolute', bottom: 28, left: 54, right: 54, textAlign: 'center', fontSize: 7.5, color: '#bbb' },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLetterBody(text: string, styles: any) {
  return text
    .split(/\n\n+/)
    .filter(p => p.trim())
    .map((p, i) =>
      React.createElement(Text, { key: i, style: styles.paragraph }, p.trim())
    );
}

function RecommendationLetterPDF({
  letter,
  recommenderName,
  recommenderTitle,
  styles,
}: {
  letter: string;
  recommenderName: string;
  recommenderTitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  styles: any;
}) {
  const today = new Date().toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.header },
        React.createElement(Text, { style: styles.date }, today),
      ),
      ...renderLetterBody(letter, styles),
      React.createElement(View, { style: styles.signature },
        React.createElement(Text, { style: styles.sigName }, recommenderName),
        recommenderTitle
          ? React.createElement(Text, { style: styles.sigTitle }, recommenderTitle)
          : null,
      ),
      React.createElement(Text, { style: styles.footer, fixed: true },
        'Draft prepared with Koala PhD · koalaphd.com'
      ),
    )
  );
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { letter, recommenderName, recommenderTitle } = await req.json() as {
      letter: string;
      recommenderName: string;
      recommenderTitle?: string;
    };

    if (!letter || !recommenderName) {
      return Response.json({ error: 'Missing letter or recommenderName' }, { status: 400 });
    }

    const allText = [letter, recommenderName, recommenderTitle ?? ''].join(' ');
    const fontFamily = await registerPdfFonts(allText);
    const styles = createStyles(fontFamily);

    const element = React.createElement(RecommendationLetterPDF, {
      letter, recommenderName, recommenderTitle, styles,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfStream = await ReactPDF.renderToStream(element as any);

    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const filename = `Recommendation_Letter_${recommenderName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error('[recommendation-letter/pdf]', e);
    return Response.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
