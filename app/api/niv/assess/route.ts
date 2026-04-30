export async function POST(req: Request) {
  try {
    const body = await req.json();
    const answers = body.answers as Record<string, string>;

    if (!answers || typeof answers !== 'object') {
      return Response.json({ error: 'Missing answers' }, { status: 400 });
    }

    const WEIGHTS: Record<string, Record<string, number>> = {
      visa_type: { student_500: 3, student_500_research: 3, visitor_600: 1, unsure: 2 },
      education: { bachelor: 2, master_coursework: 3, master_research: 4, phd: 5 },
      english: { excellent: 5, native: 5, good: 3, needs_improvement: 1 },
      financial: { full: 5, scholarship: 5, partial: 2, none: 0 },
    };
    const MAX_PER_DIM: Record<string, number> = { visa_type: 3, education: 5, english: 5, financial: 5 };

    let total = 0;
    let max = 0;

    for (const [dim, dimWeights] of Object.entries(WEIGHTS)) {
      const selected = answers[dim];
      total += dimWeights[selected] ?? 0;
      max += MAX_PER_DIM[dim] ?? 5;
    }

    const totalScore = Math.round((total / max) * 100);

    let band: string;
    let headline: string;
    let summary: string;

    if (totalScore >= 75) {
      band = 'strong';
      headline = '材料基础较强';
      summary = '你目前的背景基础较好，建议尽快准备签证申请所需文件，提前联系 KSA 团队做材料核查。';
    } else if (totalScore >= 45) {
      band = 'moderate';
      headline = '有提升空间';
      summary = '你的申请条件基本达到，但部分维度需要加强。建议优先补充资金证明或提升英语成绩，然后再启动签证申请。';
    } else {
      band = 'weak';
      headline = '需要先做准备';
      summary = '目前直接申请学生签证可能面临较高拒签风险。建议先改善英语成绩和资金证明，再规划申请节奏。';
    }

    const dimensions = Object.entries(WEIGHTS).map(([dim, dimWeights]) => ({
      name: dim,
      score: Math.round(((dimWeights[answers[dim]] ?? 0) / (MAX_PER_DIM[dim] ?? 5)) * 100),
      selected: answers[dim] ?? null,
    }));

    return Response.json({ totalScore, band, headline, summary, dimensions });
  } catch (error) {
    console.error('[NIV_ASSESS]', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
