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
} as const;

export type MetricKey = keyof typeof METRICS;
