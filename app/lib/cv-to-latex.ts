interface CVPersonal {
  name?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

interface CVEducation {
  degree: string;
  university: string;
  gpa?: string;
  dates?: string;
  thesis?: string;
}

interface CVResearch {
  title: string;
  lab?: string;
  supervisor?: string;
  period?: string;
  description?: string;
}

interface CVPublication {
  title: string;
  journal?: string;
  year?: number;
  authors?: string;
  doi?: string;
}

interface CVAward {
  title: string;
  organization?: string;
  issuer?: string;
  year?: number;
}

interface CVReference {
  name: string;
  title?: string;
  university?: string;
  institution?: string;
  email?: string;
  relationship?: string;
}

interface CVContent {
  personal: CVPersonal;
  education?: CVEducation[];
  research?: CVResearch[];
  publications?: CVPublication[];
  skills?: { technical?: string[]; languages?: string[]; tools?: string[] };
  awards?: CVAward[];
  references?: CVReference[];
}

function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function bulletLines(desc: string | undefined): string {
  if (!desc) return '';
  const lines = desc.split('\n').map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean);
  if (lines.length === 0) return '';
  return '\\begin{itemize}[leftmargin=1.5em, nosep]\n'
    + lines.map(l => `  \\item ${esc(l)}`).join('\n')
    + '\n\\end{itemize}';
}

export function cvToLatex(content: CVContent): string {
  const p = content.personal;
  const name = esc(p.name) || 'Your Name';

  const contactParts: string[] = [];
  if (p.email) contactParts.push(`\\href{mailto:${esc(p.email)}}{${esc(p.email)}}`);
  if (p.phone) contactParts.push(esc(p.phone));
  if (p.linkedin) contactParts.push(`\\href{${esc(p.linkedin)}}{LinkedIn}`);
  const contactLine = contactParts.length > 0 ? contactParts.join(' \\enspace $|$ \\enspace ') : '';

  // --- Education ---
  let educationSection = '';
  if (content.education?.length) {
    const items = content.education.map(e => {
      const lines: string[] = [];
      lines.push(`\\textbf{${esc(e.degree)}} \\hfill ${esc(e.dates) || ''}`);
      const uniLine = [esc(e.university), e.gpa ? `GPA: ${esc(e.gpa)}` : ''].filter(Boolean).join(' \\enspace $|$ \\enspace ');
      lines.push(uniLine);
      if (e.thesis) lines.push(`\\textit{Thesis: ${esc(e.thesis)}}`);
      return lines.join(' \\\\\n');
    });
    educationSection = `\\section*{Education}\n${items.join('\n\\vspace{6pt}\n')}\n`;
  }

  // --- Research ---
  let researchSection = '';
  if (content.research?.length) {
    const items = content.research.map(r => {
      const lines: string[] = [];
      lines.push(`\\textbf{${esc(r.title)}} \\hfill ${esc(r.period) || ''}`);
      const meta = [r.lab ? esc(r.lab) : '', r.supervisor ? `Supervisor: ${esc(r.supervisor)}` : ''].filter(Boolean).join(' \\enspace $|$ \\enspace ');
      if (meta) lines.push(meta);
      const bullets = bulletLines(r.description);
      return lines.join(' \\\\\n') + (bullets ? '\n' + bullets : '');
    });
    researchSection = `\\section*{Research Experience}\n${items.join('\n\\vspace{6pt}\n')}\n`;
  }

  // --- Publications ---
  let publicationsSection = '';
  if (content.publications?.length) {
    const items = content.publications.map(pub => {
      const parts: string[] = [];
      if (pub.authors) parts.push(esc(pub.authors));
      parts.push(`\\textit{${esc(pub.title)}}`);
      if (pub.journal) parts.push(esc(pub.journal));
      if (pub.year) parts.push(`${pub.year}`);
      if (pub.doi) parts.push(`\\href{https://doi.org/${esc(pub.doi)}}{doi:${esc(pub.doi)}}`);
      return `\\item ${parts.join('. ')}.`;
    });
    publicationsSection = `\\section*{Publications}\n\\begin{enumerate}[leftmargin=1.5em]\n${items.join('\n')}\n\\end{enumerate}\n`;
  }

  // --- Skills ---
  let skillsSection = '';
  if (content.skills) {
    const rows: string[] = [];
    if (content.skills.technical?.length) rows.push(`\\textbf{Technical:} ${content.skills.technical.map(esc).join(', ')}`);
    if (content.skills.languages?.length) rows.push(`\\textbf{Languages:} ${content.skills.languages.map(esc).join(', ')}`);
    if (content.skills.tools?.length) rows.push(`\\textbf{Tools:} ${content.skills.tools.map(esc).join(', ')}`);
    if (rows.length) skillsSection = `\\section*{Skills}\n${rows.join(' \\\\\n')}\n`;
  }

  // --- Awards ---
  let awardsSection = '';
  if (content.awards?.length) {
    const items = content.awards.map(a => {
      const org = a.organization || a.issuer || '';
      const parts = [esc(a.title), org ? esc(org) : '', a.year ? `${a.year}` : ''].filter(Boolean);
      return `\\item ${parts.join(' — ')}`;
    });
    awardsSection = `\\section*{Awards \\& Honors}\n\\begin{itemize}[leftmargin=1.5em, nosep]\n${items.join('\n')}\n\\end{itemize}\n`;
  }

  // --- References ---
  let referencesSection = '';
  if (content.references?.length) {
    const items = content.references.map(r => {
      const uni = r.university || r.institution || '';
      const lines = [
        `\\textbf{${esc(r.name)}}`,
        [r.title ? esc(r.title) : '', uni ? esc(uni) : ''].filter(Boolean).join(', '),
        r.email ? `\\href{mailto:${esc(r.email)}}{${esc(r.email)}}` : '',
        r.relationship ? `(${esc(r.relationship)})` : '',
      ].filter(Boolean);
      return lines.join(' \\\\\n');
    });
    referencesSection = `\\section*{References}\n${items.join('\n\\vspace{6pt}\n')}\n`;
  }

  return `\\documentclass[11pt, a4paper]{article}

% ─── Packages ───────────────────────────────────────────────
\\usepackage[margin=2cm]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{parskip}

% ─── Section formatting ────────────────────────────────────
\\titleformat{\\section}{\\large\\bfseries\\scshape}{}{0em}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{12pt}{6pt}

% ─── No page numbers ───────────────────────────────────────
\\pagestyle{empty}

\\begin{document}

% ─── Header ─────────────────────────────────────────────────
\\begin{center}
  {\\LARGE \\textbf{${name}}} \\\\[4pt]
  ${contactLine}
\\end{center}

${educationSection}
${researchSection}
${publicationsSection}
${skillsSection}
${awardsSection}
${referencesSection}
\\end{document}
`;
}
