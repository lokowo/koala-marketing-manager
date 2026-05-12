'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Check, X, Zap } from 'lucide-react';
import { SUBSCRIPTION_TIERS, CREDIT_PRICES, BRAND, FREE_LIMITS } from '../../lib/constants';

// ─── Free tier description ────────────────────────────────────────────────────

const FREE_FEATURES: { text: string; included: boolean }[] = [
  { text: `每天 ${FREE_LIMITS.dailyAiTurns} 轮 AI 对话`, included: true },
  { text: `Top ${FREE_LIMITS.professorMatchCount} 教授匹配（免费查看）`, included: true },
  { text: '1 封免费申请信', included: true },
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
      className={[
        'rounded-2xl overflow-hidden',
        isPopular
          ? 'border-2 border-[#D4A843]'
          : 'border border-amber-200/50 dark:border-[#D4A843]/10',
      ].join(' ')}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="text-center text-xs font-semibold py-1.5 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
          🏆 最受欢迎
        </div>
      )}

      <div className={`p-4 ${isPopular ? 'bg-amber-50/50 dark:bg-[#D4A843]/8' : 'bg-white dark:bg-white/5'}`}>
        {/* Header */}
        <div className="flex items-end justify-between mb-1">
          <div className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">{tier.label}</div>
          <div className="text-right">
            <span className={`text-xl font-bold ${isPopular ? 'text-amber-600 dark:text-[#D4A843]' : 'text-gray-900 dark:text-[#e8e4dc]'}`}>
              AUD {tier.price}
            </span>
            <span className="text-xs text-gray-500 dark:text-[#6a7a7e]">/月</span>
          </div>
        </div>

        <div className="text-[11px] mb-3 text-gray-500 dark:text-[#6a7a7e]">
          含 {tier.monthlyCredits} 封申请信额度 · 新用户首月 5 折
        </div>

        {/* Included */}
        <div className="space-y-1.5">
          {tier.features.map(f => (
            <div key={f} className="flex items-start gap-2">
              <Check className="size-3.5 flex-shrink-0 mt-0.5 text-green-600 dark:text-[#5a8060]" />
              <span className="text-xs leading-snug text-gray-700 dark:text-[#28201a]">{f}</span>
            </div>
          ))}
          {tier.notIncluded.map(f => (
            <div key={f} className="flex items-start gap-2 opacity-40">
              <X className="size-3.5 flex-shrink-0 mt-0.5 text-gray-500 dark:text-[#6a7a7e]" />
              <span className="text-xs leading-snug text-gray-500 dark:text-[#6a7a7e]">{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className={[
            'w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-opacity active:opacity-70',
            isPopular
              ? 'bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] border-0'
              : 'bg-gray-100 dark:bg-[#D4A843]/6 text-gray-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20',
          ].join(' ')}
        >
          立即订阅
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FREE_TOOLS_GRID = [
  { icon: '📊', title: 'GPA 换算器',     desc: '中国GPA → 澳洲标准一键转换', href: '/koala/tools/niv' },
  { icon: '🛂', title: 'NIV 签证预评',   desc: '评估签证申请条件',          href: '/koala/tools/niv' },
  { icon: '🔬', title: 'ARC 项目浏览',   desc: '查看最新澳洲研究经费项目',   href: '/koala/chat?mode=research' },
  { icon: '🎯', title: 'PhD 路径自评',   desc: '评估申请竞争力与准备程度',   href: '/koala/chat?mode=path' },
  { icon: '👨‍🏫', title: '教授 Top 10 匹配', desc: '免费获取最匹配的 10 位导师', href: '/koala/chat?mode=research' },
  { icon: '✉️', title: '免费申请信',     desc: '免费生成第 1 封定制申请信',  href: '/koala/chat?mode=write' },
];

export default function ToolsPage() {
  const [showCredits, setShowCredits] = useState(false);

  return (
    <div className="pb-8 bg-gray-50 dark:bg-[#080c10]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200 dark:border-[#D4A843]/10">
        <h1 className="text-base font-bold text-gray-900 dark:text-[#e8e4dc]">工具 & 定价</h1>
        <p className="text-xs mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
          免费工具直接用 · 订阅解锁更多功能
        </p>
      </div>

      {/* ── Free Tools (first!) ── */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">免费工具箱</h2>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            无需注册
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {FREE_TOOLS_GRID.map(tool => (
            <Link
              key={tool.title}
              href={tool.href}
              className="rounded-2xl p-3.5 flex flex-col gap-1.5 no-underline bg-white dark:bg-white/5 border border-gray-200 dark:border-[#D4A843]/6"
              style={{ boxShadow: '0 2px 8px rgba(196,160,80,0.08)' }}
            >
              <span className="text-2xl">{tool.icon}</span>
              <div className="text-xs font-bold text-gray-900 dark:text-[#e8e4dc]">{tool.title}</div>
              <div className="text-[11px] leading-snug text-gray-500 dark:text-[#6a7a7e]">{tool.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Value separator ── */}
      <div className="mx-4 mt-5 rounded-2xl p-4 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
        <div className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-[#e8e4dc]">想要更多？解锁完整功能</div>
        <div className="space-y-1 text-[11px] text-gray-500 dark:text-[#a8b8ac]">
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />无限 AI 对话轮次</div>
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />上传简历 & 成绩单自动解析</div>
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />查看完整教授联系方式 & 论文</div>
          <div className="flex items-center gap-2"><Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />每月申请信额度 & PDF 报告下载</div>
        </div>
      </div>

      {/* ── Subscription tiers ── */}
      <div className="px-4 mt-4">
        <h2 className="text-sm font-semibold mb-1 text-gray-900 dark:text-[#e8e4dc]">订阅套餐</h2>
        <p className="text-[11px] mb-3 text-gray-500 dark:text-[#6a7a7e]">新用户首月 5 折 · 月度额度当月有效</p>
        <div className="space-y-3 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
          {(Object.values(SUBSCRIPTION_TIERS) as typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS][]).map(tier => (
            <TierCard key={tier.id} tier={tier} isPopular={tier.popular} />
          ))}
        </div>
      </div>

      {/* Credit system */}
      <div className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-[#e8e4dc]">单独购买积分</h2>
            <p className="text-[11px] mt-0.5 text-gray-500 dark:text-[#6a7a7e]">
              与订阅独立 · 用完月度额度后按需购买
            </p>
          </div>
          <button
            onClick={() => setShowCredits(v => !v)}
            className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-[#D4A843]/6 text-gray-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20"
          >
            {showCredits ? '收起' : '查看套餐'}
          </button>
        </div>

        {showCredits && (
          <div className="grid grid-cols-2 gap-2.5">
            {CREDIT_PACKAGES.map(pkg => (
              <div
                key={pkg.credits}
                className={[
                  'rounded-xl p-3 flex flex-col gap-1',
                  pkg.highlight
                    ? 'bg-amber-50/50 dark:bg-[#D4A843]/12 border-[1.5px] border-[#D4A843]'
                    : 'bg-white dark:bg-white/5 border border-amber-200/50 dark:border-[#D4A843]/10',
                ].join(' ')}
              >
                {pkg.highlight && (
                  <div className="flex items-center gap-1 mb-0.5">
                    <Zap className="size-3 text-amber-700 dark:text-[#D4A843]" />
                    <span className="text-[10px] font-medium text-amber-700 dark:text-[#D4A843]">最划算</span>
                  </div>
                )}
                <div className="text-sm font-bold text-gray-900 dark:text-[#e8e4dc]">{pkg.label}</div>
                <div className="text-[11px] text-gray-500 dark:text-[#6a7a7e]">{pkg.desc}</div>
                <div className="text-base font-bold mt-1 text-amber-600 dark:text-[#D4A843]">
                  AUD {pkg.price}
                </div>
                <button className="mt-1 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-[#D4A843]/6 text-gray-700 dark:text-[#D4A843] border border-gray-300 dark:border-[#D4A843]/20">
                  购买
                </button>
              </div>
            ))}
          </div>
        )}

        {/* How credits work */}
        <div className="mt-3 rounded-xl p-3.5 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
          <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">积分使用说明</div>
          <div className="space-y-1.5 text-[11px] text-gray-500 dark:text-[#a8b8ac]">
            <div>• 生成 1 封申请信消耗 1 积分，确认弹窗后扣除</div>
            <div>• 订阅月度额度优先使用，用完后从积分余额扣除</div>
            <div>• 月度额度当月有效，不累积到下月</div>
            <div>• 单独购买的积分永久有效，不过期</div>
            <div>• 新用户首月订阅享 5 折优惠</div>
          </div>
        </div>
      </div>

      {/* Human consultation */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl p-4 bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10]">
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
        <div className="rounded-2xl p-3.5 bg-amber-50 dark:bg-[#D4A843]/6 border border-amber-200/50 dark:border-[#D4A843]/10">
          <div className="text-xs font-semibold mb-2 text-gray-900 dark:text-[#e8e4dc]">免费工具（无需订阅）</div>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4 text-[11px] text-gray-500 dark:text-[#a8b8ac]">
            {['GPA 换算', 'NIV 签证预评', 'ARC 项目浏览', '博客 & 指南', 'PhD 路径自评', '教授 Top 10 匹配'].map(t => (
              <div key={t} className="flex items-center gap-1.5">
                <Check className="size-3 flex-shrink-0 text-green-600 dark:text-[#5a8060]" />
                {t}
              </div>
            ))}
          </div>
          <Link
            href="/koala/chat"
            className="inline-block mt-3 text-xs px-3 py-1.5 rounded-full bg-[#1A1A2E] dark:bg-[#D4A843] text-white dark:text-[#080c10] no-underline"
          >
            免费开始 →
          </Link>
        </div>
      </div>
    </div>
  );
}
