'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

const FREE_FEATURES = [
  { text: '每天 10 轮 AI 对话', ok: true },
  { text: 'Top 10 教授匹配（免费查看）', ok: true },
  { text: '1 封免费申请信', ok: true },
  { text: '博客 / NIV签证评估 / GPA换算', ok: true },
  { text: '上传简历 & 成绩单分析', ok: false },
  { text: '教授完整数据（经费/论文/联系方式）', ok: false },
  { text: 'PDF 报告下载', ok: false },
];

const CREDIT_PACKS = [
  { label: '单封', credits: 1, price: 1.00, unit: 'AUD 1/封', highlight: false },
  { label: '10封包', credits: 10, price: 9.90, unit: 'AUD 0.99/封', highlight: false },
  { label: '30封包', credits: 30, price: 19.90, unit: 'AUD 0.66/封', highlight: true },
  { label: '100封包', credits: 100, price: 49.00, unit: 'AUD 0.49/封', highlight: false },
];

const TIERS = [
  {
    id: 'starter',
    label: 'Starter',
    price: 19.9,
    monthlyCredits: 10,
    color: '#D4A843',
    highlight: false,
    features: [
      '每月 10 积分（申请信额度）',
      '无限 AI 对话',
      '上传简历 & 成绩单',
      '教授完整联系方式',
      'PDF 报告生成',
    ],
  },
  {
    id: 'pro',
    label: 'Pro',
    price: 49,
    monthlyCredits: 30,
    color: '#D4A843',
    highlight: true,
    features: [
      '每月 30 积分（申请信额度）',
      '无限 AI 对话',
      '上传简历 & 成绩单',
      '教授完整联系方式',
      'PDF 报告生成',
      '优先客服响应',
      'Research Proposal 批改',
    ],
  },
  {
    id: 'elite',
    label: 'Elite',
    price: 99,
    monthlyCredits: 100,
    color: '#D4A843',
    highlight: false,
    features: [
      '每月 100 积分',
      '无限 AI 对话',
      '所有 Pro 功能',
      '1 对 1 学术顾问会议（每月1次）',
      'KSA 学术顾问深度辅导',
    ],
  },
];

export default function PricingPage() {
  const [billingCycle] = useState<'monthly'>('monthly');

  return (
    <div className="min-h-screen pb-24 bg-gray-50 dark:bg-[#080c10]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 sticky top-0 z-10 bg-gray-50 dark:bg-[#080c10] border-b border-gray-200 dark:border-[#D4A843]/20">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/koala/tools" className="text-[13px] text-[#1A1A2E] dark:text-[#D4A843]">← 工具</Link>
        </div>
        <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">定价与积分</h1>
        <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">免费开始，按需升级</p>
      </div>

      <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
        {/* Free tier */}
        <div className="rounded-2xl overflow-hidden border-2 border-amber-200/50 dark:border-[#D4A843]/10 shadow-sm">
          <div className="p-4 bg-amber-50 dark:bg-[#D4A843]/6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">免费版</div>
                <div className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">永久免费，无需信用卡</div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-[#e8e4dc]">
                AUD 0<span className="text-xs font-normal">/月</span>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2 bg-white dark:bg-white/5">
            {FREE_FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                {f.ok
                  ? <Check className="size-4 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />
                  : <X className="size-4 flex-shrink-0 text-gray-400 dark:text-[#d0b898]" />}
                <span className={`text-xs ${f.ok ? 'text-gray-700 dark:text-[#e8e4dc]' : 'text-gray-400 dark:text-[#b09878]'}`}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Credit packages */}
        <div>
          <h2 className="text-sm font-bold mb-1 text-gray-900 dark:text-[#e8e4dc]">积分包</h2>
          <p className="text-xs mb-3 text-gray-500 dark:text-[#6a7a7e]">每封申请信消耗 1 积分，积分永久有效（不过期）</p>
          <div className="grid grid-cols-2 gap-2.5">
            {CREDIT_PACKS.map(pack => (
              <div
                key={pack.label}
                className={[
                  'rounded-2xl p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                  pack.highlight
                    ? 'bg-amber-50 dark:bg-[#D4A843]/15 border-2 border-[#D4A843] ring-2 ring-[#D4A843]/40 shadow-md'
                    : 'bg-white dark:bg-white/5 border border-amber-200/50 dark:border-[#D4A843]/10 shadow-sm',
                ].join(' ')}
              >
                {pack.highlight && (
                  <div className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1.5 inline-block bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">最划算</div>
                )}
                <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">{pack.label}</div>
                <div className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">{pack.credits} 积分</div>
                <div className="text-lg font-bold mt-1 text-gray-900 dark:text-[#e8e4dc]">AUD {pack.price.toFixed(2)}</div>
                <div className="text-[10px] mt-0.5 text-amber-600 dark:text-[#D4A843]">{pack.unit}</div>
                <button
                  className={[
                    'w-full mt-3 py-2 rounded-xl text-xs font-semibold',
                    pack.highlight
                      ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border-0'
                      : 'bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
                  ].join(' ')}
                >
                  购买
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Subscription tiers */}
        <div>
          <h2 className="text-sm font-bold mb-1 text-gray-900 dark:text-[#e8e4dc]">订阅套餐</h2>
          <p className="text-xs mb-3 text-gray-500 dark:text-[#6a7a7e]">每月自动续订，随时取消</p>
          <div className="space-y-3">
            {TIERS.map(tier => (
              <div
                key={tier.id}
                className={[
                  'rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group relative',
                  tier.highlight
                    ? 'border-2 border-[#D4A843] shadow-md'
                    : 'border border-amber-200/50 dark:border-[#D4A843]/10 shadow-sm',
                ].join(' ')}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D4A843]/60 to-[#4ECDC4]/60 opacity-0 group-hover:opacity-100 transition-opacity" />
                {tier.highlight && (
                  <div className="py-1.5 text-center text-xs font-bold text-white dark:text-[#080c10] bg-[#1A1A2E] dark:bg-[#D4A843]">
                    🌟 最受欢迎
                  </div>
                )}
                <div className={`p-4 ${tier.highlight ? 'bg-amber-50 dark:bg-[#D4A843]/8' : 'bg-white dark:bg-white/5'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-bold text-amber-600 dark:text-[#D4A843]">{tier.label}</div>
                      <div className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">每月 {tier.monthlyCredits} 积分</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900 dark:text-[#e8e4dc]">AUD {tier.price}</div>
                      <div className="text-[10px] text-gray-500 dark:text-[#b09878]">/月</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check className="size-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-[#D4A843]" />
                        <span className="text-xs text-gray-700 dark:text-[#e8e4dc]">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    className={[
                      'w-full py-2.5 rounded-xl text-sm font-semibold',
                      tier.highlight
                        ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border-0'
                        : 'bg-amber-50 dark:bg-[#D4A843]/6 text-amber-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
                    ].join(' ')}
                  >
                    开始 {tier.label} 订阅
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
          <h2 className="text-xs font-bold mb-3 text-gray-900 dark:text-[#e8e4dc]">常见问题</h2>
          {[
            { q: '积分会过期吗？', a: '单独购买的积分永久有效，不过期。订阅积分在订阅有效期内可用。' },
            { q: '如何取消订阅？', a: '随时可以取消，取消后当前订阅期仍然有效，下个周期不再扣款。' },
            { q: '积分不够用了怎么办？', a: '随时可以单独购买积分包，无需升级订阅。' },
          ].map((item, i) => (
            <div key={i} className={i > 0 ? 'mt-3 pt-3 border-t border-amber-200/50 dark:border-[#D4A843]/10' : ''}>
              <div className="text-xs font-semibold mb-1 text-gray-900 dark:text-[#e8e4dc]">{item.q}</div>
              <div className="text-[11px] leading-relaxed text-gray-500 dark:text-[#a8b8ac]">{item.a}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-[10px] text-gray-400 dark:text-[#b09878]">
          价格以澳元 (AUD) 计算 · 支持 Stripe 支付 · 如有问题联系 info@koalaphd.com
        </p>
      </div>
    </div>
  );
}
