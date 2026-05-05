'use client';
import { useState } from 'react';
import Link from 'next/link';

interface Step {
  id: string;
  title: string;
  question: string;
  reference?: string;
  referenceUrl?: string;
  options: Array<{ label: string; value: string; weight: number }>;
}

const STEPS: Step[] = [
  {
    id: 'visa_type',
    title: '签证类型',
    question: '你目前计划申请哪类澳洲学生签证？',
    reference: '澳洲移民局 (DOHA) · 学生签证官方页',
    referenceUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    options: [
      { label: '学生签证 (500) — 学历课程', value: 'student_500', weight: 3 },
      { label: '学生签证 (500) — 研究型 MRes/PhD', value: 'student_500_research', weight: 3 },
      { label: '访问学者 / 研究员签证 (600)', value: 'visitor_600', weight: 1 },
      { label: '我还不确定', value: 'unsure', weight: 2 },
    ],
  },
  {
    id: 'education',
    title: '教育背景',
    question: '你最高的已完成学历是？',
    reference: 'IELTS 官网 · 澳洲大学英语要求',
    referenceUrl: 'https://www.ielts.org/about-the-test/test-takers/academic-test',
    options: [
      { label: '本科（学士学位）', value: 'bachelor', weight: 2 },
      { label: '硕士（授课型）', value: 'master_coursework', weight: 3 },
      { label: '硕士（研究型）/ MPhil', value: 'master_research', weight: 4 },
      { label: '已有 PhD 学位', value: 'phd', weight: 5 },
    ],
  },
  {
    id: 'english',
    title: '英语能力',
    question: '你的英语水平如何？',
    reference: 'IELTS Academic Band Descriptors · 澳洲院校最低要求（通常 IELTS 6.5+）',
    referenceUrl: 'https://www.ielts.org/about-the-test/test-format',
    options: [
      { label: 'IELTS 7.0+ / TOEFL 100+ （优秀）', value: 'excellent', weight: 5 },
      { label: 'IELTS 6.5 / TOEFL 90+ （达标）', value: 'good', weight: 3 },
      { label: 'IELTS 6.0 以下 / 暂无成绩', value: 'needs_improvement', weight: 1 },
      { label: '母语为英语 / 英语教学背景', value: 'native', weight: 5 },
    ],
  },
  {
    id: 'financial',
    title: '资金证明',
    question: '你能提供多少年的生活费资金证明？',
    reference: '澳洲移民局 GTE (Genuine Temporary Entrant) 要求 · 学费约 AUD 35,000-50,000/年',
    referenceUrl: 'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500/student',
    options: [
      { label: '全额资金证明（学费 + 生活费 1 年以上）', value: 'full', weight: 5 },
      { label: '部分资金证明（6 个月以内）', value: 'partial', weight: 2 },
      { label: '已获得奖学金 / TFS / 导师资助', value: 'scholarship', weight: 5 },
      { label: '暂时没有资金证明', value: 'none', weight: 0 },
    ],
  },
];

function calcResult(answers: Record<string, string>) {
  let total = 0;
  let max = 0;
  for (const step of STEPS) {
    const selected = answers[step.id];
    const option = step.options.find(o => o.value === selected);
    total += option?.weight ?? 0;
    max += Math.max(...step.options.map(o => o.weight));
  }
  const pct = Math.round((total / max) * 100);
  return pct;
}

function ResultCard({ score, answers }: { score: number; answers: Record<string, string> }) {
  const hasEnglish = answers.english === 'excellent' || answers.english === 'native' || answers.english === 'good';
  const hasFinance = answers.financial === 'full' || answers.financial === 'scholarship';
  const isResearch = answers.visa_type === 'student_500_research';

  let level: 'strong' | 'moderate' | 'weak';
  let headline: string;
  let summary: string;

  if (score >= 75) {
    level = 'strong';
    headline = '材料基础较强';
    summary = '你目前的背景基础较好，建议尽快准备签证申请所需文件，提前联系 KSA 团队做材料核查。';
  } else if (score >= 45) {
    level = 'moderate';
    headline = '有提升空间';
    summary = '你的申请条件基本达到，但部分维度需要加强。建议优先补充资金证明或提升英语成绩，然后再启动签证申请。';
  } else {
    level = 'weak';
    headline = '需要先做准备';
    summary = '目前直接申请学生签证可能面临较高拒签风险。建议先改善英语成绩和资金证明，再规划申请节奏。';
  }

  const colorMap = { strong: '#5a8060', moderate: '#c4a050', weak: '#b06040' };
  const bgMap = { strong: '#f0f8f2', moderate: '#fff8e8', weak: '#fff0f0' };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: bgMap[level], border: `1.5px solid ${colorMap[level]}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold" style={{ color: colorMap[level] }}>{headline}</span>
          <span className="text-2xl font-bold" style={{ color: colorMap[level] }}>{score}<span className="text-xs font-normal">/100</span></span>
        </div>
        <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: '#e0e0e0' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: colorMap[level] }} />
        </div>
        <p className="text-xs leading-relaxed" style={{ color: '#584838' }}>{summary}</p>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold" style={{ color: '#7d6340' }}>✅ 条件分析</div>
        {[
          { label: '英语成绩', ok: hasEnglish, note: hasEnglish ? '达到基本要求' : '建议先备考 IELTS（目标 6.5+）' },
          { label: '资金证明', ok: hasFinance, note: hasFinance ? '资金条件充足' : '建议准备至少 1 年学费 + 生活费证明（约 AUD 65,000）' },
          { label: '签证类型', ok: true, note: isResearch ? '研究型签证通常在证明材料齐全的情况下批准率较高' : '学生签证需满足 GTE 要求' },
        ].map(item => (
          <div key={item.label} className="flex items-start gap-2">
            <span className="flex-shrink-0 mt-0.5">{item.ok ? '🟢' : '🔴'}</span>
            <div>
              <span className="text-xs font-medium" style={{ color: '#1a2332' }}>{item.label}：</span>
              <span className="text-[11px]" style={{ color: '#584838' }}>{item.note}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl p-3 space-y-1.5" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
        <div className="text-[10px] font-semibold" style={{ color: '#7d6340' }}>⚖️ 重要声明</div>
        <p className="text-[11px] leading-relaxed" style={{ color: '#584838' }}>
          本评估由 AI 基于公开政策信息生成，<strong>不构成移民法律建议</strong>。签证审核结果取决于申请人的完整材料和澳洲移民局的个案判断。
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: '#584838' }}>
          如需专业移民建议，请联系 Koala PhD：
          <a href="mailto:info@koalaphd.com" className="font-medium" style={{ color: '#c4a050' }}> info@koalaphd.com</a>
        </p>
        <p className="text-[10px]" style={{ color: '#b09878' }}>
          参考法规：Migration Act 1958 (Cth) · Student Visa (Class TU) Regulations
        </p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/koala/chat"
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center no-underline"
          style={{ background: '#c4a050', color: '#fff' }}
        >
          🐨 和考拉学长聊签证规划
        </Link>
        <Link
          href="/koala/tools"
          className="flex-1 py-2.5 rounded-xl text-xs font-medium text-center no-underline"
          style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
        >
          返回工具
        </Link>
      </div>
    </div>
  );
}

export default function NIVPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);

  const step = STEPS[currentStep];
  const totalSteps = STEPS.length;
  const progress = ((currentStep) / totalSteps) * 100;

  function selectOption(value: string) {
    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);

    if (currentStep < totalSteps - 1) {
      setTimeout(() => setCurrentStep(s => s + 1), 300);
    } else {
      setTimeout(() => setShowResult(true), 300);
    }
  }

  function reset() {
    setCurrentStep(0);
    setAnswers({});
    setShowResult(false);
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#faf6ec', paddingBottom: 80 }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid #eee4cc' }}>
        <div className="flex items-center gap-2 mb-1">
          <Link href="/koala/tools" className="text-[13px]" style={{ color: '#c4a050' }}>← 工具</Link>
        </div>
        <h1 className="text-base font-bold" style={{ color: '#1a2332' }}>签证准备自测</h1>
        <p className="text-[11px] mt-0.5" style={{ color: '#907858' }}>
          4 步评估你的澳洲学生签证申请准备情况 · 仅供参考
        </p>
      </div>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {!showResult ? (
          <div className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-[11px] mb-1.5" style={{ color: '#907858' }}>
                <span>第 {currentStep + 1} 步，共 {totalSteps} 步</span>
                <span>{step.title}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e8dcc8' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress + (100 / totalSteps)}%`, background: '#c4a050' }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="rounded-2xl p-4" style={{ background: '#fff', border: '1px solid #e8dcc8' }}>
              <h2 className="text-sm font-bold mb-4" style={{ color: '#1a2332' }}>{step.question}</h2>
              <div className="space-y-2">
                {step.options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => selectOption(opt.value)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                    style={{
                      background: answers[step.id] === opt.value ? '#f5e8c4' : '#f2ead6',
                      border: answers[step.id] === opt.value ? '1.5px solid #c4a050' : '1.5px solid #e8dcc8',
                    }}
                  >
                    <span
                      className="size-4 rounded-full border-2 flex-shrink-0"
                      style={{
                        borderColor: answers[step.id] === opt.value ? '#c4a050' : '#d8c8a8',
                        background: answers[step.id] === opt.value ? '#c4a050' : 'transparent',
                      }}
                    />
                    <span className="text-xs leading-snug" style={{ color: '#28201a' }}>{opt.label}</span>
                  </button>
                ))}
              </div>

              {step.reference && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #f0e8d4' }}>
                  <span className="text-[10px]" style={{ color: '#b09878' }}>参考：</span>
                  {step.referenceUrl ? (
                    <a
                      href={step.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] ml-1 no-underline hover:underline"
                      style={{ color: '#5a8060' }}
                    >
                      {step.reference} ↗
                    </a>
                  ) : (
                    <span className="text-[10px] ml-1" style={{ color: '#b09878' }}>{step.reference}</span>
                  )}
                </div>
              )}
            </div>

            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(s => s - 1)}
                className="text-xs"
                style={{ color: '#907858' }}
              >
                ← 上一步
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold" style={{ color: '#1a2332' }}>📋 评估结果</h2>
              <button onClick={reset} className="text-xs" style={{ color: '#907858' }}>重新测试</button>
            </div>
            <ResultCard score={calcResult(answers)} answers={answers} />
          </div>
        )}
      </div>
    </div>
  );
}
