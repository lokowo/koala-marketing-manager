'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { SUBSCRIPTION_TIERS, CREDIT_PRICES, BRAND, FREE_LIMITS } from '../../lib/constants';

// ─── Free tier description ────────────────────────────────────────────────────

const FREE_FEATURES: { text: string; included: boolean }[] = [
  { text: `每天 ${FREE_LIMITS.dailyAiTurns} 轮 AI 对话`, included: true },
  { text: `Top ${FREE_LIMITS.professorMatchCount} 教授匹配（免费查看）`, included: true },
  { text: '1 封免费套磁信', included: true },
  { text: '博客 / NIV 签证 / GPA 工具全免费', included: true },
  { text: '上传简历 & 成绩单', included: false },
  { text: '教授完整数据（经费/论文/联系方式）', included: false },
  { text: 'PDF 报告下载', included: false },
];

// ─── Credit packages ──────────────────────────────────────────────────────────

const CREDIT_PACKAGES: { credits: number; price: number; label: string; desc: string; highlight?: boolean }[] = [
  { credits: 1,   price: CREDIT_PRICES.single,  label: '单封',    desc: '按需购买' },
  { credits: 10,  price: CREDIT_PRICES.pack10,  label: '10 封包', desc: '省 ¥0.10/封' },
  { credits: 30,  price: CREDIT_PRICES.pack30,  label: '30 封包', desc: '省 ¥0.34/封', highlight: true },
  { credits: 100, price: CREDIT_PRICES.pack100, label: '100 封包', desc: '省 ¥0.51/封' },
];

// ─── Tier card ────────────────────────────────────────────────────────────────

function TierCard({
  tier,
  isPopular,
}: {
  tier: typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];
  isPopular: boolean;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: isPopular ? '2px solid #c4a050' : '1px solid #e8dcc8',
        background: isPopular ? '#fffdf5' : '#f7f2e8',
      }}
    >
      {/* Popular badge */}
      {isPopular && (
        <div
          className="text-center text-xs font-semibold py-1.5"
          style={{ background: '#c4a050', color: '#fff' }}
        >
          🏆 最受欢迎
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-end justify-between mb-1">
          <div className="text-base font-bold" style={{ color: '#1a2332' }}>{tier.label}</div>
          <div className="text-right">
            <span className="text-xl font-bold" style={{ color: isPopular ? '#c4a050' : '#1a2332' }}>
              AUD {tier.price}
            </span>
            <span className="text-xs" style={{ color: '#907858' }}>/月</span>
          </div>
        </div>

        <div className="text-[11px] mb-3" style={{ color: '#907858' }}>
          含 {tier.monthlyCredits} 封套磁信额度 · 新用户首月 5 折
        </div>

        {/* Included */}
        <div className="space-y-1.5">
          {tier.features.map(f => (
            <div key={f} className="flex items-start gap-2">
              <Check className="size-3.5 flex-shrink-0 mt-0.5" style={{ color: '#5a8060' }} />
              <span className="text-xs leading-snug" style={{ color: '#28201a' }}>{f}</span>
            </div>
          ))}
          {tier.notIncluded.map(f => (
            <div key={f} className="flex items-start gap-2 opacity-40">
              <X className="size-3.5 flex-shrink-0 mt-0.5" style={{ color: '#907858' }} />
              <span className="text-xs leading-snug" style={{ color: '#907858' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity active:opacity-70"
          style={{
            background: isPopular ? '#c4a050' : '#f2ead6',
            color: isPopular ? '#fff' : '#7d6340',
            border: isPopular ? 'none' : '1px solid #d8c8a8',
          }}
        >
          立即订阅
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div className="pb-8" style={{ background: '#faf6ec' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: '#e8dcc8' }}>
        <h1 className="text-base font-bold" style={{ color: '#1a2332' }}>定价 & 套餐</h1>
        <p className="text-xs mt-0.5" style={{ color: '#907858' }}>
          订阅送月度额度 · 积分可单独加购 · 两者独立不冲突
        </p>
      </div>

      {/* Free tier */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4" style={{ background: '#f7f2e8', border: '1px solid #e8dcc8' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-bold" style={{ color: '#1a2332' }}>免费版</div>
            <div className="text-sm font-bold" style={{ color: '#5a8060' }}>永久免费</div>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {FREE_FEATURES.map(f => (
              <div key={f.text} className="flex items-start gap-2" style={{ opacity: f.included ? 1 : 0.45 }}>
                {f.included
                  ? <Check className="size-3.5 flex-shrink-0 mt-0.5" style={{ color: '#5a8060' }} />
                  : <X className="size-3.5 flex-shrink-0 mt-0.5" style={{ color: '#907858' }} />}
                <span className="text-xs leading-snug" style={{ color: '#28201a' }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Subscription tiers */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#1a2332' }}>
          订阅套餐
          <span className="ml-2 text-[11px] font-normal" style={{ color: '#907858' }}>月度额度当月有效，不累积</span>
        </h2>
        <div className="space-y-3">
          {(Object.values(SUBSCRIPTION_TIERS) as typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS][]).map(tier => (
            <TierCard key={tier.id} tier={tier} isPopular={tier.popular} />
          ))}
        </div>
      </div>

      {/* Credit system */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: '#1a2332' }}>单独购买积分</h2>
            <p className="text-[11px] mt-0.5" style={{ color: '#907858' }}>
              与订阅独立 · 用完月度额度后按需购买
            </p>
          </div>
          <button
            onClick={() => setShowCredits(v => !v)}
            className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
          >
            {showCredits ? '收起' : '查看套餐'}
          </button>
        </div>

        {showCredits && (
          <div className="grid grid-cols-2 gap-2.5">
            {CREDIT_PACKAGES.map(pkg => (
              <div
                key={pkg.credits}
                className="rounded-xl p-3 flex flex-col gap-1"
                style={{
                  background: pkg.highlight ? '#fff8e8' : '#f7f2e8',
                  border: pkg.highlight ? '1.5px solid #c4a050' : '1px solid #e8dcc8',
                }}
              >
                {pkg.highlight && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <Zap className="size-3" style={{ color: '#c4a050' }} />
                    <span className="text-[10px] font-medium" style={{ color: '#c4a050' }}>最划算</span>
                  </div>
                )}
                <div className="text-sm font-bold" style={{ color: '#1a2332' }}>{pkg.label}</div>
                <div className="text-[11px]" style={{ color: '#907858' }}>{pkg.desc}</div>
                <div className="text-base font-bold mt-1" style={{ color: '#c4a050' }}>
                  AUD {pkg.price}
                </div>
                <button
                  className="mt-1 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: '#f2ead6', color: '#7d6340', border: '1px solid #d8c8a8' }}
                >
                  购买
                </button>
              </div>
            ))}
          </div>
        )}

        {/* How credits work */}
        <div
          className="mt-3 rounded-xl p-3.5"
          style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}
        >
          <div className="text-xs font-semibold mb-2" style={{ color: '#1a2332' }}>积分使用说明</div>
          <div className="space-y-1.5 text-[11px]" style={{ color: '#584838' }}>
            <div>• 生成 1 封套磁信消耗 1 积分，确认弹窗后扣除</div>
            <div>• 订阅月度额度优先使用，用完后从积分余额扣除</div>
            <div>• 月度额度当月有效，不累积到下月</div>
            <div>• 单独购买的积分永久有效，不过期</div>
            <div>• 新用户首月订阅享 5 折优惠</div>
          </div>
        </div>
      </div>

      {/* Human consultation */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4" style={{ background: '#7d6340', color: '#fff' }}>
          <div className="text-sm font-semibold mb-1">📞 预约人工深度咨询</div>
          <div className="text-xs opacity-90 mb-2">AUD 999+ · 人工审核 + 完整申请策略规划</div>
          <div className="text-xs opacity-80">
            WeChat: {BRAND.wechat} · {BRAND.email}
          </div>
          <div className="text-[10px] opacity-60 mt-1">{BRAND.positioning}</div>
        </div>
      </div>

      {/* Free tools reminder */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-3.5" style={{ background: '#f2ead6', border: '1px solid #e8dcc8' }}>
          <div className="text-xs font-semibold mb-2" style={{ color: '#1a2332' }}>免费工具（无需订阅）</div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px]" style={{ color: '#584838' }}>
            {['GPA 换算', 'NIV 签证预评', 'ARC 项目浏览', '博客 & 指南', 'PhD 路径自评', '教授 Top 10 匹配'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="size-3 flex-shrink-0" style={{ color: '#5a8060' }} />
                {t}
              </div>
            ))}
          </div>
          <Link
            href="/koala/chat"
            className="inline-block mt-3 text-xs px-3 py-1.5 rounded-full text-white"
            style={{ background: '#c4a050', textDecoration: 'none' }}
          >
            免费开始 →
          </Link>
        </div>
      </div>
    </div>
  );
}
