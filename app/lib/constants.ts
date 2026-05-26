export const STATS = {
  profCountLabel: '覆盖全澳 38 所大学',
  uniCount: 38,
  uniCountLabel: '38',
} as const;

export const BRAND = {
  name: 'Koala PhD',
  shortName: 'Koala',
  domain: 'koalaphd.com',
  email: 'info@koalaphd.com',
  address: 'Suite 22/26A Lime St, Sydney NSW 2000',
  wechat: 'KoalaStudyAdvisor',
  xiaohongshu: 'DrKoalaAU',
  instagram: 'DrKoalaAU',
  tagline: 'Koala — 陪你从申请到毕业，每一步都在。',
  aiName: 'Ola学姐',
  aiSubtitle: '你的澳洲学术内线',
  positioning: '澳洲 PhD 留学 AI 智能顾问平台',
} as const;

export const COLORS = {
  bg: '#080c10',
  card: '#111c28',
  ink: '#e8e4dc',
  bark: '#c9a96e',
  fur: '#a08058',
  gold: '#c9a96e',
  goldDark: '#8a6c30',
  euc: '#5a8060',
  terra: '#b06040',
  txt: '#e8e4dc',
  txtSoft: '#a8b8ac',
  txtMuted: '#6a7a7e',
} as const;

export const FONTS = {
  serif: "'Noto Serif SC', serif",
  en: "'Fraunces', Georgia, serif",
  mono: "'JetBrains Mono', monospace",
  body: "'Noto Sans SC', sans-serif",
} as const;

export const AI_MODES = {
  path: 'path',
  research: 'research',
  chat: 'chat',
  write: 'write',
  rp: 'rp',
  interview: 'interview',
} as const;

export type AIMode = typeof AI_MODES[keyof typeof AI_MODES];

export const OPPORTUNITY_LABELS = {
  high: '公开资料显示，该方向近期存在较强的研究机会信号',
  medium: '该方向可能存在研究机会，建议进一步了解',
  low: '目前公开信息有限，可以尝试联系了解',
} as const;

// ─── Credit packages (à-la-carte, independent of subscription) ───────────────

export const CREDIT_PRICES = {
  single:  1.00,
  pack10:  9.90,
  pack30:  19.90,
  pack100: 49.00,
} as const;

export const CREDIT_PACKAGES = [
  { id: 'credit_starter',  label: '入门包', credits: 50,  priceAUD: 4.99,  unit: 'AUD 0.10/积分', stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDIT_STARTER  || '' },
  { id: 'credit_standard', label: '标准包', credits: 120, priceAUD: 9.99,  unit: 'AUD 0.083/积分', stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDIT_STANDARD || '', bonus: '+20%' },
  { id: 'credit_pro',      label: '专业包', credits: 280, priceAUD: 19.99, unit: 'AUD 0.071/积分', stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDIT_PRO      || '', bonus: '+40%' },
  { id: 'credit_flagship', label: '旗舰包', credits: 800, priceAUD: 49.99, unit: 'AUD 0.062/积分', stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDIT_FLAGSHIP || '', bonus: '+60%' },
] as const;

// New users get 50% off their first month's subscription
export const NEW_USER_PROMO_DISCOUNT = 0.5;

// ─── Subscription tiers ───────────────────────────────────────────────────────

export const FREE_LIMITS = {
  dailyAiTurns: 10,
  professorMatchCount: 10,
  freeEmails: 1,
  monthlyEmails: 1,
  freeCvVersions: 1,
  canUploadFiles: false,
  canViewProfessorDetail: false,
  canDownloadPdf: false,
} as const;

export const SUBSCRIPTION_TIERS = {
  starter: {
    id: 'starter',
    label: 'Starter',
    price: 19.9,
    monthlyCredits: 10,
    monthlyEmails: 5,
    popular: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUB_STARTER || '',
    features: [
      '不限 AI 对话轮数',
      '每月 5 封定制申请信',
      '3 版 CV 定制',
      '教授数据每周刷新',
      '上传简历 & 成绩单分析',
      '教授完整资料（经费/论文/联系方式）',
      'PDF 评估报告下载',
    ],
    notIncluded: [
      '无限邮件',
      'AI 经历增强',
      '教授视角预览',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price: 49.0,
    monthlyCredits: 30,
    monthlyEmails: 15,
    popular: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUB_PRO || '',
    features: [
      'Starter 全部功能',
      '每月 15 封定制申请信',
      '无限 CV 定制',
      'AI 经历增强（润色科研 & 实习描述）',
      'RP 大纲生成（不限次）',
      'Follow-up 智能提醒',
      '申请进度 Dashboard',
    ],
    notIncluded: [
      '无限邮件',
      '教授视角预览',
      '优先匹配',
    ],
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    price: 99.0,
    monthlyCredits: 100,
    monthlyEmails: null as unknown as number,
    popular: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUB_ELITE || '',
    features: [
      'Pro 全部功能',
      '无限定制申请信',
      '教授视角预览（查看教授如何看你的申请）',
      '优先匹配（新教授数据 24 小时推送）',
      '人工审核 3 次/月',
      '回复追踪 + 意图分析',
      '月度申请策略报告',
    ],
    notIncluded: [],
  },
} as const;

export type SubscriptionTierId = keyof typeof SUBSCRIPTION_TIERS;

// ─── University badge colors (keyed by abbreviation) ────────────────────────

const UNI_BADGE_COLORS: Record<string, { bg: string; fg: string }> = {
  ANU:  { bg: '#d4a84330', fg: '#b8922e' },
  MELB: { bg: '#00308720', fg: '#1e4a8a' },
  MEL:  { bg: '#00308720', fg: '#1e4a8a' },
  USYD: { bg: '#cc000018', fg: '#b83232' },
  SYD:  { bg: '#cc000018', fg: '#b83232' },
  UNSW: { bg: '#1a1a1a15', fg: '#3a3a3a' },
  NSW:  { bg: '#1a1a1a15', fg: '#3a3a3a' },
  UQ:   { bg: '#51247a18', fg: '#6b3d96' },
  MON:  { bg: '#006dae18', fg: '#2680b8' },
  UWA:  { bg: '#00308718', fg: '#1e4a8a' },
  ADE:  { bg: '#005a9c18', fg: '#2870a8' },
  UTS:  { bg: '#00a3e018', fg: '#1a8ab8' },
  RMIT: { bg: '#e6002818', fg: '#c43838' },
  RMT:  { bg: '#e6002818', fg: '#c43838' },
  MAC:  { bg: '#e8291c18', fg: '#c44040' },
  MQ:   { bg: '#e8291c18', fg: '#c44040' },
  QUT:  { bg: '#005a9c18', fg: '#2870a8' },
  DEA:  { bg: '#00a86b18', fg: '#2d9060' },
  GRF:  { bg: '#d4380d18', fg: '#b84830' },
  LAT:  { bg: '#e84e1b18', fg: '#c45830' },
  NEW:  { bg: '#1f164618', fg: '#3d3060' },
  UON:  { bg: '#1f164618', fg: '#3d3060' },
  WOL:  { bg: '#1e579918', fg: '#2e68a0' },
  UOW:  { bg: '#1e579918', fg: '#2e68a0' },
  FLI:  { bg: '#004f9f18', fg: '#2868a0' },
  CUR:  { bg: '#cfb44b20', fg: '#a8942e' },
  JCU:  { bg: '#005c8418', fg: '#286880' },
  SWI:  { bg: '#bb000018', fg: '#a83838' },
  WSU:  { bg: '#e5202018', fg: '#c43838' },
  WSY:  { bg: '#e5202018', fg: '#c43838' },
  UTAS: { bg: '#00308718', fg: '#1e4a8a' },
  TAS:  { bg: '#00308718', fg: '#1e4a8a' },
  ACU:  { bg: '#005a9c18', fg: '#2870a8' },
  ECU:  { bg: '#e6002818', fg: '#c43838' },
  CDU:  { bg: '#005c8418', fg: '#286880' },
  SCU:  { bg: '#00a86b18', fg: '#2d9060' },
  UNE:  { bg: '#1f164618', fg: '#3d3060' },
  VU:   { bg: '#00308718', fg: '#1e4a8a' },
  BOND: { bg: '#cfb44b20', fg: '#a8942e' },
  CQU:  { bg: '#005a9c18', fg: '#2870a8' },
  USQ:  { bg: '#cfb44b20', fg: '#a8942e' },
};

export function parseUniversity(raw: string): { full: string; short: string } {
  const match = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) return { full: match[1].trim(), short: match[2] };
  return { full: raw, short: raw.replace(/University of |University /gi, '').slice(0, 3).toUpperCase() };
}

export function getUniBadge(university: string): { bg: string; fg: string; short: string } {
  const { short } = parseUniversity(university);
  const colors = UNI_BADGE_COLORS[short];
  if (colors) return { ...colors, short };
  return { bg: '#5a687818', fg: '#5a6878', short: short.slice(0, 3) };
}
