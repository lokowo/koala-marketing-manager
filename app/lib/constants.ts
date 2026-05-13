export const BRAND = {
  name: 'Koala PhD',
  shortName: 'Koala',
  domain: 'koalaphd.com',
  email: 'info@koalaphd.com',
  address: 'Suite 22/26A Lime St, Sydney NSW 2000',
  wechat: 'MissKoalaAu',
  xiaohongshu: 'DrKoalaAU',
  instagram: 'DrKoalaAU',
  tagline: 'Koala — 陪你从申请到毕业，每一步都在。',
  aiName: '考拉学长',
  aiSubtitle: '你的澳洲学术内线',
  positioning: '澳洲产学研科研机构',
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

// New users get 50% off their first month's subscription
export const NEW_USER_PROMO_DISCOUNT = 0.5;

// ─── Subscription tiers ───────────────────────────────────────────────────────

export const FREE_LIMITS = {
  dailyAiTurns: 10,
  professorMatchCount: 10,
  freeEmails: 1,
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
    popular: false,
    features: [
      '不限 AI 对话轮数',
      '上传简历 & 成绩单',
      '教授完整资料（经费/论文/联系方式）',
      '每月 10 封定制申请信',
      'PDF 评估报告下载',
      '每周新教授推送',
    ],
    notIncluded: [
      'RP 大纲生成',
      '人工审核',
    ],
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    price: 49.0,
    monthlyCredits: 30,
    popular: true,
    features: [
      'Starter 全部功能',
      '每月 30 封定制申请信',
      'RP 大纲生成（不限次）',
      'Follow-up 智能提醒',
      '每日任务 + 成就系统',
      '申请进度 Dashboard',
      '人工审核 1 次/月',
    ],
    notIncluded: [
      '新 ARC 项目 24 小时推送',
      '月度策略报告',
    ],
  },
  elite: {
    id: 'elite',
    label: 'Elite',
    price: 99.0,
    monthlyCredits: 100,
    popular: false,
    features: [
      'Pro 全部功能',
      '每月 100 封定制申请信',
      '人工审核 3 次/月',
      '新 ARC 项目 24 小时内推送',
      '回复追踪 + 意图分析',
      '月度申请策略报告',
      '优先预约人工顾问（免费）',
    ],
    notIncluded: [],
  },
} as const;

export type SubscriptionTierId = keyof typeof SUBSCRIPTION_TIERS;
