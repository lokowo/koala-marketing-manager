import ReactPDF, { Font } from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getServerUser } from '../../../../lib/auth';

Font.register({
  family: 'NotoSerifSC',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-serif-sc@latest/chinese-simplified-400-normal.woff2', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/noto-serif-sc@latest/chinese-simplified-700-normal.woff2', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 48,
    paddingTop: 40,
    paddingBottom: 40,
    fontFamily: 'NotoSerifSC',
    fontSize: 10.5,
    lineHeight: 1.4,
    color: '#1a1a1a',
  },
  name: {
    fontSize: 20,
    fontFamily: 'NotoSerifSC', fontWeight: 700,
    textAlign: 'center',
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9,
    color: '#555',
    textAlign: 'center',
    marginBottom: 1.5,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'NotoSerifSC', fontWeight: 700,
    borderBottomWidth: 0.8,
    borderBottomColor: '#333',
    paddingBottom: 2,
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  itemTitle: {
    fontSize: 10.5,
    fontFamily: 'NotoSerifSC', fontWeight: 700,
  },
  itemSubtitle: {
    fontSize: 10,
    fontFamily: 'NotoSerifSC',
    color: '#444',
    marginBottom: 2,
  },
  itemDate: {
    fontSize: 9.5,
    color: '#555',
    textAlign: 'right',
    minWidth: 80,
  },
  bullet: {
    fontSize: 10,
    marginLeft: 12,
    marginBottom: 1.5,
  },
  itemBlock: {
    marginBottom: 6,
  },
  skillsRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  skillLabel: {
    fontSize: 10,
    fontFamily: 'NotoSerifSC', fontWeight: 700,
    width: 80,
  },
  skillValue: {
    fontSize: 10,
    flex: 1,
  },
  pubEntry: {
    fontSize: 10,
    marginBottom: 3,
    marginLeft: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    textAlign: 'center',
    fontSize: 7.5,
    color: '#bbb',
  },
});

interface CVContent {
  personal: { name?: string; email?: string; phone?: string; linkedin?: string };
  education?: Array<{ degree: string; university: string; gpa?: string; dates?: string; thesis?: string }>;
  research?: Array<{ title: string; lab?: string; supervisor?: string; period?: string; description?: string }>;
  publications?: Array<{ title: string; journal?: string; year?: number; authors?: string; doi?: string }>;
  skills?: { technical?: string[]; languages?: string[]; tools?: string[] };
  awards?: Array<{ title: string; organization?: string; year?: number }>;
  references?: Array<{ name: string; title?: string; university?: string; email?: string; relationship?: string }>;
}

function AcademicCVPdf({ cv }: { cv: CVContent }) {
  const p = cv.personal;
  const contactParts: string[] = [];
  if (p.email) contactParts.push(p.email);
  if (p.phone) contactParts.push(p.phone);
  if (p.linkedin) contactParts.push(p.linkedin);

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },

      // Name centered
      React.createElement(Text, { style: styles.name }, p.name || 'Name'),
      contactParts.length > 0 &&
        React.createElement(Text, { style: styles.contactLine }, contactParts.join('  |  ')),

      // Education
      cv.education && cv.education.length > 0 && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'EDUCATION'),
        ...cv.education.map((e, i) =>
          React.createElement(View, { key: i, style: styles.itemBlock },
            React.createElement(View, { style: styles.itemRow },
              React.createElement(Text, { style: styles.itemTitle }, e.university),
              e.dates ? React.createElement(Text, { style: styles.itemDate }, e.dates) : null,
            ),
            React.createElement(Text, { style: styles.itemSubtitle },
              [e.degree, e.gpa ? `GPA: ${e.gpa}` : null].filter(Boolean).join('  |  ')
            ),
            e.thesis ? React.createElement(Text, { style: styles.bullet }, `Thesis: ${e.thesis}`) : null,
          )
        ),
      ),

      // Research Experience
      cv.research && cv.research.length > 0 && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'RESEARCH EXPERIENCE'),
        ...cv.research.map((r, i) =>
          React.createElement(View, { key: i, style: styles.itemBlock },
            React.createElement(View, { style: styles.itemRow },
              React.createElement(Text, { style: styles.itemTitle }, r.title),
              r.period ? React.createElement(Text, { style: styles.itemDate }, r.period) : null,
            ),
            (r.lab || r.supervisor) ? React.createElement(Text, { style: styles.itemSubtitle },
              [r.lab, r.supervisor ? `Supervisor: ${r.supervisor}` : null].filter(Boolean).join('  |  ')
            ) : null,
            ...(r.description ?? '').split('\n').filter(Boolean).map((line, li) =>
              React.createElement(Text, { key: li, style: styles.bullet },
                line.startsWith('- ') || line.startsWith('• ') ? `• ${line.slice(2)}` : `• ${line}`
              )
            ),
          )
        ),
      ),

      // Publications
      cv.publications && cv.publications.length > 0 && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'PUBLICATIONS'),
        ...cv.publications.map((pub, i) => {
          const parts: string[] = [];
          if (pub.authors) parts.push(pub.authors);
          parts.push(`"${pub.title}"`);
          if (pub.journal) parts.push(pub.journal);
          if (pub.year) parts.push(String(pub.year));
          if (pub.doi) parts.push(`DOI: ${pub.doi}`);
          return React.createElement(Text, { key: i, style: styles.pubEntry },
            `[${i + 1}] ${parts.join('. ')}.`
          );
        }),
      ),

      // Skills
      cv.skills && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'SKILLS'),
        cv.skills.technical && cv.skills.technical.length > 0
          ? React.createElement(View, { style: styles.skillsRow },
              React.createElement(Text, { style: styles.skillLabel }, 'Technical:'),
              React.createElement(Text, { style: styles.skillValue }, cv.skills.technical.join(', ')),
            )
          : null,
        cv.skills.languages && cv.skills.languages.length > 0
          ? React.createElement(View, { style: styles.skillsRow },
              React.createElement(Text, { style: styles.skillLabel }, 'Languages:'),
              React.createElement(Text, { style: styles.skillValue }, cv.skills.languages.join(', ')),
            )
          : null,
        cv.skills.tools && cv.skills.tools.length > 0
          ? React.createElement(View, { style: styles.skillsRow },
              React.createElement(Text, { style: styles.skillLabel }, 'Tools:'),
              React.createElement(Text, { style: styles.skillValue }, cv.skills.tools.join(', ')),
            )
          : null,
      ),

      // Awards
      cv.awards && cv.awards.length > 0 && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'AWARDS & HONOURS'),
        ...cv.awards.map((a, i) =>
          React.createElement(View, { key: i, style: styles.itemRow },
            React.createElement(Text, { style: styles.itemTitle }, a.title),
            React.createElement(Text, { style: styles.itemDate },
              [a.organization, a.year ? String(a.year) : null].filter(Boolean).join(', ')
            ),
          )
        ),
      ),

      // References
      cv.references && cv.references.length > 0 && React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'REFERENCES'),
        ...cv.references.map((r, i) =>
          React.createElement(View, { key: i, style: styles.itemBlock },
            React.createElement(Text, { style: styles.itemTitle }, r.name),
            React.createElement(Text, { style: styles.itemSubtitle },
              [r.title, r.university].filter(Boolean).join(', ')
            ),
            r.email ? React.createElement(Text, { style: styles.bullet }, r.email) : null,
            r.relationship ? React.createElement(Text, { style: styles.bullet }, `(${r.relationship})`) : null,
          )
        ),
      ),

      // Footer
      React.createElement(Text, { style: styles.footer, fixed: true },
        'Generated by Koala PhD · koalaphd.com'
      ),
    )
  );
}

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return Response.json({ error: '请先登录' }, { status: 401 });

    const { content } = await req.json() as { content: CVContent };

    if (!content || !content.personal) {
      return Response.json({ error: 'Invalid CV content' }, { status: 400 });
    }

    const element = React.createElement(AcademicCVPdf, { cv: content });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfStream = await ReactPDF.renderToStream(element as any);

    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const nameSlug = (content.personal.name || 'cv').replace(/\s+/g, '_');
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Academic_CV_${nameSlug}_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    console.error('[cv/pdf]', e);
    return Response.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
