export const METRICS = {
  totalUsers: {
    label: '总用户',
    tooltip: '平台注册用户总数，包含所有状态（活跃、沉睡、流失）',
  },
  newUsers30d: {
    label: '30天新增',
    tooltip: '过去 30 天内完成注册的新用户数',
  },
  conversations30d: {
    label: '30天对话',
    tooltip: '过去 30 天内用户与 AI 产生的对话总次数',
  },
  outreach30d: {
    label: '30天套磁',
    tooltip: '过去 30 天内生成的套磁信总封数（含已发送和未发送）',
  },
  deepUsers: {
    label: '深度用户',
    tooltip: '过去 30 天内对话 ≥ 5 次或购买过积分的用户',
  },
  activeUsers: {
    label: '活跃用户',
    tooltip: '过去 30 天内有过至少 1 次对话或操作的用户',
  },
  lightUsers: {
    label: '轻度用户',
    tooltip: '过去 30 天内仅有 1-2 次对话且未购买积分的用户',
  },
  dormantUsers: {
    label: '沉睡用户',
    tooltip: '超过 30 天未产生任何对话或操作的注册用户',
  },
  referrers: {
    label: '推荐人',
    tooltip: '成功邀请过至少 1 位新用户注册的用户数',
  },
  referredUsers: {
    label: '被推荐用户',
    tooltip: '通过推荐链接或邀请码注册的用户数',
  },
  referralRatio: {
    label: '推荐占比',
    tooltip: '被推荐用户数 / 总用户数；分母为 0 时显示 "—"',
  },
  creditsConsumed: {
    label: '积分消耗',
    tooltip: '统计周期内用户实际使用的积分总量',
  },
  purchaseCount: {
    label: '购买次数',
    tooltip: '统计周期内成功完成的积分购买交易次数',
  },
  paidUsers: {
    label: '付费用户',
    tooltip: '至少完成过 1 次积分购买的用户数',
  },
  creditsIssued: {
    label: '积分发放',
    tooltip: '统计周期内系统发放的积分总量（含注册赠送、推荐奖励、购买）',
  },
  registrationWeek: {
    label: '注册周',
    tooltip: '用户注册所在的自然周（周一至周日）',
  },
  newUsersWeekly: {
    label: '新增',
    tooltip: '该注册周内完成注册的用户数',
  },
  nextWeekRetention: {
    label: '次周留存',
    tooltip: '注册后第 2 周仍有活跃行为的用户数',
  },
  retentionRate: {
    label: '留存率',
    tooltip: '次周留存用户数 / 该周新增用户数；分母为 0 时显示 "—"',
  },
  mrr: {
    label: 'MRR',
    tooltip: '月度经常性收入（Monthly Recurring Revenue），当月订阅收入总额',
  },
  arpu: {
    label: 'ARPU',
    tooltip: '每用户平均收入（Average Revenue Per User）= 总收入 / 活跃用户数；分母为 0 时显示 "—"',
  },
  monthlyRevenue: {
    label: '本月收入',
    tooltip: '当月已确认的收入总额（含一次性购买和订阅）',
  },
  monthlyTransactions: {
    label: '本月交易',
    tooltip: '当月成功完成的支付交易总笔数',
  },
  kpiVisits: {
    label: 'KPI1 扫码访问',
    tooltip: '本月通过销售推广链接产生的独立访问次数（扫码/点击链接进入）',
  },
  kpiRegistrations: {
    label: 'KPI2 注册',
    tooltip: '本月通过销售推广链接成功注册的新用户数',
  },
  kpiPayments: {
    label: 'KPI3 付费转化',
    tooltip: '本月通过销售推广链接注册用户产生的付费订单数（不含已拒绝订单）',
  },
  kpiRevenue: {
    label: '佣金收入',
    tooltip: '本月销售获得的佣金总额（AUD），基于付费金额 × 佣金比例计算',
  },
  kpiOffline: {
    label: 'KPI4 线下转化',
    tooltip: '本月通过销售线下推广成功转化的客户数',
  },
  kpiOverall: {
    label: '总完成率',
    tooltip: '加权完成率 = KPI1×15% + KPI2×25% + KPI3×35% + KPI4×25%；目标为 0 的维度不计入',
  },
  faqTotal: {
    label: 'FAQ 总数',
    tooltip: '已配置的 FAQ 自动回复条目总数（含启用和禁用）',
  },
  faqEnabled: {
    label: '启用条目',
    tooltip: '当前处于启用状态的 FAQ 条目数，用户提问时会匹配这些条目',
  },
  faqMatchRate: {
    label: '匹配率',
    tooltip: 'FAQ 命中次数 / 用户提问总次数；命中 FAQ 的问题不消耗 LLM 额度',
  },
  olaTriggerTotal: {
    label: '触发规则总数',
    tooltip: '已配置的 Ola 主动触发规则数（含启用和禁用），Ola 会在用户浏览指定页面时弹出气泡消息',
  },
  olaTriggerEnabled: {
    label: '启用规则',
    tooltip: '当前处于启用状态的触发规则数，仅启用的规则会在前台触发',
  },
} as const;

export type MetricKey = keyof typeof METRICS;
