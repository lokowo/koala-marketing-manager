import ReactPDF from '@react-pdf/renderer';
import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { getServerUser } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase/server';
import { getUserTier } from '../../../lib/services/usageTracker';
import { registerPdfFonts, CJK_FONT } from '../../../lib/server/pdf-fonts';

function createStyles(fontFamily: string) {
  return StyleSheet.create({
    page: {
      padding: 48,
      paddingTop: 40,
      paddingBottom: 40,
      fontFamily,
      fontSize: 10.5,
      lineHeight: 1.4,
      color: '#1a1a1a',
    },
    headerRow: {
      flexDirection: 'row',
      marginBottom: 16,
      alignItems: 'flex-start',
    },
    headerText: {
      flex: 1,
    },
    name: {
      fontSize: 20,
      fontFamily,
      fontWeight: 700,
      marginBottom: 4,
    },
    contactLine: {
      fontSize: 9,
      color: '#555',
      marginBottom: 1.5,
    },
    photo: {
      width: 72,
      height: 90,
      objectFit: 'cover',
      borderRadius: 2,
      marginLeft: 16,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily,
      fontWeight: 700,
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
      fontFamily,
      fontWeight: 700,
    },
    itemSubtitle: {
      fontSize: 10,
      fontFamily,
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
      fontFamily,
      fontWeight: 700,
      width: 80,
    },
    skillValue: {
      fontSize: 10,
      flex: 1,
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
}

interface CVItem {
  title: string;
  subtitle?: string | null;
  date?: string;
  details?: string[];
  needs_enhancement?: boolean;
}

interface CVSection {
  title: string;
  items: CVItem[];
}

interface CVData {
  header: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    linkedin?: string | null;
    website?: string | null;
  };
  sections: CVSection[];
  skills?: {
    languages?: string[];
    technical?: string[];
    soft?: string[];
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AcademicCV({ cv, photoUrl, styles }: { cv: CVData; photoUrl?: string; styles: any }) {
  const h = cv.header;
  const contactParts: string[] = [];
  if (h.email) contactParts.push(h.email);
  if (h.phone) contactParts.push(h.phone);
  if (h.address) contactParts.push(h.address);
  const links: string[] = [];
  if (h.linkedin) links.push(h.linkedin);
  if (h.website) links.push(h.website);

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'A4', style: styles.page },

      // Header with optional photo
      React.createElement(View, { style: styles.headerRow },
        React.createElement(View, { style: styles.headerText },
          React.createElement(Text, { style: styles.name }, h.name || 'Name'),
          contactParts.length > 0 &&
            React.createElement(Text, { style: styles.contactLine }, contactParts.join('  |  ')),
          links.length > 0 &&
            React.createElement(Text, { style: styles.contactLine }, links.join('  |  ')),
        ),
        photoUrl
          ? React.createElement(Image, { style: styles.photo, src: photoUrl })
          : null,
      ),

      // Sections
      ...cv.sections.map((section, si) =>
        React.createElement(View, { key: si },
          React.createElement(Text, { style: styles.sectionTitle }, section.title),
          ...section.items.map((item, ii) =>
            React.createElement(View, { key: ii, style: styles.itemBlock },
              React.createElement(View, { style: styles.itemRow },
                React.createElement(Text, { style: styles.itemTitle }, item.title),
                item.date ? React.createElement(Text, { style: styles.itemDate }, item.date) : null,
              ),
              item.subtitle
                ? React.createElement(Text, { style: styles.itemSubtitle }, item.subtitle)
                : null,
              ...(item.details ?? []).map((d, di) =>
                React.createElement(Text, { key: di, style: styles.bullet }, `• ${d}`)
              ),
            )
          ),
        )
      ),

      // Skills section
      cv.skills ? React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'SKILLS'),
        cv.skills.languages && cv.skills.languages.length > 0
          ? React.createElement(View, { style: styles.skillsRow },
              React.createElement(Text, { style: styles.skillLabel }, 'Languages:'),
              React.createElement(Text, { style: styles.skillValue }, cv.skills.languages.join(', ')),
            )
          : null,
        cv.skills.technical && cv.skills.technical.length > 0
          ? React.createElement(View, { style: styles.skillsRow },
              React.createElement(Text, { style: styles.skillLabel }, 'Technical:'),
              React.createElement(Text, { style: styles.skillValue }, cv.skills.technical.join(', ')),
            )
          : null,
        cv.skills.soft && cv.skills.soft.length > 0
          ? React.createElement(View, { style: styles.skillsRow },
              React.createElement(Text, { style: styles.skillLabel }, 'Soft Skills:'),
              React.createElement(Text, { style: styles.skillValue }, cv.skills.soft.join(', ')),
            )
          : null,
      ) : null,

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

    const tier = await getUserTier(supabaseAdmin, user.id);
    if (tier === 'free') {
      return Response.json({ error: 'PDF 下载为付费功能，请升级订阅', upgrade: true }, { status: 403 });
    }

    const { cv, photoUrl } = await req.json() as { cv: CVData; photoUrl?: string };

    if (!cv || !cv.header || !cv.sections) {
      return Response.json({ error: 'Invalid CV data' }, { status: 400 });
    }

    const allText = JSON.stringify(cv);
    const fontFamily = await registerPdfFonts(allText);
    const styles = createStyles(fontFamily);

    const element = React.createElement(AcademicCV, { cv, photoUrl, styles });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfStream = await ReactPDF.renderToStream(element as any);

    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    const versionLabel = cv.header.name?.replace(/\s+/g, '_') ?? 'cv';
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CV_${versionLabel}_${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    console.error('[generate-cv-pdf]', e);
    return Response.json({ error: 'PDF generation failed' }, { status: 500 });
  }
}
